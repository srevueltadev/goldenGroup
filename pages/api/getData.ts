import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from './middleware';
import { getOrFetchGold, getOrFetchUsd, getGoldFromCache, getUsdFromCache } from './_lib';

const USD_TIMEOUT_MS = 4_000;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        const usdTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), USD_TIMEOUT_MS));
        const [gold, usdResult] = await Promise.all([
            getOrFetchGold(),
            Promise.race([getOrFetchUsd(), usdTimeout]),
        ]);
        const usd = usdResult ?? getUsdFromCache();
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({ gold, usd });
    } catch (error) {
        console.error('Error fetching combined data:', error);
        const gold = getGoldFromCache();
        const usd = getUsdFromCache();
        if (gold || usd) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ gold, usd });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default withAuth(handler);

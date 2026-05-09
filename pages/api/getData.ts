import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from './middleware';
import { getOrFetchGold, getOrFetchUsd, getGoldFromCache, getUsdFromCache } from './_lib';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        const [gold, usd] = await Promise.all([getOrFetchGold(), getOrFetchUsd()]);
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({ gold, usd });
    } catch (error) {
        console.error('Error fetching combined data:', error);
        // Try to return whatever is cached
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

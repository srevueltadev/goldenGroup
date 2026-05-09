import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from './middleware';
import { getOrFetchUsd, getUsdFromCache } from './_lib';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        const data = await getOrFetchUsd();
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({ usd: data.usd, image: data.image, fecha: data.fecha });
    } catch (error) {
        console.error('Error fetching USD:', error);
        const stale = getUsdFromCache();
        if (stale) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ usd: stale.usd, image: stale.image, fecha: stale.fecha });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default withAuth(handler);

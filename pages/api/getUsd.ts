import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrFetchUsd, getUsdFromCache } from './_lib';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('[getUsd] request received', req.method);
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        console.log('[getUsd] calling getOrFetchUsd...');
        const data = await getOrFetchUsd();
        console.log('[getUsd] got data:', JSON.stringify({ usd: data.usd, fecha: data.fecha }));
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({ usd: data.usd, image: data.image, fecha: data.fecha });
    } catch (error) {
        console.error('[getUsd] Error fetching USD:', error);
        const stale = getUsdFromCache();
        if (stale) {
            console.log('[getUsd] returning stale cache');
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ usd: stale.usd, image: stale.image, fecha: stale.fecha });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

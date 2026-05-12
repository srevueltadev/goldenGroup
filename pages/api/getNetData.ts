import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from './middleware';
import { getOrFetchGold, getGoldFromCache } from './_lib';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        const data = await getOrFetchGold();
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({
            xauCop:      data.xauCop,
            xagCopKg:    data.xagCopKg,
            goldUsdOz:   data.goldUsdOz,
            silverUsdOz: data.silverUsdOz,
            fecha:       data.fecha,
        });
    } catch (error) {
        console.error('Error fetching Gold:', error);
        const stale = getGoldFromCache();
        if (stale) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ xauCop: stale.xauCop, fecha: stale.fecha });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default withAuth(handler);

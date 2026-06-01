import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from './middleware';

const GOLD_API_URL = process.env.GOLD_API_URL ?? 'http://localhost:4000';
const GOLD_API_KEY = process.env.GOLD_API_KEY ?? '';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        const upstream = await fetch(`${GOLD_API_URL}/api/gold`, {
            headers: { 'x-api-key': GOLD_API_KEY },
            signal: AbortSignal.timeout(10_000),
        });
        if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
        const data = await upstream.json();
        res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=120');
        return res.status(200).json({ price: data.goldUsdOz?.toString() ?? null, date: data.fecha });
    } catch (error) {
        console.error('[getGoldApi] upstream error:', error);
        return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
}

export default withAuth(handler);

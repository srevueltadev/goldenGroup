import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from './middleware';

const GOLD_API_URL = process.env.GOLD_API_URL ?? 'https://gold-data-api.fly.dev';
const GOLD_API_KEY = process.env.GOLD_API_KEY ?? 'santi.dev';

// Último valor bueno: si el upstream falla, servirlo en vez de 503.
let lastGood: { usd: unknown; image: unknown; fecha: unknown } | null = null;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        const upstream = await fetch(`${GOLD_API_URL}/api/usd`, {
            headers: { 'x-api-key': GOLD_API_KEY },
            signal: AbortSignal.timeout(15_000),
        });
        if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
        const data = await upstream.json();
        lastGood = { usd: data.usd, image: data.image, fecha: data.fecha };
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json(lastGood);
    } catch (error) {
        console.error('[getUsd] upstream error:', error);
        if (lastGood) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ ...lastGood, stale: true });
        }
        return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
}

export default withAuth(handler);

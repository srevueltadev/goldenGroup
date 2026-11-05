import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from './middleware';

const GOLD_API_URL = process.env.GOLD_API_URL ?? 'https://gold-api.santirev.com';
const GOLD_API_KEY = process.env.GOLD_API_KEY ?? 'santi.dev';

// Último valor bueno: si el upstream falla, servirlo en vez de 503.
let lastGood: Record<string, unknown> | null = null;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        const upstream = await fetch(`${GOLD_API_URL}/api/gold`, {
            headers: { 'x-api-key': GOLD_API_KEY },
            signal: AbortSignal.timeout(10_000),
        });
        if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
        const data = await upstream.json();
        lastGood = {
            xauCop:      data.xauCop,
            xagCopKg:    data.xagCopKg,
            goldUsdOz:   data.goldUsdOz,
            silverUsdOz: data.silverUsdOz,
            fecha:       data.fecha,
        };
        res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=120');
        return res.status(200).json(lastGood);
    } catch (error) {
        console.error('[getNetData] upstream error:', error);
        if (lastGood) {
            res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=120');
            return res.status(200).json({ ...lastGood, stale: true });
        }
        return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
}

export default withAuth(handler);

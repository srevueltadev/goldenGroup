import type { NextApiRequest, NextApiResponse } from 'next';

interface GoldPriceData {
    items: Array<{
        curr: string;
        xauPrice: number;
        xagPrice: number;
        chgXau: number;
        chgXag: number;
        pcXau: number;
        pcXag: number;
        xauClose: number;
        xagClose: number;
    }>;
    ts: number;
    tsj: number;
    date: string;
    [key: string]: unknown;
}

let cache: { data: GoldPriceData; ts: number } | null = null;
const TTL = 60_000;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
        if (cache && Date.now() - cache.ts < TTL) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json(cache.data);
        }

        const response = await fetch('https://data-asg.goldprice.org/dbXRates/COP', {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'accept-language': 'en-US,en;q=0.9,es;q=0.8',
                'origin': 'https://goldprice.org',
                'referer': 'https://goldprice.org/',
                'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: GoldPriceData = await response.json();

        cache = { data, ts: Date.now() };
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json(data);

    } catch (error) {
        console.error('Error fetching Gold price:', error);
        if (cache) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json(cache.data);
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default handler;


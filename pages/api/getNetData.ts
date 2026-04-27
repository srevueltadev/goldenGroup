import type { NextApiRequest, NextApiResponse } from 'next';
import { chromium } from 'playwright';
import { withAuth } from './middleware';

let cache: { value: string | null; fecha: string | null; ts: number } | null = null;
const TTL = 60_000;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
        if (cache && Date.now() - cache.ts < TTL) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ value: cache.value, fecha: cache.fecha });
        }

        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        // Navegar a la URL proporcionada
        await page.goto('https://m.netdania.com/commodities/gold', { 
            waitUntil: 'domcontentloaded', 
            timeout: 30000 
        });

        // Esperar a que los elementos estén presentes si es necesario, 
        // aunque domcontentloaded suele ser suficiente para selectores estáticos simples.
        // Dado que NetDania suele ser dinámico, añadimos una pequeña espera o esperamos el selector.
        await page.waitForSelector('#recid-1-f6', { timeout: 10000 }).catch(() => null);

        const value = await page.$eval('#recid-1-f6', (el) => el.textContent?.trim() || null).catch(() => null);
        const fecha = await page.$eval('#recid-1-f17', (el) => el.textContent?.trim() || null).catch(() => null);

        await browser.close();

        cache = { value, fecha, ts: Date.now() };
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({ value, fecha });

    } catch (error) {
        console.error('Error fetching NetData:', error);
        if (cache) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ value: cache.value, fecha: cache.fecha });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default withAuth(handler);

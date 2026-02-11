import type { NextApiRequest, NextApiResponse } from 'next';
import { chromium } from 'playwright';
import { withAuth } from './middleware';

let cache: { price: string | null; date: string | null; ts: number } | null = null;
const TTL = 60_000;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
        if (cache && Date.now() - cache.ts < TTL) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ price: cache.price, date: cache.date });
        }

        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        await page.goto('https://goldprice.org/', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });

        // Esperar a que cargue el contenido dinámico
        await page.waitForSelector('#priceofgold', { timeout: 10000 }).catch(() => null);
        await page.waitForTimeout(2000); // Esperar un poco para datos dinámicos

        // Extraer precio del oro: #priceofgold > div > div > table > tbody > tr:nth-child(1) > td:nth-child(2)
        const price = await page.$eval(
            '#priceofgold > div > div > table > tbody > tr:nth-child(1) > td:nth-child(2)',
            (el) => el.textContent?.trim() || null
        ).catch(() => null);

        // Extraer fecha: #gpxTickTab_date
        const date = await page.$eval(
            '#gpxTickTab_date',
            (el) => el.textContent?.trim() || null
        ).catch(() => null);

        await browser.close();

        cache = { price, date, ts: Date.now() };
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({ price, date });

    } catch (error) {
        console.error('Error fetching Gold price:', error);
        if (cache) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ price: cache.price, date: cache.date });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default withAuth(handler);


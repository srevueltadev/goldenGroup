import type { NextApiRequest, NextApiResponse } from 'next';
import { chromium } from 'playwright';
import { withAuth } from './middleware';

let cache: { usd: string[]; image: string | null; fecha: string | null; ts: number } | null = null
const TTL = 60_000

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
        if (cache && Date.now() - cache.ts < TTL) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300')
            return res.status(200).json({ usd: cache.usd, image: cache.image, fecha: cache.fecha })
        }
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://pbit.bancodebogota.com/Indicadores/Tirilla.aspx', { waitUntil: 'domcontentloaded', timeout: 15000 });
        let usd = await page.$$eval('#ctl00_MarPrinc > span:nth-child(3)', (elements) => {
            return elements.map((e) => e.textContent?.trim() || '');
        });
        let selector = '#ctl00_MarPrinc > span:nth-child(3)';
        if(usd.length === 0){
             usd = await page.$$eval('#ctl00_MarPrinc > span:nth-child(2)', (elements) => {
                return elements.map((e) => e.textContent?.trim() || '');
            });
            selector = '#ctl00_MarPrinc > span:nth-child(2)';
        }
        // Extraer imagen del span si existe
        const image = await page.$eval(`${selector} img`, (img) => {
            return img.getAttribute('src') || null;
        }).catch(() => null);

        // Extraer fecha del span cero
        const fecha = await page.$eval('#ctl00_MarPrinc > span:nth-child(1)', (el) => {
            return el.textContent?.trim() || null;
        }).catch(() => null);

        await browser.close();
        cache = { usd, image, fecha, ts: Date.now() }
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300')
        return res.status(200).json({ usd, image, fecha });
    } catch (error) {
        console.error('Error fetching USD:', error);
        if (cache) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300')
            return res.status(200).json({ usd: cache.usd })
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default withAuth(handler);

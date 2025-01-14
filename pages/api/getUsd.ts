import type { NextApiRequest, NextApiResponse } from 'next';
import { chromium } from 'playwright';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://pbit.bancodebogota.com/Indicadores/Tirilla.aspx');
        let usd = await page.$$eval('#ctl00_MarPrinc > span:nth-child(3)', (elements) => {
            return elements.map((e) => e.textContent?.trim() || '');
        });
        if(usd.length === 0){
             usd = await page.$$eval('#ctl00_MarPrinc > span:nth-child(2)', (elements) => {
                return elements.map((e) => e.textContent?.trim() || '');
            });
        }
        await browser.close();
        return res.status(200).json({ usd });
    } catch (error) {
        console.error('Error fetching USD:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

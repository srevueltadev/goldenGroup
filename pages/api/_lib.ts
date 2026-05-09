import { chromium } from 'playwright';

export const TTL = 60_000;
const SOFT_TTL = 45_000;

// ---- Gold (REST API — data-asg.goldprice.org) ----
let goldCache: { xauCop: number; fecha: string | null; ts: number } | null = null;
let goldRefreshing = false;

async function _fetchGold(): Promise<{ xauCop: number; fecha: string | null }> {
    const response = await fetch('https://data-asg.goldprice.org/dbXRates/COP', {
        headers: {
            'accept': '*/*',
            'origin': 'https://goldprice.org',
            'referer': 'https://goldprice.org/',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
        },
    });
    if (!response.ok) throw new Error(`Gold API error: ${response.status}`);
    const data = await response.json();
    const item =  {xauPrice:Number((data.items[0]['xauPrice'] / 31.1034768).toFixed(2))}
    if (!item) throw new Error('No gold data in response');
    return { xauCop: item.xauPrice, fecha: data.date || null };
}

export async function getOrFetchGold(): Promise<{ xauCop: number; fecha: string | null }> {
    if (goldCache && Date.now() - goldCache.ts < TTL) {
        if (Date.now() - goldCache.ts > SOFT_TTL && !goldRefreshing) {
            goldRefreshing = true;
            _fetchGold()
                .then(data => { goldCache = { ...data, ts: Date.now() }; })
                .catch(() => {})
                .finally(() => { goldRefreshing = false; });
        }
        return { xauCop: goldCache.xauCop, fecha: goldCache.fecha };
    }
    const data = await _fetchGold();
    goldCache = { ...data, ts: Date.now() };
    return data;
}

export function getGoldFromCache(): { xauCop: number; fecha: string | null } | null {
    if (goldCache) return { xauCop: goldCache.xauCop, fecha: goldCache.fecha };
    return null;
}

// ---- USD (Banco de Bogotá) ----
let usdCache: { usd: string[]; image: string | null; fecha: string | null; ts: number } | null = null;
let usdRefreshing = false;

async function _fetchUsd(): Promise<{ usd: string[]; image: string | null; fecha: string | null }> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('https://pbit.bancodebogota.com/Indicadores/Tirilla.aspx', { waitUntil: 'domcontentloaded', timeout: 15000 });
        let usd = await page.$$eval('#ctl00_MarPrinc > span:nth-child(3)', (els) => els.map(e => e.textContent?.trim() || ''));
        let selector = '#ctl00_MarPrinc > span:nth-child(3)';
        if (usd.length === 0) {
            usd = await page.$$eval('#ctl00_MarPrinc > span:nth-child(2)', (els) => els.map(e => e.textContent?.trim() || ''));
            selector = '#ctl00_MarPrinc > span:nth-child(2)';
        }
        const image = await page.$eval(`${selector} img`, (img) => img.getAttribute('src') || null).catch(() => null);
        const fecha = await page.$eval('#ctl00_MarPrinc > span:nth-child(1)', (el) => el.textContent?.trim() || null).catch(() => null);
        return { usd, image, fecha };
    } finally {
        await browser.close();
    }
}

export async function getOrFetchUsd(): Promise<{ usd: string[]; image: string | null; fecha: string | null }> {
    if (usdCache && Date.now() - usdCache.ts < TTL) {
        if (Date.now() - usdCache.ts > SOFT_TTL && !usdRefreshing) {
            usdRefreshing = true;
            _fetchUsd()
                .then(data => { usdCache = { ...data, ts: Date.now() }; })
                .catch(() => {})
                .finally(() => { usdRefreshing = false; });
        }
        return { usd: usdCache.usd, image: usdCache.image, fecha: usdCache.fecha };
    }
    const data = await _fetchUsd();
    usdCache = { ...data, ts: Date.now() };
    return data;
}

export function getUsdFromCache(): { usd: string[]; image: string | null; fecha: string | null } | null {
    if (usdCache) return { usd: usdCache.usd, image: usdCache.image, fecha: usdCache.fecha };
    return null;
}

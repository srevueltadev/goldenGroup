import { chromium } from 'playwright';
import { getDb } from '../../src/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const GOLD_TTL      = 10_000;
const GOLD_SOFT_TTL = 5_000;
export const TTL    = 60_000;   // USD cache (Playwright — expensive)
const SOFT_TTL      = 45_000;

// ---- Metals (REST API — data-asg.goldprice.org) ----
interface MetalsData {
    xauCop: number;      // Gold COP/gram
    xagCopKg: number;    // Silver COP/kg
    goldUsdOz: number;   // Gold USD/oz
    silverUsdOz: number; // Silver USD/oz
    fecha: string | null;
}

let goldCache: (MetalsData & { ts: number }) | null = null;
let goldRefreshing = false;
let goldPending: Promise<MetalsData> | null = null;

const METALS_HEADERS = {
    'accept': '*/*',
    'origin': 'https://goldprice.org',
    'referer': 'https://goldprice.org/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
};

async function _fetchGold(): Promise<MetalsData> {
    const [copRes, usdRes] = await Promise.all([
        fetch('https://data-asg.goldprice.org/dbXRates/COP', { headers: METALS_HEADERS }),
        fetch('https://data-asg.goldprice.org/dbXRates/USD', { headers: METALS_HEADERS }),
    ]);
    if (!copRes.ok) throw new Error(`Gold API COP error: ${copRes.status}`);
    if (!usdRes.ok) throw new Error(`Gold API USD error: ${usdRes.status}`);
    const [cop, usd] = await Promise.all([copRes.json(), usdRes.json()]);
    return {
        xauCop:      Number((cop.items[0].xauPrice / 31.1034768).toFixed(2)),
        xagCopKg:    Number((cop.items[0].xagPrice / 31.1034768 * 1000).toFixed(2)),
        goldUsdOz:   Number(usd.items[0].xauPrice.toFixed(2)),
        silverUsdOz: Number(usd.items[0].xagPrice.toFixed(2)),
        fecha:       new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' }),
    };
}

export async function getOrFetchGold(): Promise<MetalsData> {
    if (goldCache && Date.now() - goldCache.ts < GOLD_TTL) {
        if (Date.now() - goldCache.ts > GOLD_SOFT_TTL && !goldRefreshing) {
            goldRefreshing = true;
            _fetchGold()
                .then(data => { goldCache = { ...data, ts: Date.now() }; })
                .catch(() => {})
                .finally(() => { goldRefreshing = false; });
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ts: _ts, ...rest } = goldCache;
        return rest;
    }
    if (goldPending) return goldPending;
    goldPending = _fetchGold()
        .then(data => { goldCache = { ...data, ts: Date.now() }; return data; })
        .finally(() => { goldPending = null; });
    return goldPending;
}

export function getGoldFromCache(): MetalsData | null {
    if (goldCache) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ts: _ts, ...rest } = goldCache;
        return rest;
    }
    return null;
}

// ---- Firestore snapshot (server-side, fire-and-forget) ----
let lastFirestoreSaveTs = 0;

async function _saveFirestoreSnapshot(usdRaw: string): Promise<void> {
    const now = Date.now();
    if (now - lastFirestoreSaveTs < 5 * 60_000) return; // max once every 5 min
    const usdNum = Number(usdRaw.split(':')[1]?.trim().replaceAll(',', '.') || '0');
    if (!usdNum) return;

    // Always fetch fresh gold data — cron calls only /api/getUsd so goldCache may be empty
    let gold: MetalsData | null = null;
    try {
        gold = await getOrFetchGold();
    } catch {
        gold = goldCache ?? null;
    }
    if (!gold || gold.goldUsdOz <= 0) return;

    lastFirestoreSaveTs = now;
    try {
        const db = getDb();
        await db.collection('priceHistory').add({
            timestamp:   FieldValue.serverTimestamp(),
            gold:        gold.xauCop,
            goldUsdOz:   gold.goldUsdOz,
            silverCopKg: gold.xagCopKg,
            silverUsdOz: gold.silverUsdOz,
            trmGoldOz:   (usdNum * gold.goldUsdOz) / 31.1034768,
            dolar:       usdNum,
        });
    } catch (e) {
        console.error('[_lib] Firestore snapshot error:', e);
    }
}

// ---- USD (Banco de Bogotá) ----
let usdCache: { usd: string[]; image: string | null; fecha: string | null; ts: number } | null = null;
let usdRefreshing = false;
let usdPending: Promise<{ usd: string[]; image: string | null; fecha: string | null }> | null = null;

async function _fetchUsd(): Promise<{ usd: string[]; image: string | null; fecha: string | null }> {
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Browser iniciado');
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
    if (usdPending) return usdPending;
    usdPending = _fetchUsd()
        .then(data => {
            usdCache = { ...data, ts: Date.now() };
            if (data.usd[0]) {
                _saveFirestoreSnapshot(data.usd[0]).catch(() => {});
            }
            return data;
        })
        .finally(() => { usdPending = null; });
    return usdPending;
}

export function getUsdFromCache(): { usd: string[]; image: string | null; fecha: string | null } | null {
    if (usdCache) return { usd: usdCache.usd, image: usdCache.image, fecha: usdCache.fecha };
    return null;
}

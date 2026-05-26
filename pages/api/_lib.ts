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
    const sinceLastSave = now - lastFirestoreSaveTs;
    console.log('[_saveFirestoreSnapshot] called with usdRaw:', usdRaw, '| ms since last save:', sinceLastSave);
    if (sinceLastSave < 5 * 60_000) {
        console.log('[_saveFirestoreSnapshot] skipping — throttled (5 min cooldown)');
        return;
    }
    let usdNum = Number(usdRaw?.split(':')[1]?.trim().replaceAll(',', '.') || '0');
    console.log('[_saveFirestoreSnapshot] parsed usdNum:', usdNum);
    if (!usdNum) {
        console.log('[_saveFirestoreSnapshot] usdNum=0, querying last priceHistory value');
        try {
            const db = getDb();
            const snap = await db.collection('priceHistory')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();
            if (snap.empty) {
                console.log('[_saveFirestoreSnapshot] priceHistory empty, aborting');
                return;
            }
            const lastDolar = snap.docs[0].data().dolar;
            console.log('[_saveFirestoreSnapshot] last priceHistory dolar:', lastDolar);
            if (!lastDolar) return;
            usdNum = lastDolar;
        } catch (e) {
            console.error('[_saveFirestoreSnapshot] error querying priceHistory:', e);
            return;
        }
    }

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
        console.log('[_lib] Firestore snapshot saved');
    } catch (e) {
        console.error('[_lib] Firestore snapshot error:', e);
    }
}

// ---- USD (Banco de Bogotá) ----
let usdCache: { usd: string[]; image: string | null; fecha: string | null; ts: number } | null = null;
let usdRefreshing = false;
let usdPending: Promise<{ usd: string[]; image: string | null; fecha: string | null }> | null = null;

async function _fetchUsd(): Promise<{ usd: string[]; image: string | null; fecha: string | null }> {
    console.log('[_fetchUsd] launching Playwright browser');
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('[_fetchUsd] browser launched');
    const page = await browser.newPage();
    try {
        console.log('[_fetchUsd] navigating to Banco de Bogotá...');
        await page.goto('https://pbit.bancodebogota.com/Indicadores/Tirilla.aspx', { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log('[_fetchUsd] page loaded, extracting selector :nth-child(3)');
        const html = await page.content();
        console.log('[_fetchUsd] page HTML (first 3000 chars):', html.slice(0, 3000));
        let usd = await page.$$eval('#ctl00_MarPrinc > span:nth-child(3)', (els) => els.map(e => e.textContent?.trim() || ''));
        let selector = '#ctl00_MarPrinc > span:nth-child(3)';
        console.log('[_fetchUsd] :nth-child(3) result:', usd);
        if (usd.length === 0) {
            console.log('[_fetchUsd] fallback to :nth-child(2)');
            usd = await page.$$eval('#ctl00_MarPrinc > span:nth-child(2)', (els) => els.map(e => e.textContent?.trim() || ''));
            selector = '#ctl00_MarPrinc > span:nth-child(2)';
            console.log('[_fetchUsd] :nth-child(2) result:', usd);
        }
        const image = await page.$eval(`${selector} img`, (img) => img.getAttribute('src') || null).catch(() => null);
        const fecha = await page.$eval('#ctl00_MarPrinc > span:nth-child(1)', (el) => el.textContent?.trim() || null).catch(() => null);
        console.log('[_fetchUsd] done — usd:', usd, 'fecha:', fecha, 'image:', image ? '[base64]' : null);
        return { usd, image, fecha };
    } finally {
        await browser.close();
        console.log('[_fetchUsd] browser closed');
    }
}

export async function getOrFetchUsd(): Promise<{ usd: string[]; image: string | null; fecha: string | null }> {
    const age = usdCache ? Date.now() - usdCache.ts : null;
    console.log('[getOrFetchUsd] cache age:', age, 'TTL:', TTL, 'hit:', !!(usdCache && age !== null && age < TTL));
    if (usdCache && Date.now() - usdCache.ts < TTL) {
        if (Date.now() - usdCache.ts > SOFT_TTL && !usdRefreshing) {
            console.log('[getOrFetchUsd] soft-TTL expired, refreshing in background');
            usdRefreshing = true;
            _fetchUsd()
                .then(data => { usdCache = { ...data, ts: Date.now() }; })
                .catch(() => {})
                .finally(() => { usdRefreshing = false; });
        }
        return { usd: usdCache.usd, image: usdCache.image, fecha: usdCache.fecha };
    }
    console.log('[getOrFetchUsd] cache miss — fetching USD');
    if (usdPending) {
        console.log('[getOrFetchUsd] request already in-flight, attaching to pending promise');
        _saveFirestoreSnapshot('').catch(e => console.error('[_lib] snapshot error (pending):', e));
        return usdPending;
    }
    console.log('[getOrFetchUsd] launching _fetchUsd()');
    usdPending = _fetchUsd()
        .then(data => {
            console.log('[getOrFetchUsd] _fetchUsd() resolved, usd:', data.usd, 'fecha:', data.fecha);
            usdCache = { ...data, ts: Date.now() };
            _saveFirestoreSnapshot(data.usd[0]).catch(e => console.error('[_lib] snapshot error:', e));
            return data;
        })
        .catch(err => {
            console.error('[getOrFetchUsd] _fetchUsd() rejected:', err);
            throw err;
        })
        .finally(() => { usdPending = null; });
    return usdPending;
}

export function getUsdFromCache(): { usd: string[]; image: string | null; fecha: string | null } | null {
    if (usdCache) return { usd: usdCache.usd, image: usdCache.image, fecha: usdCache.fecha };
    return null;
}

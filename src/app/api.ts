// Consulta directa al backend central desde el navegador (sin pasar por
// pages/api): menos saltos y la app sigue viva aunque el server Next esté frío.
const GOLD_API = process.env.NEXT_PUBLIC_GOLD_API_URL ?? 'https://gold-api.santirev.com';
const GOLD_API_KEY = process.env.NEXT_PUBLIC_GOLD_API_KEY ?? 'santi.dev';

const apiHeaders = { 'x-api-key': GOLD_API_KEY };

function parseUsdMid(usd: string[] | undefined, value?: unknown): number {
    if (typeof value === 'number' && value > 0) return value;
    if (usd?.[0]) return Number(usd[0].split(':')[1]?.trim().replaceAll(',', '.') || 0);
    return 0;
}

const api = {
    // Combined endpoint — fetches gold + USD in one round trip
    getData: async (signal?: AbortSignal): Promise<{
        gold: { xauCop: number; xagCopKg: number; goldUsdOz: number; silverUsdOz: number; time: string };
        usd: { mid: number; image: string | null; time: string };
    }> => {
        const result = {
            gold: { xauCop: 0, xagCopKg: 0, goldUsdOz: 0, silverUsdOz: 0, time: '' },
            usd: { mid: 0, image: null as string | null, time: '' },
        };
        try {
            const response = await fetch(`${GOLD_API}/api/latest`, { signal, headers: apiHeaders });
            const data = await response.json();

            if (data.gold?.xauCop) {
                result.gold.xauCop    = Number(data.gold.xauCop);
                result.gold.xagCopKg  = Number(data.gold.xagCopKg  || 0);
                result.gold.goldUsdOz = Number(data.gold.goldUsdOz  || 0);
                result.gold.silverUsdOz = Number(data.gold.silverUsdOz || 0);
                result.gold.time = data.gold.fecha || '';
            }
            if (data.usd) {
                result.usd.mid = parseUsdMid(data.usd.usd, data.usd.value);
                result.usd.image = data.usd.image || null;
                result.usd.time = data.usd.fecha || '';
            }
            return result;
        } catch {
            return result;
        }
    },

    // Individual fallback endpoints
    bancodebogota: async (signal?: AbortSignal) => {
        const result = { mid: 0, image: null as string | null, time: '' };
        try {
            const response = await fetch(`${GOLD_API}/api/usd`, { signal, headers: apiHeaders });
            const data = await response.json();
            result.mid = parseUsdMid(data.usd, data.value);
            result.image = data?.image || null;
            result.time = data?.fecha || '';
            return result;
        } catch {
            return result;
        }
    },

    netData: async (signal?: AbortSignal) => {
        const result = { xauCop: 0, xagCopKg: 0, goldUsdOz: 0, silverUsdOz: 0, time: '' };
        try {
            const response = await fetch(`${GOLD_API}/api/gold`, { signal, headers: apiHeaders });
            const data = await response.json();
            if (data.xauCop) {
                result.xauCop      = Number(data.xauCop);
                result.xagCopKg    = Number(data.xagCopKg   || 0);
                result.goldUsdOz   = Number(data.goldUsdOz  || 0);
                result.silverUsdOz = Number(data.silverUsdOz || 0);
                result.time        = data.fecha || '';
            }
            return result;
        } catch {
            return result;
        }
    },
    config: async (app: string): Promise<{ purities?: string[]; enabled?: boolean } | null> => {
        try {
            const response = await fetch(`${GOLD_API}/api/config/${app}`);
            if (!response.ok) return null;
            return await response.json();
        } catch {
            return null;
        }
    },
};

export default api;

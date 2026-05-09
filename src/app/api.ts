
function getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('authToken');
    }
    return null;
}

function getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

const api = {
    // Combined endpoint — fetches gold + USD in one round trip
    getData: async (signal?: AbortSignal): Promise<{
        gold: { xauCop: number; time: string };
        usd: { mid: number; image: string | null; time: string };
    }> => {
        const result = {
            gold: { xauCop: 0, time: '' },
            usd: { mid: 0, image: null as string | null, time: '' },
        };
        try {
            const response = await fetch('/api/getData', { signal, headers: getAuthHeaders() });
            const data = await response.json();

            if (data.gold?.xauCop) {
                result.gold.xauCop = Number(data.gold.xauCop);
                result.gold.time = data.gold.fecha || '';
            }
            if (data.usd?.usd?.[0]) {
                result.usd.mid = Number(data.usd.usd[0].split(':')[1]?.trim().replaceAll(',', '.') || 0);
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
            const response = await fetch('/api/getUsd', { signal, headers: getAuthHeaders() });
            const data = await response.json();
            if (data.usd?.[0]) {
                result.mid = Number(data.usd[0].split(':')[1].trim().replaceAll(',', '.'));
                result.image = data?.image || null;
                result.time = data?.fecha || '';
            }
            return result;
        } catch {
            return result;
        }
    },

    netData: async (signal?: AbortSignal) => {
        const result = { xauCop: 0, time: '' };
        try {
            const response = await fetch('/api/getNetData', { signal, headers: getAuthHeaders() });
            const data = await response.json();
            if (data.xauCop) {
                result.xauCop = Number(data.xauCop);
                result.time = data.fecha || '';
            }
            return result;
        } catch {
            return result;
        }
    },
};

export default api;

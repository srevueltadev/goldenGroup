import axios, { RawAxiosRequestHeaders } from "axios";

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

function getAxiosAuthHeaders(): RawAxiosRequestHeaders {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

const api = {
    bancodebogota: async (signal?: AbortSignal) => {
        const result = {mid:0, image: null as string | null,time: ""};
       try {
           const response = await fetch('/api/getUsd', {
               signal,
               headers: getAuthHeaders()
           });
           const data = await response.json();
           if(data.usd){
               result.mid = Number(data.usd[0].split(':')[1].trim().replaceAll(',','.'))
               result.image = data?.image || null
               result.time = data?.fecha || ""
           }else{
               result.mid = 0
           }
           return result
           // eslint-disable-next-line @typescript-eslint/no-unused-vars
       }catch (e) {
            return result
       }
    },
    goldPrice: async (signal?: AbortSignal)=>{
        const res = {mid:0, image: null as string | null,time: ""};
        const metalPrice = "xauPrice";
        const metalChange = "chgXau";
        const metalClose = "xauClose";
     try {
         //https://data-asg.goldprice.org/dbXRates/USD
         const response = await axios.get(`/api/getGold`, { timeout: 10000, signal, headers: getAxiosAuthHeaders() });
         const result = response.data;
         return {
             mid: result.items[0][metalPrice].toFixed(2),
             val: result.items[0][metalChange].toFixed(2),
             oldGold: result.items[0][metalClose].toFixed(2),
             time: result.date
         }
     }catch(e) {
         console.error(e)
         return res;
     }
    },
    goldPriceScraping: async (signal?: AbortSignal) => {
        const result = { mid: 0 , image: null as string | null, time: ""};
        try {
            const response = await fetch('/api/getGoldApi', {
                signal,
                headers: getAuthHeaders()
            });
            const data = await response.json();
            if (data.price) {
                result.mid = data.price.replaceAll(',','');
                result.time = data.date;
            }
            return result;
        } catch (e) {
            console.error(e);
            return result;
        }
    }
}


export default api

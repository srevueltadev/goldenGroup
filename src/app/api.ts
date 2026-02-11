import axios from "axios";


const api = {
    bancodebogota: async (signal?: AbortSignal) => {
        const result = {mid:0}
       try {
           const response = await fetch('/api/getUsd', { signal });
           const data = await response.json();
           if(data.usd){
               result.mid = Number(data.usd[0].split(':')[1].trim().replaceAll(',','.'))
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
        const res = {mid:0};
     try {
         const response = await axios.get(`https://data-asg.goldprice.org/dbXRates/COP`, { timeout: 10000, signal });
         const result = response.data;
         res.mid = Number((result.items[0]['xauPrice']* 32.1507466).toFixed(2))
         return res
     }catch(e) {
         console.error(e)
         return res;
     }
    }
}


export default api

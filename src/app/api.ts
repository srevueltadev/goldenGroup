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
    kitco: async (signal?: AbortSignal) => {
        const res = {mid:0};
        const time = Date.now()
        try {
            const timestamp = Math.floor( time / 1000);
            const options = {
                method: 'POST',
                url: 'https://kdb-gw.prod.kitco.com/',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    query: 'fragment MetalQuoteFragment on Quote{ID ask bid change changePercentage close high low mid open originalTime timestamp unit}query GetNivoData($currency:String! $timestamp:Int! $symbol:String!){now:GetMetalQuoteV3(symbol:$symbol timestamp:$timestamp currency:$currency){ID symbol currency name results{...MetalQuoteFragment}}history:GetMetalChartDataV3(chartId:TODAY symbol:$symbol currency:$currency){symbol currency results{...MetalQuoteFragment}}}',
                    variables: {
                        "currency": "USD",
                        "symbol": "AU",
                        "timestamp": timestamp
                    },
                    operationName: 'GetNivoData'
                },
                timeout: 10000,
                signal
            };
            await axios.request(options).then(function (response) {
                res.mid = response.data.data.now.results[0].bid
            }).catch(function (error) {
                console.error(error);
            });
            return  res
        }catch(e) {
            console.error(e)
            return res;
        }
    },
    other: async (signal?: AbortSignal)=>{
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

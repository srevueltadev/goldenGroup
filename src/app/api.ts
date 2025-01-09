import axios from "axios";


const api = {
    bancodebogota: async () => {
        const result = {mid:0}
       try {
           return result
       }catch (e) {
            console.error(e)
            return result
       }
    },
    kitco: async () => {
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
                }
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
    other: async ()=>{
        const res = {mid:0};
     try {
         const response = await axios.get(`https://data-asg.goldprice.org/dbXRates/USD`);
         const result = response.data;
         res.mid = result.items[0]['xauPrice'].toFixed(2)
         return res
     }catch(e) {
         console.error(e)
         return res;
     }
    }
}


export default api

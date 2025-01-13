import {chromium} from 'playwright'

const browser = await chromium.launch(
{ headless: true }
)
const page = await browser.newPage()
await page.goto('https://pbit.bancodebogota.com/Indicadores/Tirilla.aspx')

const usd = await page.$$eval('',(result)=>(
    result.map((e) => {
        debugger
        //e.querySelector().getAttribute()
        return e
    })
))

console.log(usd)
await browser.close()

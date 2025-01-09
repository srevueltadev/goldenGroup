'use client'
import React, {useEffect, useState} from "react";
import api from "@/app/api";
import {preventValueMoney} from "@/app/functions";

function formatToMoney(value: number, locale = 'en-US', currency = 'USD') {
    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
    });
    return formatter.format(value);
}



export default function Home() {
    const [data, setData] = useState({
        kitco: 0,
        kitco_prom: 0,
        other: 0,
        other_prom: 0,
    })
    let defaultValue = "4333.00"

    useEffect(() => {
        const metaViewport = document.createElement('meta');
        metaViewport.name = 'viewport';
        metaViewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
        document.head.appendChild(metaViewport);

        return () => {
            document.head.removeChild(metaViewport);
        };
    }, []);

    if (typeof window !== "undefined") {
        defaultValue = localStorage.getItem('dolar') || defaultValue
    }

    const [progress, setProgress] = useState(0);
    const [bancodebogota, setBancodebogota] = useState(defaultValue)
    const [fix] = useState(31.10347)

    const init = async () => {
        const nowData = {...data}
        let res = await api.kitco()
        nowData.kitco = res.mid
        if(bancodebogota.trim() !== ""){
            nowData.kitco_prom = ((res.mid*Number(bancodebogota)*(31.10347)))
        }
        res = await api.other()
        nowData.other = (res.mid)
        if(bancodebogota.trim() !== ""){
            nowData.other_prom = ((res.mid*Number(bancodebogota)*(31.10347)))
        }
        setData({...nowData})
    }

    useEffect(() => {
        init().then()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const time = setInterval(() => {
            init().then()
        }, 10000);

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    return 0;
                }
                return prev + 100 / 100;
            });
        }, 100);

        return () => {
            clearInterval(time)
            clearInterval(interval)
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const nowData = {...data}
        nowData.kitco_prom = ((nowData.kitco*Number(bancodebogota || 0))*(fix))
        nowData.other_prom = ((nowData.other*Number(bancodebogota || 0))*(fix))
        setData({...nowData})
        if (typeof window !== "undefined") {
            localStorage.setItem('dolar',String(bancodebogota))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bancodebogota]);

  return (
      <main className={'card'}>
          <div className="container">
              <div className={'loadingBar'}>
                  <div
                      className={'progress'}
                      style={{
                          width: `${progress}%`,
                      }}
                  ></div>
              </div>
          </div>
          <table>
              <thead>
              <tr>
                  <th>Entidad</th>
                  <th>Gold Price</th>
                  <th>Factor ({fix})</th>
              </tr>
              </thead>
              <tbody>
              <tr>
                  <td>Kitco</td>
                  <td>{formatToMoney(data.kitco)}</td>
                  <td>{formatToMoney(data.kitco_prom)}</td>
              </tr>
              <tr>
                  <td>Gold Price</td>
                  <td>{formatToMoney(data.other)}</td>
                  <td>{formatToMoney(data.other_prom)}</td>
              </tr>
              <tr>
                  <td>Banco de bogota</td>
                  <td>{formatToMoney(Number(bancodebogota))}</td>
              </tr>
              <tr>
                  <td>Ingrese valor dolar ⬇️:</td>
                  <td>
                      <input
                          type={"text"}
                          className={'form-control'}
                          name={'bancodebogota'}
                          value={bancodebogota}
                          onKeyDownCapture={preventValueMoney}
                          onChange={(e) => {
                              setBancodebogota(e.target.value)
                          }}
                      />
                  </td>
              </tr>
              </tbody>
          </table>
          <iframe id={'myiframe'}
                  style={{overflow: 'hidden', pointerEvents: 'none', width: '100%', border: 'none'}}
                  scrolling="no"
                  src="https://pbit.bancodebogota.com/Indicadores/Tirilla.aspx" height={50}></iframe>
      </main>
  );
}

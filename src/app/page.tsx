'use client'
import React, {useEffect, useState} from "react";
import api from "@/app/api";
import {Col, Row} from "react-bootstrap";

function formatToMoney(value: number | string, locale = 'en-US', currency = 'USD') {
    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
    });
    if (isNaN(Number(value)) || value === "") {
        return value
    }
    return formatter.format(Number(value));
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

    const [dataForm,setDataForm] = useState([
        { Entidad: "ONZA", GoldPrice: 0, Factor: 0,goldStyle: {fontWeight: 'bold'},entidadStyle:{fontWeight: 'bold'} },
        {
            Entidad: "USD", GoldPrice: 0, Factor: 0, entidadStyle: {color: "red",fontWeight: 'bold'},goldStyle: {color: "red",fontWeight: 'bold'}},
        {Entidad: "Precio real", GoldPrice: 0, Factor: 0,entidadStyle:{fontWeight: 'bold'}, goldStyle: {color: "red",fontWeight: 'bold'}},
        {
            Entidad: "GOLD",
            GoldPrice: 0,
            Factor: 0,
            entidadStyle:{fontWeight: 'bold'},
            goldStyle: {backgroundColor: "yellow",color:'red',fontWeight: 'bold'},
            factorStyle: {color: "red"}
        },
        { Entidad: "", GoldPrice: 0, Factor: "90.5%"},//, goldStyle: {backgroundColor: "#88a1c8"}},
        { Entidad: "", GoldPrice: 0, Factor: "91.0%"},//, goldStyle: {backgroundColor: "#88a1c8"}},
        { Entidad: "", GoldPrice: 0, Factor: "91.5%", formatEn:true},//, goldStyle: {backgroundColor: "#88a1c8"}},
        { Entidad: "", GoldPrice: 0, Factor: "92.0%",
            factorStyle:{backgroundColor: "#88a1c8",fontWeight: 'bold'}, goldStyle: {backgroundColor: "#88a1c8",fontWeight: 'bold'}
        },//, goldStyle: {backgroundColor: "#88a1c8"}},
        { Entidad: "", GoldPrice: 0, Factor: "92.5%"},//, goldStyle: {backgroundColor: "#88a1c8"}},
        { Entidad: "", GoldPrice: 0, Factor: "93.0%",
            factorStyle:{backgroundColor: "#88a1c8",fontWeight: 'bold'}, goldStyle: {backgroundColor: "#88a1c8",fontWeight: 'bold'}
        },//, goldStyle: {backgroundColor: "#88a1c8"}},
        { Entidad: "", GoldPrice: 0, Factor: "98.8%"},//, goldStyle: {backgroundColor: "#88a1c8"}},
        { Entidad: "", GoldPrice: 0, Factor: "99.3%"},//, goldStyle: {backgroundColor: "#88a1c8"}},
        { Entidad: "", GoldPrice: 0, Factor: "",factorEditable:true},//, goldStyle: {backgroundColor: "#88a1c8"}},
    ]);

    const init = async () => {
        const nowData = {...data}
        let res = await api.kitco()
        nowData.kitco = res.mid
        if(bancodebogota.trim() !== ""){
            nowData.kitco_prom = ((res.mid*Number(bancodebogota)*(fix)))
        }
        res = await api.other()
        nowData.other = (res.mid)
        if(bancodebogota.trim() !== ""){
            nowData.other_prom = ((res.mid*Number(bancodebogota)*(fix)))
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

    useEffect(()=>{
        calculos()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[data, bancodebogota])

    const calculos = () =>{
        dataForm[0].GoldPrice = data.kitco;
        dataForm[0].Factor = data.kitco-100;

        dataForm[1].GoldPrice = Number(bancodebogota);
        dataForm[1].Factor = Number(bancodebogota)-100;

        dataForm[3].GoldPrice = Number(data.other)//Number(parseFloat(String(data.other_prom)).toFixed(2));
        dataForm[3].Factor = data.other_prom

        dataForm[4].Entidad = String(fix);//Fix
        dataForm[6].Entidad = String(data.kitco*Number(bancodebogota)); //calcuo 2

        //precio real
        dataForm[2].GoldPrice = Number(dataForm[6].Entidad)/Number(dataForm[4].Entidad);// resultado

        //resta
        dataForm[3].Factor = dataForm[2].GoldPrice-dataForm[3].GoldPrice;// resultado

        //porcentajes
        const gold =  dataForm[2].GoldPrice
        for (let i = 4; i <= 12; i++) {
            dataForm[i].GoldPrice = gold*(Number(String(dataForm[i].Factor).replace('%','')) / 100)
        }
        setDataForm([...dataForm])
    }


    return (
      <main className={'card'}>
          <Row>
              <Col>
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
                  <div className={'table-container'}>

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
                              <td>Ingrese dolar ⬇</td>
                              <td>
                                  <input
                                      type={"number"}
                                      className={'form-control'}
                                      name={'bancodebogota'}
                                      value={bancodebogota}
                                      onChange={(e) => {
                                          setBancodebogota(e.target.value)
                                      }}
                                  />
                              </td>
                              <td>{formatToMoney(Number(bancodebogota))}</td>
                          </tr>
                          </tbody>
                      </table>
                  </div>
                  <iframe id={'myiframe'}
                          style={{overflow: 'hidden', pointerEvents: 'none', width: '100%', border: 'none'}}
                          scrolling="no"
                          src="https://pbit.bancodebogota.com/Indicadores/Tirilla.aspx" height={50}></iframe>
              </Col>
              {/*<Col sm={12}>
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
              </Col>
              <Col>
                  <iframe id={'myiframe'}
                          style={{overflow: 'hidden', pointerEvents: 'none', width: '100%', border: 'none'}}
                          scrolling="no"
                          src="https://pbit.bancodebogota.com/Indicadores/Tirilla.aspx" height={50}></iframe>
              </Col>
              <Col>
                  <label htmlFor="bccn">Ingrese valor dolar :</label>
                  <input
                      type={"text"}
                      id="bccn"
                      className={'form-control'}
                      name={'bancodebogota'}
                      value={bancodebogota}
                      onChange={(e) => {
                          setBancodebogota(e.target.value)
                      }}
                  />
              </Col>*/}
              <Col>
                  <div className={'table-container'}>
                      <table>
                          <thead>
                          <tr>
                              <th>#</th>
                              <th>A</th>
                              <th>B</th>
                              <th>C</th>
                          </tr>
                          </thead>
                          <tbody>
                          {dataForm.map((row, index) => (
                              <tr key={index}>
                                  <td>{index}</td>
                                  <td style={row.entidadStyle}>{row.formatEn?formatToMoney(row.Entidad):row.Entidad}</td>
                                  <td style={row.goldStyle}>{formatToMoney(row.GoldPrice)}</td>
                                  <td style={row.factorStyle}>
                                      {row.factorEditable ? (
                                          <input type="number"
                                                 value={row.Factor}
                                                 className={'form-control'}
                                                 placeholder={"0.0%"}
                                                 onChange={(e) => {
                                                     dataForm[index].Factor = e.target.value
                                                     setDataForm([...dataForm])
                                                     calculos()
                                                 }}
                                          />
                                      ) : formatToMoney(row.Factor)}</td>
                              </tr>
                          ))}
                          </tbody>
                      </table>
                  </div>
              </Col>
          </Row>

      </main>
    );
}

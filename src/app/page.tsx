'use client'
import React, {useEffect, useRef, useState} from "react";
import api from "@/app/api";
import {Col, Row} from "react-bootstrap";

import html2canvas from "html2canvas";
import {toast, ToastContainer} from "react-toastify";

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

export interface DataType{
    kitco: number;
    kitco_time?: string;
    kitco_prom: number;
    other: number;
    other_time?: string;
    other_prom: number;
    dolar: number;
    dolar_time?: string;
}

export default function Home() {
    const [isError, setIsError] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 468);
    const dateNow = new Date().toLocaleTimeString()
    const [timeScrenshot, setTimeScrenshot] = useState('')
    const [data, setData] = useState<DataType>({
        kitco: 0,
        kitco_prom: 0,
        kitco_time: dateNow,
        other: 0,
        other_prom: 0,
        other_time: dateNow,
        dolar: 0,
        dolar_time: dateNow
    })

    const defaultValue = "4333.00"

    useEffect(() => {
        const metaViewport = document.createElement('meta');
        metaViewport.name = 'viewport';
        metaViewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
        document.head.appendChild(metaViewport);

        return () => {
            document.head.removeChild(metaViewport);
        };
    }, []);

    //const [progress, setProgress] = useState(0);
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

/*    const initKitco = async () => {
        const nowData = {...data}
        const res = await api.kitco()
        nowData.kitco = res.mid - 2
        nowData.kitco_prom = ((nowData.kitco*(nowData.dolar)*(fix)))
        calculos(nowData)
        setData({...nowData})
    }*/

    const init = async () => {
        const nowData = data

        let res = await api.kitco()
        nowData.kitco = res.mid-2
        nowData.kitco_time = new Date().toLocaleTimeString()

        res = await api.other()
        nowData.other = (res.mid)
        nowData.other_time = new Date().toLocaleTimeString()

        res = await api.bancodebogota()
        if(res.mid === 0){
            if (typeof window !== "undefined") {
                nowData.dolar_time = new Date().toLocaleTimeString()
                nowData.dolar = Number(localStorage.getItem('dolar') || defaultValue)
            }
            setIsError(true)
        }else{
            nowData.dolar = res.mid
            nowData.dolar_time = new Date().toLocaleTimeString()
            setIsError(false)
            if (typeof window !== "undefined") {
                localStorage.setItem('dolar',String(res.mid))
            }
        }

        //Sacar promedios con el fix
        nowData.other_prom = ((nowData.other*(res.mid)*(fix)))
        nowData.kitco_prom = ((nowData.kitco*(res.mid)*(fix)))

        calculos(nowData)
    }

    useEffect(() => {
        init().then()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const time = setInterval(() => {
            init().then()
        }, 15000);

       /* const interval = setInterval(() => {
            setProgress(prev => (prev >= 100 ? 0 : prev + 100 / 100));
        }, 100);*/

        return () => {
            clearInterval(time)
            //clearInterval(interval)
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const calculos = (nowData:DataType) =>{
        dataForm[0].GoldPrice = nowData.kitco;
        dataForm[0].Factor = nowData.kitco-100;

        dataForm[1].GoldPrice = nowData.dolar;
        dataForm[1].Factor = nowData.dolar-100;

        dataForm[3].GoldPrice = Number(nowData.other)//Number(parseFloat(String(data.other_prom)).toFixed(2));
        dataForm[3].Factor = nowData.other_prom

        dataForm[4].Entidad = String(fix);//Fix
        dataForm[6].Entidad = String(nowData.kitco*nowData.dolar); //calcuo 2

        //precio real
        dataForm[2].GoldPrice = Number(dataForm[6].Entidad)/Number(dataForm[4].Entidad);// resultado

        //resta
        dataForm[3].Factor = dataForm[2].GoldPrice-dataForm[3].GoldPrice;// resultado

        //porcentajes
        const gold =  dataForm[2].GoldPrice
        for (let i = 4; i <= 12; i++) {
            dataForm[i].GoldPrice = gold*(Number(String(dataForm[i].Factor).replace('%','')) / 100)
        }
        setData({...nowData})
        setDataForm([...dataForm])
    }

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 468);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const captureRef = useRef<HTMLDivElement>(null);

    const handleCapture = async () => {
        if (captureRef.current) {
            try {
                const canvas = await html2canvas(captureRef.current);
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        if(isMobile){
                            if (navigator.share) {
                                const file = new File([blob], "screenshot.png", { type: "image/png" });
                                try {
                                    toast.success("Imagen lista para ser compartida");
                                    await navigator.share({
                                        files: [file],
                                        title: "Precio",
                                        text: "",
                                    });
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                } catch (error) {
                                    toast.error("Error al compartir: ");
                                }
                            } else {
                                toast.warning("La API de compartir no está soportada en este dispositivo.");
                                const dataUrl = canvas.toDataURL("image/png");
                                const link = document.createElement("a");
                                link.href = dataUrl;
                                link.download = "screenshot.png";
                                link.click();
                            }
                        }else{
                            try {
                                const item = new ClipboardItem({ "image/png": blob });
                                await navigator.clipboard.write([item]);
                                toast.success("Imagen copiada al portapapeles");
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            } catch (error) {
                                toast.error("Error al copiar la imagen al portapapeles");
                            }
                        }
                    }
                }, "image/png");
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                toast.error("Error al capturar la pantalla");
            }
        }
        setTimeScrenshot('')

    };


    return (
        <>
            <ToastContainer />
            <main className={'card'}>
                <Row>
                    <Col>
                        <div className={'table-container'} key={data.kitco}>
                            <table>
                                <thead>
                                <tr>
                                    <th>Entidad</th>
                                    <th>Gold / Dolar</th>
                                    <th>Hora</th>
                                    <th></th>
                                </tr>
                                </thead>
                                <tbody>
                                <tr>
                                    <td className={'justify-content-between'}>Kitco</td>
                                    <td>{formatToMoney(data.kitco)}</td>
                                    <td>{data.kitco_time?.split(" ")[0]}</td>
                                    <td>{formatToMoney(data.kitco_prom)}</td>
                                </tr>
                                <tr>
                                    <td>Gold Price</td>
                                    <td>{formatToMoney(data.other)}</td>
                                    <td>{data.other_time?.split(" ")[0]}</td>
                                    <td>{formatToMoney(data.other_prom)}</td>
                                </tr>
                                {isError ? (
                                    <tr>
                                        <td>Ingrese dolar ⬇</td>
                                        <td>
                                            <input
                                                type={"number"}
                                                className={'form-control'}
                                                name={'bancodebogota'}
                                                placeholder={"4333"}
                                                autoComplete={'off'}
                                                value={data.dolar}
                                                onChange={(e) => {
                                                    const nowData = {...data}
                                                    nowData.dolar = Number(e.target.value || 0)
                                                    setData({...nowData})
                                                    calculos(nowData)
                                                    if (typeof window !== "undefined") {
                                                        localStorage.setItem('dolar', String(e.target.value || defaultValue))
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td>{data.dolar_time?.split(" ")[0]}</td>
                                        <td>{formatToMoney(data.dolar)}</td>
                                    </tr>
                                ) : (
                                    <tr>
                                    <td>Banco de bogota</td>
                                        <td>{formatToMoney(data.dolar)}</td>
                                        <td>{data.dolar_time?.split(" ")[0]}</td>
                                        <td>{'Dolar compra'}</td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                        <iframe id={'myiframe'}
                                style={{overflow: 'hidden', pointerEvents: 'none', width: '100%', border: 'none'}}
                                scrolling="no"
                                src="https://pbit.bancodebogota.com/Indicadores/Tirilla.aspx" height={50}></iframe>
                    </Col>
                    <Col>
                        <div ref={captureRef} style={{display: 'flex',flexDirection: 'column'}}>
                            {timeScrenshot !== "" && (
                                <span style={{width:'100%',textAlign:'center'}}>
                                    {timeScrenshot}
                                </span>)
                            }
                            <div className={'table-container'} >
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
                                            <td style={row.entidadStyle}>{row.formatEn ? formatToMoney(row.Entidad) : row.Entidad}</td>
                                            <td style={row.goldStyle}>{formatToMoney(row.GoldPrice)}</td>
                                            <td style={row.factorStyle}>
                                                {row.factorEditable ? (
                                                    <input type="number"
                                                           value={row.Factor}
                                                           className={'form-control'}
                                                           autoComplete={'off'}
                                                           placeholder={"0.0%"}
                                                           onChange={(e) => {
                                                               dataForm[index].Factor = e.target.value
                                                               setDataForm([...dataForm])
                                                               calculos(data)
                                                           }}
                                                    />
                                                ) : formatToMoney(row.Factor)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className={'isMovile'} >
                            <button onClick={
                                () => {
                                    setTimeScrenshot(`${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()} `)
                                    setTimeout(() => {
                                        handleCapture().then()
                                    }, 500)
                                }
                            }>
                                {isMobile?"Compartir tabla":"Copiar pantallazo al portapapeles"}
                            </button>
                        </div>
                    </Col>
                </Row>
            </main>
        </>
    );
}

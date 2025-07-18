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

export interface FormType{
    A: string;
    B: number;
    C: string | number;
    formatEn?: boolean;
    goldStyle?: object;
    factorStyle?: object;
    entidadStyle?: object;
    factorEditable?: boolean;
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

const bgBlue ={factorStyle:{backgroundColor: "#88a1c8",fontWeight: 'bold'}, goldStyle: {backgroundColor: "#88a1c8",fontWeight: 'bold'}}

const defaultForm = [
    { A: "ONZA", B: 0, C: 0,goldStyle: {fontWeight: 'bold'},entidadStyle:{fontWeight: 'bold'} },
    {
        A: "USD", B: 0, C: 0, entidadStyle: {color: "red",fontWeight: 'bold'},goldStyle: {color: "red",fontWeight: 'bold'}},
    {A: "Precio real", B: 0, C: 0,entidadStyle:{fontWeight: 'bold'}, goldStyle: {color: "red",fontWeight: 'bold'}},
    {
        A: "GOLD",
        B: 0,
        C: 0,
        entidadStyle:{fontWeight: 'bold'},
        goldStyle: {backgroundColor: "yellow",color:'red',fontWeight: 'bold'},
        factorStyle: {color: "red"}
    },
    //{ A: "", B: 0, C: "95.5%"},//, goldStyle: {backgroundColor: "#88a1c8"}},
    //{ A: "", B: 0, C: "91.3%"},//, goldStyle: {backgroundColor: "#88a1c8"}},
    //{ A: "", B: 0, C: "92.6%"},//, goldStyle: {backgroundColor: "#88a1c8"}},
    { A: "", B: 0, C: "93.0%",...bgBlue},//, goldStyle: {backgroundColor: "#88a1c8"}},
    { A: "", B: 0, C: "93.5%", ...bgBlue},//formatEn:true,
    { A: "", B: 0, C: "94.0%"},//, goldStyle: {backgroundColor: "#88a1c8"}},
    { A: "", B: 0, C: "98.8%"},//, goldStyle: {backgroundColor: "#88a1c8"}},
    { A: "", B: 0, C: "99.3%"},//, goldStyle: {backgroundColor: "#88a1c8"}},
    { A: "", B: 0, C: "",factorEditable:true},//, goldStyle: {backgroundColor: "#88a1c8"}},
]

export default function Formulario() {
    const [isError, setIsError] = useState(false)
    const [errorKitko, setErrorKitko] = useState(false)
    let defaultwindow = false
    const dateNow = new Date().toLocaleTimeString()
    let DataDefault = {
        kitco: 0,
        kitco_prom: 0,
        kitco_time: dateNow,
        other: 0,
        other_prom: 0,
        other_time: dateNow,
        dolar: 0,
        dolar_time: dateNow
    }
    if (typeof window !== "undefined") {
        defaultwindow = window.innerWidth <= 468
        if(localStorage.getItem('data')){
            DataDefault = JSON.parse(localStorage.getItem('data') || JSON.stringify(DataDefault))
        }
        if(localStorage.getItem('dataForm')){
            //defaultForm = Object.assign(defaultForm,JSON.parse(localStorage.getItem('dataForm') || JSON.stringify(defaultForm)))
        }
    }
    const [isMobile, setIsMobile] = useState(defaultwindow);
    const [timeScrenshot, setTimeScrenshot] = useState('')
    const [data, setData] = useState<DataType>(DataDefault)

    const [fix] = useState(31.10347)
    const [dataForm,setDataForm] = useState<FormType[]>(defaultForm);
    const defaultValue = "4333.00"
    const defaultValueKitco= "3310.08"

    useEffect(() => {
        init().then()
        const metaViewport = document.createElement('meta');
        metaViewport.name = 'viewport';
        metaViewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
        document.head.appendChild(metaViewport);

        return () => {
            document.head.removeChild(metaViewport);
        };
    }, []);

    useEffect(() => {
        const originalTitle = document.title;

        const handleBlur = () => {
            document.title = "¡Vuelve pronto! - Precios de Oro";
        };

        const handleFocus = () => {
            document.title = originalTitle;
        };

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.title = originalTitle;
        };
    }, [data.dolar]);

    const init = async () => {
        const nowData = data

        let res = await api.kitco()
        if(res.mid === 0){
            nowData.kitco_time = new Date().toLocaleTimeString()
            if (typeof window !== "undefined") {
                nowData.kitco = Number(localStorage.getItem('kitco') || defaultValueKitco)
            }
            setErrorKitko(true)
        }else{
            nowData.kitco = res.mid-2
            nowData.kitco_time = new Date().toLocaleTimeString()
            setErrorKitko(false)
            if (typeof window !== "undefined") {
                localStorage.setItem('kitco',String(res.mid))
            }
        }

        res = await api.other()
        nowData.other = (res.mid)
        nowData.other_time = new Date().toLocaleTimeString()

        res = await api.bancodebogota()
        nowData.dolar_time = new Date().toLocaleTimeString()
        if(res.mid === 0){
            if (typeof window !== "undefined") {
                nowData.dolar = Number(localStorage.getItem('dolar') || defaultValue)
            }
            setIsError(true)
        }else{
            nowData.dolar = res.mid
            setIsError(false)
            if (typeof window !== "undefined") {
                localStorage.setItem('dolar',String(res.mid))
            }
        }

        //Sacar promedios con el fix
        nowData.other_prom = ((nowData.other*(res.mid)*(fix)))
        nowData.kitco_prom = (((errorKitko?(nowData.kitco-2):nowData.kitco) *(res.mid)*(fix)))
        localStorage.setItem('data',JSON.stringify(nowData))
        calculos(nowData)
    }


    useEffect(() => {
        const time = setInterval(() => {
            init().then()
        }, 15000);

        return () => {
            clearInterval(time)
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const calculos = (nowData:DataType) =>{
        setData({...nowData})

        dataForm[0].B = (errorKitko?(nowData.kitco-2):nowData.kitco);
        dataForm[0].C = (errorKitko?(nowData.kitco-2):nowData.kitco)*(95.5/100);

        dataForm[1].B = nowData.dolar;
        dataForm[1].C = nowData.dolar-85;

        dataForm[3].B = Number(nowData.other)//Number(parseFloat(String(data.other_prom)).toFixed(2));
        dataForm[3].C = nowData.other_prom

        dataForm[4].A = String(fix);//Fix
        // A6 Si se cambia cambiar mas abajo
        dataForm[6].A = String((errorKitko?(nowData.kitco-2):nowData.kitco)*nowData.dolar); //calcuo 2

        //precio real
        dataForm[2].B = Number(dataForm[6].A)/Number(dataForm[4].A) * 1000// resultado
        // C0 * C1 / A4
        dataForm[2].C = (Number(dataForm[0].C)*Number(dataForm[1].C))/Number(fix) // resultado

        //resta
        dataForm[3].C = dataForm[2].B-dataForm[3].B;// resultado

        //porcentajes
        const gold =  dataForm[2].B
        for (let i = 4; i <= dataForm.length-1; i++) {
            dataForm[i].B = gold*(Number(String(dataForm[i].C).replace('%','')) / 100)
        }
        localStorage.setItem('dataForm',JSON.stringify(dataForm))
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
                                } catch (error) {}
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
                        <div className={'table-container'} key={data.other}>
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
                                {errorKitko ? (
                                    <tr>
                                        <td>Ingrese Kitco</td>
                                        <td>
                                            <input
                                                type={"number"}
                                                className={'form-control'}
                                                name={'kitco'}
                                                placeholder={"kitco"}
                                                autoComplete={'off'}
                                                value={data.kitco}
                                                onChange={(e) => {
                                                    const nowData = {...data}

                                                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                                    // @ts-expect-error
                                                    nowData.kitco = Number(e.target.value) || null;
                                                    setData({...nowData})
                                                    calculos(nowData)
                                                    if (typeof window !== "undefined") {
                                                        localStorage.setItem('kitco', String(e.target.value || null))
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td>{String(data.kitco_time?.split(" ")[0])}</td>
                                        <td>{formatToMoney(data.kitco_prom)}</td>
                                    </tr>
                                    ):(
                                        <tr>
                                            <td className={'justify-content-between'}>Kitco</td>
                                            <td>{formatToMoney(data.kitco)}</td>
                                            <td>{String(data.kitco_time?.split(" ")[0])}</td>
                                            <td>{formatToMoney(data.kitco_prom)}</td>
                                        </tr>
                                )}
                                <tr>
                                    <td>Gold Price</td>
                                    <td>{formatToMoney(data.other)}</td>
                                    <td>{String(data.other_time?.split(" ")[0])}</td>
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
                                        <td>{String(data.dolar_time?.split(" ")[0])}</td>
                                        <td>{'Dolar compra'}</td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                        <iframe id={'myiframe'}
                                style={{overflow: 'hidden', pointerEvents: 'none', width: '100%', border: 'none'}}
                                scrolling="no"
                                rel="preconnect"
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
                                            <td style={row.entidadStyle}>{row.formatEn ? formatToMoney(row.A) : row.A}</td>
                                            <td style={row.goldStyle}>{formatToMoney(row.B)}</td>
                                            <td style={row.factorStyle}>
                                                {row.factorEditable ? (
                                                    <input type="number"
                                                           value={row.C}
                                                           className={'form-control'}
                                                           autoComplete={'off'}
                                                           placeholder={"0.0%"}
                                                           onChange={(e) => {
                                                               dataForm[index].C = e.target.value
                                                               setDataForm([...dataForm])
                                                               calculos(data)
                                                           }}
                                                    />
                                                ) : formatToMoney(row.C)}</td>
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
                <span>v52</span>
            </main>
        </>
    );
}

'use client'
import React, {useCallback, useEffect, useRef, useState} from "react";
import api from "@/app/api";

import {toast, ToastContainer} from "react-toastify";

function formatToMoney(value: number | string) {
    if (isNaN(Number(value)) || value === "") {
        return value
    }
    const numValue = Number(value);
    return numValue.toLocaleString('es-CO');
}

export interface FormType {
    A: string | number;
    B: number | string;
    C: string | number;
    formatEn?: boolean;
    goldStyle?: object;
    factorStyle?: object;
    entidadStyle?: object;
    factorEditable?: boolean;
}

export interface DataType {
    gold: number;
    gold_time?: string;
    gold_date: string;
    dolar: number;
    dolar_time?: string;
    dolar_date: string;
}

//const bgBlue ={factorStyle:{backgroundColor: "#88a1c8",fontWeight: 'bold'}, goldStyle: {backgroundColor: "#88a1c8",fontWeight: 'bold'}}

const defaultForm = [
    {A: "", B: 0, C: "89.5%"},
    {A: "", B: 0, C: "90.0%"},
    {A: "", B: 0, C: "90.5%"},
    {A: "", B: 0, C: "91.0%"},
    {A: "", B: 0, C: "91.5%"},
    {A: "", B: 0, C: "91.6%"},
    {A: "", B: 0, C: "91.7%"},
    {A: "", B: 0, C: "91.8%"},
    {A: "", B: 0, C: "91.9%"},
    {A: "", B: 0, C: "92.0%"},
    {A: "", B: 0, C: "93.0%"},
    {A: "", B: 0, C: "93.5%"},
    {A: "", B: 0, C: "94.0%"},
    {A: "", B: 0, C: "94.5%"},
    {A: "", B: 0, C: "97.8%"},
    {A: "", B: 0, C: "98.0%"},
    {A: "", B: 0, C: "98.3%"},
    {A: "", B: 0, C: "", factorEditable: true},
]

export default function Formulario() {
    const [isError, setIsError] = useState(false)
    let defaultwindow = false
    const dateNow = new Date().toLocaleTimeString()
    let DataDefault = {
        gold: 0,
        gold_time: dateNow,
        gold_date: "",
        dolar: 0,
        dolar_time: dateNow,
        dolar_date: ""
    }
    if (typeof window !== "undefined") {
        defaultwindow = window.innerWidth <= 468
        if (localStorage.getItem('data')) {
            DataDefault = JSON.parse(localStorage.getItem('data') || JSON.stringify(DataDefault))
        }
    }
    const [image, setImage] = useState(null)
    const [isMobile, setIsMobile] = useState(defaultwindow);
    const [timeScrenshot, setTimeScrenshot] = useState('')
    const [data, setData] = useState<DataType>(DataDefault)
    const [countdown, setCountdown] = useState(0)

    const [fix] = useState(31.1034768)
    const [dataForm, setDataForm] = useState<FormType[]>(defaultForm);
    const defaultValue = "4333.00"

    const handleLogout = () => {
        if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authExpiry');
            window.location.reload();
        }
    };

    useEffect(() => {
        init()
        const metaViewport = document.createElement('meta');
        metaViewport.name = 'viewport';
        metaViewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
        document.head.appendChild(metaViewport);

        return () => {
            document.head.removeChild(metaViewport);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const originalTitle = document.title;

        const handleBlur = () => {
            document.title = "¡Vuelve pronto!";
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

    const abortRef = useRef<AbortController | null>(null)
    const baseInterval = 15000
    const maxInterval = 60000
    const intervalRef = useRef(baseInterval)
    const lastDataRef = useRef<DataType | null>(null)
    const lastSaveRef = useRef(0)
    const nextExecutionRef = useRef(Date.now() + baseInterval)

    const saveIfChanged = (key: string, value: unknown, throttleMs = 2000) => {
        if (typeof window === 'undefined') return
        const now = Date.now()
        const prev = localStorage.getItem(key)
        const next = JSON.stringify(value)
        if (prev !== next && now - lastSaveRef.current > throttleMs) {
            localStorage.setItem(key, next)
            lastSaveRef.current = now
        }
    }

    const init = useCallback(async () => {
        const nowData = data
        let res = await api.netData()
        nowData.gold = res.mid
        nowData.gold_date = res.time
        nowData.gold_time = new Date().toLocaleTimeString()

        res = await api.bancodebogota()
        nowData.dolar_time = new Date().toLocaleTimeString()
        nowData.dolar_date = res.time
        if (res.image) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            setImage(res?.image.replace('..', ''))
        }else{
            setImage(null)
        }
        if (res.mid === 0) {
            if (typeof window !== "undefined") {
                nowData.dolar = Number(localStorage.getItem('dolar') || defaultValue)
            }
            setIsError(true)
        } else {
            nowData.dolar = res.mid
            setIsError(false)
            if (typeof window !== "undefined") {
                localStorage.setItem('dolar', String(res.mid))
            }
        }
        saveIfChanged('data', nowData)
        calculos(nowData)
    }, []);


    useEffect(() => {
        let handle: number | undefined
        let stopped = false

        const loop = async () => {
            if (document.visibilityState !== 'visible') return
            // cancel previous
            abortRef.current?.abort()
            const ctrl = new AbortController()
            abortRef.current = ctrl
            try {
                const before = JSON.stringify(lastDataRef.current)
                // pass signal to api
                const gold = await api.netData(ctrl.signal)
                const banco = await api.bancodebogota(ctrl.signal)

                // Build nowData based on previous state to avoid stale
                const nowData = {
                    ...data,
                    gold: gold.mid || data.gold,
                    gold_date: gold.time,
                    gold_time: new Date().toLocaleTimeString(),
                    dolar: banco.mid || data.dolar,
                    dolar_date: banco.time,
                    dolar_time: new Date().toLocaleTimeString(),
                } as DataType

                if (banco.image){
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    setImage(banco?.image.replace('..', ''))
                }else {
                    setImage(null)
                }

                // recompute prom based on dolar result present or previous
                const after = JSON.stringify(nowData)
                const changed = before !== after
                if (changed) {
                    lastDataRef.current = nowData
                    saveIfChanged('data', nowData)
                    calculos(nowData)
                    intervalRef.current = baseInterval
                } else {
                    intervalRef.current = Math.min(maxInterval, intervalRef.current * 2)
                }
            } catch (e) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                if (e?.name !== 'AbortError') {
                    // backoff on errors
                    intervalRef.current = Math.min(maxInterval, intervalRef.current * 2)
                }
            } finally {
                if (!stopped && document.visibilityState === 'visible') {
                    nextExecutionRef.current = Date.now() + intervalRef.current
                    handle = window.setTimeout(loop, intervalRef.current)
                }
            }
        }

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                if (handle) clearTimeout(handle)
                loop().then()
            } else {
                if (handle) clearTimeout(handle)
                abortRef.current?.abort()
            }
        }

        document.addEventListener('visibilitychange', onVisibility)
        // first run
        loop().then()
        return () => {
            stopped = true
            if (handle) clearTimeout(handle)
            abortRef.current?.abort()
            document.removeEventListener('visibilitychange', onVisibility)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Countdown timer effect
    useEffect(() => {
        const countdownInterval = setInterval(() => {
            const remaining = Math.max(0, nextExecutionRef.current - Date.now())
            setCountdown(Math.ceil(remaining / 1000))
        }, 1000)

        return () => clearInterval(countdownInterval)
    }, [])

    const calculos = (nowData: DataType) => {
        setData({...nowData})

        // clone dataForm to avoid in-place mutation
        const newDataForm = dataForm.map((row) => ({...row}))
        //porcentajes

        const multi = ((Number(nowData.gold) *  Number(nowData.dolar)) / fix)  * 1000

        for (let i = 0; i <= newDataForm.length - 1; i++) {
            const porcentaje = Number(String(newDataForm[i].C).replace('%', ''))
            newDataForm[i].B = String(Math.floor(multi * porcentaje / 100))
        }
        const prev = JSON.stringify(dataForm)
        const next = JSON.stringify(newDataForm)
        if (prev !== next) {
            saveIfChanged('dataForm', newDataForm)
            setDataForm(newDataForm)
        }
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
                const {default: html2canvas} = await import('html2canvas')
                const canvas = await html2canvas(captureRef.current);
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        if (isMobile) {
                            const file = new File([blob], "screenshot.png", {type: "image/png"}) as File;
                            const shareData = { files: [file], title: "Precio", text: "" };
                            // Verificar si el navegador soporta compartir archivos
                            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                                try {
                                    await navigator.share(shareData);
                                    toast.success("Imagen compartida exitosamente");
                                } catch (error) {
                                    // El usuario canceló o hubo un error
                                    if ((error as Error).name !== 'AbortError') {
                                        toast.error("Error al compartir la imagen");
                                    }
                                }
                            } else {
                                // Fallback: descargar la imagen
                                toast.info("Descargando imagen...");
                                const dataUrl = canvas.toDataURL("image/png");
                                const link = document.createElement("a");
                                link.href = dataUrl;
                                link.download = "screenshot.png";
                                link.click();
                            }
                        } else {
                            try {
                                const item = new ClipboardItem({"image/png": blob});
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
            <ToastContainer/>
            <main className={'card'}>
                {/* Header with countdown and logout */}
                <div className="header-bar">
                    <div className="countdown-timer">
                        Próxima actualización en: <strong>{countdown}s</strong>
                    </div>
                    <button className="logout-button" onClick={handleLogout}>
                        Salir
                    </button>
                </div>
                {/* Info Cards Section */}
                <div className="info-cards-container">

                    {/* Dolar Card */}
                    <div className="info-card dolar">
                        <div className="info-card-left">
                            <span className="info-card-label">
                                {isError ? "Ingrese dolar ⬇" : "Banco de Bogotá"}
                            </span>
                            {isError ? (
                                <input
                                    type="number"
                                    name="bancodebogota"
                                    placeholder="4333"
                                    autoComplete="off"
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
                            ) : (
                                <span className="info-card-value"
                                      style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    {image && (<img src={`https://pbit.bancodebogota.com${image}`} alt="indicador"
                                                    style={{width: 10, height: 10}}/>)}
                                    {formatToMoney(data.dolar)}</span>
                            )}
                        </div>
                        <div className="info-card-right">
                            <span className="info-card-time">{data.dolar_time}</span>
                            <span className="info-card-extra">
                                {`Banco de bogota: ${data.dolar_date}`}
                            </span>
                        </div>
                    </div>
                    {/* Gold Price Card */}
                    <div className="info-card gold">
                        <div className="info-card-left">
                            <span className="info-card-label">Gold Price</span>
                            <span className="info-card-value">{data.gold}</span>
                        </div>
                        <div className="info-card-right">
                            <span className="info-card-time">{String(data.gold_time)}</span>
                            <span className="info-card-extra">
                              {data.gold_date}
                            </span>

                        </div>
                    </div>


                </div>

                {/* iframe */}
                {/*<div className="iframe-container">*/}
                {/*    <iframe*/}
                {/*        id="myiframe"*/}
                {/*        style={{overflow: 'hidden', pointerEvents: 'none', width: '100%', border: 'none'}}*/}
                {/*        scrolling="no"*/}
                {/*        rel="preconnect"*/}
                {/*        src="https://pbit.bancodebogota.com/Indicadores/Tirilla.aspx"*/}
                {/*        height={50}*/}
                {/*    />*/}
                {/*</div>*/}

                {/* Screenshot Container */}
                <div ref={captureRef} className="screenshot-container">
                    {timeScrenshot !== "" && (
                        <div className="screenshot-time">
                            📅 {timeScrenshot}
                        </div>
                    )}

                    {/* Main Price Cards */}
                    {/*<div className="price-grid">*/}
                    {/*    /!* ONZA *!/*/}
                    {/*    <div className="price-item highlight">*/}
                    {/*        <div className="price-item-left">*/}
                    {/*            <span className="price-label">Índice 1</span>*/}
                    {/*            <span className="price-name">ONZA</span>*/}
                    {/*        </div>*/}
                    {/*        <div>*/}
                    {/*            <span className="price-value">{formatToMoney(dataForm[0]?.B || 0)}</span>*/}
                    {/*            <div style={{fontSize: '0.75rem', color: '#888'}}>{formatToMoney(dataForm[0]?.C || 0)}</div>*/}
                    {/*        </div>*/}
                    {/*    </div>*/}

                    {/*    /!* Fix value *!/*/}
                    {/*    <div className="price-item">*/}
                    {/*        <div className="price-item-left">*/}
                    {/*            <span className="price-label">Índice 1</span>*/}
                    {/*            <span className="price-name">Factor Fix</span>*/}
                    {/*        </div>*/}
                    {/*        <span className="price-value">{dataForm[4]?.A || fix}</span>*/}
                    {/*    </div>*/}
                    {/*</div>*/}

                    {/* Percentage Section */}
                    <div className="percentage-section">
                        <h3 className="percentage-title">📊 Porcentajes</h3>
                        <div className="percentage-grid">
                            {dataForm.map((row, index) => (
                                <div
                                    key={index}
                                    className={`percentage-card`}
                                >
                                    <div className="percentage-label">
                                        {row.factorEditable ? (
                                            <input
                                                type="number"
                                                value={row.C}
                                                autoComplete="off"
                                                placeholder="0.0%"
                                                onChange={(e) => {
                                                    dataForm[index].C = e.target.value
                                                    setDataForm([...dataForm])
                                                    calculos(data)
                                                }}
                                                style={{
                                                    width: '70px',
                                                    textAlign: 'center',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    padding: '4px',
                                                    fontSize: '0.9rem'
                                                }}
                                            />
                                        ) : (
                                            row.C
                                        )}
                                    </div>
                                    <div className="percentage-amount-b">{formatToMoney(Math.floor(Number(row.B) / 1000))}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="action-button">
                    <button onClick={() => {
                        setTimeScrenshot(`${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()} `)
                        setTimeout(() => {
                            handleCapture().then()
                        }, 500)
                    }}>
                        {isMobile ? "📤 Compartir tabla" : "📋 Copiar pantallazo al portapapeles"}
                    </button>
                </div>

                <div className="version-tag">v1.1</div>
            </main>
        </>
    );
}

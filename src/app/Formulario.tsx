'use client'
import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "@/app/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function formatMoney(value: number | string) {
    if (isNaN(Number(value)) || value === "") return value;
    return Number(value).toLocaleString('es-CO');
}

export interface FormType {
    A: string | number;
    B: number | string;
    C: string | number;
    factorEditable?: boolean;
}

// gold = xauCop (COP per gram, from goldprice.org REST API)
// dolar = TRM informational only (Banco de Bogotá)
export interface DataType {
    gold: number;         // Gold COP/gram
    goldUsdOz: number;    // Gold USD/oz
    silverCopKg: number;  // Silver COP/kg
    silverUsdOz: number;  // Silver USD/oz
    gold_time?: string;
    gold_date: string;
    dolar: number;        // COP/USD (display only)
    dolar_time?: string;
    dolar_date: string;
}

const defaultForm: FormType[] = [
    { A: "", B: 0, C: "89.0%" },
    { A: "", B: 0, C: "89.5%" },
    { A: "", B: 0, C: "90.0%" },
    { A: "", B: 0, C: "90.5%" },
    { A: "", B: 0, C: "91.0%" },
    { A: "", B: 0, C: "91.1%" },
    { A: "", B: 0, C: "91.2%" },
    { A: "", B: 0, C: "91.3%" },
    { A: "", B: 0, C: "91.4%" },
    { A: "", B: 0, C: "91.5%" },
    { A: "", B: 0, C: "91.6%" },
    { A: "", B: 0, C: "91.7%" },
    { A: "", B: 0, C: "91.8%" },
    { A: "", B: 0, C: "91.9%" },
    { A: "", B: 0, C: "92.0%" },
    { A: "", B: 0, C: "92.1%" },
    { A: "", B: 0, C: "92.2%" },
    { A: "", B: 0, C: "92.3%" },
    { A: "", B: 0, C: "92.4%" },
    { A: "", B: 0, C: "92.5%" },
    { A: "", B: 0, C: "93.0%" },
    { A: "", B: 0, C: "93.5%" },
    { A: "", B: 0, C: "94.0%" },
    { A: "", B: 0, C: "94.5%" },
    { A: "", B: 0, C: "95.0%" },
    { A: "", B: 0, C: "95.5%" },
    { A: "", B: 0, C: "96.0%" },
    { A: "", B: 0, C: "96.5%" },
    { A: "", B: 0, C: "97.0%" },
    { A: "", B: 0, C: "97.5%" },
    { A: "", B: 0, C: "98.0%" },
    { A: "", B: 0, C: "98.5%" },
    { A: "", B: 0, C: "99.0%" },
    { A: "", B: 0, C: "99.5%" },
    { A: "", B: 0, C: "", factorEditable: true },
];

const BASE_INTERVAL = 15_000;
const MAX_INTERVAL = 60_000;

export default function Formulario() {
    const dateNow = new Date().toLocaleTimeString();
    let DataDefault: DataType = {
        gold: 0, goldUsdOz: 0, silverCopKg: 0, silverUsdOz: 0,
        gold_time: dateNow, gold_date: "",
        dolar: 0, dolar_time: dateNow, dolar_date: "",
    };
    let defaultwindow = false;

    if (typeof window !== "undefined") {
        defaultwindow = window.innerWidth <= 768;
        const saved = localStorage.getItem('data');
        if (saved) DataDefault = JSON.parse(saved);
    }

    const [data, setData] = useState<DataType>(DataDefault);
    const [dataForm, setDataForm] = useState<FormType[]>(defaultForm);
    const [isError, setIsError] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(defaultwindow);
    const [countdown, setCountdown] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const abortRef = useRef<AbortController | null>(null);
    const intervalRef = useRef(BASE_INTERVAL);
    const lastDataRef = useRef<DataType | null>(null);
    const lastSaveRef = useRef(0);
    const nextExecutionRef = useRef(Date.now() + BASE_INTERVAL);
    const captureRef = useRef<HTMLDivElement | null>(null);

    const defaultDolar = "4333.00";

    const saveIfChanged = (key: string, value: unknown, throttleMs = 2000) => {
        if (typeof window === 'undefined') return;
        const now = Date.now();
        const prev = localStorage.getItem(key);
        const next = JSON.stringify(value);
        if (prev !== next && now - lastSaveRef.current > throttleMs) {
            localStorage.setItem(key, next);
            lastSaveRef.current = now;
        }
    };

    // Formula: (xauCop / 31.1034768) * 1000 * purity%
    // xauCop = COP/oz from goldprice.org, no TRM needed
    const calculos = useCallback((nowData: DataType) => {
        setData({ ...nowData });
        const multi = nowData.gold //(nowData.gold / FIX) * 1000;
        setDataForm(prev => {
            const next = prev.map(row => {
                const pct = Number(String(row.C).replace('%', ''));
                return { ...row, B: String(Math.floor(multi * pct / 100)) };
            });
            saveIfChanged('dataForm', next);
            return next;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let handle: number | undefined;
        let stopped = false;

        const loop = async () => {
            if (document.visibilityState !== 'visible') return;
            abortRef.current?.abort();
            const ctrl = new AbortController();
            abortRef.current = ctrl;
            setIsSyncing(true);
            try {
                const { gold, usd: banco } = await api.getData(ctrl.signal);

                const nowData: DataType = {
                    gold:         gold.xauCop      || DataDefault.gold,
                    goldUsdOz:    gold.goldUsdOz   || DataDefault.goldUsdOz,
                    silverCopKg:  gold.xagCopKg    || DataDefault.silverCopKg,
                    silverUsdOz:  gold.silverUsdOz || DataDefault.silverUsdOz,
                    gold_date: gold.time,
                    gold_time: new Date().toLocaleTimeString(),
                    dolar: banco.mid || DataDefault.dolar,
                    dolar_date: banco.time,
                    dolar_time: new Date().toLocaleTimeString(),
                };

                setImage(banco.image ? banco.image.replace('..', '') : null);

                if (banco.mid === 0) {
                    const saved = typeof window !== 'undefined' ? Number(localStorage.getItem('dolar') || defaultDolar) : 0;
                    nowData.dolar = saved;
                    setIsError(true);
                } else {
                    setIsError(false);
                    if (typeof window !== 'undefined') localStorage.setItem('dolar', String(banco.mid));
                }

                const before = JSON.stringify(lastDataRef.current);
                const after = JSON.stringify(nowData);
                if (before !== after) {
                    lastDataRef.current = nowData;
                    saveIfChanged('data', nowData);
                    calculos(nowData);
                    intervalRef.current = BASE_INTERVAL;
                } else {
                    intervalRef.current = Math.min(MAX_INTERVAL, intervalRef.current * 2);
                }
            } catch (e: unknown) {
                if ((e as Error)?.name !== 'AbortError') {
                    intervalRef.current = Math.min(MAX_INTERVAL, intervalRef.current * 2);
                }
            } finally {
                setIsSyncing(false);
                if (!stopped && document.visibilityState === 'visible') {
                    nextExecutionRef.current = Date.now() + intervalRef.current;
                    handle = window.setTimeout(loop, intervalRef.current);
                }
            }
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                if (handle) clearTimeout(handle);
                void loop();
            } else {
                if (handle) clearTimeout(handle);
                abortRef.current?.abort();
            }
        };

        document.addEventListener('visibilitychange', onVisibility);
        void loop();
        return () => {
            stopped = true;
            if (handle) clearTimeout(handle);
            abortRef.current?.abort();
            document.removeEventListener('visibilitychange', onVisibility);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const id = setInterval(() => {
            setCountdown(Math.ceil(Math.max(0, nextExecutionRef.current - Date.now()) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        if (window.confirm('¿Cerrar sesión?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authExpiry');
            window.location.reload();
        }
    };

    const handleCapture = async () => {
        if (!captureRef.current) return;
        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(captureRef.current, { backgroundColor: '#131313' });
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                if (isMobile) {
                    const file = new File([blob], "golden-group.png", { type: "image/png" }) as File;
                    const shareData: ShareData = { files: [file], title: "Precio Oro", text: "" };
                    if (navigator.share && navigator.canShare?.(shareData)) {
                        try { await navigator.share(shareData); toast.success("Imagen compartida"); }
                        catch (e) { if ((e as Error).name !== 'AbortError') toast.error("Error al compartir"); }
                    } else {
                        const url = canvas.toDataURL("image/png");
                        const a = document.createElement("a");
                        a.href = url; a.download = "golden-group.png"; a.click();
                    }
                } else {
                    try {
                        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                        toast.success("Imagen copiada al portapapeles");
                    } catch { toast.error("Error al copiar imagen"); }
                }
            }, "image/png");
        } catch { toast.error("Error al capturar"); }
    };

    const labelCaps: React.CSSProperties = {
        fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: '#99907c',
        fontFamily: 'var(--font-inter), Inter, sans-serif', margin: 0,
    };
    const secondaryText: React.CSSProperties = {
        color: '#99907c', fontSize: '12px',
        fontFamily: 'var(--font-inter), Inter, sans-serif', margin: 0,
    };

    // Split form rows for 2-column desktop layout
    // Last row (editable) spans full width
    const fixedRows = dataForm.slice(0, dataForm.length - 1);
    const editableRow = dataForm[dataForm.length - 1];
    const half = Math.ceil(fixedRows.length / 2);
    const col1 = fixedRows.slice(0, half);
    const col2 = fixedRows.slice(half);

    const tableRow = (row: FormType, i: number, isEditable = false) => (
        <tr
            key={i}
            style={{
                borderTop: '1px solid rgba(77,70,53,0.15)',
                background: isEditable ? 'rgba(242,202,80,0.03)' : 'transparent',
                transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!isEditable) (e.currentTarget as HTMLElement).style.background = 'rgba(53,53,52,0.3)'; }}
            onMouseLeave={e => { if (!isEditable) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
            <td style={{ padding: '10px 14px', color: '#d0c5af', fontSize: '14px', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                {isEditable ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                            type="number"
                            value={row.C}
                            autoComplete="off"
                            placeholder="Ingrese"
                            onChange={e => {
                                const idx = dataForm.length - 1;
                                setDataForm(prev => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], C: e.target.value };
                                    return next;
                                });
                                calculos(data);
                            }}
                            style={{
                                background: 'transparent', border: 'none',
                                borderBottom: '1px solid rgba(242,202,80,0.4)',
                                color: '#f2ca50', fontWeight: 700, width: '65px',
                                fontSize: '14px', outline: 'none', padding: '2px 0',
                                fontFamily: 'var(--font-inter), Inter, sans-serif',
                            }}
                        />
                        <span style={{ color: '#f2ca50', fontWeight: 700 }}>%</span>
                    </div>
                ) : row.C}
            </td>
            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                <span className="num" style={{
                    fontWeight: 600, fontSize: '14px',
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                    color: isEditable ? '#f2ca50' : '#e5e2e1',
                }}>
                    {Number(row.B) > 0 ? `$${formatMoney(Number(row.B))}` : '—'}
                </span>
            </td>
        </tr>
    );

    const tableHead = (
        <thead>
            <tr style={{ background: '#201f1f', borderBottom: '1px solid rgba(77,70,53,0.2)' }}>
                <th style={{ ...labelCaps, padding: '10px 14px', fontWeight: 600 }}>Porcentaje</th>
                <th style={{ ...labelCaps, padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Precio de Gramo</th>
            </tr>
        </thead>
    );

    return (
        <>
            <ToastContainer theme="dark" />

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                input[type=number]::-webkit-inner-spin-button,
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }
                .matrix-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: rgba(77,70,53,0.15); }
                .matrix-grid table { background: #131313; }
                @media (max-width: 768px) {
                    .matrix-grid { grid-template-columns: 1fr; }
                }
            `}</style>

            {/* Fixed top header */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                background: 'rgba(19,19,19,0.85)', backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(77,70,53,0.3)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0 16px', height: '60px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon.png" alt="logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                    <h1 style={{
                        fontFamily: 'var(--font-playfair), "Playfair Display", serif',
                        fontSize: '20px', fontWeight: 500,
                        margin: 0, letterSpacing: '0.03em',
                        background: 'linear-gradient(135deg, #b8860b 0%, #f2ca50 25%, #ffe87c 45%, #d4a017 60%, #f2ca50 75%, #a0720a 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>B&B <span style={{ fontWeight: 700 }}>GOLD</span>SILVER</h1>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Status pill */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div className="glass-card" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '9999px' }}>
                            <span className="pulse-dot" />
                            <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', color: '#54e98a', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                            Actualiza en {countdown}s
                        </span>
                        </div>
                    </div>
                    {isSyncing && (
                        <span style={{ color: '#f2ca50', fontSize: '18px', display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
                    )}
                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'transparent', border: '1px solid rgba(77,70,53,0.5)',
                            color: '#99907c', borderRadius: '20px', padding: '4px 12px',
                            fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-inter), Inter, sans-serif',
                        }}
                    >
                        Salir
                    </button>
                </div>
            </header>

            {/* Background glow */}
            <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(242,202,80,0.04)', filter: 'blur(120px)' }} />
                <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(242,202,80,0.04)', filter: 'blur(120px)' }} />
            </div>

            <main style={{
                marginTop: '60px', padding: '16px 20px',
                maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto',
                display: 'flex', flexDirection: 'column', gap: '12px',
                position: 'relative', zIndex: 1,
            }}>

                {/* Metals price cards — 2×2 grid */}
                <div className={"parent-card"} style={{ display: 'flex', flexWrap:"wrap",alignItems: 'center',justifyContent:'space-evenly', gap: '12px' }}>
                    {/* Gold COP/g */}
                    <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', borderTop: '2px solid rgba(242,202,80,0.3)' }}>
                        <p style={labelCaps}>GoldPrice GRAMO</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '6px' }}>
                            <span className="num" style={{ fontSize: '22px', fontWeight: 600, color: '#f2ca50', letterSpacing: '-0.01em', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                                {data.gold > 0 ? `$${formatMoney(Math.round(data.gold))}` : '—'}
                            </span>
                            <span style={secondaryText}>COP/g</span>
                        </div>
                        <p style={{ ...secondaryText, marginTop: '4px' }}>{data.gold_date || data.gold_time}</p>
                    </div>

                    {/* Gold USD/oz */}
                    <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', borderTop: '2px solid rgba(242,202,80,0.3)' }}>
                        <p style={labelCaps}>GoldPrice onza</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '6px' }}>
                            <span className="num" style={{ fontSize: '22px', fontWeight: 600, color: '#f2ca50', letterSpacing: '-0.01em', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                                {data.goldUsdOz > 0 ? `$${formatMoney(data.goldUsdOz.toFixed(2))}` : '—'}
                            </span>
                            <span style={secondaryText}>USD/oz</span>
                        </div>
                        <p style={{ ...secondaryText, marginTop: '4px' }}>{data.gold_date || data.gold_time}</p>
                    </div>

                    {/* Silver COP/kg */}
                    <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', borderTop: '2px solid rgba(180,180,210,0.3)' }}>
                        <p style={labelCaps}>GoldPrice Kilo</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '6px' }}>
                            <span className="num" style={{ fontSize: '22px', fontWeight: 600, color: '#c0c8d8', letterSpacing: '-0.01em', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                                {data.silverCopKg > 0 ? `$${formatMoney(Math.round(data.silverCopKg))}` : '—'}
                            </span>
                            <span style={secondaryText}>COP/kg</span>
                        </div>
                        <p style={{ ...secondaryText, marginTop: '4px' }}>{data.gold_date || data.gold_time}</p>
                    </div>

                    {/* Silver USD/oz */}
                    <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', borderTop: '2px solid rgba(180,180,210,0.3)' }}>
                        <p style={labelCaps}>GoldPrice onza</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '6px' }}>
                            <span className="num" style={{ fontSize: '22px', fontWeight: 600, color: '#c0c8d8', letterSpacing: '-0.01em', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                                {data.silverUsdOz > 0 ? `$${formatMoney(data.silverUsdOz.toFixed(2))}` : '—'}
                            </span>
                            <span style={secondaryText}>USD/oz</span>
                        </div>
                        <p style={{ ...secondaryText, marginTop: '4px' }}>{data.gold_date || data.gold_time}</p>
                    </div>
                </div>

                {/* TRM */}
                <div className="glass-card" style={{ padding: '14px 16px', borderRadius: '12px', borderTop: '2px solid rgba(242,202,80,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={labelCaps}>{isError ? 'TRM Banco de Bogotá ▼' : 'TRM Banco de Bogotá'}</p>
                        <span style={secondaryText}>COP/USD</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                        {isError ? (
                            <input
                                type="number"
                                value={data.dolar}
                                autoComplete="off"
                                placeholder="4333"
                                onChange={e => {
                                    const nowData = { ...data, dolar: Number(e.target.value || 0) };
                                    setData(nowData);
                                    localStorage.setItem('dolar', e.target.value || defaultDolar);
                                }}
                                style={{
                                    background: 'transparent', border: 'none',
                                    borderBottom: '1px solid #f2ca50', color: '#54e98a',
                                    fontSize: '22px', fontWeight: 600, width: '160px',
                                    outline: 'none', fontFamily: 'var(--font-inter), Inter, sans-serif',
                                }}
                            />
                        ) : (
                            <span className="num" style={{ fontSize: '22px', fontWeight: 600, color: '#54e98a', letterSpacing: '-0.01em', fontFamily: 'var(--font-inter), Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {image && <img src={`https://pbit.bancodebogota.com${image}`} alt="" style={{ width: 10, height: 10 }} />}
                                {formatMoney(data.dolar)}
                            </span>
                        )}
                        <span style={{ ...secondaryText, fontSize: '10px' }}>{data.dolar_date || data.dolar_time}</span>
                    </div>
                </div>

                {/* Price matrix — captured for screenshot */}
                <div ref={captureRef} className="glass-card" style={{ borderRadius: '12px', overflow: 'hidden', backgroundColor: '#131313' }}>
                    {/*<div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(77,70,53,0.2)', background: 'rgba(28,27,27,0.5)' }}>*/}
                    {/*    <h2 style={{*/}
                    {/*        fontFamily: 'var(--font-playfair), "Playfair Display", serif',*/}
                    {/*        fontSize: '18px', fontWeight: 500, color: '#f2ca50', margin: 0,*/}
                    {/*    }}>*/}
                    {/*        Matriz de Precios*/}
                    {/*    </h2>*/}
                    {/*</div>*/}

                    {isMobile ? (
                        /* Mobile: single column table */
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            {tableHead}
                            <tbody>
                                {tableRow(editableRow, fixedRows.length, true)}
                                {fixedRows.map((row, i) => tableRow(row, i))}
                            </tbody>
                        </table>
                    ) : (
                        /* Desktop: two tables side by side + editable row spanning full width */
                        <>
                            {/* Editable row full width */}
                            <div style={{ borderTop: '1px solid rgba(242,202,80,0.2)', background: 'rgba(242,202,80,0.03)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>{tableRow(editableRow, dataForm.length - 1, true)}</tbody>
                                </table>
                            </div>
                            <div className="matrix-grid">
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    {tableHead}
                                    <tbody>{col1.map((row, i) => tableRow(row, i))}</tbody>
                                </table>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    {tableHead}
                                    <tbody>{col2.map((row, i) => tableRow(row, i + half))}</tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                <p style={{ textAlign: 'center', color: '#4d4635', fontSize: '10px', letterSpacing: '0.1em', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                    v1.3 · B&B GOLDSILVER
                </p>
            </main>

            {/* FAB share button */}
            <button
                onClick={handleCapture}
                className="gold-gradient metallic-shine"
                style={{
                    position: 'fixed', bottom: '28px', right: '20px',
                    width: '54px', height: '54px', borderRadius: '50%',
                    border: 'none', cursor: 'pointer', zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                    boxShadow: '0 8px 20px rgba(212,175,55,0.3)',
                    color: '#3c2f00', transition: 'transform 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.94)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                title={isMobile ? "Compartir tabla" : "Copiar pantallazo"}
            >
                {isMobile ? '↑' : '⎘'}
            </button>
        </>
    );
}

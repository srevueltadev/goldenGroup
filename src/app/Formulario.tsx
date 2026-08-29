'use client'
import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "@/app/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PriceCharts from "@/app/PriceCharts";
import { addDoc, collection, serverTimestamp, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/app/firebase";

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
    { A: "", B: 0, C: "0" },
    { A: "", B: 0, C: "0" },
    { A: "", B: 0, C: "", factorEditable: true },
];

const BASE_INTERVAL = 15_000;

export default function Formulario() {
    const dateNow = new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' });
    let DataDefault: DataType = {
        gold: 0, goldUsdOz: 0, silverCopKg: 0, silverUsdOz: 0,
        gold_time: dateNow, gold_date: "",
        dolar: 0, dolar_time: dateNow, dolar_date: "",
    };
    let defaultwindow = false;
    let defaultTV = false;

    if (typeof window !== "undefined") {
        defaultwindow = window.innerWidth <= 768;
        defaultTV = window.innerWidth >= 1900;
        const saved = localStorage.getItem('data');
        if (saved) DataDefault = JSON.parse(saved);
    }

    const [data, setData] = useState<DataType>(DataDefault);
    const [dataForm, setDataForm] = useState<FormType[]>(defaultForm);
    const [isError, setIsError] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(defaultwindow);
    const [isTV, setIsTV] = useState(defaultTV);
    const [countdown, setCountdown] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [showDebug, setShowDebug] = useState(false);

    const dbg = (msg: string) => {
        const t = new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' });
        setDebugLogs(prev => [`[${t}] ${msg}`, ...prev].slice(0, 30));
    };
    const [calcTime, setCalcTime] = useState("");

    const abortRef = useRef<AbortController | null>(null);
    const intervalRef = useRef(BASE_INTERVAL);
    const lastDataRef = useRef<DataType | null>(null);
    const lastSaveRef = useRef(0);
    const lastFirebaseSaveRef = useRef(0);
    const nextExecutionRef = useRef(Date.now() + BASE_INTERVAL);
    const captureRef = useRef<HTMLDivElement | null>(null);
    const isTVRef = useRef(defaultTV);

    const saveToFirebase = useCallback(async (nowData: DataType) => {
        if (nowData.gold <= 0 || nowData.goldUsdOz <= 0) return;
        const now = Date.now();
        if (now - lastFirebaseSaveRef.current < 60_000) return; // max 1 write/minute
        lastFirebaseSaveRef.current = now;
        try {
            await addDoc(collection(db, "priceHistory"), {
                timestamp: serverTimestamp(),
                gold: nowData.gold,
                goldUsdOz: nowData.goldUsdOz,
                silverCopKg: nowData.silverCopKg,
                silverUsdOz: nowData.silverUsdOz,
                trmGoldOz: nowData.dolar > 0 ? (nowData.dolar * nowData.goldUsdOz) / 31.1034768 : 0,
                dolar: nowData.dolar,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error(`Firebase: ${msg}`, { toastId: 'fb-error', autoClose: 5000 });
            console.error('Firebase save error:', e);
        }
    }, []);

    const defaultDolar = "3667.00";

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

    const calculos = useCallback((nowData: DataType) => {
        setData({ ...nowData });
        setCalcTime(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replaceAll(",",""));
        const bbgt = nowData.dolar
        const multi = (bbgt * nowData.goldUsdOz) / 31.1034768;
        setDataForm(prev => {
            const next = prev.map(row => {
                const pct = Number(String(row.C).replace('%', ''));
                return { ...row, B: String(Math.floor(multi * pct / 100)) };
            });
            saveIfChanged('dataForm', next);
            return next;
        });

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

            // USD fetch runs in background — does not block gold display
            // TV mode: read TRM from Firebase (avoids Playwright scraping on display screens)
            if (isTVRef.current) {
                (async () => {
                    if (stopped || ctrl.signal.aborted) return;
                    const current = lastDataRef.current || DataDefault;
                    dbg('TV: querying Firebase TRM...');
                    try {
                        const q = query(
                            collection(db, "priceHistory"),
                            orderBy("timestamp", "desc"),
                            limit(5)
                        );
                        const snap = await getDocs(q);
                        const doc = snap.docs.find(d => (d.data().dolar ?? 0) > 0);
                        if (doc) {
                            const fbDolar: number = doc.data().dolar;
                            dbg(`TV: Firebase dolar=${fbDolar}`);
                            setIsError(false);
                            localStorage.setItem('dolar', String(fbDolar));
                            const nowData = { ...current, dolar: fbDolar, dolar_time: new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' }) };
                            lastDataRef.current = nowData;
                            saveIfChanged('data', nowData);
                            calculos(nowData);
                        } else {
                            dbg('TV: no Firebase docs, using localStorage fallback');
                            const saved = Number(localStorage.getItem('dolar') || defaultDolar);
                            if (saved > 0 && current.dolar === 0) {
                                const nowData = { ...current, dolar: saved };
                                lastDataRef.current = nowData;
                                calculos(nowData);
                            }
                        }
                    } catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        dbg(`TV: Firebase ERROR — ${msg}`);
                        console.warn('TV Firebase TRM fallback:', e);
                        const saved = Number(localStorage.getItem('dolar') || defaultDolar);
                        if (saved > 0 && current.dolar === 0) {
                            const nowData = { ...current, dolar: saved };
                            lastDataRef.current = nowData;
                            calculos(nowData);
                        }
                    }
                })();
            } else {
                api.bancodebogota(ctrl.signal).then(banco => {
                    if (stopped || ctrl.signal.aborted) return;
                    const current = lastDataRef.current || DataDefault;
                    if (banco.mid === 0) {
                        const saved = typeof window !== 'undefined' ? Number(localStorage.getItem('dolar') || defaultDolar) : 0;
                        const nowData = { ...current, dolar: saved, dolar_time: new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' }) };
                        lastDataRef.current = nowData;
                        calculos(nowData);
                        setIsError(true);
                    } else {
                        setIsError(false);
                        if (typeof window !== 'undefined') localStorage.setItem('dolar', String(banco.mid));
                        setImage(banco.image ? banco.image.replace('..', '') : null);
                        const nowData = { ...current, dolar: banco.mid, dolar_date: banco.time, dolar_time: new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' }) };
                        lastDataRef.current = nowData;
                        saveIfChanged('data', nowData);
                        calculos(nowData);
                    }
                }).catch(() => {});
            }

            try {
                // Gold uses REST API — resolves in <1s
                const gold = await api.netData(ctrl.signal);

                if (gold.xauCop > 0) {
                    const current = lastDataRef.current || DataDefault;
                    const nowData: DataType = {
                        gold:        gold.xauCop,
                        goldUsdOz:   gold.goldUsdOz   || current.goldUsdOz,
                        silverCopKg: gold.xagCopKg    || current.silverCopKg,
                        silverUsdOz: gold.silverUsdOz || current.silverUsdOz,
                        gold_date:   gold.time,
                        gold_time:   new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' }),
                        dolar:       current.dolar,
                        dolar_date:  current.dolar_date,
                        dolar_time:  current.dolar_time,
                    };
                    const before = JSON.stringify(lastDataRef.current);
                    const after  = JSON.stringify(nowData);
                    if (before !== after) {
                        lastDataRef.current = nowData;
                        saveIfChanged('data', nowData);
                        calculos(nowData);
                    } else {
                        calculos(nowData);
                    }
                    void saveToFirebase(nowData);
                    intervalRef.current = BASE_INTERVAL;
                }
            } catch (e: unknown) {
                if ((e as Error)?.name !== 'AbortError') {
                    intervalRef.current = BASE_INTERVAL;
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
        const handleResize = () => {
            const tv = window.innerWidth >= 1900;
            setIsMobile(window.innerWidth <= 768);
            setIsTV(tv);
            isTVRef.current = tv;
        };
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
        color: '#cac2af', fontSize: isMobile?'16px':'14px',
        fontFamily: 'var(--font-inter), Inter, sans-serif', margin: 0,
    };

    // Split form rows for 2 or 3-column layout
    // Last row (editable) spans full width
    const fixedRows = dataForm.slice(0, dataForm.length - 1);
    const editableRow = dataForm[dataForm.length - 1];
    const third = Math.ceil(fixedRows.length / 3);
    const half = Math.ceil(fixedRows.length / 2);
    const col1 = isTV ? fixedRows.slice(0, third) : fixedRows.slice(0, half);
    const col2 = isTV ? fixedRows.slice(third, third * 2) : fixedRows.slice(half);
    const col3 = isTV ? fixedRows.slice(third * 2) : [];

    const ROW_ACCENT_COLORS = [
        '#f2ca50',  // primary / gold
        '#54e98a',  // tertiary / emerald
        '#d4af37',  // primary-container / deep gold
        '#c8c6c5',  // secondary / silver
        '#e9c349',  // primary-fixed-dim
        '#4ae183',  // tertiary-fixed-dim
        '#ffe088',  // primary-fixed
        '#2ecc71',  // tertiary-container
        '#b8a040',  // muted gold
        '#6bfe9c',  // tertiary-fixed
    ];

    const tableRow = (row: FormType, i: number, isEditable = false) => {
        const accentColor = isEditable ? '#f2ca50' : ROW_ACCENT_COLORS[i % ROW_ACCENT_COLORS.length];
        return (
        <tr
            key={i}
            style={{
                borderTop: `1px solid ${accentColor}40`,
                background: 'transparent',
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
    };

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
                .matrix-grid-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px; background: rgba(77,70,53,0.15); }
                .matrix-grid-3col table { background: #131313; }
                @media (max-width: 768px) {
                    .matrix-grid { grid-template-columns: 1fr; }
                    .cards-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>

            {/* Fixed top header */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                background: 'rgba(19,19,19,0.85)', backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(77,70,53,0.3)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0 16px', height: '80px',
            }}>

                <div className="header-spacer"></div>
                <div className="header-logo" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', zIndex: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon.png" alt="logo" style={{ width: '180px', objectFit: 'cover' }} />
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
                    {isTV && (
                        <span
                            onClick={() => setShowDebug(p => !p)}
                            style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: showDebug ? '#54e98a' : '#4d4635', fontFamily: 'var(--font-inter), Inter, sans-serif', border: `1px solid ${showDebug ? '#54e98a' : '#4d4635'}`, borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', userSelect: 'none' }}>
                            TV
                        </span>
                    )}
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
                marginTop: '70px', padding: '16px 20px',
                maxWidth: defaultTV?'1700px':'1300px', marginLeft: 'auto', marginRight: 'auto',
                display: 'flex', flexDirection: 'column', gap: '12px',
                position: 'relative', zIndex: 1,
            }}>

                {/* Cards + charts — single container */}
                <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Charts */}
                    <PriceCharts data={data}
                                 labelCaps={labelCaps}
                                 calcTime={calcTime}
                                 formatMoney={formatMoney}
                                 secondaryText={secondaryText}
                                 isError={isError}
                                 image={image}
                                 setData={setData}
                                 defaultDolar={defaultDolar} />
                    {/* 3 price cards */}
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
                        /* Desktop: two or three tables side by side + editable row spanning full width */
                        <>
                            {/* Editable row full width */}
                            <div style={{ borderTop: '1px solid rgba(242,202,80,0.2)', background: 'rgba(242,202,80,0.03)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>{tableRow(editableRow, dataForm.length - 1, true)}</tbody>
                                </table>
                            </div>
                            <div className={isTV ? 'matrix-grid-3col' : 'matrix-grid'}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    {tableHead}
                                    <tbody>{col1.map((row, i) => tableRow(row, i))}</tbody>
                                </table>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    {tableHead}
                                    <tbody>{col2.map((row, i) => tableRow(row, i + col1.length))}</tbody>
                                </table>
                                {isTV && (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        {tableHead}
                                        <tbody>{col3.map((row, i) => tableRow(row, i + col1.length + col2.length))}</tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}
                </div>


                {/* Debug panel — visible only when showDebug is true */}
                {showDebug && (
                    <div style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid #54e98a', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#54e98a', fontWeight: 700 }}>DEBUG · TV mode</span>
                            <span style={{ color: '#4d4635' }}>w={typeof window !== 'undefined' ? window.innerWidth : '?'}px</span>
                        </div>
                        {debugLogs.length === 0
                            ? <p style={{ color: '#4d4635', margin: 0 }}>Sin logs aún…</p>
                            : debugLogs.map((l, i) => (
                                <p key={i} style={{ color: l.includes('ERROR') ? '#ff6b6b' : '#c0c8d8', margin: '2px 0' }}>{l}</p>
                            ))
                        }
                    </div>
                )}

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
                {isMobile ? '➤' : '⎘'}
            </button>
        </>
    );
}

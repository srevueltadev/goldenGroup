'use client'
import React, { useEffect, useState } from "react";
import {collection, onSnapshot, orderBy, query, where, Timestamp, limit} from "firebase/firestore";
import { db } from "@/app/firebase";
import { DataType } from "@/app/Formulario";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, ComposedChart,
    Line, Bar
} from "recharts";

interface PriceDoc {
    timestamp: Timestamp | null;
    gold: number;
    goldUsdOz: number;
    silverCopKg: number;
    silverUsdOz: number;
    trmGoldOz: number;
    dolar: number;
}

interface ChartPoint {
    time: string;
    timestamp: string; // ISO string for filtering
    gold: number;
    goldUsdOz: number;
    silverCopKg: number;
    silverUsdOz: number;
    trmGoldOz: number;
    dolar: number;
}

function fmtTime(ts: Timestamp | null): string {
    if (!ts) return "";
    const d = ts.toDate();
    return d.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });
}

function fmtNum(v: number) {
    return Number(v).toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

const CHART_HEIGHT = 130;

interface ChartCardProps {
    title: string;
    unit: string;
    dataKey: keyof ChartPoint;
    color: string;
    data: ChartPoint[];
    prefix?: string;
    showStats?: boolean;
}

function ChartCard({ title, unit, dataKey, color, data, prefix = "$", showStats = false }: ChartCardProps) {
    const values = data.map(d => d[dataKey] as number).filter(v => v > 0);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    const padding = (max - min) * 0.1 || 1;
    const domain: [number, number] = [min - padding, max + padding];

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{
                background: 'rgba(19,19,19,0.95)', border: `1px solid ${color}40`,
                borderRadius: '8px', padding: '8px 12px', fontSize: '12px',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
            }}>
                <p style={{ color: '#99907c', margin: '0 0 2px' }}>{label}</p>
                <p style={{ color, fontWeight: 700, margin: 0 }}>{prefix}{fmtNum(payload[0].value)}</p>
            </div>
        );
    };

    return (
        <div className="glass-card" style={{ padding: '14px 16px', borderRadius: '12px', borderTop: `2px solid ${color}40` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <p style={{
                    fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: '#99907c',
                    fontFamily: 'var(--font-inter), Inter, sans-serif', margin: 0,
                }}>{title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {showStats && values.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', fontSize: '10px', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                            <span style={{ color: '#c0c8d8' }}>↓{prefix}{fmtNum(min)}</span>
                            <span style={{ color: color, fontWeight: 700 }}>∅{prefix}{fmtNum(avg)}</span>
                            <span style={{ color: '#f2ca50' }}>↑{prefix}{fmtNum(max)}</span>
                        </div>
                    )}
                    <span style={{ fontSize: '11px', color: '#99907c', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>{unit}</span>
                </div>
            </div>

            {data.length < 2 ? (
                <div style={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#4d4635', fontSize: '12px', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                        Esperando datos…
                    </span>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                    <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(77,70,53,0.2)" vertical={false} />
                        <XAxis
                            dataKey="time"
                            tick={{ fill: '#4d4635', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
                            axisLine={false} tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            domain={domain}
                            tick={{ fill: '#4d4635', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
                            axisLine={false} tickLine={false}
                            width={0} hide
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: `${color}30`, strokeWidth: 1 }} />
                        <Area
                            type="monotone"
                            dataKey={dataKey as string}
                            stroke={color}
                            strokeWidth={1.5}
                            fill={`url(#grad-${dataKey})`}
                            dot={false}
                            activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

interface DayStats {
    day: string;    // e.g. "Lun 12"
    min: number;
    max: number;
    avg: number;
    range: [number, number]; // [min, max-min] for stacked bar
}

function DailyStatsChart() {
    const [days, setDays] = useState<DayStats[]>([]);

    useEffect(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const q = query(
            collection(db, "priceHistory"),
            where("timestamp", ">=", Timestamp.fromDate(sevenDaysAgo)),
            orderBy("timestamp", "asc"),
        );
        const unsub = onSnapshot(q, snap => {
            // group by day (Bogotá date)
            const map = new Map<string, number[]>();
            snap.docs.forEach(d => {
                const doc = d.data() as PriceDoc;
                if (!doc.timestamp || !doc.trmGoldOz || doc.trmGoldOz <= 0) return;
                const dateKey = doc.timestamp.toDate().toLocaleDateString('es-CO', {
                    timeZone: 'America/Bogota',
                    weekday: 'short', day: 'numeric',
                });
                if (!map.has(dateKey)) map.set(dateKey, []);
                map.get(dateKey)!.push(doc.trmGoldOz);
            });

            const result: DayStats[] = [];
            map.forEach((vals, day) => {
                const min = Math.min(...vals);
                const max = Math.max(...vals);
                const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
                result.push({ day, min, max, avg, range: [min, max - min] });
            });
            setDays(result);
        }, err => console.error("Firestore daily stats error:", err));
        return () => unsub();
    }, []);

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
        if (!active || !payload?.length) return null;
        const entry: Record<string, number> = {};
        payload.forEach(p => { entry[p.name] = p.value; });
        const min = days.find(d => d.day === label)?.min;
        const max = days.find(d => d.day === label)?.max;
        const avg = days.find(d => d.day === label)?.avg;
        return (
            <div style={{
                background: 'rgba(19,19,19,0.95)', border: '1px solid rgba(84,233,138,0.3)',
                borderRadius: '8px', padding: '10px 14px', fontSize: '12px',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
            }}>
                <p style={{ color: '#99907c', margin: '0 0 4px', fontWeight: 600 }}>{label}</p>
                {min !== undefined && <p style={{ color: '#c0c8d8', margin: '2px 0' }}>Mín: ${fmtNum(min)}</p>}
                {avg !== undefined && <p style={{ color: '#54e98a', margin: '2px 0', fontWeight: 700 }}>Prom: ${fmtNum(avg)}</p>}
                {max !== undefined && <p style={{ color: '#f2ca50', margin: '2px 0' }}>Máx: ${fmtNum(max)}</p>}
            </div>
        );
    };

    // For the "floating bar" trick: first bar is transparent (min), second is the range (max-min)
    const barData = days.map(d => ({
        day: d.day,
        base: d.min,
        range: d.max - d.min,
        avg: d.avg,
    }));

    const allVals = days.flatMap(d => [d.min, d.max]);
    const domMin = allVals.length ? Math.min(...allVals) * 0.999 : 0;
    const domMax = allVals.length ? Math.max(...allVals) * 1.001 : 1;

    return (
        <div >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <p style={{
                    fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: '#4d4635',
                    fontFamily: 'var(--font-inter), Inter, sans-serif', margin: 0,
                }}>B&amp;B · últimos 7 días</p>
                <span style={{ fontSize: '10px', color: '#4d4635', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>mín / prom / máx</span>
            </div>

            {barData.length < 1 ? (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#4d4635', fontSize: '12px', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                        Esperando datos…
                    </span>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={120}>
                    <ComposedChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(77,70,53,0.2)" vertical={false} />
                        <XAxis
                            dataKey="day"
                            tick={{ fill: '#4d4635', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
                            axisLine={false} tickLine={false}
                        />
                        <YAxis
                            domain={[domMin, domMax]}
                            tick={{ fill: '#4d4635', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
                            axisLine={false} tickLine={false}
                            hide
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(84,233,138,0.04)' }} />
                        {/* Transparent base bar (invisible, just shifts the visible bar up) */}
                        <Bar dataKey="base" stackId="a" fill="transparent" radius={0} />
                        {/* Visible range bar (max - min) */}
                        <Bar dataKey="range" stackId="a" fill="rgba(84,233,138,0.2)" stroke="rgba(84,233,138,0.5)" strokeWidth={1} radius={[3, 3, 0, 0]} />
                        {/* Average line */}
                        <Line
                            type="monotone" dataKey="avg"
                            stroke="#54e98a" strokeWidth={2}
                            dot={{ fill: '#54e98a', r: 3, strokeWidth: 0 }}
                            activeDot={{ r: 4, fill: '#54e98a', strokeWidth: 0 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

interface PriceChartsProps {
    data: DataType;
    secondaryText: React.CSSProperties;
    labelCaps: React.CSSProperties;
    formatMoney: (v: number | string) => string | number;
    calcTime: string;
    isError: boolean;
    image: string | null;
    setData: React.Dispatch<React.SetStateAction<DataType>>;
    defaultDolar: string;
}


export default function PriceCharts({ data, secondaryText, labelCaps, formatMoney, calcTime, isError, image, setData, defaultDolar }: PriceChartsProps) {
    const [points24h, setPoints24h] = useState<ChartPoint[]>([]);

    useEffect(() => {
        // Colombia is always UTC-5 (no DST). Chart day runs 05:00–05:00 Bogotá time.
        // 05:00 Bogotá = 10:00 UTC
        const COLOMBIA_OFFSET_MS = 5 * 60 * 60 * 1000;
        const nowMs = Date.now();
        const bogotaDate = new Date(nowMs - COLOMBIA_OFFSET_MS);
        const fiveAmUtcMs = Date.UTC(
            bogotaDate.getUTCFullYear(),
            bogotaDate.getUTCMonth(),
            bogotaDate.getUTCDate(),
            10, 0, 0, 0 // 05:00 Bogotá = 10:00 UTC
        );
        // If current time is before 5 AM Bogotá, use yesterday's 5 AM
        const queryStart = new Date(nowMs < fiveAmUtcMs ? fiveAmUtcMs - 86400000 : fiveAmUtcMs);

        const q = query(
            collection(db, "priceHistory"),
            where("timestamp", ">=", Timestamp.fromDate(queryStart)),
            orderBy("timestamp", "asc"),
            limit(300)
        );
        const unsub = onSnapshot(q, snap => {
            const docs: ChartPoint[] = snap.docs.map(d => {
                const doc = d.data() as PriceDoc;
                return {
                    time: fmtTime(doc.timestamp),
                    timestamp: doc.timestamp ? doc.timestamp.toDate().toISOString() : '',
                    gold: doc.gold || 0,
                    goldUsdOz: doc.goldUsdOz || 0,
                    silverCopKg: doc.silverCopKg || 0,
                    silverUsdOz: doc.silverUsdOz || 0,
                    trmGoldOz: doc.trmGoldOz || 0,
                    dolar: doc.dolar || 0,
                };
            });
            setPoints24h(docs);
        }, err => {
            console.error("Firestore snapshot error:", err);
        });
        return () => unsub();
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <ChartCard
                title="Precio B&B (5am–5am)"
                unit={"COP/oz"}
                dataKey="trmGoldOz"
                color="#54e98a"
                data={points24h}
                showStats
            />
            <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto, 1fr)', gap: '10px', alignItems: 'stretch' }}>
                    {/*<ChartCard*/}
                    {/*    title="Precio B&B"*/}
                    {/*    title="Precio B&B"*/}
                    {/*    unit="COP/oz"*/}
                    {/*    dataKey="trmGoldOz"*/}
                    {/*    color="#54e98a"*/}
                    {/*    data={points}*/}
                    {/*/>*/}
                   <DailyStatsChart />

                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(84,233,138,0.05)', border: '1px solid rgba(84,233,138,0.15)' }}>
                        <p style={labelCaps}>PRECIO B&B</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '6px' }}>
                                <span className="num" style={{ fontSize: '22px', fontWeight: 600, color: '#54e98a', letterSpacing: '-0.01em', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                                    {`$${formatMoney(((data.dolar * data.goldUsdOz) / 31.1034768).toFixed(2))}`}
                                </span>
                            {/*<span style={secondaryText}>COP/oz</span>*/}
                        </div>
                        <p style={{ ...secondaryText, marginTop: '4px',textAlign:"right" }}>{calcTime}</p>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.15)' }}>
                        <p style={labelCaps}>GoldPrice</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '6px' }}>
                                    <span className="num" style={{ fontSize: '22px', fontWeight: 600, color: '#f2ca50', letterSpacing: '-0.01em', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                                        {data.gold > 0 ? `$${formatMoney(data.gold.toFixed(2))}` : '—'}
                                    </span>
                            {/*<span style={secondaryText}>COP/oz</span>*/}
                        </div>
                        <p style={{ ...secondaryText, marginTop: '4px',textAlign:"right"  }}>{data.gold_date || data.gold_time}</p>
                    </div>
                    {/* Gold USD/oz */}
                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.15)' }}>
                        <p style={labelCaps}>GoldPrice onza</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '6px' }}>
                                <span className="num" style={{ fontSize: '22px', fontWeight: 600, color: '#f2ca50', letterSpacing: '-0.01em', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                                    {data.goldUsdOz > 0 ? `$${formatMoney(data.goldUsdOz.toFixed(2))}` : '—'}
                                </span>
                            {/*<span style={secondaryText}>USD/oz</span>*/}
                        </div>
                        <p style={{ ...secondaryText, marginTop: '4px',textAlign:"right"  }}>{data.gold_date || data.gold_time}</p>
                    </div>
                    {/* Silver USD/oz */}
                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(192,200,216,0.05)', border: '1px solid rgba(192,200,216,0.15)' }}>
                        <p style={labelCaps}>GoldPrice plata</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '6px' }}>
                                <span className="num" style={{ fontSize: '22px', fontWeight: 600, color: '#c0c8d8', letterSpacing: '-0.01em', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
                                    {data.silverUsdOz > 0 ? `$${formatMoney(data.silverUsdOz.toFixed(2))}` : '—'}
                                </span>
                            {/*<span style={secondaryText}>USD/oz</span>*/}
                        </div>
                        <p style={{ ...secondaryText, marginTop: '4px',textAlign:"right"  }}>{data.gold_date || data.gold_time}</p>
                    </div>

                <div className="glass-card" style={{ padding: '14px 16px', borderRadius: '12px', borderTop: `2px solid ${isError ? 'rgba(255,107,107,0.4)' : 'rgba(242,202,80,0.2)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={labelCaps}>TRM Banco de Bogotá</p>
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
                    {isError && (
                        <p style={{
                            margin: '6px 0 0',
                            fontSize: '10px',
                            color: '#ff6b6b',
                            fontFamily: 'var(--font-inter), Inter, sans-serif',
                            letterSpacing: '0.03em',
                        }}>
                            Banco de Bogotá no disponible · usando último valor guardado
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
}

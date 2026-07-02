"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Cell,
} from 'recharts';
import { LineChart as LineChartIcon, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { dashboardService } from '@/services/dashboardService';

type ForecastData = Awaited<ReturnType<typeof dashboardService.getForecastingData>>;

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const fmtK = (v: number) => {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(0) + 'M';
  return v.toLocaleString('id-ID');
};
const fmtPct = (n: number) => (isFinite(n) ? n.toFixed(1) + '%' : '—');

function achvBarColor(a: number) {
  if (a >= 100) return 'bg-gradient-to-r from-emerald-400 to-emerald-300';
  if (a >= 80)  return 'bg-gradient-to-r from-amber-400 to-amber-300';
  return 'bg-gradient-to-r from-rose-500 to-rose-400';
}

export default function ForecastingPage() {
  const now = new Date();
  const [year,  setYear]  = useState(String(now.getFullYear()));
  const [month, setMonth] = useState<number>(now.getMonth()); // 0-indexed
  const [data,  setData]  = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dashboardService.getForecastingData(Number(year), month)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month]);

  const me = data?.monthEnd;
  const ye = data?.yearEnd;

  // Derived year-end stats
  const remainingToTarget = useMemo(() => {
    if (!ye) return 0;
    return Math.max(0, ye.target - ye.projected);
  }, [ye]);

  const monthlyAvgNeeded = useMemo(() => {
    if (!data || !ye || !me) return 0;
    const left = 11 - data.activeMonth;
    const gap  = ye.target - ye.ytdActual - me.projected;
    return left > 0 && gap > 0 ? gap / left : 0;
  }, [data, ye, me]);

  // DOW chart: highlight weekend (Sun=0, Sat=6) in amber
  const dowColors = ['#F59E0B','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#F59E0B'];

  return (
    <div className="space-y-6 p-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <LineChartIcon className="w-4 h-4 text-indigo-600" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Forecasting & Projection</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">AI</span>
          </div>
          <p className="text-slate-500 text-sm">Smart Planning — Powered by Historical Data Analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Select month" value={month} onChange={e => setMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {['2026','2025','2024','2023'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {loading && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
        </div>
      </div>

      {/* ── Row 1: Month-End + Year-End ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Month-End Projection */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-bl-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-tr-full pointer-events-none" />

          <div className="flex items-center gap-2 mb-4">
            <LineChartIcon className="w-5 h-5 text-indigo-200" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-200">
              Month-End Projection
            </h3>
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
              {me?.confidence ?? '—'}
            </span>
          </div>

          <div className="flex items-end gap-3 mb-2">
            <p className="text-3xl font-black font-mono">
              {me ? <Amt value={me.projected} short /> : '—'}
            </p>
            <p className="text-sm text-indigo-200 pb-1">Estimasi Akhir</p>
          </div>

          {/* Scenarios */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-[9px] uppercase font-bold text-indigo-300 mb-1">Pessimistic (Down)</p>
              <p className="text-sm font-black font-mono">{me ? <Amt value={me.projectedDown} short /> : '—'}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-[9px] uppercase font-bold text-indigo-300 mb-1">Optimistic (Up)</p>
              <p className="text-sm font-black font-mono">{me ? <Amt value={me.projectedUp} short /> : '—'}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-bold text-indigo-200 mb-1.5">
              <span>MTD: {me ? <Amt value={me.mtd} short /> : '—'}</span>
              <span>Target: {me ? <Amt value={me.target} short /> : '—'}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 relative overflow-hidden">
              <div className={cn('h-3 rounded-full transition-all duration-700', achvBarColor(me?.achievement ?? 0))}
                style={{ width: `${Math.min(me?.achievement ?? 0, 100)}%` }} />
              {/* Month-progress time marker */}
              <div className="absolute top-0 h-3 w-0.5 bg-white/60"
                style={{ left: `${Math.min(data?.monthProgress ?? 0, 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-indigo-300 mt-1">
              <span>Day {data?.activeDay ?? 0}/{data?.daysInMonth ?? 0} ({fmtPct(data?.monthProgress ?? 0)} elapsed)</span>
              <span>Achv: {fmtPct(me?.achievement ?? 0)}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
            <div className="text-center">
              <p className="text-[10px] text-indigo-300 uppercase mb-1">Run Rate / Day</p>
              <p className="text-sm font-black font-mono">{me ? <Amt value={me.runRate} short /> : '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-indigo-300 uppercase mb-1">Selling Days</p>
              <p className="text-sm font-black font-mono">{me ? `${me.sellingDays} / ${data?.daysInMonth}` : '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-indigo-300 uppercase mb-1">Days Left</p>
              <p className="text-sm font-black font-mono">{me?.remainingDays ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Year-End Projection */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-bl-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-tr-full pointer-events-none" />

          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Year-End Projection</h3>
            {ye && (
              <span className={cn('ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1',
                ye.growthRate >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400')}>
                {ye.growthRate >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {fmtPct(Math.abs(ye.growthRate))} YoY
              </span>
            )}
          </div>

          <div className="flex items-end gap-3 mb-4">
            <p className="text-3xl font-black font-mono">
              {ye ? <Amt value={ye.projected} short /> : '—'}
            </p>
            <p className="text-sm text-slate-400 pb-1">Projected Year-End</p>
          </div>

          {/* Year progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
              <span>YTD: {ye ? <Amt value={ye.ytdActual} short /> : '—'}</span>
              <span>Annual Target: {ye ? <Amt value={ye.target} short /> : '—'}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full transition-all duration-700 bg-gradient-to-r from-blue-500 to-blue-400"
                style={{ width: `${Math.min(ye?.achievement ?? 0, 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Projected Achv: {fmtPct(ye?.achievement ?? 0)}</span>
              <span>Growth: {ye ? (ye.growthRate >= 0 ? '+' : '') + fmtPct(ye.growthRate) : '—'}</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase mb-1">Remaining to Target</p>
              <p className="text-sm font-black font-mono">
                {remainingToTarget > 0 ? <Amt value={remainingToTarget} short /> : <span className="text-emerald-400">On Track ✓</span>}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase mb-1">Monthly Avg Needed</p>
              <p className="text-sm font-black font-mono">
                {monthlyAvgNeeded > 0 ? <Amt value={monthlyAvgNeeded} short /> : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Seasonal Chart + Store Projections ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Seasonal Chart (2/3) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="text-sm font-black text-slate-900">Seasonal Projection</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Actual vs Projected vs Target — Monthly</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 flex-wrap justify-end">
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-indigo-500 inline-block" /> Actual</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-indigo-200 inline-block" /> Projected</span>
              <span className="flex items-center gap-1"><span className="w-4 h-0 border-t-2 border-dashed border-rose-400 inline-block" /> Target</span>
              <span className="flex items-center gap-1"><span className="w-4 h-0 border-t border-slate-300 inline-block" /> Prev Year</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data?.seasonalPattern ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
              <Tooltip
                contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, padding: '8px 12px' }}
                labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                formatter={((v: unknown) => [fmtK(Number(v)), '']) as never}
              />
              <Bar dataKey="actual"    fill="#6366F1"     radius={[4,4,0,0]} maxBarSize={20} name="Actual" />
              <Bar dataKey="projected" fill="#C7D2FE"     radius={[4,4,0,0]} maxBarSize={20} name="Projected" />
              <Line dataKey="target"   stroke="#F43F5E"   strokeWidth={2} strokeDasharray="6 4" dot={false} name="Target" connectNulls />
              <Line dataKey="prevYear" stroke="#CBD5E1"   strokeWidth={1.5} dot={false} name="Prev Year" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Store Projections (1/3) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-900">Store Projection</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Projected for {data?.activeMonthName ?? '—'}
            </p>
          </div>
          <div className="p-4 flex-grow overflow-y-auto max-h-80 space-y-4">
            {loading ? (
              <p className="text-center text-slate-400 text-xs py-8 italic">Memuat data...</p>
            ) : (data?.storeProjections ?? []).map(s => {
              const achv = s.achievement;
              const barColor = achv >= 100 ? 'bg-emerald-500' : achv >= 80 ? 'bg-amber-400' : 'bg-rose-400';
              return (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-slate-800">{s.name}</span>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      achv >= 100 ? 'bg-emerald-50 text-emerald-700' : achv >= 80 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600')}>
                      {fmtPct(achv)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1.5">
                    <span>MTD: <span className="font-bold text-slate-600"><Amt value={s.mtd} short /></span></span>
                    <span className="text-slate-200">·</span>
                    <span>Proj: <span className="font-bold text-indigo-600"><Amt value={s.projected} short /></span></span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-700', barColor)}
                      style={{ width: `${Math.min(achv, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Row 3: Category Momentum + Day-of-Week ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Category Momentum */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-900">Category Momentum</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Month-over-Month Change</p>
          </div>
          <div className="p-4 overflow-y-auto max-h-72 space-y-3">
            {loading ? (
              <p className="text-center text-slate-400 text-xs py-8 italic">Memuat data...</p>
            ) : (data?.categoryMomentum ?? []).map(c => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-black text-slate-800">{c.name}</span>
                    <span className={cn('text-[10px] font-bold flex items-center gap-0.5',
                      c.growth >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                      {c.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {c.growth >= 0 ? '+' : ''}{fmtPct(c.growth)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Curr: <span className="font-bold text-slate-700"><Amt value={c.current} short /></span></span>
                    <span className="text-slate-200">·</span>
                    <span>Prev: <span className="font-bold text-slate-500"><Amt value={c.previous} short /></span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Day-of-Week Pattern */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-900">Day-of-Week Pattern</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Average Daily Sales by Day</p>
          </div>
          <div className="p-4 flex items-center justify-center flex-grow">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.dayOfWeek ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip
                  contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, padding: '8px 12px' }}
                  formatter={((v: unknown) => [fmtK(Number(v)), 'Avg Sales']) as never}
                />
                <Bar dataKey="avg" radius={[6,6,0,0]} maxBarSize={36}>
                  {(data?.dayOfWeek ?? []).map((_, i) => (
                    <Cell key={i} fill={dowColors[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

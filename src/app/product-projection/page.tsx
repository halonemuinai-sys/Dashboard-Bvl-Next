"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, Calendar as CalendarIcon, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService } from '@/services/dashboardService';
import BvlgariLoader from '@/components/BvlgariLoader';

type TrendData = Awaited<ReturnType<typeof dashboardService.getCategorySalesTrend>>;

const YEAR_COLORS = ['#16a34a', '#f97316', '#ec4899', '#3b82f6'];  // 2023 2024 2025 2026

function shortVal(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(0) + 'M';
  return n.toLocaleString('id-ID');
}

function fmtAxis(v: number) {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(0) + 'B';
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(0) + 'M';
  return v.toString();
}

const fmtPct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

export default function ProductProjectionPage() {
  const [year, setYear]       = useState(String(new Date().getFullYear()));
  const [metric, setMetric]   = useState<'value' | 'qty'>('value');
  const [category, setCategory] = useState<string>('__total__');
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<TrendData | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dashboardService.getCategorySalesTrend(parseInt(year));
        setData(res);
        setCategory('__total__');
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [year]);

  const getKey = useCallback((yr: number) => {
    const base = category === '__total__' ? `${yr}` : `${yr}_${category}`;
    return metric === 'qty' ? `${base}_qty` : base;
  }, [category, metric]);

  if (loading || !data) return <BvlgariLoader message="Loading Product Projection..." />;

  const { years, categories, chartData, ytd } = data;
  const baseYear  = parseInt(year);
  const prevYear  = baseYear - 1;

  const catKey = category === '__total__' ? '__total__' : category;
  const curYtd  = metric === 'qty' ? (ytd[baseYear]?.[catKey]?.qty  || 0) : (ytd[baseYear]?.[catKey]?.value  || 0);
  const prevYtd = metric === 'qty' ? (ytd[prevYear]?.[catKey]?.qty || 0) : (ytd[prevYear]?.[catKey]?.value || 0);
  const yoy     = prevYtd > 0 ? ((curYtd - prevYtd) / prevYtd) * 100 : 0;

  // months measured = activeMonth + 1
  const monthsMeasured = data.activeMonth + 1;

  // Legend dot
  const renderLegend = () => (
    <div className="flex items-center gap-5 justify-end pr-4 pb-2">
      {years.map((yr, i) => (
        <span key={yr} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: YEAR_COLORS[i] }} />
          {yr}
        </span>
      ))}
    </div>
  );

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs min-w-[160px]">
        <p className="font-black text-slate-700 mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-slate-500">{p.name}</span>
            </span>
            <span className="font-black text-slate-800">
              {p.value != null ? shortVal(Number(p.value)) : '—'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Rank Analysis</h1>
          </div>
          <p className="text-slate-500 text-sm">Top performing SAP Codes, Categories &amp; Collections</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
          <CalendarIcon className="w-4 h-4 text-blue-600" />
          <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {/* Category Sales & Qty Trend Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Card Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900">Category Sales &amp; Qty Trend</h2>
          <p className="text-xs text-slate-400 mt-0.5">Multi-year historically compared performance per category.</p>
        </div>

        {/* Controls Row */}
        <div className="px-6 py-4 flex flex-wrap items-center gap-4">
          {/* Value / Qty toggle */}
          <div className="flex gap-1 border border-slate-200 rounded-xl p-0.5 bg-slate-50">
            {(['value', 'qty'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMetric(m)}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  metric === m ? "bg-white shadow text-slate-800 border border-slate-200" : "text-slate-400 hover:text-slate-600")}>
                {m === 'value' ? 'Value (Rp)' : 'Qty (Pcs)'}
              </button>
            ))}
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCategory('__total__')}
              className={cn("px-4 py-1.5 rounded-full text-xs font-bold border transition-all",
                category === '__total__'
                  ? "bg-blue-600 text-white border-blue-600 shadow"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600")}>
              All
            </button>
            {categories.map(cat => (
              <button key={cat} type="button" onClick={() => setCategory(cat)}
                className={cn("px-4 py-1.5 rounded-full text-xs font-bold border transition-all",
                  category === cat
                    ? "bg-blue-600 text-white border-blue-600 shadow"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600")}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-100 rounded-xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              {baseYear} YTD ({metric === 'value' ? 'VALUE' : 'QTY'})
            </p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {metric === 'value' ? curYtd.toLocaleString('id-ID') : curYtd.toLocaleString('id-ID')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">{monthsMeasured} months measured</p>
          </div>
          <div className="border border-slate-100 rounded-xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              {prevYear} YTD ({metric === 'value' ? 'VALUE' : 'QTY'})
            </p>
            <h3 className="text-2xl font-black text-slate-500 tracking-tight">
              {prevYtd.toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="border border-slate-100 rounded-xl p-4">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">YOY GROWTH</p>
            <div className="flex items-center gap-2">
              {yoy >= 0
                ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                : <TrendingDown className="w-4 h-4 text-rose-500" />}
              <h3 className={cn("text-2xl font-black tracking-tight", yoy >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                {prevYtd > 0 ? fmtPct(yoy) : '—'}
              </h3>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="px-4 pb-6">
          {renderLegend()}
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                {years.map((yr, i) => (
                  <linearGradient key={yr} id={`grad${yr}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={YEAR_COLORS[i]} stopOpacity={yr === baseYear ? 0.15 : 0} />
                    <stop offset="95%" stopColor={YEAR_COLORS[i]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month"
                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
                tickFormatter={fmtAxis} />
              <Tooltip content={<CustomTooltip />} />
              {years.map((yr, i) => (
                <Area
                  key={yr}
                  type="monotone"
                  dataKey={getKey(yr)}
                  name={String(yr)}
                  stroke={YEAR_COLORS[i]}
                  strokeWidth={yr === baseYear ? 2.5 : 1.5}
                  fill={`url(#grad${yr})`}
                  dot={{ r: yr === baseYear ? 3 : 2, fill: YEAR_COLORS[i], strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

"use client";

import { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Building2, Calendar as CalendarIcon, RefreshCw, TrendingUp, Target, Trophy, Receipt, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import BvlgariLoader from '@/components/BvlgariLoader';
import { dashboardService } from '@/services/dashboardService';

type StoreData = Awaited<ReturnType<typeof dashboardService.getStorePerformance>>;

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STORES      = ['ALL', 'Plaza Indonesia', 'Plaza Senayan', 'Bali'];
const MEDALS      = ['🥇', '🥈', '🥉'];
const CAT_COLORS: Record<string, string> = {
  Jewelry: '#F59E0B', Watches: '#3B82F6', Accessories: '#EC4899',
  Perfume: '#10B981', Other: '#94A3B8',
};

// ── Custom SVG Donut Chart ───────────────────────────────────────────────────
function CategoryDonut({ data, total }: { data: { name: string; value: number; color: string }[]; total: number }) {
  const R = 52, CX = 68, CY = 68;
  const CIRC = 2 * Math.PI * R;
  const GAP = 3; // gap between segments in degrees

  let angle = -90;
  const segments = data.filter(d => d.value > 0).map(d => {
    const pct    = d.value / total;
    const deg    = pct * 360 - GAP;
    const arcLen = (deg / 360) * CIRC;
    const start  = angle;
    angle += pct * 360;
    return { ...d, pct, arcLen, startAngle: start };
  });

  const top = segments[0];

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* SVG Donut */}
      <div className="relative">
        <svg width={136} height={136} viewBox="0 0 136 136">
          {/* Track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={18} />
          {/* Segments */}
          {segments.map((s, i) => (
            <circle key={i}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={18}
              strokeLinecap="butt"
              strokeDasharray={`${s.arcLen} ${CIRC}`}
              transform={`rotate(${s.startAngle} ${CX} ${CY})`}
            />
          ))}
          {/* Center */}
          {top && <>
            <text x={CX} y={CY - 7} textAnchor="middle" fill="#0f172a"
              fontSize="18" fontWeight="900" fontFamily="system-ui,sans-serif">
              {(top.pct * 100).toFixed(0)}%
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fill="#94a3b8"
              fontSize="9" fontFamily="system-ui,sans-serif">
              {top.name}
            </text>
          </>}
        </svg>
      </div>

      {/* Category rows */}
      <div className="w-full space-y-3 px-1">
        {segments.map(s => (
          <div key={s.name}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] font-bold text-slate-700 flex-1">{s.name}</span>
              <span className="text-[11px] font-black text-slate-800">{(s.pct * 100).toFixed(1)}%</span>
            </div>
            <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{ width: `${s.pct * 100}%`, backgroundColor: s.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Color helpers exactly as GAS ─────────────────────────────────────────────
// Achievement: Blue ≥100%, Green ≥80%, Red <80%
const achvTextColor = (p: number) =>
  p >= 100 ? 'text-blue-600' : p >= 80 ? 'text-emerald-600' : 'text-rose-600';
const achvBarColor = (p: number) =>
  p >= 100 ? 'bg-blue-500' : p >= 80 ? 'bg-emerald-500' : 'bg-rose-500';
const achvBadgeCls = (p: number) =>
  p >= 100 ? 'bg-blue-50 text-blue-600 border-blue-100'
  : p >= 80  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
  :            'bg-rose-50 text-rose-600 border-rose-100';

// Discount: Green <8%, Amber 8-15%, Red >15%
const discTextColor = (d: number) =>
  d < 8 ? 'text-emerald-600' : d <= 15 ? 'text-amber-600' : 'text-rose-600';

const fmtPct = (n: number, sign = false) =>
  (sign && n >= 0 ? '+' : '') + n.toFixed(1) + '%';

function fmtK(v: number) {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(0) + 'M';
  return v.toLocaleString('id-ID');
}

export default function StorePerformancePage() {
  const [store, setStore]     = useState('ALL');
  const [year, setYear]       = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<StoreData | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await dashboardService.getStorePerformance(store, parseInt(year)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [store, year]);

  if (loading || !data) return <BvlgariLoader message="Loading Store Performance..." />;

  const { kpi, efficiency, monthlyTrend, prevYearTrend, monthlyTargets, categoryStats, advisorStats } = data;

  const trendData = MONTH_SHORT.map((name, i) => ({
    name,
    current:  monthlyTrend[i],
    previous: prevYearTrend[i],
    target:   monthlyTargets[i] || null,
  }));

  const catPie = categoryStats.map(c => ({ name: c.name, value: c.value, color: CAT_COLORS[c.name] || '#94A3B8' }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Performance</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Annual Performance Overview — {store === 'ALL' ? 'All Stores' : store} ({year})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Select store" value={store} onChange={e => setStore(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {STORES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Stores' : s}</option>)}
          </select>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              {['2026','2025','2024'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Section A: 5 KPI Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

        {/* 1. YTD Net Sales */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-blue-600 to-blue-400" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">YTD Net Sales</p>
              <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 font-mono mb-2 leading-none">
              <Amt value={kpi.totalSales} short />
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                kpi.yoyGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              )}>
                {kpi.yoyGrowth >= 0 ? '↑' : '↓'} {Math.abs(kpi.yoyGrowth).toFixed(1)}%
              </span>
              <span className="text-[9px] text-slate-400">vs prev yr</span>
            </div>
          </div>
        </div>

        {/* 2. Annual Target */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-violet-600 to-violet-400" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Annual Target</p>
              <span className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-violet-500" />
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 font-mono mb-2 leading-none">
              <Amt value={kpi.annualTarget} short />
            </h3>
            <p className="text-[9px] text-slate-400">
              Remaining: <span className="font-bold text-slate-600"><Amt value={Math.max(0, kpi.annualTarget - kpi.totalSales)} short /></span>
            </p>
          </div>
        </div>

        {/* 3. Achievement */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className={cn('h-[3px] bg-gradient-to-r',
            kpi.achievement >= 100 ? 'from-emerald-600 to-emerald-400' :
            kpi.achievement >= 80  ? 'from-amber-500 to-amber-400' :
                                     'from-rose-600 to-rose-400'
          )} />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Achievement</p>
              <span className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                kpi.achievement >= 100 ? 'bg-emerald-50' : kpi.achievement >= 80 ? 'bg-amber-50' : 'bg-rose-50'
              )}>
                <Trophy className={cn('w-4 h-4',
                  kpi.achievement >= 100 ? 'text-emerald-500' : kpi.achievement >= 80 ? 'text-amber-500' : 'text-rose-500'
                )} />
              </span>
            </div>
            <h3 className={cn('text-2xl font-black mb-3 leading-none', achvTextColor(kpi.achievement))}>
              {kpi.annualTarget > 0 ? fmtPct(kpi.achievement) : '—'}
            </h3>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-1000', achvBarColor(kpi.achievement))}
                style={{ width: `${Math.min(kpi.achievement, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* 4. Avg Transaction Value */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-amber-500 to-amber-300" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Avg. Transaction</p>
              <span className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 text-amber-500" />
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 font-mono mb-2 leading-none">
              <Amt value={kpi.avgTransValue} short />
            </h3>
            <p className="text-[9px] text-slate-400">
              {kpi.transCount.toLocaleString('id-ID')} transactions
            </p>
          </div>
        </div>

        {/* 5. Avg Discount % */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-rose-600 to-rose-400" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Avg. Discount</p>
              <span className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-rose-500" />
              </span>
            </div>
            <h3 className={cn('text-2xl font-black mb-2 leading-none', discTextColor(kpi.discountPct))}>
              {fmtPct(kpi.discountPct)}
            </h3>
            <p className="text-[9px] text-slate-400">
              Selling Cost: <span className="font-bold text-slate-600">{fmtPct(kpi.costPct)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Section B: 4 Efficiency Cards (dark) ───────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Mall Visitors */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-14 h-14 rounded-full bg-white/5" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mall Visitors</p>
          <h3 className="text-xl font-black font-mono text-white mb-1">
            {efficiency.footfall.toLocaleString('id-ID')}
          </h3>
          <p className="text-[9px] text-slate-500">YTD Footfall Sensor Count</p>
        </div>

        {/* Store Visitors */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-14 h-14 rounded-full bg-white/5" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Store Visitors</p>
          <h3 className="text-xl font-black font-mono text-blue-400 mb-1">
            {efficiency.traffic.toLocaleString('id-ID')}
          </h3>
          <p className="text-[9px] text-slate-500">
            Berhasil: {efficiency.trafficBreakdown.berhasil} | Gagal: {efficiency.trafficBreakdown.gagal}
          </p>
        </div>

        {/* Capture Rate */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-14 h-14 rounded-full bg-white/5" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Capture Rate</p>
          <h3 className="text-2xl font-black text-emerald-400 mb-1">
            {efficiency.footfall > 0 ? fmtPct(efficiency.captureRate) : '—'}
          </h3>
          <p className="text-[9px] text-slate-500">Traffic / Footfall</p>
        </div>

        {/* Sales Conversion */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-14 h-14 rounded-full bg-white/5" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sales Conversion</p>
          <h3 className="text-2xl font-black text-amber-400 mb-1">
            {efficiency.traffic > 0 ? fmtPct(efficiency.conversionRate) : '—'}
          </h3>
          <p className="text-[9px] text-slate-500">Transactions / Traffic</p>
        </div>
      </div>

      {/* ── Section C: Annual Sales Trend Chart ─────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Annual Sales Trend</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Monthly Net Sales (Jan — Des)</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-blue-500 inline-block" /> {year}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-slate-300 inline-block" /> {data.prevYear}</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0 border-t-2 border-dashed border-rose-400 inline-block" /> Target</span>
          </div>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={288}>
            <ComposedChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                tickFormatter={v => fmtK(v)} />
              <Tooltip
                contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, padding: '8px 12px' }}
                labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                formatter={((v: unknown) => {
                  const n = Number(v);
                  return [fmtK(n), ''];
                }) as any}
              />
              <Bar dataKey="current"  fill="rgba(59,130,246,0.75)"   radius={[6,6,0,0]} maxBarSize={22} name={year} order={2} />
              <Bar dataKey="previous" fill="rgba(203,213,225,0.5)"   radius={[4,4,0,0]} maxBarSize={22} name={String(data.prevYear)} order={3} />
              <Line dataKey="target" stroke="#F43F5E" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Target" connectNulls order={1} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Section D: Category + Advisor (1/3 + 2/3) ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Category Doughnut */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Category Contribution</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">YTD Sales by Main Category</p>
          </div>
          <div className="p-5">
            <CategoryDonut data={catPie} total={kpi.totalSales} />
          </div>
        </div>

        {/* Advisor Ranking Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Advisor Ranking</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">YTD Performance — sorted by Net Sales</p>
          </div>
          <div className="overflow-auto max-h-[380px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="sticky top-0 bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 shadow-sm">
                <tr>
                  <th className="py-3 px-4 text-center w-10">#</th>
                  <th className="py-3 px-4">Advisor</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">YTD Sales</th>
                  <th className="py-3 px-4 text-right">Target</th>
                  <th className="py-3 px-4 text-right">Achievement</th>
                  <th className="py-3 px-4 text-center">Trans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {advisorStats.map((adv, i) => (
                  <tr key={adv.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center">
                      {i < 3
                        ? <span className="text-base">{MEDALS[i]}</span>
                        : <span className="text-slate-300 font-bold">{i + 1}</span>}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 hover:text-blue-600 transition-colors">
                      {adv.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{adv.location || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-800">
                      <Amt value={adv.totalSales} short />
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {adv.target > 0 ? <Amt value={adv.target} short /> : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {adv.target > 0 ? (
                        <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', achvBadgeCls(adv.achievement))}>
                          {fmtPct(adv.achievement)}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">{adv.trans}</td>
                  </tr>
                ))}
                {advisorStats.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400">Belum ada data advisor untuk periode ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}

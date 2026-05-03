"use client";

import { useState, useEffect, useMemo } from 'react';
import { PieChart as PieIcon, Calendar as CalendarIcon, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, BarChart
} from 'recharts';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { dashboardService } from '@/services/dashboardService';

const QUARTERS = [
  { label: 'Q1', value: 1, months: 'Jan — Mar' },
  { label: 'Q2', value: 2, months: 'Apr — Jun' },
  { label: 'Q3', value: 3, months: 'Jul — Sep' },
  { label: 'Q4', value: 4, months: 'Oct — Dec' },
];
const CAT_COLORS: Record<string, string> = {
  Jewelry: '#F59E0B', Watches: '#3B82F6', Accessories: '#EC4899',
  Perfume: '#10B981', Other: '#8B5CF6',
};
const TOOLTIP_STYLE = { backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', fontSize:11 };
const fmtPct  = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
const fmtAchv = (n: number) => n.toFixed(1) + '%';
const MEDALS  = ['🥇','🥈','🥉'];

function currentQuarter() { return Math.ceil((new Date().getMonth() + 1) / 3); }

type QData = Awaited<ReturnType<typeof dashboardService.getQuarterlyStandard>>;

export default function QuarterlyStandardPage() {
  const [quarter, setQuarter] = useState(currentQuarter());
  const [year, setYear]       = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<QData | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dashboardService.getQuarterlyStandard(quarter, parseInt(year));
        setData(res);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [quarter, year]);

  const catTotal = useMemo(() =>
    data?.categories.reduce((s, c) => s + c.value, 0) || 1,
  [data]);

  if (loading || !data) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-slate-500 font-medium animate-pulse">Loading Quarterly Standard...</p>
    </div>
  );

  const { qtdSales, qtdTarget, qtdAchv, yoyGrowth, monthlyPacing, categories, topCollections, topCatalogue } = data;
  const yoyPos  = yoyGrowth >= 0;
  const achvPos = qtdAchv >= 100;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <PieIcon className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quarterly Standard</h1>
          </div>
          <p className="text-slate-500 text-sm">Q{quarter} {year} — {QUARTERS[quarter-1].months}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            {QUARTERS.map(q => (
              <button key={q.value} type="button" onClick={() => setQuarter(q.value)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  quarter === q.value ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50")}>
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* QTD Sales */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-lg shadow-blue-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full" />
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">QTD Net Sales — Exc. HO</p>
          <h3 className="text-3xl font-black tracking-tight mb-3"><Amt value={qtdSales} short /></h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(qtdAchv, 100)}%` }} />
            </div>
            <span className="text-sm font-black text-white">{fmtAchv(qtdAchv)}</span>
          </div>
        </div>

        {/* Quarter Target */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quarter Target</p>
          <h3 className="text-2xl font-black text-slate-700 tracking-tight"><Amt value={qtdTarget} short /></h3>
          <p className="text-[10px] text-slate-400 mt-2">
            Remaining: <span className="font-bold text-rose-500"><Amt value={Math.max(0, qtdTarget - qtdSales)} short /></span>
          </p>
        </div>

        {/* YoY Growth */}
        <div className={cn("p-5 rounded-2xl shadow-sm border",
          yoyPos ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">YoY Growth</p>
          <div className="flex items-center gap-2">
            {yoyPos ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-rose-500" />}
            <h3 className={cn("text-2xl font-black tracking-tight", yoyPos ? "text-emerald-600" : "text-rose-500")}>
              {fmtPct(yoyGrowth)}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">vs Q{quarter} {data.prevYear}</p>
        </div>
      </div>

      {/* Monthly Pacing + Monthly Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-4 bg-blue-600 rounded-sm" />
            <h3 className="text-sm font-bold text-slate-900">Monthly Pacing — Q{quarter} {year}</h3>
            <div className="ml-auto flex gap-4 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5"><span className="inline-block w-8 border-t-2 border-blue-500" /> Sales</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-8 border-t-2 border-dashed border-rose-400" /> Target</span>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyPacing} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'#94a3b8', fontSize:12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill:'#94a3b8', fontSize:10 }}
                  tickFormatter={v => v >= 1e9 ? (v/1e9).toFixed(1)+'B' : v >= 1e6 ? (v/1e6).toFixed(0)+'M' : String(v)}
                  width={52} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v: unknown) => {
                    const n = Number(v);
                    return n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(0)+'M' : String(n);
                  }} />
                <Bar dataKey="sales" name="Net Sales" fill="#2563eb" fillOpacity={0.15}
                  stroke="#2563eb" strokeWidth={0} radius={[4,4,0,0]} barSize={48} />
                <Line dataKey="sales" name="Net Sales" type="monotone"
                  stroke="#2563eb" strokeWidth={3} dot={{ r:5, fill:'#2563eb', strokeWidth:0 }} />
                <Line dataKey="target" name="Target" type="monotone"
                  stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Details Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded-sm" />
            <h3 className="text-sm font-bold text-slate-900">Monthly Details</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {monthlyPacing.map(m => (
              <div key={m.name} className="px-5 py-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-700">{m.name}</span>
                  <span className={cn("text-xs font-black",
                    m.achv >= 100 ? "text-emerald-600" : m.achv >= 80 ? "text-amber-500" : "text-rose-500")}>
                    {m.target > 0 ? fmtAchv(m.achv) : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                  <span>Sales: <span className="font-bold text-slate-700"><Amt value={m.sales} short /></span></span>
                  <span>Target: <span className="font-bold text-slate-400"><Amt value={m.target} short /></span></span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-1000",
                    m.achv >= 100 ? "bg-emerald-500" : m.achv >= 80 ? "bg-amber-400" : "bg-rose-400")}
                    style={{ width: `${Math.min(m.achv, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          {/* QTD Summary */}
          <div className={cn("px-5 py-4 border-t-2 border-slate-200",
            achvPos ? "bg-emerald-50" : "bg-rose-50/50")}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-slate-700">QTD Total</span>
              <span className={cn("text-sm font-black", achvPos ? "text-emerald-600" : "text-rose-500")}>
                {fmtAchv(qtdAchv)}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              <Amt value={qtdSales} short /> / <Amt value={qtdTarget} short />
            </div>
          </div>
        </div>
      </div>

      {/* Category Dominance */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-4 bg-blue-600 rounded-sm" />
          <h3 className="text-sm font-bold text-slate-900">Category Dominance</h3>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categories.map(c => ({ ...c, pct: ((c.value / catTotal) * 100).toFixed(1) + '%' }))}
              layout="vertical" margin={{ top: 0, right: 60, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill:'#94a3b8', fontSize:10 }}
                tickFormatter={v => v >= 1e9 ? (v/1e9).toFixed(1)+'B' : (v/1e6).toFixed(0)+'M'} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
                tick={{ fill:'#475569', fontSize:11, fontWeight:600 }} width={75} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v: unknown) => {
                  const n = Number(v);
                  return [n >= 1e9 ? (n/1e9).toFixed(1)+'B' : (n/1e6).toFixed(0)+'M', 'Net Sales'];
                }} />
              <Bar dataKey="value" radius={[0,4,4,0]} barSize={22}
                label={{ content: (props: any) => {
                  const { x, y, width, height, value } = props;
                  if (!value) return null;
                  const pct = ((Number(value) / catTotal) * 100).toFixed(1) + '%';
                  return <text x={x + width + 6} y={y + height / 2} dy={4} fontSize={10} fontWeight={700} fill="#64748b">{pct}</text>;
                }}}>
                {categories.map((c, i) => (
                  <Cell key={i} fill={CAT_COLORS[c.name] || '#8B5CF6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Collections + Top Catalogue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Collections */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-1 h-4 bg-amber-500 rounded-sm" />
            <h3 className="text-sm font-bold text-slate-900">Top 10 Collections</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 w-8">#</th>
                  <th className="py-2.5 px-4">Collection</th>
                  <th className="py-2.5 px-4 text-center w-16">Qty</th>
                  <th className="py-2.5 px-4 text-right">Net Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topCollections.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4">
                      {i < 3 ? <span>{MEDALS[i]}</span> : <span className="text-slate-300 font-bold">{i+1}</span>}
                    </td>
                    <td className="py-2.5 px-4">
                      <div>
                        <p className="font-bold text-slate-800 truncate max-w-[160px]" title={c.name}>{c.name}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: (CAT_COLORS[c.cat] || '#8B5CF6') + '20',
                                   color: CAT_COLORS[c.cat] || '#8B5CF6' }}>
                          {c.cat}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-500">{c.qty}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                      <Amt value={c.value} short />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Catalogue Codes */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-1 h-4 bg-indigo-500 rounded-sm" />
            <h3 className="text-sm font-bold text-slate-900">Top 10 Catalogue Codes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 w-8">#</th>
                  <th className="py-2.5 px-4">Catalogue Code</th>
                  <th className="py-2.5 px-4 text-center w-16">Qty</th>
                  <th className="py-2.5 px-4 text-right">Net Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topCatalogue.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4">
                      {i < 3 ? <span>{MEDALS[i]}</span> : <span className="text-slate-300 font-bold">{i+1}</span>}
                    </td>
                    <td className="py-2.5 px-4">
                      <div>
                        <p className="font-mono font-bold text-indigo-600 text-[11px]">{c.name}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: (CAT_COLORS[c.cat] || '#8B5CF6') + '20',
                                   color: CAT_COLORS[c.cat] || '#8B5CF6' }}>
                          {c.cat}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-500">{c.qty}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                      <Amt value={c.value} short />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

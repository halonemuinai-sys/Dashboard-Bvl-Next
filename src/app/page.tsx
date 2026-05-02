"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Info,
  Calendar as CalendarIcon, RefreshCw, BarChart3
} from 'lucide-react';
import {
  ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart
} from 'recharts';
import { cn, formatCurrency, formatCompact, formatChartValue } from '@/lib/utils';
import { dashboardService, MonthlyOverviewData } from '@/services/dashboardService';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CAT_COLORS: Record<string,string> = { Jewelry:'#F59E0B', Watches:'#3B82F6', Accessories:'#EC4899', Perfume:'#10B981', Other:'#8B5CF6' };

const fmtPct = (n: number) => n.toFixed(1) + '%';
const fmtTooltip = (v: any) => formatCurrency(Number(v));

const TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#0f172a', fontSize: 12 };
const GRID_COLOR = '#e2e8f0';
const TICK_COLOR = '#94a3b8';

export default function MonthlyOverviewPage() {
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonthlyOverviewData | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await dashboardService.getMonthlyOverview(month, parseInt(year));
        setData(r);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [month, year]);

  const activeStores = useMemo(() =>
    data?.storeData.filter(s => !s.store.toLowerCase().includes('head office')).sort((a,b) => b.actual - a.actual) || []
  , [data]);

  const storeNetExcHO = useMemo(() => activeStores.reduce((s,r) => s + r.actual, 0), [activeStores]);


  const crossingPieData = useMemo(() => {
    if (!data?.crossingData) return [];
    const colors = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#2563EB', '#1D4ED8'];
    return Object.entries(data.crossingData)
      .sort((a,b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name, value, color: colors[i % colors.length]
      }));
  }, [data]);

  const dailyChart = useMemo(() => {
    return data?.dailyTrendData.map((d, i) => ({ day: i+1, net: d.net, qty: d.qty })) || [];
  }, [data]);

  const annualTrend = useMemo(() => {
    return data?.trendData.map((t, i) => ({ name: MONTH_SHORT[i], net: t.net, qty: t.qty, trans: t.trans })) || [];
  }, [data, data?.trendData]);

  const multiYearData = useMemo(() => {
    if (!data?.multiYearStats) return [];
    return MONTH_SHORT.map((name, i) => ({
      name,
      '2023': data.multiYearStats[2023]?.[i] || 0,
      '2024': data.multiYearStats[2024]?.[i] || 0,
      '2025': data.multiYearStats[2025]?.[i] || 0,
      '2026': data.multiYearStats[2026]?.[i] || 0,
    }));
  }, [data]);

  if (loading || !data) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading Monthly Overview...</p>
      </div>
    );
  }

  const kpi = data.kpi;
  const annual = data.annualStats;
  const growthPct = kpi.mtdGrowthPct;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly Overview</h1>
          <p className="text-slate-500 text-sm mt-0.5">Key Performance Indicators & Store Breakdown</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
          <CalendarIcon className="w-4 h-4 text-blue-600" />
          <select aria-label="Select month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer border-l border-slate-200 pl-2 ml-2">
            <option value="2026">2026</option><option value="2025">2025</option><option value="2024">2024</option>
          </select>
        </div>
      </div>

      {/* Row 1: Annual KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full" />
          <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">Annual Sales (YTD) — Exc. HO</p>
          <h3 className="text-3xl font-bold tracking-tight mb-2">{formatCurrency(annual.salesExcHO)}</h3>
          <div className="flex items-center text-xs bg-white/10 w-fit px-2 py-1 rounded">
            <span className="font-bold text-white mr-1">{fmtPct(annual.achievement)}</span> of Annual Target
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Annual Target (Cumulative)</p>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">Jan — Dec</span>
          </div>
          <h3 className="text-3xl font-bold text-blue-600 tracking-tight">{formatCurrency(annual.target)}</h3>
          <p className="text-xs text-slate-400 mt-2">Aggregated for all stores (Excl. HO) for {year}.</p>
        </div>
      </div>

      {/* Row 2: Monthly KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-slate-300 hover:shadow-sm transition-all shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Sales (All)</p>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded">Inc. HO</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">{formatCompact(kpi.totalNet)}</h3>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-slate-300 hover:shadow-sm transition-all shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Store Sales</p>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 rounded">Exc. HO</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">{formatCompact(storeNetExcHO)}</h3>
          <div className="mt-2">
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded",
              growthPct > 0 ? "bg-emerald-50 text-emerald-600" : growthPct < 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
            )}>
              {growthPct > 0 ? <TrendingUp className="w-3 h-3" /> : growthPct < 0 ? <TrendingDown className="w-3 h-3" /> : null}
              {fmtPct(Math.abs(growthPct))} vs Last Year
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-slate-300 hover:shadow-sm transition-all shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Store Achievement</p>
          <h3 className={cn("text-2xl font-black",
            kpi.achievement >= 100 ? "text-emerald-600" : kpi.achievement >= 80 ? "text-amber-500" : "text-rose-600"
          )}>{fmtPct(kpi.achievement)}</h3>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-slate-300 hover:shadow-sm transition-all shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cost % (Gross)</p>
              <div className="group relative">
                <Info className="w-3 h-3 text-slate-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all z-10 text-center">
                  Cost % = (Total Discount + Card Commission) / Gross Sales
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400">Total</span>
          </div>
          <h3 className={cn("text-xl font-black tracking-tight", kpi.costPercentage > 15 ? "text-rose-600" : "text-slate-900")}>
            {fmtPct(kpi.costPercentage)}
          </h3>
          <p className="text-[10px] text-slate-400 font-bold mt-1">{formatCompact(data.kpi.totalCost || 0)}</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-slate-300 hover:shadow-sm transition-all shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Discount %</p>
              <div className="group relative">
                <Info className="w-3 h-3 text-slate-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all z-10 text-center">
                  Avg Disc % = Total Discount Value / Total Gross Sales
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400">Disc</span>
          </div>
          <h3 className={cn("text-xl font-black tracking-tight", kpi.avgDiscountPercentage > 12 ? "text-amber-600" : "text-slate-900")}>
            {fmtPct(kpi.avgDiscountPercentage)}
          </h3>
          <p className="text-[10px] text-slate-400 font-bold mt-1">{formatCompact(data.kpi.totalValDisc || 0)}</p>
        </div>
      </div>

      {/* Row 3: Store Performance Table + Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded-sm" />
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Store Performance — {month} {year}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Store</th>
                  <th className="px-6 py-3 text-right">Actual</th>
                  <th className="px-6 py-3 text-right">Cost</th>
                  <th className="px-6 py-3 text-right">Target</th>
                  <th className="px-6 py-3 text-right">Remaining</th>
                  <th className="px-6 py-3 text-right">Achv</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeStores.map(s => (
                  <tr key={s.store} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-3 text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{s.store}</td>
                    <td className="px-6 py-3 text-right font-mono text-xs font-bold text-slate-700">{formatCurrency(s.actual)}</td>
                    <td className="px-6 py-3 text-right font-mono text-xs text-rose-500">{formatCurrency(s.cost)}</td>
                    <td className="px-6 py-3 text-right font-mono text-xs text-slate-400">{formatCurrency(s.target)}</td>
                    <td className="px-6 py-3 text-right font-mono text-xs text-slate-400">{formatCurrency(Math.max(0, s.target - s.actual))}</td>
                    <td className="px-6 py-3 text-right">
                      <span className={cn("text-xs font-black",
                        s.achievement >= 100 ? "text-emerald-600" : s.achievement >= 80 ? "text-amber-500" : "text-rose-500"
                      )}>{fmtPct(s.achievement)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Crossing Sales Pie */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-blue-600 rounded-sm" />
            <h3 className="text-sm font-bold text-slate-900">Crossing Sales Contribution</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={crossingPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                  {crossingPieData.map((e,i) => <Cell key={i} fill={e.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtTooltip} />
                <Legend verticalAlign="bottom" formatter={(v: string) => (<span className="text-[10px] font-bold text-slate-500">{v}</span>)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Multi-Year Comparison Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded-sm" />
            <h3 className="text-sm font-bold text-slate-900">Multi-Year Sales Comparison</h3>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-slate-300"/> 2023</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-slate-400"/> 2024</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-300"/> 2025</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-600"/> 2026</span>
          </div>
        </div>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={multiYearData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:TICK_COLOR,fontSize:12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill:TICK_COLOR,fontSize:10}} tickFormatter={v => formatCompact(v)} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtTooltip} />
              <Area type="monotone" dataKey="2023" stroke="#cbd5e1" fill="transparent" strokeWidth={1} dot={false} name="2023" />
              <Area type="monotone" dataKey="2024" stroke="#94a3b8" fill="transparent" strokeWidth={1} dot={false} name="2024" />
              <Area type="monotone" dataKey="2025" stroke="#93c5fd" fill="transparent" strokeWidth={2} strokeDasharray="5 5" dot={false} name="2025" />
              <Area type="monotone" dataKey="2026" stroke="#2563eb" fill="url(#colorNet)" strokeWidth={3} dot={{r:4, fill:'#2563eb', strokeWidth:0}} name="2026" />
              <defs>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 5: Annual Trend + Daily Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-4 bg-blue-600 rounded-sm" />
            <h3 className="text-base font-bold text-slate-900">Annual Performance Trend — {year}</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={annualTrend}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:TICK_COLOR,fontSize:11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill:TICK_COLOR,fontSize:10}} tickFormatter={v=>`${(v/1e9).toFixed(1)}B`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtTooltip} />
                <Area type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} fill="url(#areaGrad)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-4 bg-blue-600 rounded-sm" />
            <h3 className="text-base font-bold text-slate-900">Daily Sales Trend — {month.substring(0,3)} {year}</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:TICK_COLOR,fontSize:10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill:TICK_COLOR,fontSize:10}} tickFormatter={formatChartValue} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtTooltip} />
                <Bar dataKey="net" fill="#2563eb" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 6: Category Trends (Sales + Qty) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {['net','qty'].map(metric => {
          const chartData = MONTH_SHORT.map((m,i) => {
            const point: any = { name: m };
            Object.entries(data.categoryTrend).forEach(([cat, vals]) => {
              point[cat] = metric === 'net' ? vals.net[i] : vals.qty[i];
            });
            return point;
          });
          const cats = Object.keys(data.categoryTrend);
          return (
            <div key={metric} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-4 bg-blue-600 rounded-sm" />
                <h3 className="text-sm font-bold text-slate-900">
                  {metric === 'net' ? 'Sales' : 'Qty Sold'} by Category — {year}
                </h3>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:TICK_COLOR,fontSize:10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill:TICK_COLOR,fontSize:10}}
                      tickFormatter={metric === 'net' ? formatChartValue : undefined} />
                    <Tooltip contentStyle={TOOLTIP_STYLE}
                      formatter={(v: any) => metric === 'net' ? fmtTooltip(v) : v} />
                    {cats.map(cat => <Bar key={cat} dataKey={cat} stackId="a" fill={CAT_COLORS[cat]||'#8B5CF6'} />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

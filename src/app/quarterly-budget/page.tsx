"use client";

import { useState, useEffect, Fragment } from 'react';
import { BarChart, Calendar as CalendarIcon, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { dashboardService } from '@/services/dashboardService';

const QUARTERS = [
  { label: 'Q1', value: 1, months: 'Jan — Mar' },
  { label: 'Q2', value: 2, months: 'Apr — Jun' },
  { label: 'Q3', value: 3, months: 'Jul — Sep' },
  { label: 'Q4', value: 4, months: 'Oct — Dec' },
];

const fmtPct  = (n: number) => n.toFixed(1) + '%';
const fmtVar  = (n: number) => (n >= 0 ? '+' : '') + n.toLocaleString('id-ID');

function currentQuarter() {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

type QuarterData = Awaited<ReturnType<typeof dashboardService.getQuarterlyBudget>>;

export default function QuarterlyBudgetPage() {
  const [quarter, setQuarter] = useState(currentQuarter());
  const [year, setYear]       = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<QuarterData | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dashboardService.getQuarterlyBudget(quarter, parseInt(year));
        setData(res);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [quarter, year]);

  const achvColor = (pct: number) =>
    pct >= 100 ? 'text-emerald-600' : pct >= 85 ? 'text-amber-500' : 'text-rose-500';
  const achvBg = (pct: number) =>
    pct >= 100 ? 'bg-emerald-500' : pct >= 85 ? 'bg-amber-500' : 'bg-rose-500';

  if (loading || !data) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-slate-500 font-medium animate-pulse">Loading Quarterly Budget...</p>
    </div>
  );

  const { kpi, storeData, monthNames } = data;
  const isOverall = kpi.totalVariance >= 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quarterly Budget</h1>
          </div>
          <p className="text-slate-500 text-sm">Actual vs Budget — Q{quarter} {year} ({QUARTERS[quarter-1].months})</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quarter pills */}
          <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            {QUARTERS.map(q => (
              <button key={q.value} type="button" onClick={() => setQuarter(q.value)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  quarter === q.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50")}>
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
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-2xl text-white shadow-lg shadow-blue-200">
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Total Actual</p>
          <h3 className="text-2xl font-black tracking-tight"><Amt value={kpi.totalActual} short /></h3>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Budget</p>
          <h3 className="text-2xl font-black text-slate-700 tracking-tight"><Amt value={kpi.totalBudget} short /></h3>
        </div>
        <div className={cn("p-5 rounded-2xl shadow-sm border",
          isOverall ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Variance</p>
          <div className="flex items-center gap-2">
            {isOverall ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-rose-500" />}
            <h3 className={cn("text-2xl font-black tracking-tight", isOverall ? "text-emerald-600" : "text-rose-500")}>
              <Amt value={Math.abs(kpi.totalVariance)} short />
            </h3>
          </div>
          <p className={cn("text-[10px] font-bold mt-1", isOverall ? "text-emerald-500" : "text-rose-400")}>
            {isOverall ? '▲ Above' : '▼ Below'} budget
          </p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Achievement</p>
          <h3 className={cn("text-3xl font-black tracking-tight", achvColor(kpi.totalAchievement))}>
            {fmtPct(kpi.totalAchievement)}
          </h3>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
            <div className={cn("h-full rounded-full transition-all duration-1000", achvBg(kpi.totalAchievement))}
              style={{ width: `${Math.min(kpi.totalAchievement, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Store Detail Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 rounded-sm" />
          <h3 className="text-sm font-bold text-slate-900">Store vs Budget Breakdown — Q{quarter} {year}</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Store</th>
                {/* Per-month columns */}
                {monthNames.map(m => (
                  <th key={m} colSpan={3} className="py-3 px-5 text-center border-l border-slate-100">{m}</th>
                ))}
                {/* Quarter total */}
                <th colSpan={3} className="py-3 px-5 text-center border-l border-slate-200 bg-blue-50/30">QTD Total</th>
              </tr>
              <tr className="border-b border-slate-100 text-[9px]">
                <th className="py-2 px-5 text-slate-400">—</th>
                {monthNames.map(m => (
                  <Fragment key={m}>
                    <th className="py-2 px-4 text-right border-l border-slate-100">Actual</th>
                    <th className="py-2 px-4 text-right">Budget</th>
                    <th className="py-2 px-4 text-right text-blue-600">Achv%</th>
                  </Fragment>
                ))}
                <th className="py-2 px-4 text-right border-l border-slate-200 text-blue-600">Actual</th>
                <th className="py-2 px-4 text-right text-blue-600">Budget</th>
                <th className="py-2 px-4 text-right text-blue-600">Achv%</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {storeData.map(row => (
                <tr key={row.store} className="hover:bg-slate-50 transition-colors text-xs">
                  <td className="py-3 px-5 font-bold text-slate-800">{row.store}</td>

                  {row.monthlyBreakdown.map(m => (
                    <Fragment key={m.monthNum}>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 border-l border-slate-100">
                        <Amt value={m.actual} short />
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        <Amt value={m.budget} short />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {m.budget > 0
                          ? <span className={cn("font-black", achvColor(m.achievement))}>{fmtPct(m.achievement)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                    </Fragment>
                  ))}

                  {/* QTD total */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-blue-700 border-l border-slate-200 bg-blue-50/20">
                    <Amt value={row.actual} short />
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500 bg-blue-50/20">
                    <Amt value={row.budget} short />
                  </td>
                  <td className="py-3 px-4 text-right bg-blue-50/20">
                    <span className={cn("font-black text-xs", achvColor(row.achievement))}>
                      {row.budget > 0 ? fmtPct(row.achievement) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Footer total */}
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-bold">
              <tr>
                <td className="py-3 px-5 text-slate-500">TOTAL</td>
                {data.storeData[0]?.monthlyBreakdown.map((_, mi) => {
                  const mActual  = storeData.reduce((s, r) => s + r.monthlyBreakdown[mi].actual, 0);
                  const mBudget  = storeData.reduce((s, r) => s + r.monthlyBreakdown[mi].budget, 0);
                  const mAchv    = mBudget > 0 ? (mActual / mBudget) * 100 : 0;
                  return (
                    <Fragment key={mi}>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 border-l border-slate-100">
                        <Amt value={mActual} short />
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        <Amt value={mBudget} short />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={cn("font-black", achvColor(mAchv))}>{fmtPct(mAchv)}</span>
                      </td>
                    </Fragment>
                  );
                })}
                <td className="py-3 px-4 text-right font-mono text-blue-700 border-l border-slate-200 bg-blue-50/40">
                  <Amt value={kpi.totalActual} short />
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-500 bg-blue-50/40">
                  <Amt value={kpi.totalBudget} short />
                </td>
                <td className="py-3 px-4 text-right bg-blue-50/40">
                  <span className={cn("font-black", achvColor(kpi.totalAchievement))}>
                    {fmtPct(kpi.totalAchievement)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Variance Summary */}
        <div className="px-6 py-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          {storeData.map(row => (
            <div key={row.store} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl">
              <span className="text-xs font-bold text-slate-600">{row.store}</span>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-black", row.variance >= 0 ? "text-emerald-600" : "text-rose-500")}>
                  {fmtVar(row.variance)}
                </span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                  row.achievement >= 100 ? "bg-emerald-100 text-emerald-700" :
                  row.achievement >= 85  ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-600")}>
                  {fmtPct(row.achievement)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

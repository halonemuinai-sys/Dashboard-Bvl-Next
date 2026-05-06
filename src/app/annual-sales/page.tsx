"use client";

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Calendar as CalendarIcon, Download, Store, Target, Award } from 'lucide-react';
import { cn, formatShort } from '@/lib/utils';
import Amt from '@/components/Amt';
import BvlgariLoader from '@/components/BvlgariLoader';
import { dashboardService } from '@/services/dashboardService';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtPct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
const MEDALS = ['🥇','🥈','🥉'];

type AnnualData = Awaited<ReturnType<typeof dashboardService.getAnnualNetSales>>;

// Mini sparkline: 12-bar SVG
function Sparkline({ monthly }: { monthly: number[] }) {
  const max = Math.max(...monthly, 1);
  const W = 72, H = 24, gap = 2;
  const barW = (W - gap * 11) / 12;
  return (
    <svg width={W} height={H} className="overflow-visible">
      {monthly.map((v, i) => {
        const h = Math.max(2, (v / max) * H);
        const x = i * (barW + gap);
        return (
          <rect key={i} x={x} y={H - h} width={barW} height={h}
            rx={1} fill={v === max ? '#f59e0b' : '#93c5fd'} />
        );
      })}
    </svg>
  );
}

export default function AnnualSalesPage() {
  const [year, setYear]     = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData]     = useState<AnnualData | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dashboardService.getAnnualNetSales(parseInt(year));
        setData(res);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [year]);

  const exportCSV = () => {
    if (!data) return;
    const header = ['Rank','Store', ...MONTH_SHORT, 'YTD','YoY%','Contrib%'].join(',');
    const rows = data.storeData.map((s, i) =>
      [i + 1, `"${s.name}"`, ...s.monthly.map(v => v), s.ytd,
       s.yoyGrowth.toFixed(1), s.contribution.toFixed(1)].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `Annual_Net_Sales_${year}.csv`;
    a.click();
  };

  if (loading || !data) return <BvlgariLoader message="Loading Annual Net Sales..." />;

  const { grandTotal, storeData } = data;
  const yoyPos = grandTotal.yoyGrowth >= 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Store className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Annual Net Sales</h1>
          </div>
          <p className="text-slate-500 text-sm">Monthly Net Sales Breakdown by Store — {year}</p>
        </div>
        <div className="flex items-center gap-2">
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
          <button type="button" onClick={exportCSV}
            className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm text-xs font-bold text-slate-600 hover:border-slate-300 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {(() => {
        const achv      = grandTotal.ytdTarget > 0 ? (grandTotal.ytd / grandTotal.ytdTarget) * 100 : 0;
        const achvColor = achv >= 100 ? 'from-emerald-600 to-emerald-400' : achv >= 80 ? 'from-amber-500 to-amber-400' : 'from-rose-600 to-rose-400';
        const achvText  = achv >= 100 ? 'text-emerald-600' : achv >= 80 ? 'text-amber-500' : 'text-rose-500';
        const achvBar   = achv >= 100 ? 'bg-emerald-500' : achv >= 80 ? 'bg-amber-400' : 'bg-rose-400';
        const topStore  = storeData[0];
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            {/* 1. YTD Net Sales — hero dark gradient */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden lg:col-span-1">
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-blue-500/10" />
              <div className="absolute -left-2 -bottom-4 w-16 h-16 rounded-full bg-white/5" />
              <div className="flex items-start justify-between mb-4 relative">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">YTD Net Sales</p>
                <span className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </span>
              </div>
              <h3 className="text-3xl font-black font-mono text-white mb-1 leading-none relative">
                <Amt value={grandTotal.ytd} short />
              </h3>
              <p className="text-[10px] text-slate-500 mb-4">Exc. Head Office · {year}</p>
              <Sparkline monthly={grandTotal.monthly} />
            </div>

            {/* 2. Achievement — dynamic accent */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className={cn('h-[3px] bg-gradient-to-r', achvColor)} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Achievement</p>
                  <span className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-slate-400" />
                  </span>
                </div>
                <h3 className={cn('text-3xl font-black mb-1 leading-none', achvText)}>
                  {grandTotal.ytdTarget > 0 ? achv.toFixed(1) + '%' : '—'}
                </h3>
                <p className="text-[9px] text-slate-400 mb-3">
                  <Amt value={grandTotal.ytd} short /> / <Amt value={grandTotal.ytdTarget} short />
                </p>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-1000', achvBar)}
                    style={{ width: `${Math.min(achv, 100)}%` }} />
                </div>
              </div>
            </div>

            {/* 3. YoY Growth */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className={cn('h-[3px] bg-gradient-to-r', yoyPos ? 'from-emerald-600 to-emerald-400' : 'from-rose-600 to-rose-400')} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">YoY Growth</p>
                  <span className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                    yoyPos ? 'bg-emerald-50' : 'bg-rose-50')}>
                    {yoyPos
                      ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                      : <TrendingDown className="w-4 h-4 text-rose-500" />}
                  </span>
                </div>
                <h3 className={cn('text-3xl font-black leading-none mb-1', yoyPos ? 'text-emerald-600' : 'text-rose-500')}>
                  {fmtPct(grandTotal.yoyGrowth)}
                </h3>
                <p className="text-[9px] text-slate-400">
                  vs <Amt value={grandTotal.prevYtd} short /> ({data.prevYear})
                </p>
              </div>
            </div>

            {/* 4. Top Store */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="h-[3px] bg-gradient-to-r from-amber-500 to-amber-300" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Top Store</p>
                  <span className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-amber-500" />
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-tight mb-1 truncate">
                  {topStore?.name ?? '—'}
                </h3>
                <p className="text-[9px] text-slate-400">
                  <span className="font-black text-amber-600 text-sm"><Amt value={topStore?.ytd ?? 0} short /></span>
                  {' '}· {topStore?.contribution.toFixed(1)}% kontribusi
                </p>
              </div>
            </div>

          </div>
        );
      })()}

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 rounded-sm" />
          <h3 className="text-sm font-bold text-slate-900">Monthly Breakdown — {year}</h3>
          <div className="ml-auto flex items-center gap-4 text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 inline-block" /> Above Target</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-100 inline-block" /> Below Target</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-200 inline-block" /> Best Month</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 w-8">#</th>
                <th className="py-3 px-4">Store</th>
                {MONTH_SHORT.map(m => <th key={m} className="py-3 px-3 text-right">{m}</th>)}
                <th className="py-3 px-4 text-right bg-blue-50/40 text-blue-600">YTD</th>
                <th className="py-3 px-3 text-center">Trend</th>
                <th className="py-3 px-3 text-right">YoY%</th>
                <th className="py-3 px-3 text-right">Contrib%</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {storeData.map((store, idx) => (
                <tr key={store.name} className="hover:bg-slate-50/70 transition-colors group">
                  {/* Rank */}
                  <td className="py-3 px-4 text-center">
                    {idx < 3
                      ? <span className="text-base">{MEDALS[idx]}</span>
                      : <span className="text-slate-300 font-bold">{idx + 1}</span>}
                  </td>

                  {/* Store name */}
                  <td className="py-3 px-4 font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {store.name}
                  </td>

                  {/* Monthly cells */}
                  {store.monthly.map((val, mi) => {
                    const target = store.targets[mi];
                    const isBest = mi === store.bestMonth && val > 0;
                    const aboveTarget = target > 0 && val >= target;
                    const belowTarget = target > 0 && val < target;
                    return (
                      <td key={mi} className={cn(
                        "py-3 px-3 text-right font-mono transition-colors",
                        isBest        ? "bg-amber-50 text-amber-700 font-black"  :
                        aboveTarget   ? "bg-emerald-50 text-emerald-700" :
                        belowTarget   ? "bg-rose-50/60 text-rose-600"   :
                        val === 0     ? "text-slate-200"                 : "text-slate-700"
                      )}>
                        {val > 0 ? formatShort(val) : '—'}
                      </td>
                    );
                  })}

                  {/* YTD */}
                  <td className="py-3 px-4 text-right font-mono font-black text-blue-700 bg-blue-50/30">
                    <Amt value={store.ytd} short />
                  </td>

                  {/* Sparkline */}
                  <td className="py-3 px-3 text-center">
                    <Sparkline monthly={store.monthly} />
                  </td>

                  {/* YoY */}
                  <td className="py-3 px-3 text-right">
                    {store.prevYtd > 0 ? (
                      <span className={cn("font-black",
                        store.yoyGrowth >= 0 ? "text-emerald-600" : "text-rose-500")}>
                        {fmtPct(store.yoyGrowth)}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>

                  {/* Contribution */}
                  <td className="py-3 px-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-bold text-slate-600">{store.contribution.toFixed(1)}%</span>
                      <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full"
                          style={{ width: `${Math.min(store.contribution, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Grand Total Footer */}
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-xs">
              <tr>
                <td className="py-3 px-4 text-slate-400">—</td>
                <td className="py-3 px-4 text-slate-600 uppercase tracking-wider text-[10px]">Grand Total</td>
                {grandTotal.monthly.map((val, mi) => (
                  <td key={mi} className="py-3 px-3 text-right font-mono text-slate-700">
                    {val > 0 ? formatShort(val) : '—'}
                  </td>
                ))}
                <td className="py-3 px-4 text-right font-mono text-blue-700 bg-blue-50/40">
                  <Amt value={grandTotal.ytd} short />
                </td>
                <td className="py-3 px-3">
                  <Sparkline monthly={grandTotal.monthly} />
                </td>
                <td className="py-3 px-3 text-right">
                  <span className={cn("font-black",
                    grandTotal.yoyGrowth >= 0 ? "text-emerald-600" : "text-rose-500")}>
                    {grandTotal.prevYtd > 0 ? fmtPct(grandTotal.yoyGrowth) : '—'}
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-slate-500">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

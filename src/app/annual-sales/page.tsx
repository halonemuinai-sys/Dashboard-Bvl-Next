"use client";

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Calendar as CalendarIcon, Download, Store } from 'lucide-react';
import { cn, formatShort } from '@/lib/utils';
import Amt from '@/components/Amt';
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

  if (loading || !data) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-slate-500 font-medium animate-pulse">Loading Annual Net Sales...</p>
    </div>
  );

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-2xl text-white shadow-lg shadow-blue-200">
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">YTD Net Sales</p>
          <h3 className="text-2xl font-black tracking-tight"><Amt value={grandTotal.ytd} short /></h3>
          <p className="text-[10px] text-blue-300 mt-1">Exc. Head Office</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Annual Target</p>
          <h3 className="text-2xl font-black text-slate-700 tracking-tight"><Amt value={grandTotal.ytdTarget} short /></h3>
          <p className="text-[10px] text-slate-400 mt-1">
            Achv: <span className={cn("font-bold",
              grandTotal.ytdTarget > 0 && (grandTotal.ytd / grandTotal.ytdTarget) >= 1 ? "text-emerald-600" : "text-amber-500")}>
              {grandTotal.ytdTarget > 0 ? ((grandTotal.ytd / grandTotal.ytdTarget) * 100).toFixed(1) + '%' : '—'}
            </span>
          </p>
        </div>
        <div className={cn("p-5 rounded-2xl shadow-sm border",
          yoyPos ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">YoY Growth</p>
          <div className="flex items-center gap-2">
            {yoyPos
              ? <TrendingUp className="w-5 h-5 text-emerald-500" />
              : <TrendingDown className="w-5 h-5 text-rose-500" />}
            <h3 className={cn("text-2xl font-black tracking-tight", yoyPos ? "text-emerald-600" : "text-rose-500")}>
              {fmtPct(grandTotal.yoyGrowth)}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">vs {data.prevYear}</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Stores</p>
          <h3 className="text-2xl font-black text-slate-700 tracking-tight">{storeData.length}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Retail boutiques</p>
        </div>
      </div>

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

"use client";

import { useState, useEffect, useMemo } from 'react';
import { Repeat, Calendar as CalendarIcon, Filter, RefreshCw, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { dashboardService, CrossingSalesData } from '@/services/dashboardService';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STORE_CONFIG: Record<string, { abbr: string; color: string; bg: string; text: string }> = {
  'Plaza Indonesia': { abbr: 'PI', color: '#2563EB', bg: 'bg-blue-50',    text: 'text-blue-600'   },
  'Plaza Senayan':   { abbr: 'PS', color: '#D97706', bg: 'bg-amber-50',   text: 'text-amber-600'  },
  'Bali':            { abbr: 'BL', color: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

const fmtPct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

export default function CrossingSalesPage() {
  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear]   = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData]   = useState<CrossingSalesData | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dashboardService.getCrossingSalesData(month, parseInt(year));
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [month, year]);

  const storeCards = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.storeStats).map(([store, stats]) => {
      const impact = stats.adjusted - stats.physical;
      const varPct = stats.physical > 0 ? (impact / stats.physical) * 100 : 0;
      return { store, ...stats, impact, varPct };
    });
  }, [data]);

  if (loading || !data) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading Crossing Sales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Repeat className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Crossing Sales & Mobility</h1>
          </div>
          <p className="text-slate-500 text-sm">Monthly Analysis of Inter-Boutique Operations — {month} {year}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select aria-label="Select month" value={month} onChange={e => setMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
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

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Net Sales Generated</p>
            <h3 className="text-3xl font-black text-emerald-600"><Amt value={data.totalNetSalesGenerated} /></h3>
            <p className="text-xs text-slate-400 mt-1">Crossing: <span className="font-bold text-slate-600"><Amt value={data.totalNet} /></span></p>
            {data.hoExcludedNet > 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5">+ Excluded HO: <Amt value={data.hoExcludedNet} /></p>
            )}
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Net Qty Generated</p>
            <h3 className="text-3xl font-black text-blue-600">
              {data.totalQtyGenerated} <span className="text-base text-slate-400 font-medium">pcs</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Crossing: <span className="font-bold text-slate-600">{data.totalQty} pcs</span></p>
            {data.hoExcludedQty > 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5">+ Excluded HO: {data.hoExcludedQty} pcs</p>
            )}
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
            <Repeat className="w-6 h-6 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Store Adjustment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {storeCards.map(({ store, physical, adjusted, impact, varPct }) => {
          const cfg = STORE_CONFIG[store];
          const isGain = impact >= 0;
          return (
            <div key={store} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              {/* Decorative circle */}
              <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-10 -mt-10 pointer-events-none transition-colors duration-300", cfg.bg)} />

              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] tracking-wider", cfg.bg, cfg.text)}>
                    {cfg.abbr}
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{store}</p>
                </div>
                <span className={cn(
                  "flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full",
                  isGain ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                )}>
                  {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {fmtPct(varPct)}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-[11px] font-medium text-slate-400 mb-1">Adjusted Performance</p>
                <h4 className="text-2xl font-bold text-slate-900 font-mono tracking-tight"><Amt value={adjusted} /></h4>
                <p className={cn("text-[11px] font-bold mt-1", isGain ? "text-emerald-600" : "text-rose-500")}>
                  {isGain ? '▲' : '▼'} <Amt value={Math.abs(impact)} /> vs Physical
                </p>
              </div>

              <div className="flex justify-between items-center text-[10px] pt-3 border-t border-slate-100">
                <span className="text-slate-400 font-medium tracking-wide">Physical Sales</span>
                <span className="font-bold text-slate-600 font-mono"><Amt value={physical} /></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Crossing Activity Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full" />
          <h3 className="text-sm font-bold text-slate-900">Crossing Activity Details</h3>
          <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {data.records.length} advisors
          </span>
        </div>

        {data.records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Repeat className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No crossing sales recorded for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Sales Advisor</th>
                  <th className="py-3 px-5">Base Location</th>
                  <th className="py-3 px-3 text-center"></th>
                  <th className="py-3 px-5 text-amber-600">Crossing Destination</th>
                  <th className="py-3 px-5 text-right w-44">Net Sales Generated</th>
                  <th className="py-3 px-5 text-center w-24">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.records.map((rec, i) => {
                  const baseCfg  = STORE_CONFIG[rec.baseLoc];
                  const destCfg  = STORE_CONFIG[rec.crossingLoc];
                  return (
                    <tr key={i} className="text-xs hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5 font-bold text-slate-800">{rec.salesman}</td>
                      <td className="py-3 px-5">
                        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold", baseCfg?.bg, baseCfg?.text)}>
                          {baseCfg?.abbr} {rec.baseLoc}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                      </td>
                      <td className="py-3 px-5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600">
                          {destCfg?.abbr} {rec.crossingLoc}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-slate-800"><Amt value={rec.net} /></td>
                      <td className="py-3 px-5 text-center font-mono text-slate-500">{rec.qty}</td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer total */}
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr className="text-xs font-bold text-slate-700">
                  <td className="py-3 px-5" colSpan={4}>Total Crossing Sales</td>
                  <td className="py-3 px-5 text-right font-mono"><Amt value={data.totalNet} /></td>
                  <td className="py-3 px-5 text-center font-mono">{data.totalQty}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

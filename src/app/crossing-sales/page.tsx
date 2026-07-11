"use client";

import { useState, useEffect, useMemo } from 'react';
import { Repeat, Calendar as CalendarIcon, Filter, RefreshCw, FileSpreadsheet, TrendingUp } from 'lucide-react';
import Amt from '@/components/Amt';
import { dashboardService, CrossingSalesData } from '@/services/dashboardService';
import BvlgariLoader from '@/components/BvlgariLoader';
import { MONTHS } from './constants';
import { exportMonthlyExcel, exportAdjustedExcel, exportComparisonExcel, exportAnnualExcel } from './excelExports';
import StorePerformanceCards from './StorePerformanceCards';
import StorePerformanceTable from './StorePerformanceTable';
import CrossingActivityTable from './CrossingActivityTable';

export default function CrossingSalesPage() {
  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year,  setYear]  = useState(String(today.getFullYear()));
  const [loading,           setLoading]           = useState(true);
  const [data,              setData]              = useState<CrossingSalesData | null>(null);
  const [exportingExcel,    setExportingExcel]    = useState(false);
  const [exportingAnnual,   setExportingAnnual]   = useState(false);
  const [exportingAdjusted, setExportingAdjusted] = useState(false);
  const [exportingCompare,  setExportingCompare]  = useState(false);

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
    const incomingMap: Record<string, number> = {};
    const outgoingMap: Record<string, number> = {};
    data.records.forEach(r => {
      incomingMap[r.crossingLoc] = (incomingMap[r.crossingLoc] || 0) + r.net;
      outgoingMap[r.baseLoc]     = (outgoingMap[r.baseLoc]     || 0) + r.net;
    });
    return Object.entries(data.storeStats).map(([store, stats]) => {
      const incomingNet = incomingMap[store] || 0;
      const outgoingNet = outgoingMap[store] || 0;
      const impact  = stats.adjusted - stats.physical;
      const varPct  = stats.physical > 0 ? (impact / stats.physical) * 100 : 0;
      return { store, ...stats, impact, varPct, incomingNet, outgoingNet };
    });
  }, [data]);

  const wrap = (setter: (v: boolean) => void, fn: () => Promise<void>, label: string) => async () => {
    setter(true);
    try { await fn(); }
    catch (err: any) { alert(`Error exporting ${label}: ${err.message}`); }
    finally { setter(false); }
  };

  const handleDownloadExcel    = wrap(setExportingExcel,    () => exportMonthlyExcel(data!, storeCards, month, year), 'Excel');
  const handleDownloadAnnual   = wrap(setExportingAnnual,   () => exportAnnualExcel(year),   'Annual Summary');
  const handleDownloadAdjusted = wrap(setExportingAdjusted, () => exportAdjustedExcel(year), 'Store Performance');
  const handleDownloadCompare  = wrap(setExportingCompare,  () => exportComparisonExcel(),    'Comparison');

  if (loading || !data) return <BvlgariLoader message="Loading Crossing Sales..." />;

  const exportButtons = [
    { label: 'Excel',             cls: 'bg-emerald-700 hover:bg-emerald-800', busy: exportingExcel,    onClick: handleDownloadExcel,    disabled: !data },
    { label: 'Annual Summary',    cls: 'bg-indigo-700 hover:bg-indigo-800',   busy: exportingAnnual,   onClick: handleDownloadAnnual,   disabled: false },
    { label: 'Store Performance', cls: 'bg-violet-700 hover:bg-violet-800',   busy: exportingAdjusted, onClick: handleDownloadAdjusted, disabled: false },
    { label: 'Compare 2023-2026', cls: 'bg-rose-700 hover:bg-rose-800',       busy: exportingCompare,  onClick: handleDownloadCompare,  disabled: false },
  ] as const;

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

        <div className="flex items-center gap-3 flex-wrap">
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
              {['2026','2025','2024','2023'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {exportButtons.map(({ label, cls, busy, onClick, disabled }) => (
            <button key={label} onClick={onClick} disabled={busy || disabled}
              className={`flex items-center gap-2 ${cls} disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold h-10 cursor-pointer`}>
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {label}
            </button>
          ))}
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

      <StorePerformanceCards storeCards={storeCards} />
      <StorePerformanceTable storeCards={storeCards} />
      <CrossingActivityTable data={data} />
    </div>
  );
}

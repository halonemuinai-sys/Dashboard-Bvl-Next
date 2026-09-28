'use client';

import React from 'react';
import {
  Calendar,
  Store,
  RefreshCw,
  FileSpreadsheet,
  BarChart3
} from 'lucide-react';

interface Props {
  month: string;
  year: string;
  monthsList: string[];
  yearsList: string[];
  selectedStore: string;
  storesList: string[];
  loading: boolean;
  onMonthChange: (val: string) => void;
  onYearChange: (val: string) => void;
  onStoreChange: (val: string) => void;
  onRefresh: () => void;
  onExport: () => void;
}

export default function PaymentAnalyticsHeader({
  month,
  year,
  monthsList,
  yearsList,
  selectedStore,
  storesList,
  loading,
  onMonthChange,
  onYearChange,
  onStoreChange,
  onRefresh,
  onExport,
}: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            Bank Performance & MDR Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Executive summary of bank market share, EDC commission efficiency, and boutique cash settlement.
          </p>
        </div>
      </div>

      {/* Filter and Action Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Month Picker */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={month}
            onChange={e => onMonthChange(e.target.value)}
            disabled={loading}
            className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
          >
            {monthsList.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Year Picker */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
          <select
            value={year}
            onChange={e => onYearChange(e.target.value)}
            disabled={loading}
            className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
          >
            {yearsList.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Store Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
          <Store className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedStore}
            onChange={e => onStoreChange(e.target.value)}
            disabled={loading}
            className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="ALL">All Boutiques</option>
            {storesList.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer disabled:opacity-40"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* Export Excel Button */}
        <button
          type="button"
          onClick={onExport}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-40"
          title="Download Executive Excel Report"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel</span>
        </button>
      </div>
    </div>
  );
}

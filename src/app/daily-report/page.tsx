"use client";

import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Store, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  ChevronRight,
  Info
} from 'lucide-react';
import { cn, formatCurrency, formatCompact } from '@/lib/utils';
import { dashboardService } from '@/services/dashboardService';

const fmtPct = (n: number) => n.toFixed(1) + '%';

export default function DailyReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dashboardService.getDailyReport(date);
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  if (loading || !data) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Generating Daily Report...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daily Sales Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">Real-time store performance for {data.monthName}</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
          <CalendarIcon className="w-4 h-4 text-blue-600" />
          <input 
            type="date" 
            value={date} 
            title="Select Report Date"
            aria-label="Select Report Date"
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Store Cards Loop */}
      <div className="grid grid-cols-1 gap-8">
        {data.stores.map((store: any) => (
          <div key={store.storeName} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Store Header */}
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{store.storeName}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MTD Achievement</span>
                    <span className={cn(
                      "text-xs font-black px-2 py-0.5 rounded-full",
                      store.metrics.achievement >= 100 ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {fmtPct(store.metrics.achievement)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Today's Sales</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency(store.metrics.todaySales)}</p>
                </div>
                <div className="text-right border-l border-slate-200 pl-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">MTD Sales</p>
                  <p className="text-xl font-black text-blue-600">{formatCurrency(store.metrics.mtdSales)}</p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Target & Progress */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-xs font-bold text-slate-500">Monthly Target</p>
                    <p className="text-sm font-black text-slate-900">{formatCompact(store.metrics.target)}</p>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-1000 w-[var(--progress)]" 
                      style={{ '--progress': `${Math.max(0, Math.min(store.metrics.achievement, 100))}%` } as any}
                    />
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Remaining to Target</p>
                  <p className="text-sm font-bold text-rose-500">{formatCurrency(store.metrics.remaining)}</p>
                </div>
              </div>

              {/* Efficiency */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">Today's Cost %</span>
                  </div>
                  <span className={cn("text-sm font-black", store.metrics.sellingCostTodayPct > 15 ? "text-rose-600" : "text-slate-900")}>
                    {fmtPct(store.metrics.sellingCostTodayPct)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">Sales Qty</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{store.metrics.todayQty} pcs</span>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div className="lg:col-span-2">
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2 text-center">Qty</th>
                        <th className="px-4 py-2 text-right">Reg Sales</th>
                        <th className="px-4 py-2 text-right text-blue-600 bg-blue-50/50">SMI Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {Object.entries(store.tableData).map(([cat, vals]: any) => (
                        <tr key={cat} className="text-xs hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 font-bold text-slate-700">{cat}</td>
                          <td className="px-4 py-2 text-center font-mono text-slate-500">{vals.qty}</td>
                          <td className="px-4 py-2 text-right font-mono">{formatCurrency(vals.netNonSMI)}</td>
                          <td className="px-4 py-2 text-right font-mono text-blue-600 bg-blue-50/30">{formatCurrency(vals.netSMI)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

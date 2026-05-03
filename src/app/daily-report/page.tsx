"use client";

import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Store, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  ChevronRight,
  Info,
  Send,
  Mail,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService } from '@/services/dashboardService';
import Amt from '@/components/Amt';
import CustomCalendar from '@/components/CustomCalendar';

const fmtPct = (n: number) => n.toFixed(1) + '%';

export default function DailyReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleSendEmail = async () => {
    if (!confirm(`Are you sure you want to send the Daily Report for ${date}?`)) return;
    
    setSending(true);
    try {
      const res = await fetch('/api/reports/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      
      const result = await res.json();
      if (result.success) {
        alert("Email sent successfully!");
      } else {
        alert("Failed to send email: " + (result.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error sending email: " + err.message);
    } finally {
      setSending(false);
    }
  };

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
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Select Buttons */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => {
                const d = new Date();
                setDate(d.toISOString().split('T')[0]);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                date === new Date().toISOString().split('T')[0] 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              Today
            </button>
            <button 
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                setDate(d.toISOString().split('T')[0]);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                date === new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0]
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              Yesterday
            </button>
          </div>

          <div className="relative">
            <div 
              onClick={() => setShowCalendar(!showCalendar)}
              className="group flex items-center gap-3 bg-white border border-slate-200 p-1.5 pr-6 rounded-2xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pick Date</span>
                <span className="text-sm font-black text-slate-700">
                  {new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {showCalendar && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowCalendar(false)} 
                />
                <div className="absolute top-full left-0 mt-3 z-50">
                  <CustomCalendar 
                    selectedDate={date} 
                    onSelect={(d) => {
                      setDate(d);
                      setShowCalendar(false);
                    }} 
                  />
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={handleSendEmail}
            disabled={sending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold"
          >
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Report'}
          </button>
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
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">MTD Achievement</span>
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
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Today's Sales</p>
                  <p className="text-xl font-black text-slate-900"><Amt value={store.metrics.todaySales} /></p>
                </div>
                <div className="text-right border-l border-slate-200 pl-6">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">MTD Sales</p>
                  <p className="text-xl font-black text-blue-600"><Amt value={store.metrics.mtdSales} /></p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Target & Progress */}
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Monthly Target</p>
                    <p className="text-lg font-black text-slate-900 leading-none">
                      <Amt value={store.metrics.target} />
                    </p>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-0.5">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        store.metrics.achievement >= 100 ? "bg-emerald-500" : "bg-blue-600"
                      )}
                      style={{ width: `${Math.max(5, Math.min(store.metrics.achievement, 100))}%` as any }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-[10px] font-bold text-slate-500">0%</p>
                    <p className={cn(
                      "text-[10px] font-black px-1.5 py-0.5 rounded",
                      store.metrics.achievement >= 100 ? "text-emerald-600 bg-emerald-50" : "text-blue-600 bg-blue-50"
                    )}>
                      {fmtPct(store.metrics.achievement)}
                    </p>
                  </div>
                </div>
                <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                  <p className="text-[10px] font-black text-rose-600 uppercase mb-1 tracking-widest">Remaining to Target</p>
                  <p className="text-base font-black text-rose-700 leading-none"><Amt value={store.metrics.remaining} /></p>
                </div>
              </div>

              {/* Efficiency */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700">Today's Cost %</span>
                  </div>
                  <span className={cn("text-sm font-black", store.metrics.sellingCostTodayPct > 15 ? "text-rose-600" : "text-slate-900")}>
                    {fmtPct(store.metrics.sellingCostTodayPct)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700">MDR Cost %</span>
                  </div>
                  <span className={cn("text-sm font-black", store.metrics.mdrCostTodayPct > 2 ? "text-rose-600" : "text-slate-900")}>
                    {fmtPct(store.metrics.mdrCostTodayPct)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700">Sales Qty</span>
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
                        <th className="px-4 py-2 text-center text-rose-600 bg-rose-50/50">Rem. Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {Object.entries(store.tableData).map(([cat, vals]: any) => (
                        <tr key={cat} className="text-xs hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 font-bold text-slate-700">{cat}</td>
                          <td className="px-4 py-2 text-center font-mono text-slate-500">{vals.qty}</td>
                          <td className="px-4 py-2 text-right font-mono"><Amt value={vals.netNonSMI} /></td>
                          <td className="px-4 py-2 text-right font-mono text-blue-600 bg-blue-50/30"><Amt value={vals.netSMI} /></td>
                          <td className="px-4 py-2 text-center font-black text-rose-600 bg-rose-50/30">{vals.stock}</td>
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

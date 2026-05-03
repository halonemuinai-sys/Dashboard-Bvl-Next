"use client";

import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Store, 
  ChevronRight,
  Info,
  Send,
  Mail,
  CreditCard,
  Download,
  TrendingUp,
  Clock,
  RefreshCw
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

  const handleDownloadPDF = async () => {
    // Dynamically import to avoid SSR issues
    const html2canvas = (await import('html2canvas-pro')).default;
    const { jsPDF } = await import('jspdf');
    
    // Target the professional off-screen document
    const element = document.getElementById('pdf-document');
    if (!element) return;
    
    // Briefly make it visible but absolute to avoid layout shift, so html2canvas can capture it properly
    element.style.left = '0';
    element.style.top = '0';
    element.style.position = 'absolute';
    element.style.zIndex = '-100';

    // Capture the element
    const canvas = await html2canvas(element, { 
      scale: 2, 
      useCORS: true,
      windowWidth: 794 // A4 width
    });

    // Re-hide the element
    element.style.left = '-9999px';
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate dimensions to maintain aspect ratio
    let drawWidth = pdfWidth;
    let drawHeight = (canvas.height * pdfWidth) / canvas.width;

    // Force fit onto 1 single page if it's too tall
    if (drawHeight > pdfHeight) {
      drawHeight = pdfHeight;
      drawWidth = (canvas.width * pdfHeight) / canvas.height;
    }

    // Center horizontally if scaled down
    const xPos = (pdfWidth - drawWidth) / 2;

    pdf.addImage(imgData, 'PNG', xPos, 0, drawWidth, drawHeight);
    
    pdf.save(`Bvlgari_Executive_Report_${date}.pdf`);
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
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>

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

      <div id="pdf-report-container" className="space-y-6">
        {/* Global KPI Overview */}
        {data.globalKPIs && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Global Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Sales (Inc HO)</p>
                <p className="text-lg font-black text-slate-900"><Amt value={data.globalKPIs.totalSales} /></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Store Sales (Exc HO)</p>
                <p className="text-lg font-black text-blue-600"><Amt value={data.globalKPIs.storeSales} /></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Global Target MTD</p>
                <p className="text-lg font-black text-slate-900"><Amt value={data.globalKPIs.globalTarget} /></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Achievement</p>
                <p className={cn("text-lg font-black", data.globalKPIs.globalAchievement >= 100 ? "text-emerald-600" : "text-amber-600")}>
                  {fmtPct(data.globalKPIs.globalAchievement)}
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">MTD Cost %</p>
                <p className={cn("text-lg font-black", data.globalKPIs.mtdCostPct > 15 ? "text-rose-600" : "text-slate-900")}>
                  {fmtPct(data.globalKPIs.mtdCostPct)}
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">AVG Disc MTD</p>
                <p className="text-lg font-black text-amber-600">{fmtPct(data.globalKPIs.avgDiscMtd)}</p>
              </div>
            </div>
          </div>
        )}

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
                        <th className="px-4 py-2 text-center text-amber-600 bg-amber-50/50">Disc %</th>
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
                          <td className="px-4 py-2 text-center font-bold text-amber-600 bg-amber-50/30">
                            {vals.gross > 0 ? ((vals.valDisc / vals.gross) * 100).toFixed(1) : '0.0'}%
                          </td>
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

      {/* --- PROFESSIONAL PDF DOCUMENT (OFF-SCREEN) --- */}
      <div 
        id="pdf-document" 
        className="absolute -left-[9999px] top-0 w-[794px] bg-white text-black font-sans p-8 box-border"
        style={{ minHeight: '1123px' }}
      >
        {/* Header */}
        <div className="border-b-2 border-black pb-3 mb-4 text-center">
          <h1 className="text-2xl font-serif uppercase tracking-[0.2em] text-black">Bvlgari</h1>
          <h2 className="text-lg mt-1 font-semibold text-gray-800 tracking-wide uppercase">Daily Sales Performance Report</h2>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Executive Summary */}
        {data.globalKPIs && (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider border-b border-gray-300 pb-1 mb-2 text-black">Executive Summary</h3>
          <div className="grid grid-cols-2 gap-6">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Total Sales (Incl. HO)</td>
                  <td className="py-1 text-right font-mono font-bold"><Amt value={data.globalKPIs.totalSales}/></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Store Sales (Excl. HO)</td>
                  <td className="py-1 text-right font-mono font-bold"><Amt value={data.globalKPIs.storeSales}/></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Global Target MTD</td>
                  <td className="py-1 text-right font-mono font-bold"><Amt value={data.globalKPIs.globalTarget}/></td>
                </tr>
              </tbody>
            </table>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Global Achievement</td>
                  <td className="py-1 text-right font-mono font-bold">{fmtPct(data.globalKPIs.globalAchievement)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">MTD Cost % (MDR + Disc)</td>
                  <td className="py-1 text-right font-mono font-bold text-rose-600">{fmtPct(data.globalKPIs.mtdCostPct)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Average Discount MTD</td>
                  <td className="py-1 text-right font-mono font-bold text-amber-600">{fmtPct(data.globalKPIs.avgDiscMtd)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Store Breakdown */}
        <div className="mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider border-b border-gray-300 pb-1 mb-3 text-black">Boutique Performance Breakdown</h3>
          
          {data.stores.map((store: any) => (
            <div key={store.storeName} className="mb-4">
              {/* Store Header */}
              <div className="bg-gray-50 border border-gray-200 py-1.5 px-3 mb-2 flex justify-between items-center">
                <h4 className="font-bold text-sm text-black">{store.storeName}</h4>
                <div className="text-right text-[10px]">
                  <span className="text-gray-500 mr-2">MTD Achievement:</span>
                  <span className="font-bold text-black">{fmtPct(store.metrics.achievement)}</span>
                </div>
              </div>

              {/* Store Metrics */}
              <div className="grid grid-cols-4 gap-2 mb-2 text-[10px]">
                <div className="border border-gray-100 p-1.5">
                  <div className="text-gray-500 mb-0.5">MTD Sales</div>
                  <div className="font-bold font-mono"><Amt value={store.metrics.mtdSales} /></div>
                </div>
                <div className="border border-gray-100 p-1.5">
                  <div className="text-gray-500 mb-0.5">Target</div>
                  <div className="font-bold font-mono"><Amt value={store.metrics.target} /></div>
                </div>
                <div className="border border-gray-100 p-1.5">
                  <div className="text-gray-500 mb-0.5">Today's Sales</div>
                  <div className="font-bold font-mono"><Amt value={store.metrics.todaySales} /></div>
                </div>
                <div className="border border-gray-100 p-1.5">
                  <div className="text-gray-500 mb-0.5">Rem. to Target</div>
                  <div className="font-bold font-mono text-red-600"><Amt value={store.metrics.remaining} /></div>
                </div>
              </div>

              {/* Store Table */}
              <table className="w-full text-[10px] text-left border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="border border-gray-200 py-1 px-2">Category</th>
                    <th className="border border-gray-200 py-1 px-2 text-center">Qty (Today)</th>
                    <th className="border border-gray-200 py-1 px-2 text-right">Reg Sales</th>
                    <th className="border border-gray-200 py-1 px-2 text-right">SMI Sales</th>
                    <th className="border border-gray-200 py-1 px-2 text-center">Disc %</th>
                    <th className="border border-gray-200 py-1 px-2 text-center">Rem. Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(store.tableData).map(([cat, vals]: any) => (
                    <tr key={cat}>
                      <td className="border border-gray-200 py-1 px-2 font-medium">{cat}</td>
                      <td className="border border-gray-200 py-1 px-2 text-center font-mono">{vals.qty}</td>
                      <td className="border border-gray-200 py-1 px-2 text-right font-mono"><Amt value={vals.netNonSMI} /></td>
                      <td className="border border-gray-200 py-1 px-2 text-right font-mono"><Amt value={vals.netSMI} /></td>
                      <td className="border border-gray-200 py-1 px-2 text-center font-mono">
                        {vals.gross > 0 ? ((vals.valDisc / vals.gross) * 100).toFixed(1) : '0.0'}%
                      </td>
                      <td className="border border-gray-200 py-1 px-2 text-center font-mono font-bold text-red-600">{vals.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-8 right-8 pt-2 border-t border-gray-300 text-[9px] text-gray-400 flex justify-between items-center">
          <div>
            <p className="font-bold text-gray-600 tracking-widest">CONFIDENTIAL</p>
            <p>Internal Use Only - Bvlgari Indonesia</p>
          </div>
          <div className="text-right">
            <p>Generated via Bvlgari Dashboard</p>
            <p>{new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}</p>
          </div>
        </div>
      </div>

    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  Store as StoreIcon, 
  Calendar as CalendarIcon,
  ShoppingBag,
  Users,
  BarChart2,
  Receipt,
  PhoneForwarded,
  Mail,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  X,
  Building2,
  User,
  Send,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function MobileDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showValue, setShowValue] = useState<boolean>(true); // true = VALUE (IDR), false = VOLUME (QTY)
  const [selectedMonth, setSelectedMonth] = useState<number>(7); // Default to July (Full Month)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedStore, setSelectedStore] = useState<string>('Plaza Indonesia');
  const [scope, setScope] = useState<'personal' | 'store'>('personal');
  const [advisorName, setAdvisorName] = useState<string>('');
  
  // Modal Email Excel
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [emailNotice, setEmailNotice] = useState<string>('');

  const monthsFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const storesList = ['All Stores', 'Plaza Indonesia', 'Plaza Senayan', 'Bali'];

  useEffect(() => {
    const storedStore = localStorage.getItem('mobile_advisor_store') || 'Plaza Indonesia';
    const storedAdvisor = localStorage.getItem('mobile_advisor_name') || '';
    setSelectedStore(storedStore);
    setAdvisorName(storedAdvisor);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const activeAdvisor = scope === 'store' ? '' : advisorName;
      const res = await fetch(
        `/api/mobile/dashboard?store=${encodeURIComponent(selectedStore)}&advisor=${encodeURIComponent(activeAdvisor)}&month=${selectedMonth}&year=${selectedYear}`
      );
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, scope, selectedStore, advisorName]);

  const fmtCurrency = (v: number) => {
    return Math.round(v).toLocaleString('id-ID');
  };

  const handleExecuteSendEmail = async (locationName: string, emailTarget: string) => {
    setShowEmailModal(false);
    setSendingEmail(true);
    setEmailNotice(`Mengirim Excel ${locationName} ke ${emailTarget}...`);

    try {
      const res = await fetch('/api/send-advisor-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          location: locationName,
          emailTo: emailTarget,
          ccEmail: 'aris@mraretail.co.id, jessica@mogems.co.id',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setEmailNotice(`Sukses! Excel ${locationName} ${monthsFull[selectedMonth - 1]} ${selectedYear} terkirim ke ${emailTarget}`);
      } else {
        setEmailNotice(json.error || 'Gagal mengirim email.');
      }
    } catch (e) {
      setEmailNotice('Terjadi kesalahan koneksi saat mengirim email.');
    } finally {
      setSendingEmail(false);
      setTimeout(() => setEmailNotice(''), 6000);
    }
  };

  const mtd = data?.mtd || {
    netSales: 0,
    qty: 0,
    targetValue: 11000000000,
    targetQty: 10,
    achievementPct: 0,
    transactionCount: 0,
    growthVsPrevMonth: 0,
  };

  const quickStats = data?.quickStats || { prospectCount: 0, followUpCount: 0, newProfileCount: 0 };
  const categories = data?.categoryBreakdown || [];
  const monthlyChart = data?.monthlyChart || [];

  const currentMtd = showValue ? mtd.netSales : mtd.qty;
  const currentTarget = showValue ? mtd.targetValue : mtd.targetQty;
  const hasTarget = currentTarget > 0;
  const currentAchPct = hasTarget ? (currentMtd / currentTarget) * 100 : 0;
  const currentRemaining = Math.max(0, currentTarget - currentMtd);
  const growth = mtd.growthVsPrevMonth || 0;

  return (
    <div className="space-y-4 pb-6">
      
      {/* ── SHARED FILTER BAR (Flutter App _buildFilterBar) ── */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 space-y-2.5">
        
        {/* Store Selector Row */}
        <div className="flex items-center space-x-3">
          <StoreIcon className="w-5 h-5 text-purple-600 shrink-0" />
          <div className="flex-1 relative">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full bg-[#F4F6F8] border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-3 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {storesList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <ChevronRight className="w-4 h-4 rotate-90" />
            </div>
          </div>
        </div>

        {/* Date Selector Row */}
        <div className="flex items-center space-x-3">
          <CalendarIcon className="w-5 h-5 text-slate-500 shrink-0" />
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="col-span-2 relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-[#F4F6F8] border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {monthsFull.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>{m}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                <ChevronRight className="w-3.5 h-3.5 rotate-90" />
              </div>
            </div>

            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-[#F4F6F8] border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl px-2.5 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <ChevronRight className="w-3.5 h-3.5 rotate-90" />
              </div>
            </div>
          </div>
        </div>

        {/* Scope Toggle: Personal vs Store Total */}
        <div className="flex bg-[#F1F5F9] p-1 rounded-xl">
          <button
            onClick={() => setScope('personal')}
            className={`flex-1 text-[11px] py-1.5 rounded-lg font-bold flex items-center justify-center transition-all ${
              scope === 'personal' 
                ? 'bg-white text-indigo-600 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3 h-3 mr-1" />
            Advisor Personal ({advisorName ? advisorName.split(' ')[0] : 'Advisor'})
          </button>
          <button
            onClick={() => setScope('store')}
            className={`flex-1 text-[11px] py-1.5 rounded-lg font-bold flex items-center justify-center transition-all ${
              scope === 'store' 
                ? 'bg-white text-indigo-600 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3 h-3 mr-1" />
            Toko ({selectedStore})
          </button>
        </div>

      </div>

      <div className="px-4 space-y-4">
        
        {/* Email Notification Toast */}
        {emailNotice && (
          <div className="bg-slate-900 text-white text-xs px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg">
            <span className="flex items-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
              {emailNotice}
            </span>
            <button onClick={() => setEmailNotice('')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── TOGGLE SELECTOR (VALUE vs VOLUME) ── */}
        <div className="bg-[#F1F5F9] p-1 rounded-xl flex">
          <button
            onClick={() => setShowValue(true)}
            className={`flex-1 py-2 text-center text-[11px] font-bold tracking-wider rounded-lg transition-all ${
              showValue ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            VALUE (IDR)
          </button>
          <button
            onClick={() => setShowValue(false)}
            className={`flex-1 py-2 text-center text-[11px] font-bold tracking-wider rounded-lg transition-all ${
              !showValue ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            VOLUME (QTY)
          </button>
        </div>

        {/* ── MY PERFORMANCE CARD (Flutter HoverCard) ── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          {/* Circular Gradient Backdrop Accent */}
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/5 pointer-events-none" />

          <div className="relative space-y-3">
            
            {/* Card Header Row */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-indigo-600 tracking-[0.15em] uppercase">
                {scope === 'store' ? 'STORE PERFORMANCE (MTD)' : 'MY PERFORMANCE (MTD)'}
              </span>
              <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-blue-100">
                {monthsFull[selectedMonth - 1]} {selectedYear}
              </span>
            </div>

            {/* Main Net Sales Figure */}
            <div className="flex items-baseline space-x-2">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                {showValue ? `IDR ${fmtCurrency(mtd.netSales)}` : `${mtd.qty} Pcs`}
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {showValue ? 'Net Sales' : 'Items Sold'}
              </span>
            </div>

            {/* Growth Badge */}
            {(mtd.netSales > 0 || growth !== 0) && (
              <div>
                <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  growth >= 0 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-1" />}
                  {growth >= 0 ? '▲' : '▼'} {Math.abs(growth).toFixed(1)}% vs bulan lalu
                </span>
              </div>
            )}

            {/* Target Achievement Section */}
            {hasTarget && (
              <div className="pt-2 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600 text-[11px]">Target Achievement</span>
                  <span className={`font-bold text-xs ${currentAchPct >= 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                    {currentAchPct.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-md h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-md transition-all duration-500 ${
                      currentAchPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(currentAchPct, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                  <span>Target: {showValue ? `IDR ${fmtCurrency(mtd.targetValue)}` : `${mtd.targetQty} Pcs`}</span>
                  <span>Sisa: {showValue ? `IDR ${fmtCurrency(currentRemaining)}` : `${currentRemaining} Pcs`}</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Zero Sales Banner Fallback */}
        {mtd.netSales === 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl p-3.5 text-center font-medium flex items-center justify-between">
            <span>Data {monthsFull[selectedMonth - 1]} {selectedYear} masih 0.</span>
            <button 
              onClick={() => setSelectedMonth(7)} 
              className="ml-2 bg-amber-600 text-white font-bold px-3 py-1 rounded-xl text-[11px] shadow-xs hover:bg-amber-700 transition-all"
            >
              Lihat Juli 2026
            </button>
          </div>
        )}

        {/* ── QUICK STATS (Flutter _StatCard) ── */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-xs">
            <Receipt className="w-5 h-5 text-slate-800 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-900 leading-tight">{mtd.transactionCount}</p>
            <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">TRANSAKSI</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-xs">
            <Users className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-emerald-700 leading-tight">{quickStats.prospectCount}</p>
            <p className="text-[9px] font-bold text-emerald-600/80 tracking-wider uppercase mt-0.5">PROSPEK</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-xs">
            <PhoneForwarded className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-700 leading-tight">{quickStats.followUpCount}</p>
            <p className="text-[9px] font-bold text-amber-600/80 tracking-wider uppercase mt-0.5">FOLLOW UP</p>
          </div>
        </div>

        {/* ── QUICK ACTIONS (Flutter _QuickAction) ── */}
        <div className="grid grid-cols-4 gap-2">
          <Link
            href="/m/prospects"
            className="bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center shadow-xs hover:border-cyan-300 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-1">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 leading-tight">Lihat Prospek</span>
          </Link>

          <Link
            href="/m/reports"
            className="bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center shadow-xs hover:border-purple-300 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1">
              <BarChart2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 leading-tight">Laporan Saya</span>
          </Link>

          <Link
            href="/m/reports"
            className="bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center shadow-xs hover:border-orange-300 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-1">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 leading-tight">Transaksi</span>
          </Link>

          <button
            onClick={() => setShowEmailModal(true)}
            className="bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center shadow-xs hover:border-emerald-300 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
              <Mail className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 leading-tight">Kirim Excel</span>
          </button>
        </div>

        {/* ── CATEGORY BREAKDOWN (Flutter Category Breakdown) ── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-50 text-indigo-600 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
              KONTRIBUSI KATEGORI
            </span>
          </div>

          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Belum ada transaksi pada periode ini.</p>
            ) : (
              categories.map((cat: any, idx: number) => {
                const totalVal = categories.reduce((sum: number, c: any) => sum + (c.netSales || 0), 0);
                const pct = totalVal > 0 ? (cat.netSales / totalVal) * 100 : 0;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">{cat.category}</span>
                      <span className="font-bold text-slate-600 text-[11px]">
                        {showValue ? `IDR ${fmtCurrency(cat.netSales)} (${cat.qty} pcs)` : `${cat.qty} pcs`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── 12-MONTH SALES TREND (Flutter Monthly Chart) ── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <BarChart2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                12-MONTH SALES TREND ({selectedYear})
              </span>
            </div>
            <span className="text-[9px] font-semibold text-slate-400">Ketuk u/ ubah bulan</span>
          </div>

          <div className="flex items-end space-x-1.5 h-36 pt-6 px-1">
            {monthlyChart.map((m: any, idx: number) => {
              const maxVal = Math.max(...monthlyChart.map((item: any) => showValue ? item.netSales : item.qty), 1);
              const val = showValue ? m.netSales : m.qty;
              const heightPct = (val / maxVal) * 100;
              const isCurrentMonth = m.month === selectedMonth;

              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedMonth(m.month)}
                  className="flex-1 flex flex-col items-center group cursor-pointer relative"
                >
                  <div className="w-full bg-slate-100 rounded-t-lg h-24 flex items-end overflow-hidden p-0.5">
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isCurrentMonth ? 'bg-indigo-600 ring-2 ring-indigo-400' : 'bg-indigo-300 group-hover:bg-indigo-500'
                      }`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                  </div>
                  <span className={`text-[9px] mt-1 font-bold ${isCurrentMonth ? 'text-indigo-600 font-extrabold' : 'text-slate-400'}`}>
                    M{m.month}
                  </span>

                  {/* Tooltip on Hover */}
                  <div className="absolute -top-8 hidden group-hover:block bg-slate-900 text-white text-[9px] py-1 px-1.5 rounded shadow-md z-20 whitespace-nowrap">
                    {showValue ? `IDR ${fmtCurrency(val)}` : `${val} Pcs`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── EMAIL EXCEL MODAL (Flutter _sendExcelFromDashboard Dialog) ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-emerald-600">
              <Mail className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Kirim Laporan Excel</h3>
            </div>

            <p className="text-xs text-slate-500">
              Pilih butik & tujuan email untuk periode {monthsFull[selectedMonth - 1]} {selectedYear}:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleExecuteSendEmail('Plaza Indonesia', 'pi@mogems.co.id')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 flex items-center justify-between group transition-all"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">Plaza Indonesia</p>
                  <p className="text-[10px] text-slate-500">pi@mogems.co.id</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
              </button>

              <button
                onClick={() => handleExecuteSendEmail('Plaza Senayan', 'ps@mogems.co.id')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 flex items-center justify-between group transition-all"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">Plaza Senayan</p>
                  <p className="text-[10px] text-slate-500">ps@mogems.co.id</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </button>

              <button
                onClick={() => handleExecuteSendEmail('Bali', 'bali@mogems.co.id')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex items-center justify-between group transition-all"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">Bali</p>
                  <p className="text-[10px] text-slate-500">bali@mogems.co.id</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </button>

              <button
                onClick={() => handleExecuteSendEmail('Semua Lokasi (All Stores)', 'aris@mraretail.co.id')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-500 hover:bg-slate-50 flex items-center justify-between group transition-all"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">Semua Lokasi (All Stores)</p>
                  <p className="text-[10px] text-slate-500">aris@mraretail.co.id</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </button>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 px-4 py-2"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

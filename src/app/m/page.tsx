'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Target, 
  ShoppingBag, 
  Calendar,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Users,
  UserCheck,
  Mail,
  CheckCircle2,
  BarChart2
} from 'lucide-react';
import Link from 'next/link';

export default function MobileDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'value' | 'qty'>('value');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const store = localStorage.getItem('mobile_advisor_store') || 'Plaza Indonesia';
      const advisor = localStorage.getItem('mobile_advisor_name') || '';

      const res = await fetch(
        `/api/mobile/dashboard?store=${encodeURIComponent(store)}&advisor=${encodeURIComponent(advisor)}&month=${selectedMonth}&year=${selectedYear}`
      );
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch mobile dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const formatCurrency = (val: number) => {
    if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(2)}M`;
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}Jt`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const handleSendExcel = async () => {
    setSendingEmail(true);
    setEmailStatus('');
    try {
      const store = localStorage.getItem('mobile_advisor_store') || 'Plaza Indonesia';
      const res = await fetch('/api/reports/sales/export-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          location: store,
          emailTo: 'aris@mraretail.co.id',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setEmailStatus(`Laporan Excel ${store} berhasil dikirim ke aris@mraretail.co.id!`);
      } else {
        setEmailStatus(json.error || 'Gagal mengirim laporan Excel');
      }
    } catch (e) {
      setEmailStatus('Terjadi kesalahan jaringan saat mengirim email.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-xs font-semibold">Memuat Dashboard Performance...</p>
      </div>
    );
  }

  const mtd = data?.mtd || {
    netSales: 0,
    qty: 0,
    targetValue: 0,
    targetQty: 0,
    achievementPct: 0,
    transactionCount: 0,
    growthVsPrevMonth: 0,
  };

  const quickStats = data?.quickStats || { prospectCount: 0, followUpCount: 0, newProfileCount: 0 };
  const categories = data?.categoryBreakdown || [];
  const monthlyChart = data?.monthlyChart || [];

  return (
    <div className="space-y-4">
      
      {/* Month & Year Filter & Mode Toggle */}
      <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {months.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <button
            onClick={fetchData}
            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('value')}
            className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all ${
              viewMode === 'value' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sales (Value)
          </button>
          <button
            onClick={() => setViewMode('qty')}
            className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all ${
              viewMode === 'qty' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Quantity (Pcs)
          </button>
        </div>
      </div>

      {/* Main KPI Card matching Flutter Design */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">
              {viewMode === 'value' ? 'Total Net Sales MTD' : 'Total Quantity Sales MTD'}
            </p>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mt-1">
              {viewMode === 'value' ? formatCurrency(mtd.netSales) : `${mtd.qty} Pcs`}
            </h2>
          </div>
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 mt-5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-indigo-100">Pencapaian Target</span>
            <span className={mtd.achievementPct >= 100 ? 'text-emerald-300 font-extrabold' : 'text-amber-300 font-extrabold'}>
              {mtd.achievementPct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-3 bg-indigo-950/40 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500 shadow"
              style={{ width: `${Math.min(mtd.achievementPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-indigo-200 pt-1 font-medium">
            <span>Target: {viewMode === 'value' ? formatCurrency(mtd.targetValue) : `${mtd.targetQty} Pcs`}</span>
            <span>{mtd.transactionCount} Transaksi</span>
          </div>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/m/prospects" className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:border-indigo-300 transition-all">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Prospects</p>
              <p className="text-[10px] text-slate-500 font-medium">{quickStats.prospectCount} Traffic</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link href="/m/crm" className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:border-indigo-300 transition-all">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">CRM Hub</p>
              <p className="text-[10px] text-slate-500 font-medium">Cari Customer</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>

      {/* Category Breakdown Cards matching Flutter */}
      <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
          <ShoppingBag className="w-4 h-4 mr-1.5 text-indigo-600" /> Breakdown Kategori
        </h3>

        <div className="space-y-3">
          {categories.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">Belum ada transaksi pada periode ini.</p>
          ) : (
            categories.slice(0, 5).map((cat: any, idx: number) => {
              const pct = mtd.netSales > 0 ? (cat.netSales / mtd.netSales) * 100 : 0;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{cat.category}</span>
                    <span className="text-indigo-600">{viewMode === 'value' ? formatCurrency(cat.netSales) : `${cat.qty} Pcs`} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 12-Month Sales Bar Chart */}
      <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
          <BarChart2 className="w-4 h-4 mr-1.5 text-indigo-600" /> Monthly Trend ({selectedYear})
        </h3>

        <div className="flex items-end space-x-1.5 h-32 pt-4 px-1">
          {monthlyChart.map((m: any, idx: number) => {
            const maxVal = Math.max(...monthlyChart.map((item: any) => viewMode === 'value' ? item.netSales : item.qty), 1);
            const val = viewMode === 'value' ? m.netSales : m.qty;
            const heightPct = (val / maxVal) * 100;
            const isCurrentMonth = m.month === selectedMonth;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative">
                <div className="w-full bg-slate-100 rounded-t-lg h-24 flex items-end overflow-hidden p-0.5">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      isCurrentMonth ? 'bg-indigo-600' : 'bg-indigo-300 group-hover:bg-indigo-400'
                    }`}
                    style={{ height: `${Math.max(heightPct, 5)}%` }}
                  />
                </div>
                <span className={`text-[9px] mt-1 font-bold ${isCurrentMonth ? 'text-indigo-600' : 'text-slate-400'}`}>
                  M{m.month}
                </span>

                {/* Tooltip on hover */}
                <div className="absolute -top-8 hidden group-hover:block bg-slate-900 text-white text-[9px] py-1 px-1.5 rounded shadow z-20 whitespace-nowrap">
                  {viewMode === 'value' ? formatCurrency(val) : `${val} Pcs`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Send Excel Report Button matching Flutter */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2 text-center">
        <button
          onClick={handleSendExcel}
          disabled={sendingEmail}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center text-xs transition-all shadow disabled:opacity-50"
        >
          {sendingEmail ? (
            <span className="flex items-center">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Mengirim Laporan...
            </span>
          ) : (
            <span className="flex items-center">
              <Mail className="w-4 h-4 mr-2 text-indigo-400" /> Kirim Laporan Excel Bulan Ini
            </span>
          )}
        </button>

        {emailStatus && (
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center justify-center pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {emailStatus}
          </p>
        )}
      </div>

    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Target, 
  ShoppingBag, 
  DollarSign, 
  Calendar,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Users,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';

export default function MobileDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'value' | 'qty'>('value');

  const fetchData = async () => {
    setLoading(true);
    try {
      const store = localStorage.getItem('mobile_advisor_store') || '';
      const advisor = localStorage.getItem('mobile_advisor_name') || '';

      const res = await fetch(`/api/mobile/dashboard?store=${encodeURIComponent(store)}&advisor=${encodeURIComponent(advisor)}`);
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
  }, []);

  const formatCurrency = (val: number) => {
    if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(2)}M`;
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}Jt`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400 mb-2" />
        <p className="text-xs">Memuat Dashboard Performance...</p>
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

  return (
    <div className="space-y-4">
      
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
        <span className="text-xs font-semibold text-slate-400 px-2 flex items-center">
          <Calendar className="w-3.5 h-3.5 mr-1 text-amber-400" /> MTD Performance
        </span>
        <div className="flex bg-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('value')}
            className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
              viewMode === 'value' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
            }`}
          >
            Sales (Value)
          </button>
          <button
            onClick={() => setViewMode('qty')}
            className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
              viewMode === 'qty' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
            }`}
          >
            Quantity (Pcs)
          </button>
        </div>
      </div>

      {/* Main KPI Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {viewMode === 'value' ? 'Total Net Sales MTD' : 'Total Quantity Sales MTD'}
            </p>
            <h2 className="text-2xl font-extrabold text-amber-400 tracking-tight mt-0.5">
              {viewMode === 'value' ? formatCurrency(mtd.netSales) : `${mtd.qty} Pcs`}
            </h2>
          </div>
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <TrendingUp className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1 mt-4">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-400">Pencapaian Target</span>
            <span className={mtd.achievementPct >= 100 ? 'text-emerald-400' : 'text-amber-400'}>
              {mtd.achievementPct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(mtd.achievementPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
            <span>Target: {viewMode === 'value' ? formatCurrency(mtd.targetValue) : `${mtd.targetQty} Pcs`}</span>
            <span>{mtd.transactionCount} Transaksi</span>
          </div>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/m/prospects" className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between hover:border-amber-500/40 transition-all">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Prospects</p>
              <p className="text-[10px] text-slate-400">{quickStats.prospectCount} Traffic</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </Link>

        <Link href="/m/crm" className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between hover:border-amber-500/40 transition-all">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">CRM Hub</p>
              <p className="text-[10px] text-slate-400">Search & Input</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </Link>
      </div>

      {/* Category Breakdown */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center">
          <ShoppingBag className="w-3.5 h-3.5 mr-1 text-amber-400" /> Breakdown Kategori
        </h3>

        <div className="space-y-2.5">
          {categories.slice(0, 5).map((cat: any, idx: number) => {
            const pct = mtd.netSales > 0 ? (cat.netSales / mtd.netSales) * 100 : 0;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">{cat.category}</span>
                  <span className="text-amber-400">{formatCurrency(cat.netSales)}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

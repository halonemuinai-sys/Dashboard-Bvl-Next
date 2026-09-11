"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Calendar as CalendarIcon, RefreshCw, Store, Users,
  Award, ArrowUpRight, ArrowDownRight, ClipboardList, Repeat,
  Zap, Layers, Clock, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import BvlgariLoader from '@/components/BvlgariLoader';
import { dashboardService } from '@/services/dashboardService';
import { useUserAccess } from '@/lib/user-access-context';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STORES = ['ALL', 'Plaza Indonesia', 'Plaza Senayan', 'Bali'];
const MEDALS = ['🥇', '🥈', '🥉'];

export default function OperationsSalesPage() {
  const { assignedStore } = useUserAccess();

  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [storeFilter, setStoreFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncKey, setSyncKey] = useState(0);

  const [overviewData, setOverviewData] = useState<any>(null);
  const [storePerfData, setStorePerfData] = useState<any>(null);
  const [advisorData, setAdvisorData] = useState<any[]>([]);

  // Automatically set initial store filter if assigned to a specific store
  useEffect(() => {
    if (assignedStore && assignedStore !== 'ALL') {
      const matched = STORES.find(s => s.toLowerCase().includes(assignedStore.toLowerCase()));
      if (matched) setStoreFilter(matched);
    }
  }, [assignedStore]);

  const handleSync = () => { setSyncing(true); setSyncKey(k => k + 1); };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [overviewRes, storeRes, advisorRes] = await Promise.all([
          dashboardService.getMonthlyOverview(month, parseInt(year)),
          dashboardService.getStorePerformance(storeFilter, parseInt(year)),
          dashboardService.getAdvisorPerformance(month, parseInt(year))
        ]);

        setOverviewData(overviewRes);
        setStorePerfData(storeRes);
        setAdvisorData(advisorRes.advisors || []);
      } catch (e) {
        console.error("Error loading operations sales data:", e);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    })();
  }, [month, year, storeFilter, syncKey]);

  // Calculations for current date context
  const now = new Date();
  const currentMonthIdx = MONTHS.indexOf(month);
  const isCurrentMonth = now.getMonth() === currentMonthIdx && now.getFullYear() === parseInt(year);
  const totalDaysInMonth = new Date(parseInt(year), currentMonthIdx + 1, 0).getDate();
  const daysElapsed = isCurrentMonth ? Math.min(now.getDate(), totalDaysInMonth) : totalDaysInMonth;
  const daysRemaining = Math.max(1, totalDaysInMonth - daysElapsed);

  // Filter stores data based on storeFilter
  const storeRows = useMemo(() => {
    if (!overviewData?.storeData) return [];
    return overviewData.storeData
      .filter((s: any) => !s.store.toLowerCase().includes('head office'))
      .filter((s: any) => storeFilter === 'ALL' || s.store.toLowerCase().includes(storeFilter.toLowerCase()))
      .sort((a: any, b: any) => b.actual - a.actual);
  }, [overviewData, storeFilter]);

  const totalStoreActual = useMemo(() => storeRows.reduce((sum: number, r: any) => sum + r.actual, 0), [storeRows]);
  const totalStoreTarget = useMemo(() => storeRows.reduce((sum: number, r: any) => sum + r.target, 0), [storeRows]);
  const storeAchievement = totalStoreTarget > 0 ? (totalStoreActual / totalStoreTarget) * 100 : 0;

  // Calculate Daily Run-Rate required
  const remainingTarget = Math.max(0, totalStoreTarget - totalStoreActual);
  const dailyRunRateRequired = daysRemaining > 0 ? remainingTarget / daysRemaining : 0;
  const dailyRunRateActual = daysElapsed > 0 ? totalStoreActual / daysElapsed : 0;

  // Filter daily sales trend
  const dailyData = useMemo(() => {
    if (!overviewData?.dailyTrendData) return [];
    return overviewData.dailyTrendData;
  }, [overviewData]);

  // Today / latest sales
  const latestDailySales = useMemo(() => {
    if (!dailyData.length) return { date: '-', sales: 0, prevSales: 0 };
    const valid = dailyData.filter((d: any) => d.sales > 0);
    if (!valid.length) return { date: '-', sales: 0, prevSales: 0 };
    const latest = valid[valid.length - 1];
    const prev = valid.length > 1 ? valid[valid.length - 2] : { sales: 0 };
    return { date: latest.date, sales: latest.sales, prevSales: prev.sales };
  }, [dailyData]);

  // Filter advisors for selected store
  const filteredAdvisors = useMemo(() => {
    if (!advisorData.length) return [];
    let list = [...advisorData];
    if (storeFilter !== 'ALL') {
      list = list.filter(a => (a.store || '').toLowerCase().includes(storeFilter.toLowerCase()));
    }
    return list.sort((a: any, b: any) => b.actual - a.actual);
  }, [advisorData, storeFilter]);

  if (loading || !overviewData) {
    return <BvlgariLoader message="Loading Operations Sales Dashboard..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
              Operations Command Center
            </span>
            {assignedStore && assignedStore !== 'ALL' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Store: {assignedStore}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Operations Sales Dashboard</h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Real-time daily sales execution, store targets & run-rate pace tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Store Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Store className="w-3.5 h-3.5 text-amber-600" />
            <select
              aria-label="Filter Store"
              value={storeFilter}
              onChange={e => setStoreFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              {STORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
            <select aria-label="Select month" value={month} onChange={e => setMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer border-l border-slate-200 pl-2">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-blue-600", syncing && "animate-spin")} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── TOP OPERATIONAL KPI SUMMARY ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: MTD Sales & Target Pace */}
        <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">MTD Net Sales</span>
            <span className={cn(
              "text-[10px] font-black px-2 py-0.5 rounded-full border",
              storeAchievement >= 100 ? "bg-blue-50 text-blue-700 border-blue-200" :
              storeAchievement >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              "bg-amber-50 text-amber-700 border-amber-200"
            )}>
              {storeAchievement.toFixed(1)}% Target
            </span>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
              <Amt value={totalStoreActual} />
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Target: <span className="font-semibold text-slate-700"><Amt value={totalStoreTarget} /></span>
            </p>
          </div>

          {/* Daily Run-Rate Banner */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 text-amber-600" /> Run-Rate Needed:
            </span>
            <span className="font-mono font-bold text-amber-700">
              <Amt value={dailyRunRateRequired} />/day ({daysRemaining}d left)
            </span>
          </div>
        </div>

        {/* KPI 2: Latest Daily Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Latest Daily Sales</span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">{latestDailySales.date}</span>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-indigo-900 font-mono tracking-tight">
              <Amt value={latestDailySales.sales} />
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              Vs Prev Day:
              <span className={cn("font-bold flex items-center", latestDailySales.sales >= latestDailySales.prevSales ? "text-emerald-600" : "text-rose-500")}>
                {latestDailySales.sales >= latestDailySales.prevSales ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <Amt value={Math.abs(latestDailySales.sales - latestDailySales.prevSales)} />
              </span>
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Daily Avg Actual:</span>
            <span className="font-mono font-bold text-indigo-700"><Amt value={dailyRunRateActual} />/day</span>
          </div>
        </div>

        {/* KPI 3: Store Achievement Count & Pace */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active Stores Count</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              {storeRows.length} Stores
            </span>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
              {storeRows.filter((r: any) => (r.target > 0 ? (r.actual / r.target) * 100 : 0) >= 100).length} / {storeRows.length}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Stores meeting 100%+ target
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Days Elapsed:</span>
            <span className="font-bold text-slate-700">{daysElapsed} / {totalDaysInMonth} Days</span>
          </div>
        </div>

        {/* KPI 4: Quick Action Banner */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">Daily Operations</span>
            <h4 className="text-sm font-bold mt-1">Input / Verify Transactions</h4>
            <p className="text-[11px] text-blue-100/80 mt-0.5">Record daily sales, update store location & comm.</p>
          </div>
          <Link
            href="/monthly-transactions"
            className="mt-3 inline-flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white text-xs font-bold transition-all border border-white/20"
          >
            <span>Open Monthly Trans.</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── STORE TARGET VS ACHIEVEMENT COMMAND CENTER ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-600" /> Store Target & Run-Rate Pace
            </h3>
            <p className="text-xs text-slate-500">Breakdown per store: Target vs MTD Net Sales & Run-Rate Required</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Bvlgari Retail Indonesia</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {storeRows.map((s: any) => {
            const achv = s.target > 0 ? (s.actual / s.target) * 100 : 0;
            const remaining = Math.max(0, s.target - s.actual);
            const dailyReq = daysRemaining > 0 ? remaining / daysRemaining : 0;

            return (
              <div key={s.store} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 hover:border-slate-300 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">{s.store}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">MTD Store Target</p>
                  </div>
                  <span className={cn(
                    "text-xs font-extrabold px-2.5 py-0.5 rounded-lg border",
                    achv >= 100 ? "bg-blue-50 text-blue-700 border-blue-200" :
                    achv >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    "bg-rose-50 text-rose-700 border-rose-200"
                  )}>
                    {achv.toFixed(1)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        achv >= 100 ? "bg-blue-600" : achv >= 80 ? "bg-emerald-500" : "bg-amber-500"
                      )}
                      style={{ width: `${Math.min(100, achv)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Actual: <strong className="text-slate-800"><Amt value={s.actual} /></strong></span>
                    <span>Target: <strong><Amt value={s.target} /></strong></span>
                  </div>
                </div>

                {/* Daily Pace Needed */}
                <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 font-medium">Run-Rate Needed:</span>
                  <span className="font-mono font-bold text-amber-700"><Amt value={dailyReq} />/day</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ROW 3: DAILY SALES CHART & ADVISOR LEADERBOARD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Execution Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" /> Daily Sales Trend ({month} {year})
              </h3>
              <p className="text-xs text-slate-500">Daily sales breakdown across all transactions</p>
            </div>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis
                  tickFormatter={v => (v / 1_000_000).toFixed(0) + 'M'}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val), 'Sales']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
                />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Advisor Performance Leaderboard */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" /> Top Sales Advisors
              </h3>
              <Link href="/advisor-performance" className="text-[11px] font-bold text-blue-600 hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredAdvisors.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Tidak ada data advisor untuk filter ini</p>
              ) : (
                filteredAdvisors.slice(0, 6).map((adv: any, idx: number) => {
                  const achv = adv.target > 0 ? (adv.actual / adv.target) * 100 : 0;
                  return (
                    <div key={adv.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold w-5 text-center">
                          {MEDALS[idx] || `#${idx + 1}`}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{adv.name}</p>
                          <p className="text-[10px] text-slate-400">{adv.store || 'Store'}</p>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <p className="text-xs font-extrabold text-slate-900"><Amt value={adv.actual} /></p>
                        <p className={cn("text-[9px] font-bold", achv >= 100 ? "text-emerald-600" : "text-slate-400")}>
                          {achv.toFixed(0)}% Target
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Link
            href="/advisor-setup"
            className="w-full text-center py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all mt-2"
          >
            Manage Advisor Targets & Rota
          </Link>
        </div>
      </div>

      {/* ── QUICK OPERATIONAL ACTIONS HUB ── */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
        <div>
          <h3 className="text-base font-black tracking-tight flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-amber-400" /> Operational Quick Actions
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Quick access shortcuts to key operational tools and modules</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <Link
            href="/monthly-transactions"
            className="p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all group flex flex-col justify-between space-y-2"
          >
            <ClipboardList className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-xs font-bold text-white">Monthly Trans.</p>
              <p className="text-[10px] text-slate-400">Input & edit sales</p>
            </div>
          </Link>

          <Link
            href="/daily-report"
            className="p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all group flex flex-col justify-between space-y-2"
          >
            <CalendarIcon className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-xs font-bold text-white">Daily Report</p>
              <p className="text-[10px] text-slate-400">Daily sales status</p>
            </div>
          </Link>

          <Link
            href="/monthly-dps-svc"
            className="p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all group flex flex-col justify-between space-y-2"
          >
            <Layers className="w-5 h-5 text-violet-400 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-xs font-bold text-white">DP & SVC Trans.</p>
              <p className="text-[10px] text-slate-400">Track DP & service</p>
            </div>
          </Link>

          <Link
            href="/crossing-sales"
            className="p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all group flex flex-col justify-between space-y-2"
          >
            <Repeat className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-xs font-bold text-white">Crossing Sales</p>
              <p className="text-[10px] text-slate-400">Inter-store sales</p>
            </div>
          </Link>

          <Link
            href="/advisor-setup"
            className="p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all group flex flex-col justify-between space-y-2"
          >
            <Users className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-xs font-bold text-white">Setup Targets</p>
              <p className="text-[10px] text-slate-400">Advisor & Store target</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

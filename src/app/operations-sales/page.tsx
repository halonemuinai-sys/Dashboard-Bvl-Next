"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Calendar as CalendarIcon, RefreshCw, Store, Users,
  Award, ArrowUpRight, ArrowDownRight, ClipboardList, Repeat,
  Zap, Layers, Clock, ChevronRight, Search, CheckCircle2,
  SlidersHorizontal, Flame, Target, Sparkles, Filter, Activity,
  ArrowRight, ShieldCheck, Compass
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import BvlgariLoader from '@/components/BvlgariLoader';
import { dashboardService } from '@/services/dashboardService';
import { useUserAccess } from '@/lib/user-access-context';
import {
  ComposedChart, Bar, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STORES = ['ALL', 'Plaza Indonesia', 'Plaza Senayan', 'Bali'];
const MEDALS = ['🥇', '🥈', '🥉'];

export default function OperationsSalesPage() {
  const { assignedStore } = useUserAccess();

  // Primary filters
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [storeFilter, setStoreFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncKey, setSyncKey] = useState(0);

  // Interactive React States
  const [chartMetric, setChartMetric] = useState<'sales' | 'qty' | 'pace'>('sales');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Data
  const [overviewData, setOverviewData] = useState<any>(null);
  const [storePerfData, setStorePerfData] = useState<any>(null);
  const [advisorData, setAdvisorData] = useState<any[]>([]);

  // Auto-set initial store filter based on user's assignment
  useEffect(() => {
    if (assignedStore && assignedStore !== 'ALL') {
      const matched = STORES.find(s => s.toLowerCase().includes(assignedStore.toLowerCase()));
      if (matched) setStoreFilter(matched);
    }
  }, [assignedStore]);

  const handleSync = () => {
    setSyncing(true);
    setSyncKey(k => k + 1);
  };

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

  // Current calendar context
  const now = new Date();
  const currentMonthIdx = MONTHS.indexOf(month);
  const isCurrentMonth = now.getMonth() === currentMonthIdx && now.getFullYear() === parseInt(year);
  const totalDaysInMonth = new Date(parseInt(year), currentMonthIdx + 1, 0).getDate();
  const daysElapsed = isCurrentMonth ? Math.min(now.getDate(), totalDaysInMonth) : totalDaysInMonth;
  const daysRemaining = Math.max(1, totalDaysInMonth - daysElapsed);

  // Filter store rows
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

  // Run-rate calculations
  const remainingTarget = Math.max(0, totalStoreTarget - totalStoreActual);
  const dailyRunRateRequired = daysRemaining > 0 ? remainingTarget / daysRemaining : 0;
  const dailyRunRateActual = daysElapsed > 0 ? totalStoreActual / daysElapsed : 0;
  const targetPacePerDay = totalDaysInMonth > 0 ? totalStoreTarget / totalDaysInMonth : 0;

  // Daily chart data transformation
  const dailyChartData = useMemo(() => {
    if (!overviewData?.dailyTrendData) return [];
    let cumulative = 0;
    return overviewData.dailyTrendData.map((d: any, i: number) => {
      cumulative += (d.net || 0);
      const dayNum = i + 1;
      const expectedPace = targetPacePerDay * dayNum;
      return {
        day: `${dayNum}`,
        dayLabel: `Tgl ${dayNum}`,
        sales: d.net || 0,
        qty: d.qty || 0,
        cumulative,
        expectedPace,
        dailyTargetBenchmark: targetPacePerDay,
        isPast: isCurrentMonth ? dayNum <= daysElapsed : true,
      };
    });
  }, [overviewData, targetPacePerDay, isCurrentMonth, daysElapsed]);

  // Latest sales snapshot
  const latestDailySales = useMemo(() => {
    if (!dailyChartData.length) return { date: '-', sales: 0, prevSales: 0 };
    const valid = dailyChartData.filter((d: any) => d.sales > 0);
    if (!valid.length) return { date: '-', sales: 0, prevSales: 0 };
    const latest = valid[valid.length - 1];
    const prev = valid.length > 1 ? valid[valid.length - 2] : { sales: 0 };
    return { date: latest.dayLabel, sales: latest.sales, prevSales: prev.sales };
  }, [dailyChartData]);

  // Filtered advisors
  const filteredAdvisors = useMemo(() => {
    if (!advisorData.length) return [];
    let list = [...advisorData];

    // Filter by store
    if (storeFilter !== 'ALL') {
      list = list.filter(a => {
        const loc = (a.location || a.store || '').toLowerCase();
        const sf = storeFilter.toLowerCase();
        if (sf.includes('indonesia') || sf.includes('pi')) return loc.includes('indonesia') || loc.includes('pi');
        if (sf.includes('senayan') || sf.includes('ps')) return loc.includes('senayan') || loc.includes('ps');
        if (sf.includes('bali')) return loc.includes('bali');
        return loc.includes(sf);
      });
    }

    return list.sort((a: any, b: any) => (b.netSales ?? b.actual ?? 0) - (a.netSales ?? a.actual ?? 0));
  }, [advisorData, storeFilter]);

  if (loading || !overviewData) {
    return <BvlgariLoader message="Loading Operations Sales Dashboard..." />;
  }

  // Circular ring calculations
  const progressPct = Math.min(storeAchievement, 100);
  const R = 54, CX = 64, CY = 64, CIRC = 2 * Math.PI * R;
  const strokeLen = (progressPct / 100) * CIRC;

  const getStatusColor = (pct: number) => {
    if (pct >= 100) return { ring: '#3b82f6', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30', gradient: 'from-blue-500 to-indigo-600' };
    if (pct >= 80) return { ring: '#10b981', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', gradient: 'from-emerald-500 to-teal-600' };
    return { ring: '#f59e0b', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', gradient: 'from-amber-500 to-orange-600' };
  };

  const statusTheme = getStatusColor(storeAchievement);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-16">

      {/* ═════════════════════════════════════════════════════════════════════
          1. LUXURY OPERATIONAL HERO COMMAND CENTER
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/90 p-6 md:p-8 text-white border border-slate-800/80 shadow-2xl">
        {/* Ambient Mesh Glow Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
          {/* Left: Branding, Live Pulse, Store Pills */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                LIVE OPERATIONS · BVLGARI RETAIL
              </div>

              {assignedStore && assignedStore !== 'ALL' && (
                <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-bold">
                  Assigned Store: {assignedStore}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                Operations Sales Dashboard
                <Sparkles className="w-5 h-5 text-amber-400 animate-float" />
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Real-time store execution, run-rate tracking, and advisor productivity radar
              </p>
            </div>

            {/* Interactive Store Pills */}
            <div className="pt-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-amber-400" /> Quick Store Switcher:
              </p>
              <div className="flex flex-wrap gap-2">
                {STORES.map((s) => {
                  const isActive = storeFilter === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStoreFilter(s)}
                      className={cn(
                        "group relative px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer border",
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400/50 shadow-lg shadow-blue-500/25 scale-[1.03]"
                          : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:border-white/20"
                      )}
                    >
                      <span>{s}</span>
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Dual Circular Ring & Run-rate Command Card */}
          <div className="flex flex-col sm:flex-row items-center gap-6 bg-white/[0.04] backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-inner w-full xl:w-auto">
            {/* SVG Animated Circular Gauge */}
            <div className="relative shrink-0 group cursor-default">
              <svg width={130} height={130} viewBox="0 0 128 128" className="transform -rotate-90">
                {/* Background track */}
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={11} />
                {/* Progress track */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={R}
                  fill="none"
                  stroke={statusTheme.ring}
                  strokeWidth={11}
                  strokeLinecap="round"
                  strokeDasharray={`${strokeLen} ${CIRC}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black font-mono tracking-tight" style={{ color: statusTheme.ring }}>
                  {storeAchievement.toFixed(1)}%
                </span>
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Target Pace</span>
              </div>
            </div>

            {/* MTD Metrics Details */}
            <div className="space-y-2 text-center sm:text-left min-w-[200px]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total MTD Net Sales</p>
                <p className="text-xl md:text-2xl font-black text-white font-mono tracking-tight mt-0.5">
                  <Amt value={totalStoreActual} />
                </p>
                <p className="text-[11px] text-slate-400">
                  Target: <strong className="text-slate-200 font-mono"><Amt value={totalStoreTarget} /></strong>
                </p>
              </div>

              {/* Dynamic Run-Rate Badge */}
              <div className="pt-2 border-t border-white/10 space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] font-bold text-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Run-Rate Needed:</span>
                </div>
                <p className="text-xs font-mono font-black text-amber-400">
                  <Amt value={dailyRunRateRequired} /> <span className="text-[10px] font-sans text-slate-400">/ hari ({daysRemaining} hari sisa)</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Calendar Controls & Sync Trigger */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month selector */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-xs text-white">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
              <select
                aria-label="Select month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="bg-transparent font-bold text-white outline-none cursor-pointer [&>option]:text-slate-900"
              >
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Year selector */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-xs text-white">
              <select
                aria-label="Select year"
                value={year}
                onChange={e => setYear(e.target.value)}
                className="bg-transparent font-bold text-white outline-none cursor-pointer [&>option]:text-slate-900"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-blue-300", syncing && "animate-spin")} />
            <span>{syncing ? 'Syncing...' : 'Sync Live Data'}</span>
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          2. INTERACTIVE KPI CARDS WITH 3D HOVER LIGHTING
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Latest Daily Sales */}
        <div className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80 group-hover:h-1.5 transition-all" />
          <div className="flex justify-between items-center text-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> Latest Day Sales
            </span>
            <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
              {latestDailySales.date}
            </span>
          </div>

          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              <Amt value={latestDailySales.sales} />
            </h3>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className="text-slate-500 font-medium">Vs Prev Day:</span>
              <span className={cn(
                "font-bold flex items-center gap-0.5",
                latestDailySales.sales >= latestDailySales.prevSales ? "text-emerald-600" : "text-rose-500"
              )}>
                {latestDailySales.sales >= latestDailySales.prevSales ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <Amt value={Math.abs(latestDailySales.sales - latestDailySales.prevSales)} />
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Daily Run-Rate Actual */}
        <div className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80 group-hover:h-1.5 transition-all" />
          <div className="flex justify-between items-center text-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" /> Daily Avg Actual
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {daysElapsed}d Elapsed
            </span>
          </div>

          <div className="mt-3">
            <h3 className="text-2xl font-black text-indigo-950 font-mono tracking-tight">
              <Amt value={dailyRunRateActual} />
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Average per day achieved so far
            </p>
          </div>
        </div>

        {/* Card 3: Stores Meeting Target */}
        <div className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-80 group-hover:h-1.5 transition-all" />
          <div className="flex justify-between items-center text-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-500" /> Stores Meeting Target
            </span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              {storeRows.length} Active Stores
            </span>
          </div>

          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {storeRows.filter((r: any) => (r.target > 0 ? (r.actual / r.target) * 100 : 0) >= 100).length}
              <span className="text-base font-normal text-slate-400 ml-1">/ {storeRows.length}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Achieved 100%+ of monthly target
            </p>
          </div>
        </div>

        {/* Card 4: Quick Action Portal */}
        <Link
          href="/monthly-transactions"
          className="group relative bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl text-white shadow-md hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
              Operations Hub
            </span>
            <ClipboardList className="w-5 h-5 text-blue-200 group-hover:scale-125 group-hover:rotate-6 transition-all duration-300" />
          </div>

          <div className="mt-4">
            <h4 className="text-base font-black text-white">Input Sales & Comm</h4>
            <p className="text-xs text-blue-100/80 mt-0.5 flex items-center gap-1">
              Monthly Transactions <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </Link>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          3. STORE TARGET CARDS WITH INTERACTIVE DRILL-DOWN
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-600" /> Store Target Execution & Run-Rate
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Click any store to instantly filter the dashboard view
            </p>
          </div>

          {storeFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setStoreFilter('ALL')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-xl transition-colors cursor-pointer"
            >
              Reset to All Stores
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {storeRows.map((s: any) => {
            const achv = s.target > 0 ? (s.actual / s.target) * 100 : 0;
            const remaining = Math.max(0, s.target - s.actual);
            const dailyReq = daysRemaining > 0 ? remaining / daysRemaining : 0;
            const isFocused = storeFilter.toLowerCase().includes(s.store.toLowerCase());

            const isMet = achv >= 100;
            const isClose = achv >= 80;

            return (
              <div
                key={s.store}
                onClick={() => setStoreFilter(s.store)}
                className={cn(
                  "group relative p-5 rounded-2xl transition-all duration-300 cursor-pointer border",
                  isFocused
                    ? "bg-white border-blue-400 shadow-xl shadow-blue-500/10 ring-2 ring-blue-400/30 scale-[1.01]"
                    : "bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {s.store}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Target Tracking</p>
                  </div>
                  <span className={cn(
                    "text-xs font-black px-2.5 py-1 rounded-xl border font-mono",
                    isMet ? "bg-blue-50 text-blue-700 border-blue-200" :
                    isClose ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    "bg-rose-50 text-rose-700 border-rose-200"
                  )}>
                    {achv.toFixed(1)}%
                  </span>
                </div>

                {/* Progress Bar with Glowing Tip */}
                <div className="mt-4 space-y-1.5">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        isMet ? "bg-gradient-to-r from-blue-500 to-indigo-600" :
                        isClose ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
                        "bg-gradient-to-r from-amber-400 to-rose-500"
                      )}
                      style={{ width: `${Math.min(100, achv)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-600">
                    <span>Actual: <strong className="text-slate-900"><Amt value={s.actual} /></strong></span>
                    <span className="text-slate-400">Target: <Amt value={s.target} /></span>
                  </div>
                </div>

                {/* Daily Pace Needed */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Run-rate needed:</span>
                  <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                    <Amt value={dailyReq} />/hari
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          4. INTERACTIVE CHART WITH MULTI-VIEW METRIC TOGGLES & ADVISOR RADAR
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Interactive Multi-View Chart (3 cols) */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" /> Daily Execution Chart
              </h3>
              <p className="text-xs text-slate-400">
                {month} {year} · Hover bars to inspect exact metrics
              </p>
            </div>

            {/* Metric Switcher Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setChartMetric('sales')}
                className={cn(
                  "px-3 py-1 font-bold rounded-lg transition-all cursor-pointer",
                  chartMetric === 'sales' ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Sales (IDR)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('qty')}
                className={cn(
                  "px-3 py-1 font-bold rounded-lg transition-all cursor-pointer",
                  chartMetric === 'qty' ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Qty (Pcs)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('pace')}
                className={cn(
                  "px-3 py-1 font-bold rounded-lg transition-all cursor-pointer",
                  chartMetric === 'pace' ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Pace vs Target
              </button>
            </div>
          </div>

          {/* Chart Rendering Container */}
          <div className="h-[300px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dailyChartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                onMouseMove={(e: any) => {
                  if (e?.activeTooltipIndex !== undefined) setHoveredBarIndex(e.activeTooltipIndex);
                }}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="qtyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="areaPaceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  interval={1}
                />
                <YAxis
                  tickFormatter={v => chartMetric === 'qty' ? `${v} pcs` : `${(v / 1_000_000).toFixed(0)}M`}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs space-y-1.5 min-w-[170px]">
                        <p className="font-extrabold text-blue-400">{d.dayLabel} ({month} {year})</p>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Sales:</span>
                          <strong className="font-mono text-white"><Amt value={d.sales} /></strong>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Qty:</span>
                          <strong className="font-mono text-emerald-400">{d.qty} pcs</strong>
                        </div>
                      </div>
                    );
                  }}
                />

                {chartMetric === 'sales' && (
                  <Bar dataKey="sales" fill="url(#salesGrad)" radius={[4, 4, 0, 0]} />
                )}

                {chartMetric === 'qty' && (
                  <Bar dataKey="qty" fill="url(#qtyGrad)" radius={[4, 4, 0, 0]} />
                )}

                {chartMetric === 'pace' && (
                  <>
                    <Area type="monotone" dataKey="cumulative" stroke="#4f46e5" strokeWidth={2} fill="url(#areaPaceGrad)" />
                    <Line type="monotone" dataKey="expectedPace" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Daily Actual Sales</span>
            </span>
          </div>
        </div>

        {/* Right: Advisor Performance Leaderboard — Simple & Clean (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" /> Top Sales Advisors
                </h3>
                <p className="text-xs text-slate-400">Ranked by MTD Net Sales</p>
              </div>
              <Link href="/advisor-performance" className="text-xs font-bold text-blue-600 hover:underline">
                View All →
              </Link>
            </div>

            {/* Simple Clean Ranked List */}
            <div className="divide-y divide-slate-100/80 overflow-y-auto max-h-[310px] custom-scrollbar">
              {filteredAdvisors.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>Tidak ada advisor untuk filter ini</p>
                </div>
              ) : (
                filteredAdvisors.slice(0, 7).map((adv: any, idx: number) => {
                  const salesVal = adv.netSales ?? adv.actual ?? 0;
                  const achv = adv.achievement ?? (adv.target > 0 ? (salesVal / adv.target) * 100 : 0);
                  const locName = adv.location || adv.store || 'Store';
                  const isMet = achv >= 100;

                  return (
                    <div
                      key={adv.id || idx}
                      className="py-2.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                          idx === 0 ? "bg-amber-100 text-amber-800" :
                          idx === 1 ? "bg-slate-200 text-slate-700" :
                          idx === 2 ? "bg-orange-100 text-orange-800" :
                          "bg-slate-50 text-slate-400 text-[11px]"
                        )}>
                          {MEDALS[idx] || idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 truncate">{adv.name}</p>
                          <p className="text-[10px] text-slate-400">{locName}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <p className="text-xs font-extrabold text-slate-900"><Amt value={salesVal} /></p>
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.2 rounded-md",
                          isMet ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100"
                        )}>
                          {achv.toFixed(0)}% Target
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2">
            <Link
              href="/advisor-setup"
              className="block w-full text-center py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
            >
              Manage Targets & Rota →
            </Link>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          5. MODERN LIGHT OPERATIONAL ACTION HUB (NO BLACK)
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
                <Zap className="w-4 h-4" />
              </span>
              Operational Action Hub
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Quick access shortcuts to core operational modules</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { href: '/monthly-transactions', icon: ClipboardList, label: 'Monthly Trans.', sub: 'Input & Edit Sales', color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
            { href: '/daily-report', icon: CalendarIcon, label: 'Daily Report', sub: 'Day-to-day Status', color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
            { href: '/monthly-dps-svc', icon: Layers, label: 'DP & SVC', sub: 'Down Payment & Service', color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
            { href: '/crossing-sales', icon: Repeat, label: 'Crossing Sales', sub: 'Inter-store Transfers', color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
            { href: '/advisor-setup', icon: Users, label: 'Setup Targets', sub: 'Store & Staff Targets', color: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/20' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative p-4 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/70 hover:border-blue-300 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-3 cursor-pointer"
            >
              <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300", item.color, item.shadow)}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                  <span>{item.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}

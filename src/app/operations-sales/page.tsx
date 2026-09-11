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
  const dailyChartData = useMemo(() => {
    if (!overviewData?.dailyTrendData) return [];
    return overviewData.dailyTrendData.map((d: any, i: number) => ({
      day: `${i + 1}`,
      sales: d.net || 0,
      qty: d.qty || 0,
    }));
  }, [overviewData]);

  // Today / latest sales
  const latestDailySales = useMemo(() => {
    if (!dailyChartData.length) return { date: '-', sales: 0, prevSales: 0 };
    const valid = dailyChartData.filter((d: any) => d.sales > 0);
    if (!valid.length) return { date: '-', sales: 0, prevSales: 0 };
    const latest = valid[valid.length - 1];
    const prev = valid.length > 1 ? valid[valid.length - 2] : { sales: 0 };
    return { date: `Tgl ${latest.day}`, sales: latest.sales, prevSales: prev.sales };
  }, [dailyChartData]);

  // Filter advisors for selected store
  const filteredAdvisors = useMemo(() => {
    if (!advisorData.length) return [];
    let list = [...advisorData];
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

  // Helper: circular progress for hero
  const progressPct = Math.min(storeAchievement, 120);
  const R = 54, CX = 64, CY = 64, CIRC = 2 * Math.PI * R;
  const strokeLen = (progressPct / 100) * CIRC;
  const progressColor = storeAchievement >= 100 ? '#3b82f6' : storeAchievement >= 80 ? '#10b981' : '#f59e0b';

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-12">

      {/* ═══════════════ HERO HEADER ═══════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 text-white">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Title & filters */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-black tracking-tight">Operations Sales</h1>
                <p className="text-[11px] text-slate-400 font-medium -mt-0.5">Real-time sales execution & store target tracking</p>
              </div>
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <select aria-label="Filter Store" value={storeFilter} onChange={e => setStoreFilter(e.target.value)}
                  className="bg-transparent font-bold text-white outline-none cursor-pointer [&>option]:text-slate-900">
                  {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
                <select aria-label="Select month" value={month} onChange={e => setMonth(e.target.value)}
                  className="bg-transparent font-bold text-white outline-none cursor-pointer [&>option]:text-slate-900">
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
                  className="bg-transparent font-bold text-white outline-none cursor-pointer border-l border-white/20 pl-2 ml-1 [&>option]:text-slate-900">
                  <option value="2026">2026</option><option value="2025">2025</option><option value="2024">2024</option>
                </select>
              </div>
              <button type="button" onClick={handleSync} disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-all">
                <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                Sync
              </button>
            </div>
          </div>

          {/* Right: Achievement Ring + MTD summary */}
          <div className="flex items-center gap-5">
            {/* SVG Ring */}
            <div className="relative shrink-0">
              <svg width={128} height={128} viewBox="0 0 128 128">
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
                <circle cx={CX} cy={CY} r={R} fill="none" stroke={progressColor} strokeWidth={10}
                  strokeLinecap="round" strokeDasharray={`${strokeLen} ${CIRC}`}
                  transform={`rotate(-90 ${CX} ${CY})`} className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black" style={{ color: progressColor }}>{storeAchievement.toFixed(0)}%</span>
                <span className="text-[9px] text-slate-400 font-medium">Achievement</span>
              </div>
            </div>

            {/* MTD Numbers */}
            <div className="space-y-1.5 min-w-0">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">MTD Net Sales</p>
                <p className="text-xl font-black font-mono tracking-tight"><Amt value={totalStoreActual} /></p>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-slate-500">Target <strong className="text-slate-300 font-mono"><Amt value={totalStoreTarget} /></strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-medium">
                <Clock className="w-3 h-3" />
                <span className="font-mono font-bold"><Amt value={dailyRunRateRequired} /></span>/day · {daysRemaining}d left
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ KPI METRIC STRIP ═══════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Latest Daily Sales */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latest Sales</p>
          <p className="text-lg font-black text-slate-900 font-mono"><Amt value={latestDailySales.sales} /></p>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-slate-400">{latestDailySales.date}</span>
            <span className={cn("font-bold flex items-center ml-auto", latestDailySales.sales >= latestDailySales.prevSales ? "text-emerald-600" : "text-rose-500")}>
              {latestDailySales.sales >= latestDailySales.prevSales ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <Amt value={Math.abs(latestDailySales.sales - latestDailySales.prevSales)} />
            </span>
          </div>
        </div>

        {/* Daily Avg */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Average</p>
          <p className="text-lg font-black text-indigo-900 font-mono"><Amt value={dailyRunRateActual} /></p>
          <p className="text-[10px] text-slate-400">{daysElapsed} days elapsed</p>
        </div>

        {/* Stores On Target */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stores On Target</p>
          <p className="text-lg font-black text-slate-900 font-mono">
            {storeRows.filter((r: any) => (r.target > 0 ? (r.actual / r.target) * 100 : 0) >= 100).length}
            <span className="text-slate-400 font-medium text-sm"> / {storeRows.length}</span>
          </p>
          <p className="text-[10px] text-slate-400">{daysElapsed} / {totalDaysInMonth} days</p>
        </div>

        {/* Quick CTA */}
        <Link href="/monthly-transactions"
          className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl p-4 flex flex-col justify-between hover:from-blue-700 hover:to-indigo-700 transition-all group">
          <ClipboardList className="w-5 h-5 text-blue-200 group-hover:scale-110 transition-transform" />
          <div className="mt-2">
            <p className="text-xs font-bold">Input Transactions</p>
            <p className="text-[10px] text-blue-200/80">Monthly Trans. →</p>
          </div>
        </Link>
      </div>

      {/* ═══════════════ STORE TARGET CARDS ═══════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {storeRows.map((s: any) => {
          const achv = s.target > 0 ? (s.actual / s.target) * 100 : 0;
          const remaining = Math.max(0, s.target - s.actual);
          const dailyReq = daysRemaining > 0 ? remaining / daysRemaining : 0;
          const barColor = achv >= 100 ? 'bg-blue-500' : achv >= 80 ? 'bg-emerald-500' : 'bg-amber-500';
          const badgeColor = achv >= 100 ? 'text-blue-700 bg-blue-50' : achv >= 80 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50';

          return (
            <div key={s.store} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-900">{s.store}</h4>
                <span className={cn("text-[11px] font-black px-2 py-0.5 rounded-lg", badgeColor)}>
                  {achv.toFixed(1)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-700", barColor)}
                    style={{ width: `${Math.min(100, achv)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span><Amt value={s.actual} /></span>
                  <span className="text-slate-400"><Amt value={s.target} /></span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-50">
                <span className="text-slate-400">Run-rate needed</span>
                <span className="font-mono font-bold text-amber-600"><Amt value={dailyReq} />/d</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════ CHART + ADVISOR ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Daily Chart — 3 cols */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Daily Trend
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">{month} {year}</span>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 8, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  interval={1} />
                <YAxis tickFormatter={v => (v / 1_000_000).toFixed(0) + 'M'}
                  tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val: any) => [new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val), 'Sales']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', fontSize: '11px' }}
                />
                <Bar dataKey="sales" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Advisor Leaderboard — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between p-5 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Top Advisors
            </h3>
            <Link href="/advisor-performance" className="text-[10px] font-bold text-blue-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="flex-1 px-5 pb-3 space-y-1.5 overflow-y-auto custom-scrollbar max-h-[280px]">
            {filteredAdvisors.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">No advisor data for this filter</p>
            ) : (
              filteredAdvisors.slice(0, 8).map((adv: any, idx: number) => {
                const salesVal = adv.netSales ?? adv.actual ?? 0;
                const achv = adv.achievement ?? (adv.target > 0 ? (salesVal / adv.target) * 100 : 0);
                const locName = adv.location || adv.store || 'Store';
                return (
                  <div key={adv.id || idx} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <span className="text-xs font-bold text-slate-400 w-5 text-center shrink-0">
                      {MEDALS[idx] || `${idx + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{adv.name}</p>
                      <p className="text-[9px] text-slate-400">{locName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-black text-slate-900 font-mono"><Amt value={salesVal} /></p>
                      <p className={cn("text-[9px] font-bold", achv >= 100 ? "text-emerald-600" : "text-slate-400")}>
                        {achv.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 pt-0">
            <Link href="/advisor-setup"
              className="block w-full text-center py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-bold transition-colors">
              Manage Targets & Rota
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════════ QUICK ACTIONS DOCK ═══════════════ */}
      <div className="flex flex-wrap items-center justify-center gap-2 py-2">
        {[
          { href: '/monthly-transactions', icon: ClipboardList, label: 'Monthly Trans.', color: 'text-blue-500' },
          { href: '/daily-report', icon: CalendarIcon, label: 'Daily Report', color: 'text-emerald-500' },
          { href: '/monthly-dps-svc', icon: Layers, label: 'DP & SVC', color: 'text-violet-500' },
          { href: '/crossing-sales', icon: Repeat, label: 'Crossing Sales', color: 'text-amber-500' },
          { href: '/advisor-setup', icon: Users, label: 'Setup Targets', color: 'text-rose-500' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-full hover:border-slate-300 hover:shadow-sm transition-all group text-xs font-bold text-slate-700">
            <item.icon className={cn("w-4 h-4 group-hover:scale-110 transition-transform", item.color)} />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}


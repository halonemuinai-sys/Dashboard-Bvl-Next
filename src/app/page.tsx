'use client';

import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, LayoutDashboard, Store, CalendarDays, AlertCircle, Clock3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getMonthlyOverview } from '@/services/dashboard/overviewService';
import { getAdvisorPerformance } from '@/services/dashboard/advisorService';
import type { MonthlyOverviewData, AdvisorRecord } from '@/services/dashboard/types';
import { createRequestCache } from '@/lib/request-cache';
import { businessDate } from '@/lib/sales-chart-data';
import dynamic from 'next/dynamic';


import StorePerformanceTable from '@/components/StorePerformanceTable';
import CrossingSalesWidget from '@/components/CrossingSalesWidget';
import TopAdvisorsWidget from '@/components/TopAdvisorsWidget';
import MonthYearPicker, { type MonthPeriod } from '@/components/MonthYearPicker';
import { useUserAccess } from '@/lib/user-access-context';
import MonthlyMetrics from './MonthlyMetrics';
import styles from './MonthlyOverview.module.css';

function ChartPlaceholder() { return <div role="status" aria-label="Loading chart" className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white motion-reduce:animate-none" />; }
const MultiYearChart = dynamic(() => import('@/components/MultiYearChart'), { loading: ChartPlaceholder });
const DailySalesChart = dynamic(() => import('@/components/DailySalesChart'), { loading: ChartPlaceholder });

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
interface OverviewSnapshot {
  period: string;
  request: string;
  data: MonthlyOverviewData | null;
  error: string;
  updatedAt: number | null;
}

export default function MonthlyOverviewPage() {
  const { role, userEmail, assignedStore, loading: accessLoading } = useUserAccess();
  const scope = [userEmail, role, assignedStore].join(':');
  const scopedCache = useMemo(() => ({ scope, cache: createRequestCache() }), [scope]);
  const cache = scopedCache.cache;
  const router = useRouter();
  const [period, setPeriod] = useState<MonthPeriod>(() => { const [year, month] = businessDate().split('-').map(Number); return { month: month - 1, year }; });
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<OverviewSnapshot | null>(null);
  const month = MONTHS[period.month];
  const year = String(period.year);
  const periodKey = scope + ':' + year + '-' + period.month;
  const requestKey = periodKey + ':' + revision;
  const landing = role === 'operations_sales' || role === 'finance' ? '/operations-sales' : role === 'merchandise' ? '/packaging' : '';
  const redirecting = Boolean(landing);
  const loading = snapshot?.request !== requestKey;
  const data = snapshot?.period === periodKey ? snapshot.data : null;
  const error = snapshot?.request === requestKey ? snapshot.error : '';
  const refresh = () => { cache.clear(); setRevision(value => value + 1); };
  const [advisorSnapshot, setAdvisorSnapshot] = useState<{ request: string; advisors: AdvisorRecord[]; error: string } | null>(null);
  const [advisorRetry, setAdvisorRetry] = useState(0);
  const advisorRequest = requestKey + ':' + advisorRetry;
  const advisorsLoading = advisorSnapshot?.request !== advisorRequest;

  useEffect(() => {
    if (landing) router.replace(landing);
  }, [landing, router]);

  useEffect(() => {
    if (redirecting || accessLoading || !role) return;
    let cancelled = false;
    getMonthlyOverview(month, period.year, cache).then(overview => {
      if (!cancelled) setSnapshot({ period: periodKey, request: requestKey, data: overview, error: '', updatedAt: Date.now() });
    }).catch(() => {
      if (!cancelled) setSnapshot(previous => ({
        period: periodKey, request: requestKey,
        data: previous?.period === periodKey ? previous.data : null,
        updatedAt: previous?.period === periodKey ? previous.updatedAt : null,
        error: 'Unable to load the overview. Please refresh to try again.',
      }));
    });
    return () => { cancelled = true; };
  }, [month, period.year, periodKey, requestKey, redirecting, accessLoading, role, cache]);

  // Advisor requests must not block KPIs or turn a partial failure into a blank report.
  useEffect(() => {
    if (redirecting || accessLoading || !role) return;
    let cancelled = false;
    cache.read('advisor-results:' + businessDate() + ':' + periodKey, () => getAdvisorPerformance(month, period.year)).then(result => {
      if (!cancelled) setAdvisorSnapshot({ request: advisorRequest, advisors: result.advisors, error: '' });
    }).catch(() => {
      if (!cancelled) setAdvisorSnapshot({ request: advisorRequest, advisors: [], error: 'Advisor results could not be loaded.' });
    });
    return () => { cancelled = true; };
  }, [month, period.year, periodKey, advisorRequest, redirecting, accessLoading, role, cache]);

  const activeStores = useMemo(() =>
    data?.storeData.filter(store => !store.store.toLowerCase().includes('head office')).sort((a, b) => b.actual - a.actual) || []
  , [data]);
  const storeNetExcHO = useMemo(() => activeStores.reduce((total, store) => total + store.actual, 0), [activeStores]);
  const crossingSummary = useMemo(() => {
    if (!data?.crossingData) return null;
    const { records, totalNet, totalQty, storeStats } = data.crossingData;
    const storeRows = Object.entries(storeStats).map(([store, stats]) => {
      const target = data.storeData.find(row => row.store === store)?.target || 0;
      return { store, adjusted: stats.adjusted, physical: stats.physical, target, achievement: target > 0 ? stats.adjusted / target * 100 : 0 };
    }).filter(row => row.adjusted > 0 || row.target > 0);
    return { records: records.slice(0, 5), totalNet, totalQty, storeRows };
  }, [data]);

  if (redirecting) return null;

  return (
    <div className={cn(styles.root, 'space-y-6 pb-8')}>
      <header className={cn(styles.reveal, 'rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40')}>
        <div className="flex flex-col justify-between gap-5 p-5 sm:p-6 xl:flex-row xl:items-center">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600"><LayoutDashboard size={23} strokeWidth={1.7} /></span>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Business performance</p>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Monthly Overview</h1>
              <p className="mt-1 text-xs leading-5 text-slate-500">A clear view of sales, boutique performance and advisor results.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MonthYearPicker value={period} onChange={setPeriod} />
            <button type="button" disabled={loading} onClick={refresh} title="Reload dashboard data" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-wait disabled:opacity-50">
              <RefreshCw size={16} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />{loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 text-[11px] sm:px-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-600"><CalendarDays size={14} className="text-blue-500" />{month} {year}</span>
            <span className="inline-flex items-center gap-1.5 text-slate-500"><Store size={14} />{data ? activeStores.length + ' boutiques in report' : 'Boutique performance'}</span>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold tracking-wider text-slate-500">AMOUNTS IN IDR</span>
          </div>
          <span role="status" className="inline-flex items-center gap-1.5 text-slate-400"><Clock3 size={13} />{loading ? 'Updating report...' : error ? 'Refresh required' : snapshot?.updatedAt ? 'Refreshed ' + new Date(snapshot.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Ready'}</span>
        </div>
      </header>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"><span className="flex items-center gap-2"><AlertCircle size={17} />{error}{data && ' Showing the last loaded data.'}</span><button type="button" onClick={refresh} className="rounded-lg bg-white px-3 py-2 font-semibold ring-1 ring-rose-200">Retry</button></div>}

      {!data && loading && <div aria-label="Loading monthly overview" role="status" className="space-y-4"><span className="sr-only">Loading monthly overview</span><div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 motion-reduce:animate-none"><div className="h-3 w-24 rounded bg-slate-100" /><div className="mt-5 h-7 w-32 rounded bg-slate-100" /><div className="mt-5 h-2 w-full rounded bg-slate-50" /></div>)}</div></div>}

      {data && <div key={periodKey} aria-busy={loading} className={cn('space-y-6 transition-opacity', loading && 'opacity-60')}>
        <MonthlyMetrics data={data} storeNetExcHO={storeNetExcHO} year={year} />
        <div className={cn(styles.reveal, 'space-y-4')} style={{ animationDelay: '160ms' }}>
          <div><h2 className="text-sm font-semibold tracking-tight text-slate-800">Boutiques & people</h2><p className="mt-0.5 text-[11px] text-slate-500">Store results, advisor performance and crossing sales.</p></div>
          <div className="grid gap-5 xl:grid-cols-3">
            <div className="min-w-0 space-y-5 xl:col-span-2">
              <StorePerformanceTable stores={activeStores} month={month} year={year} />
              {advisorsLoading ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500"><RefreshCw size={16} className="mr-2 inline animate-spin motion-reduce:animate-none" />Loading advisor results...</div> : advisorSnapshot?.error ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-800">{advisorSnapshot.error}<button className="ml-3 rounded-lg bg-white px-3 py-2 font-semibold" onClick={() => setAdvisorRetry(value => value + 1)}>Retry advisors</button></div> : <TopAdvisorsWidget advisors={advisorSnapshot?.advisors || []} />}
            </div>
            {crossingSummary && <div className="min-w-0"><CrossingSalesWidget summary={crossingSummary} /></div>}
          </div>
        </div>
        <div className={cn(styles.reveal, 'space-y-4')} style={{ animationDelay: '240ms' }}>
          <div><h2 className="text-sm font-semibold tracking-tight text-slate-800">Sales trends</h2><p className="mt-0.5 text-[11px] text-slate-500">Compare annual performance and explore the daily sales pattern.</p></div>
          <MultiYearChart multiYearStats={data.multiYearStats} multiYearTargets={data.multiYearTargets} selectedYear={Number(year)} asOfDate={data.asOfDate} currentMonth={period.month} />
          <DailySalesChart dailyData={data.dailyTrendData} asOfDate={data.asOfDate} month={month} year={period.year} />
        </div>
      </div>}
      <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-4 text-[10px] text-slate-400"><span>BVLGARI Intelligence / Monthly Overview</span><span>Aris Setiyono</span></footer>
    </div>
  );
}

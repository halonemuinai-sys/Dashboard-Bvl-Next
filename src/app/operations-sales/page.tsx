'use client';

import { useEffect, useId, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, ArrowUpRight, ArrowDownRight, Minus, Building2, CalendarDays, Check, ChevronRight, CircleAlert, ClipboardList, Clock3, EyeOff, Layers, RefreshCw, Repeat2, Store, Target, TrendingUp, Trophy, Users } from 'lucide-react';
import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Amt from '@/components/Amt';
import MonthYearPicker, { type MonthPeriod } from '@/components/MonthYearPicker';
import { dashboardService, type AdvisorRecord, type MonthlyOverviewData } from '@/services/dashboardService';
import { useUserAccess } from '@/lib/user-access-context';
import { useHideAmounts } from '@/lib/hide-amounts';
import { useChartMotion } from '@/lib/use-chart-motion';
import { buildDailySalesSeries, businessDate, formatSalesAxis } from '@/lib/sales-chart-data';
import { normalizeReportStore } from '@/lib/report-attribution';
import { cn } from '@/lib/utils';
import styles from './operations.module.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STORES = ['ALL', 'Plaza Indonesia', 'Plaza Senayan', 'Bali'];
const shortcuts = [
  { href: '/monthly-transactions', icon: ClipboardList, label: 'Sales transactions', sub: 'Sales & commission', color: 'blue' },
  { href: '/daily-report', icon: CalendarDays, label: 'Daily report', sub: 'Review store activity', color: 'teal' },
  { href: '/invoice-management', icon: Layers, label: 'Invoice management', sub: 'Invoices & payments', color: 'violet' },
  { href: '/crossing-sales', icon: Repeat2, label: 'Crossing sales', sub: 'Sales across boutiques', color: 'blue' },
  { href: '/advisor-setup', icon: Users, label: 'Advisor setup', sub: 'Targets & rotations', color: 'teal' },
];
const bounded = (value: number) => Math.max(0, Math.min(100, value));
const targetStatus = (actual: number, target: number) => {
  if (target <= 0) return { tone: styles.toneNeutral, label: 'No target set' };
  const percentage = actual / target * 100;
  if (percentage >= 100) return { tone: styles.toneMet, label: 'Target achieved' };
  if (percentage >= 80) return { tone: styles.toneClose, label: '80-99% achieved' };
  if (percentage >= 50) return { tone: styles.toneBuilding, label: '50-79% achieved' };
  return { tone: styles.toneLow, label: 'Below 50% of target' };
};
const delay = (index: number): CSSProperties => ({ animationDelay: `${index * 65}ms` });

export default function OperationsSalesPage() {
  const { assignedStore } = useUserAccess();
  const { hidden } = useHideAmounts();
  const animate = useChartMotion();
  const chartId = useId().replace(/:/g, '');
  const [period, setPeriod] = useState<MonthPeriod>(() => {
    const [year, month] = businessDate().split('-').map(Number);
    return { year, month: month - 1 };
  });
  const [storeChoice, setStoreChoice] = useState<string | null>(null);
  const assigned = normalizeReportStore(assignedStore || 'ALL');
  const storeFilter = storeChoice ?? (STORES.includes(assigned) ? assigned : 'ALL');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<{ overview: MonthlyOverviewData; advisors: AdvisorRecord[] } | null>(null);
  const [metric, setMetric] = useState<'sales' | 'qty' | 'pace'>('sales');
  const month = MONTHS[period.month];
  const changePeriod = (next: MonthPeriod) => {
    if (next.month === period.month && next.year === period.year) return;
    setLoading(true);
    setError('');
    setPeriod(next);
  };
  const refresh = () => {
    setLoading(true);
    setError('');
    setRevision(value => value + 1);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      dashboardService.getMonthlyOverview(MONTHS[period.month], period.year),
      dashboardService.getAdvisorPerformance(MONTHS[period.month], period.year),
    ]).then(([overview, advisors]) => {
      if (active) setSnapshot({ overview, advisors: advisors.advisors });
    }).catch(() => {
      if (active) setError('We could not load this reporting period. Please try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period.month, period.year, revision]);

  const data = snapshot?.overview;
  const today = data?.asOfDate || businessDate();
  const periodKey = `${period.year}-${String(period.month + 1).padStart(2, '0')}`;
  const totalDays = new Date(Date.UTC(period.year, period.month + 1, 0)).getUTCDate();
  const future = periodKey > today.slice(0, 7);
  const elapsed = future ? 0 : periodKey === today.slice(0, 7) ? Number(today.slice(8, 10)) : totalDays;
  const remaining = totalDays - elapsed;
  const allStores = (data?.storeData || []).filter(row => STORES.slice(1).includes(normalizeReportStore(row.store))).sort((a, b) => b.actual - a.actual);
  const stores = allStores.filter(row => storeFilter === 'ALL' || normalizeReportStore(row.store) === storeFilter);
  const actual = stores.reduce((sum, row) => sum + row.actual, 0);
  const target = stores.reduce((sum, row) => sum + row.target, 0);
  const achievement = target > 0 ? actual / target * 100 : 0;
  const gap = Math.max(0, target - actual);
  const dailyRequired = remaining > 0 ? gap / remaining : 0;
  const average = elapsed > 0 ? actual / elapsed : 0;
  const advisors = (snapshot?.advisors || []).filter(row => storeFilter === 'ALL' || normalizeReportStore(row.location) === storeFilter).sort((a, b) => b.netSales - a.netSales);
  // Overview daily totals include Head Office and are not split by store. Keep this scope explicit.
  const points = buildDailySalesSeries(data?.dailyTrendData || [], period.year, period.month, today).map(point => ({ ...point, expected: (data?.storeData || []).reduce((sum, row) => sum + row.target, 0) / totalDays * point.day }));
  const latest = points.filter(point => point.net !== null && (point.net !== 0 || point.qty !== 0)).at(-1);
  const previousDay = latest && latest.day > 1 ? points[latest.day - 2] : undefined;
  const dailyChange = latest && previousDay?.net != null ? latest.net! - previousDay.net : null;
  const salesStatus = targetStatus(actual, target);
  const meeting = stores.filter(row => row.target > 0 && row.actual >= row.target).length;
  const hasDaily = points.some(point => point.net !== null && (point.net !== 0 || point.qty !== 0));

  return <div className={styles.page}>
    <header className={cn(styles.header, styles.reveal)}>
      <div className={styles.titleRow}>
        <span className={styles.brandIcon}><Building2 size={23} /></span>
        <div><p className={styles.eyebrow}>BVLGARI / RETAIL OPERATIONS</p><h1>Operations Sales Dashboard</h1><p className={styles.subtitle}>Store execution, daily momentum and the people behind every sale.</p></div>
      </div>
      <div className={styles.controls}>
        <MonthYearPicker value={period} onChange={changePeriod} />
        <button className={styles.refresh} aria-label="Refresh dashboard" title="Refresh dashboard" disabled={loading} onClick={refresh}><RefreshCw size={16} className={loading ? styles.spin : ''} /><span>{loading ? 'Refreshing...' : 'Refresh data'}</span></button>
      </div>
      {!loading && !error && data && <>
      <section key={`${periodKey}-${storeFilter}-${revision}`} className={cn(styles.summaryGrid, styles.reveal, salesStatus.tone)} aria-label="Sales summary">
        <div className={styles.hero}>
          <div className={styles.heroTop}><span className={styles.heroTag}><Store size={13} />{storeFilter === 'ALL' ? 'All boutiques' : storeFilter}</span><span className={styles.heroPeriod}>{future ? 'Upcoming period' : remaining ? 'Month in progress' : 'Completed period'}</span></div>
          <div className={styles.heroMain}>
            <div><p className={styles.heroLabel}>Monthly net sales</p><div className={styles.heroAmount}><Amt value={actual} compact /></div><p className={styles.heroCaption}><span className={styles.signalDot} />{salesStatus.label}</p></div>
            <div className={styles.ring}>
              <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="51" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="7" /><circle className={styles.ringStroke} cx="60" cy="60" r="51" fill="none" stroke="var(--status-bright)" strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray={`${bounded(achievement)} 100`} transform="rotate(-90 60 60)" /></svg>
              <div><strong>{target > 0 ? `${achievement.toFixed(1)}%` : '—'}</strong><span>{target > 0 ? 'of target' : 'No target'}</span></div>
            </div>
          </div>
          <div className={styles.heroBottom}><div><span>Monthly target</span><strong><Amt value={target} compact /></strong></div><div><span>Remaining to target</span><strong><Amt value={gap} compact /></strong></div><Link href="/invoice-management" className={styles.heroLink}>View invoices <ArrowUpRight size={17} /></Link></div>
        </div>
        <div className={styles.paceCard}>
          <div className={styles.sectionHead}><span className={cn(styles.icon, styles.teal)}><Activity size={19} /></span><span className={styles.smallTag}>{elapsed} / {totalDays} days</span></div>
          <h2>Required daily run-rate</h2><p className={styles.muted}>{future ? 'Daily pace needed when this period begins.' : remaining ? 'Daily sales needed over the remaining days.' : 'This period has ended. Review the final result below.'}</p>
          <div className={styles.paceAmount}>{target <= 0 ? 'No target set' : remaining ? <Amt value={dailyRequired} compact /> : achievement >= 100 ? 'Target achieved' : 'Period complete'}{remaining > 0 && target > 0 && <span>/ day</span>}</div>
          <div className={styles.track} aria-label={`${elapsed} of ${totalDays} calendar days elapsed`}><div className={styles.fill} style={{ width: `${elapsed / totalDays * 100}%` }} /></div>
          <div className={styles.paceFoot}><span><Clock3 size={13} />{remaining} days remaining</span><span>{Math.round(elapsed / totalDays * 100)}% of month</span></div>
        </div>
      </section>
      </>}
      <div className={styles.filterBar}>
        <div className={styles.storeTabs} role="group" aria-label="Filter stores">{STORES.map(store => <button key={store} aria-pressed={storeFilter === store} onClick={() => setStoreChoice(store)} className={storeFilter === store ? styles.selectedTab : ''}>{store === 'ALL' ? <Building2 size={14} /> : <Store size={14} />}{store === 'ALL' ? 'All boutiques' : store}</button>)}</div>
        <span className={styles.periodLabel}><CalendarDays size={14} />{month} {period.year}<span className={styles.dot} />Amounts in IDR</span>
      </div>
    </header>

    {error ? <div className={styles.error} role="alert"><CircleAlert size={22} /><div><h2>Dashboard unavailable</h2><p>{error}</p></div><button className={styles.textButton} onClick={refresh}>Try again <RefreshCw size={14} /></button></div> : loading || !data ? <div className={styles.skeletonGrid} role="status" aria-label="Loading operations dashboard"><span className="sr-only">Loading dashboard…</span>{Array.from({ length: 6 }, (_, i) => <div key={i} className={styles.skeleton} />)}</div> : <div key={`${periodKey}-${revision}`} className={styles.content}>

      <section key={storeFilter} className={styles.metrics} aria-label="Operational metrics">
        <article className={cn(styles.metric, styles.metricBlue, styles.reveal)} style={delay(1)}>
          <div><p>Latest recorded sales</p><strong><Amt value={latest?.net || 0} compact /></strong>
            <div className={cn(styles.delta, dailyChange === null || dailyChange === 0 ? styles.deltaNeutral : dailyChange > 0 ? styles.deltaUp : styles.deltaDown)}>
              {dailyChange === null ? <span>No prior day in this period</span> : <>{dailyChange > 0 ? <ArrowUpRight size={14} /> : dailyChange < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}<Amt value={Math.abs(dailyChange)} compact /><span>vs {previousDay!.day} {month.slice(0, 3)}</span></>}
            </div>
            <span>{latest ? `${latest.day} ${month.slice(0, 3)}` : 'No transactions'} / all locations, including HO</span>
          </div><span className={cn(styles.icon, styles.blue)}><CalendarDays size={18} /></span>
        </article>
        <article className={cn(styles.metric, styles.metricTeal, styles.reveal)} style={delay(2)}><div><p>Daily average</p><strong><Amt value={average} compact /></strong><span className={styles.metricBadge}>{elapsed} days elapsed</span><span>Selected boutiques / per calendar day</span></div><span className={cn(styles.icon, styles.teal)}><TrendingUp size={18} /></span></article>
        <article className={cn(styles.metric, styles.metricViolet, styles.reveal)} style={delay(3)}><div><p>Stores meeting target</p><strong>{meeting}<small> / {stores.length}</small></strong><span className={styles.metricBadge}>{stores.length ? Math.round(meeting / stores.length * 100) : 0}% of selected stores</span><span>Achieved 100%+ of monthly target</span></div><span className={cn(styles.icon, styles.violet)}><Target size={18} /></span></article>
        <Link href="/monthly-transactions" className={cn(styles.metric, styles.quickMetric, styles.reveal)} style={delay(4)}><span className={cn(styles.icon, styles.blue)}><ClipboardList size={19} /></span><p>OPERATIONS HUB</p><h2>Sales & commission</h2><span>Open transactions <ArrowRight size={15} /></span></Link>
      </section>

      <section className={cn(styles.reveal, styles.storeSection)} style={delay(4)}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>BOUTIQUE PERFORMANCE</p><h2>Every store, in focus</h2></div><span className={styles.muted}>Select a boutique to focus its KPIs and advisors</span></div>
        <div className={styles.storeGrid}>{allStores.length === 0 ? <p className={styles.empty}>No store sales or targets for this period.</p> : allStores.map(store => {
          const percentage = store.target > 0 ? store.actual / store.target * 100 : 0;
          const met = store.target > 0 && percentage >= 100;
          const status = targetStatus(store.actual, store.target);
          const focused = storeFilter === normalizeReportStore(store.store);
          return <button key={store.store} aria-pressed={focused} onClick={() => setStoreChoice(focused ? 'ALL' : normalizeReportStore(store.store))} className={cn(styles.storeCard, status.tone, focused && styles.focusedStore)}>
            <div className={styles.sectionHead}><span className={cn(styles.icon, styles.storeIcon)}><Store size={18} /></span><span className={styles.status} title={status.label}>{met && <Check size={12} />}{store.target > 0 ? `${percentage.toFixed(1)}% achieved` : 'No target set'}</span></div>
            <h3>{store.store}<ArrowUpRight size={16} /></h3><strong className={styles.storeAmount}><Amt value={store.actual} compact /></strong>
            <div className={styles.track}><div className={styles.fill} style={{ width: `${bounded(percentage)}%`, background: 'linear-gradient(90deg, var(--status-color), var(--status-bright))' }} /></div>
            <div className={styles.storeFoot}><span>Target <b><Amt value={store.target} compact /></b></span><span>{store.qty.toLocaleString('en-US')} units</span></div>
            <div className={styles.storeRequired}><span>{remaining ? 'Required per day' : 'Remaining to target'}</span><b><Amt value={Math.max(0, store.target - store.actual) / (remaining || 1)} compact /></b></div>
          </button>;
        })}</div>
      </section>

      <div className={cn(styles.detailGrid, styles.reveal)} style={delay(5)}>
        <section className={styles.panel} aria-label="Daily sales chart">
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>SALES MOMENTUM</p><h2>Daily performance</h2></div><span className={cn(styles.icon, styles.teal)}><TrendingUp size={19} /></span></div>
          <p className={styles.muted}>All locations, including Head Office · {month} {period.year}</p>
          <div className={styles.chartToolbar}><div className={styles.segmented} role="group" aria-label="Chart metric">{(['sales', 'qty', 'pace'] as const).map(value => <button key={value} aria-pressed={metric === value} className={metric === value ? styles.activeMetric : ''} onClick={() => setMetric(value)}>{value === 'sales' ? 'Net sales' : value === 'qty' ? 'Units sold' : 'Target pace'}</button>)}</div><span className={styles.muted}>{metric === 'qty' ? 'Units' : 'IDR'}</span></div>
          {hidden && metric !== 'qty' ? <div className={styles.chartEmpty}><EyeOff size={24} /><p>Amounts are hidden</p></div> : !hasDaily ? <div className={styles.chartEmpty}><Activity size={28} /><p>No sales recorded for this period</p></div> : <div key={metric} className={cn(styles.chart, styles.chartReveal)}>
            <ResponsiveContainer width="100%" height="100%"><ComposedChart data={points} margin={{ top: 14, right: 10, left: 0, bottom: 4 }}>
              <defs><linearGradient id={`${chartId}-bars`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf" /><stop offset="100%" stopColor="#0d9488" /></linearGradient><linearGradient id={`${chartId}-area`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#14b8a6" stopOpacity={0.25} /><stop offset="100%" stopColor="#14b8a6" stopOpacity={0.01} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="day" axisLine={false} tickLine={false} minTickGap={14} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={8} /><YAxis width={58} axisLine={false} tickLine={false} tickFormatter={metric === 'qty' ? value => String(value) : formatSalesAxis} allowDecimals={metric !== 'qty'} tick={{ fontSize: 10, fill: '#94a3b8' }} /><ReferenceLine y={0} stroke="#cbd5e1" />
              <Tooltip cursor={{ fill: '#f0fdfa', fillOpacity: 0.6 }} content={({ active, payload }) => {
                const point = payload?.[0]?.payload as (typeof points)[number] | undefined;
                if (!active || !point) return null;
                return <div className={styles.tooltip}><strong>{point.day} {month} {period.year}</strong>{metric === 'qty' ? <p>Units sold <b>{point.qty ?? '—'}</b></p> : metric === 'pace' ? <><p>Cumulative <b>{point.cumulative === null ? '—' : <Amt value={point.cumulative} />}</b></p><p>Target pace <b><Amt value={point.expected} /></b></p></> : <p>Net sales <b>{point.net === null ? '—' : <Amt value={point.net} />}</b></p>}</div>;
              }} />
              {metric === 'pace' ? <><Area type="monotone" dataKey="cumulative" stroke="#0d9488" strokeWidth={3} fill={`url(#${chartId}-area)`} isAnimationActive={animate} animationDuration={650} /><Line dataKey="expected" stroke="#818cf8" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={animate} animationDuration={650} /></> : <Bar dataKey={metric === 'sales' ? 'net' : 'qty'} fill={`url(#${chartId}-bars)`} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={animate} animationDuration={650} />}
            </ComposedChart></ResponsiveContainer>
          </div>}
          <div className={styles.legend}><span><i />{metric === 'pace' ? 'Cumulative actual' : metric === 'qty' ? 'Units sold' : 'Daily net sales'}</span>{metric === 'pace' && <span><i className={styles.targetLegend} />Monthly target pace</span>}<span className={styles.chartScope}>Independent of boutique filter</span></div>
        </section>
        <section className={cn(styles.panel, styles.advisorPanel)}>
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>TEAM SPOTLIGHT</p><h2>Top sales advisors</h2></div><span className={cn(styles.icon, styles.violet)}><Trophy size={19} /></span></div>
          <p className={styles.muted}>{storeFilter === 'ALL' ? 'All boutiques' : storeFilter} · ranked by monthly net sales</p>
          <div className={styles.advisorList}>{advisors.length === 0 ? <p className={styles.empty}>No advisors available for this selection.</p> : advisors.slice(0, 7).map((advisor, index) => <div key={advisor.name} className={styles.advisor}>
            <span className={styles.rank}>{String(index + 1).padStart(2, '0')}</span><span className={cn(styles.avatar, index === 0 && styles.firstAvatar)}>{advisor.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</span><div className={styles.advisorName}><strong title={advisor.name}>{advisor.name}</strong><span>{advisor.location}</span></div><div className={styles.advisorSales}><strong><Amt value={advisor.netSales} compact /></strong><span className={advisor.achievement >= 100 ? styles.achievedText : ''}>{advisor.target > 0 ? `${advisor.achievement.toFixed(0)}% of target` : 'No target'}</span></div>
          </div>)}</div>
          <Link href="/advisor-performance" className={styles.advisorLink}>Explore advisor performance <ArrowRight size={16} /></Link>
        </section>
      </div>

      <section className={cn(styles.reveal, styles.actions)} style={delay(6)}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>YOUR WORKSPACE</p><h2>Keep operations moving</h2></div><span className={styles.muted}>Everything you need, one click away</span></div>
        <div className={styles.actionGrid}>{shortcuts.map(({ href, icon: Icon, label, sub, color }) => <Link href={href} key={href} className={styles.action}><span className={cn(styles.icon, styles[color])}><Icon size={20} /></span><div><strong>{label}</strong><span>{sub}</span></div><ChevronRight size={16} /></Link>)}</div>
      </section>
    </div>}
    <footer className={styles.footer}><span>BVLGARI · Retail Intelligence</span><span>Designed & developed by <strong>Aris Setiyono</strong></span></footer>
  </div>;
}

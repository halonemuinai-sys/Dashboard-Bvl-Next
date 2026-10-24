'use client';

import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Download, RefreshCw, Search, Star, TrendingUp, UserCheck, UserPlus, X } from 'lucide-react';
import Amt from '@/components/Amt';
import CustomerModal from '@/components/CustomerModal';
import { useHideAmounts } from '@/lib/hide-amounts';
import { cn } from '@/lib/utils';
import { customerService, SEGMENT_ORDER, type Segment, type CustomerProfile } from '@/services/customerService';
import styles from './customer-segment.module.css';

type Overview = Awaited<ReturnType<typeof customerService.getSegmentationOverview>>;
const PAGE_SIZE = 25;
const percentage = (value: number) => `${value.toFixed(1)}%`;
const shortAmount = (value: number) => value >= 1_000_000_000 ? `${(value / 1_000_000_000).toFixed(1)}B` : value >= 1_000_000 ? `${(value / 1_000_000).toFixed(0)}M` : value.toLocaleString('en-US');

function csvCell(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const text = String(value ?? '');
  const safe = /^\s*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function SegmentBadge({ segment }: { segment: Segment }) {
  return <span className={cn(styles.segmentBadge, styles[`tone${segment.replace(/\s/g, '')}`])}>{segment}</span>;
}

export default function CustomerSegmentPage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<Overview | null>(null);
  const [segments, setSegments] = useState<Set<Segment>>(new Set());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CustomerProfile | null>(null);
  const { hidden } = useHideAmounts();

  useEffect(() => {
    let active = true;
    customerService.getSegmentationOverview(year).then(result => {
      if (!active) return;
      setData(result);
      setLoading(false);
      setError('');
    }).catch(() => {
      if (!active) return;
      setLoading(false);
      setError('Customer intelligence could not be loaded. Please try again.');
    });
    return () => { active = false; };
  }, [year, revision]);

  const refresh = () => { setError(''); setLoading(true); setRevision(value => value + 1); };
  const switchYear = (value: number) => { setYear(value); setLoading(true); setError(''); setPage(1); setSegments(new Set()); setSearch(''); setSelected(null); };
  const toggleSegment = (segment: Segment) => {
    setSegments(previous => {
      const next = new Set(previous);
      if (next.has(segment)) next.delete(segment); else next.add(segment);
      return next;
    });
    setPage(1);
  };
  const filtered = useMemo(() => (data?.customers || []).filter(customer =>
    (!segments.size || segments.has(customer.segment)) && (!search.trim() || customer.name.toLowerCase().includes(search.trim().toLowerCase()))
  ), [data, segments, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const exportCsv = () => {
    const header = ['Customer','Segment','Invoices','Items','Days since last purchase','Lifetime value'];
    const body = filtered.map(customer => [customer.name, customer.segment, customer.freqInvoice, customer.freqQty, customer.recencyDays, customer.ltv].map(csvCell).join(','));
    const url = URL.createObjectURL(new Blob(['\uFEFF', header.map(csvCell).join(','), '\r\n', body.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Customer_Segmentation_${year}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const kpi = data?.kpi;
  const distribution = data?.segmentDistribution || [];
  const revenue = data?.revenueMix;
  const trend = data?.growthTrend || [];
  const customers = data?.customers || [];
  const hasFilters = !!search || segments.size > 0;

  return <div className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroTop}>
        <div className={styles.brand}><div>
          <p className={styles.eyebrow}>BVLGARI / CLIENT INTELLIGENCE</p>
          <h1>Customer Intelligence</h1>
          <p className={styles.subtitle}>Understand your customers, their value and how they return.</p>
        </div></div>
        <div className={styles.heroControls}>
          <label className={styles.yearControl}><CalendarDays size={16} /><span className="sr-only">Analysis year</span>
            <select aria-label="Analysis year" value={year} onChange={event => switchYear(Number(event.target.value))}>
              {Array.from({ length: Math.max(1, new Date().getFullYear() - 2023 + 1) }, (_, index) => new Date().getFullYear() - index).map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
          <button type="button" onClick={refresh} disabled={loading} className={styles.refresh} aria-label="Refresh segmentation"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button type="button" onClick={exportCsv} disabled={loading || !!error || !filtered.length} className={styles.export}><Download size={15} />Export CSV</button>
        </div>
      </div>
      <div className={styles.heroBottom}><span className={styles.periodTag}>Analysis year {year}</span><span>Lifetime customer profiles · Annual purchase trends</span></div>
    </header>

    {loading ? <div className={styles.loading} role="status"><RefreshCw className="animate-spin" size={22} />Loading customer intelligence...</div> : error || !data || !kpi || !revenue ?
      <div className={styles.error} role="alert"><p>{error || 'Customer data is unavailable.'}</p><button type="button" onClick={refresh}>Try again</button></div> : <>
      <section className={styles.kpis} aria-label="Customer overview">
        <article className={cn(styles.kpi, styles.kpiPrimary)}><span className={styles.kpiIcon}><UserCheck size={18} /></span><p>Active customers</p><strong>{kpi.totalActiveCustomers.toLocaleString('en-US')}</strong><small>Purchased within the last 730 days</small></article>
        <article className={cn(styles.kpi, styles.kpiPurple)}><span className={styles.kpiIcon}><TrendingUp size={18} /></span><p>Average lifetime value</p><strong><Amt value={kpi.avgLtv} short /></strong><small>Per active customer · IDR</small></article>
        <article className={cn(styles.kpi, styles.kpiGold)}><span className={styles.kpiIcon}><Star size={18} /></span><p>Top spender</p><strong className={styles.topName} title={kpi.topSpender.name}>{kpi.topSpender.name || '—'}</strong><small><Amt value={kpi.topSpender.spend} short /> lifetime spend</small></article>
        <article className={cn(styles.kpi, styles.kpiGreen)}><span className={styles.kpiIcon}><UserPlus size={18} /></span><p>New customer ratio</p><strong>{percentage(kpi.newCustomerRatio)}</strong><small>First purchase in {year} among active customers</small><div className={styles.rateTrack}><div style={{ width: `${Math.min(kpi.newCustomerRatio, 100)}%` }} /></div></article>
      </section>

      <section className={styles.segmentSection} aria-label="Customer segments">
        <div className={styles.segmentHeading}><div><p className={styles.overline}>CUSTOMER MIX</p><h2>Explore by segment</h2><p>Select one or more tiers to focus the customer register.</p></div><span>{customers.length.toLocaleString('en-US')} profiles</span></div>
        <div className={styles.segmentGrid}>{SEGMENT_ORDER.map(segment => {
          const count = distribution.find(item => item.name === segment)?.count || 0;
          const active = segments.has(segment);
          return <button key={segment} type="button" aria-pressed={active} onClick={() => toggleSegment(segment)} className={cn(styles.segmentTile, styles[`tone${segment.replace(/\s/g, '')}`], active && styles.segmentActive)}>
            <span className={styles.segmentDot} /><span className="truncate">{segment}</span><strong>{count.toLocaleString('en-US')}</strong>
          </button>;
        })}</div>
      </section>

      <div className={styles.charts}>
        <section className={styles.chartPanel} aria-label="Segment distribution"><div className={styles.chartHeading}><p className={styles.overline}>CUSTOMER BASE</p><h2>Segment distribution</h2><p>Customers in each tier</p></div>
          <div className={styles.donutWrap}><ResponsiveContainer width="100%" height={210}><PieChart><Pie data={distribution.filter(item => item.count > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={86} paddingAngle={2} dataKey="count" nameKey="name" stroke="none">{distribution.filter(item => item.count > 0).map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} formatter={value => [Number(value).toLocaleString('en-US'), 'Customers']} /></PieChart></ResponsiveContainer><div className={styles.donutCenter}><strong>{customers.length.toLocaleString('en-US')}</strong><span>profiles</span></div></div>
          <div className={styles.legend}>{distribution.map(item => <div key={item.name}><span className={styles.legendDot} style={{ backgroundColor: item.color }} /><span>{item.name}</span><strong>{item.count.toLocaleString('en-US')}</strong></div>)}</div>
        </section>
        <section className={styles.chartPanel} aria-label="Revenue by purchase frequency"><div className={styles.chartHeading}><p className={styles.overline}>ANNUAL SPEND · {year}</p><h2>One-time vs repeat</h2><p>Based on customers with one or multiple invoices</p></div>
          <div className={styles.chartCanvas}><ResponsiveContainer width="100%" height={205}><BarChart data={[{ name: 'One-time', value: revenue.newRevenue }, { name: 'Repeat', value: revenue.repeatRevenue }]} margin={{ top: 12, right: 6, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={value => hidden ? '•••' : shortAmount(Number(value))} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} formatter={value => [hidden ? '••••••' : shortAmount(Number(value)), 'Net sales']} /><Bar dataKey="value" radius={[7,7,0,0]} maxBarSize={62}><Cell fill="#8b5cf6" /><Cell fill="#10b981" /></Bar></BarChart></ResponsiveContainer></div>
          <div className={styles.revenueLegend}><div><span className={cn(styles.legendDot, styles.purpleDot)} />One-time<strong><Amt value={revenue.newRevenue} short /></strong></div><div><span className={cn(styles.legendDot, styles.greenDot)} />Repeat<strong><Amt value={revenue.repeatRevenue} short /></strong></div></div>
        </section>
        <section className={styles.chartPanel} aria-label="Monthly customer trend"><div className={styles.chartHeading}><p className={styles.overline}>CUSTOMER ACTIVITY · {year}</p><h2>First seen & returning</h2><p>Unique customers per month</p></div>
          <div className={styles.chartCanvas}><ResponsiveContainer width="100%" height={205}><LineChart data={trend} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} formatter={(value, name) => [Number(value).toLocaleString('en-US'), name === 'new' ? 'First seen' : 'Returning']} /><Line name="new" dataKey="new" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /><Line name="repeat" dataKey="repeat" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /></LineChart></ResponsiveContainer></div>
          <div className={styles.trendLegend}><span><i className={styles.blueDot} />First seen this year</span><span><i className={styles.greenDot} />Returning in a later month</span></div>
        </section>
      </div>

      <section className={styles.register} aria-label="Segmented customer register">
        <div className={styles.registerTop}><div><p className={styles.overline}>CUSTOMER REGISTER</p><h2>Customer profiles</h2><p>Review purchase frequency, recency and lifetime value.</p></div><div className={styles.search}><Search size={15} /><input aria-label="Search customer name" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search customer name..." />{search && <button type="button" onClick={() => { setSearch(''); setPage(1); }} aria-label="Clear search"><X size={14} /></button>}</div></div>
        <div className={styles.resultBar}><span>{filtered.length ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length.toLocaleString('en-US')} customers` : 'No matching customers'}</span>{hasFilters && <button type="button" onClick={() => { setSearch(''); setSegments(new Set()); setPage(1); }}>Clear filters</button>}</div>
        <div className={styles.tableScroll} role="region" aria-label="Scrollable customer records" tabIndex={0}><table><thead><tr><th>Customer</th><th>Segment</th><th className="text-right">Invoices</th><th className="text-right">Items</th><th className="text-right">Days since purchase</th><th className="text-right">Lifetime value</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>
          {visible.map((customer, index) => <tr key={`${customer.name}-${(currentPage - 1) * PAGE_SIZE + index}`}><td className={styles.customerName} title={customer.name}>{customer.name}</td><td><SegmentBadge segment={customer.segment} /></td><td className="text-right tabular-nums">{customer.freqInvoice}</td><td className="text-right tabular-nums">{customer.freqQty.toLocaleString('en-US')}</td><td className="text-right tabular-nums">{customer.recencyDays}</td><td className="text-right font-semibold tabular-nums"><Amt value={customer.ltv} short /></td><td><button type="button" className={styles.details} onClick={() => setSelected(customer)} aria-label={`View ${customer.name} details`}>View <ArrowUpRight size={14} /></button></td></tr>)}
          {!visible.length && <tr><td colSpan={7} className={styles.empty}>{hasFilters ? 'No customers match these filters.' : 'No customer data is available.'}</td></tr>}
        </tbody></table></div>
        {pages > 1 && <div className={styles.pagination}><span>Page {currentPage} of {pages}</span><div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} />Previous</button><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next<ChevronRight size={16} /></button></div></div>}
      </section>
    </>}
    <CustomerModal name={selected?.name || null} segment={selected?.segment || null} onClose={() => setSelected(null)} />
  </div>;
}

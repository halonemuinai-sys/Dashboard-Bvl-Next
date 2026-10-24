'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Database, Download, FilterX, MapPin, RefreshCw, Search, TrendingUp, Users, X } from 'lucide-react';
import Amt from '@/components/Amt';
import { cn } from '@/lib/utils';
import { crmService, type TrafficRow } from '@/services/crmService';
import styles from './app-sheet-crm.module.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const PAGE_SIZE = 25;
const funnelLabel: Record<string, string> = { potensial: 'New potential', menunggu: 'Awaiting response', negosiasi: 'In negotiation', berhasil: 'Successful', gagal: 'Unsuccessful' };
const funnelTone: Record<string, string> = { potensial: styles.blue, menunggu: styles.amber, negosiasi: styles.violet, berhasil: styles.emerald, gagal: styles.rose };
const statusLabel: Record<string, string> = { walkin: 'Walk-in', followup: 'Follow-up', delivery: 'Delivery & showing', service: 'Service & repair', online: 'Online', inhouse: 'In-house', outsider: 'Outsider', other: 'Other' };

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function csvCell(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const text = String(value ?? '');
  const safe = /^\s*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function prospectTone(value: string) {
  const lower = (value || '').toLowerCase();
  if (lower.includes('berhasil')) return styles.emerald;
  if (lower.includes('gagal')) return styles.rose;
  if (lower.includes('negosiasi')) return styles.violet;
  if (lower.includes('menunggu') || lower.includes('respon')) return styles.amber;
  if (lower.includes('potensial')) return styles.blue;
  return styles.neutral;
}

export default function AppSheetCrmPage() {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [revision, setRevision] = useState(0);
  const [rows, setRows] = useState<TrafficRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [prospect, setProspect] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    crmService.getTrafficRows(month, year).then(data => {
      if (!active) return;
      setRows(data);
      setError('');
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError('CRM data could not be loaded. Please try again.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [month, year, revision]);

  const refresh = () => { setLoading(true); setError(''); setRevision(value => value + 1); };
  const changePeriod = (nextMonth: number, nextYear: number) => {
    setLoading(true); setError(''); setPage(1); setMonth(nextMonth); setYear(nextYear);
  };
  const overview = useMemo(() => crmService.computeOverview(rows), [rows]);
  const locations = useMemo(() => [...new Set(rows.map(row => row.location).filter(Boolean))].sort(), [rows]);
  const statuses = useMemo(() => [...new Set(rows.map(row => row.status || row.akses_masuk).filter(Boolean))].sort(), [rows]);
  const prospects = useMemo(() => [...new Set(rows.map(row => row.prospect_item).filter(Boolean))].sort(), [rows]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(row => (!location || row.location === location) && (!status || (row.status || row.akses_masuk) === status)
      && (!prospect || row.prospect_item === prospect) && (!term || [row.customer_name, row.served_by, row.location, row.no_hp]
        .some(value => (value || '').toLowerCase().includes(term))));
  }, [rows, search, location, status, prospect]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const success = overview.funnel.find(item => item.key === 'berhasil')?.count ?? 0;
  const conversion = rows.length ? success / rows.length * 100 : 0;
  const otherProspects = Math.max(0, rows.length - overview.funnel.reduce((sum, item) => sum + item.count, 0));
  const otherStatuses = Math.max(0, rows.length - overview.statusBreakdown.reduce((sum, item) => sum + item.count, 0));
  const hasFilters = !!(search || location || status || prospect);
  const setTableFilter = (update: () => void) => { update(); setPage(1); };

  const exportCsv = () => {
    const header = ['Date','Customer','Boutique','Served by','Arrival status','Prospect stage','Net sales'];
    const data = filtered.map(row => [row.transaction_date, row.customer_name, row.location, row.served_by,
      row.status || row.akses_masuk, row.prospect_item, row.net_sales].map(csvCell).join(','));
    const url = URL.createObjectURL(new Blob(['\uFEFF', header.map(csvCell).join(','), '\r\n', data.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `CRM_Traffic_${year}_${String(month).padStart(2, '0')}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroTop}>
        <div className={styles.brand}><span className={styles.brandIcon}><Database size={23} /></span><div>
          <p className={styles.eyebrow}>BVLGARI / CLIENT INTELLIGENCE</p>
          <h1>AppSheet CRM Dashboard</h1>
          <p className={styles.subtitle}>A clear view of visits, prospect progress and boutique activity.</p>
        </div></div>
        <div className={styles.heroControls}>
          <label className={styles.periodControl}><CalendarDays size={16} /><span className="sr-only">Month</span>
            <select aria-label="Select month" value={month} onChange={event => changePeriod(Number(event.target.value), year)}>
              {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
          </label>
          <label className={styles.periodControl}><span className="sr-only">Year</span>
            <select aria-label="Select year" value={year} onChange={event => changePeriod(month, Number(event.target.value))}>
              {Array.from({ length: Math.max(1, new Date().getFullYear() - 2023 + 1) }, (_, index) => new Date().getFullYear() - index).map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
          <button type="button" onClick={refresh} disabled={loading} aria-label="Refresh CRM data" className={styles.refresh}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>
      <div className={styles.heroBottom}><span className={styles.periodTag}>{MONTHS[month - 1]} {year}</span><span>Data from boutique visit records</span></div>
    </header>

    {loading ? <div className={styles.loading} role="status"><RefreshCw className="animate-spin" size={22} />Loading CRM activity...</div> : error ?
      <div className={styles.error} role="alert"><p>{error}</p><button type="button" onClick={refresh}>Try again</button></div> : <>
      <section className={styles.kpis} aria-label="Monthly CRM overview">
        <article className={cn(styles.kpi, styles.kpiPrimary)}><span className={styles.kpiIcon}><Users size={18} /></span><p>Total visits</p><strong>{rows.length.toLocaleString('en-US')}</strong><small>Recorded this month</small></article>
        <article className={cn(styles.kpi, styles.kpiGreen)}><span className={styles.kpiIcon}><CheckCircle2 size={18} /></span><p>Successful prospects</p><strong>{success.toLocaleString('en-US')}</strong><small>Marked successful in prospect stage</small></article>
        <article className={cn(styles.kpi, styles.kpiViolet)}><span className={styles.kpiIcon}><TrendingUp size={18} /></span><p>Success rate</p><strong>{conversion.toFixed(1)}%</strong><small>{success.toLocaleString('en-US')} of {rows.length.toLocaleString('en-US')} visits</small><div className={styles.rateTrack}><div style={{ width: `${Math.min(conversion, 100)}%` }} /></div></article>
        <article className={cn(styles.kpi, styles.kpiAmber)}><span className={styles.kpiIcon}><Database size={18} /></span><p>Recorded net sales</p><strong><Amt value={overview.kpi.totalRevenue} short /></strong><small>Across visit records</small></article>
      </section>

      <div className={styles.analytics}>
        <section className={styles.panel} aria-label="Prospect pipeline">
          <div className={styles.panelHeading}><div><p className={styles.overline}>PROSPECT JOURNEY</p><h2>Pipeline at a glance</h2></div><span>{rows.length.toLocaleString('en-US')} visits</span></div>
          <div className={styles.pipeline}>
            {[...overview.funnel.map(item => ({ ...item, label: funnelLabel[item.key] || item.label })), ...(otherProspects ? [{ key: 'other', label: 'Other / unclassified', count: otherProspects, revenue: 0 }] : [])].map(item =>
              <div key={item.key} className={styles.pipelineRow}>
                <span className={cn(styles.toneDot, funnelTone[item.key] || styles.neutral)} /><span className={styles.pipelineLabel}>{item.label}</span>
                <div className={styles.pipelineTrack}><div className={cn(styles.pipelineFill, funnelTone[item.key] || styles.neutral)} style={{ width: `${rows.length ? item.count / rows.length * 100 : 0}%` }} /></div>
                <strong>{item.count.toLocaleString('en-US')}</strong><span className={styles.pipelinePercent}>{rows.length ? (item.count / rows.length * 100).toFixed(0) : 0}%</span>
              </div>)}
          </div>
        </section>
        <section className={styles.panel} aria-label="Arrival status">
          <div className={styles.panelHeading}><div><p className={styles.overline}>VISIT MIX</p><h2>Arrival status</h2></div><MapPin size={18} className="text-slate-400" /></div>
          <div className={styles.statusGrid}>{[...overview.statusBreakdown.map(item => ({ ...item, label: statusLabel[item.key] || item.label })), ...(otherStatuses ? [{ key: 'other', label: 'Other', count: otherStatuses }] : [])].map(item =>
            <div key={item.key} className={styles.statusItem}><span>{item.label}</span><strong>{item.count.toLocaleString('en-US')}</strong></div>)}</div>
          {overview.byLocation.length > 0 && <div className={styles.locationSummary}><p className={styles.overline}>BY BOUTIQUE</p>
            {[...overview.byLocation].sort((a, b) => b.total - a.total).map(item => <div key={item.name} className={styles.locationRow}><span className="truncate">{item.name}</span><div className={styles.locationTrack}><div style={{ width: `${rows.length ? item.total / rows.length * 100 : 0}%` }} /></div><strong>{item.total}</strong></div>)}
          </div>}
        </section>
      </div>

      <section className={styles.register} aria-label="Customer visit register">
        <div className={styles.registerTop}><div><p className={styles.overline}>VISIT REGISTER</p><h2>Customer activity</h2><p>Search visits and explore the details behind each prospect.</p></div>
          <button type="button" onClick={exportCsv} disabled={!filtered.length} className={styles.export}><Download size={15} />Export CSV</button></div>
        <div className={styles.filters}>
          <label className={styles.search}><Search size={16} /><span className="sr-only">Search visits</span><input value={search} onChange={event => setTableFilter(() => setSearch(event.target.value))} placeholder="Search customer, advisor, phone or boutique..." />{search && <button type="button" aria-label="Clear search" onClick={() => setTableFilter(() => setSearch(''))}><X size={14} /></button>}</label>
          <select aria-label="Filter boutique" value={location} onChange={event => setTableFilter(() => setLocation(event.target.value))}><option value="">All boutiques</option>{locations.map(value => <option key={value}>{value}</option>)}</select>
          <select aria-label="Filter prospect stage" value={prospect} onChange={event => setTableFilter(() => setProspect(event.target.value))}><option value="">All stages</option>{prospects.map(value => <option key={value}>{value}</option>)}</select>
          <select aria-label="Filter arrival status" value={status} onChange={event => setTableFilter(() => setStatus(event.target.value))}><option value="">All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select>
          {hasFilters && <button type="button" className={styles.reset} onClick={() => { setSearch(''); setLocation(''); setStatus(''); setProspect(''); setPage(1); }}><FilterX size={14} />Reset</button>}
        </div>
        <div className={styles.resultBar}><span>{filtered.length ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length.toLocaleString('en-US')} visits` : 'No matching visits'}</span><span>Newest first</span></div>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Scrollable visit records"><table><thead><tr><th>Date</th><th>Customer</th><th>Boutique</th><th>Served by</th><th>Arrival status</th><th>Prospect stage</th><th className="text-right">Net sales</th></tr></thead><tbody>
          {visible.map(row => <tr key={row.id}><td>{formatDate(row.transaction_date)}</td><td className={styles.customer}>{row.customer_name || 'Unnamed customer'}</td><td>{row.location || '—'}</td><td>{row.served_by || '—'}</td><td><span className={styles.arrival}>{row.status || row.akses_masuk || '—'}</span></td><td><span className={cn(styles.stage, prospectTone(row.prospect_item))}>{row.prospect_item || 'Unclassified'}</span></td><td className="text-right font-semibold tabular-nums">{row.net_sales ? <Amt value={row.net_sales} short /> : '—'}</td></tr>)}
          {!visible.length && <tr><td colSpan={7} className={styles.empty}>{rows.length ? 'No visits match the current filters.' : 'No visit records for this period.'}</td></tr>}
        </tbody></table></div>
        {pages > 1 && <div className={styles.pagination}><span>Page {currentPage} of {pages}</span><div><button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} />Previous</button><button type="button" aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next<ChevronRight size={16} /></button></div></div>}
      </section>
    </>}
  </div>;
}

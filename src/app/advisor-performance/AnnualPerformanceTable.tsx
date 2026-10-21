'use client';

import { useMemo, useState } from 'react';
import { ArrowDownWideNarrow, ArrowUpWideNarrow, BarChart3, CheckCircle2, Search, SlidersHorizontal, Target, Trophy, Users, X } from 'lucide-react';
import Amt from '@/components/Amt';
import { cn } from '@/lib/utils';
import { rankAnnualAdvisors, type AnnualAdvisor, type AnnualDirection, type AnnualMetric } from './annual-ranking';
import styles from './annual-performance.module.css';

interface Props {
  year: string;
  advisors: AnnualAdvisor[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}

export default function AnnualPerformanceTable({ year, advisors, loading, error, onRetry }: Props) {
  const [metric, setMetric] = useState<AnnualMetric>('percent');
  const [direction, setDirection] = useState<AnnualDirection>('desc');
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const locations = useMemo(() => [...new Set(advisors.map(row => row.location).filter(Boolean))].sort(), [advisors]);
  const view = useMemo(() => rankAnnualAdvisors(advisors, { metric, direction, search, location }), [advisors, metric, direction, search, location]);
  const filtered = Boolean(search.trim() || location);
  const metricLabel = metric === 'value' ? 'Sales value' : 'Achievement';
  const reset = () => { setSearch(''); setLocation(''); };

  return <section className={styles.section} aria-labelledby="annual-performance-title">
    <header className={styles.header}>
      <div className={styles.heading}><span className={styles.headerIcon}><BarChart3 size={23} /></span><div>
        <p className={styles.eyebrow}>ADVISOR INTELLIGENCE / {year}</p>
        <h2 id="annual-performance-title">Annual performance</h2>
        <p>January–December sales and targets · Excluding Head Office</p>
      </div></div>
      <span className={styles.headerBadge}><Trophy size={14} />{metricLabel} ranking</span>
    </header>

    <div className={styles.toolbar}>
      <div className={styles.sortControls}>
        <span className={styles.controlLabel}><SlidersHorizontal size={14} />Rank by</span>
        <div className={styles.segmented} role="group" aria-label="Rank advisors by">
          <button type="button" aria-pressed={metric === 'value'} onClick={() => setMetric('value')} className={metric === 'value' ? styles.active : ''}>Sales value <span>IDR</span></button>
          <button type="button" aria-pressed={metric === 'percent'} onClick={() => setMetric('percent')} className={metric === 'percent' ? styles.active : ''}>Achievement <span>%</span></button>
        </div>
        <button type="button" className={styles.direction} onClick={() => setDirection(value => value === 'desc' ? 'asc' : 'desc')} aria-label={`Sort ${direction === 'desc' ? 'lowest' : 'highest'} first`}>
          {direction === 'desc' ? <ArrowDownWideNarrow size={16} /> : <ArrowUpWideNarrow size={16} />}{direction === 'desc' ? 'Highest first' : 'Lowest first'}
        </button>
      </div>
      <div className={styles.filters}>
        <select aria-label="Filter annual advisors by location" value={location} onChange={event => setLocation(event.target.value)}>
          <option value="">All locations</option>
          {location && !locations.includes(location) && <option value={location}>{location}</option>}
          {locations.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        <div className={styles.search}><Search size={15} /><input type="search" aria-label="Search annual advisors" placeholder="Search advisor or location…" value={search} onChange={event => setSearch(event.target.value)} /></div>
        {filtered && <button type="button" className={styles.clear} onClick={reset} aria-label="Clear annual advisor filters" title="Clear filters"><X size={16} /></button>}
      </div>
    </div>

    {loading ? <div className={styles.message} role="status">Loading annual performance…</div> : error ? <div className={styles.message} role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Try again</button></div> : <>
      <div className={styles.summary}>
        <div><span className={styles.summaryIcon}><Users size={17} /></span><div><span>Advisors in view</span><strong>{view.rows.length}<small> / {advisors.length}</small></strong></div></div>
        <div><span className={styles.summaryIcon}><BarChart3 size={17} /></span><div><span>Sales in view</span><strong><Amt value={view.totalSales} short /></strong></div></div>
        <div><span className={styles.summaryIcon}><Target size={17} /></span><div><span>Target in view</span><strong><Amt value={view.totalTarget} short /></strong></div></div>
        <div><span className={cn(styles.summaryIcon, styles.success)}><CheckCircle2 size={17} /></span><div><span>Target achieved</span><strong>{view.achieved}<small> advisors</small></strong></div></div>
      </div>
      <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Annual advisor ranking table">
        <table>
          <caption className="sr-only">Annual advisor performance for {year}, sorted by {metricLabel}, {direction === 'desc' ? 'highest' : 'lowest'} first. Positions are within the current filtered view.</caption>
          <thead><tr>
            <th scope="col" className={styles.rankColumn}>#</th><th scope="col">Advisor</th><th scope="col">Location</th>
            <th scope="col" className={styles.center}>Active months</th><th scope="col" className={styles.center}>Transactions</th>
            <th scope="col" className={cn(styles.right, metric === 'value' && styles.selectedColumn)} aria-sort={metric === 'value' ? direction === 'desc' ? 'descending' : 'ascending' : 'none'}>Sales value {metric === 'value' && (direction === 'desc' ? '↓' : '↑')}</th>
            <th scope="col" className={styles.right}>Annual target</th>
            <th scope="col" className={cn(styles.achievementColumn, metric === 'percent' && styles.selectedColumn)} aria-sort={metric === 'percent' ? direction === 'desc' ? 'descending' : 'ascending' : 'none'}>Achievement {metric === 'percent' && (direction === 'desc' ? '↓' : '↑')}</th>
            <th scope="col" className={styles.right} title="Share of sales across all advisors for the selected year">Contribution %</th>
          </tr></thead>
          <tbody key={`${year}-${metric}-${direction}-${location}`} className={styles.rows}>
            {view.rows.map((advisor, index) => {
              const tone = advisor.target <= 0 ? styles.neutral : advisor.achievement >= 100 ? styles.success : advisor.achievement >= 80 ? styles.near : styles.below;
              const initials = advisor.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('');
              return <tr key={`${advisor.name}-${advisor.location}`}>
                <td className={styles.rankColumn}><span className={cn(styles.rank, index < 3 && styles.leadingRank)}>{String(index + 1).padStart(2, '0')}</span></td>
                <td><div className={styles.advisor}><span className={styles.avatar}>{initials}</span><strong>{advisor.name}</strong></div></td>
                <td><span className={styles.location}>{advisor.location || 'Unassigned'}</span></td>
                <td className={cn(styles.center, styles.numeric)}>{advisor.productiveMonths}<span className={styles.faded}> / 12</span></td>
                <td className={cn(styles.center, styles.numeric)}>{advisor.transCount.toLocaleString('en-US')}</td>
                <td className={cn(styles.right, styles.sales, metric === 'value' && styles.selectedCell)}><Amt value={advisor.netSales} short /></td>
                <td className={cn(styles.right, styles.target)}>{advisor.target > 0 ? <Amt value={advisor.target} short /> : '—'}</td>
                <td className={cn(tone, metric === 'percent' && styles.selectedCell)}>
                  {advisor.target > 0 ? <div className={styles.achievement}><span><b>{advisor.achievement.toFixed(1)}%</b>{advisor.achievement >= 100 && <CheckCircle2 size={13} aria-label="Target achieved" />}</span><div className={styles.track}><div style={{ width: `${Math.max(0, Math.min(100, advisor.achievement))}%` }} /></div></div> : <span className={styles.noTarget}>No target</span>}
                </td>
                <td className={cn(styles.right, styles.numeric)}>{advisor.contribution.toFixed(1)}%</td>
              </tr>;
            })}
            {view.rows.length === 0 && <tr><td colSpan={9} className={styles.empty}><Search size={24} /><p>{advisors.length ? 'No advisors match these filters.' : `No annual sales data for ${year}.`}</p>{filtered && <button type="button" onClick={reset}>Clear filters</button>}</td></tr>}
          </tbody>
          {view.rows.length > 0 && <tfoot><tr><td colSpan={5}>{filtered ? 'Filtered total' : 'Total'} · {view.rows.length} advisors</td><td className={styles.right}><Amt value={view.totalSales} short /></td><td className={styles.right}><Amt value={view.totalTarget} short /></td><td colSpan={2} /></tr></tfoot>}
        </table>
      </div>
      <footer className={styles.footer} aria-live="polite"><span>{view.rows.length} of {advisors.length} advisors · {metricLabel} · {direction === 'desc' ? 'Highest first' : 'Lowest first'}</span><span>Ranks reflect this view. Contribution remains a share of all annual advisor sales.</span></footer>
    </>}
  </section>;
}

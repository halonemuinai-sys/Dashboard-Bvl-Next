'use client';

import { useEffect, useRef, useState } from 'react';
import { ContactRound, Store, Search, X, Filter, RefreshCw, Loader2, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CrmProfilingRow } from '@/services/dashboardService';
import { getCrmProfilingPage, exportCrmProfiling, getCrmProfilingSummary } from '@/services/dashboard/crmDashService';
import { PROFILE_PAGE_SIZE, type ProfilePhotoFilter, type profilePhotoSummary } from '@/lib/crm-profiling-query';
import { cn } from '@/lib/utils';
import { ProfileModal } from './ProfileDetails';
import ProfileList from './ProfileList';
import ProfileSummary from './ProfileSummary';
import { profilesCsv } from './export-profiles';
import styles from './profiling.module.css';

const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed';

export default function ClientDirectory() {
  const [rows, setRows] = useState<CrmProfilingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [query, setQuery] = useState({ search: '', store: '', page: 1, photo: 'all' as ProfilePhotoFilter });
  const [summary, setSummary] = useState<{ key: string; data?: ReturnType<typeof profilePhotoSummary>; error: boolean } | null>(null);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<CrmProfilingRow | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const summaryKey = JSON.stringify([query.search, query.store, revision]);
  const summaryLoading = summary?.key !== summaryKey;
  const totalPages = Math.max(1, Math.ceil(total / PROFILE_PAGE_SIZE));

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await getCrmProfilingPage(query.search, query.store, query.page, controller.signal, query.photo);
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(data.total / PROFILE_PAGE_SIZE));
        if (query.page > lastPage) {
          setQuery(previous => ({ ...previous, page: lastPage }));
          return;
        }
        setRows(data.rows);
        setTotal(data.total);
        setLoading(false);
      } catch {
        if (!controller.signal.aborted) {
          setError('Unable to load profiles. Please try again.');
          setLoading(false);
        }
      }
    }, query.search.trim() ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, revision]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await getCrmProfilingSummary(query.search, query.store, controller.signal);
        if (!controller.signal.aborted) setSummary({ key: summaryKey, data, error: false });
      } catch {
        if (!controller.signal.aborted) setSummary({ key: summaryKey, error: true });
      }
    }, query.search.trim() ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query.search, query.store, summaryKey]);

  const updateQuery = (next: Partial<typeof query>) => {
    setLoading(true);
    setError('');
    setExportError('');
    setQuery(previous => ({ ...previous, ...next }));
  };
  const refresh = () => { setLoading(true); setError(''); setRevision(value => value + 1); };
  const exportCsv = async () => {
    setExporting(true);
    setExportError('');
    try {
      const exportRows = await exportCrmProfiling(query.search, query.store, query.photo);
      const url = URL.createObjectURL(new Blob([profilesCsv(exportRows)], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CRM_Profiling.csv';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError('Export could not be completed. Please try again.');
    } finally { setExporting(false); }
  };

  return (
    <div className={cn(styles.page, 'space-y-6 pb-10')}>
      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-6 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><ContactRound className="h-7 w-7" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-blue-600">Client intelligence</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">CRM Profiling</h1>
              <p className="mt-1 text-sm text-slate-500">Know your clients. Make every conversation personal.</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={refresh} disabled={loading} aria-label="Refresh profiles" className={buttonStyle}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button>
            <button type="button" onClick={exportCsv} disabled={loading || exporting || !!error || total === 0} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}{exporting ? 'Exporting...' : 'Export results'}</button>
            <a href="/crm_profiling_export.xlsx" download="CRM_Profiling_Tier_Export.xlsx" className={buttonStyle}><FileDown className="h-4 w-4" />Custom Excel</a>
          </div>
        </div>
      </section>

      <ProfileSummary data={summary?.data} loading={summaryLoading} error={!summaryLoading && !!summary?.error} selected={query.photo} onSelect={photo => updateQuery({ photo, page: 1 })} onRetry={refresh} />

      <section aria-label="Client directory" className={cn(styles.responsiveSection, "overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm")}>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 pt-5 sm:px-6"><div><h2 className="text-base font-semibold text-slate-900">Client directory</h2><p className="mt-1 text-xs text-slate-400">Contact details, boutique ownership and photo status.</p></div><div className="flex items-center gap-1.5 text-xs text-slate-500"><Store className="h-3.5 w-3.5" />{query.store || 'All boutiques'}</div></div>
        <div className="space-y-3 p-5 sm:px-6">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              <Search className="h-4 w-4 shrink-0 text-blue-500" />
              <input ref={searchRef} aria-label="Search client profiles" type="search" placeholder="Search name, phone, email or advisor..." value={query.search} onChange={event => updateQuery({ search: event.target.value, page: 1 })} className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
              {query.search && <button type="button" aria-label="Clear search" onClick={() => { updateQuery({ search: '', page: 1 }); searchRef.current?.focus(); }} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3"><Filter className="h-4 w-4 text-slate-400" /><select aria-label="Filter by boutique" value={query.store} onChange={event => updateQuery({ store: event.target.value, page: 1 })} className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none"><option value="">All boutiques</option>{STORES.map(store => <option key={store}>{store}</option>)}</select></div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-5 py-3 sm:px-6" aria-label="Filter by photo status">
          {([{ id: 'all', label: 'All profiles' }, { id: 'with', label: 'Photo on file' }, { id: 'missing', label: 'Missing photo' }] as const).map(filter => <button key={filter.id} type="button" aria-pressed={query.photo === filter.id} onClick={() => updateQuery({ photo: filter.id, page: 1 })} className={cn('rounded-lg px-3 py-2 text-xs font-medium transition-colors', query.photo === filter.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50')}>{filter.label}</button>)}
        </div>
        {exportError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{exportError}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3 text-xs text-slate-400 sm:px-6">
          <p role="status" aria-live="polite">{loading ? 'Finding client profiles...' : error ? 'Profiles unavailable' : total ? `Showing ${(query.page - 1) * PROFILE_PAGE_SIZE + 1}–${Math.min(query.page * PROFILE_PAGE_SIZE, total)} of ${total.toLocaleString()} profiles` : 'No matching profiles'}</p>
          <span>Latest profiles first</span>
        </div>
        <div aria-busy={loading}>
          {loading ? (
            <div aria-label="Loading profiles" className="divide-y divide-slate-100 border-t border-slate-100">{Array.from({ length: 8 }, (_, index) => <div key={index} className="flex h-24 animate-pulse items-center gap-4 px-6"><div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-100" /><div className="h-3 w-1/4 rounded bg-slate-100" /><div className="ml-auto h-6 w-24 rounded-lg bg-slate-100" /></div>)}</div>
          ) : error ? (
            <div role="alert" className="rounded-3xl border border-rose-100 bg-white p-12 text-center"><p className="text-sm text-rose-700">{error}</p><button type="button" onClick={refresh} className="mt-4 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white">Try again</button></div>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><Search className="mx-auto mb-4 h-9 w-9 text-blue-300" /><h2 className="font-semibold text-slate-800">No profiles found</h2><p className="mt-2 text-sm text-slate-500">Try another name, phone number or boutique.</p>{(query.search || query.store || query.photo !== 'all') && <button type="button" onClick={() => updateQuery({ search: '', store: '', page: 1, photo: 'all' })} className="mt-4 text-sm font-semibold text-blue-600">Reset filters</button>}</div>
          ) : (
            <ProfileList rows={rows} onSelect={setSelected} />
          )}
        </div>
        {!error && total > PROFILE_PAGE_SIZE && (
          <nav aria-label="Profile pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:px-6">
            <p className="text-xs text-slate-500">Page <strong className="text-slate-800">{query.page}</strong> of {totalPages}</p>
            <div className="flex gap-2"><button type="button" disabled={loading || query.page <= 1} onClick={() => updateQuery({ page: query.page - 1 })} className={buttonStyle}><ChevronLeft className="h-4 w-4" />Previous</button>
              <button type="button" disabled={loading || query.page >= totalPages} onClick={() => updateQuery({ page: query.page + 1 })} className={buttonStyle}>Next<ChevronRight className="h-4 w-4" /></button></div>
          </nav>
        )}
      </section>
      {selected && <ProfileModal key={selected.id} row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

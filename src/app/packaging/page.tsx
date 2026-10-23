"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, Database, RefreshCw, Search, X, FileDown, Loader2, AlertCircle, Store, Receipt, Layers, ShoppingBag,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import InfoTip from '@/components/InfoTip';
import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { serviceCenterStore } from '@/lib/report-attribution';
import { useUserAccess } from '@/lib/user-access-context';

interface PackRow {
  id: string;
  transaction_no: string;
  transaction_date: string;
  customer_name: string | null;
  salesman: string | null;
  location: string | null;
  sap_code: string | null;
  catalogue_code: string | null;
  description: string | null;
  qty: number | null;
}
interface Line extends PackRow { store: string; item: string }
type SortKey = 'transaction_date' | 'item' | 'store' | 'qty';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PAGE_SIZES = [25, 50, 100];
const STORE_TONE: Record<string, string> = {
  'Plaza Indonesia': 'bg-blue-600', 'Plaza Senayan': 'bg-emerald-500', Bali: 'bg-amber-500', 'Head Office': 'bg-slate-400',
};
const fmtDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const units = (n: number) => n.toLocaleString('en-GB');

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 text-slate-300" />;
  return dir === 'asc' ? <ChevronUp className="h-3 w-3 text-blue-600" /> : <ChevronDown className="h-3 w-3 text-blue-600" />;
}

export default function PackagingPage() {
  const { assignedStore } = useUserAccess();
  // Store managers only see their own boutique.
  const lockedStore = assignedStore && assignedStore !== 'ALL' ? assignedStore : '';
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));

  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<Line[]>([]);

  const [search, setSearch] = useState('');
  const [item, setItem] = useState('');
  const [store, setStore] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('transaction_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const y = Number(year);
      const m = month === 'all' ? null : Number(month);
      const start = m ? `${y}-${String(m).padStart(2, '0')}-01` : `${y}-01-01`;
      const end = m ? new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10) : `${y + 1}-01-01`;
      const data = await fetchAllRows<PackRow>((from, to) => supabase.from('bvlgari_sales')
        .select('id,transaction_no,transaction_date,customer_name,salesman,location,sap_code,catalogue_code,description,qty')
        .ilike('collection', 'PACK%').gte('transaction_date', start).lt('transaction_date', end)
        .order('transaction_date', { ascending: false }).order('id').range(from, to));
      const lines = data.map(row => ({ ...row, store: serviceCenterStore(row.location || ''), item: (row.description || row.catalogue_code || row.sap_code || 'Unnamed item').trim() }));
      setRows(lockedStore ? lines.filter(line => line.store === lockedStore) : lines);
      setPage(1);
    } catch {
      setError('Packaging data could not be loaded. Refresh the page and try again.');
    } finally {
      setLoading(false);
    }
  }, [month, year, lockedStore]);

  useEffect(() => { if (loaded) void loadData(); }, [loaded, loadData]);

  const stores = useMemo(() => [...new Set(rows.map(r => r.store))].sort(), [rows]);
  const scoped = useMemo(() => rows.filter(r => !store || r.store === store), [rows, store]);
  // Item options follow the store filter, sorted by units issued.
  const items = useMemo(() => {
    const map = new Map<string, { item: string; sap: string; qty: number }>();
    scoped.forEach(r => { const e = map.get(r.item) || { item: r.item, sap: r.sap_code || '', qty: 0 }; e.qty += Number(r.qty) || 0; map.set(r.item, e); });
    return [...map.values()].sort((a, b) => b.qty - a.qty);
  }, [scoped]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter(r => {
      if (item && r.item !== item) return false;
      if (!q) return true;
      return [r.transaction_no, r.customer_name, r.salesman, r.item, r.sap_code].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [scoped, item, search]);

  const kpi = useMemo(() => ({
    units: filtered.reduce((s, r) => s + (Number(r.qty) || 0), 0),
    lines: filtered.length,
    invoices: new Set(filtered.map(r => r.transaction_no)).size,
    items: new Set(filtered.map(r => r.item)).size,
  }), [filtered]);

  const byStore = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => map.set(r.store, (map.get(r.store) || 0) + (Number(r.qty) || 0)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);
  const topItems = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => map.set(r.item, (map.get(r.item) || 0) + (Number(r.qty) || 0)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = sortKey === 'qty' ? Number(a.qty) || 0 : String(a[sortKey] || '');
    const bv = sortKey === 'qty' ? Number(b.qty) || 0 : String(b[sortKey] || '');
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  }), [filtered, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = Boolean(search || item || store);
  const clearFilters = () => { setSearch(''); setItem(''); setStore(''); setPage(1); };
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'qty' || key === 'transaction_date' ? 'desc' : 'asc'); }
    setPage(1);
  };

  const exportCsv = () => {
    const q = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Date', 'Invoice', 'Customer', 'Advisor', 'Store', 'Item', 'SAP Code', 'Catalogue', 'Qty'];
    const lines = sorted.map(r => [q(r.transaction_date.slice(0, 10)), q(r.transaction_no), q(r.customer_name), q(r.salesman), q(r.store), q(r.item), q(r.sap_code), q(r.catalogue_code), Number(r.qty) || 0].join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' }));
    a.download = `Packaging_${month === 'all' ? 'FullYear' : MONTHS[Number(month) - 1]}_${year}${store ? `_${store}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const period = month === 'all' ? `Full year ${year}` : `${MONTHS[Number(month) - 1]} ${year}`;
  const maxStore = byStore[0]?.[1] || 1;
  const maxItem = topItems[0]?.[1] || 1;
  const kpis = [
    { icon: Package, tone: 'bg-blue-50 text-blue-600', label: 'Units issued', value: units(kpi.units), help: 'Total quantity of packaging lines (bags, boxes, folders, ribbons…) after the filters.' },
    { icon: Layers, tone: 'bg-slate-100 text-slate-600', label: 'Packaging lines', value: units(kpi.lines), help: 'POS packaging lines. One invoice can have several.' },
    { icon: Receipt, tone: 'bg-emerald-50 text-emerald-600', label: 'Invoices', value: units(kpi.invoices), help: 'Distinct sales invoices that used packaging.' },
    { icon: ShoppingBag, tone: 'bg-amber-50 text-amber-600', label: 'Distinct items', value: units(kpi.items), help: 'Different packaging items used.' },
  ];

  return (
    <div className="space-y-5 pb-12">
      <motion.section initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white">
        <motion.div aria-hidden animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-dashed border-white/10" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><Package className="h-5 w-5 text-blue-200" /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Operations</p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Packaging</h1>
              <p className="mt-1 text-sm text-slate-300">Shopping bags, boxes and folders issued with each sale, by item and boutique.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Month" value={month} onChange={e => setMonth(e.target.value)}
              className="h-9 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white outline-none [&>option]:text-slate-900">
              <option value="all">Full year</option>
              {MONTHS.map((name, i) => <option key={name} value={String(i + 1)}>{name}</option>)}
            </select>
            <select aria-label="Year" value={year} onChange={e => setYear(e.target.value)}
              className="h-9 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white outline-none [&>option]:text-slate-900">
              {Array.from({ length: today.getFullYear() - 2024 }, (_, i) => String(today.getFullYear() - i)).map(y => <option key={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => (loaded ? void loadData() : setLoaded(true))} disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60">
              {loaded ? <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> : <Database className="h-3.5 w-3.5" />}{loaded ? 'Reload' : 'Load data'}
            </button>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[11px] text-slate-300">
          <span>{period}</span>
          <span className="inline-flex items-center gap-1.5"><Store className="h-3.5 w-3.5" />{lockedStore || 'All boutiques'}</span>
          <span className="text-slate-400">Packaging is not merchandise sales and is excluded from every sales total.</span>
        </div>
      </motion.section>

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" /><span className="flex-1">{error}</span>
          <button type="button" onClick={() => void loadData()} className="font-semibold underline">Try again</button>
        </div>
      )}

      {!loaded ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Database className="h-5 w-5" /></span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Packaging · {period}</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">Choose a period, then load the data. After loading, changing the period reloads automatically.</p>
          </div>
          <button type="button" onClick={() => setLoaded(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">
            <Database className="h-4 w-4" />Load data
          </button>
        </div>
      ) : (
        <div aria-busy={loading} className={cn('space-y-5 transition-opacity', loading && 'opacity-60')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} whileHover={{ y: -2 }}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', card.tone)}><card.icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{card.label}<InfoTip label={`About ${card.label.toLowerCase()}`} text={card.help} /></p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-slate-900">{card.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">Units by boutique</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Click a boutique to filter the list.</p>
              <div className="mt-4 space-y-2.5">
                {byStore.map(([name, qty]) => (
                  <button key={name} type="button" onClick={() => { setStore(store === name ? '' : name); setItem(''); setPage(1); }} aria-pressed={store === name}
                    className={cn('block w-full rounded-lg p-1.5 text-left transition', store === name ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50')}>
                    <span className="flex items-center justify-between text-xs"><span className="font-medium text-slate-700">{name}</span><span className="font-semibold tabular-nums text-slate-900">{units(qty)}</span></span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100"><motion.span initial={{ width: 0 }} animate={{ width: `${(qty / maxStore) * 100}%` }} className={cn('block h-full rounded-full', STORE_TONE[name] || 'bg-slate-400')} /></span>
                  </button>
                ))}
                {!byStore.length && <p className="text-xs text-slate-400">No packaging for this period.</p>}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">Most used items</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Top 8 by units. Click an item to filter the list.</p>
              <div className="mt-4 space-y-2.5">
                {topItems.map(([name, qty]) => (
                  <button key={name} type="button" onClick={() => { setItem(item === name ? '' : name); setPage(1); }} aria-pressed={item === name}
                    className={cn('block w-full rounded-lg p-1.5 text-left transition', item === name ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50')}>
                    <span className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-medium text-slate-700" title={name}>{name}</span><span className="font-semibold tabular-nums text-slate-900">{units(qty)}</span></span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100"><motion.span initial={{ width: 0 }} animate={{ width: `${(qty / maxItem) * 100}%` }} className="block h-full rounded-full bg-blue-600" /></span>
                  </button>
                ))}
                {!topItems.length && <p className="text-xs text-slate-400">No packaging for this period.</p>}
              </div>
            </section>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="search" aria-label="Search packaging" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search invoice, customer, advisor or item…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Filter item" value={item} onChange={e => { setItem(e.target.value); setPage(1); }}
                  className="h-9 max-w-[16rem] rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400">
                  <option value="">All items</option>
                  {items.map(it => <option key={it.item} value={it.item}>{it.item} ({units(it.qty)})</option>)}
                </select>
                {!lockedStore && (
                  <select aria-label="Filter boutique" value={store} onChange={e => { setStore(e.target.value); setItem(''); setPage(1); }}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400">
                    <option value="">All boutiques</option>
                    {stores.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                {hasFilters && <button type="button" onClick={clearFilters} className="h-9 rounded-lg px-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">Clear filters</button>}
                <span aria-live="polite" className="text-xs text-slate-400"><span className="font-semibold tabular-nums text-slate-700">{units(filtered.length)}</span> lines</span>
                <button type="button" onClick={exportCsv} disabled={!sorted.length}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
                  <FileDown className="h-4 w-4 text-slate-500" />Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] table-fixed text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="w-[110px] px-4 py-3"><button type="button" onClick={() => toggleSort('transaction_date')} className="inline-flex items-center gap-1 uppercase hover:text-blue-600">Date<SortIcon active={sortKey === 'transaction_date'} dir={sortDir} /></button></th>
                    <th className="w-[170px] px-3 py-3">Invoice</th>
                    <th className="w-[170px] px-3 py-3">Customer / Advisor</th>
                    <th className="w-[140px] px-3 py-3"><button type="button" onClick={() => toggleSort('store')} className="inline-flex items-center gap-1 uppercase hover:text-blue-600">Boutique<SortIcon active={sortKey === 'store'} dir={sortDir} /></button></th>
                    <th className="px-3 py-3"><button type="button" onClick={() => toggleSort('item')} className="inline-flex items-center gap-1 uppercase hover:text-blue-600">Item<SortIcon active={sortKey === 'item'} dir={sortDir} /></button></th>
                    <th className="w-[100px] px-3 py-3">SAP</th>
                    <th className="w-[70px] px-4 py-3 text-right"><button type="button" onClick={() => toggleSort('qty')} className="inline-flex items-center gap-1 uppercase hover:text-blue-600">Qty<SortIcon active={sortKey === 'qty'} dir={sortDir} /></button></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && !rows.length ? (
                    <tr><td colSpan={7} className="py-16 text-center text-slate-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading packaging…</td></tr>
                  ) : !paged.length ? (
                    <tr><td colSpan={7} className="py-16 text-center">
                      {hasFilters ? (<><p className="text-sm font-semibold text-slate-700">No packaging lines match your filters</p><button type="button" onClick={clearFilters} className="mt-2 text-xs font-semibold text-blue-600 hover:underline">Clear filters</button></>)
                        : (<><p className="text-sm font-semibold text-slate-700">No packaging for {period}</p><p className="mt-1 text-xs text-slate-400">Run Sync sales in Invoice Management if packaging is expected.</p></>)}
                    </td></tr>
                  ) : (
                    <AnimatePresence initial={false}>
                      {paged.map((r, i) => (
                        <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }} className="transition-colors hover:bg-slate-50/70">
                          <td className="px-4 py-2.5 tabular-nums text-slate-500">{fmtDate(r.transaction_date)}</td>
                          <td className="truncate px-3 py-2.5 font-mono text-[11px] font-semibold text-blue-700" title={r.transaction_no}>{r.transaction_no}</td>
                          <td className="px-3 py-2"><span className="block truncate text-slate-800" title={r.customer_name || ''}>{r.customer_name || '—'}</span><span className="block truncate text-[10px] text-slate-400">{r.salesman || '—'}</span></td>
                          <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5 text-slate-700"><span className={cn('h-1.5 w-1.5 rounded-full', STORE_TONE[r.store] || 'bg-slate-400')} />{r.store || '—'}</span></td>
                          <td className="truncate px-3 py-2.5 font-medium text-slate-800" title={r.item}>{r.item}</td>
                          <td className="truncate px-3 py-2.5 font-mono text-[11px] text-slate-500">{r.sap_code || '—'}</td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">{Number(r.qty) || 0}</td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row">
              <label className="flex items-center gap-2">Rows per page
                <select aria-label="Rows per page" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none">
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">{sorted.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, sorted.length)}` : '0'} of {units(sorted.length)}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-8 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Previous</button>
                  <button type="button" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-8 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Boxes, CalendarDays, RefreshCw, FileDown, Search, X, ArrowLeft, ShieldOff, Database, Loader2,
  ChevronUp, ChevronDown, ChevronsUpDown, Store, Barcode, Wallet, Tag, CloudDownload, AlertCircle, CircleCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import InfoTip from '@/components/InfoTip';
import { useUserAccess } from '@/lib/user-access-context';
import { inventoryService, LOCATION_MAPPING } from '@/services/inventoryService';

interface InventoryItem {
  id: number;
  snapshot_date: string;
  location_code: string;
  location_name: string;
  item_code: string;
  item_sku: string;
  item_name: string;
  description: string;
  item_price: number;
  item_cost: number;
  collection_code: string;
  main_category?: string;
  collection_name?: string;
  qoh: number;
  amount: number;
  created_at: string;
}

type SortKey = 'item_code' | 'item_sku' | 'description' | 'item_price' | 'qoh' | 'amount' | 'category';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [25, 50, 100];
const CATEGORY_ORDER = ['Watches', 'Jewelry', 'Accessories', 'Perfume', 'SSP', 'Other'];
const CATEGORY_STYLE: Record<string, { bar: string; pill: string }> = {
  Watches: { bar: 'bg-blue-600', pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
  Jewelry: { bar: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  Accessories: { bar: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
  Perfume: { bar: 'bg-cyan-500', pill: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
  SSP: { bar: 'bg-slate-500', pill: 'bg-slate-100 text-slate-600 ring-slate-200' },
  Other: { bar: 'bg-slate-300', pill: 'bg-slate-100 text-slate-500 ring-slate-200' },
};
const STORE_CODES = ['PI', 'PS', 'BL'];

const categoryOf = (item: InventoryItem) => {
  const main = (item.main_category || '').trim();
  if (main) {
    const known = CATEGORY_ORDER.find(c => c.toLowerCase() === main.toLowerCase());
    return known || main;
  }
  const code = (item.collection_code || '').split(',')[0].trim().toUpperCase();
  if (code === 'JWL' || code === 'JEWELRY') return 'Jewelry';
  if (code === 'WTH' || code === 'WATCHES') return 'Watches';
  if (code === 'ACCS' || code === 'ACCESSORIES') return 'Accessories';
  if (code === 'PFM' || code === 'PERFUME') return 'Perfume';
  if (code === 'PACK') return 'PACK';
  return 'Other';
};
const collectionOf = (item: InventoryItem) => item.collection_name || (item.collection_code || '').split(',').slice(-1)[0]?.trim() || '';
const isPackaging = (item: InventoryItem) => {
  const code = (item.collection_code || '').split(',')[0].trim().toUpperCase();
  const main = (item.main_category || '').toUpperCase();
  return code === 'PACK' || main === 'PACK' || main === 'PACKAGING';
};
const fmtSnapshot = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const pillTone = (category: string) => CATEGORY_STYLE[category]?.pill || CATEGORY_STYLE.Other.pill;

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 text-slate-300" />;
  return dir === 'asc' ? <ChevronUp className="h-3 w-3 text-blue-600" /> : <ChevronDown className="h-3 w-3 text-blue-600" />;
}

export default function InventoryPage() {
  const { role, canAccess, loading: accessLoading } = useUserAccess();

  // Snapshot index (metadata) loads on open; stock rows only after "Load data".
  const [snapshotIndex, setSnapshotIndex] = useState<Record<string, string[]>>({});
  const [indexError, setIndexError] = useState('');
  const [selectedLoc, setSelectedLoc] = useState('PI');
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const [includePerfume, setIncludePerfume] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<SortKey>('amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [showSync, setShowSync] = useState(false);
  const [syncLoc, setSyncLoc] = useState('PI');
  const [syncDate, setSyncDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [notice, setNotice] = useState('');

  const locationSnapshots = useMemo(() => snapshotIndex[selectedLoc] || [], [snapshotIndex, selectedLoc]);
  const locationsWithData = useMemo(() => Object.keys(LOCATION_MAPPING).filter(code => snapshotIndex[code]?.length), [snapshotIndex]);
  const locationsWithoutData = useMemo(() => Object.keys(LOCATION_MAPPING).filter(code => !snapshotIndex[code]?.length), [snapshotIndex]);

  const loadIndex = useCallback(async () => {
    try {
      const index = await inventoryService.getSnapshotIndex();
      setIndexError('');
      setSnapshotIndex(index);
      return index;
    } catch {
      setIndexError('Snapshot dates could not be loaded. Check your connection and reload the page.');
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadIndex().then(index => {
      if (!cancelled && index) setSelectedSnapshot(current => current || index[selectedLoc]?.[0] || '');
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadIndex]);

  const changeLocation = (code: string) => {
    setSelectedLoc(code);
    // Keep the date when the boutique has it, otherwise jump to its latest snapshot.
    setSelectedSnapshot(current => (snapshotIndex[code]?.includes(current) ? current : snapshotIndex[code]?.[0] || ''));
    setPage(1);
  };

  const loadData = useCallback(async () => {
    if (!selectedSnapshot) { setItems([]); return; }
    setLoading(true);
    setLoadError('');
    try {
      const res = await inventoryService.getInventoryValuation(selectedLoc, selectedSnapshot);
      if (!res.success) throw new Error(res.error);
      setItems(res.data as InventoryItem[]);
      setUpdatedAt(Date.now());
      setPage(1);
    } catch {
      setLoadError('Stock could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedLoc, selectedSnapshot]);

  useEffect(() => {
    if (loaded) void loadData();
  }, [loaded, loadData]);

  // Packaging is never valued; perfume is optional.
  const scopedItems = useMemo(() => items.filter(item => !isPackaging(item) && (includePerfume || categoryOf(item) !== 'Perfume')), [items, includePerfume]);
  const packagingCount = useMemo(() => items.filter(isPackaging).length, [items]);

  const categoryMix = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; value: number; lines: number }>();
    scopedItems.forEach(item => {
      const name = categoryOf(item);
      const row = map.get(name) || { name, qty: 0, value: 0, lines: 0 };
      row.qty += item.qoh; row.value += item.qoh * item.item_price; row.lines += 1;
      map.set(name, row);
    });
    const order = (name: string) => { const i = CATEGORY_ORDER.indexOf(name); return i < 0 ? CATEGORY_ORDER.length : i; };
    return [...map.values()].sort((a, b) => order(a.name) - order(b.name));
  }, [scopedItems]);

  const kpi = useMemo(() => {
    const units = scopedItems.reduce((s, i) => s + i.qoh, 0);
    const value = scopedItems.reduce((s, i) => s + i.qoh * i.item_price, 0);
    const skus = new Set(scopedItems.map(i => i.item_sku).filter(Boolean)).size;
    const unpriced = scopedItems.filter(i => !i.item_price).length;
    const top = [...categoryMix].sort((a, b) => b.value - a.value)[0];
    return { units, value, skus, unpriced, avg: units > 0 ? value / units : 0, top };
  }, [scopedItems, categoryMix]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedItems.filter(item => {
      if (category !== 'All' && categoryOf(item) !== category) return false;
      if (!q) return true;
      return [item.item_code, item.item_sku, item.description, item.item_name, item.collection_code, item.collection_name, categoryOf(item)]
        .some(v => (v || '').toLowerCase().includes(q));
    });
  }, [scopedItems, category, search]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = sortKey === 'category' ? categoryOf(a) : sortKey === 'description' ? (a.description || a.item_name || '') : a[sortKey] ?? '';
    const bv = sortKey === 'category' ? categoryOf(b) : sortKey === 'description' ? (b.description || b.item_name || '') : b[sortKey] ?? '';
    if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  }), [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = Boolean(search || category !== 'All');
  const clearFilters = () => { setSearch(''); setCategory('All'); setPage(1); };
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(['item_price', 'qoh', 'amount'].includes(key) ? 'desc' : 'asc'); }
    setPage(1);
  };

  const openSync = () => { setSyncLoc(selectedLoc); setSyncError(''); setShowSync(true); };
  const runSync = async () => {
    setSyncing(true);
    setSyncError('');
    try {
      const result = await inventoryService.syncInventory(syncLoc, syncDate);
      if (!result.success) throw new Error(result.error || 'The stock sync failed.');
      await loadIndex();
      setSelectedLoc(syncLoc);
      setSelectedSnapshot(syncDate);
      setLoaded(true);
      setShowSync(false);
      setNotice(`${LOCATION_MAPPING[syncLoc] || syncLoc} stock for ${fmtSnapshot(syncDate)} was synced.`);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'The stock sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const exportCsv = () => {
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ['Location', 'Snapshot Date', 'Serial Number', 'SAP Code', 'Description', 'Category', 'Collection', 'Retail Price', 'QOH', 'Total Amount', 'Collection Code'];
    const rows = sorted.map(item => [
      q(item.location_name), q(item.snapshot_date), q(item.item_code || ''), q(item.item_sku || ''), q(item.description || item.item_name || ''),
      q(categoryOf(item)), q(collectionOf(item)), item.item_price, item.qoh, item.amount, q(item.collection_code || ''),
    ].join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' }));
    a.download = `Inventory_${selectedLoc}_${selectedSnapshot}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (accessLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-sm text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />Checking access…
      </div>
    );
  }

  if (!canAccess('/inventory')) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="max-w-sm space-y-4 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-100"><ShieldOff className="h-7 w-7 text-rose-500" /></span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Access denied</h1>
            <p className="mt-1 text-sm text-slate-500">Inventory Valuation is not available for the <span className="font-semibold text-slate-700">{role || '—'}</span> role.</p>
          </div>
          <Link href="/" className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">
            <ArrowLeft className="h-4 w-4" />Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const kpis = [
    { icon: Wallet, tone: 'bg-blue-50 text-blue-600', label: 'Retail value', value: <Amt value={kpi.value} />, sub: 'IDR · on-hand units × retail price',
      help: 'Quantity on hand multiplied by the retail price of each item. Packaging is excluded, and perfume only counts when "Include perfume" is on.' },
    { icon: Boxes, tone: 'bg-emerald-50 text-emerald-600', label: 'Units on hand', value: kpi.units.toLocaleString('en-GB'), sub: `${scopedItems.length.toLocaleString('en-GB')} stock lines`,
      help: 'Total quantity on hand (QOH) in this snapshot, across every stock line in scope.' },
    { icon: Barcode, tone: 'bg-slate-100 text-slate-600', label: 'Unique SKUs', value: kpi.skus.toLocaleString('en-GB'), sub: kpi.unpriced ? `${kpi.unpriced} lines without retail price` : 'Every line has a retail price',
      help: 'Distinct SAP codes in stock. Lines without a retail price add units but no value.' },
    { icon: Tag, tone: 'bg-amber-50 text-amber-600', label: 'Average unit price', value: <Amt value={kpi.avg} />, sub: kpi.top ? `Largest category: ${kpi.top.name}` : '—',
      help: 'Retail value divided by units on hand.' },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Hero */}
      <motion.section initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white">
        <motion.div aria-hidden animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-dashed border-white/10" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><Boxes className="h-5 w-5 text-blue-200" /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Stock</p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Inventory Valuation</h1>
              <p className="mt-1 text-sm text-slate-300">Retail value of boutique stock from each saved snapshot.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-9 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 text-xs">
              <Store className="h-3.5 w-3.5 text-blue-200" />
              <span className="sr-only">Boutique</span>
              <select aria-label="Boutique" value={selectedLoc} onChange={e => changeLocation(e.target.value)}
                className="bg-transparent font-semibold text-white outline-none [&>optgroup]:text-slate-900 [&_option]:text-slate-900">
                <optgroup label="With snapshots">
                  {locationsWithData.map(code => <option key={code} value={code}>{LOCATION_MAPPING[code]}</option>)}
                </optgroup>
                <optgroup label="No snapshot yet">
                  {locationsWithoutData.map(code => <option key={code} value={code}>{LOCATION_MAPPING[code]}</option>)}
                </optgroup>
              </select>
            </label>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 text-xs">
              <CalendarDays className="h-3.5 w-3.5 text-blue-200" />
              <span className="sr-only">Snapshot date</span>
              <select aria-label="Snapshot date" value={selectedSnapshot} onChange={e => { setSelectedSnapshot(e.target.value); setPage(1); }}
                disabled={!locationSnapshots.length} className="bg-transparent font-semibold text-white outline-none disabled:text-slate-400 [&>option]:text-slate-900">
                {!locationSnapshots.length && <option value="">No snapshot</option>}
                {locationSnapshots.map(date => <option key={date} value={date}>{fmtSnapshot(date)}</option>)}
              </select>
            </label>
            <button type="button" onClick={openSync}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10">
              <CloudDownload className="h-4 w-4" />Sync stock
            </button>
            <button type="button" onClick={() => (loaded ? void loadData() : setLoaded(true))} disabled={loading || !selectedSnapshot}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50">
              {loaded ? <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> : <Database className="h-3.5 w-3.5" />}
              {loaded ? 'Reload' : 'Load data'}
            </button>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-1.5"><Store className="h-3.5 w-3.5" />{LOCATION_MAPPING[selectedLoc] || selectedLoc}</span>
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{selectedSnapshot ? fmtSnapshot(selectedSnapshot) : 'No snapshot'} · {locationSnapshots.length} snapshot{locationSnapshots.length === 1 ? '' : 's'} saved</span>
          <span className="rounded-md border border-white/15 px-2 py-0.5 text-[9px] font-semibold tracking-wider">AMOUNTS IN IDR</span>
          {updatedAt && <span className="ml-auto text-slate-400">Loaded {new Date(updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      </motion.section>

      {(indexError || notice) && (
        <div role={indexError ? 'alert' : 'status'} className={cn('flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs',
          indexError ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
          {indexError ? <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" /> : <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" />}
          <span className="flex-1">{indexError || notice}</span>
          {notice && <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="rounded p-1 hover:bg-emerald-100"><X className="h-3.5 w-3.5" /></button>}
        </div>
      )}

      {!loaded ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Database className="h-5 w-5" /></span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{LOCATION_MAPPING[selectedLoc]} · {selectedSnapshot ? fmtSnapshot(selectedSnapshot) : 'no snapshot yet'}</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              {selectedSnapshot ? 'Choose a boutique and snapshot, then load the stock. After loading, switching boutique or date reloads automatically.' : 'This boutique has no saved snapshot. Run Sync stock to save one.'}
            </p>
          </div>
          {selectedSnapshot ? (
            <button type="button" onClick={() => setLoaded(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">
              <Database className="h-4 w-4" />Load data
            </button>
          ) : (
            <button type="button" onClick={openSync} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">
              <CloudDownload className="h-4 w-4" />Sync stock
            </button>
          )}
        </div>
      ) : (
        <>
          {loadError && (
            <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" /><span className="flex-1">{loadError}</span>
              <button type="button" onClick={() => void loadData()} className="font-semibold underline">Try again</button>
            </div>
          )}

          {/* KPI */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} whileHover={{ y: -2 }}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', card.tone)}><card.icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{card.label}<InfoTip label={`About ${card.label.toLowerCase()}`} text={card.help} /></p>
                  <p className="mt-0.5 truncate text-lg font-semibold tabular-nums tracking-tight text-slate-900">{loading ? '…' : card.value}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{card.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Category mix */}
          <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-slate-900">Category mix</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">Share of retail value per main category. Click a category to filter the stock list.</p>
              </div>
              <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-slate-600">
                <input type="checkbox" checked={includePerfume} onChange={e => { setIncludePerfume(e.target.checked); setPage(1); if (!e.target.checked && category === 'Perfume') setCategory('All'); }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Include perfume
              </label>
            </div>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Retail value share by category">
              {categoryMix.map(cat => (
                <motion.div key={cat.name} initial={{ width: 0 }} animate={{ width: kpi.value > 0 ? `${(cat.value / kpi.value) * 100}%` : '0%' }} transition={{ duration: 0.6 }}
                  title={`${cat.name}: ${kpi.value > 0 ? ((cat.value / kpi.value) * 100).toFixed(1) : 0}%`} className={cn('h-full', CATEGORY_STYLE[cat.name]?.bar || CATEGORY_STYLE.Other.bar)} />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {categoryMix.map(cat => {
                const active = category === cat.name;
                const share = kpi.value > 0 ? (cat.value / kpi.value) * 100 : 0;
                return (
                  <button key={cat.name} type="button" aria-pressed={active} onClick={() => { setCategory(active ? 'All' : cat.name); setPage(1); }}
                    className={cn('rounded-xl border p-3 text-left transition', active ? 'border-blue-300 bg-blue-50/60 ring-1 ring-blue-200' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50')}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"><span className={cn('h-2 w-2 rounded-full', CATEGORY_STYLE[cat.name]?.bar || CATEGORY_STYLE.Other.bar)} />{cat.name}</span>
                      <span className="text-[11px] font-semibold tabular-nums text-slate-500">{share.toFixed(1)}%</span>
                    </span>
                    <span className="mt-1.5 block truncate text-sm font-semibold tabular-nums text-slate-900"><Amt value={cat.value} /></span>
                    <span className="mt-0.5 block text-[11px] tabular-nums text-slate-500">{cat.qty.toLocaleString('en-GB')} pcs · {cat.lines.toLocaleString('en-GB')} lines</span>
                  </button>
                );
              })}
              {!categoryMix.length && !loading && <p className="text-xs text-slate-400">No stock in scope for this snapshot.</p>}
            </div>
            {packagingCount > 0 && <p className="mt-3 text-[10px] text-slate-400">{packagingCount} packaging lines are excluded from every total.</p>}
          </motion.section>

          {/* Stock list */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="search" aria-label="Search stock" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search serial number, SAP code, description or collection…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                {search && (
                  <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div role="tablist" aria-label="Category" className="relative flex flex-wrap rounded-lg bg-slate-100 p-1">
                  {['All', ...categoryMix.map(c => c.name)].map(name => (
                    <button key={name} type="button" role="tab" aria-selected={category === name} onClick={() => { setCategory(name); setPage(1); }}
                      className={cn('relative rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors', category === name ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
                      {category === name && <motion.span layoutId="inventory-category" className="absolute inset-0 rounded-md bg-white shadow-sm" transition={{ type: 'spring', damping: 30, stiffness: 260 }} />}
                      <span className="relative">{name}</span>
                    </button>
                  ))}
                </div>
                <span aria-live="polite" className="text-xs text-slate-400"><span className="font-semibold tabular-nums text-slate-700">{filtered.length.toLocaleString('en-GB')}</span> lines</span>
                <button type="button" onClick={exportCsv} disabled={!sorted.length}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
                  <FileDown className="h-4 w-4 text-slate-500" />Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] table-fixed text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    {([
                      ['item_code', 'Serial number', 'w-[150px] px-4'],
                      ['item_sku', 'SAP code', 'w-[110px] px-3'],
                      ['description', 'Description', 'px-3'],
                      ['category', 'Category', 'w-[170px] px-3'],
                      ['item_price', 'Retail price', 'w-[140px] px-3 text-right'],
                      ['qoh', 'QOH', 'w-[70px] px-3 text-right'],
                      ['amount', 'Total amount', 'w-[150px] px-4 text-right'],
                    ] as [SortKey, string, string][]).map(([key, label, cls]) => (
                      <th key={key} className={cn('py-3', cls)} aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" onClick={() => toggleSort(key)} className={cn('inline-flex items-center gap-1 uppercase hover:text-blue-600', key === 'amount' && 'text-blue-700')}>
                          {label}<SortIcon active={sortKey === key} dir={sortDir} />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && !items.length ? (
                    <tr><td colSpan={7} className="py-16 text-center text-slate-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading stock…</td></tr>
                  ) : !paged.length ? (
                    <tr><td colSpan={7} className="py-16 text-center">
                      {hasFilters ? (
                        <><p className="text-sm font-semibold text-slate-700">No stock lines match your filters</p>
                          <button type="button" onClick={clearFilters} className="mt-2 text-xs font-semibold text-blue-600 hover:underline">Clear filters</button></>
                      ) : (
                        <><p className="text-sm font-semibold text-slate-700">No stock in this snapshot</p>
                          <p className="mt-1 text-xs text-slate-400">Run Sync stock to save a new snapshot for {LOCATION_MAPPING[selectedLoc]}.</p></>
                      )}
                    </td></tr>
                  ) : (
                    <AnimatePresence initial={false}>
                      {paged.map((item, i) => {
                        const cat = categoryOf(item);
                        const collection = collectionOf(item);
                        return (
                          <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
                            className={cn('transition-colors hover:bg-slate-50/70', loading && 'opacity-60')}>
                            <td className="truncate px-4 py-2.5 font-mono text-[11px] font-semibold text-slate-900" title={item.item_code}>{item.item_code || '—'}</td>
                            <td className="truncate px-3 py-2.5 font-mono text-[11px] text-slate-500" title={item.item_sku}>{item.item_sku || '—'}</td>
                            <td className="truncate px-3 py-2.5 text-slate-700" title={item.description || item.item_name}>{item.description || item.item_name || '—'}</td>
                            <td className="px-3 py-2">
                              <span className={cn('inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', pillTone(cat))}>
                                <span className="h-1 w-1 shrink-0 rounded-full bg-current" />{cat}
                              </span>
                              {collection && <span className="mt-0.5 block truncate text-[10px] text-slate-400" title={collection}>{collection}</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{item.item_price ? <Amt value={item.item_price} /> : <span className="text-amber-600" title="No retail price">—</span>}</td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{item.qoh}</td>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900"><Amt value={item.amount} /></td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row">
              <label className="flex items-center gap-2">
                Rows per page
                <select aria-label="Rows per page" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none">
                  {PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">{sorted.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, sorted.length)}` : '0'} of {sorted.length.toLocaleString('en-GB')}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Previous</button>
                  <button type="button" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sync drawer */}
      <AnimatePresence>
        {showSync && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget && !syncing) setShowSync(false); }}>
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              role="dialog" aria-modal="true" aria-labelledby="sync-title" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <h2 id="sync-title" className="text-base font-semibold tracking-tight text-slate-900">Sync stock</h2>
                  <p className="mt-1 text-xs text-slate-500">Pull live stock from the Bvlgari inventory API and save it as a snapshot.</p>
                </div>
                <button type="button" onClick={() => setShowSync(false)} disabled={syncing} aria-label="Close" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Location</span>
                  <select value={syncLoc} onChange={e => setSyncLoc(e.target.value)} disabled={syncing}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                    {Object.entries(LOCATION_MAPPING).map(([code, name]) => <option key={code} value={code}>{name}{STORE_CODES.includes(code) ? '' : ` (${code})`}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Snapshot date</span>
                  <input type="date" value={syncDate} onChange={e => setSyncDate(e.target.value)} disabled={syncing}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                </label>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
                  The API returns today&apos;s stock. It is saved under the date above{snapshotIndex[syncLoc]?.includes(syncDate) ? ' and replaces the snapshot already saved for that date' : ''}.
                </div>
                {snapshotIndex[syncLoc]?.includes(syncDate) && (
                  <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{LOCATION_MAPPING[syncLoc]} already has a snapshot for {fmtSnapshot(syncDate)}.
                  </p>
                )}
                {syncError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700">{syncError}</p>}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                <button type="button" onClick={() => setShowSync(false)} disabled={syncing} className="h-9 rounded-lg px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
                <button type="button" onClick={runSync} disabled={syncing || !syncDate}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudDownload className="h-3.5 w-3.5" />}
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

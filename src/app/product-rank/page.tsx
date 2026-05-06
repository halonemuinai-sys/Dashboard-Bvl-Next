"use client";

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Package, LayoutGrid, Gem, ChevronUp, ChevronDown, ChevronsUpDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { dashboardService } from '@/services/dashboardService';

type RankData = Awaited<ReturnType<typeof dashboardService.getProductRank>>;
type SortDir  = 'asc' | 'desc';
type TabKey   = 'products' | 'categories' | 'collections' | 'catalogue';

const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STORES  = ['ALL', 'Plaza Indonesia', 'Plaza Senayan', 'Bali'];
const MEDALS  = ['🥇', '🥈', '🥉'];

const CAT_COLORS: Record<string, string> = {
  Jewelry:     'bg-amber-50 text-amber-700 border-amber-200',
  Watches:     'bg-blue-50 text-blue-700 border-blue-200',
  Accessories: 'bg-pink-50 text-pink-700 border-pink-200',
  Perfume:     'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-slate-300" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-blue-600" />
    : <ChevronDown className="w-3 h-3 text-blue-600" />;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ProductRankPage() {
  const now   = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(String(now.getFullYear()));
  const [store, setStore] = useState('ALL');
  const [data,  setData]  = useState<RankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,   setTab]   = useState<TabKey>('products');
  const [sortKey,  setSortKey]  = useState<'qty' | 'net'>('net');
  const [sortDir,  setSortDir]  = useState<SortDir>('desc');

  useEffect(() => {
    setLoading(true);
    dashboardService.getProductRank(month, Number(year), store)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month, year, store]);

  const toggleSort = (key: 'qty' | 'net') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Sort current tab rows
  const sortedProducts    = useMemo(() => {
    if (!data) return [];
    const arr = [...data.topSapVal]; // top by val, user can re-sort
    return arr.sort((a, b) => sortDir === 'asc'
      ? (sortKey === 'qty' ? a.qty - b.qty : a.net - b.net)
      : (sortKey === 'qty' ? b.qty - a.qty : b.net - a.net));
  }, [data, sortKey, sortDir]);

  const sortedCategories  = useMemo(() => {
    if (!data) return [];
    return [...data.topCat].sort((a, b) => sortDir === 'asc'
      ? (sortKey === 'qty' ? a.qty - b.qty : a.net - b.net)
      : (sortKey === 'qty' ? b.qty - a.qty : b.net - a.net));
  }, [data, sortKey, sortDir]);

  const sortedCollections = useMemo(() => {
    if (!data) return [];
    return [...data.topColl].sort((a, b) => sortDir === 'asc'
      ? (sortKey === 'qty' ? a.qty - b.qty : a.net - b.net)
      : (sortKey === 'qty' ? b.qty - a.qty : b.net - a.net));
  }, [data, sortKey, sortDir]);

  const sortedCatalogue   = useMemo(() => {
    if (!data) return [];
    return [...data.topCatalogue].sort((a, b) => sortDir === 'asc'
      ? (sortKey === 'qty' ? a.qty - b.qty : a.net - b.net)
      : (sortKey === 'qty' ? b.qty - a.qty : b.net - a.net));
  }, [data, sortKey, sortDir]);

  const maxNet = useMemo(() => {
    if (!data) return 1;
    const lists = [data.topSapVal, data.topCat, data.topColl, data.topCatalogue];
    return Math.max(1, ...lists.flatMap(l => l.map(r => r.net)));
  }, [data]);

  const kpi = data?.kpi;

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'products',    label: 'Products',    count: data?.topSapVal.length    ?? 0 },
    { key: 'categories',  label: 'Categories',  count: data?.topCat.length       ?? 0 },
    { key: 'collections', label: 'Collections', count: data?.topColl.length      ?? 0 },
    { key: 'catalogue',   label: 'Catalogue',   count: data?.topCatalogue.length ?? 0 },
  ];

  const ThSort = ({ col, children, className }: { col: 'qty' | 'net'; children: React.ReactNode; className?: string }) => (
    <th onClick={() => toggleSort(col)}
      className={cn('py-3 px-4 cursor-pointer select-none hover:text-blue-600 transition-colors', className)}>
      <span className="inline-flex items-center gap-1">
        {children} <SortIcon active={sortKey === col} dir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="space-y-6 p-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Rank</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Top SAP · Category · Collection · Catalogue — {MONTHS[month - 1]} {year}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month */}
          <select aria-label="Select month" value={month} onChange={e => setMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          {/* Year */}
          <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {['2026','2025','2024'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Store */}
          <select aria-label="Select store" value={store} onChange={e => setStore(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {STORES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Stores' : s}</option>)}
          </select>
          {loading && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
        </div>
      </div>

      {/* ── Section A: 4 KPI Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Top Product (Sales) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-emerald-600 to-emerald-400" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Top Product (Sales)</p>
              <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 font-mono mb-1 truncate leading-tight">
              {kpi?.topProductByVal?.sap ?? '—'}
            </h3>
            <p className="text-lg font-black text-emerald-600 font-mono leading-none">
              {kpi?.topProductByVal ? <Amt value={kpi.topProductByVal.net} short /> : '—'}
            </p>
            <p className="text-[9px] text-slate-400 mt-1">{kpi?.topProductByVal?.category ?? ''}</p>
          </div>
        </div>

        {/* Top Product (Qty) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-blue-600 to-blue-400" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Top Product (Qty)</p>
              <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-blue-500" />
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 font-mono mb-1 truncate leading-tight">
              {kpi?.topProductByQty?.sap ?? '—'}
            </h3>
            <p className="text-lg font-black text-blue-600 font-mono leading-none">
              {kpi?.topProductByQty ? `${kpi.topProductByQty.qty} pcs` : '—'}
            </p>
            <p className="text-[9px] text-slate-400 mt-1">{kpi?.topProductByQty?.category ?? ''}</p>
          </div>
        </div>

        {/* Top Category */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-violet-600 to-violet-400" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Top Category</p>
              <span className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <LayoutGrid className="w-4 h-4 text-violet-500" />
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1 truncate leading-tight">
              {kpi?.topCategory?.name ?? '—'}
            </h3>
            <p className="text-lg font-black text-violet-600 font-mono leading-none">
              {kpi?.topCategory ? <Amt value={kpi.topCategory.net} short /> : '—'}
            </p>
            <p className="text-[9px] text-slate-400 mt-1">{kpi?.topCategory ? `${kpi.topCategory.qty} pcs` : ''}</p>
          </div>
        </div>

        {/* Top Collection */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-amber-500 to-amber-300" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Top Collection</p>
              <span className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Gem className="w-4 h-4 text-amber-500" />
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1 truncate leading-tight">
              {kpi?.topCollection?.name ?? '—'}
            </h3>
            <p className="text-lg font-black text-amber-600 font-mono leading-none">
              {kpi?.topCollection ? <Amt value={kpi.topCollection.net} short /> : '—'}
            </p>
            <p className="text-[9px] text-slate-400 mt-1">{kpi?.topCollection ? `${kpi.topCollection.qty} pcs` : ''}</p>
          </div>
        </div>
      </div>

      {/* ── Section B+C: Tabs + Table ───────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

        {/* Tab nav */}
        <div className="px-5 pt-4 border-b border-slate-100 flex items-center gap-1 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all mb-2',
                tab === t.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              )}>
              {t.label}
              {t.count > 0 && (
                <span className={cn('ml-1.5 text-[10px]', tab === t.key ? 'text-slate-300' : 'text-slate-400')}>
                  ({t.count})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Memuat data...
          </div>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 shadow-sm z-10">
                <tr>
                  <th className="py-3 px-4 text-center w-10">#</th>

                  {tab === 'products' && <>
                    <th className="py-3 px-4">SAP Code</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Collection</th>
                  </>}
                  {tab === 'categories' && <th className="py-3 px-4">Category</th>}
                  {tab === 'collections' && <>
                    <th className="py-3 px-4">Collection</th>
                    <th className="py-3 px-4">Category</th>
                  </>}
                  {tab === 'catalogue' && <th className="py-3 px-4">Catalogue Code</th>}

                  <ThSort col="qty" className="text-center">Qty</ThSort>
                  <ThSort col="net" className="text-right">Net Sales</ThSort>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">

                {/* Products tab */}
                {tab === 'products' && sortedProducts.map((r, i) => (
                  <tr key={r.sap} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 text-center">
                      {i < 3 ? <span className="text-sm">{MEDALS[i]}</span>
                        : <span className="text-slate-300 font-bold">{i + 1}</span>}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-black text-slate-800">{r.sap}</td>
                    <td className="py-2.5 px-4">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border',
                        CAT_COLORS[r.category] || 'bg-slate-100 text-slate-600 border-slate-200')}>
                        {r.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 max-w-[160px] truncate">{r.collection}</td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-600">{r.qty}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="font-mono font-black text-slate-900"><Amt value={r.net} short /></span>
                      <ProgressBar value={r.net} max={maxNet} color="bg-emerald-400" />
                    </td>
                  </tr>
                ))}

                {/* Categories tab */}
                {tab === 'categories' && sortedCategories.map((r, i) => (
                  <tr key={r.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 text-center">
                      {i < 3 ? <span className="text-sm">{MEDALS[i]}</span>
                        : <span className="text-slate-300 font-bold">{i + 1}</span>}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border',
                        CAT_COLORS[r.name] || 'bg-slate-100 text-slate-600 border-slate-200')}>
                        {r.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-600">{r.qty}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="font-mono font-black text-slate-900"><Amt value={r.net} short /></span>
                      <ProgressBar value={r.net} max={maxNet} color="bg-violet-400" />
                    </td>
                  </tr>
                ))}

                {/* Collections tab */}
                {tab === 'collections' && sortedCollections.map((r, i) => (
                  <tr key={r.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 text-center">
                      {i < 3 ? <span className="text-sm">{MEDALS[i]}</span>
                        : <span className="text-slate-300 font-bold">{i + 1}</span>}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800 max-w-[200px] truncate">{r.name}</td>
                    <td className="py-2.5 px-4">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border',
                        CAT_COLORS[r.dominantCat] || 'bg-slate-100 text-slate-600 border-slate-200')}>
                        {r.dominantCat}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-600">{r.qty}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="font-mono font-black text-slate-900"><Amt value={r.net} short /></span>
                      <ProgressBar value={r.net} max={maxNet} color="bg-amber-400" />
                    </td>
                  </tr>
                ))}

                {/* Catalogue tab */}
                {tab === 'catalogue' && sortedCatalogue.map((r, i) => (
                  <tr key={r.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 text-center">
                      {i < 3 ? <span className="text-sm">{MEDALS[i]}</span>
                        : <span className="text-slate-300 font-bold">{i + 1}</span>}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{r.name}</td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-600">{r.qty}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="font-mono font-black text-slate-900"><Amt value={r.net} short /></span>
                      <ProgressBar value={r.net} max={maxNet} color="bg-rose-400" />
                    </td>
                  </tr>
                ))}

                {/* Empty state */}
                {!loading && data && (
                  (tab === 'products'    && sortedProducts.length    === 0) ||
                  (tab === 'categories'  && sortedCategories.length  === 0) ||
                  (tab === 'collections' && sortedCollections.length === 0) ||
                  (tab === 'catalogue'   && sortedCatalogue.length   === 0)
                ) && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                      Tidak ada data untuk periode ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

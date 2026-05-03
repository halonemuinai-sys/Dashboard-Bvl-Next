"use client";

import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { dashboardService } from '@/services/dashboardService';
import { Row, Summary, SortKey, SortDir, MONTHS, PAGE_SIZE } from './_types';
import TransactionSummary from './TransactionSummary';
import TransactionFilters from './TransactionFilters';
import TransactionTable from './TransactionTable';

export default function MonthlyTransactionsPage() {
  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear]   = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [rows, setRows]   = useState<Row[]>([]);

  // Filters
  const [search, setSearch]       = useState('');
  const [filterLoc, setFilterLoc] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterType, setFilterType] = useState('');

  // Sort + Pagination
  const [sortKey, setSortKey] = useState<SortKey>('transaction_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  // Inline editing
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [commEdits, setCommEdits] = useState<Record<number, string>>({});

  // Load data
  useEffect(() => {
    setPage(1);
    (async () => {
      setLoading(true);
      try {
        const data = await dashboardService.getTransactions(month, parseInt(year));
        setRows(data as Row[]);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [month, year]);

  useEffect(() => { setPage(1); }, [search, filterLoc, filterCat, filterType]);

  // Derived data
  const locations  = useMemo(() => [...new Set(rows.map(r => r.location).filter(Boolean))].sort(), [rows]);
  const categories = useMemo(() => [...new Set(rows.map(r => r.main_category).filter(Boolean))].sort(), [rows]);
  const types      = useMemo(() => [...new Set(rows.map(r => r.type).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      if (filterLoc  && r.location !== filterLoc)       return false;
      if (filterCat  && r.main_category !== filterCat)  return false;
      if (filterType && r.type !== filterType)           return false;
      if (q && !r.trans_no?.toLowerCase().includes(q)
            && !r.customer?.toLowerCase().includes(q)
            && !r.salesman?.toLowerCase().includes(q)
            && !r.collection?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, filterLoc, filterCat, filterType]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary: Summary = useMemo(() => ({
    totalNet:   filtered.reduce((s, r) => s + r.net_sales, 0),
    totalGross: filtered.reduce((s, r) => s + r.gross_sales, 0),
    totalDisc:  filtered.reduce((s, r) => s + r.val_disc, 0),
    totalQty:   filtered.reduce((s, r) => s + r.qty, 0),
    totalTrans: new Set(filtered.map(r => r.trans_no)).size,
  }), [filtered]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Inline edit handlers
  const flashSaved = (id: number) => {
    setSavedIds(prev => { const s = new Set(prev); s.add(id); return s; });
    setTimeout(() => setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s; }), 1800);
  };

  const saveType = async (id: number, newType: string) => {
    setSavingId(id);
    try {
      await dashboardService.updateTransaction(id, { type: newType });
      setRows(prev => prev.map(r => r.id === id ? { ...r, type: newType } : r));
      flashSaved(id);
    } catch (e) { console.error(e); }
    finally { setSavingId(null); }
  };

  const saveComm = async (id: number) => {
    const raw = commEdits[id];
    if (raw === undefined) return;
    const val = parseFloat(raw.replace(/[^0-9.-]/g, '')) || 0;
    const current = rows.find(r => r.id === id)?.comm ?? 0;
    if (val === current) { setCommEdits(prev => { const n = { ...prev }; delete n[id]; return n; }); return; }
    setSavingId(id);
    try {
      await dashboardService.updateTransaction(id, { comm: val });
      setRows(prev => prev.map(r => r.id === id ? { ...r, comm: val } : r));
      setCommEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
      flashSaved(id);
    } catch (e) { console.error(e); }
    finally { setSavingId(null); }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-slate-500 font-medium animate-pulse">Loading transactions...</p>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly Transactions</h1>
          </div>
          <p className="text-slate-500 text-sm">Detail per transaksi — {month} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <select aria-label="Select month" value={month} onChange={e => setMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
      </div>

      <TransactionSummary summary={summary} />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <TransactionFilters
          search={search}      onSearch={setSearch}
          filterLoc={filterLoc} onLoc={setFilterLoc}
          filterCat={filterCat} onCat={setFilterCat}
          filterType={filterType} onType={setFilterType}
          locations={locations} categories={categories} types={types}
          totalFiltered={filtered.length} page={page} totalPages={totalPages}
        />
        <TransactionTable
          paged={paged} sorted={sorted} filtered={filtered} summary={summary}
          sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}
          page={page} totalPages={totalPages} onPage={setPage}
          savingId={savingId} savedIds={savedIds}
          commEdits={commEdits}
          onCommEdit={(id, val) => setCommEdits(prev => ({ ...prev, [id]: val }))}
          onCommBlur={saveComm}
          onCommEscape={id => setCommEdits(prev => { const n = { ...prev }; delete n[id]; return n; })}
          onTypeChange={saveType}
        />
      </div>
    </div>
  );
}

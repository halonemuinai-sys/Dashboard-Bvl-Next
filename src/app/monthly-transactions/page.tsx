"use client";

import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Calendar as CalendarIcon, RefreshCw, Lock, LockOpen, ShieldAlert, FileDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  // Lock/unlock state — persisted per month+year in localStorage
  const lockKey = `monthtrans_locked_${month}_${year}`;
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  // Sync lock state when month/year changes
  useEffect(() => {
    const stored = localStorage.getItem(lockKey);
    // Default: locked (stored === null or 'locked')
    setIsUnlocked(stored === 'unlocked');
  }, [month, year, lockKey]);

  const handleLock = () => {
    localStorage.setItem(lockKey, 'locked');
    setIsUnlocked(false);
    setCommEdits({});
  };

  const handleUnlock = () => {
    const stored = localStorage.getItem(lockKey);
    if (stored === 'locked') {
      // Previously explicitly locked — require confirmation
      setShowUnlockConfirm(true);
    } else {
      localStorage.setItem(lockKey, 'unlocked');
      setIsUnlocked(true);
    }
  };

  const confirmUnlock = () => {
    localStorage.setItem(lockKey, 'unlocked');
    setIsUnlocked(true);
    setShowUnlockConfirm(false);
  };

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; transNo: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteRequest = (id: number, transNo: string) => setDeleteTarget({ id, transNo });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dashboardService.deleteTransaction(deleteTarget.id);
      setRows(prev => prev.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  };

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
    let clean = raw.replace(/[,.]00$/, '');
    clean = clean.replace(/[^0-9-]/g, '');
    const val = parseInt(clean, 10) || 0;
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

  const exportExcel = () => {
    // Helper: wrap cell in quotes, escape internal quotes — required for any field that may contain commas
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const fmtDate = (iso: string) => {
      const d = new Date(iso);
      return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
    };

    const headers = [
      'Trans.No.','Trans.Date','Customer Name','Salesman','Location',
      'SAP Code','Collection Code','Total Price','Disc %','Net Price',
      'Net Sales','Type Item','QTY','Card Commission','Catalogue_Code','Phone',
    ];

    const csvRows = sorted.map(r => {
      const discPct = r.gross_sales > 0
        ? ((r.val_disc / r.gross_sales) * 100).toFixed(2) + '%'
        : '0.00%';
      return [
        q(r.trans_no),
        q(fmtDate(r.transaction_date)),
        q(r.customer || ''),
        q(r.salesman || ''),
        q(r.location || ''),
        r.sap_code || '',
        q(r.collection_code || ''),   // quoted — e.g. "ACCS,3,1" won't break columns
        r.gross_sales,
        q(discPct),
        r.gross_sales - r.val_disc,
        r.net_sales,
        q(r.type || ''),
        r.qty,
        r.comm || 0,
        q(r.catalogue_code || ''),
        q(r.phone_no || ''),
      ].join(',');
    });

    // UTF-8 BOM so Excel/Google Sheets reads Indonesian characters correctly
    const csv = '﻿' + [headers.join(','), ...csvRows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `Transactions_${month}_${year}.csv`;
    a.click();
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

          {/* Download Excel */}
          <button type="button" onClick={exportExcel} disabled={sorted.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed">
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Lock / Unlock toggle */}
          {isUnlocked ? (
            <button type="button" onClick={handleLock}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100">
              <LockOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Unlocked — Klik untuk Lock</span>
            </button>
          ) : (
            <button type="button" onClick={handleUnlock}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Locked</span>
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Hapus Transaksi?</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{deleteTarget.transNo}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Transaksi ini akan dihapus permanen dari database. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all">
                Batal
              </button>
              <button type="button" onClick={confirmDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-all shadow-sm">
                {deleting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock confirmation dialog */}
      {showUnlockConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowUnlockConfirm(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Buka Kunci Edit?</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{month} {year}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Data commission bulan ini sudah pernah dikunci. Membuka kunci akan mengizinkan perubahan.
              Pastikan kamu punya otorisasi untuk mengedit data periode ini.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowUnlockConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all">
                Batal
              </button>
              <button type="button" onClick={confirmUnlock}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-sm">
                Ya, Buka Kunci
              </button>
            </div>
          </div>
        </div>
      )}

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
          onDelete={handleDeleteRequest}
          isUnlocked={isUnlocked}
        />
      </div>
    </div>
  );
}

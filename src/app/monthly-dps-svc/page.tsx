"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardList,
  Calendar as CalendarIcon,
  RefreshCw,
  Lock,
  LockOpen,
  ShieldAlert,
  FileDown,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService } from '@/services/dashboardService';
import Amt from '@/components/Amt';

interface Row {
  id: number;
  trans_no: string;
  transaction_date: string;
  customer: string;
  salesman: string;
  location: string;
  main_category: string;
  collection: string;
  sap_code: string;
  catalogue_code: string;
  collection_code: string;
  phone_no: string;
  gross_sales: number;
  val_disc: number;
  disc_pct: number;
  net_sales: number;
  qty: number;
  cost: number;
  comm: number;
  type: string;
}

interface Summary {
  totalTrans: number;
  totalQty: number;
  totalGross: number;
  totalDisc: number;
  totalNet: number;
}

type SortKey = 'transaction_date' | 'net_sales' | 'gross_sales' | 'qty' | 'val_disc';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 50;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const TYPE_COLORS: Record<string, string> = {
  SMI:     'bg-blue-100 text-blue-700 border-blue-200',
  Regular: 'bg-slate-100 text-slate-600 border-slate-200',
};

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-slate-300" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-blue-600" />
    : <ChevronDown className="w-3 h-3 text-blue-600" />;
}

function Th({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <th onClick={onClick}
      className={cn("py-3 px-4", onClick && "cursor-pointer select-none hover:text-blue-600 transition-colors", className)}>
      {children}
    </th>
  );
}

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

export default function MonthlyDpsSvcPage() {
  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear]   = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [rows, setRows]   = useState<Row[]>([]);
  const [activeTab, setActiveTab] = useState<'DPS' | 'SVC'>('DPS');

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
  const lockKey = `monthtrans_dpssvc_locked_${month}_${year}`;
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  // Sync lock state when month/year changes
  useEffect(() => {
    const stored = localStorage.getItem(lockKey);
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
      await dashboardService.deleteDpsSvcTransaction(deleteTarget.id);
      setRows(prev => prev.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  // Inline editing
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [commEdits, setCommEdits] = useState<Record<number, string>>({});

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getDpsSvcTransactions(month, parseInt(year));
      setRows(data as Row[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    setPage(1);
    loadData();
  }, [loadData]);

  useEffect(() => { setPage(1); }, [search, filterLoc, filterCat, filterType, activeTab]);

  // Derived data based on ACTIVE TAB ('DPS' or 'SVC')
  const tabFilteredRows = useMemo(() => {
    return rows.filter(r => r.collection === activeTab);
  }, [rows, activeTab]);

  const locations  = useMemo(() => [...new Set(tabFilteredRows.map(r => r.location).filter(Boolean))].sort(), [tabFilteredRows]);
  const categories = useMemo(() => [...new Set(tabFilteredRows.map(r => r.main_category).filter(Boolean))].sort(), [tabFilteredRows]);
  const types      = useMemo(() => [...new Set(tabFilteredRows.map(r => r.type).filter(Boolean))].sort(), [tabFilteredRows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tabFilteredRows.filter(r => {
      if (filterLoc  && r.location !== filterLoc)       return false;
      if (filterCat  && r.main_category !== filterCat)  return false;
      if (filterType && r.type !== filterType)           return false;
      if (q && !r.trans_no?.toLowerCase().includes(q)
            && !r.customer?.toLowerCase().includes(q)
            && !r.salesman?.toLowerCase().includes(q)
            && !r.collection?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tabFilteredRows, search, filterLoc, filterCat, filterType]);

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
      await dashboardService.updateDpsSvcTransaction(id, { type: newType });
      setRows(prev => prev.map(r => r.id === id ? { ...r, type: newType } : r));
      flashSaved(id);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const saveComm = async (id: number) => {
    const raw = commEdits[id];
    if (raw === undefined) return;
    let clean = raw.trim().replace(/[,.]00$/, '');
    clean = clean.replace(/[^0-9-]/g, '');
    const val = parseInt(clean, 10) || 0;
    const current = rows.find(r => r.id === id)?.comm ?? 0;
    if (val === current) {
      setCommEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
      return;
    }
    setSavingId(id);
    try {
      await dashboardService.updateDpsSvcTransaction(id, { card_comm: val });
      setRows(prev => prev.map(r => r.id === id ? { ...r, comm: val } : r));
      setCommEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
      flashSaved(id);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const exportExcel = () => {
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const fmtDateString = (iso: string) => {
      if (!iso) return '—';
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
        q(fmtDateString(r.transaction_date)),
        q(r.customer || ''),
        q(r.salesman || ''),
        q(r.location || ''),
        r.sap_code || '',
        q(r.collection_code || ''),
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

    const csv = '﻿' + [headers.join(','), ...csvRows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `${activeTab}_Transactions_${month}_${year}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="w-5 h-5 text-violet-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">DP & Service Transactions</h1>
          </div>
          <p className="text-slate-500 text-sm">Monitoring & card commission input for Down Payment (DPS) & Service (SVC)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-violet-600" />
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
              <option value="2023">2023</option>
            </select>
          </div>

          <button type="button" onClick={exportExcel} disabled={sorted.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed">
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>

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

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('DPS')}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer",
            activeTab === 'DPS'
              ? "border-violet-600 text-violet-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Down Payment (DPS)
        </button>
        <button
          onClick={() => setActiveTab('SVC')}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer",
            activeTab === 'SVC'
              ? "border-violet-600 text-violet-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Service (SVC)
        </button>
      </div>

      {/* Delete dialog */}
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

      {/* Unlock dialog */}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Net Sales</p>
          <h3 className="text-base font-black text-slate-800"><Amt value={summary.totalNet} /></h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Gross</p>
          <h3 className="text-base font-black text-slate-700"><Amt value={summary.totalGross} /></h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Discount</p>
          <h3 className="text-base font-black text-rose-500"><Amt value={summary.totalDisc} /></h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Quantity</p>
          <h3 className="text-base font-black text-slate-800">{summary.totalQty}</h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Transactions</p>
          <h3 className="text-base font-black text-violet-600">{summary.totalTrans}</h3>
        </div>
      </div>

      {/* Filters and Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              placeholder="Cari Trans No, Customer, Salesman..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-violet-500 focus:bg-white transition-all"
            />
          </div>
          
          <select aria-label="Select location" value={filterLoc} onChange={e => setFilterLoc(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-600 cursor-pointer">
            <option value="">Semua Lokasi</option>
            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>

          <select aria-label="Select type" value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-600 cursor-pointer">
            <option value="">Semua Type</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="ml-auto text-xs text-slate-400 font-medium">
            Menampilkan <span className="font-bold text-slate-700">{filtered.length}</span> data
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <Th onClick={() => toggleSort('transaction_date')}>
                  <span className="inline-flex items-center gap-1">Tgl <SortIcon col="transaction_date" sortKey={sortKey} sortDir={sortDir} /></span>
                </Th>
                <Th>Trans No</Th>
                <Th>Customer</Th>
                <Th>Salesman</Th>
                <Th>Lokasi</Th>
                <Th>Collection</Th>
                <Th className={isUnlocked ? 'text-amber-600' : 'text-slate-400'}>
                  <span className="inline-flex items-center gap-1">
                    Type {isUnlocked ? '✎' : <Lock className="w-2.5 h-2.5" />}
                  </span>
                </Th>
                <Th onClick={() => toggleSort('qty')} className="text-right">
                  <span className="inline-flex items-center gap-1">Qty <SortIcon col="qty" sortKey={sortKey} sortDir={sortDir} /></span>
                </Th>
                <Th onClick={() => toggleSort('gross_sales')} className="text-right">
                  <span className="inline-flex items-center gap-1">Gross <SortIcon col="gross_sales" sortKey={sortKey} sortDir={sortDir} /></span>
                </Th>
                <Th onClick={() => toggleSort('val_disc')} className="text-right">
                  <span className="inline-flex items-center gap-1">Disc <SortIcon col="val_disc" sortKey={sortKey} sortDir={sortDir} /></span>
                </Th>
                <Th className={cn('text-right', isUnlocked ? 'text-amber-600' : 'text-slate-400')}>
                  <span className="inline-flex items-center gap-1 justify-end">
                    Comm {isUnlocked ? '✎' : <Lock className="w-2.5 h-2.5" />}
                  </span>
                </Th>
                <Th onClick={() => toggleSort('net_sales')} className="text-right bg-violet-50/40">
                  <span className="inline-flex items-center gap-1 text-violet-600">Net Sales <SortIcon col="net_sales" sortKey={sortKey} sortDir={sortDir} /></span>
                </Th>
                {isUnlocked && <Th className="text-center text-rose-400 w-10"> </Th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400 text-sm">
                    Tidak ada transaksi {activeTab} ditemukan
                  </td>
                </tr>
              ) : paged.map((r, i) => {
                const isSaving = savingId === r.id;
                const isSaved  = savedIds.has(r.id);
                const commVal  = commEdits[r.id] ?? String(r.comm || '');

                return (
                  <tr key={i} className={cn("transition-colors text-xs", isSaved ? "bg-emerald-50/40" : "hover:bg-slate-50")}>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{fmtDate(r.transaction_date)}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-blue-600 font-bold">{r.trans_no}</td>
                    <td className="py-2.5 px-4 text-slate-700 max-w-[140px] truncate" title={r.customer}>{r.customer || '—'}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{r.salesman || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500">{r.location}</td>
                    <td className="py-2.5 px-4 text-slate-400 max-w-[120px] truncate" title={r.collection}>{r.collection || '—'}</td>

                    {/* Type editable */}
                    <td className="py-1.5 px-4">
                      {isUnlocked ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            aria-label="Edit type"
                            value={r.type || ''}
                            disabled={isSaving}
                            onChange={e => saveType(r.id, e.target.value)}
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none transition-all",
                              TYPE_COLORS[r.type] || 'bg-slate-100 text-slate-500 border-slate-200',
                              "hover:ring-1 hover:ring-amber-300 focus:ring-1 focus:ring-amber-400"
                            )}>
                            <option value="">—</option>
                            <option value="Regular">Regular</option>
                            <option value="SMI">SMI</option>
                          </select>
                          {isSaving && <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />}
                          {isSaved  && <Check  className="w-3 h-3 text-emerald-500" />}
                        </div>
                      ) : (
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                          TYPE_COLORS[r.type] || 'bg-slate-100 text-slate-500 border-slate-200'
                        )}>{r.type || '—'}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">{r.qty}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600"><Amt value={r.gross_sales} /></td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-400">{r.val_disc > 0 ? <Amt value={r.val_disc} /> : '—'}</td>

                    {/* Comm editable with Excel Auto-Correct */}
                    <td className="py-1.5 px-4 text-right">
                      {isUnlocked ? (
                        <input
                          type="text"
                          aria-label="Edit comm"
                          value={commVal}
                          disabled={isSaving}
                          onChange={e => {
                            let clean = e.target.value.trim().replace(/[,.]00$/, '');
                            clean = clean.replace(/[^0-9-]/g, '');
                            setCommEdits(prev => ({ ...prev, [r.id]: clean }));
                          }}
                          onBlur={() => saveComm(r.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') {
                              setCommEdits(prev => { const n = { ...prev }; delete n[r.id]; return n; });
                            }
                          }}
                          className={cn(
                            "w-28 text-right text-xs font-mono px-2 py-1 rounded-lg border outline-none transition-all",
                            commEdits[r.id] !== undefined
                              ? "border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-300"
                              : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 focus:border-amber-300 focus:bg-amber-50"
                          )}
                        />
                      ) : (
                        <span className="text-xs font-mono text-slate-600 flex items-center justify-end gap-1">
                          {r.comm > 0 ? <Amt value={r.comm} /> : <span className="text-slate-300">—</span>}
                          <Lock className="w-2.5 h-2.5 text-slate-300" />
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 bg-violet-50/30"><Amt value={r.net_sales} /></td>
                    {isUnlocked && (
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          title="Hapus transaksi"
                          onClick={() => handleDeleteRequest(r.id, r.trans_no)}
                          disabled={isSaving}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-30">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer/Paginator */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-500">
            Menampilkan <span className="font-bold text-slate-800">{(page - 1) * PAGE_SIZE + 1}</span> - <span className="font-bold text-slate-800">{Math.min(page * PAGE_SIZE, sorted.length)}</span> dari <span className="font-bold text-slate-800">{sorted.length}</span> transaksi
          </div>
          {totalPages > 1 && (
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 border rounded-xl disabled:opacity-40"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i + 1)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-xl border",
                    page === i + 1
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 border rounded-xl disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

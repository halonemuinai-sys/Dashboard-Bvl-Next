"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, CircleCheck, AlertCircle, RefreshCw, Lock, LockOpen, ShieldAlert, FileDown, Trash2,
  Check, ChevronDown, ChevronUp, ChevronsUpDown, Loader2, Search, X, HandCoins, Receipt, Link2, Users,
  Percent, Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService } from '@/services/dashboardService';
import Amt from '@/components/Amt';
import { useUserAccess } from '@/lib/user-access-context';
import { getDepositLinksAction } from '@/app/invoice-management/deposit-actions';
import type { DepositLink } from '@/lib/deposit-links';

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

type Tab = 'DPS' | 'SVC';
type SortKey = 'transaction_date' | 'net_sales' | 'gross_sales' | 'qty' | 'val_disc';
type SortDir = 'asc' | 'desc';
type Settlement = 'claimed' | 'unclaimed' | 'rb' | 'return' | 'unknown';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const PAGE_SIZES = [25, 50, 100];
const TABS: { key: Tab; label: string }[] = [{ key: 'DPS', label: 'Down payment (DPS)' }, { key: 'SVC', label: 'Service (SVC)' }];
const TYPE_PILL: Record<string, string> = {
  SMI: 'bg-blue-50 text-blue-700 ring-blue-200',
  Regular: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

// Mirrors the deposit-link rule (lib/deposit-links isSalesDeposit): RB-location DPs and
// non-positive quantities can never be linked to a sales invoice.
function settlementOf(row: Row, link: DepositLink | undefined, linkError: boolean): Settlement {
  if (link) return 'claimed';
  if (linkError) return 'unknown';
  if (/^RB/i.test(row.location?.trim() || '') || /^SI-RB/i.test(row.trans_no || '')) return 'rb';
  if (!(Number(row.qty) > 0)) return 'return';
  return 'unclaimed';
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 text-slate-300" />;
  return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-blue-600" /> : <ChevronDown className="h-3 w-3 text-blue-600" />;
}

function Pill({ tone, children, title }: { tone: 'emerald' | 'amber' | 'slate' | 'rose'; children: React.ReactNode; title?: string }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    slate: 'bg-slate-100 text-slate-500 ring-slate-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  };
  return (
    <span title={title} className={cn('inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', tones[tone])}>
      <span className="h-1 w-1 shrink-0 rounded-full bg-current" />
      <span className="truncate">{children}</span>
    </span>
  );
}

export interface DpSvcPanelProps {
  /** Controlled period (e.g. from Invoice Management). When omitted the panel owns its own month/year. */
  month?: string;
  year?: string;
  /** Embedded inside another page: no hero header and no period pickers. */
  embedded?: boolean;
  /** Bump to reload (e.g. after the host page ran Sync to API). Ignored until data has been loaded. */
  refreshKey?: number;
}

export default function DpSvcPanel({ month: controlledMonth, year: controlledYear, embedded = false, refreshKey = 0 }: DpSvcPanelProps) {
  const { isAdmin, role } = useUserAccess();
  // Card commission is finance data: only admin and finance see or edit it.
  const canViewCardComm = isAdmin || role === 'finance';
  const today = new Date();
  const [ownMonth, setMonth] = useState(MONTHS[today.getMonth()]);
  const [ownYear, setYear] = useState(String(today.getFullYear()));
  const month = controlledMonth ?? ownMonth;
  const year = controlledYear ?? ownYear;

  // "Load first": nothing is fetched until the user asks for it.
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('DPS');
  const [depositLinks, setDepositLinks] = useState<Record<string, DepositLink>>({});
  const [depositLinkError, setDepositLinkError] = useState('');

  const [search, setSearch] = useState('');
  const [filterLoc, setFilterLoc] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('transaction_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Lock/unlock — persisted per month+year in localStorage (separate from the invoice lock)
  const lockKey = `dps_svc_locked_${month}_${year}`;
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  useEffect(() => {
    setIsUnlocked(localStorage.getItem(lockKey) === 'unlocked');
  }, [lockKey]);

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; transNo: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [commEdits, setCommEdits] = useState<Record<number, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = (await dashboardService.getDpsSvcTransactions(month, parseInt(year))) as Row[];
      setRows(data);
      setPage(1);
      setDepositLinkError('');
      const numbers = [...new Set(data.filter(row => row.collection === 'DPS').map(row => row.trans_no))];
      const saved: DepositLink[] = [];
      for (let index = 0; index < numbers.length; index += 500) {
        const result = await getDepositLinksAction(numbers.slice(index, index + 500));
        if (!result.ok) { setDepositLinks({}); setDepositLinkError(result.error); return; }
        saved.push(...result.data);
      }
      setDepositLinks(Object.fromEntries(saved.map(link => [link.transNo, link])));
    } catch (e) {
      console.error(e);
      setRows([]);
      setDepositLinks({});
      setLoadError('DP & Service transactions could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  // After the first load, a new period or a host Sync reloads automatically.
  useEffect(() => {
    if (loaded) void loadData();
  }, [loaded, loadData, refreshKey]);

  const handleLock = () => { localStorage.setItem(lockKey, 'locked'); setIsUnlocked(false); setCommEdits({}); };
  const handleUnlock = () => {
    if (localStorage.getItem(lockKey) === 'locked') setShowUnlockConfirm(true);
    else { localStorage.setItem(lockKey, 'unlocked'); setIsUnlocked(true); }
  };
  const confirmUnlock = () => { localStorage.setItem(lockKey, 'unlocked'); setIsUnlocked(true); setShowUnlockConfirm(false); };

  const handleDeleteRequest = (id: number, transNo: string) => {
    if (!isAdmin || depositLinks[transNo] || (activeTab === 'DPS' && depositLinkError)) return;
    setDeleteTarget({ id, transNo });
  };
  const confirmDelete = async () => {
    if (!isAdmin || !deleteTarget) return;
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

  const tabRows = useMemo(() => rows.filter(r => r.collection === activeTab), [rows, activeTab]);
  const locations = useMemo(() => [...new Set(tabRows.map(r => r.location).filter(Boolean))].sort(), [tabRows]);
  const types = useMemo(() => [...new Set(tabRows.map(r => r.type).filter(Boolean))].sort(), [tabRows]);
  const tabCounts = useMemo(() => ({
    DPS: rows.filter(r => r.collection === 'DPS').length,
    SVC: rows.filter(r => r.collection === 'SVC').length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tabRows.filter(r => {
      if (filterLoc && r.location !== filterLoc) return false;
      if (filterType && r.type !== filterType) return false;
      if (q && !r.trans_no?.toLowerCase().includes(q)
            && !r.customer?.toLowerCase().includes(q)
            && !r.salesman?.toLowerCase().includes(q)
            && !depositLinks[r.trans_no]?.invoiceNo.toLowerCase().includes(q)
            && !r.collection?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tabRows, search, filterLoc, filterType, depositLinks]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  }), [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = Boolean(search || filterLoc || filterType);
  const clearFilters = () => { setSearch(''); setFilterLoc(''); setFilterType(''); setPage(1); };

  const kpi = useMemo(() => {
    const net = filtered.reduce((s, r) => s + r.net_sales, 0);
    const gross = filtered.reduce((s, r) => s + r.gross_sales, 0);
    const disc = filtered.reduce((s, r) => s + r.val_disc, 0);
    const qty = filtered.reduce((s, r) => s + r.qty, 0);
    const comm = filtered.reduce((s, r) => s + (r.comm || 0), 0);
    const withoutComm = filtered.filter(r => !r.comm).length;
    const transactions = new Set(filtered.map(r => r.trans_no)).size;
    const customers = new Set(filtered.map(r => r.customer?.trim().toLowerCase()).filter(Boolean)).size;
    const claimable = filtered.filter(r => ['claimed', 'unclaimed'].includes(settlementOf(r, depositLinks[r.trans_no], false)));
    const claimed = claimable.filter(r => depositLinks[r.trans_no]);
    const unclaimedNet = claimable.filter(r => !depositLinks[r.trans_no]).reduce((s, r) => s + r.net_sales, 0);
    const rbCount = filtered.filter(r => settlementOf(r, undefined, false) === 'rb').length;
    return { net, gross, disc, qty, comm, withoutComm, transactions, customers, claimable: claimable.length, claimed: claimed.length, unclaimedNet, rbCount };
  }, [filtered, depositLinks]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const flashSaved = (id: number) => {
    setSavedIds(prev => new Set(prev).add(id));
    setTimeout(() => setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s; }), 1800);
  };

  const saveType = async (id: number, newType: string) => {
    setSavingId(id);
    try {
      await dashboardService.updateDpsSvcTransaction(id, { type: newType });
      setRows(prev => prev.map(r => (r.id === id ? { ...r, type: newType } : r)));
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
    const val = parseInt(raw.trim().replace(/[,.]00$/, '').replace(/[^0-9-]/g, ''), 10) || 0;
    const current = rows.find(r => r.id === id)?.comm ?? 0;
    if (val === current) { setCommEdits(prev => { const n = { ...prev }; delete n[id]; return n; }); return; }
    setSavingId(id);
    try {
      await dashboardService.updateDpsSvcTransaction(id, { card_comm: val });
      setRows(prev => prev.map(r => (r.id === id ? { ...r, comm: val } : r)));
      setCommEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
      flashSaved(id);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const exportCsv = () => {
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const fmtDateString = (iso: string) => { if (!iso) return '—'; const d = new Date(iso); return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
    const headers = [
      'Trans.No.','Trans.Date','Customer Name','Salesman','Location',
      'SAP Code','Collection Code','Total Price','Disc %','Net Price',
      'Net Sales','Type Item','QTY', ...(canViewCardComm ? ['Card Commission'] : []),'Catalogue_Code','Phone',
    ];
    const csvRows = sorted.map(r => [
      q(r.trans_no), q(fmtDateString(r.transaction_date)), q(r.customer || ''), q(r.salesman || ''), q(r.location || ''),
      r.sap_code || '', q(r.collection_code || ''), r.gross_sales,
      q(r.gross_sales > 0 ? ((r.val_disc / r.gross_sales) * 100).toFixed(2) + '%' : '0.00%'),
      r.gross_sales - r.val_disc, r.net_sales, q(r.type || ''), r.qty,
      ...(canViewCardComm ? [r.comm || 0] : []),
      q(r.catalogue_code || ''), q(r.phone_no || ''),
    ].join(','));
    const csv = '﻿' + [headers.join(','), ...csvRows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `${activeTab}_Transactions_${month}_${year}.csv`;
    a.click();
  };

  const showSettlement = activeTab === 'DPS';
  const showActions = isUnlocked && isAdmin;
  const columnCount = 10 + (showSettlement ? 1 : 0) + (canViewCardComm ? 1 : 0) + (showActions ? 1 : 0);

  const kpis = [
    { icon: HandCoins, tone: 'bg-blue-50 text-blue-600', label: 'Net sales', value: <Amt value={kpi.net} />, sub: <>Gross <Amt value={kpi.gross} /></> },
    { icon: Receipt, tone: 'bg-slate-100 text-slate-600', label: 'Transactions', value: kpi.transactions.toLocaleString('en-GB'), sub: `${kpi.qty.toLocaleString('en-GB')} pcs · ${kpi.customers.toLocaleString('en-GB')} customers` },
    activeTab === 'DPS'
      ? { icon: Link2, tone: 'bg-emerald-50 text-emerald-600', label: 'Claimed DP', value: `${kpi.claimed} / ${kpi.claimable}`, sub: <>Unclaimed <Amt value={kpi.unclaimedNet} />{kpi.rbCount > 0 && ` · ${kpi.rbCount} RB not claimable`}</> }
      : { icon: Users, tone: 'bg-emerald-50 text-emerald-600', label: 'Customers served', value: kpi.customers.toLocaleString('en-GB'), sub: `${kpi.transactions.toLocaleString('en-GB')} service transactions` },
    canViewCardComm
      ? { icon: Percent, tone: 'bg-amber-50 text-amber-600', label: 'Card commission', value: <Amt value={kpi.comm} />, sub: `${kpi.withoutComm} rows without commission` }
      : { icon: Percent, tone: 'bg-rose-50 text-rose-600', label: 'Discount', value: <Amt value={kpi.disc} />, sub: kpi.gross > 0 ? `${((kpi.disc / kpi.gross) * 100).toFixed(1)}% of gross` : '0% of gross' },
  ];

  const actionButtons = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => void loadData()} disabled={loading} aria-label="Reload transactions and DP status" title="Reload"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40">
        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
      </button>
      <button type="button" onClick={exportCsv} disabled={sorted.length === 0}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
        <FileDown className="h-4 w-4 text-slate-500" />Download CSV
      </button>
      <button type="button" onClick={isUnlocked ? handleLock : handleUnlock}
        className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition',
          isUnlocked ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50')}>
        {isUnlocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        {isUnlocked ? 'Editing unlocked' : 'Locked'}
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Hero (standalone page only — inside Invoice Management the host owns period & sync) */}
      {!embedded && (
        <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 p-6 text-white">
          <motion.div aria-hidden animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-dashed border-white/10" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Operations</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">DP &amp; Service transactions</h1>
              <p className="mt-1 text-sm text-slate-300">Down payments and service orders with their settlement status and card commission.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Select month" value={month} onChange={e => setMonth(e.target.value)}
                className="h-9 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white outline-none [&>option]:text-slate-900">
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
                className="h-9 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white outline-none [&>option]:text-slate-900">
                {['2026', '2025', '2024', '2023'].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {loaded && (
                <button type="button" onClick={() => void loadData()} disabled={loading}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60">
                  <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />Reload
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {!loaded ? (
        /* Load-first placeholder: no request is made until the user asks for the data */
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Database className="h-5 w-5" /></span>
          <div>
            <p className="text-sm font-semibold text-slate-900">DP &amp; Service transactions — {month} {year}</p>
            <p className="mt-1 text-xs text-slate-500">Data is loaded on request to keep this page fast. After loading, changing the period reloads it automatically.</p>
          </div>
          <button type="button" onClick={() => setLoaded(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700">
            <ClipboardList className="h-4 w-4" />Load data
          </button>
        </div>
      ) : (
        <>
          {(loadError || depositLinkError) && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span className="flex-1">{loadError || depositLinkError}</span>
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
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{card.label}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-slate-900">{loading ? '…' : card.value}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{card.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* List */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div role="tablist" aria-label="Transaction type" className="relative flex rounded-lg bg-slate-100 p-1">
                {TABS.map(tab => (
                  <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key}
                    onClick={() => { setActiveTab(tab.key); setPage(1); setFilterLoc(''); setFilterType(''); }}
                    className={cn('relative rounded-md px-3 py-1.5 text-xs font-semibold transition-colors', activeTab === tab.key ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
                    {activeTab === tab.key && <motion.span layoutId="dps-svc-tab" className="absolute inset-0 rounded-md bg-white shadow-sm" transition={{ type: 'spring', damping: 30, stiffness: 260 }} />}
                    <span className="relative">{tab.label} <span className="tabular-nums text-slate-400">{tabCounts[tab.key]}</span></span>
                  </button>
                ))}
              </div>
              {actionButtons}
            </div>

            <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/40 px-4 py-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="search" aria-label="Search transactions" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search transaction, customer, advisor or linked invoice…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                {search && (
                  <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Filter store" value={filterLoc} onChange={e => { setFilterLoc(e.target.value); setPage(1); }}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400">
                  <option value="">All stores</option>
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
                <select aria-label="Filter type" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400">
                  <option value="">All types</option>
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {hasFilters && <button type="button" onClick={clearFilters} className="h-9 rounded-lg px-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">Clear filters</button>}
                <span aria-live="polite" className="text-xs text-slate-400"><span className="font-semibold tabular-nums text-slate-700">{filtered.length}</span> results</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] table-fixed text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="w-[84px] px-4 py-3"><button type="button" onClick={() => toggleSort('transaction_date')} className="inline-flex items-center gap-1 uppercase hover:text-blue-600">Date <SortIcon col="transaction_date" sortKey={sortKey} sortDir={sortDir} /></button></th>
                    <th className="w-[170px] px-3 py-3">Transaction</th>
                    <th className="w-[170px] px-3 py-3">Customer</th>
                    <th className="w-[160px] px-3 py-3">Advisor</th>
                    <th className="w-[140px] px-3 py-3">Store</th>
                    {showSettlement && <th className="w-[180px] px-3 py-3">Settlement</th>}
                    <th className="w-[96px] px-3 py-3">Type {!isUnlocked && <Lock className="ml-0.5 inline h-2.5 w-2.5" />}</th>
                    <th className="w-[60px] px-3 py-3 text-right"><button type="button" onClick={() => toggleSort('qty')} className="inline-flex items-center gap-1 uppercase hover:text-blue-600">Qty <SortIcon col="qty" sortKey={sortKey} sortDir={sortDir} /></button></th>
                    <th className="w-[120px] px-3 py-3 text-right"><button type="button" onClick={() => toggleSort('gross_sales')} className="inline-flex items-center gap-1 uppercase hover:text-blue-600">Gross <SortIcon col="gross_sales" sortKey={sortKey} sortDir={sortDir} /></button></th>
                    <th className="w-[100px] px-3 py-3 text-right"><button type="button" onClick={() => toggleSort('val_disc')} className="inline-flex items-center gap-1 uppercase hover:text-blue-600">Discount <SortIcon col="val_disc" sortKey={sortKey} sortDir={sortDir} /></button></th>
                    {canViewCardComm && <th className="w-[130px] px-3 py-3 text-right">Card comm {!isUnlocked && <Lock className="ml-0.5 inline h-2.5 w-2.5" />}</th>}
                    <th className="w-[130px] px-4 py-3 text-right"><button type="button" onClick={() => toggleSort('net_sales')} className="inline-flex items-center gap-1 uppercase text-blue-700 hover:text-blue-800">Net sales <SortIcon col="net_sales" sortKey={sortKey} sortDir={sortDir} /></button></th>
                    {showActions && <th className="w-[52px] px-2 py-3"><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && rows.length === 0 ? (
                    <tr><td colSpan={columnCount} className="py-16 text-center text-slate-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading transactions…</td></tr>
                  ) : paged.length === 0 ? (
                    <tr><td colSpan={columnCount} className="py-16 text-center">
                      {hasFilters ? (
                        <><p className="text-sm font-semibold text-slate-700">No transactions match your filters</p>
                          <button type="button" onClick={clearFilters} className="mt-2 text-xs font-semibold text-blue-600 hover:underline">Clear filters</button></>
                      ) : (
                        <><p className="text-sm font-semibold text-slate-700">No {activeTab === 'DPS' ? 'down payment' : 'service'} transactions for {month} {year}</p>
                          <p className="mt-1 text-xs text-slate-400">Run Sync to API if transactions are expected for this period.</p></>
                      )}
                    </td></tr>
                  ) : (
                    <AnimatePresence initial={false}>
                      {paged.map((r, i) => {
                        const isSaving = savingId === r.id;
                        const isSaved = savedIds.has(r.id);
                        const commVal = commEdits[r.id] ?? String(r.comm || '');
                        const link = depositLinks[r.trans_no];
                        const settlement = settlementOf(r, link, Boolean(depositLinkError));
                        return (
                          <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
                            className={cn('transition-colors', isSaved ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70')}>
                            <td className="px-4 py-2.5 tabular-nums text-slate-500">{fmtDate(r.transaction_date)}</td>
                            <td className="truncate px-3 py-2.5 font-mono text-[11px] font-semibold text-blue-700" title={r.trans_no}>{r.trans_no}</td>
                            <td className="truncate px-3 py-2.5 text-slate-700" title={r.customer}>{r.customer || '—'}</td>
                            <td className="truncate px-3 py-2.5 font-medium text-slate-800" title={r.salesman}>{r.salesman || '—'}</td>
                            <td className="truncate px-3 py-2.5 text-slate-500" title={r.location}>{r.location || '—'}</td>
                            {showSettlement && (
                              <td className="px-3 py-2.5">
                                {settlement === 'claimed' && link ? (
                                  <a href={`/invoice-management?invoice=${encodeURIComponent(link.invoiceNo)}&month=${Number(link.invoiceDate.slice(5, 7))}&year=${link.invoiceDate.slice(0, 4)}`}
                                    title={`DP applied to sales invoice ${link.invoiceNo}. Open the invoice.`} className="inline-flex max-w-full">
                                    <Pill tone="emerald"><CircleCheck className="mr-0.5 inline h-3 w-3" />{link.invoiceNo}</Pill>
                                  </a>
                                ) : settlement === 'unclaimed' ? (
                                  <Pill tone="amber" title="Not yet linked to a sales invoice">Unclaimed</Pill>
                                ) : settlement === 'rb' ? (
                                  <Pill tone="slate" title="RB-location DPs are excluded by the deposit-link rule and cannot be claimed">RB · not claimable</Pill>
                                ) : settlement === 'return' ? (
                                  <Pill tone="rose" title="Zero or negative quantity">Return</Pill>
                                ) : (
                                  <Pill tone="amber" title="DP settlement status could not be verified">Status unavailable</Pill>
                                )}
                              </td>
                            )}
                            <td className="px-3 py-2">
                              {isUnlocked ? (
                                <div className="flex items-center gap-1.5">
                                  <select aria-label="Edit type" value={r.type || ''} disabled={isSaving} onChange={e => saveType(r.id, e.target.value)}
                                    className={cn('cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-semibold outline-none ring-1 ring-inset focus:ring-amber-400', TYPE_PILL[r.type] || 'bg-slate-100 text-slate-500 ring-slate-200')}>
                                    <option value="">—</option><option value="Regular">Regular</option><option value="SMI">SMI</option>
                                  </select>
                                  {isSaving && <Loader2 className="h-3 w-3 animate-spin text-amber-500" />}
                                  {isSaved && <Check className="h-3 w-3 text-emerald-500" />}
                                </div>
                              ) : (
                                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', TYPE_PILL[r.type] || 'bg-slate-100 text-slate-500 ring-slate-200')}>{r.type || '—'}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{r.qty}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-600"><Amt value={r.gross_sales} /></td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-rose-500">{r.val_disc > 0 ? <Amt value={r.val_disc} /> : <span className="text-slate-300">—</span>}</td>
                            {canViewCardComm && (
                              <td className="px-3 py-2 text-right">
                                {isUnlocked ? (
                                  <input type="text" aria-label="Edit card commission" value={commVal} disabled={isSaving}
                                    onChange={e => setCommEdits(prev => ({ ...prev, [r.id]: e.target.value.trim().replace(/[,.]00$/, '').replace(/[^0-9-]/g, '') }))}
                                    onBlur={() => saveComm(r.id)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                      if (e.key === 'Escape') setCommEdits(prev => { const n = { ...prev }; delete n[r.id]; return n; });
                                    }}
                                    className={cn('h-7 w-full rounded-md border px-2 text-right text-xs tabular-nums outline-none transition',
                                      commEdits[r.id] !== undefined ? 'border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-300' : 'border-slate-200 bg-white text-slate-600 focus:border-blue-400')} />
                                ) : (
                                  <span className="tabular-nums text-slate-600">{r.comm > 0 ? <Amt value={r.comm} /> : <span className="text-slate-300">—</span>}</span>
                                )}
                              </td>
                            )}
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900"><Amt value={r.net_sales} /></td>
                            {showActions && (
                              <td className="px-2 py-2 text-center">
                                <button type="button" onClick={() => handleDeleteRequest(r.id, r.trans_no)}
                                  disabled={isSaving || Boolean(link) || (r.collection === 'DPS' && Boolean(depositLinkError))}
                                  title={link ? `Linked to invoice ${link.invoiceNo} — unlink it before deleting` : 'Delete transaction'}
                                  aria-label={`Delete ${r.trans_no}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            )}
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
                <span className="tabular-nums">
                  {sorted.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, sorted.length)}`} of {sorted.length}
                </span>
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

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
            <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} role="dialog" aria-modal="true" aria-labelledby="dps-delete-title"
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50"><Trash2 className="h-5 w-5 text-rose-600" /></span>
                <div>
                  <h3 id="dps-delete-title" className="text-sm font-semibold text-slate-900">Delete transaction?</h3>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">{deleteTarget.transNo}</p>
                </div>
              </div>
              <p className="mb-5 text-xs leading-relaxed text-slate-600">This transaction is permanently removed from the database. This cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="h-9 rounded-lg px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
                <button type="button" onClick={confirmDelete} disabled={deleting}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unlock confirmation */}
      <AnimatePresence>
        {showUnlockConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowUnlockConfirm(false); }}>
            <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} role="dialog" aria-modal="true" aria-labelledby="dps-unlock-title"
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50"><ShieldAlert className="h-5 w-5 text-amber-600" /></span>
                <div>
                  <h3 id="dps-unlock-title" className="text-sm font-semibold text-slate-900">Unlock editing?</h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">{month} {year}</p>
                </div>
              </div>
              <p className="mb-5 text-xs leading-relaxed text-slate-600">This period was locked before. Unlocking allows changes to type{canViewCardComm ? ' and card commission' : ''}. Make sure you are authorised to edit this period.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowUnlockConfirm(false)} className="h-9 rounded-lg px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
                <button type="button" onClick={confirmUnlock} className="h-9 rounded-lg bg-amber-600 px-4 text-xs font-semibold text-white hover:bg-amber-700">Unlock</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

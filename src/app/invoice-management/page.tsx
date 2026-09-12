'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Receipt,
  Calendar as CalendarIcon,
  RefreshCw,
  Lock,
  LockOpen,
  ShieldAlert,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  CloudDownload,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { useUserAccess } from '@/lib/user-access-context';
import {
  InvoiceHeader,
  InvoiceMeta,
  getInvoices,
  saveInvoiceMeta,
  updateInvoiceLocation,
  updateInvoiceItemComm,
  updateInvoiceItemType,
  deleteInvoice,
} from '@/services/dashboard/invoiceService';
import InvoiceTable from './InvoiceTable';
import InvoiceMetaModal from './InvoiceMetaModal';
import { exportInvoiceExecutiveReport } from './reports';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PAGE_SIZE = 25;

export default function InvoiceManagementPage() {
  const { assignedStore, isAdmin, userEmail } = useUserAccess();
  const isStoreScoped = Boolean(assignedStore && assignedStore !== 'ALL');

  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear] = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceHeader[]>([]);

  // Search and Filters
  const [search, setSearch] = useState('');
  const [filterLoc, setFilterLoc] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'multi' | 'single' | 'has_cb' | 'missing_cb'>('all');

  // Lock filterLoc to assignedStore if assigned
  useEffect(() => {
    if (isStoreScoped && assignedStore) {
      setFilterLoc(assignedStore);
    }
  }, [assignedStore, isStoreScoped]);

  // Expand / Collapse state
  const [expandedTransNos, setExpandedTransNos] = useState<Set<string>>(new Set());

  // Modal Meta state
  const [metaModalInvoice, setMetaModalInvoice] = useState<InvoiceHeader | null>(null);

  // Lock/unlock state — persisted per month+year in localStorage
  const lockKey = `invoice_locked_${month}_${year}`;
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

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

  // Delete invoice dialog
  const [deleteTargetTransNo, setDeleteTargetTransNo] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Inline edits and spinners
  const [commEdits, setCommEdits] = useState<Record<number, string>>({});
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [savedItemIds, setSavedItemIds] = useState<Set<number>>(new Set());
  const [savingInvoiceNo, setSavingInvoiceNo] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Sync to API
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    rawInserted?: number;
    normalizedInserted?: number;
    skippedDuplicates?: number;
    error?: string;
  } | null>(null);

  const handleSyncToApi = async () => {
    if (!isAdmin) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const monthNum = MONTHS.indexOf(month) + 1;
      const res = await fetch(`/api/cron/sync-sales?month=${monthNum}&year=${year}`, { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
      if (data.success) await fetchData();
    } catch (err: any) {
      setSyncResult({ success: false, error: err.message });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 6000);
    }
  };

  // Pagination
  const [page, setPage] = useState(1);

  // Load Invoices
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvoices(month, parseInt(year, 10));
      setInvoices(data);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, filterLoc, filterType]);

  // Derived filter options
  const locations = useMemo(() => {
    return [...new Set(invoices.map(i => i.location).filter(Boolean))].sort();
  }, [invoices]);

  // Filtered invoices
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter(inv => {
      if (filterLoc && inv.location !== filterLoc) return false;

      if (filterType === 'multi' && inv.item_count <= 1) return false;
      if (filterType === 'single' && inv.item_count > 1) return false;
      if (filterType === 'has_cb' && !inv.meta.cash_bill_no) return false;
      if (filterType === 'missing_cb' && Boolean(inv.meta.cash_bill_no)) return false;

      if (q) {
        const matchTrans = inv.trans_no?.toLowerCase().includes(q);
        const matchCust = inv.customer?.toLowerCase().includes(q);
        const matchSales = inv.salesman?.toLowerCase().includes(q);
        const matchCb = inv.meta?.cash_bill_no?.toLowerCase().includes(q);
        const matchDwa = inv.meta?.dwa_no?.toLowerCase().includes(q);
        const matchReason = inv.meta?.discount_given_reason?.toLowerCase().includes(q);
        const matchAfter = inv.meta?.after_sales_support?.toLowerCase().includes(q);
        const matchItems = inv.items?.some(it =>
          it.collection?.toLowerCase().includes(q) ||
          it.catalogue_code?.toLowerCase().includes(q) ||
          it.sap_code?.toLowerCase().includes(q)
        );

        if (!matchTrans && !matchCust && !matchSales && !matchCb && !matchDwa && !matchReason && !matchAfter && !matchItems) {
          return false;
        }
      }
      return true;
    });
  }, [invoices, search, filterLoc, filterType]);

  // KPI Summaries
  const summary = useMemo(() => {
    return {
      totalInvoices: filtered.length,
      multiItemCount: filtered.filter(i => i.item_count > 1).length,
      totalQty: filtered.reduce((s, i) => s + i.total_qty, 0),
      totalGross: filtered.reduce((s, i) => s + i.total_gross, 0),
      totalDisc: filtered.reduce((s, i) => s + i.total_disc, 0),
      totalComm: filtered.reduce((s, i) => s + i.total_comm, 0),
      totalNet: filtered.reduce((s, i) => s + i.total_net, 0),
    };
  }, [filtered]);

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedInvoices = useMemo(() => {
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filtered, page]);

  // Accordion Expand/Collapse All
  const toggleExpand = (transNo: string) => {
    setExpandedTransNos(prev => {
      const next = new Set(prev);
      if (next.has(transNo)) {
        next.delete(transNo);
      } else {
        next.add(transNo);
      }
      return next;
    });
  };

  const expandAllMultiItems = () => {
    const multiNos = filtered.filter(i => i.item_count > 1).map(i => i.trans_no);
    setExpandedTransNos(new Set(multiNos));
  };

  const collapseAll = () => {
    setExpandedTransNos(new Set());
  };

  // Quick save No CB from inline input
  const handleQuickSaveCashBill = async (transNo: string, val: string) => {
    try {
      await saveInvoiceMeta(transNo, { cash_bill_no: val }, userEmail);
      setInvoices(prev => prev.map(inv => {
        if (inv.trans_no === transNo) {
          return { ...inv, meta: { ...inv.meta, cash_bill_no: val } };
        }
        return inv;
      }));
    } catch (err) {
      console.error('Error quick saving cash bill:', err);
    }
  };

  // Meta modal save
  const handleSaveMeta = (transNo: string, updatedMeta: InvoiceMeta) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.trans_no === transNo) {
        return { ...inv, meta: updatedMeta };
      }
      return inv;
    }));
  };

  // Update Location for entire invoice
  const handleLocationChange = async (transNo: string, newLocation: string) => {
    if (!isAdmin) return;
    setSavingInvoiceNo(transNo);
    try {
      await updateInvoiceLocation(transNo, newLocation, userEmail);
      setInvoices(prev => prev.map(inv => {
        if (inv.trans_no === transNo) {
          return { ...inv, location: newLocation };
        }
        return inv;
      }));
    } catch (err) {
      console.error('Error updating location:', err);
    } finally {
      setSavingInvoiceNo(null);
    }
  };

  // Inline Item Comm Edit
  const flashSavedItem = (id: number) => {
    setSavedItemIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setSavedItemIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1800);
  };

  const handleItemCommBlur = async (itemId: number, transNo: string) => {
    const raw = commEdits[itemId];
    if (raw === undefined) return;
    const clean = raw.trim().replace(/[,.]00$/, '').replace(/[^0-9-]/g, '');
    const val = parseInt(clean, 10) || 0;

    const targetInvoice = invoices.find(inv => inv.trans_no === transNo);
    const targetItem = targetInvoice?.items.find(it => it.id === itemId);
    if (!targetItem || targetItem.comm === val) {
      setCommEdits(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      return;
    }

    setSavingItemId(itemId);
    try {
      await updateInvoiceItemComm(itemId, val, userEmail);
      setInvoices(prev => prev.map(inv => {
        if (inv.trans_no === transNo) {
          const updatedItems = inv.items.map(it => it.id === itemId ? { ...it, comm: val } : it);
          const newTotalComm = updatedItems.reduce((s, it) => s + (it.comm || 0), 0);
          return { ...inv, items: updatedItems, total_comm: newTotalComm };
        }
        return inv;
      }));
      setCommEdits(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      flashSavedItem(itemId);
    } catch (err) {
      console.error('Error updating commission:', err);
    } finally {
      setSavingItemId(null);
    }
  };

  // Inline Item Type Edit
  const handleItemTypeChange = async (itemId: number, transNo: string, newType: string) => {
    setSavingItemId(itemId);
    try {
      await updateInvoiceItemType(itemId, newType, userEmail);
      setInvoices(prev => prev.map(inv => {
        if (inv.trans_no === transNo) {
          const updatedItems = inv.items.map(it => it.id === itemId ? { ...it, type: newType } : it);
          return { ...inv, items: updatedItems };
        }
        return inv;
      }));
      flashSavedItem(itemId);
    } catch (err) {
      console.error('Error updating item type:', err);
    } finally {
      setSavingItemId(null);
    }
  };

  // Delete Invoice
  const handleConfirmDelete = async () => {
    if (!isAdmin || !deleteTargetTransNo) return;
    setDeleting(true);
    try {
      await deleteInvoice(deleteTargetTransNo, userEmail);
      setInvoices(prev => prev.filter(inv => inv.trans_no !== deleteTargetTransNo));
      setDeleteTargetTransNo(null);
    } catch (err) {
      console.error('Error deleting invoice:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Export CSV
  const exportCsv = () => {
    const q = (v: string | number | undefined | null) => `"${String(v || '').replace(/"/g, '""')}"`;

    const headers = [
      'Trans No',
      'Trans Date',
      'Cash Bill No',
      'Customer',
      'Sales Advisor',
      'Location',
      'Items Count',
      'SAP Code',
      'Catalogue Code',
      'Main Category',
      'Collection',
      'Qty',
      'Gross Sales',
      'Diskon',
      'Net Sales',
      'Item Comm',
      'Type',
      'Discount Given Reason',
      'After Sales Support',
      'DWA No',
      'Other Remarks',
    ];

    const lines: string[] = [];
    filtered.forEach(inv => {
      inv.items.forEach(it => {
        lines.push([
          q(inv.trans_no),
          q(inv.transaction_date ? inv.transaction_date.slice(0, 10) : ''),
          q(inv.meta.cash_bill_no),
          q(inv.customer),
          q(inv.salesman),
          q(inv.location),
          inv.item_count,
          q(it.sap_code),
          q(it.catalogue_code),
          q(it.main_category),
          q(it.collection),
          it.qty,
          it.gross_sales,
          it.val_disc,
          it.net_sales,
          it.comm || 0,
          q(it.type),
          q(inv.meta.discount_given_reason),
          q(inv.meta.after_sales_support),
          q(inv.meta.dwa_no),
          q(inv.meta.other_remarks),
        ].join(','));
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_Management_${month}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Executive Excel Report (Multi-Sheet)
  const handleExportExcel = async () => {
    if (filtered.length === 0) return;
    setExportingExcel(true);
    try {
      await exportInvoiceExecutiveReport(filtered, month, parseInt(year, 10));
    } catch (err) {
      console.error('Error generating executive Excel report:', err);
    } finally {
      setExportingExcel(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Memuat data Invoice & Faktur...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Invoice Management</h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white tracking-widest">
                  Header-Detail
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Kelola faktur, No Cash Bill (CB), rincian item, dan data penunjang transaksi — {month} {year}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <select
              aria-label="Select month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
            >
              {MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <select
              aria-label="Select year"
              value={year}
              onChange={e => setYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchData}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-2xs cursor-pointer"
            title="Muat ulang data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Sync to API — admin only */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleSyncToApi}
              disabled={syncing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold border shadow-2xs transition-all bg-violet-600 border-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title={`Sync data dari Bvlgari API untuk ${month} ${year}`}
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudDownload className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {syncing ? 'Syncing...' : 'Sync to API'}
              </span>
            </button>
          )}

          {/* Download Executive Excel (.xlsx) */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filtered.length === 0 || exportingExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold border shadow-2xs transition-all bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Download Laporan Lengkap 5 Sheet: Sales by Location, Crossing Sales, Invoices, Items, dan Compliance"
          >
            {exportingExcel ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {exportingExcel ? 'Membuat Excel...' : 'Export Excel (.xlsx)'}
            </span>
          </button>

          {/* Download Quick CSV */}
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border shadow-2xs transition-all bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Export data mentah format CSV"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Lock / Unlock Toggle */}
          {isUnlocked ? (
            <button
              type="button"
              onClick={handleLock}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold border shadow-2xs transition-all bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 cursor-pointer"
            >
              <LockOpen className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Unlocked — Klik Lock</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUnlock}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold border shadow-2xs transition-all bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Locked</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncResult && (
        <div className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border animate-in fade-in duration-300',
          syncResult.success
            ? 'bg-violet-50 border-violet-200 text-violet-800'
            : 'bg-red-50 border-red-200 text-red-800'
        )}>
          {syncResult.success
            ? <CheckCircle2 className="w-4 h-4 shrink-0 text-violet-600" />
            : <XCircle className="w-4 h-4 shrink-0 text-red-600" />}
          {syncResult.success
            ? `Sync selesai — ${syncResult.rawInserted ?? 0} baru dimasukkan, ${syncResult.normalizedInserted ?? 0} dinormalisasi, ${syncResult.skippedDuplicates ?? 0} duplikat dilewati`
            : `Sync gagal: ${syncResult.error ?? 'Unknown error'}`}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Invoices</p>
          <p className="text-base font-black text-slate-900 tracking-tight">
            {summary.totalInvoices.toLocaleString('id-ID')}
            <span className="text-xs font-semibold text-slate-400"> faktur</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Multi-Item Trans</p>
          <p className="text-base font-black text-blue-700 tracking-tight">
            {summary.multiItemCount.toLocaleString('id-ID')}
            <span className="text-xs font-semibold text-blue-400"> trans</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Qty</p>
          <p className="text-base font-black text-slate-800 tracking-tight">
            {summary.totalQty.toLocaleString('id-ID')}
            <span className="text-xs font-semibold text-slate-400"> pcs</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Gross Sales</p>
          <p className="text-base font-black text-slate-800 tracking-tight">
            <Amt value={summary.totalGross} compact />
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-0.5">Total Diskon</p>
          <p className="text-base font-black text-rose-600 tracking-tight">
            <Amt value={summary.totalDisc} compact />
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Total Comm</p>
          <p className="text-base font-black text-emerald-700 tracking-tight">
            <Amt value={summary.totalComm} compact />
          </p>
        </div>

        <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3.5 shadow-2xs col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Net Sales</p>
          <p className="text-base font-black text-blue-700 tracking-tight">
            <Amt value={summary.totalNet} compact />
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari No Invoice, No CB, Customer, Salesman, DWA..."
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Store Location */}
            <select
              aria-label="Filter store location"
              value={filterLoc}
              disabled={isStoreScoped}
              onChange={e => setFilterLoc(e.target.value)}
              className={cn(
                "text-xs font-semibold px-3 py-2 rounded-xl border outline-none cursor-pointer transition-all",
                filterLoc ? "border-blue-300 bg-blue-50/40 text-blue-800" : "border-slate-200 bg-white text-slate-700",
                isStoreScoped && "opacity-75 cursor-not-allowed bg-slate-50"
              )}
            >
              <option value="">Semua Lokasi ({locations.length})</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              aria-label="Filter transaction type"
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Semua Tipe Transaksi</option>
              <option value="multi">Hanya Multi-Item ({">"} 1 Item)</option>
              <option value="single">Single Item (1 Item)</option>
              <option value="has_cb">Ada No Cash Bill</option>
              <option value="missing_cb">Belum Ada No Cash Bill</option>
            </select>

            {/* Accordion Expand / Collapse Buttons */}
            <button
              type="button"
              onClick={expandAllMultiItems}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              title="Buka semua faktur yang memiliki lebih dari 1 item"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Buka Multi</span>
            </button>

            <button
              type="button"
              onClick={collapseAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              title="Tutup semua rincian item"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Tutup Semua</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <InvoiceTable
          invoices={pagedInvoices}
          expandedTransNos={expandedTransNos}
          toggleExpand={toggleExpand}
          isUnlocked={isUnlocked}
          isAdmin={isAdmin}
          onEditMeta={inv => setMetaModalInvoice(inv)}
          onQuickSaveCashBill={handleQuickSaveCashBill}
          onLocationChange={handleLocationChange}
          onItemCommEdit={(itemId, val) => setCommEdits(prev => ({ ...prev, [itemId]: val }))}
          onItemCommBlur={handleItemCommBlur}
          onItemTypeChange={handleItemTypeChange}
          onDeleteInvoice={transNo => setDeleteTargetTransNo(transNo)}
          savingItemId={savingItemId}
          commEdits={commEdits}
          savedItemIds={savedItemIds}
          savingInvoiceNo={savingInvoiceNo}
        />

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-bold text-slate-800">{pagedInvoices.length}</span> dari{' '}
            <span className="font-bold text-slate-800">{filtered.length}</span> faktur ({invoices.length} total)
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Sebelumnya
            </button>

            <span className="px-3 py-1.5 font-bold text-slate-700">
              Halaman {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Supporting Meta Modal */}
      <InvoiceMetaModal
        invoice={metaModalInvoice}
        isOpen={Boolean(metaModalInvoice)}
        onClose={() => setMetaModalInvoice(null)}
        onSave={handleSaveMeta}
        userEmail={userEmail}
      />

      {/* Unlock Confirmation Modal */}
      {showUnlockConfirm && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowUnlockConfirm(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Buka Kunci Edit?</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{month} {year}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Data transaksi faktur bulan ini sebelumnya telah dikunci. Membuka kunci akan mengizinkan modifikasi No CB, commission item, dan data penunjang.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowUnlockConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmUnlock}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-all shadow-2xs cursor-pointer"
              >
                Ya, Buka Kunci
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {deleteTargetTransNo && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setDeleteTargetTransNo(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Hapus Invoice?</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{deleteTargetTransNo}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Seluruh rincian item produk dan data penunjang di bawah nomor invoice ini akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteTargetTransNo(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Ya, Hapus Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

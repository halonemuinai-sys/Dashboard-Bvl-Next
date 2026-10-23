'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import {
  RefreshCw,
  ShieldAlert,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { runSalesSync } from '@/lib/run-sales-sync';
import DpSvcPanel from '@/app/monthly-dps-svc/DpSvcPanel';
import { filterInvoices } from '@/lib/invoice-report-filters';
import { useSearchParams } from 'next/navigation';
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
import { crmCosmoId } from '@/lib/crm-cosmo';
import InvoiceOverview from './InvoiceOverview';
import InvoiceDepositModal from './InvoiceDepositModal';
import InvoiceMetaModal from './InvoiceMetaModal';
import SalesInvoiceModal from './SalesInvoiceModal';
import PosPaymentModal from './PosPaymentModal';
import { exportInvoiceExecutiveReport } from './reports';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PAGE_SIZE = 25;

export default function InvoiceManagementPage() {
  return <Suspense fallback={<p className="p-8 text-sm text-slate-500">Loading invoices...</p>}><InvoiceManagementContent /></Suspense>;
}

function InvoiceManagementContent() {
  const params = useSearchParams();
  const { assignedStore, isAdmin, userEmail, canAccess } = useUserAccess();
  // DP & SVC tab reuses the standalone page's panel; shown only to users allowed to open that page.
  const canViewDpsSvc = canAccess('/monthly-dps-svc');
  const [activeView, setActiveView] = useState<'invoices' | 'dps'>('invoices');
  const [dpsRefreshKey, setDpsRefreshKey] = useState(0);
  const isStoreScoped = Boolean(assignedStore && assignedStore !== 'ALL');

  const today = new Date();
  const initialMonth = Number(params.get('month'));
  const initialYear = Number(params.get('year'));
  const [month, setMonth] = useState(MONTHS[Number.isInteger(initialMonth) && initialMonth >= 1 && initialMonth <= 12 ? initialMonth - 1 : today.getMonth()]);
  const [year, setYear] = useState(String(Number.isInteger(initialYear) && initialYear >= 2000 && initialYear <= 2100 ? initialYear : today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceHeader[]>([]);

  // Search and Filters
  const [search, setSearch] = useState(params.get('invoice') || '');
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

  // Sales Invoice View/Print Modal state
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<InvoiceHeader | null>(null);

  const [depositInvoice, setDepositInvoice] = useState<InvoiceHeader | null>(null);

  // POS Payment Breakdown Modal state
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<InvoiceHeader | null>(null);

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
  const [exportingDailyReport, setExportingDailyReport] = useState(false);
  const [dailyReportError, setDailyReportError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      const data = await runSalesSync(monthNum, Number(year));
      setSyncResult(data);
      if (data.success) {
        await fetchData();
        setDpsRefreshKey(key => key + 1);
      }
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
    setLoadError(null);
    try {
      const data = await getInvoices(month, parseInt(year, 10));
      setInvoices(data);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setInvoices([]);
      setLoadError('Invoices could not be loaded. Please refresh before exporting.');
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
  const filtered = useMemo(() => filterInvoices(invoices, {
    store: isStoreScoped ? assignedStore : filterLoc, search, filterType,
  }), [invoices, assignedStore, isStoreScoped, search, filterLoc, filterType]);

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

  // Whole-invoice Regular/SMI switch from the table row: updates every item that differs.
  const handleInvoiceTypeChange = async (transNo: string, newType: string) => {
    const invoice = invoices.find(inv => inv.trans_no === transNo);
    if (!invoice) return;
    setSavingInvoiceNo(transNo);
    try {
      for (const item of invoice.items) {
        if ((item.type || 'Regular') !== newType) await updateInvoiceItemType(item.id, newType, userEmail);
      }
      setInvoices(prev => prev.map(inv => inv.trans_no === transNo ? { ...inv, items: inv.items.map(it => ({ ...it, type: newType })) } : inv));
    } catch (err) {
      console.error('Error updating invoice type:', err);
      await fetchData();
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
  const handleItemTypeChange = async (itemId: number, transNo: string, newType: string): Promise<boolean> => {
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
      return true;
    } catch (err) {
      console.error('Error updating item type:', err);
      return false;
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
      'CRM Cosmo',
      'CA',
      'Served By',
      'Entitle',
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
          q(crmCosmoId(inv)),
          q(inv.salesman),
          q(inv.meta.served_by),
          q(inv.meta.entitle),
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

  const handleExportDailyReport = async () => {
    if (exportingDailyReport || loadError) return;
    setExportingDailyReport(true);
    setDailyReportError(null);
    try {
      const store = (isStoreScoped ? assignedStore : filterLoc) || 'ALL';
      const params = new URLSearchParams({ month: String(MONTHS.indexOf(month) + 1), year, store });
      const response = await fetch(`/api/invoice-management/export-daily-report?${params}`, { cache: 'no-store' });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(failure.error || 'The Daily Report could not be generated.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const filename = response.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''(.+)$/)?.[1];
      anchor.download = filename ? decodeURIComponent(filename) : `DAILY SALES REPORT ${month} ${year}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDailyReportError(error instanceof Error ? error.message : 'The Daily Report could not be generated.');
    } finally {
      setExportingDailyReport(false);
    }
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
        <p className="text-slate-500 font-medium animate-pulse">Loading invoices and payments…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {(loadError || dailyReportError) && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError || dailyReportError}</div>}
      <InvoiceOverview
        month={month} year={year} months={MONTHS} store={(isStoreScoped ? assignedStore : filterLoc) || 'All stores'}
        isAdmin={isAdmin} isUnlocked={isUnlocked} syncing={syncing} exporting={exportingDailyReport}
        exportingExecutive={exportingExcel} loadError={Boolean(loadError)} summary={summary}
        missingCashBills={filtered.filter(invoice => !invoice.meta.cash_bill_no?.trim()).length}
        onMonth={setMonth} onYear={setYear} onRefresh={fetchData} onSync={handleSyncToApi}
        onExport={handleExportDailyReport} onExecutive={handleExportExcel} onCsv={exportCsv}
        onLockToggle={isUnlocked ? handleLock : handleUnlock}
      />
      {/* Sync Result Banner */}
      {syncResult && (
        <div className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border animate-in fade-in duration-300',
          syncResult.success
            ? 'bg-blue-50 border-blue-200 text-blue-800'
            : 'bg-red-50 border-red-200 text-red-800'
        )}>
          {syncResult.success
            ? <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
            : <XCircle className="w-4 h-4 shrink-0 text-red-600" />}
          {syncResult.success
            ? `Sync complete — ${syncResult.rawInserted ?? 0} imported, ${syncResult.normalizedInserted ?? 0} normalized, ${syncResult.skippedDuplicates ?? 0} duplicates skipped`
            : `Sync failed: ${syncResult.error ?? 'Unknown error'}`}
        </div>
      )}

      {canViewDpsSvc && (
        <div role="tablist" aria-label="Invoice views" className="flex border-b border-slate-200">
          {([['invoices', 'Sales invoices'], ['dps', 'DP & Service']] as const).map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={activeView === key} onClick={() => setActiveView(key)}
              className={cn('px-5 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors cursor-pointer',
                activeView === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              {label}
            </button>
          ))}
        </div>
      )}

      {canViewDpsSvc && activeView === 'dps' && (
        <DpSvcPanel month={month} year={year} embedded refreshKey={dpsRefreshKey} />
      )}

      {/* Main Table Container */}
      {activeView === 'invoices' && <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div><div className="flex items-center gap-2.5"><h2 className="text-sm font-bold text-slate-900">Invoice register</h2><span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500">{filtered.length} invoices</span></div><p className="mt-1 text-xs text-slate-400">Expand an invoice to review its items, payments and supporting details.</p></div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={expandAllMultiItems} title="Expand invoices with multiple items" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-blue-600"><ChevronDown size={14} />Expand multi-item</button>
            <button type="button" onClick={collapseAll} title="Collapse all invoice items" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-blue-600"><ChevronUp size={14} />Collapse</button>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/40 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search invoices" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice, cash bill, customer or advisor…" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-xs placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Filter store location" value={filterLoc} disabled={isStoreScoped} onChange={e => setFilterLoc(e.target.value)} className="h-11 min-w-40 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-500 lg:flex-none">
              <option value="">All locations ({locations.length})</option>
              {isStoreScoped && assignedStore && !locations.includes(assignedStore) && <option value={assignedStore}>{assignedStore}</option>}
              {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            <select aria-label="Filter invoice type" value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)} className="h-11 min-w-40 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-blue-400 lg:flex-none">
              <option value="all">All invoices</option><option value="multi">Multiple items</option><option value="single">Single item</option><option value="has_cb">Cash bill recorded</option><option value="missing_cb">Cash bill missing</option>
            </select>
            {(search || filterType !== 'all' || (!isStoreScoped && filterLoc)) && <button type="button" onClick={() => { setSearch(''); setFilterType('all'); if (!isStoreScoped) setFilterLoc(''); }} className="h-11 rounded-xl px-3 text-xs font-semibold text-blue-600 hover:bg-blue-50">Clear filters</button>}
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
          onViewInvoice={inv => setSelectedInvoiceForView(inv)}
          onOpenPayment={inv => setSelectedInvoiceForPayment(inv)}
          onOpenDeposits={inv => setDepositInvoice(inv)}
          onQuickSaveCashBill={handleQuickSaveCashBill}
          onLocationChange={handleLocationChange}
          onItemCommEdit={(itemId, val) => setCommEdits(prev => ({ ...prev, [itemId]: val }))}
          onItemCommBlur={handleItemCommBlur}
          onItemTypeChange={handleItemTypeChange}
          onInvoiceTypeChange={handleInvoiceTypeChange}
          onDeleteInvoice={transNo => setDeleteTargetTransNo(transNo)}
          savingItemId={savingItemId}
          commEdits={commEdits}
          savedItemIds={savedItemIds}
          savingInvoiceNo={savingInvoiceNo}
        />

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{pagedInvoices.length}</span> of{' '}
            <span className="font-bold text-slate-800">{filtered.length}</span> matching invoices
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>

            <span className="px-3 py-1.5 font-bold text-slate-700">
              Page {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>}

      {depositInvoice && <InvoiceDepositModal key={depositInvoice.trans_no} invoice={depositInvoice} editable={isUnlocked} onClose={() => setDepositInvoice(null)} onChanged={links => {
        setInvoices(current => current.map(inv => inv.trans_no === depositInvoice.trans_no ? { ...inv, depositLinks: links } : inv));
        setDepositInvoice(current => current ? { ...current, depositLinks: links } : current);
      }} />}

      {/* Supporting Meta Modal */}
      <InvoiceMetaModal
        invoice={metaModalInvoice}
        isOpen={Boolean(metaModalInvoice)}
        onClose={() => setMetaModalInvoice(null)}
        onSave={handleSaveMeta}
        userEmail={userEmail}
      />

      {/* Sales Invoice Printable Modal */}
      <SalesInvoiceModal
        invoice={selectedInvoiceForView}
        isOpen={Boolean(selectedInvoiceForView)}
        onClose={() => setSelectedInvoiceForView(null)}
        onMetaSaved={handleSaveMeta}
        editable={isUnlocked}
        onItemTypeChange={handleItemTypeChange}
        onInvoiceUpdated={(updatedTransNo, newTotalComm) => {
          setInvoices(prev => prev.map(inv => {
            if (inv.trans_no === updatedTransNo) {
              const totalNet = inv.total_net || 1;
              const updatedItems = inv.items.map((it, idx) => {
                const isLast = idx === inv.items.length - 1;
                if (isLast) {
                  const allocatedSoFar = inv.items.slice(0, idx).reduce((acc, curr) => {
                    return acc + Math.round(newTotalComm * ((curr.net_sales || 0) / totalNet));
                  }, 0);
                  return { ...it, comm: newTotalComm - allocatedSoFar };
                }
                return { ...it, comm: Math.round(newTotalComm * ((it.net_sales || 0) / totalNet)) };
              });
              return {
                ...inv,
                total_comm: newTotalComm,
                items: updatedItems,
              };
            }
            return inv;
          }));
        }}
      />

      {/* POS Payment Breakdown & Card Comm Modal */}
      <PosPaymentModal
        invoice={selectedInvoiceForPayment}
        isOpen={Boolean(selectedInvoiceForPayment)}
        onClose={() => setSelectedInvoiceForPayment(null)}
        onSuccess={(updatedTransNo, newTotalComm) => {
          // Update local invoices state with new comm immediately
          setInvoices(prev => prev.map(inv => {
            if (inv.trans_no === updatedTransNo) {
              const totalNet = inv.total_net || 1;
              const updatedItems = inv.items.map((it, idx) => {
                const isLast = idx === inv.items.length - 1;
                if (isLast) {
                  const allocatedSoFar = inv.items.slice(0, idx).reduce((acc, curr) => {
                    return acc + Math.round(newTotalComm * ((curr.net_sales || 0) / totalNet));
                  }, 0);
                  return { ...it, comm: newTotalComm - allocatedSoFar };
                }
                return { ...it, comm: Math.round(newTotalComm * ((it.net_sales || 0) / totalNet)) };
              });
              return {
                ...inv,
                total_comm: newTotalComm,
                items: updatedItems,
              };
            }
            return inv;
          }));
        }}
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
                <h3 className="text-sm font-black text-slate-900">Enable invoice editing?</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{month} {year}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              This month was previously locked. Enabling editing allows changes to cash bill numbers, item commissions and supporting details.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowUnlockConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUnlock}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-all shadow-2xs cursor-pointer"
              >
                Enable editing
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
                <h3 className="text-sm font-black text-slate-900">Delete this invoice?</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{deleteTargetTransNo}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              All items and supporting details for this invoice will be permanently deleted. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteTargetTransNo(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

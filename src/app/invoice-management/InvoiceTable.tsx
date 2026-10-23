'use client';

import React, { useState } from 'react';
import { useUserAccess } from '@/lib/user-access-context';
import {
  ChevronDown,
  ChevronRight,
  Receipt,
  FileText,
  FileCheck2,
  FilePlus2,
  Lock,
  Trash2,
  Check,
  Loader2,
  Package,
  ShoppingBag,
  User,
  CreditCard,
  Link2,
  CircleCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import type { InvoiceHeader } from '@/services/dashboard/invoiceService';
import { crmCosmoId } from '@/lib/crm-cosmo';

interface Props {
  invoices: InvoiceHeader[];
  expandedTransNos: Set<string>;
  toggleExpand: (transNo: string) => void;
  isUnlocked: boolean;
  isAdmin: boolean;
  onEditMeta: (invoice: InvoiceHeader) => void;
  onViewInvoice: (invoice: InvoiceHeader) => void;
  onOpenPayment: (invoice: InvoiceHeader) => void;
  onOpenDeposits: (invoice: InvoiceHeader) => void;
  onQuickSaveCashBill: (transNo: string, val: string) => void;
  onLocationChange: (transNo: string, newLocation: string) => void;
  onItemCommEdit: (itemId: number, val: string) => void;
  onItemCommBlur: (itemId: number, transNo: string) => void;
  onItemTypeChange: (itemId: number, transNo: string, type: string) => unknown;
  onInvoiceTypeChange: (transNo: string, type: string) => void;
  onDeleteInvoice: (transNo: string) => void;
  savingItemId: number | null;
  commEdits: Record<number, string>;
  savedItemIds: Set<number>;
  savingInvoiceNo: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  SMI:     'bg-violet-50 text-violet-700 border-violet-200',
  Regular: 'bg-teal-50 text-teal-700 border-teal-200',
};

const STORE_COLORS: Record<string, string> = {
  'Plaza Indonesia': 'border-blue-100 bg-blue-50/80 text-blue-700',
  'Plaza Senayan': 'border-violet-100 bg-violet-50/80 text-violet-700',
  Bali: 'border-teal-100 bg-teal-50/80 text-teal-700',
  'Bali Boutique': 'border-teal-100 bg-teal-50/80 text-teal-700',
};

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

export default function InvoiceTable({
  invoices,
  expandedTransNos,
  toggleExpand,
  isUnlocked,
  isAdmin,
  onEditMeta,
  onViewInvoice,
  onOpenPayment,
  onOpenDeposits,
  onQuickSaveCashBill,
  onLocationChange,
  onItemCommEdit,
  onItemCommBlur,
  onItemTypeChange,
  onInvoiceTypeChange,
  onDeleteInvoice,
  savingItemId,
  commEdits,
  savedItemIds,
  savingInvoiceNo,
}: Props) {
  // Card commission is finance data: only admin and finance see the amounts.
  const { role } = useUserAccess();
  const canViewCardComm = isAdmin || role === 'finance';
  const [editingCbTransNo, setEditingCbTransNo] = useState<string | null>(null);
  const [cbInputVal, setCbInputVal] = useState('');

  const startEditCb = (transNo: string, currentVal: string) => {
    if (!isUnlocked) return;
    setEditingCbTransNo(transNo);
    setCbInputVal(currentVal || '');
  };

  const handleCbBlur = (transNo: string) => {
    onQuickSaveCashBill(transNo, cbInputVal.trim());
    setEditingCbTransNo(null);
  };

  return (
    <div role="region" aria-label="Invoice table, scroll horizontally for all columns" tabIndex={0} className="w-full min-w-0 max-w-full max-h-[70vh] overflow-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-blue-500">
      <table className="w-full text-left whitespace-nowrap">
        <thead className="sticky top-0 z-10 border-b border-blue-100 bg-linear-to-r from-slate-100 via-blue-50 to-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-600 shadow-xs">
          <tr>
            <th className="py-3 px-3 w-8"></th>
            <th className="py-3 px-4">Date</th>
            <th className="py-3 px-4">Invoice</th>
            <th className="py-3 px-4">Cash bill</th>
            <th className="py-3 px-4">Customer / Advisor</th>
            <th className={isUnlocked && isAdmin ? 'text-amber-600 py-3 px-4' : 'text-slate-400 py-3 px-4'}>
              <span className="inline-flex items-center gap-1">
                Store {isUnlocked && isAdmin ? '✎' : <Lock className="w-2.5 h-2.5" />}
              </span>
            </th>
            <th className={isUnlocked ? 'text-amber-600 py-3 px-4' : 'text-slate-400 py-3 px-4'}>
              <span className="inline-flex items-center gap-1">
                Type {isUnlocked ? '✎' : <Lock className="w-2.5 h-2.5" />}
              </span>
            </th>
            <th className="py-3 px-4 text-center">Item / Qty</th>
            <th className="py-3 px-4 text-right">Gross Sales</th>
            <th className="py-3 px-4 text-right">Discount</th>
            <th className="py-3 px-4 text-right text-emerald-700">{canViewCardComm ? 'Total Comm' : 'POS Payment'}</th>
            <th className="py-3 px-4 text-right bg-blue-100/40 text-blue-800">Net Sales</th>
            <th className="py-3 px-3 text-center">Details</th>
            {isAdmin && <th className="py-3 px-3 text-center text-rose-500 w-12">Delete</th>}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 text-xs">
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={isAdmin ? 14 : 13} className="py-16 text-center text-slate-400 text-sm">
                <Receipt size={28} strokeWidth={1.5} className="mx-auto mb-3 text-slate-300" />
                <p className="font-semibold text-slate-600">No matching invoices</p>
                <p className="mt-1 text-xs">Try another search, location or reporting period.</p>
              </td>
            </tr>
          ) : (
            invoices.map((inv, index) => {
              const isExpanded = expandedTransNos.has(inv.trans_no);
              const isSavingLoc = savingInvoiceNo === inv.trans_no;
              const cashBill = inv.meta.cash_bill_no?.trim();
              const hasMeta = Boolean(
                inv.meta.cash_bill_no ||
                inv.meta.discount_given_reason ||
                inv.meta.after_sales_support ||
                inv.meta.dwa_no ||
                inv.meta.other_remarks
              );

              return (
                <React.Fragment key={inv.trans_no}>
                  {/* Parent Invoice Row */}
                  <tr
                    className={cn(
                      "group transition-colors duration-150",
                      isExpanded
                        ? "bg-blue-50/70"
                        : index % 2 === 0 ? "bg-white hover:bg-blue-50/50" : "bg-slate-50/40 hover:bg-blue-50/50"
                    )}
                  >
                    {/* Expand Toggle */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpand(inv.trans_no)}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} invoice ${inv.trans_no}`}
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                          isExpanded
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-blue-50/70 text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                        )}
                        title={isExpanded ? "Collapse invoice items" : "Expand invoice items"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {fmtDate(inv.transaction_date)}
                    </td>

                    {/* Trans No */}
                    <td className="py-3 px-4">
                      <div className="flex min-w-52 flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(inv.trans_no)}
                          className="mb-1 flex w-full items-center gap-2 font-mono text-xs font-semibold text-slate-800 hover:text-blue-600"
                          aria-expanded={isExpanded}
                          title="Expand or collapse invoice items"
                        >
                          {inv.trans_no}
                          {inv.item_count > 1 && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 font-extrabold">
                              {inv.item_count} items
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDeposits(inv)}
                          aria-label={inv.depositLinks?.length ? `View ${inv.depositLinks.length} applied DP for ${inv.trans_no}` : `Link sales DP to ${inv.trans_no}`}
                          title={inv.depositLinks?.length ? `Applied DP: ${inv.depositLinks.map(dp => dp.transNo).join(', ')}` : 'Select sales down payments'}
                          className={cn('inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors', inv.depositLinks?.length ? 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100' : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100')}
                        >{inv.depositLinks?.length ? <CircleCheck size={13} /> : <Link2 size={13} />}DP{inv.depositLinks?.length ? ` (${inv.depositLinks.length})` : ''}</button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewInvoice(inv);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50/50 px-2 py-1 text-[10px] font-semibold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100/60"
                          title="View or print sales invoice"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View invoice</span>
                        </button>
                      </div>
                    </td>

                    {/* Cash Bill No (Inline editable / quick input) */}
                    <td className="py-3 px-4">
                      {editingCbTransNo === inv.trans_no ? (
                        <input
                          type="text"
                          aria-label={`Cash bill number for ${inv.trans_no}`}
                          autoFocus
                          value={cbInputVal}
                          onChange={e => setCbInputVal(e.target.value)}
                          onBlur={() => handleCbBlur(inv.trans_no)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleCbBlur(inv.trans_no);
                            if (e.key === 'Escape') setEditingCbTransNo(null);
                          }}
                          placeholder="Cash bill number…"
                          className="h-8 w-36 rounded-lg border border-teal-400 bg-white px-2.5 font-mono text-xs font-semibold text-teal-900 outline-none ring-2 ring-teal-100"
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={!isUnlocked}
                          aria-label={cashBill ? `Cash bill ${cashBill}${isUnlocked ? ', click to edit' : ''}` : isUnlocked ? `Add cash bill for ${inv.trans_no}` : `Cash bill missing for ${inv.trans_no}. Enable editing to add one.`}
                          onClick={() => startEditCb(inv.trans_no, inv.meta.cash_bill_no)}
                          className={cn(
                            "inline-flex min-h-7 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-default",
                            cashBill
                              ? "border-teal-200/80 bg-teal-50 text-teal-800 enabled:hover:bg-teal-100"
                              : isUnlocked
                              ? "border-dashed border-blue-200 bg-blue-50/60 text-blue-700 hover:border-blue-400 hover:bg-blue-100"
                              : "border-amber-200/70 bg-amber-50/70 text-amber-700"
                          )}
                          title={isUnlocked ? "Edit cash bill number" : "Enable editing to update cash bill"}
                        >
                          {cashBill ? <FileCheck2 size={13} /> : isUnlocked ? <FilePlus2 size={13} /> : <FileText size={13} />}
                          <span className={cashBill ? 'font-mono' : ''}>{cashBill || (isUnlocked ? 'Add cash bill' : 'Missing')}</span>
                        </button>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="min-w-44 max-w-56 px-4 py-4" title={`${inv.customer} · ${inv.salesman}`}>
                      <span className="block truncate font-semibold text-slate-800">{inv.customer || '—'}</span>
                      {crmCosmoId(inv) && <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500" title="CRM Cosmo ID">CRM Cosmo · {crmCosmoId(inv)}</span>}
                      <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400"><User size={11} />{inv.salesman || 'Unassigned'}</span>
                    </td>

                    {/* Location (Admin editable for whole invoice) */}
                    <td className="py-3 px-4">
                      {isUnlocked && isAdmin ? (
                        <div className="flex items-center gap-1">
                          <select
                            aria-label="Edit invoice location"
                            value={inv.location || ''}
                            disabled={isSavingLoc || Boolean(inv.depositLinks?.length)}
                            onChange={e => onLocationChange(inv.trans_no, e.target.value)}
                            className="text-[11px] font-bold px-2 py-0.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 cursor-pointer outline-none transition-all hover:bg-amber-100 focus:ring-1 focus:ring-amber-400 shadow-2xs"
                          >
                            <option value="Plaza Indonesia">Plaza Indonesia</option>
                            <option value="Plaza Senayan">Plaza Senayan</option>
                            <option value="Bali">Bali</option>
                            <option value="Head Office">Head Office</option>
                          </select>
                          {isSavingLoc && <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />}
                        </div>
                      ) : (
                        <span className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold', STORE_COLORS[inv.location] || 'border-slate-200 bg-slate-50 text-slate-600')}><span className="h-1 w-1 rounded-full bg-current opacity-60" />{inv.location || '—'}</span>
                      )}
                    </td>

                    {/* Regular / SMI for the whole invoice (Mixed when items differ) */}
                    <td className="py-3 px-4">
                      {(() => {
                        const types = [...new Set(inv.items.map(it => it.type || 'Regular'))];
                        const current = types.length === 1 ? types[0] : 'Mixed';
                        return isUnlocked ? (
                          <div className="flex items-center gap-1">
                            <select
                              aria-label={`Sales type for ${inv.trans_no}`}
                              value={current}
                              disabled={isSavingLoc}
                              onChange={e => onInvoiceTypeChange(inv.trans_no, e.target.value)}
                              className={cn('text-[11px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer outline-none transition-all focus:ring-1 focus:ring-amber-400 shadow-2xs', TYPE_COLORS[current] || 'border-amber-300 bg-amber-50 text-amber-900')}
                            >
                              {current === 'Mixed' && <option value="Mixed" disabled>Mixed</option>}
                              <option value="Regular">Regular</option>
                              <option value="SMI">SMI</option>
                            </select>
                            {isSavingLoc && <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />}
                          </div>
                        ) : (
                          <span className={cn('inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-semibold', TYPE_COLORS[current] || 'border-slate-200 bg-slate-50 text-slate-600')} title={current === 'Mixed' ? 'Items have different types. Expand the invoice to see each item.' : undefined}>{current}</span>
                        );
                      })()}
                    </td>

                    {/* Item Count & Qty */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50/70 px-2 py-1 text-[10px] font-semibold text-indigo-700">
                        <Package className="w-3 h-3 text-indigo-400" />
                        {inv.item_count} ({inv.total_qty} pcs)
                      </span>
                    </td>

                    {/* Gross Sales */}
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      <Amt value={inv.total_gross} />
                    </td>

                    {/* Discount */}
                    <td className="py-3 px-4 text-right font-mono text-rose-500">
                      {inv.total_disc > 0 ? <Amt value={inv.total_disc} /> : '—'}
                    </td>

                    {/* Total Commission (Sum of Items) */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      <div className="flex items-center justify-end gap-1.5">
                        {canViewCardComm && (inv.total_comm > 0 ? <Amt value={inv.total_comm} /> : <span className="text-slate-300 font-normal">—</span>)}
                        <button
                          type="button"
                          onClick={() => onOpenPayment(inv)}
                          aria-label={`Manage POS payments for ${inv.trans_no}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-teal-200/80 bg-teal-50 px-2 py-1.5 text-[10px] font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                          title="Manage POS payments and card commission"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>POS</span>
                        </button>
                      </div>
                    </td>

                    {/* Net Sales */}
                    <td className="border-l border-blue-100/50 bg-blue-50/40 py-3 px-4 text-right font-mono font-semibold text-blue-950">
                      <Amt value={inv.total_net} />
                    </td>

                    {/* Details Button */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onEditMeta(inv)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors",
                          hasMeta
                            ? "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"
                            : "border-violet-100 bg-violet-50/70 text-violet-700 hover:border-violet-200 hover:bg-violet-100"
                        )}
                        title="View supporting details: cash bill, discount reason, after-sales support, DWA and remarks"
                      >
                        <FileText className="w-3 h-3" />
                        {hasMeta ? (
                          <span className="inline-flex items-center gap-1">
                            Recorded <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </span>
                        ) : (
                          <span>Add details</span>
                        )}
                      </button>
                    </td>

                    {/* Trash Delete (Admin only) */}
                    {isAdmin && (
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteInvoice(inv.trans_no)}
                          disabled={Boolean(inv.depositLinks?.length)}
                          title={inv.depositLinks?.length ? 'Remove linked DP references before deleting' : 'Delete this invoice'}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>

                  {/* Sub-Table: Nested Breakdown of Items (when expanded) */}
                  {isExpanded && (
                    <tr className="bg-slate-50/90 border-b-2 border-slate-200">
                      <td colSpan={isAdmin ? 14 : 13} className="p-3 sm:px-8 py-4">
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                          
                          {/* Sub-table Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="w-4 h-4 text-blue-600" />
                              <h4 className="text-xs font-bold text-slate-800">
                                {inv.items.length} items · {inv.trans_no}
                              </h4>
                              {inv.meta.discount_given_reason && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-xs">
                                  Discount: {inv.meta.discount_given_reason}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="text-[11px] text-slate-400 font-mono">
                                Invoice subtotal: <strong className="text-blue-700"><Amt value={inv.total_net} /></strong>{canViewCardComm && <> · Total Comm: <strong className="text-emerald-700"><Amt value={inv.total_comm} /></strong></>}
                              </div>
                              <button
                                type="button"
                                onClick={() => onOpenPayment(inv)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
                                title="Manage POS payments and card commission Otomatis"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>POS payments</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onViewInvoice(inv)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-2xs transition-all cursor-pointer"
                                title="View and print invoice"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>View invoice</span>
                              </button>
                            </div>
                          </div>

                          {/* Inner Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                              <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <tr>
                                  <th className="py-2 px-3 w-8">No</th>
                                  <th className="py-2 px-3">SAP Code</th>
                                  <th className="py-2 px-3">Description / Catalogue</th>
                                  <th className="py-2 px-3">Category</th>
                                  <th className="py-2 px-3">Collection</th>
                                  <th className={cn("py-2 px-3", isUnlocked ? "text-amber-600" : "text-slate-400")}>
                                    Type {isUnlocked ? '✎' : '🔒'}
                                  </th>
                                  <th className="py-2 px-3 text-right">Qty</th>
                                  <th className="py-2 px-3 text-right">Gross Price</th>
                                  <th className="py-2 px-3 text-right">Discount</th>
                                  {canViewCardComm && (<th className={cn("py-2 px-3 text-right", isUnlocked ? "text-amber-600 font-bold" : "text-slate-500")}>
                                    Card Comm {isUnlocked ? '✎' : '🔒'}
                                  </th>)}
                                  <th className="py-2 px-3 text-right font-bold text-blue-700">Net Sales</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {inv.items.map((it, idx) => {
                                  const isSaving = savingItemId === it.id;
                                  const isSaved = savedItemIds.has(it.id);
                                  const commVal = commEdits[it.id] ?? String(it.comm || '');

                                  return (
                                    <tr
                                      key={it.id}
                                      className={cn(
                                        "transition-colors",
                                        isSaved ? "bg-emerald-50/50" : "hover:bg-slate-50/60"
                                      )}
                                    >
                                      <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600 font-semibold">{it.sap_code}</td>
                                      <td className="py-2 px-3 font-bold text-slate-800 max-w-[200px] truncate" title={it.catalogue_code}>
                                        {it.catalogue_code}
                                      </td>
                                      <td className="py-2 px-3 text-slate-600 text-[11px]">{it.main_category}</td>
                                      <td className="py-2 px-3 text-slate-500 text-[11px]">{it.collection || '—'}</td>

                                      {/* Type Selector (per item) */}
                                      <td className="py-1.5 px-3">
                                        {isUnlocked ? (
                                          <div className="flex items-center gap-1.5">
                                            <select
                                              aria-label="Edit item type"
                                              value={it.type || ''}
                                              disabled={isSaving}
                                              onChange={e => onItemTypeChange(it.id, inv.trans_no, e.target.value)}
                                              className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none transition-all",
                                                TYPE_COLORS[it.type] || 'bg-slate-100 text-slate-500 border-slate-200',
                                                "hover:ring-1 hover:ring-amber-300 focus:ring-1 focus:ring-amber-400"
                                              )}
                                            >
                                              <option value="Regular">Regular</option>
                                              <option value="SMI">SMI</option>
                                            </select>
                                            {isSaving && <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />}
                                            {isSaved && <Check className="w-3 h-3 text-emerald-500" />}
                                          </div>
                                        ) : (
                                          <span className={cn(
                                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                            TYPE_COLORS[it.type] || 'bg-slate-100 text-slate-500 border-slate-200'
                                          )}>
                                            {it.type || 'Regular'}
                                          </span>
                                        )}
                                      </td>

                                      <td className="py-2 px-3 text-right font-mono text-slate-700">{it.qty}</td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-600"><Amt value={it.gross_sales} /></td>
                                      <td className="py-2 px-3 text-right font-mono text-rose-500">{it.val_disc > 0 ? <Amt value={it.val_disc} /> : '—'}</td>

                                      {/* Comm Edit Field (per item, old method) — admin/finance only */}
                                      {canViewCardComm && (
                                      <td className={cn("py-1.5 px-3 text-right", (!commVal || commVal === '0') && "bg-emerald-50/40")}>
                                        {isUnlocked ? (
                                          <input
                                            type="text"
                                            aria-label="Edit item comm"
                                            placeholder="Commission…"
                                            value={commVal}
                                            disabled={isSaving}
                                            onChange={e => {
                                              let clean = e.target.value.trim().replace(/[,.]00$/, '');
                                              clean = clean.replace(/[^0-9-]/g, '');
                                              onItemCommEdit(it.id, clean);
                                            }}
                                            onBlur={() => onItemCommBlur(it.id, inv.trans_no)}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                            }}
                                            className={cn(
                                              "w-28 text-right text-xs font-mono px-2 py-0.5 rounded-lg border outline-none transition-all",
                                              commEdits[it.id] !== undefined
                                                ? "border-blue-400 bg-blue-50 text-blue-900 ring-1 ring-blue-300 font-bold"
                                                : (!commVal || commVal === '0')
                                                ? "border-emerald-300 bg-white text-emerald-900 font-medium placeholder:text-emerald-500/70"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:border-blue-400"
                                            )}
                                          />
                                        ) : (
                                          <span className="font-mono text-xs text-slate-700 font-medium">
                                            {it.comm > 0 ? <Amt value={it.comm} /> : <span className="text-slate-300">—</span>}
                                          </span>
                                        )}
                                      </td>
                                      )}

                                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                                        <Amt value={it.net_sales} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Receipt,
  FileText,
  Lock,
  Trash2,
  Check,
  Loader2,
  Package,
  Clock,
  Sparkles,
  ShoppingBag,
  User,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { InvoiceHeader, InvoiceItem } from '@/services/dashboard/invoiceService';

interface Props {
  invoices: InvoiceHeader[];
  expandedTransNos: Set<string>;
  toggleExpand: (transNo: string) => void;
  isUnlocked: boolean;
  isAdmin: boolean;
  onEditMeta: (invoice: InvoiceHeader) => void;
  onQuickSaveCashBill: (transNo: string, val: string) => void;
  onLocationChange: (transNo: string, newLocation: string) => void;
  onItemCommEdit: (itemId: number, val: string) => void;
  onItemCommBlur: (itemId: number, transNo: string) => void;
  onItemTypeChange: (itemId: number, transNo: string, type: string) => void;
  onDeleteInvoice: (transNo: string) => void;
  savingItemId: number | null;
  commEdits: Record<number, string>;
  savedItemIds: Set<number>;
  savingInvoiceNo: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  SMI:     'bg-blue-100 text-blue-700 border-blue-200',
  Regular: 'bg-slate-100 text-slate-600 border-slate-200',
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
  onQuickSaveCashBill,
  onLocationChange,
  onItemCommEdit,
  onItemCommBlur,
  onItemTypeChange,
  onDeleteInvoice,
  savingItemId,
  commEdits,
  savedItemIds,
  savingInvoiceNo,
}: Props) {
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
    <div className="overflow-x-auto">
      <table className="w-full text-left whitespace-nowrap">
        <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
          <tr>
            <th className="py-3 px-3 w-8"></th>
            <th className="py-3 px-4">Tgl</th>
            <th className="py-3 px-4">No Transaksi (Invoice)</th>
            <th className="py-3 px-4">No Cash Bill (CB)</th>
            <th className="py-3 px-4">Customer</th>
            <th className="py-3 px-4">Sales Advisor</th>
            <th className={isUnlocked && isAdmin ? 'text-amber-600 py-3 px-4' : 'text-slate-400 py-3 px-4'}>
              <span className="inline-flex items-center gap-1">
                Lokasi {isUnlocked && isAdmin ? '✎' : <Lock className="w-2.5 h-2.5" />}
              </span>
            </th>
            <th className="py-3 px-4 text-center">Item / Qty</th>
            <th className="py-3 px-4 text-right">Gross Sales</th>
            <th className="py-3 px-4 text-right">Diskon</th>
            <th className="py-3 px-4 text-right text-emerald-700">Total Comm</th>
            <th className="py-3 px-4 text-right bg-blue-50/40 text-blue-700">Net Sales</th>
            <th className="py-3 px-3 text-center">Data Penunjang</th>
            {isAdmin && <th className="py-3 px-3 text-center text-rose-500 w-12">Hapus</th>}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 text-xs">
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={isAdmin ? 14 : 13} className="py-16 text-center text-slate-400 text-sm">
                Tidak ada faktur transaksi ditemukan
              </td>
            </tr>
          ) : (
            invoices.map((inv) => {
              const isExpanded = expandedTransNos.has(inv.trans_no);
              const isSavingLoc = savingInvoiceNo === inv.trans_no;
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
                      "transition-colors group",
                      isExpanded
                        ? "bg-blue-50/40 border-l-4 border-l-blue-600"
                        : "hover:bg-slate-50/80"
                    )}
                  >
                    {/* Expand Toggle */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpand(inv.trans_no)}
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                          isExpanded
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                        )}
                        title={isExpanded ? "Tutup rincian item" : "Buka rincian item"}
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
                      <button
                        type="button"
                        onClick={() => toggleExpand(inv.trans_no)}
                        className="font-mono text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5"
                      >
                        {inv.trans_no}
                        {inv.item_count > 1 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 font-extrabold">
                            {inv.item_count} items
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Cash Bill No (Inline editable / quick input) */}
                    <td className="py-3 px-4">
                      {editingCbTransNo === inv.trans_no ? (
                        <input
                          type="text"
                          autoFocus
                          value={cbInputVal}
                          onChange={e => setCbInputVal(e.target.value)}
                          onBlur={() => handleCbBlur(inv.trans_no)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleCbBlur(inv.trans_no);
                            if (e.key === 'Escape') setEditingCbTransNo(null);
                          }}
                          placeholder="No CB..."
                          className="w-28 text-xs font-mono font-bold px-2 py-0.5 rounded-lg border border-emerald-400 bg-white text-emerald-900 outline-none shadow-2xs"
                        />
                      ) : (
                        <div
                          onClick={() => startEditCb(inv.trans_no, inv.meta.cash_bill_no)}
                          className={cn(
                            "cursor-pointer inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg transition-all",
                            inv.meta.cash_bill_no
                              ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/80 hover:bg-emerald-100"
                              : isUnlocked
                              ? "bg-slate-100 text-slate-400 border border-dashed border-slate-300 hover:border-emerald-400 hover:text-emerald-700"
                              : "text-slate-300"
                          )}
                          title={isUnlocked ? "Klik untuk edit No Cash Bill" : "Kunci terbuka untuk edit No CB"}
                        >
                          <Receipt className="w-3 h-3 text-emerald-600" />
                          {inv.meta.cash_bill_no || (isUnlocked ? '+ No CB' : '—')}
                        </div>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-[140px] truncate" title={inv.customer}>
                      {inv.customer || '—'}
                    </td>

                    {/* Salesman */}
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {inv.salesman || '—'}
                    </td>

                    {/* Location (Admin editable for whole invoice) */}
                    <td className="py-3 px-4">
                      {isUnlocked && isAdmin ? (
                        <div className="flex items-center gap-1">
                          <select
                            aria-label="Edit invoice location"
                            value={inv.location || ''}
                            disabled={isSavingLoc}
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
                        <span className="text-slate-600 font-medium text-[11px]">{inv.location || '—'}</span>
                      )}
                    </td>

                    {/* Item Count & Qty */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        <Package className="w-3 h-3 text-slate-400" />
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
                      {inv.total_comm > 0 ? <Amt value={inv.total_comm} /> : <span className="text-slate-300 font-normal">—</span>}
                    </td>

                    {/* Net Sales */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 bg-blue-50/40">
                      <Amt value={inv.total_net} />
                    </td>

                    {/* Data Penunjang Button */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onEditMeta(inv)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shadow-2xs",
                          hasMeta
                            ? "bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                            : "bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                        )}
                        title="Lihat / Edit Dokumen Penunjang (No CB, Alasan Diskon, After Sales, DWA, Remarks)"
                      >
                        <FileText className="w-3 h-3 text-indigo-600" />
                        {hasMeta ? (
                          <span className="inline-flex items-center gap-1">
                            Lengkap <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </span>
                        ) : (
                          <span>+ Data</span>
                        )}
                      </button>
                    </td>

                    {/* Trash Delete (Admin only) */}
                    {isAdmin && (
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteInvoice(inv.trans_no)}
                          title="Hapus seluruh faktur ini"
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
                                Rincian {inv.items.length} Barang pada Nota #{inv.trans_no}
                              </h4>
                              {inv.meta.discount_given_reason && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-xs">
                                  Diskon: {inv.meta.discount_given_reason}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Subtotal Nota: <strong className="text-blue-700"><Amt value={inv.total_net} /></strong> · Total Comm: <strong className="text-emerald-700"><Amt value={inv.total_comm} /></strong>
                            </div>
                          </div>

                          {/* Inner Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                              <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <tr>
                                  <th className="py-2 px-3 w-8">No</th>
                                  <th className="py-2 px-3">SAP Code</th>
                                  <th className="py-2 px-3">Deskripsi / Catalogue</th>
                                  <th className="py-2 px-3">Kategori</th>
                                  <th className="py-2 px-3">Koleksi</th>
                                  <th className={cn("py-2 px-3", isUnlocked ? "text-amber-600" : "text-slate-400")}>
                                    Type {isUnlocked ? '✎' : '🔒'}
                                  </th>
                                  <th className="py-2 px-3 text-right">Qty</th>
                                  <th className="py-2 px-3 text-right">Gross Price</th>
                                  <th className="py-2 px-3 text-right">Diskon</th>
                                  <th className={cn("py-2 px-3 text-right", isUnlocked ? "text-amber-600 font-bold" : "text-slate-500")}>
                                    Card Comm {isUnlocked ? '✎' : '🔒'}
                                  </th>
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

                                      {/* Comm Edit Field (per item, old method) */}
                                      <td className={cn("py-1.5 px-3 text-right", (!commVal || commVal === '0') && "bg-emerald-50/40")}>
                                        {isUnlocked ? (
                                          <input
                                            type="text"
                                            aria-label="Edit item comm"
                                            placeholder="Isi Comm..."
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

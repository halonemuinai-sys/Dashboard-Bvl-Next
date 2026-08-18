'use client';

import React from 'react';
import { Check, ChevronDown, ChevronUp, ChevronsUpDown, Loader2, Lock, Trash2, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { Row, SortKey, SortDir, Summary, TYPE_COLORS, PAGE_SIZE } from './_types';

interface Props {
  paged: Row[];
  sorted: Row[];
  filtered: Row[];
  summary: Summary;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  savingId: number | null;
  savedIds: Set<number>;
  commEdits: Record<number, string>;
  onCommEdit: (id: number, val: string) => void;
  onCommBlur: (id: number) => void;
  onCommEscape: (id: number) => void;
  onTypeChange: (id: number, type: string) => void;
  onLocationChange: (id: number, location: string) => void;
  onDelete: (id: number, transNo: string) => void;
  isUnlocked: boolean;
}

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
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const getStoreCardClass = (location: string) => {
  const loc = (location || '').toUpperCase();
  if (loc.includes('INDONESIA') || loc.includes('PI')) {
    return 'bg-gradient-to-r from-amber-50/80 to-orange-50/50 border-amber-200 text-amber-900';
  } else if (loc.includes('SENAYAN') || loc.includes('PS')) {
    return 'bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border-emerald-200 text-emerald-900';
  } else if (loc.includes('BALI')) {
    return 'bg-gradient-to-r from-sky-50/80 to-blue-50/50 border-sky-200 text-sky-900';
  }
  return 'bg-white border-slate-200 text-slate-900';
};

export default function TransactionTable({
  paged, sorted, filtered, summary,
  sortKey, sortDir, onSort,
  page, totalPages, onPage,
  savingId, savedIds, commEdits, onCommEdit, onCommBlur, onCommEscape, onTypeChange, onLocationChange, onDelete, isUnlocked,
}: Props) {
  const totalComm = filtered.reduce((s, r) => s + (r.comm || 0), 0);

  return (
    <>
      {/* ── MOBILE CARD VIEW (Visible on small screens < md) ── */}
      <div className="block md:hidden space-y-3 p-3">
        {paged.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-semibold bg-white rounded-2xl border border-slate-200 p-6">
            Tidak ada transaksi ditemukan
          </div>
        ) : (
          paged.map((r, i) => {
            const isSaving = savingId === r.id;
            const isSaved  = savedIds.has(r.id);
            const commVal  = commEdits[r.id] ?? String(r.comm || '');
            const cardStyle = getStoreCardClass(r.location);

            return (
              <div
                key={r.id || i}
                className={cn(
                  "border rounded-2xl p-4 space-y-3 shadow-xs transition-all relative overflow-hidden",
                  cardStyle,
                  isSaved && "ring-2 ring-emerald-400"
                )}
              >
                {/* Header Row: Trans No & Date */}
                <div className="flex justify-between items-start pr-8">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      {fmtDate(r.transaction_date)}
                    </span>
                    <h4 className="text-xs font-bold font-mono text-indigo-600 mt-0.5">{r.trans_no}</h4>
                  </div>

                  {/* Store Badge / Selector */}
                  {isUnlocked ? (
                    <select
                      aria-label="Edit location mobile"
                      value={r.location || ''}
                      disabled={isSaving}
                      onChange={e => onLocationChange(r.id, e.target.value)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-amber-300 bg-white text-amber-900 cursor-pointer outline-none shadow-2xs"
                    >
                      <option value="Plaza Indonesia">Plaza Indonesia</option>
                      <option value="Plaza Senayan">Plaza Senayan</option>
                      <option value="Bali">Bali</option>
                      <option value="Head Office">Head Office</option>
                    </select>
                  ) : (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 shadow-2xs">
                      {r.location || 'Store'}
                    </span>
                  )}
                </div>

                {/* Main Body: Customer & Salesman */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                      <User className="w-3 h-3 mr-1 text-slate-400" /> Customer
                    </p>
                    <p className="font-bold text-slate-800 truncate mt-0.5">{r.customer || '—'}</p>
                    {r.phone_no && <p className="text-[10px] text-slate-500 font-mono">{r.phone_no}</p>}
                  </div>

                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Salesman</p>
                    <p className="font-bold text-slate-800 truncate mt-0.5">{r.salesman || '—'}</p>
                  </div>
                </div>

                {/* Category & Collection */}
                <div className="flex items-center justify-between bg-white/70 backdrop-blur-2xs p-2.5 rounded-xl border border-slate-200/60 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-bold text-slate-800">{r.main_category}</span>
                    {r.collection && <span className="text-[10px] text-slate-500">({r.collection})</span>}
                  </div>
                  
                  {/* Type Selector / Badge */}
                  {isUnlocked ? (
                    <select
                      aria-label="Edit item type"
                      value={r.type || ''}
                      disabled={isSaving}
                      onChange={e => onTypeChange(r.id, e.target.value)}
                      className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none",
                        TYPE_COLORS[r.type] || 'bg-slate-100 text-slate-600 border-slate-200'
                      )}
                    >
                      <option value="">—</option>
                      <option value="Regular">Regular</option>
                      <option value="SMI">SMI</option>
                    </select>
                  ) : (
                    <span className={cn(
                      'text-[9px] font-bold px-2 py-0.5 rounded-full border',
                      TYPE_COLORS[r.type] || 'bg-slate-100 text-slate-600 border-slate-200'
                    )}>
                      {r.type || 'Regular'}
                    </span>
                  )}
                </div>

                {/* Financial Footer: Qty, Gross/Disc, Comm, Net Sales */}
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Net Sales ({r.qty} pcs)</p>
                    <p className="text-sm font-extrabold text-indigo-900 mt-0.5">
                      <Amt value={r.net_sales} />
                    </p>
                  </div>

                  {/* Commission Editable Field */}
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center justify-end">
                      Card Comm {isUnlocked ? '✎' : <Lock className="w-2.5 h-2.5 ml-1 text-slate-400" />}
                    </p>
                    {isUnlocked ? (
                      <input
                        type="text"
                        aria-label="Edit comm mobile"
                        value={commVal}
                        disabled={isSaving}
                        onChange={e => {
                          let clean = e.target.value.trim().replace(/[,.]00$/, '');
                          clean = clean.replace(/[^0-9-]/g, '');
                          onCommEdit(r.id, clean);
                        }}
                        onBlur={() => onCommBlur(r.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') onCommEscape(r.id);
                        }}
                        className="w-24 text-right text-xs font-mono font-bold px-2 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    ) : (
                      <p className="text-xs font-bold font-mono text-emerald-700 mt-0.5">
                        {r.comm > 0 ? <Amt value={r.comm} /> : <span className="text-slate-400">—</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Trash Icon Button - Always Visible */}
                <div className="absolute top-2.5 right-2.5">
                  <button
                    type="button"
                    title="Hapus transaksi ini"
                    onClick={() => onDelete(r.id, r.trans_no)}
                    disabled={isSaving}
                    className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-200 hover:bg-rose-100 transition-colors shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ── DESKTOP TABLE VIEW (Visible on screens >= md) ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
            <tr>
              <Th onClick={() => onSort('transaction_date')}>
                <span className="inline-flex items-center gap-1">Tgl <SortIcon col="transaction_date" sortKey={sortKey} sortDir={sortDir} /></span>
              </Th>
              <Th>Trans No</Th>
              <Th>Customer</Th>
              <Th>Salesman</Th>
              <Th className={isUnlocked ? 'text-amber-600' : 'text-slate-400'}>
                <span className="inline-flex items-center gap-1">
                  Lokasi {isUnlocked ? '✎' : <Lock className="w-2.5 h-2.5" />}
                </span>
              </Th>
              <Th>Kategori</Th>
              <Th>Koleksi</Th>
              <Th className={isUnlocked ? 'text-amber-600' : 'text-slate-400'}>
                <span className="inline-flex items-center gap-1">
                  Type {isUnlocked ? '✎' : <Lock className="w-2.5 h-2.5" />}
                </span>
              </Th>
              <Th onClick={() => onSort('qty')} className="text-right">
                <span className="inline-flex items-center gap-1">Qty <SortIcon col="qty" sortKey={sortKey} sortDir={sortDir} /></span>
              </Th>
              <Th onClick={() => onSort('gross_sales')} className="text-right">
                <span className="inline-flex items-center gap-1">Gross <SortIcon col="gross_sales" sortKey={sortKey} sortDir={sortDir} /></span>
              </Th>
              <Th onClick={() => onSort('val_disc')} className="text-right">
                <span className="inline-flex items-center gap-1">Disc <SortIcon col="val_disc" sortKey={sortKey} sortDir={sortDir} /></span>
              </Th>
              <Th className={cn('text-right', isUnlocked ? 'text-amber-600' : 'text-slate-400')}>
                <span className="inline-flex items-center gap-1 justify-end">
                  Comm {isUnlocked ? '✎' : <Lock className="w-2.5 h-2.5" />}
                </span>
              </Th>
              <Th onClick={() => onSort('net_sales')} className="text-right bg-blue-50/40">
                <span className="inline-flex items-center gap-1 text-blue-600">Net Sales <SortIcon col="net_sales" sortKey={sortKey} sortDir={sortDir} /></span>
              </Th>
              <Th className="text-center text-rose-500 w-12">Hapus</Th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-16 text-center text-slate-400 text-sm">
                  Tidak ada transaksi ditemukan
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

                  {/* Lokasi editable */}
                  <td className="py-1.5 px-4">
                    {isUnlocked ? (
                      <select
                        aria-label="Edit location"
                        value={r.location || ''}
                        disabled={isSaving}
                        onChange={e => onLocationChange(r.id, e.target.value)}
                        className="text-[11px] font-bold px-2 py-0.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 cursor-pointer outline-none transition-all hover:bg-amber-100 focus:ring-1 focus:ring-amber-400 shadow-2xs"
                      >
                        <option value="Plaza Indonesia">Plaza Indonesia</option>
                        <option value="Plaza Senayan">Plaza Senayan</option>
                        <option value="Bali">Bali</option>
                        <option value="Head Office">Head Office</option>
                      </select>
                    ) : (
                      <span className="text-slate-600 font-medium">{r.location || '—'}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-[10px] font-bold text-slate-600">{r.main_category}</span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 max-w-[120px] truncate" title={r.collection}>{r.collection || '—'}</td>

                  {/* Type editable */}
                  <td className="py-1.5 px-4">
                    {isUnlocked ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label="Edit type"
                          value={r.type || ''}
                          disabled={isSaving}
                          onChange={e => onTypeChange(r.id, e.target.value)}
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

                  {/* Comm editable */}
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
                          onCommEdit(r.id, clean);
                        }}
                        onBlur={() => onCommBlur(r.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter')  (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') onCommEscape(r.id);
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

                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 bg-blue-50/30"><Amt value={r.net_sales} /></td>

                  {/* Trash button always visible on desktop table */}
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      title="Hapus transaksi ini"
                      onClick={() => onDelete(r.id, r.trans_no)}
                      disabled={isSaving}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {paged.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
              <tr>
                <td colSpan={8} className="py-3 px-4 text-slate-400">
                  Total {filtered.length.toLocaleString('id-ID')} rows · {summary.totalTrans} transaksi
                </td>
                <td className="py-3 px-4 text-right font-mono">{summary.totalQty}</td>
                <td className="py-3 px-4 text-right font-mono"><Amt value={summary.totalGross} /></td>
                <td className="py-3 px-4 text-right font-mono text-rose-500"><Amt value={summary.totalDisc} /></td>
                <td className="py-3 px-4 text-right font-mono text-slate-500"><Amt value={totalComm} /></td>
                <td className="py-3 px-4 text-right font-mono text-blue-700 bg-blue-50/40"><Amt value={summary.totalNet} /></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Menampilkan {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} dari {sorted.length.toLocaleString('id-ID')}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onPage(1)} disabled={page === 1}
              className="px-2 py-1 rounded text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
            <button type="button" onClick={() => onPage(page - 1)} disabled={page === 1}
              className="px-2.5 py-1 rounded text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return (
                <button type="button" key={p} onClick={() => onPage(p)}
                  className={cn("w-7 h-7 rounded text-xs font-bold transition-colors",
                    p === page ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100")}>
                  {p}
                </button>
              );
            })}
            <button type="button" onClick={() => onPage(page + 1)} disabled={page === totalPages}
              className="px-2.5 py-1 rounded text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">›</button>
            <button type="button" onClick={() => onPage(totalPages)} disabled={page === totalPages}
              className="px-2 py-1 rounded text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
          </div>
        </div>
      )}
    </>
  );
}

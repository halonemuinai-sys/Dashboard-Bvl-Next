import { Check, ChevronDown, ChevronUp, ChevronsUpDown, Loader2, Lock, Trash2 } from 'lucide-react';
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
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

export default function TransactionTable({
  paged, sorted, filtered, summary,
  sortKey, sortDir, onSort,
  page, totalPages, onPage,
  savingId, savedIds, commEdits, onCommEdit, onCommBlur, onCommEscape, onTypeChange, onDelete, isUnlocked,
}: Props) {
  const totalComm = filtered.reduce((s, r) => s + (r.comm || 0), 0);

  return (
    <>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
            <tr>
              <Th onClick={() => onSort('transaction_date')}>
                <span className="inline-flex items-center gap-1">Tgl <SortIcon col="transaction_date" sortKey={sortKey} sortDir={sortDir} /></span>
              </Th>
              <Th>Trans No</Th>
              <Th>Customer</Th>
              <Th>Salesman</Th>
              <Th>Lokasi</Th>
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
              {isUnlocked && <Th className="text-center text-rose-400 w-10"> </Th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-16 text-center text-slate-400 text-sm">
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
                  <td className="py-2.5 px-4 text-slate-500">{r.location}</td>
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
                        onChange={e => onCommEdit(r.id, e.target.value)}
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
                  {isUnlocked && (
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        title="Hapus transaksi"
                        onClick={() => onDelete(r.id, r.trans_no)}
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
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
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

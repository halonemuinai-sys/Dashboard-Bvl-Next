'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ScanLine, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet, Lock, Search, X, Boxes, TrendingDown, TrendingUp, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lineStatus, summarizeOpname, type LineStatus, type OpnameLine } from '@/lib/stock-opname';
import { completeOpnameSessionAction, getOpnameSessionAction, scanOpnameCodeAction, setOpnameCountAction } from './actions';

type Line = OpnameLine & { id: number; counted_by: string | null; counted_at: string | null };
interface Session { id: number; title: string; store_name: string; categories: string[]; snapshot_date: string; status: 'in_progress' | 'completed'; created_by: string | null; created_at: string; completed_at: string | null; completed_by: string | null }
type Filter = 'all' | 'pending' | 'variance' | 'unexpected';

const STATUS: Record<LineStatus, { label: string; tone: string }> = {
  pending: { label: 'Not counted', tone: 'bg-slate-100 text-slate-500 ring-slate-200' },
  match: { label: 'Match', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  short: { label: 'Short', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  over: { label: 'Over', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  unexpected: { label: 'Not in system', tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
};
const fmt = (n: number) => n.toLocaleString('en-GB');
const fmtDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function OpnameSheet({ sessionId, onBack }: { sessionId: number; onBack: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState('');
  const [scan, setScan] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMsg, setScanMsg] = useState<{ text: string; tone: 'success' | 'warning' | 'error' } | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await getOpnameSessionAction(sessionId);
    if (!res.ok) { setError(res.error); return; }
    setSession(res.data.session as Session);
    setLines(res.data.lines as Line[]);
    setError('');
  }, [sessionId]);
  useEffect(() => { void load(); }, [load]);

  const editable = session?.status === 'in_progress';
  const totals = useMemo(() => summarizeOpname(lines), [lines]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter(line => {
      const status = lineStatus(line);
      if (filter === 'pending' && status !== 'pending') return false;
      if (filter === 'variance' && status !== 'short' && status !== 'over') return false;
      if (filter === 'unexpected' && status !== 'unexpected') return false;
      return !q || [line.item_code, line.item_sku, line.description, line.category].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [lines, filter, search]);

  const submitScan = async () => {
    const code = scan.trim();
    if (!code || scanBusy) return;
    setScanBusy(true);
    const res = await scanOpnameCodeAction(sessionId, code);
    setScanBusy(false);
    setScan('');
    if (!res.ok) setScanMsg({ text: res.error, tone: 'error' });
    else { setScanMsg({ text: res.data.message, tone: res.data.status }); await load(); }
    scanRef.current?.focus();
  };

  const saveCount = async (line: Line) => {
    const raw = edits[line.id];
    if (raw === undefined) return;
    const value = raw.trim() === '' ? null : Number(raw);
    setEdits(prev => { const next = { ...prev }; delete next[line.id]; return next; });
    if (value === line.counted_qty) return;
    if (value !== null && (!Number.isInteger(value) || value < 0)) { setScanMsg({ text: 'Enter a whole number of 0 or more.', tone: 'error' }); return; }
    const res = await setOpnameCountAction(sessionId, line.id, value);
    if (!res.ok) setScanMsg({ text: res.error, tone: 'error' }); else await load();
  };

  const complete = async () => {
    setBusy(true);
    const res = await completeOpnameSessionAction(sessionId);
    setBusy(false);
    setConfirmComplete(false);
    if (!res.ok) setScanMsg({ text: res.error, tone: 'error' }); else await load();
  };

  const exportExcel = async () => {
    if (!session) return;
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const sum = wb.addWorksheet('Summary');
    sum.columns = [{ width: 28 }, { width: 40 }];
    [['Stock opname', session.title], ['Boutique', session.store_name], ['Categories', session.categories.join(', ')], ['Stock snapshot', session.snapshot_date],
      ['Status', session.status === 'completed' ? `Completed ${session.completed_at ? fmtDate(session.completed_at) : ''} by ${session.completed_by || '—'}` : 'In progress'],
      ['Lines counted', `${totals.counted} of ${totals.total}`], ['System units', totals.systemUnits], ['Counted units', totals.countedUnits], ['Units short', totals.short], ['Units over', totals.over]]
      .forEach(row => sum.addRow(row));
    sum.getColumn(1).font = { bold: true };
    const ws = wb.addWorksheet('Count sheet');
    ws.columns = [
      { header: 'Code (serial / SAP)', width: 20 }, { header: 'SAP', width: 12 }, { header: 'Description', width: 42 }, { header: 'Category', width: 14 },
      { header: 'Snapshot qty', width: 12 }, { header: 'Out since snapshot', width: 16 }, { header: 'System qty', width: 12 }, { header: 'Counted', width: 10 },
      { header: 'Difference', width: 11 }, { header: 'Status', width: 14 }, { header: 'Note', width: 30 }, { header: 'Counted by', width: 26 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    for (const line of lines) {
      const status = lineStatus(line);
      const row = ws.addRow([line.item_code, line.item_sku || '', line.description || '', line.category || '', line.snapshot_qty, line.out_qty, line.system_qty,
        line.counted_qty ?? '', line.counted_qty === null ? '' : line.counted_qty - line.system_qty, STATUS[status].label, line.note || '', line.counted_by || '']);
      if (status === 'short') row.getCell(10).font = { color: { argb: 'FFBE123C' }, bold: true };
      if (status === 'over') row.getCell(10).font = { color: { argb: 'FFB45309' }, bold: true };
    }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 12 } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    const buffer = await wb.xlsx.writeBuffer();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = `Stock Opname ${session.store_name} ${session.snapshot_date} #${session.id}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (error) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" onClick={onBack} className="ml-2 font-semibold underline">Back</button></div>;
  if (!session) return <div className="flex h-[40vh] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading count sheet…</div>;

  const kpis = [
    { icon: ListChecks, tone: 'bg-blue-50 text-blue-600', label: 'Lines counted', value: `${fmt(totals.counted)} / ${fmt(totals.total)}`, sub: `${totals.total ? Math.round((totals.counted / totals.total) * 100) : 0}% complete` },
    { icon: Boxes, tone: 'bg-slate-100 text-slate-600', label: 'Units', value: `${fmt(totals.countedUnits)} / ${fmt(totals.systemUnits)}`, sub: 'Counted / system' },
    { icon: TrendingDown, tone: 'bg-rose-50 text-rose-600', label: 'Units short', value: fmt(totals.short), sub: 'Counted below system' },
    { icon: TrendingUp, tone: 'bg-amber-50 text-amber-600', label: 'Units over', value: fmt(totals.over), sub: 'Counted above system or not in system' },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <button type="button" onClick={onBack} aria-label="Back to sessions" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">{session.title}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{session.store_name} · {session.categories.join(', ')} · stock snapshot {fmtDate(session.snapshot_date)} minus sales since then</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset', editable ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200')}>
              {editable ? <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />In progress</> : <><Lock className="h-3 w-3" />Completed</>}
            </span>
            <button type="button" onClick={exportExcel} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><FileSpreadsheet className="h-4 w-4 text-emerald-600" />Export Excel</button>
            {editable && <button type="button" onClick={() => setConfirmComplete(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"><CheckCircle2 className="h-4 w-4" />Complete count</button>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', card.tone)}><card.icon className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{card.label}</p><p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-slate-900">{card.value}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{card.sub}</p></div>
          </motion.div>
        ))}
      </div>

      {editable && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
          <form onSubmit={e => { e.preventDefault(); void submitScan(); }} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="opname-scan" className="flex items-center gap-2 text-xs font-semibold text-slate-700"><ScanLine className="h-4 w-4 text-blue-600" />Scan barcode</label>
            <input id="opname-scan" ref={scanRef} autoFocus value={scan} onChange={e => setScan(e.target.value)} disabled={scanBusy} autoComplete="off"
              placeholder="Scan the serial number or SAP code, or type it and press Enter"
              className="h-10 flex-1 rounded-lg border border-blue-200 bg-white px-3 font-mono text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <button type="submit" disabled={scanBusy || !scan.trim()} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{scanBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Count'}</button>
          </form>
          <p className="mt-2 text-[11px] text-slate-500">Serial number = that piece is found. SAP code (non-serialised stock) = adds 1. Or type the counted quantity directly in the table.</p>
          <AnimatePresence>
            {scanMsg && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status"
                className={cn('mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium', scanMsg.tone === 'success' ? 'bg-emerald-50 text-emerald-800' : scanMsg.tone === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800')}>
                {scanMsg.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{scanMsg.text}
              </motion.p>
            )}
          </AnimatePresence>
        </section>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center">
          <div role="tablist" aria-label="Filter lines" className="relative flex flex-wrap rounded-lg bg-slate-100 p-1">
            {([['all', 'All'], ['pending', 'Not counted'], ['variance', 'Variance'], ['unexpected', 'Not in system']] as const).map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className={cn('relative rounded-md px-3 py-1 text-[11px] font-semibold', filter === key ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
                {filter === key && <motion.span layoutId="opname-filter" className="absolute inset-0 rounded-md bg-white shadow-sm" transition={{ type: 'spring', damping: 30, stiffness: 260 }} />}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" aria-label="Search lines" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code, SAP or description…" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <span aria-live="polite" className="text-xs text-slate-400"><span className="font-semibold tabular-nums text-slate-700">{fmt(filtered.length)}</span> lines</span>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full min-w-[1020px] table-fixed text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-[130px] px-4 py-3">Code</th><th className="w-[90px] px-3 py-3">SAP</th><th className="px-3 py-3">Description</th><th className="w-[100px] px-3 py-3">Category</th>
                <th className="w-[80px] px-3 py-3 text-right">Snapshot</th><th className="w-[60px] px-3 py-3 text-right">Out</th><th className="w-[70px] px-3 py-3 text-right">System</th>
                <th className="w-[100px] px-3 py-3 text-right">Counted</th><th className="w-[60px] px-3 py-3 text-right">Diff</th><th className="w-[110px] px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!filtered.length ? (
                <tr><td colSpan={10} className="py-14 text-center text-sm text-slate-500">No lines for this filter.</td></tr>
              ) : filtered.map(line => {
                const status = lineStatus(line);
                const diff = line.counted_qty === null ? null : line.counted_qty - line.system_qty;
                return (
                  <tr key={line.id} className={cn('hover:bg-slate-50/70', status === 'short' && 'bg-rose-50/30', status === 'over' && 'bg-amber-50/30')}>
                    <td className="truncate px-4 py-2 font-mono text-[11px] font-semibold text-slate-900" title={line.item_code}>{line.item_code}</td>
                    <td className="truncate px-3 py-2 font-mono text-[11px] text-slate-500">{line.item_sku || '—'}</td>
                    <td className="truncate px-3 py-2 text-slate-700" title={line.description || ''}>{line.description || '—'}</td>
                    <td className="truncate px-3 py-2 text-slate-500">{line.category || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">{line.snapshot_qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">{line.out_qty || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{line.system_qty}</td>
                    <td className="px-3 py-1.5 text-right">
                      {editable ? (
                        <input type="number" min={0} inputMode="numeric" aria-label={`Counted quantity for ${line.item_code}`} value={edits[line.id] ?? (line.counted_qty ?? '')}
                          onChange={e => setEdits(prev => ({ ...prev, [line.id]: e.target.value }))} onBlur={() => void saveCount(line)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          className="h-7 w-20 rounded-md border border-slate-200 px-2 text-right text-xs tabular-nums outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="—" />
                      ) : <span className="font-semibold tabular-nums">{line.counted_qty ?? '—'}</span>}
                    </td>
                    <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', diff === null ? 'text-slate-300' : diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-amber-600' : 'text-emerald-600')}>{diff === null ? '—' : diff > 0 ? `+${diff}` : diff}</td>
                    <td className="px-4 py-2"><span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', STATUS[status].tone)}><span className="h-1 w-1 rounded-full bg-current" />{STATUS[status].label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {confirmComplete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setConfirmComplete(false); }}>
            <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} role="dialog" aria-modal="true" aria-labelledby="opname-complete-title" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <h3 id="opname-complete-title" className="text-sm font-semibold text-slate-900">Complete this count?</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">The count sheet is locked afterwards. {totals.total - totals.counted > 0 ? <strong>{fmt(totals.total - totals.counted)} lines not counted yet will be recorded as 0 (not found).</strong> : 'Every line has been counted.'}</p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmComplete(false)} className="h-9 rounded-lg px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
                <button type="button" onClick={complete} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Complete count</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

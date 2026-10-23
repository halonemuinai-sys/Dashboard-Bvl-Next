"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCheck, Plus, RefreshCw, Loader2, AlertCircle, X, Trash2, ArrowLeft, ShieldOff, Store, CalendarDays, ListChecks, TrendingDown, TrendingUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import InfoTip from '@/components/InfoTip';
import { useUserAccess } from '@/lib/user-access-context';
import OpnameSheet from './OpnameSheet';
import { createOpnameSessionAction, deleteOpnameSessionAction, getOpnameSetupAction, listOpnameSessionsAction } from './actions';

interface SessionRow { id: number; title: string; store_name: string; categories: string[]; snapshot_date: string; status: 'in_progress' | 'completed'; total_lines: number; counted_lines: number; short_qty: number; over_qty: number; created_by: string | null; created_at: string }
interface SetupStore { code: string; name: string; snapshotDate: string | null; categories: { name: string; lines: number }[] }

const fmt = (n: number) => n.toLocaleString('en-GB');
const fmtDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function StockOpnamePage() {
  const { role, canAccess, loading: accessLoading } = useUserAccess();
  const [openId, setOpenId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setup, setSetup] = useState<SetupStore[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [storeCode, setStoreCode] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [toDelete, setToDelete] = useState<SessionRow | null>(null);

  const load = useCallback(async () => {
    const res = await listOpnameSessionsAction();
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    setError('');
    setSessions(res.data.sessions as SessionRow[]);
    setCanDelete(res.data.canDelete);
  }, []);
  useEffect(() => { if (!accessLoading && canAccess('/stock-opname')) void load(); }, [accessLoading, canAccess, load]);

  const openDrawer = async () => {
    setDrawer(true); setFormError(''); setTitle(''); setCategories([]);
    const res = await getOpnameSetupAction();
    if (!res.ok) { setFormError(res.error); return; }
    setSetup(res.data as SetupStore[]);
    const first = (res.data as SetupStore[]).find(s => s.snapshotDate);
    setStoreCode(first?.code || '');
  };
  const selectedStore = setup.find(s => s.code === storeCode);
  const toggleCategory = (name: string) => setCategories(prev => (prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]));
  const selectedLines = selectedStore?.categories.filter(c => categories.includes(c.name)).reduce((s, c) => s + c.lines, 0) || 0;

  const create = async () => {
    if (!storeCode || !categories.length) { setFormError('Choose a boutique and at least one category.'); return; }
    setCreating(true); setFormError('');
    const res = await createOpnameSessionAction({ storeCode, categories, title });
    setCreating(false);
    if (!res.ok) { setFormError(res.error); return; }
    setDrawer(false);
    setOpenId(res.data.id);
    void load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const res = await deleteOpnameSessionAction(toDelete.id);
    setToDelete(null);
    if (!res.ok) setError(res.error); else void load();
  };

  const kpi = useMemo(() => ({
    open: sessions.filter(s => s.status === 'in_progress').length,
    done: sessions.filter(s => s.status === 'completed').length,
    short: sessions.filter(s => s.status === 'completed').reduce((t, s) => t + s.short_qty, 0),
    over: sessions.filter(s => s.status === 'completed').reduce((t, s) => t + s.over_qty, 0),
  }), [sessions]);

  if (accessLoading) return <div className="flex h-[60vh] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-blue-600" />Checking access…</div>;
  if (!canAccess('/stock-opname')) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="max-w-sm space-y-4 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-100"><ShieldOff className="h-7 w-7 text-rose-500" /></span>
          <div><h1 className="text-xl font-semibold tracking-tight text-slate-900">Access denied</h1><p className="mt-1 text-sm text-slate-500">Stock opname is not available for the <span className="font-semibold text-slate-700">{role || '—'}</span> role.</p></div>
          <Link href="/" className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <motion.section initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white">
        <motion.div aria-hidden animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-dashed border-white/10" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><ClipboardCheck className="h-5 w-5 text-blue-200" /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Merchandise</p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Stock Opname</h1>
              <p className="mt-1 text-sm text-slate-300">Physical count against the morning stock snapshot, minus what was sold since.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {openId === null && <button type="button" onClick={() => { setLoading(true); void load(); }} aria-label="Reload sessions" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button>}
            <button type="button" onClick={() => void openDrawer()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-xs font-semibold text-slate-900 hover:bg-slate-100"><Plus className="h-4 w-4" />New count</button>
          </div>
        </div>
      </motion.section>

      {error && <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"><AlertCircle className="h-4 w-4 shrink-0 text-rose-600" /><span className="flex-1">{error}</span><button type="button" onClick={() => void load()} className="font-semibold underline">Try again</button></div>}

      {openId !== null ? (
        <OpnameSheet key={openId} sessionId={openId} onBack={() => { setOpenId(null); void load(); }} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: ListChecks, tone: 'bg-amber-50 text-amber-600', label: 'In progress', value: fmt(kpi.open), help: 'Counts that are still open for scanning.' },
              { icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600', label: 'Completed', value: fmt(kpi.done), help: 'Locked counts in the last 100 sessions.' },
              { icon: TrendingDown, tone: 'bg-rose-50 text-rose-600', label: 'Units short', value: fmt(kpi.short), help: 'Units counted below system stock, across completed counts.' },
              { icon: TrendingUp, tone: 'bg-blue-50 text-blue-600', label: 'Units over', value: fmt(kpi.over), help: 'Units counted above system stock or not in the system, across completed counts.' },
            ].map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} whileHover={{ y: -2 }} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', card.tone)}><card.icon className="h-4 w-4" /></span>
                <div><p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{card.label}<InfoTip label={`About ${card.label.toLowerCase()}`} text={card.help} /></p><p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-slate-900">{card.value}</p></div>
              </motion.div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] table-fixed text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-3">Count</th><th className="w-[140px] px-3 py-3">Boutique</th><th className="w-[120px] px-3 py-3">Snapshot</th><th className="w-[140px] px-3 py-3">Progress</th><th className="w-[90px] px-3 py-3 text-right">Short</th><th className="w-[90px] px-3 py-3 text-right">Over</th><th className="w-[120px] px-3 py-3">Status</th><th className="w-[56px] px-2 py-3"><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && !sessions.length ? (
                    <tr><td colSpan={8} className="py-14 text-center text-slate-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading counts…</td></tr>
                  ) : !sessions.length ? (
                    <tr><td colSpan={8} className="py-14 text-center"><p className="text-sm font-semibold text-slate-700">No stock counts yet</p><button type="button" onClick={() => void openDrawer()} className="mt-2 text-xs font-semibold text-blue-600 hover:underline">Start the first count</button></td></tr>
                  ) : sessions.map((s, i) => {
                    const pct = s.total_lines ? Math.round((s.counted_lines / s.total_lines) * 100) : 0;
                    return (
                      <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }} className="cursor-pointer transition-colors hover:bg-slate-50/70" onClick={() => setOpenId(s.id)}>
                        <td className="px-4 py-2.5"><span className="block truncate font-semibold text-slate-800" title={s.title}>{s.title}</span><span className="block truncate text-[10px] text-slate-400">{s.categories.join(', ')} · by {s.created_by || '—'} · {fmtDate(s.created_at)}</span></td>
                        <td className="px-3 py-2.5 text-slate-700">{s.store_name}</td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-500">{fmtDate(s.snapshot_date)}</td>
                        <td className="px-3 py-2.5"><span className="text-[11px] tabular-nums text-slate-600">{fmt(s.counted_lines)} / {fmt(s.total_lines)}</span><span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} /></span></td>
                        <td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', s.short_qty ? 'text-rose-600' : 'text-slate-300')}>{s.short_qty ? fmt(s.short_qty) : '—'}</td>
                        <td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', s.over_qty ? 'text-amber-600' : 'text-slate-300')}>{s.over_qty ? fmt(s.over_qty) : '—'}</td>
                        <td className="px-3 py-2.5"><span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', s.status === 'completed' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200')}><span className="h-1 w-1 rounded-full bg-current" />{s.status === 'completed' ? 'Completed' : 'In progress'}</span></td>
                        <td className="px-2 py-2 text-center">{canDelete && <button type="button" aria-label={`Delete ${s.title}`} onClick={e => { e.stopPropagation(); setToDelete(s); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* New count drawer */}
      <AnimatePresence>
        {drawer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget && !creating) setDrawer(false); }}>
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} role="dialog" aria-modal="true" aria-labelledby="opname-new-title" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                <div><h2 id="opname-new-title" className="text-base font-semibold tracking-tight text-slate-900">New stock count</h2><p className="mt-1 text-xs text-slate-500">Today&apos;s sales are synced first, then the count sheet is built from the latest stock snapshot.</p></div>
                <button type="button" onClick={() => setDrawer(false)} disabled={creating} aria-label="Close" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <div>
                  <span className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><Store className="h-3.5 w-3.5" />Boutique</span>
                  <div className="grid gap-2">
                    {!setup.length && !formError && <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading boutiques…</p>}
                    {setup.map(s => (
                      <button key={s.code} type="button" disabled={!s.snapshotDate} onClick={() => { setStoreCode(s.code); setCategories([]); }} aria-pressed={storeCode === s.code}
                        className={cn('flex items-center justify-between rounded-xl border p-3 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-50', storeCode === s.code ? 'border-blue-300 bg-blue-50/60 ring-1 ring-blue-200' : 'border-slate-200 hover:bg-slate-50')}>
                        <span className="font-semibold text-slate-800">{s.name}</span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{s.snapshotDate ? `Snapshot ${fmtDate(s.snapshotDate)}` : 'No snapshot yet'}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {selectedStore?.snapshotDate && (
                  <div>
                    <span className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">Categories<button type="button" onClick={() => setCategories(categories.length === selectedStore.categories.length ? [] : selectedStore.categories.map(c => c.name))} className="normal-case tracking-normal text-blue-600 hover:underline">{categories.length === selectedStore.categories.length ? 'Clear' : 'Select all'}</button></span>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedStore.categories.map(c => (
                        <label key={c.name} className={cn('flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 text-xs', categories.includes(c.name) ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 hover:bg-slate-50')}>
                          <span className="flex items-center gap-2 font-medium text-slate-800"><input type="checkbox" checked={categories.includes(c.name)} onChange={() => toggleCategory(c.name)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />{c.name}</span>
                          <span className="tabular-nums text-[11px] text-slate-400">{fmt(c.lines)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Title (optional)</span>
                  <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Monthly count – Jewelry" className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>
                {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700">{formError}</p>}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-4">
                <span className="text-[11px] text-slate-500">{categories.length ? `${fmt(selectedLines)} stock lines` : 'Choose categories'}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDrawer(false)} disabled={creating} className="h-9 rounded-lg px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
                  <button type="button" onClick={() => void create()} disabled={creating || !storeCode || !categories.length} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{creating ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Preparing…</> : <><ClipboardCheck className="h-3.5 w-3.5" />Start count</>}</button>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {toDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setToDelete(null); }}>
            <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} role="dialog" aria-modal="true" aria-labelledby="opname-delete-title" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50"><Trash2 className="h-5 w-5 text-rose-600" /></span><div><h3 id="opname-delete-title" className="text-sm font-semibold text-slate-900">Delete this count?</h3><p className="mt-0.5 text-[11px] text-slate-400">{toDelete.title}</p></div></div>
              <p className="mb-5 text-xs leading-relaxed text-slate-600">The count sheet and every counted line are removed permanently.</p>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setToDelete(null)} className="h-9 rounded-lg px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button><button type="button" onClick={() => void remove()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700"><Trash2 className="h-3.5 w-3.5" />Delete</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

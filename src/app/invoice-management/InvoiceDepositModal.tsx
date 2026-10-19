'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, Link2, CircleCheck, Loader2, Unlink, Lock } from 'lucide-react';
import type { InvoiceHeader } from '@/services/dashboard/invoiceService';
import type { DepositLink, SalesDeposit } from '@/lib/deposit-links';
import Amt from '@/components/Amt';
import { searchSalesDepositsAction, linkSalesDepositsAction, unlinkSalesDepositAction } from './deposit-actions';

export default function InvoiceDepositModal({ invoice, editable, onClose, onChanged }: { invoice: InvoiceHeader; editable: boolean; onClose: () => void; onChanged: (links: DepositLink[]) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const mutation = useRef(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<(SalesDeposit & { link: DepositLink | null })[]>([]);
  const [linked, setLinked] = useState(invoice.depositLinks || []);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const response = await searchSalesDepositsAction(invoice.trans_no, search);
        if (cancelled) return;
        if (!response.ok) { setError(response.error); setResults([]); }
        else { setResults(response.data.results); setTotal(response.data.total); setLinked(response.data.linked); }
      } catch { if (!cancelled) { setError('Could not load DP transactions. Please retry.'); setResults([]); } }
      finally { if (!cancelled) setLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [invoice.trans_no, search, revision]);
  async function save() {
    if (!editable || mutation.current || !selected.size) return;
    mutation.current = true; setBusy(true); setError('');
    try {
      const response = await linkSalesDepositsAction(invoice.trans_no, [...selected]);
      if (!response.ok) { setError(response.error); return; }
      setLinked(response.data); onChanged(response.data); setSelected(new Set()); setRevision(value => value + 1);
    } catch { setError('The DP references could not be saved. Please retry.'); }
    finally { mutation.current = false; setBusy(false); }
  }
  async function unlink(link: DepositLink) {
    if (!editable || mutation.current || !window.confirm(`Remove DP ${link.transNo} from invoice ${invoice.trans_no}? It will become available again.`)) return;
    mutation.current = true; setBusy(true); setError('');
    try {
      const response = await unlinkSalesDepositAction(invoice.trans_no, link.transNo);
      if (!response.ok) { setError(response.error); return; }
      const next = linked.filter(item => item.transNo !== link.transNo);
      setLinked(next); onChanged(next); setRevision(value => value + 1);
    } catch { setError('The DP reference could not be removed. Please retry.'); }
    finally { mutation.current = false; setBusy(false); }
  }
  const linkedAmount = linked.reduce((sum, dp) => sum + dp.amount, 0);
  return <dialog ref={dialog} aria-labelledby="deposit-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto w-[min(960px,94vw)] max-h-[90dvh] rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50">
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6"><div><p className="text-[10px] font-bold tracking-widest text-blue-600">INVOICE SETTLEMENT</p><h2 id="deposit-title" className="mt-1 text-xl font-bold text-slate-900">Link sales down payments</h2><p className="mt-1 text-xs text-slate-500">{invoice.trans_no} · {invoice.customer} · {invoice.location}</p></div><button type="button" aria-label="Close DP selection" disabled={busy} onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
    <div className="space-y-5 p-6">
      {!editable && <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><Lock size={16} />Unlock Invoice Management to add or remove DP references.</p>}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"><div className="flex justify-between gap-3"><h3 className="text-sm font-bold text-emerald-900">Applied DP · {linked.length}</h3><strong className="text-sm text-emerald-900"><Amt value={linkedAmount} /></strong></div>
        <p className="mt-1 text-xs text-slate-500">Each DP is fully assigned to one sales invoice. Payment amounts remain managed in POS Split Payment.</p>
        {linked.length ? <div className="mt-3 space-y-2">{linked.map(dp => <div key={dp.transNo} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-xs"><span className="flex items-center gap-2"><CircleCheck size={15} className="text-emerald-600" /><span><strong className="font-mono text-slate-800">{dp.transNo}</strong><span className="ml-2 text-slate-500">{dp.date.slice(0, 10)}</span></span></span><span className="flex items-center gap-3"><Amt value={dp.amount} /><button type="button" title="Remove DP reference" aria-label={`Remove DP ${dp.transNo}`} disabled={busy || !editable} onClick={() => void unlink(dp)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Unlink size={15} /></button></span></div>)}</div> : <p className="mt-3 text-xs text-slate-500">No down payments linked yet.</p>}
      </div>
      <div><label htmlFor="deposit-search" className="mb-2 block text-sm font-semibold text-slate-800">Search sales DP</label><div className="relative"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input id="deposit-search" value={search} maxLength={150} disabled={busy} onChange={event => { setSearch(event.target.value); setSelected(new Set()); setLoading(true); }} placeholder="DP invoice / transaction number, customer, or advisor..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400" /></div><p className="mt-2 text-xs text-slate-500">Available sales DP from the same store within the 12 months up to the invoice date (inclusive). Enter a full or partial DP invoice number to search. Claimed DP, service, and return transactions are excluded.</p></div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}<button type="button" onClick={() => setRevision(value => value + 1)} className="ml-3 font-bold underline">Retry</button></div>}
      <div className="max-h-[32vh] overflow-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="p-3">Select</th><th className="p-3">DP transaction</th><th className="p-3">Customer / Advisor</th><th className="p-3 text-right">DP amount</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">
        {loading ? <tr><td colSpan={5} className="p-8 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" size={20} />Loading sales DP...</td></tr> : results.map(dp => <tr key={dp.transNo} className={selected.has(dp.transNo) ? 'bg-blue-50/60' : ''}><td className="p-3"><input type="checkbox" aria-label={`Select DP ${dp.transNo}`} checked={selected.has(dp.transNo)} disabled={!editable || busy || Boolean(dp.link)} onChange={event => setSelected(current => { const next = new Set(current); if (event.target.checked) next.add(dp.transNo); else next.delete(dp.transNo); return next; })} /></td><td className="p-3"><strong className="block whitespace-nowrap font-mono text-blue-700">{dp.transNo}</strong><span className="text-slate-500">{dp.date.slice(0, 10)}</span></td><td className="p-3"><span className="block font-medium text-slate-800">{dp.customer}</span><span className="text-slate-500">{dp.salesman}</span></td><td className="whitespace-nowrap p-3 text-right font-semibold"><Amt value={dp.amount} /></td><td className="p-3">{dp.link ? <span title={`Applied to ${dp.link.invoiceNo}`} className="inline-flex items-center gap-1.5 text-emerald-700"><CircleCheck size={15} /><span className="font-mono">{dp.link.invoiceNo}</span></span> : <span className="text-slate-500">Available</span>}</td></tr>)}
        {!loading && !results.length && <tr><td colSpan={5} className="p-8 text-center text-slate-400">{error ? 'DP transactions could not be loaded.' : 'No available sales DP found.'}</td></tr>}
      </tbody></table></div>
      {total > 100 && <p className="text-xs text-slate-500">Showing 100 of {total} matches. Refine your search to find another DP.</p>}
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-5"><span className="text-xs text-slate-500">{selected.size} selected · <Amt value={results.filter(dp => selected.has(dp.transNo)).reduce((sum, dp) => sum + dp.amount, 0)} /></span><div className="flex gap-2"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Close</button><button type="button" disabled={!editable || busy || loading || !selected.size || Boolean(error)} onClick={() => void save()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">{busy ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}Apply selected DP</button></div></div>
  </dialog>;
}

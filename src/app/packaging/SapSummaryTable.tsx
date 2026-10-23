'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import InfoTip from '@/components/InfoTip';
import { SUMMARY_STORES, type SapSummary, type StockStatus, type StoreStock } from './packagingSummary';

type Key = 'sap' | 'item' | 'out' | 'stock' | 'invoices';
const STATUS: Record<StockStatus, { label: string; tone: string }> = {
  out: { label: 'Out of stock', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  low: { label: 'Low', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  ok: { label: 'OK', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  unknown: { label: 'No stock data', tone: 'bg-slate-100 text-slate-500 ring-slate-200' },
};
const n = (value: number) => value.toLocaleString('en-GB');
const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

export default function SapSummaryTable({ rows, stock, scopeStores, period, onOpenSap }: {
  rows: SapSummary[]; stock: StoreStock[]; scopeStores: string[]; period: string; onOpenSap: (sap: string) => void;
}) {
  const [key, setKey] = useState<Key>('out');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const storeColumns = SUMMARY_STORES.filter(store => scopeStores.includes(store) || rows.some(r => r.outByStore[store]));
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const av = a[key] ?? -1; const bv = b[key] ?? -1;
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return dir === 'asc' ? cmp : -cmp;
  }), [rows, key, dir]);
  const total = (pick: (r: SapSummary) => number) => rows.reduce((s, r) => s + pick(r), 0);
  const stockKnown = rows.some(r => r.stock !== null);
  const snapshotNote = stock.filter(s => scopeStores.includes(s.store)).map(s => `${s.store} ${shortDate(s.date)}`).join(' · ') || 'none saved yet';
  const sort = (next: Key) => { if (key === next) setDir(d => (d === 'asc' ? 'desc' : 'asc')); else { setKey(next); setDir(next === 'sap' || next === 'item' ? 'asc' : 'desc'); } };
  const head = (label: string, k: Key, right = false) => (
    <button type="button" onClick={() => sort(k)} className={cn('inline-flex items-center gap-1 uppercase hover:text-blue-600', right && 'justify-end')}>
      {label}{key !== k ? <ChevronsUpDown className="h-3 w-3 text-slate-300" /> : dir === 'asc' ? <ChevronUp className="h-3 w-3 text-blue-600" /> : <ChevronDown className="h-3 w-3 text-blue-600" />}
    </button>
  );

  const exportCsv = () => {
    const q = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['SAP Code', 'Item', 'Total Out', ...storeColumns.map(s => `Out ${s}`), 'Stock Now', 'Status', 'Invoices'];
    const lines = sorted.map(r => [q(r.sap), q(r.item), r.out, ...storeColumns.map(s => r.outByStore[s] || 0), r.stock ?? '', q(STATUS[r.status].label), r.invoices].join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' }));
    a.download = `Packaging_by_SAP_${period.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">Stock snapshot: <span className="font-semibold text-slate-700">{snapshotNote}</span>
          <InfoTip label="About stock" text="Latest Inventory Valuation snapshot per boutique, refreshed every morning. Low = stock left is below what went out in the selected period." /></span>
        <button type="button" onClick={exportCsv} disabled={!rows.length} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
          <FileDown className="h-4 w-4 text-slate-500" />Export by SAP
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-[100px] px-4 py-3">{head('SAP', 'sap')}</th>
              <th className="px-3 py-3">{head('Item', 'item')}</th>
              <th className="w-[90px] px-3 py-3 text-right">{head('Out', 'out', true)}</th>
              {storeColumns.map(s => <th key={s} className="w-[96px] px-3 py-3 text-right">{s === 'Plaza Indonesia' ? 'PI' : s === 'Plaza Senayan' ? 'PS' : s === 'Head Office' ? 'HO' : s}</th>)}
              <th className="w-[96px] px-3 py-3 text-right">{head('Stock now', 'stock', true)}</th>
              <th className="w-[120px] px-3 py-3">Status</th>
              <th className="w-[80px] px-4 py-3 text-right">{head('Invoices', 'invoices', true)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!sorted.length ? (
              <tr><td colSpan={6 + storeColumns.length} className="py-16 text-center text-sm font-semibold text-slate-700">No packaging went out for {period}</td></tr>
            ) : sorted.map(r => (
              <tr key={r.sap} className="transition-colors hover:bg-slate-50/70">
                <td className="px-4 py-2.5"><button type="button" onClick={() => onOpenSap(r.sap)} title="Show the transactions for this SAP code" className="font-mono text-[11px] font-semibold text-blue-700 hover:underline">{r.sap}</button></td>
                <td className="truncate px-3 py-2.5 font-medium text-slate-800" title={r.item}>{r.item}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{n(r.out)}</td>
                {storeColumns.map(s => <td key={s} className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.outByStore[s] ? n(r.outByStore[s]) : <span className="text-slate-300">—</span>}</td>)}
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{r.stock === null ? <span className="text-slate-300">—</span> : n(r.stock)}</td>
                <td className="px-3 py-2"><span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', STATUS[r.status].tone)}><span className="h-1 w-1 rounded-full bg-current" />{STATUS[r.status].label}</span></td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{n(r.invoices)}</td>
              </tr>
            ))}
          </tbody>
          {sorted.length > 0 && (
            <tfoot className="border-t border-slate-200 bg-slate-50/60 font-semibold text-slate-900">
              <tr>
                <td className="px-4 py-2.5" colSpan={2}>Total · {n(rows.length)} SAP codes</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{n(total(r => r.out))}</td>
                {storeColumns.map(s => <td key={s} className="px-3 py-2.5 text-right tabular-nums">{n(total(r => r.outByStore[s] || 0))}</td>)}
                <td className="px-3 py-2.5 text-right tabular-nums">{stockKnown ? n(total(r => r.stock || 0)) : '—'}</td>
                <td className="px-3 py-2.5 text-[10px] font-normal text-slate-500">{rows.filter(r => r.status === 'low' || r.status === 'out').length} need attention</td>
                <td className="px-4 py-2.5" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

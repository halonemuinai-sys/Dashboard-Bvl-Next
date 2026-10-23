'use client';

import { Receipt, CalendarDays, RefreshCw, Lock, LockOpen, CloudDownload, FileSpreadsheet, FileDown, ChevronDown, Loader2, MapPin, Layers3, Package, CheckCircle2, ArrowUpRight } from 'lucide-react';
import Amt from '@/components/Amt';
import { cn } from '@/lib/utils';
import { useUserAccess } from '@/lib/user-access-context';
import styles from './InvoiceOverview.module.css';

interface Props {
  month: string; year: string; months: string[]; store: string; isAdmin: boolean; isUnlocked: boolean;
  syncing: boolean; exporting: boolean; exportingExecutive: boolean; loadError: boolean;
  missingCashBills: number;
  summary: { totalInvoices: number; multiItemCount: number; totalQty: number; totalGross: number; totalDisc: number; totalComm: number; totalNet: number };
  onMonth: (value: string) => void; onYear: (value: string) => void; onRefresh: () => void;
  onSync: () => void; onExport: () => void; onExecutive: () => void; onCsv: () => void; onLockToggle: () => void;
}
const control = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40';

export default function InvoiceOverview(p: Props) {
  // Card commission totals are finance data: only admin and finance see them.
  const { isAdmin, role } = useUserAccess();
  const canViewCardComm = isAdmin || role === 'finance';
  const years = [...new Set([Number(p.year), new Date().getFullYear(), 2026, 2025, 2024, 2023])].sort((a, b) => b - a);
  const completed = p.summary.totalInvoices - p.missingCashBills;
  const progress = p.summary.totalInvoices ? Math.round(completed / p.summary.totalInvoices * 100) : 0;
  return <>
    <section className={cn(styles.header, styles.controls, "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40")}>
      <div className="flex flex-wrap items-start justify-between gap-5 p-5 sm:p-6">
        <div className="flex min-w-0 flex-1 basis-80 items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100"><Receipt size={23} strokeWidth={1.7} /></div>
          <div className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Sales operations</p><h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Invoice Management</h1><p className="mt-1 text-xs leading-5 text-slate-500">Review sales, manage payments and keep every invoice complete.</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3">
            <CalendarDays size={16} className="text-slate-400" />
            <select aria-label="Select month" value={p.month} onChange={e => p.onMonth(e.target.value)} className="max-w-36 bg-transparent text-sm font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{p.months.map(month => <option key={month}>{month}</option>)}</select>
            <span className="h-4 border-l border-slate-200" />
            <select aria-label="Select year" value={p.year} onChange={e => p.onYear(e.target.value)} className="bg-transparent text-sm font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{years.map(year => <option key={year}>{year}</option>)}</select>
          </div>
          <button type="button" aria-label="Refresh invoices" title="Refresh invoices" onClick={p.onRefresh} className={cn(control, 'h-11 w-11 px-0')}><RefreshCw size={16} className={styles.refreshIcon} /></button>
          <button type="button" onClick={p.onLockToggle} className={cn(control, 'h-11', p.isUnlocked && 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100')}>
            {p.isUnlocked ? <LockOpen size={15} /> : <Lock size={15} />}{p.isUnlocked ? 'Lock editing' : 'Enable editing'}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600"><MapPin size={14} className="text-slate-400" />{p.store || 'All stores'}</span>
          <span className={cn('inline-flex items-center gap-1.5', p.isUnlocked ? 'text-amber-700' : 'text-slate-500')}><span className={cn('h-1.5 w-1.5 rounded-full', p.isUnlocked ? 'bg-amber-500' : 'bg-slate-400')} />{p.isUnlocked ? 'Editing enabled' : 'Read-only mode'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {p.isAdmin && <button type="button" disabled={p.syncing} onClick={p.onSync} className={control}>{p.syncing ? <Loader2 size={15} className="animate-spin" /> : <CloudDownload size={15} />}{p.syncing ? 'Syncing…' : 'Sync sales'}</button>}
          <details className="group relative">
            <summary className={cn(control, 'cursor-pointer list-none [&::-webkit-details-marker]:hidden')}><FileDown size={15} />Other exports<ChevronDown size={13} className="transition group-open:rotate-180" /></summary>
            <div className="absolute left-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-4rem)] sm:left-auto sm:right-0 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
              <button type="button" disabled={!p.summary.totalInvoices || p.exportingExecutive} onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); p.onExecutive(); }} className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-xs hover:bg-slate-50 disabled:opacity-40"><FileSpreadsheet size={17} className="text-slate-500" /><span><strong className="block font-semibold text-slate-800">{p.exportingExecutive ? 'Generating…' : 'Executive report'}</strong><span className="mt-0.5 block text-slate-400">Excel · current invoice filters</span></span></button>
              <button type="button" disabled={!p.summary.totalInvoices} onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); p.onCsv(); }} className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-xs hover:bg-slate-50 disabled:opacity-40"><FileDown size={17} className="text-slate-500" /><span><strong className="block font-semibold text-slate-800">Invoice data</strong><span className="mt-0.5 block text-slate-400">CSV · current invoice filters</span></span></button>
            </div>
          </details>
          <button type="button" disabled={p.exporting || p.loadError} onClick={p.onExport} title="Full month and selected store: Summary, DS, DP, Service, IN, OUT and SPPR. Search filters are ignored." className={cn(control, 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/15 hover:border-blue-700 hover:bg-blue-700')}>
            {p.exporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}{p.exporting ? 'Generating workbook…' : 'Monthly workbook'}<ArrowUpRight size={14} className="opacity-60" />
          </button>
        </div>
      </div>
    </section>
    <div className={styles.metricContainer}><section aria-label="Invoice overview" className={styles.metrics}>
      <div className={cn(styles.card, "relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-sm")}><div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-blue-500/10" /><p className="text-xs font-medium text-slate-400">Net sales</p><p className="mt-2 text-2xl font-semibold tracking-tight"><span key={p.summary.totalNet} className={styles.value}><Amt value={p.summary.totalNet} /></span></p><p className="mt-3 text-[11px] text-slate-400">IDR · invoices matching current filters</p></div>
      <div className={cn(styles.card, "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30")}><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">Invoices</p><Receipt size={17} className="text-blue-500" /></div><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900"><span key={p.summary.totalInvoices} className={styles.value}>{p.summary.totalInvoices.toLocaleString('en-US')}</span></p><p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400"><Layers3 size={12} />{p.summary.multiItemCount} with multiple items</p></div>
      <div className={cn(styles.card, "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30")}><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">Units sold</p><Package size={17} className="text-blue-500" /></div><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900"><span key={p.summary.totalQty} className={styles.value}>{p.summary.totalQty.toLocaleString('en-US')}</span></p><p className="mt-3 text-[11px] text-slate-400">Quantity across invoice items</p></div>
      <div className={cn(styles.card, "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30")}><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">Cash bill coverage</p><CheckCircle2 size={17} className="text-emerald-500" /></div><div className="mt-2 flex items-baseline gap-2"><p className="text-2xl font-semibold tracking-tight text-slate-900"><span key={progress} className={styles.value}>{progress}%</span></p><span className="text-[11px] text-slate-400">{completed} of {p.summary.totalInvoices}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100"><div className={cn(styles.progress, "h-full rounded-full bg-emerald-500")} style={{ width: `${progress}%` }} /></div><p className="mt-2 text-[11px] text-slate-400">{p.missingCashBills ? `${p.missingCashBills} invoices need a cash bill number` : 'No missing cash bill numbers'}</p></div>
    </section></div>
    <div className={cn(styles.totals, "flex flex-wrap items-center gap-x-7 gap-y-2 px-1 text-xs text-slate-500")}><span>Gross sales <strong className="ml-2 font-semibold text-slate-700"><Amt value={p.summary.totalGross} compact /></strong></span><span>Discounts <strong className="ml-2 font-semibold text-rose-600"><Amt value={p.summary.totalDisc} compact /></strong></span>{canViewCardComm && <span>Card commission <strong className="ml-2 font-semibold text-slate-700"><Amt value={p.summary.totalComm} compact /></strong></span>}<span className="ml-auto text-[10px] uppercase tracking-wider text-slate-400">Amounts in IDR</span></div>
  </>;
}

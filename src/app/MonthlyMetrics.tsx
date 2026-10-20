'use client';

import { useState } from 'react';
import { BarChart3, Target, CalendarDays, Package, FileText, Percent, TrendingUp, TrendingDown } from 'lucide-react';
import Amt from '@/components/Amt';
import InfoTip from '@/components/InfoTip';
import { cn } from '@/lib/utils';
import type { MonthlyOverviewData } from '@/services/dashboardService';
import styles from './MonthlyOverview.module.css';

const pct = (value: number) => value.toFixed(1) + '%';
const card = 'min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30';
const label = 'text-xs font-medium text-slate-500';
const number = 'mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900';
function Growth({ value, description }: { value: number; description: string }) {
  return <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold', value > 0 ? 'text-emerald-600' : value < 0 ? 'text-rose-600' : 'text-slate-500')}>
    {value < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}{pct(Math.abs(value))} {description}
  </span>;
}
function Progress({ value }: { value: number }) {
  return <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={cn(styles.bar, 'h-full rounded-full', value >= 100 ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: Math.max(0, Math.min(value, 100)) + '%' }} /></div>;
}

export default function MonthlyMetrics({ data, storeNetExcHO, year }: { data: MonthlyOverviewData; storeNetExcHO: number; year: string }) {
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const k = data.kpi;
  const annual = data.annualStats;
  const monthly = period === 'month';
  const qty = monthly ? k.mtdQtyCurrent : k.ytdQtyCurrent;
  const previousQty = monthly ? k.mtdQtyPrevMonth : k.ytdQtyPrevYear;
  const transactions = monthly ? k.mtdTxCurrent : k.ytdTxCurrent;
  const previousTransactions = monthly ? k.mtdTxPrevMonth : k.ytdTxPrevYear;
  const comparison = monthly ? 'vs last month' : 'vs last year';
  return <div className="space-y-5">
    <div className={cn(styles.metrics, 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4')}>
      <article className="relative min-w-0 rounded-2xl bg-linear-to-br from-slate-900 via-slate-900 to-blue-950 p-5 text-white shadow-sm">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"><div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-400/10" /></div>
        <div className="relative flex items-center justify-between"><p className="flex items-center gap-1 text-xs font-medium text-blue-100">Monthly net sales<InfoTip tone="dark" label="About monthly net sales" text="All net sales for the selected month, including Head Office. MoM and YoY compare boutique sales only, up to the same day of the month, so a month in progress is compared fairly." /></p><BarChart3 size={18} className="text-blue-300" /></div>
        <p className="relative mt-3 text-2xl font-semibold tracking-tight"><span key={k.totalNet} className={styles.value}><Amt value={k.totalNet} compact /></span></p>
        <p className="mt-2 text-[10px] text-slate-400">IDR / including Head Office</p>
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 rounded-xl bg-white p-2.5">
          <Growth value={k.momGrowthPct} description="MoM" /><Growth value={k.mtdGrowthPct} description="YoY" />
        </div>
        <p className="mt-2 text-[9px] text-blue-200/70">Growth compares boutique sales over matching periods.</p>
      </article>
      <article className={card}>
        <div className="flex items-center justify-between"><p className={cn(label, 'flex items-center gap-1')}>Monthly achievement<InfoTip label="About Monthly achievement" text="Boutique net sales this month divided by the boutiques' monthly target. Head Office is excluded from both." /></p><Target size={18} className="text-blue-500" /></div>
        <p className={number}>{k.totalTarget > 0 ? pct(k.achievement) : '\u2014'}</p>
        <Progress value={k.achievement} />
        <p className="mt-3 text-[11px] text-slate-500">Target <strong className="font-semibold text-slate-700"><Amt value={k.totalTarget} compact /></strong></p>
        <p className="mt-2 text-[10px] text-slate-400">Boutiques: <Amt value={storeNetExcHO} compact /> / excludes Head Office</p>
      </article>
      <article className={card}>
        <div className="flex items-center justify-between"><p className={cn(label, 'flex items-center gap-1')}>Annual sales / {year}<InfoTip label="About Annual sales" text="Boutique net sales from January up to today for the selected year, excluding Head Office. The bar shows progress to the annual target." /></p><CalendarDays size={18} className="text-teal-500" /></div>
        <p className={number}><Amt value={annual.salesExcHO} compact /></p>
        <Progress value={annual.achievement} />
        <p className="mt-3 text-[11px] text-slate-500"><strong className="font-semibold text-teal-700">{annual.target > 0 ? pct(annual.achievement) : '\u2014'}</strong> of annual target</p>
        <p className="mt-2 text-[10px] text-slate-400">Boutique net sales / excludes Head Office</p>
      </article>
      <article className={card}>
        <div className="flex items-center justify-between"><p className={cn(label, 'flex items-center gap-1')}>Annual target<InfoTip label="About Annual target" text="Sum of all boutique monthly targets for January–December, excluding Head Office. Remaining = annual target minus annual sales so far." /></p><Target size={18} className="text-blue-500" /></div>
        <p className={number}><Amt value={annual.target} compact /></p>
        <span className="mt-3 inline-flex rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">January &ndash; December {year}</span>
        <p className="mt-3 text-[11px] text-slate-500">Remaining <strong className="font-semibold text-slate-700"><Amt value={Math.max(0, annual.target - annual.salesExcHO)} compact /></strong></p>
        <p className="mt-2 text-[10px] text-slate-400">All boutiques / excludes Head Office</p>
      </article>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-semibold tracking-tight text-slate-800">Operational performance</h2><p className="mt-0.5 text-[11px] text-slate-500">{monthly ? 'Selected month' : 'Selected year'} / volume, cost and discounts</p></div>
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1" role="group" aria-label="Operational metrics period">
        {(['month', 'year'] as const).map(option => <button key={option} type="button" aria-pressed={period === option} onClick={() => setPeriod(option)} className={cn('rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-500', period === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>{option === 'month' ? 'Monthly' : 'Yearly'}</button>)}
      </div>
    </div>
    <div className={cn(styles.metrics, 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4')}>
      <article className={card}><div className="flex items-center justify-between"><p className={cn(label, 'flex items-center gap-1')}>Items sold<InfoTip label="About Items sold" text="Units sold at the boutiques (excluding Head Office). Monthly compares with the same days of last month; Yearly is year-to-date compared with the same period last year." /></p><Package size={17} className="text-blue-500" /></div><p className={number}><span key={period + qty} className={styles.value}>{qty.toLocaleString('en-US')}</span></p><div className="mt-3">{previousQty > 0 ? <Growth value={(qty - previousQty) / previousQty * 100} description={comparison} /> : <span className="text-[10px] text-slate-400">No prior-period baseline</span>}</div></article>
      <article className={card}><div className="flex items-center justify-between"><p className={cn(label, 'flex items-center gap-1')}>Transactions<InfoTip label="About Transactions" text="Number of unique invoices at the boutiques (excluding Head Office), using the same comparison periods as Items sold." /></p><FileText size={17} className="text-blue-500" /></div><p className={number}><span key={period + transactions} className={styles.value}>{transactions.toLocaleString('en-US')}</span></p><div className="mt-3">{previousTransactions > 0 ? <Growth value={(transactions - previousTransactions) / previousTransactions * 100} description={comparison} /> : <span className="text-[10px] text-slate-400">No prior-period baseline</span>}</div></article>
      <article className={card}><div className="flex items-center justify-between"><p className={cn(label, 'flex items-center gap-1')}>Cost rate<InfoTip label="About Cost rate" text="Product cost plus card commission, as a share of gross sales for the selected month or year." /></p><Percent size={17} className="text-teal-500" /></div><p className={number}><span key={period} className={styles.value}>{pct(monthly ? k.costPercentage : k.annualCostPercentage)}</span></p><p className="mt-3 text-[11px] text-slate-500"><Amt value={monthly ? k.totalCost : k.annualTotalCost} compact /> / cost incl. commission</p><p className="mt-1 text-[10px] text-slate-400">As a share of gross sales</p></article>
      <article className={card}><div className="flex items-center justify-between"><p className={cn(label, 'flex items-center gap-1')}>Average discount<InfoTip label="About Average discount" text="Total discounts given, as a share of gross sales for the selected month or year." /></p><Percent size={17} className="text-amber-500" /></div><p className={number}><span key={period} className={styles.value}>{pct(monthly ? k.avgDiscountPercentage : k.annualAvgDiscountPercentage)}</span></p><p className="mt-3 text-[11px] text-slate-500"><Amt value={monthly ? k.totalValDisc : k.annualTotalValDisc} compact /> / total discounts</p><p className="mt-1 text-[10px] text-slate-400">As a share of gross sales</p></article>
    </div>
  </div>;
}

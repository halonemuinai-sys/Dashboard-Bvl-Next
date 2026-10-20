'use client';

import { motion } from 'motion/react';
import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import InfoTip from '@/components/InfoTip';
import type { DailyStore } from './dailyReportExport';

const pct = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : '0.0') + '%';
export const achievementTone = (value: number) =>
  value >= 100 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : value >= 80 ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-rose-50 text-rose-700 ring-rose-200';
const barTone = (value: number) => (value >= 100 ? 'bg-emerald-500' : value >= 80 ? 'bg-amber-500' : 'bg-blue-600');

function Metric({ label, value, warn, help }: { label: string; value: React.ReactNode; warn?: boolean; help?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-1 text-[11px] text-slate-500">{label}{help && <InfoTip label={`About ${label.toLowerCase()}`} text={help} />}</span>
      <span className={cn('text-xs font-semibold tabular-nums', warn ? 'text-rose-600' : 'text-slate-900')}>{value}</span>
    </div>
  );
}

export default function StoreReportCard({ store, index }: { store: DailyStore; index: number }) {
  const m = store.metrics;
  const categories = Object.entries(store.tableData);
  const total = categories.reduce((acc, [, v]) => ({
    qty: acc.qty + v.qty, reg: acc.reg + v.netNonSMI, smi: acc.smi + v.netSMI,
    gross: acc.gross + v.gross, disc: acc.disc + v.valDisc, stock: acc.stock + v.stock,
  }), { qty: 0, reg: 0, smi: 0, gross: 0, disc: 0, stock: 0 });

  return (
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.06 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white"><Store className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">{store.storeName}</h2>
            <span className={cn('mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', achievementTone(m.achievement))}>
              <span className="h-1 w-1 rounded-full bg-current" />{m.target > 0 ? `${pct(m.achievement)} of monthly target` : 'No target set'}
            </span>
          </div>
        </div>
        <dl className="flex gap-6 text-right">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Today</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-slate-900"><Amt value={m.todaySales} /></dd>
          </div>
          <div className="border-l border-slate-100 pl-6">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Month to date</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-slate-900"><Amt value={m.mtdSales} /></dd>
          </div>
        </dl>
      </header>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)]">
        {/* Target */}
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Monthly target</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900"><Amt value={m.target} /></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(Math.max(m.achievement, 0), 100)}%` }} transition={{ duration: 0.7, delay: 0.15 + index * 0.06 }}
              className={cn('h-full rounded-full', barTone(m.achievement))} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-slate-400"><span>0%</span><span className="font-semibold text-slate-600">{pct(m.achievement)}</span></div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Remaining to target</p>
            <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', m.remaining > 0 ? 'text-slate-900' : 'text-emerald-600')}>
              {m.remaining > 0 ? <Amt value={m.remaining} /> : 'Target reached'}
            </p>
          </div>
        </section>

        {/* Ratios */}
        <section className="divide-y divide-slate-100">
          <p className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Today</p>
          <Metric label="Units sold" value={`${m.todayQty} pcs`} />
          <Metric label="Selling cost" value={pct(m.sellingCostTodayPct)} warn={m.sellingCostTodayPct > 15} help="Discount plus card commission as a share of today's gross sales. Flagged above 15%." />
          <Metric label="Card fees (MDR)" value={pct(m.mdrCostTodayPct)} warn={m.mdrCostTodayPct > 2} help="Card commission as a share of today's gross sales. Flagged above 2%." />
          <p className="pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Month to date</p>
          <Metric label="Selling cost" value={pct(m.mtdCostPct)} warn={m.mtdCostPct > 15} />
          <Metric label="Card fees (MDR)" value={pct(m.mtdMdrPct)} />
          <Metric label="Average discount" value={pct(m.avgDiscMtd)} />
        </section>

        {/* Categories */}
        <section className="min-w-0">
          <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Today by category
            <InfoTip label="About the category table" text="Units and net sales for the selected day, split into regular and SMI sales. Remaining stock = opening stock of the month minus units sold month to date." />
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[460px] table-fixed text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-[26%] px-3 py-2">Category</th>
                  <th className="w-[10%] px-2 py-2 text-right">Qty</th>
                  <th className="w-[20%] px-2 py-2 text-right">Regular</th>
                  <th className="w-[18%] px-2 py-2 text-right">SMI</th>
                  <th className="w-[12%] px-2 py-2 text-right">Disc</th>
                  <th className="w-[14%] px-3 py-2 text-right">Stock left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map(([cat, v]) => (
                  <tr key={cat} className={cn('transition-colors hover:bg-slate-50/70', !v.qty && 'text-slate-400')}>
                    <td className="truncate px-3 py-2 font-medium text-slate-800">{cat}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{v.qty || '—'}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{v.netNonSMI ? <Amt value={v.netNonSMI} /> : '—'}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{v.netSMI ? <Amt value={v.netSMI} /> : '—'}</td>
                    <td className={cn('px-2 py-2 text-right tabular-nums', v.valDisc > 0 && 'text-amber-600')}>{v.gross > 0 ? pct((v.valDisc / v.gross) * 100) : '—'}</td>
                    <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', v.stock === 0 ? 'text-rose-600' : 'text-slate-700')}>{v.stock}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50/60 font-semibold text-slate-900">
                <tr>
                  <td className="px-3 py-2">Total</td>
                  <td className="px-2 py-2 text-right tabular-nums">{total.qty}</td>
                  <td className="px-2 py-2 text-right tabular-nums"><Amt value={total.reg} /></td>
                  <td className="px-2 py-2 text-right tabular-nums"><Amt value={total.smi} /></td>
                  <td className="px-2 py-2 text-right tabular-nums">{total.gross > 0 ? pct((total.disc / total.gross) * 100) : '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{total.stock}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </motion.article>
  );
}

'use client';

import { useId, useMemo, useState } from 'react';
import { ComposedChart, Bar, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, type TooltipContentProps } from 'recharts';
import { Activity, EyeOff, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { useHideAmounts } from '@/lib/hide-amounts';
import { useChartMotion } from '@/lib/use-chart-motion';
import { buildDailySalesSeries, businessDate, formatSalesAxis } from '@/lib/sales-chart-data';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
type DailyPoint = ReturnType<typeof buildDailySalesSeries>[number];
interface Props { dailyData: { net: number; qty: number }[]; month: string; year: number; asOfDate?: string }
function DailyTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const point = payload?.[0]?.payload as DailyPoint | undefined;
  if (!active || !point || point.net === null) return null;
  return <div className="min-w-56 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
    <p className="text-xs font-bold text-slate-800">{new Date(point.date + 'T00:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
    <p className="mb-3 mt-1 text-[10px] text-slate-400">{point.weekend ? 'Weekend' : 'Weekday'} / IDR</p>
    <dl className="space-y-2 text-xs">
      <div className="flex justify-between gap-5"><dt className="text-slate-500">Net sales</dt><dd className="font-semibold text-slate-900"><Amt value={point.net} /></dd></div>
      <div className="flex justify-between gap-5"><dt className="text-slate-500">7-day average</dt><dd className="font-semibold text-blue-600"><Amt value={point.average || 0} /></dd></div>
      <div className="flex justify-between gap-5"><dt className="text-slate-500">Month to date</dt><dd className="font-semibold text-teal-700"><Amt value={point.cumulative || 0} /></dd></div>
      <div className="flex justify-between gap-5 border-t border-slate-100 pt-2"><dt className="text-slate-500">Units sold</dt><dd className="font-semibold text-slate-700">{point.qty} pcs</dd></div>
    </dl>
  </div>;
}

export default function DailySalesChart({ dailyData, month, year, asOfDate = businessDate() }: Props) {
  const [mode, setMode] = useState<'daily' | 'cumulative'>('daily');
  const [showAverage, setShowAverage] = useState(true);
  const { hidden } = useHideAmounts();
  const animate = useChartMotion();
  const id = useId().replace(/:/g, '');
  const points = useMemo(() => buildDailySalesSeries(dailyData, year, MONTHS.indexOf(month), asOfDate), [dailyData, year, month, asOfDate]);
  const actual = points.filter(point => point.net !== null);
  const total = actual.reduce((sum, point) => sum + (point.net || 0), 0);
  const best = actual.reduce<DailyPoint | null>((highest, point) => !highest || point.net! > highest.net! ? point : highest, null);
  const hasSales = actual.some(point => point.net !== 0 || point.qty !== 0);
  const totalQty = actual.reduce((sum, point) => sum + (point.qty || 0), 0);

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><Activity size={20} /></span><div><h3 className="text-base font-bold tracking-tight text-slate-900">Daily sales rhythm</h3><p className="mt-1 text-[11px] text-slate-500">{month} {year} / including Head Office / IDR</p></div></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Daily chart view">
          {(['daily', 'cumulative'] as const).map(option => <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-500', mode === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>{option === 'daily' ? 'Daily' : 'Cumulative'}</button>)}
        </div>
        {mode === 'daily' && <button type="button" aria-pressed={showAverage} onClick={() => setShowAverage(value => !value)} className={cn('inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold', showAverage ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500')}><TrendingUp size={14} />7-day average</button>}
      </div>
    </div>
    <div className="p-4 sm:p-6">
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Recorded sales</p><p className="mt-1 text-sm font-semibold text-slate-900"><Amt value={total} compact /></p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Average / elapsed day</p><p className="mt-1 text-sm font-semibold text-slate-900"><Amt value={actual.length ? total / actual.length : 0} compact /></p></div>
        <div className="rounded-xl bg-teal-50/70 p-3"><p className="text-[10px] text-teal-700">Best day</p><p className="mt-1 text-sm font-semibold text-teal-900">{best && hasSales ? <>{best.day} {month.slice(0, 3)} <span className="font-normal text-teal-600">/ <Amt value={best.net || 0} compact /></span></> : '\u2014'}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Units sold</p><p className="mt-1 text-sm font-semibold text-slate-900">{totalQty.toLocaleString('en-US')} <span className="text-[10px] font-normal text-slate-400">pcs</span></p></div>
      </div>
      {hidden ? <div className="flex h-80 items-center justify-center gap-2 text-sm text-slate-400"><EyeOff size={18} />Sales chart hidden while amounts are hidden.</div> :
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart accessibilityLayer data={points} margin={{ top: 12, right: 12, left: 0, bottom: 8 }} barCategoryGap="25%">
            <defs>
              <linearGradient id={id + '-weekday'} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#14b8a6" /><stop offset="100%" stopColor="#14b8a6" stopOpacity={0.55} /></linearGradient>
              <linearGradient id={id + '-weekend'} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#93c5fd" /><stop offset="100%" stopColor="#93c5fd" stopOpacity={0.5} /></linearGradient>
              <linearGradient id={id + '-cumulative'} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 5" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} minTickGap={10} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatSalesAxis} width={58} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <Tooltip content={<DailyTooltip />} cursor={{ fill: '#f1f5f9', fillOpacity: 0.6 }} />
            {mode === 'daily' ? <Bar dataKey="net" name="Net sales" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={animate} animationDuration={700}>
              {points.map(point => <Cell key={point.date} fill={'url(#' + id + (point.weekend ? '-weekend' : '-weekday') + ')'} />)}
            </Bar> : <Area dataKey="cumulative" name="Cumulative sales" type="monotone" stroke="#2563eb" strokeWidth={3} fill={'url(#' + id + '-cumulative)'} connectNulls={false} isAnimationActive={animate} animationDuration={700} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />}
            {mode === 'daily' && showAverage && <Line dataKey="average" name="7-day average" type="monotone" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} connectNulls={false} isAnimationActive={animate} animationDuration={700} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-[10px] text-slate-500">
        <div className="flex flex-wrap gap-4">{mode === 'daily' ? <><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-teal-500" />Weekday</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-blue-300" />Weekend</span>{showAverage && <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-blue-600" />Trailing 7-day average</span>}</> : <span>Cumulative net sales from the first day of the month</span>}</div>
        <span>As of {asOfDate}</span>
      </div>
      {!hasSales && <p className="mt-3 text-xs text-slate-400">No sales recorded for this period.</p>}
      <p className="mt-3 text-[10px] leading-relaxed text-slate-400">Future days are blank. Averages include elapsed calendar days with zero sales; the first six days use the available days in this month.</p>
      <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50">
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-slate-600">View daily data</summary>
        <div className="max-h-64 overflow-auto px-4 pb-3"><table className="w-full text-right text-xs"><thead className="text-[10px] text-slate-400"><tr><th className="py-2 text-left">Day</th><th>Net sales</th><th>Units</th><th>Cumulative</th></tr></thead><tbody className="divide-y divide-slate-100">{actual.map(point => <tr key={point.date}><td className="py-2 text-left text-slate-500">{point.day} {month.slice(0, 3)}</td><td className="font-medium text-slate-700"><Amt value={point.net || 0} compact /></td><td className="text-slate-500">{point.qty}</td><td className="font-medium text-slate-700"><Amt value={point.cumulative || 0} compact /></td></tr>)}</tbody></table></div>
      </details>
    </div>
  </section>;
}

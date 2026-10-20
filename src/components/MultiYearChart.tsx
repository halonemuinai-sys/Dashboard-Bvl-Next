'use client';

import { useId, useState } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, type TooltipContentProps } from 'recharts';
import { ChartNoAxesCombined, EyeOff, Check, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { useHideAmounts } from '@/lib/hide-amounts';
import { useChartMotion } from '@/lib/use-chart-motion';
import { businessDate, formatSalesAxis } from '@/lib/sales-chart-data';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#2563eb', '#0d9488', '#0f172a', '#f59e0b', '#e11d48'];
interface Props {
  multiYearStats: Record<number, number[]>;
  multiYearTargets?: Record<number, number[]>;
  currentMonth: number;
  selectedYear?: number;
  asOfDate?: string;
}
function SalesTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  return <div className="min-w-48 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label} / IDR</p>
    {payload.filter(item => typeof item.value === 'number').map(item => <div key={String(item.dataKey)} className="flex items-center justify-between gap-6 py-1 text-xs"><span className="flex items-center gap-2 text-slate-500"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span><strong className="font-semibold text-slate-900"><Amt value={Number(item.value)} /></strong></div>)}
  </div>;
}

export default function MultiYearChart({ multiYearStats, multiYearTargets, currentMonth, selectedYear, asOfDate = businessDate() }: Props) {
  const years = Object.keys(multiYearStats).map(Number).filter(Number.isFinite).sort((a, b) => b - a);
  const focusYear = selectedYear ?? years[0];
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [showTarget, setShowTarget] = useState(false);
  const id = useId().replace(/:/g, '');
  const animate = useChartMotion();
  const { hidden } = useHideAmounts();
  const visibleYears = years.filter(year => overrides[year] ?? (year === focusYear || year === focusYear - 1));
  const chartData = MONTHS.map((name, month) => {
    const point: Record<string, string | number | null> = { name };
    for (const [year, values] of Object.entries(multiYearStats)) {
      const start = year + '-' + String(month + 1).padStart(2, '0') + '-01';
      point['y' + year] = start > asOfDate ? null : values[month] ?? 0;
    }
    point.target = multiYearTargets?.[focusYear]?.[month] ?? null;
    return point;
  });
  const color = (year: number) => COLORS[years.indexOf(year) % COLORS.length];

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ChartNoAxesCombined size={20} /></span><div><h3 className="text-base font-bold tracking-tight text-slate-900">Sales across the years</h3><p className="mt-1 text-[11px] text-slate-500">Monthly actual sales / boutiques only / IDR</p></div></div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Visible chart years">
        {years.map(year => { const active = visibleYears.includes(year); return <button key={year} type="button" aria-pressed={active} onClick={() => setOverrides(previous => ({ ...previous, [year]: !active }))} className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-500', active ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-transparent text-slate-400 hover:bg-slate-50')}><span className="h-2 w-2 rounded-full" style={{ background: active ? color(year) : '#cbd5e1' }} />{year}{active && <Check size={12} />}</button>; })}
        {multiYearTargets?.[focusYear] && <button type="button" aria-pressed={showTarget} onClick={() => setShowTarget(value => !value)} className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold', showTarget ? 'border-slate-300 bg-slate-100 text-slate-800' : 'border-slate-200 text-slate-500')}><Target size={13} />{focusYear} target</button>}
      </div>
    </div>
    <div className="p-4 sm:p-6">
      {hidden ? <div className="flex h-80 items-center justify-center gap-2 text-sm text-slate-400"><EyeOff size={18} />Sales chart hidden while amounts are hidden.</div> : !visibleYears.length && !showTarget ? <div className="flex h-80 items-center justify-center text-sm text-slate-400">Select a year above to show its sales.</div> :
      <div className="h-80 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart accessibilityLayer data={chartData} margin={{ top: 20, right: 12, bottom: 8, left: 2 }}>
            <defs>{years.map(year => <linearGradient key={year} id={id + '-year-' + year} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color(year)} stopOpacity={0.18} /><stop offset="100%" stopColor={color(year)} stopOpacity={0.01} /></linearGradient>)}</defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={8} minTickGap={20} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatSalesAxis} width={58} />
            <Tooltip content={<SalesTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <ReferenceLine x={MONTHS[currentMonth]} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Selected', position: 'top', fill: '#64748b', fontSize: 10 }} />
            {[...visibleYears].reverse().map(year => <Area key={year} dataKey={'y' + year} name={String(year) + ' actual'} type="monotone" stroke={color(year)} strokeWidth={year === focusYear ? 3 : 2} fill={'url(#' + id + '-year-' + year + ')'} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} connectNulls={false} isAnimationActive={animate} animationDuration={700} />)}
            {showTarget && <Line dataKey="target" name={focusYear + ' target'} stroke="#64748b" strokeWidth={2} strokeDasharray="6 5" dot={false} connectNulls={false} isAnimationActive={animate} animationDuration={500} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>}
      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleYears.map(year => <div key={year} className="rounded-xl bg-slate-50 px-4 py-3"><p className="flex items-center gap-2 text-[10px] font-medium text-slate-500"><span className="h-2 w-2 rounded-full" style={{ background: color(year) }} />{year} recorded sales</p><p className="mt-1 text-sm font-semibold text-slate-800"><Amt value={(multiYearStats[year] || []).reduce((total, value) => total + value, 0)} compact /></p></div>)}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-slate-400">Actuals through {asOfDate}. Future periods remain blank. The optional dashed line shows targets separately; totals contain actual sales only.</p>
    </div>
  </section>;
}

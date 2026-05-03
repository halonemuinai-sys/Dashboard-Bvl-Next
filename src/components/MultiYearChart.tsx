"use client";

import { useState, useMemo } from 'react';
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { cn, formatCurrency, formatCompact, formatChartValue } from '@/lib/utils';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const YEARS = [2026, 2025, 2024, 2023] as const;
type Year = typeof YEARS[number];

const YEAR_CONFIG: Record<Year, { line: string; gradientId: string; label: string }> = {
  2026: { line: '#2563EB', gradientId: 'grad2026', label: '2026' },
  2025: { line: '#DB2777', gradientId: 'grad2025', label: '2025' },
  2024: { line: '#D97706', gradientId: 'grad2024', label: '2024' },
  2023: { line: '#059669', gradientId: 'grad2023', label: '2023' },
};

interface Props {
  multiYearStats: Record<number, number[]>;
  currentMonth: number; // 0-indexed, marks current month with ref line
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const visible = payload.filter((p: any) => !p.hide && p.value > 0);
  if (visible.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 min-w-[160px]">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
      {visible.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--dot-color)]" style={{ '--dot-color': p.color } as any} />
            <span className="text-xs font-semibold text-slate-600">{p.name}</span>
          </div>
          <span className="text-xs font-bold text-slate-900">{formatCompact(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function MultiYearChart({ multiYearStats, currentMonth }: Props) {
  const [hidden, setHidden] = useState<Set<Year>>(new Set([2023, 2024]));

  const chartData = useMemo(() =>
    MONTH_SHORT.map((name, i) => {
      const point: Record<string, any> = { name, monthIdx: i };
      YEARS.forEach(y => { point[`y${y}`] = multiYearStats[y]?.[i] ?? 0; });
      return point;
    }),
  [multiYearStats]);

  const toggle = (y: Year) => {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(y) ? next.delete(y) : next.add(y);
      return next;
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {/* Header with Glassmorphism feel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.4)]" />
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Multi-Year Sales Trend</h3>
            <p className="text-slate-400 font-medium text-xs">Retail Performance Comparison (Excl. HO)</p>
          </div>
        </div>

      {/* Premium Year Toggles */}
        <div className="flex flex-wrap gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
          {YEARS.map(y => {
            const cfg = YEAR_CONFIG[y];
            const isHidden = hidden.has(y);
            return (
              <button
                key={y}
                type="button"
                onClick={() => toggle(y)}
                style={!isHidden ? { 
                  '--toggle-bg': cfg.line,
                  '--toggle-shadow': `${cfg.line}44`
                } as any : undefined}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 active:scale-95",
                  isHidden
                    ? "text-slate-400 hover:text-slate-600 hover:bg-white"
                    : "text-white bg-[var(--toggle-bg)] shadow-[0_8px_16px_-4px_var(--toggle-shadow)]"
                )}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full ring-2 transition-all duration-500",
                  isHidden ? "bg-slate-300 ring-transparent" : "bg-white ring-white/30 animate-pulse"
                )} />
                <span>{y}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Container with Reveal Animation */}
      <div className="h-[360px] chart-reveal" key={Array.from(hidden).join(',')}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {YEARS.map(y => (
                <linearGradient key={y} id={YEAR_CONFIG[y].gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={YEAR_CONFIG[y].line} stopOpacity={0.15} />
                  <stop offset="60%" stopColor={YEAR_CONFIG[y].line} stopOpacity={0.05} />
                  <stop offset="100%" stopColor={YEAR_CONFIG[y].line} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={v => v === 0 ? '0' : formatChartValue(v)}
              width={60}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1.5, strokeDasharray: '4 2' }} />

            {/* Reference line for current month */}
            <ReferenceLine
              x={MONTH_SHORT[currentMonth]}
              stroke="#94a3b8"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: 'Now', position: 'top', fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
            />

            {/* Render oldest years first so newer ones draw on top */}
            {([2023, 2024, 2025, 2026] as Year[]).map((y, i) => {
              const cfg = YEAR_CONFIG[y];
              const isHidden = hidden.has(y);
              return (
                <Area
                  key={y}
                  type="monotone"
                  dataKey={`y${y}`}
                  name={cfg.label}
                  stroke={cfg.line}
                  strokeWidth={isHidden ? 0 : 3.5}
                  strokeOpacity={isHidden ? 0 : 1}
                  fill={`url(#${cfg.gradientId})`}
                  fillOpacity={isHidden ? 0 : 1}
                  dot={false}
                    activeDot={isHidden ? false : {
                      r: 6, 
                      strokeWidth: 3, 
                      stroke: '#fff',
                      fill: cfg.line
                    }}
                  legendType={isHidden ? 'none' : 'line'}
                  animationBegin={i * 150}
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                  isAnimationActive
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom legend summary */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 pt-4 border-t border-slate-100">
        {YEARS.filter(y => !hidden.has(y)).map(y => {
          const total = multiYearStats[y]?.reduce((s, v) => s + v, 0) ?? 0;
          const cfg = YEAR_CONFIG[y];
          return (
            <div key={y} className="flex items-center gap-2">
              <div className="w-3 h-0.5 rounded-full bg-[var(--line-color)]" style={{ '--line-color': cfg.line } as any} />
              <span className="text-[11px] text-slate-500 font-medium">{y}</span>
              <span className="text-[11px] font-bold text-slate-700">{formatCompact(total)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

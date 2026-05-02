"use client";

import { useState, useMemo } from 'react';
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { cn, formatCompact, formatCurrency } from '@/lib/utils';

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
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 rounded-sm" />
          <h3 className="text-base font-bold text-slate-900">Multi-Year Sales Trend <span className="text-slate-400 font-normal text-sm">(Retail, Exc. HO)</span></h3>
        </div>

        {/* Year toggles */}
        <div className="flex flex-wrap gap-2">
          {YEARS.map(y => {
            const cfg = YEAR_CONFIG[y];
            const isHidden = hidden.has(y);
            return (
              <button
                key={y}
                type="button"
                onClick={() => toggle(y)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200",
                  isHidden
                    ? "bg-slate-50 border-slate-200 text-slate-400"
                    : "border-transparent text-white shadow-sm"
                )}
                style={!isHidden ? { backgroundColor: cfg.line } : undefined}
              >
                <span className={cn("w-2 h-2 rounded-full transition-all", isHidden ? "opacity-30" : "opacity-100")}
                  style={{ backgroundColor: cfg.line }} />
                <span className={cn("transition-all", isHidden && "line-through opacity-50")}>{y}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {YEARS.map(y => (
                <linearGradient key={y} id={YEAR_CONFIG[y].gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={YEAR_CONFIG[y].line} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={YEAR_CONFIG[y].line} stopOpacity={0} />
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
              tickFormatter={v => v === 0 ? '0' : formatCompact(v)}
              width={56}
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
                  strokeWidth={isHidden ? 0 : 2.5}
                  fill={`url(#${cfg.gradientId})`}
                  fillOpacity={isHidden ? 0 : 1}
                  dot={false}
                  activeDot={isHidden ? false : {
                    r: 5, strokeWidth: 2, stroke: '#fff',
                    fill: cfg.line,
                    style: { filter: `drop-shadow(0 0 4px ${cfg.line}66)` }
                  }}
                  hide={isHidden}
                  animationBegin={i * 120}
                  animationDuration={900}
                  animationEasing="ease-out"
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
              <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: cfg.line }} />
              <span className="text-[11px] text-slate-500 font-medium">{y}</span>
              <span className="text-[11px] font-bold text-slate-700">{formatCompact(total)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

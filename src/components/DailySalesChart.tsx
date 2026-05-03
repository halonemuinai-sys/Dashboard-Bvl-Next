"use client";

import { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { getDayType, getHolidayName, DayType } from '@/lib/holidays';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const BAR_COLORS: Record<DayType, string> = {
  weekday: '#34d399',  // emerald-400
  weekend: '#fb7185',  // rose-400
  holiday: '#fb7185',  // same as weekend
};
const BAR_OPACITY: Record<DayType, number> = {
  weekday: 0.85,
  weekend: 0.9,
  holiday: 1,
};

interface Props {
  dailyData: { net: number; qty: number }[];
  month: string;
  year: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: number;
}

function fmtJt(v: number) {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + ' M';
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(0) + 'jt';
  return v.toLocaleString('id-ID');
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  const net = payload[0]?.value ?? 0;
  const monthIndex = MONTHS.indexOf(payload[0]?.payload?.month ?? '');
  const year = payload[0]?.payload?.year ?? 0;
  const dayType = payload[0]?.payload?.dayType as DayType;
  const holidayName = getHolidayName(year, monthIndex, label);
  const DOW_NAMES = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const dow = new Date(year, monthIndex, label).getDay();

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 min-w-[160px]">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <p className="text-xs font-black text-slate-800">
          {DOW_NAMES[dow]}, {label} {MONTHS[monthIndex]?.slice(0,3)}
        </p>
        {dayType !== 'weekday' && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600">
            {dayType === 'holiday' ? 'Libur' : 'Weekend'}
          </span>
        )}
      </div>
      {holidayName && (
        <p className="text-[10px] text-rose-500 font-medium mb-1.5 italic">{holidayName}</p>
      )}
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-500">Net Sales</span>
        <span className="text-xs font-black text-slate-900">{fmtJt(net)}</span>
      </div>
      <div className="flex justify-between items-center mt-0.5">
        <span className="text-[10px] text-slate-500">Qty Sold</span>
        <span className="text-xs font-bold text-blue-600">{payload[0]?.payload?.qty ?? 0} pcs</span>
      </div>
    </div>
  );
}

export default function DailySalesChart({ dailyData, month, year }: Props) {
  const monthIndex = MONTHS.indexOf(month);

  const chartData = useMemo(() => {
    return dailyData.map((d, i) => {
      const day = i + 1;
      const dayType = getDayType(year, monthIndex, day);
      return {
        day,
        net: d.net,
        qty: d.qty,
        dayType,
        month,
        year,
      };
    });
  }, [dailyData, month, year, monthIndex]);

  const yMax = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.net), 0);
    return Math.ceil(max / 500_000_000) * 500_000_000 || 1_000_000_000;
  }, [chartData]);

  const weekendCount  = chartData.filter(d => d.dayType === 'weekend').length;
  const holidayCount  = chartData.filter(d => d.dayType === 'holiday').length;

  return (
    <div className="group relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 hover:border-slate-300 transition-all duration-500 overflow-hidden">
      {/* Subtle background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-50/0 to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded-sm" />
            <h3 className="text-base font-bold text-slate-900">
              Daily Sales Trend
              <span className="text-slate-400 font-normal text-sm ml-2">({month.slice(0,3)} {year})</span>
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 ml-3">
            {weekendCount} weekends · {holidayCount} hari libur nasional
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400" /> Hari Kerja
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <span className="inline-block w-3 h-3 rounded-sm bg-rose-400" /> Weekend / Libur
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <span className="inline-block w-8 border-t-[2.5px] border-[#1E50FF]" /> Trend
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={fmtJt}
              domain={[0, yMax]}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />

            <Bar 
              dataKey="net" 
              name="Net Sales" 
              radius={[4, 4, 0, 0]} 
              maxBarSize={28}
              animationDuration={1500}
              animationEasing="ease-out"
            >
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={BAR_COLORS[entry.dayType]}
                  fillOpacity={BAR_OPACITY[entry.dayType]}
                  className="transition-all duration-300 hover:opacity-80"
                />
              ))}
            </Bar>

            <Line
              type="monotone"
              dataKey="net"
              stroke="#1E50FF"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: '#1E50FF', stroke: '#fff', strokeWidth: 2 }}
              animationDuration={2000}
              animationEasing="ease-in-out"
              name="Trend"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

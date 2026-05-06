"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarRange, TrendingUp, TrendingDown, Star, RefreshCw, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { dashboardService } from '@/services/dashboardService';

type HeatmapData = Awaited<ReturnType<typeof dashboardService.getHeatmapData>>;
type Metric = 'net' | 'qty';

const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STORES  = ['ALL', 'Plaza Indonesia', 'Plaza Senayan', 'Bali'];
const DAY_HDR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const NOTE_KEY = (y: number, m: number, d: number) => `heatmap_note_${y}_${m}_${d}`;
const fmtShort = (v: number) => v >= 1e9 ? (v/1e9).toFixed(1)+'B' : v >= 1e6 ? (v/1e6).toFixed(0)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : String(v);

// ── Color engine — smooth RGB interpolation ───────────────────────────────────
function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }

const STOPS_NET: [number,number,number][] = [
  [240,253,244],  // 0%   emerald-50
  [167,243,208],  // 25%  emerald-200
  [52, 211,153],  // 50%  emerald-400
  [5,  150,105],  // 75%  emerald-600
  [6,  78, 59],   // 100% emerald-900
];
const STOPS_QTY: [number,number,number][] = [
  [240,249,255],  // 0%   sky-50
  [186,230,253],  // 25%  sky-200
  [56, 189,248],  // 50%  sky-400
  [2,  132,199],  // 75%  sky-600
  [12, 74, 110],  // 100% sky-900
];

function intensityToRgb(t: number, stops: [number,number,number][]): string {
  const scaled = t * (stops.length - 1);
  const lo = Math.floor(scaled), hi = Math.min(lo + 1, stops.length - 1);
  const f  = scaled - lo;
  return `rgb(${lerp(stops[lo][0],stops[hi][0],f)},${lerp(stops[lo][1],stops[hi][1],f)},${lerp(stops[lo][2],stops[hi][2],f)})`;
}

function cellBg(intensity: number, isWeekend: boolean, hasData: boolean, metric: Metric): string {
  if (!hasData) return isWeekend ? '#fff1f2' : '#f8fafc';
  return intensityToRgb(Math.max(0.08, intensity), metric === 'net' ? STOPS_NET : STOPS_QTY);
}
function cellText(intensity: number, hasData: boolean): string {
  if (!hasData) return '#94a3b8';
  return intensity > 0.55 ? '#ffffff' : '#064e3b';
}

// ── SVG gradient legend ───────────────────────────────────────────────────────
function GradientLegend({ metric }: { metric: Metric }) {
  const id = `hm-grad-${metric}`;
  const stops = metric === 'net' ? STOPS_NET : STOPS_QTY;
  return (
    <svg width={160} height={12} className="rounded-full overflow-hidden">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
          {stops.map((s, i) => (
            <stop key={i} offset={`${(i/(stops.length-1))*100}%`}
              stopColor={`rgb(${s[0]},${s[1]},${s[2]})`} />
          ))}
        </linearGradient>
      </defs>
      <rect width={160} height={12} fill={`url(#${id})`} />
    </svg>
  );
}

// ── Day Cell ──────────────────────────────────────────────────────────────────
interface CellProps {
  dayNum: number; net: number; qty: number;
  intensity: number; isWeekend: boolean; hasData: boolean;
  metric: Metric; note?: string;
  dateLabel: string; maxVal: number;
  onClick: () => void;
}
function DayCell({ dayNum, net, qty, intensity, isWeekend, hasData, metric, note, dateLabel, maxVal, onClick }: CellProps) {
  const bg   = cellBg(intensity, isWeekend, hasData, metric);
  const fg   = cellText(intensity, hasData);
  const val  = metric === 'net' ? net : qty;
  const barW = hasData ? Math.max(4, intensity * 100) : 0;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer select-none"
      style={{ aspectRatio: '1' }}
    >
      {/* Card */}
      <div
        className="absolute inset-0 rounded-2xl transition-all duration-200 group-hover:scale-[1.08] group-hover:z-10 group-hover:shadow-lg flex flex-col p-2 overflow-hidden"
        style={{ backgroundColor: bg }}
      >
        {/* Day number */}
        <span className="text-[11px] font-black leading-none mb-auto" style={{ color: fg, opacity: hasData ? 1 : 0.5 }}>
          {dayNum}
        </span>

        {/* Value */}
        {hasData && (
          <span className="text-[9px] font-black leading-none mb-1.5 tracking-tight" style={{ color: fg, opacity: 0.85 }}>
            {fmtShort(val)}
          </span>
        )}

        {/* Intensity bar at bottom */}
        <div className="h-1 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${barW}%`, backgroundColor: hasData ? 'rgba(255,255,255,0.5)' : 'transparent' }} />
        </div>

        {/* Note dot */}
        {note && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm" />
        )}
      </div>

      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30
        invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150">
        <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-3 w-44 text-left border border-slate-700">
          <p className="text-[11px] font-black text-slate-200 mb-2 border-b border-slate-700 pb-2">{dateLabel}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400">Net Sales</span>
              <span className="text-[11px] font-black text-emerald-400"><Amt value={net} short /></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400">Qty</span>
              <span className="text-[11px] font-black text-sky-400">{qty} pcs</span>
            </div>
            {hasData && (
              <div className="pt-1.5 border-t border-slate-700">
                <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${Math.round(intensity * 100)}%` }} />
                </div>
                <p className="text-[9px] text-slate-500 mt-0.5 text-right">{Math.round(intensity * 100)}% of peak</p>
              </div>
            )}
            {note && (
              <div className="pt-1.5 border-t border-slate-700">
                <p className="text-[9px] italic text-blue-300 leading-snug">
                  "{note.length > 70 ? note.slice(0,70)+'…' : note}"
                </p>
              </div>
            )}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
            border-[6px] border-transparent border-t-slate-900" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HeatmapCalendarPage() {
  const now = new Date();
  const [month,  setMonth]  = useState(now.getMonth() + 1);
  const [year,   setYear]   = useState(String(now.getFullYear()));
  const [store,  setStore]  = useState('ALL');
  const [metric, setMetric] = useState<Metric>('net');
  const [data,   setData]   = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes,  setNotes]  = useState<Record<number, string>>({});
  const [modal,  setModal]  = useState<{ open: boolean; day: number; text: string }>({ open: false, day: 0, text: '' });
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    dashboardService.getHeatmapData(month, Number(year), store)
      .then(setData).catch(console.error).finally(() => setLoading(false));
  }, [month, year, store]);

  useEffect(() => {
    const loaded: Record<number, string> = {};
    for (let d = 1; d <= 31; d++) {
      const v = localStorage.getItem(NOTE_KEY(Number(year), month, d));
      if (v) loaded[d] = v;
    }
    setNotes(loaded);
  }, [month, year]);

  const maxVal = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.dailyStats.map(d => metric === 'net' ? d.net : d.qty));
  }, [data, metric]);

  const openModal = useCallback((day: number) => {
    setModal({ open: true, day, text: notes[day] ?? '' });
    setCharCount((notes[day] ?? '').length);
  }, [notes]);

  const saveNote = useCallback(() => {
    const text = modal.text.trim();
    if (text) {
      localStorage.setItem(NOTE_KEY(Number(year), month, modal.day), text);
      setNotes(prev => ({ ...prev, [modal.day]: text }));
    } else {
      localStorage.removeItem(NOTE_KEY(Number(year), month, modal.day));
      setNotes(prev => { const n = { ...prev }; delete n[modal.day]; return n; });
    }
    setModal(m => ({ ...m, open: false }));
  }, [modal, year, month]);

  const deleteNote = useCallback(() => {
    localStorage.removeItem(NOTE_KEY(Number(year), month, modal.day));
    setNotes(prev => { const n = { ...prev }; delete n[modal.day]; return n; });
    setModal(m => ({ ...m, open: false }));
  }, [modal, year, month]);

  const kpi = data?.kpi;

  return (
    <div className="space-y-6 p-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CalendarRange className="w-4 h-4 text-emerald-600" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Heatmap Calendar</h1>
          </div>
          <p className="text-slate-500 text-sm">Daily Sales Intensity — {MONTHS[month-1]} {year}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Metric pill toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-0.5">
            {(['net','qty'] as Metric[]).map(m => (
              <button key={m} type="button" onClick={() => setMetric(m)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  metric === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                {m === 'net' ? 'Net Sales' : 'Qty'}
              </button>
            ))}
          </div>
          <select aria-label="month" value={month} onChange={e => setMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
          <select aria-label="year" value={year} onChange={e => setYear(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {['2026','2025','2024'].map(y => <option key={y}>{y}</option>)}
          </select>
          <select aria-label="store" value={store} onChange={e => setStore(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {STORES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Stores' : s}</option>)}
          </select>
          {loading && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Highest Grossing Day', accent: ['from-emerald-600','to-emerald-400'],
            icon: TrendingUp, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500',
            value: kpi?.bestDay?.label, sub: kpi?.bestDay
              ? <span className="text-emerald-600 font-bold"><Amt value={kpi.bestDay.net} short /> · {kpi.bestDay.qty} pcs</span>
              : null,
          },
          {
            label: 'Lowest Grossing Day', accent: ['from-rose-600','to-rose-400'],
            icon: TrendingDown, iconBg: 'bg-rose-50', iconColor: 'text-rose-500',
            value: kpi?.worstDay?.label, sub: kpi?.worstDay
              ? <span className="text-rose-500 font-bold"><Amt value={kpi.worstDay.net} short /> · {kpi.worstDay.qty} pcs</span>
              : null,
          },
          {
            label: 'Best Day of Week', accent: ['from-blue-600','to-blue-400'],
            icon: Star, iconBg: 'bg-blue-50', iconColor: 'text-blue-500',
            value: kpi?.bestDow, sub: kpi?.bestDowAvg
              ? <span className="text-slate-500 font-bold">Avg <Amt value={kpi.bestDowAvg} short /></span>
              : <span className="text-slate-400">Avg. Highest Performing Weekday</span>,
          },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className={cn('h-[3px] bg-gradient-to-r', ...card.accent)} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
                <span className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', card.iconBg)}>
                  <card.icon className={cn('w-4 h-4', card.iconColor)} />
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">{card.value ?? '—'}</h3>
              <div className="text-[11px]">{card.sub ?? <span className="text-slate-400">No data</span>}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Calendar Grid ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

        {/* Calendar header bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Daily Performance Heatmap</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{MONTHS[month-1]} {year} · click hari untuk tambah catatan</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
            <span>Low</span>
            <GradientLegend metric={metric} />
            <span>High</span>
          </div>
        </div>

        <div className="p-5 overflow-x-auto">
          <div className="min-w-[500px]">

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {DAY_HDR.map((d, i) => (
                <div key={d} className="text-center">
                  <span className={cn(
                    'text-[10px] font-black uppercase px-2 py-0.5 rounded-full',
                    i === 0 ? 'text-rose-500 bg-rose-50'
                    : i === 6 ? 'text-blue-500 bg-blue-50'
                    : 'text-slate-400'
                  )}>{d}</span>
                </div>
              ))}
            </div>

            {/* Cells */}
            {loading ? (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : data ? (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: data.firstDayOfWeek }).map((_, i) => (
                  <div key={`pad-${i}`} style={{ aspectRatio: '1' }} />
                ))}
                {data.dailyStats.map((day, idx) => {
                  const dayNum   = idx + 1;
                  const dow      = (data.firstDayOfWeek + idx) % 7;
                  const isWeekend = dow === 0 || dow === 6;
                  const val      = metric === 'net' ? day.net : day.qty;
                  const intensity = maxVal > 0 ? val / maxVal : 0;
                  const hasData  = val > 0;
                  const dateLabel = new Date(Number(year), month-1, dayNum)
                    .toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
                  return (
                    <DayCell key={dayNum}
                      dayNum={dayNum} net={day.net} qty={day.qty}
                      intensity={intensity} isWeekend={isWeekend} hasData={hasData}
                      metric={metric} note={notes[dayNum]}
                      dateLabel={dateLabel} maxVal={maxVal}
                      onClick={() => openModal(dayNum)}
                    />
                  );
                })}
              </div>
            ) : null}

            {/* Weekend legend */}
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-50 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#fff1f2' }} />
                Weekend (no sales)
              </span>
              <span className="flex items-center gap-1.5">
                <StickyNote className="w-3 h-3 text-blue-400" />
                Hari dengan catatan
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Note Modal ──────────────────────────────────────────────── */}
      {modal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(m => ({ ...m, open: false })); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Catatan Hari Ini</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(Number(year), month-1, modal.day)
                      .toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button type="button" onClick={() => setModal(m => ({ ...m, open: false }))}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors text-sm font-bold">
                  ✕
                </button>
              </div>
            </div>
            {/* Modal body */}
            <div className="p-6">
              <textarea rows={4} maxLength={500} value={modal.text} autoFocus
                onChange={e => { setModal(m => ({ ...m, text: e.target.value })); setCharCount(e.target.value.length); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none outline-none transition-all placeholder:text-slate-400"
                placeholder="Tulis catatan untuk tanggal ini... (maks 500 karakter)"
              />
              <div className="flex items-center justify-between mt-2 mb-5">
                <span className="text-[10px] text-slate-400">{charCount}/500 karakter</span>
                <span className="text-[10px] text-slate-300">tersimpan di perangkat ini</span>
              </div>
              <div className="flex items-center justify-between">
                {notes[modal.day] ? (
                  <button type="button" onClick={deleteNote}
                    className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl transition-all">
                    Hapus Catatan
                  </button>
                ) : <div />}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModal(m => ({ ...m, open: false }))}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all">
                    Batal
                  </button>
                  <button type="button" onClick={saveNote}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm active:scale-95">
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

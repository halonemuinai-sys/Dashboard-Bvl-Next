'use client';

import { useRef, useState } from 'react';
import { addMonths, format } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MonthPeriod { month: number; year: number }

export default function MonthYearPicker({ value, onChange }: { value: MonthPeriod; onChange: (period: MonthPeriod) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [browseYear, setBrowseYear] = useState(value.year);
  const current = new Date();
  const minYear = Math.min(2023, value.year);
  const maxYear = Math.max(current.getFullYear() + 1, value.year);
  const selected = new Date(value.year, value.month, 1);
  const choose = (date: Date) => {
    onChange({ month: date.getMonth(), year: date.getFullYear() });
    dialog.current?.close();
  };
  const navClass = 'rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-30 disabled:cursor-not-allowed';

  return <>
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <button type="button" aria-label="Previous month" disabled={value.year === minYear && value.month === 0} onClick={() => choose(addMonths(selected, -1))} className={navClass}><ChevronLeft size={16} /></button>
      <button type="button" aria-haspopup="dialog" onClick={() => { setBrowseYear(value.year); dialog.current?.showModal(); }} className="flex min-w-44 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500">
        <CalendarDays size={17} className="text-blue-600" />{format(selected, 'MMMM yyyy')}<ChevronDown size={14} className="text-slate-400" />
      </button>
      <button type="button" aria-label="Next month" disabled={value.year === maxYear && value.month === 11} onClick={() => choose(addMonths(selected, 1))} className={navClass}><ChevronRight size={16} /></button>
    </div>
    <dialog ref={dialog} aria-labelledby="month-year-title" className="m-auto w-[min(380px,calc(100vw-32px))] rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm" onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
    }}>
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center justify-between"><h2 id="month-year-title" className="text-base font-semibold tracking-tight text-slate-900">Reporting period</h2><button type="button" aria-label="Close period picker" onClick={() => dialog.current?.close()} className={navClass}><X size={16} /></button></div>
        <p className="mt-1 text-xs text-slate-500">Choose a month to view its performance.</p>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 p-1.5">
          <button type="button" aria-label="Previous year" disabled={browseYear <= minYear} onClick={() => setBrowseYear(year => year - 1)} className={navClass}><ChevronLeft size={17} /></button>
          <select aria-label="Reporting year" value={browseYear} onChange={event => setBrowseYear(Number(event.target.value))} className="rounded-lg bg-transparent px-4 py-2 text-sm font-bold text-slate-800 outline-blue-500">
            {Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index).map(year => <option key={year}>{year}</option>)}
          </select>
          <button type="button" aria-label="Next year" disabled={browseYear >= maxYear} onClick={() => setBrowseYear(year => year + 1)} className={navClass}><ChevronRight size={17} /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, month) => {
            const active = month === value.month && browseYear === value.year;
            const today = month === current.getMonth() && browseYear === current.getFullYear();
            return <button key={month} type="button" aria-pressed={active} aria-label={format(new Date(browseYear, month, 1), 'MMMM yyyy')} onClick={() => choose(new Date(browseYear, month, 1))} className={cn('flex h-12 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500', active ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : today ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50')}>
              {format(new Date(browseYear, month, 1), 'MMM')}{active && <Check size={13} />}
            </button>;
          })}
        </div>
      </div>
      <div className="flex gap-2 border-t border-slate-100 bg-slate-50 p-4">
        <button type="button" onClick={() => choose(current)} className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">This month</button>
        <button type="button" onClick={() => choose(addMonths(current, -1))} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Last month</button>
      </div>
    </dialog>
  </>;
}

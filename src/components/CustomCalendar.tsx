"use client";

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CustomCalendar({ selectedDate, onSelect }: CustomCalendarProps) {
  const selected = new Date(selectedDate);
  const [viewDate, setViewDate] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const result = [];
    
    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      result.push({
        day: prevMonthDays - i,
        month: month - 1,
        year,
        isCurrentMonth: false
      });
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      result.push({
        day: i,
        month,
        year,
        isCurrentMonth: true
      });
    }
    
    // Next month padding
    const paddingNeeded = 42 - result.length;
    for (let i = 1; i <= paddingNeeded; i++) {
      result.push({
        day: i,
        month: month + 1,
        year,
        isCurrentMonth: false
      });
    }
    
    return result;
  }, [viewDate]);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isToday = (d: number, m: number, y: number) => {
    const today = new Date();
    return d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
  };

  const isSelected = (d: number, m: number, y: number) => {
    return d === selected.getDate() && m === selected.getMonth() && y === selected.getFullYear();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 w-[320px] animate-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <h3 className="font-black text-slate-900 tracking-tight">
          {MONTHS[viewDate.getMonth()]} <span className="text-blue-600">{viewDate.getFullYear()}</span>
        </h3>
        <div className="flex gap-1">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const active = isSelected(d.day, d.month, d.year);
          const current = isToday(d.day, d.month, d.year);
          
          return (
            <button
              key={i}
              onClick={() => {
                const yyyy = d.year;
                const mm = String(d.month + 1).padStart(2, '0');
                const dd = String(d.day).padStart(2, '0');
                onSelect(`${yyyy}-${mm}-${dd}`);
              }}
              className={cn(
                "h-10 rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all relative group",
                !d.isCurrentMonth && "text-slate-300 opacity-50",
                d.isCurrentMonth && "text-slate-700 hover:bg-blue-50 hover:text-blue-600",
                active && "bg-blue-600 text-white hover:bg-blue-700 hover:text-white shadow-lg shadow-blue-200",
                current && !active && "text-blue-600"
              )}
            >
              {d.day}
              {current && !active && (
                <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / Quick actions if needed */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center">
        <button 
          onClick={() => onSelect(new Date().toISOString().split('T')[0])}
          className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
        >
          Go to Today
        </button>
      </div>
    </div>
  );
}

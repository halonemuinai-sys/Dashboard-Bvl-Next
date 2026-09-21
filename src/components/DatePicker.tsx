"use client";

import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronDown, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-day-picker/style.css';

export interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (dateStr: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  fromYear?: number;
  toYear?: number;
  dropdownLayout?: boolean;
  allowClear?: boolean;
  showShortcuts?: boolean;
  align?: 'left' | 'right';
  label?: string;
  required?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal...",
  disabled = false,
  className,
  buttonClassName,
  fromYear = 1930,
  toYear = new Date().getFullYear() + 2,
  dropdownLayout = true,
  allowClear = true,
  showShortcuts = true,
  align = 'left',
  label,
  required = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM-DD to Date
  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const isDateValid = selectedDate && isValid(selectedDate);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      if (allowClear) onChange('');
      return;
    }
    const formatted = format(date, 'yyyy-MM-dd');
    onChange(formatted);
    setIsOpen(false);
  };

  const handleQuickSelect = (type: 'today' | 'yesterday' | 'clear') => {
    const today = new Date();
    if (type === 'today') {
      onChange(format(today, 'yyyy-MM-dd'));
      setIsOpen(false);
    } else if (type === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      onChange(format(yesterday, 'yyyy-MM-dd'));
      setIsOpen(false);
    } else if (type === 'clear') {
      onChange('');
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div className="relative flex items-center">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium flex items-center justify-between transition-all duration-200 shadow-2xs group cursor-pointer text-left",
            isOpen && "border-slate-800 ring-2 ring-slate-900/10 bg-white",
            disabled && "opacity-50 cursor-not-allowed bg-slate-100",
            buttonClassName
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={cn(
              "p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 transition-colors group-hover:text-slate-900 group-hover:border-slate-300",
              isOpen && "bg-slate-900 text-white border-slate-900"
            )}>
              <CalendarIcon className="w-3.5 h-3.5" />
            </div>
            <span className={cn("truncate font-semibold", isDateValid ? "text-slate-900" : "text-slate-400 font-normal")}>
              {isDateValid ? format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id }) : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1 ml-2 shrink-0">
            {allowClear && isDateValid && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Hapus tanggal"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isOpen && "rotate-180 text-slate-900")} />
          </div>
        </button>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-2 z-50 bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200",
            align === 'right' ? "right-0" : "left-0",
            "min-w-[320px] max-w-[360px]"
          )}
          style={{
            // Custom CSS variables for DayPicker luxury theme
            ['--rdp-accent-color' as any]: '#0f172a',
            ['--rdp-accent-background-color' as any]: '#f1f5f9',
            ['--rdp-day_button-border-radius' as any]: '10px',
            ['--rdp-day_button-width' as any]: '38px',
            ['--rdp-day_button-height' as any]: '38px',
          }}
        >
          {/* Quick Shortcuts Bar */}
          {showShortcuts && (
            <div className="flex items-center justify-between gap-1 pb-3 mb-2 border-b border-slate-100 text-[11px] font-bold">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickSelect('today')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect('yesterday')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 rounded-lg transition-colors"
                >
                  Kemarin
                </button>
              </div>
              {allowClear && isDateValid && (
                <button
                  type="button"
                  onClick={() => handleQuickSelect('clear')}
                  className="text-red-500 hover:text-red-700 hover:underline px-1.5 py-1"
                >
                  Kosongkan
                </button>
              )}
            </div>
          )}

          {/* react-day-picker component */}
          <div className="bvl-datepicker-wrapper">
            <DayPicker
              mode="single"
              selected={isDateValid ? selectedDate : undefined}
              onSelect={handleSelect}
              locale={id}
              captionLayout={dropdownLayout ? "dropdown" : "label"}
              startMonth={new Date(fromYear, 0)}
              endMonth={new Date(toYear, 11)}
              showOutsideDays
              classNames={{
                root: "p-0 text-slate-800 font-sans",
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-3",
                month_caption: "flex justify-center pt-1 relative items-center mb-2 font-bold text-slate-900 text-sm",
                dropdowns: "flex gap-1 items-center justify-center text-xs font-bold",
                months_dropdown: "bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-semibold cursor-pointer outline-none hover:border-slate-400 transition-colors",
                years_dropdown: "bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-semibold cursor-pointer outline-none hover:border-slate-400 transition-colors",
                nav: "space-x-1 flex items-center",
                button_previous: "h-7 w-7 bg-transparent hover:bg-slate-100 p-0 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer",
                button_next: "h-7 w-7 bg-transparent hover:bg-slate-100 p-0 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer",
                month_grid: "w-full border-collapse space-y-1",
                weekdays: "flex justify-between mb-1",
                weekday: "text-slate-400 font-bold w-9 text-[10px] text-center uppercase tracking-wider py-1",
                weeks: "space-y-1",
                week: "flex w-full justify-between mt-1",
                day: "h-9 w-9 p-0 font-medium text-xs text-center flex items-center justify-center",
                day_button: "h-9 w-9 p-0 font-semibold rounded-xl transition-all duration-150 flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 cursor-pointer",
                selected: "[&>.rdp-day_button]:!bg-slate-900 [&>.rdp-day_button]:!text-white [&>.rdp-day_button]:font-black [&>.rdp-day_button]:shadow-md [&>.rdp-day_button]:shadow-slate-300",
                today: "[&>.rdp-day_button]:border-2 [&>.rdp-day_button]:border-blue-500 [&>.rdp-day_button]:font-bold",
                outside: "opacity-30 text-slate-400",
                disabled: "text-slate-300 opacity-50 cursor-not-allowed",
              }}
            />
          </div>

          {/* Selected Date Summary Footer */}
          {isDateValid && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span>Terpilih:</span>
              <span className="font-bold text-slate-800">
                {format(selectedDate, 'd MMM yyyy', { locale: id })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

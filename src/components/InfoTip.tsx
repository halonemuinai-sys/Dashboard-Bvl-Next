'use client';

import { useId, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Small "i" button that explains a metric. Opens on hover, keyboard focus or tap; Escape closes it. */
export default function InfoTip({ text, label = 'More information', tone = 'light', className }: {
  text: React.ReactNode; label?: string; tone?: 'light' | 'dark'; className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className={cn('relative inline-flex align-middle', className)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={label} aria-describedby={open ? id : undefined} aria-expanded={open}
        onClick={() => setOpen(value => !value)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}
        className={cn('inline-flex h-4 w-4 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-blue-500',
          tone === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-300 hover:text-slate-600')}>
        <Info size={13} />
      </button>
      {open && (
        <span id={id} role="tooltip"
          className="absolute left-0 top-full z-30 mt-1.5 w-60 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-normal normal-case leading-relaxed tracking-normal text-slate-100 shadow-lg ring-1 ring-white/10">
          {text}
        </span>
      )}
    </span>
  );
}

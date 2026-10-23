'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

// A docked DevTools panel takes space from the page, so the outer window becomes noticeably
// larger than the viewport. Below this gap we assume only normal browser chrome (scrollbars,
// side panels). This is a deterrent for casual users, not a security boundary.
const GAP = 160;

function devtoolsOpen() {
  // Page zoom shrinks the viewport in both directions by the same factor, while a docked
  // DevTools panel takes space from one side only. Compare the two ratios so zooming is ignored.
  const browserBars = 120; // tabs, address bar, bookmarks bar
  const widthRatio = window.innerWidth / window.outerWidth;
  const heightRatio = window.innerHeight / Math.max(1, window.outerHeight - browserBars);
  const docked = (side: number, other: number) => side < other - 0.12;
  const sidePanel = window.outerWidth - window.innerWidth > GAP && docked(widthRatio, heightRatio);
  const bottomPanel = window.outerHeight - window.innerHeight > GAP + browserBars && docked(heightRatio, widthRatio);
  return sidePanel || bottomPanel;
}

/** Blurs the whole dashboard while browser DevTools appear to be open (production only, desktop only). */
export default function DevtoolsGuard() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    // Phones and tablets have no docked DevTools and report unreliable window sizes.
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const check = () => setOpen(document.visibilityState === 'visible' && devtoolsOpen());
    const timer = window.setInterval(check, 1000);
    window.addEventListener('resize', check);
    check();
    return () => { window.clearInterval(timer); window.removeEventListener('resize', check); };
  }, []);

  if (!open) return null;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="devtools-guard-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-2xl">
      <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><ShieldAlert className="h-5 w-5" /></span>
        <h2 id="devtools-guard-title" className="mt-3 text-base font-semibold tracking-tight text-slate-900">Content hidden</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Developer tools are open. Close them to continue viewing the dashboard. This data is confidential to Bvlgari Indonesia.
        </p>
      </div>
    </div>
  );
}

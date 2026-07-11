"use client";

import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { STORE_CONFIG, fmtPct, type StoreCard } from './constants';

export default function StorePerformanceCards({ storeCards }: { storeCards: StoreCard[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {storeCards.map(({ store, physical, adjusted, impact, varPct, incomingNet, outgoingNet }) => {
        const cfg    = STORE_CONFIG[store];
        const isGain = impact >= 0;
        return (
          <div key={store} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-10 -mt-10 pointer-events-none", cfg.bg)} />

            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] tracking-wider", cfg.bg, cfg.text)}>
                  {cfg.abbr}
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{store}</p>
              </div>
              <span className={cn(
                "flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full",
                isGain ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
              )}>
                {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {fmtPct(varPct)}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-[11px] font-medium text-slate-400 mb-1">Net Team Performance</p>
              <h4 className="text-2xl font-bold text-slate-900 font-mono tracking-tight"><Amt value={adjusted} /></h4>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-medium">Physical (at store)</span>
                <span className="font-mono font-bold text-slate-600"><Amt value={physical} /></span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-emerald-600 font-semibold">↑ Outgoing (team away)</span>
                <span className="font-mono font-bold text-emerald-600">+<Amt value={outgoingNet} /></span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-rose-500 font-semibold">↓ Incoming (others here)</span>
                <span className="font-mono font-bold text-rose-500">−<Amt value={incomingNet} /></span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { Store, Target, TrendingUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';

interface StoreData {
  store: string;
  actual: number;
  cost: number;
  target: number;
  qty: number;
  achievement: number;
}

interface Props {
  stores: StoreData[];
  month: string;
  year: string;
}

const fmtPct = (n: number) => n.toFixed(1) + '%';

export default function StorePerformanceTable({ stores, month, year }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-500 chart-reveal" style={{ '--delay': '350ms' } as any}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Store Performance</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{month} {year}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
          LIVE
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] bg-slate-50/50">
              <th className="px-6 py-3 w-[25%]">Store Location</th>
              <th className="px-5 py-3 text-right">Actual Sales</th>
              <th className="px-5 py-3 text-right text-blue-600/70">Target</th>
              <th className="px-5 py-3 text-right">Achievement</th>
              <th className="px-6 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60">
            {stores.map((s, i) => {
              const achv = s.achievement;
              const isAchieved = achv >= 100;
              const isOnTrack = achv >= 85;
              
              return (
                <tr key={s.store} 
                  className="hover:bg-slate-50/50 transition-all duration-300 group chart-reveal"
                  style={{ '--delay': `${400 + (i * 50)}ms` } as any}
                >
                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                        {s.store}
                        {isAchieved && <TrendingUp className="w-3 h-3 text-emerald-500 animate-bounce" />}
                      </span>
                      <div className="mt-1.5 w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            isAchieved ? "bg-emerald-500" : isOnTrack ? "bg-blue-500" : "bg-rose-500"
                          )}
                          style={{ width: `${Math.min(achv, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-black text-slate-900 tracking-tight">
                        <Amt value={s.actual} />
                      </span>
                      <span className="text-[9px] font-bold text-rose-500/80">
                        Cost: <Amt value={s.cost} />
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[10px] font-bold text-slate-500 font-mono tracking-tighter">
                      <Amt value={s.target} />
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className={cn(
                        "text-xs font-black tracking-tight",
                        isAchieved ? "text-emerald-600" : isOnTrack ? "text-blue-600" : "text-rose-600"
                      )}>
                        {achv.toFixed(1)}%
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-0.5">
                        {isAchieved ? 'Above' : <><Amt value={Math.max(0, s.target - s.actual)} /> left</>}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                      isAchieved 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                        : isOnTrack 
                        ? "bg-blue-50 text-blue-600 border-blue-100" 
                        : "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                      {isAchieved ? 'Achieved' : isOnTrack ? 'On Track' : 'Below'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Footer */}
      <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Achieved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">On Track</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Below Target</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from 'next/link';
import { Repeat, ExternalLink, ArrowRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';

interface CrossingRecord {
  salesman: string;
  baseLoc: string;
  crossingLoc: string;
  net: number;
  qty: number;
}

interface StoreRow {
  store: string;
  adjusted: number;
  achievement: number;
}

interface CrossingSummary {
  records: CrossingRecord[];
  totalNet: number;
  totalQty: number;
  storeRows: StoreRow[];
}

interface Props {
  summary: CrossingSummary;
}

export default function CrossingSalesWidget({ summary }: Props) {
  const AVATAR_COLORS = ['bg-blue-500','bg-amber-500','bg-emerald-500','bg-rose-500','bg-violet-500','bg-cyan-500'];

  const abbr = (loc: string) => {
    const l = loc.toLowerCase();
    if (l.includes('senayan')) return 'PS';
    if (l.includes('indonesia')) return 'PI';
    if (l.includes('bali')) return 'Bali';
    return loc.replace('Plaza ','').replace(' Boutique','');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-500 flex flex-col overflow-hidden h-full chart-reveal" style={{ '--delay': '300ms' } as any}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200 group-hover:rotate-12 transition-transform duration-500">
            <Repeat className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">Crossing Sales</h3>
        </div>
        <Link href="/crossing-sales" className="p-2 hover:bg-white rounded-lg transition-colors group">
          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </Link>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 gap-0 border-b border-slate-100 bg-white">
        <div className="px-6 py-4 border-r border-slate-100 group hover:bg-amber-50/30 transition-colors">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
          <p className="text-xl font-black text-amber-600 tracking-tighter"><Amt value={summary.totalNet} compact /></p>
        </div>
        <div className="px-6 py-4 group hover:bg-blue-50/30 transition-colors">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Qty</p>
          <p className="text-xl font-black text-slate-800 tracking-tighter">{summary.totalQty} <span className="text-xs font-bold text-slate-400">pcs</span></p>
        </div>
      </div>

      {/* Store Summary Table */}
      <div className="border-b border-slate-100 bg-slate-50/30">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">
              <th className="px-6 py-3 font-black">Location</th>
              <th className="px-6 py-3 text-right font-black">Adjusted</th>
              <th className="px-6 py-3 text-right font-black">Achv</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summary.storeRows.map(({ store, adjusted, achievement }) => (
              <tr key={store} className="group hover:bg-white transition-colors">
                <td className="px-6 py-4 text-xs font-black text-slate-500 group-hover:text-slate-900 tracking-tight">{abbr(store)}</td>
                <td className="px-6 py-4 text-right font-black text-sm text-slate-900 tracking-tighter"><Amt value={adjusted} compact /></td>
                <td className="px-6 py-4 text-right">
                  <span className={cn("text-xs font-black",
                    achievement >= 100 ? "text-emerald-600" : achievement >= 85 ? "text-amber-500" : "text-rose-500"
                  )}>
                    {achievement > 0 ? achievement.toFixed(1) + '%' : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Advisors List */}
      <div className="flex-1 overflow-hidden bg-white">
        {summary.records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-300">
            <Repeat className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-xs font-bold">No records found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {summary.records.map((rec, i) => {
              const initials = rec.salesman.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
              return (
                <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-all duration-300 group cursor-default">
                  {/* Avatar */}
                  <div className={cn("w-9 h-9 rounded-2xl flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                    {initials}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors">{rec.salesman}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{abbr(rec.baseLoc)}</span>
                      <div className="w-3 h-px bg-slate-200" />
                      <ArrowRight className="w-2.5 h-2.5 text-amber-500" />
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">{abbr(rec.crossingLoc)}</span>
                    </div>
                  </div>
                  {/* Value */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900 tracking-tight"><Amt value={rec.net} compact /></p>
                    <p className="text-[9px] font-bold text-slate-400">{rec.qty} pcs</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

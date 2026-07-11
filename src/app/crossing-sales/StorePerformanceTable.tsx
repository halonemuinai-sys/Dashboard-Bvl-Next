"use client";

import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { STORE_CONFIG, type StoreCard } from './constants';

export default function StorePerformanceTable({ storeCards }: { storeCards: StoreCard[] }) {
  if (storeCards.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="w-2 h-2 bg-blue-600 rounded-full" />
        <h3 className="text-sm font-bold text-slate-900">Store Performance Summary</h3>
        <span className="ml-auto text-[10px] text-slate-400 font-medium">Physical ± Crossing = Net Team Performance</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th className="py-3 px-5">Store</th>
              <th className="py-3 px-5 text-right">Physical Sales</th>
              <th className="py-3 px-5 text-right text-emerald-600">+ Outgoing</th>
              <th className="py-3 px-5 text-right text-rose-500">− Incoming</th>
              <th className="py-3 px-5 text-right text-blue-700">Net Team Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {storeCards.map(({ store, physical, adjusted, outgoingNet, incomingNet }) => {
              const cfg = STORE_CONFIG[store];
              return (
                <tr key={store} className="text-xs hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-5">
                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold", cfg.bg, cfg.text)}>
                      {cfg.abbr} {store}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-slate-600"><Amt value={physical} /></td>
                  <td className="py-3 px-5 text-right font-mono font-bold text-emerald-600">
                    {outgoingNet > 0 ? <><span className="text-emerald-400 mr-0.5">+</span><Amt value={outgoingNet} /></> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3 px-5 text-right font-mono font-bold text-rose-500">
                    {incomingNet > 0 ? <><span className="mr-0.5">−</span><Amt value={incomingNet} /></> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3 px-5 text-right font-mono font-black text-blue-700 text-sm"><Amt value={adjusted} /></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr className="text-xs font-bold text-slate-700">
              <td className="py-3 px-5">Total All Stores</td>
              <td className="py-3 px-5 text-right font-mono">
                <Amt value={storeCards.reduce((s, c) => s + c.physical, 0)} />
              </td>
              <td className="py-3 px-5 text-right font-mono text-emerald-600">
                +<Amt value={storeCards.reduce((s, c) => s + c.outgoingNet, 0)} />
              </td>
              <td className="py-3 px-5 text-right font-mono text-rose-500">
                −<Amt value={storeCards.reduce((s, c) => s + c.incomingNet, 0)} />
              </td>
              <td className="py-3 px-5 text-right font-mono font-black text-blue-700">
                <Amt value={storeCards.reduce((s, c) => s + c.adjusted, 0)} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

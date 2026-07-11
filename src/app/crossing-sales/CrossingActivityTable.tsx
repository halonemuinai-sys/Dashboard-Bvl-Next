"use client";

import { Repeat, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { type CrossingSalesData } from '@/services/dashboardService';
import { STORE_CONFIG } from './constants';

export default function CrossingActivityTable({ data }: { data: CrossingSalesData }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="w-2 h-2 bg-amber-500 rounded-full" />
        <h3 className="text-sm font-bold text-slate-900">Crossing Activity Details</h3>
        <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          {data.records.length} advisors
        </span>
      </div>

      {data.records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Repeat className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No crossing sales recorded for this period</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Sales Advisor</th>
                <th className="py-3 px-5">Base Location</th>
                <th className="py-3 px-3 text-center"></th>
                <th className="py-3 px-5 text-amber-600">Crossing Destination</th>
                <th className="py-3 px-5 text-right w-44">Net Sales Generated</th>
                <th className="py-3 px-5 text-center w-24">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.records.map((rec, i) => {
                const baseCfg = STORE_CONFIG[rec.baseLoc];
                const destCfg = STORE_CONFIG[rec.crossingLoc];
                return (
                  <tr key={i} className="text-xs hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-5 font-bold text-slate-800">{rec.salesman}</td>
                    <td className="py-3 px-5">
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold", baseCfg?.bg, baseCfg?.text)}>
                        {baseCfg?.abbr} {rec.baseLoc}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                    </td>
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600">
                        {destCfg?.abbr} {rec.crossingLoc}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-bold text-slate-800"><Amt value={rec.net} /></td>
                    <td className="py-3 px-5 text-center font-mono text-slate-500">{rec.qty}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr className="text-xs font-bold text-slate-700">
                <td className="py-3 px-5" colSpan={4}>Total Crossing Sales</td>
                <td className="py-3 px-5 text-right font-mono"><Amt value={data.totalNet} /></td>
                <td className="py-3 px-5 text-center font-mono">{data.totalQty}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

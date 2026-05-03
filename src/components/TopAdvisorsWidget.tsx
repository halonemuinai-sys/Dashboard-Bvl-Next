"use client";

import { Award, TrendingUp, ArrowRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { AdvisorRecord } from '@/services/dashboardService';

interface Props {
  advisors: AdvisorRecord[];
}

export default function TopAdvisorsWidget({ advisors }: Props) {
  // Filter only those with achievement > 100% and sort by achievement descending
  const topPerformers = advisors
    .filter(a => a.achievement > 100)
    .sort((a, b) => b.achievement - a.achievement)
    .slice(0, 10); // Show top 10

  if (topPerformers.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden chart-reveal" style={{ '--delay': '400ms' } as any}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/20 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">Customer Advisor Performance ({'>'}100%)</h3>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          TOP 10
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] bg-slate-50/50 border-b border-slate-100">
              <th className="px-5 py-3 w-10 text-center">#</th>
              <th className="px-5 py-3 w-[20%]">Advisor Name</th>
              <th className="px-5 py-3 w-[15%]">Location</th>
              <th className="px-5 py-3 text-center w-16">Trans No</th>
              <th className="px-5 py-3 text-right">Net Sales</th>
              <th className="px-5 py-3 text-right">Target</th>
              <th className="px-5 py-3 text-right">Achievement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60">
            {topPerformers.map((adv, i) => (
              <tr 
                key={adv.name} 
                className="hover:bg-slate-50/50 transition-all duration-300 group chart-reveal"
                style={{ '--delay': `${450 + (i * 50)}ms` } as any}
              >
                <td className="px-5 py-3 text-center">
                  <span className="text-[11px] font-bold text-slate-300">{i + 1}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{adv.name}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{adv.location}</span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="text-[11px] font-black text-slate-700">{adv.transCount}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-[11px] font-black text-emerald-600 tracking-tighter"><Amt value={adv.netSales} /></span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-[10px] font-bold text-slate-300 font-mono tracking-tighter"><Amt value={adv.target} /></span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex items-center justify-center min-w-[54px] px-2 py-0.5 rounded-full bg-emerald-100/50 border border-emerald-200/50 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                    <span className="text-[10px] font-black">{adv.achievement.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

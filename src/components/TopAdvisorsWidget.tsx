"use client";

import { useState } from 'react';
import { Award, TrendingUp, ArrowRight, MapPin, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { AdvisorRecord } from '@/services/dashboardService';

interface Props {
  advisors: AdvisorRecord[];
}

export default function TopAdvisorsWidget({ advisors }: Props) {
  const [activeTab, setActiveTab] = useState<'met' | 'unmet'>('met');

  // Filter only active advisors (target > 0)
  const activeAdvisors = advisors.filter(a => a.target > 0);

  // Filter and sort met performance (achievement >= 100)
  const metPerformers = activeAdvisors
    .filter(a => a.achievement >= 100)
    .sort((a, b) => b.achievement - a.achievement);

  // Filter and sort unmet performance (achievement < 100)
  const unmetPerformers = activeAdvisors
    .filter(a => a.achievement < 100)
    .sort((a, b) => b.achievement - a.achievement);

  // If both lists are empty, hide the entire widget
  if (metPerformers.length === 0 && unmetPerformers.length === 0) return null;

  const displayedPerformers = (activeTab === 'met' ? metPerformers : unmetPerformers).slice(0, 10);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden chart-reveal" style={{ '--delay': '400ms' } as any}>
      {/* Header with Tab switcher */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">Customer Advisor Performance</h3>
        <div className="flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('met')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5",
              activeTab === 'met'
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200/20"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Met Target
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-black",
              activeTab === 'met' ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
            )}>
              {metPerformers.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('unmet')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5",
              activeTab === 'unmet'
                ? "bg-white text-rose-700 shadow-sm border border-slate-200/20"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Under Target
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-black",
              activeTab === 'unmet' ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-600"
            )}>
              {unmetPerformers.length}
            </span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        {displayedPerformers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/20">
            <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-400">
              No advisors found for this category.
            </p>
          </div>
        ) : (
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
              {displayedPerformers.map((adv, i) => {
                const isMet = adv.achievement >= 100;
                return (
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
                      <div className={cn(
                        "inline-flex items-center justify-center min-w-[54px] px-2 py-0.5 rounded-full transition-all duration-500",
                        isMet
                          ? "bg-emerald-100/50 border border-emerald-200/50 text-emerald-700 group-hover:bg-emerald-500 group-hover:text-white"
                          : "bg-rose-100/50 border border-rose-200/50 text-rose-700 group-hover:bg-rose-500 group-hover:text-white"
                      )}>
                        <span className="text-[10px] font-black">{adv.achievement.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

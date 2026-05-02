"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Trophy, Target, DollarSign, TrendingUp, Calendar as CalendarIcon,
  Search, FileSpreadsheet, FileText, User, ArrowUpRight, Medal, RefreshCw
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { cn, formatCurrency, formatCompact } from '@/lib/utils';
import { dashboardService, AdvisorPerformanceData, AdvisorRecord } from '@/services/dashboardService';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAT_COLORS: Record<string,string> = { Jewelry:'#F59E0B', Watches:'#3B82F6', Accessories:'#EC4899', Perfume:'#10B981', Other:'#8B5CF6' };

const fmtPct = (n: number) => n.toFixed(1) + '%';
const fmtTooltip = (v: any) => formatCurrency(Number(v));

const TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#0f172a', fontSize: 12 };

const achvColor = (a: number) => a >= 100 ? 'text-emerald-600' : a >= 80 ? 'text-amber-500' : 'text-rose-500';
const achvBg   = (a: number) => a >= 100 ? 'bg-emerald-500' : a >= 80 ? 'bg-amber-500' : 'bg-rose-500';

export default function AdvisorPerformancePage() {
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdvisorPerformanceData | null>(null);
  const [search, setSearch] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState<AdvisorRecord | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await dashboardService.getAdvisorPerformance(month, parseInt(year));
        setData(r);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [month, year]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.advisors.filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const locations = useMemo(() => {
    return Array.from(new Set(filtered.map(a => a.location))).sort();
  }, [filtered]);

  const summary = useMemo(() => {
    if (!data || data.advisors.length === 0) return { totalSales: 0, totalTarget: 0, avgAchv: 0, topName: '-' };
    const advisors = data.advisors;
    const totalSales = advisors.reduce((s,a) => s + a.netSales, 0);
    const totalTarget = advisors.reduce((s,a) => s + a.target, 0);
    const withTarget = advisors.filter(a => a.target > 0);
    const avgAchv = withTarget.length > 0 ? withTarget.reduce((s,a) => s + a.achievement, 0) / withTarget.length : 0;
    return { totalSales, totalTarget, avgAchv, topName: advisors[0]?.name || '-' };
  }, [data]);

  if (loading || !data) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Analyzing Advisor Performance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Trophy className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Advisor Performance</h1>
          </div>
          <p className="text-slate-500 text-sm">Detailed performance metrics per advisor & store — {month} {year}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search advisor..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm py-2 pl-10 pr-4 rounded-xl outline-none focus:border-blue-400 transition-colors w-full md:w-64 shadow-sm" />
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <select aria-label="Select month" value={month} onChange={e => setMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer border-l border-slate-200 pl-2 ml-2">
              <option value="2026">2026</option><option value="2025">2025</option>
            </select>
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700" title="Export Excel">
              <FileSpreadsheet className="w-4 h-4" /></button>
            <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700" title="Export PDF">
              <FileText className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title:'Total Net Sales', value: formatCompact(summary.totalSales), sub:'Monthly Aggregate', icon: DollarSign },
          { title:'Total Target', value: formatCompact(summary.totalTarget), sub:'Combined Goal', icon: Target },
          { title:'Avg. Achievement', value: fmtPct(summary.avgAchv), sub:'Advisors with target', icon: TrendingUp },
          { title:'Top Performer', value: summary.topName, sub:'Highest Sales Value', icon: Medal },
        ].map(card => (
          <div key={card.title} className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-slate-300 hover:shadow-sm transition-all shadow-sm group">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                <card.icon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{card.title}</p>
            <h3 className="text-xl font-bold text-slate-900 mb-1">{card.value}</h3>
            <p className="text-[10px] text-slate-400 font-medium">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Advisor Detail Modal */}
      {selectedAdvisor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedAdvisor(null)}>
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedAdvisor.name}</h2>
                <p className="text-sm text-slate-500">{selectedAdvisor.location}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setSelectedAdvisor(null)} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Net Sales</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(selectedAdvisor.netSales)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Achievement</p>
                <p className={cn("text-lg font-black", achvColor(selectedAdvisor.achievement))}>{fmtPct(selectedAdvisor.achievement)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Transactions</p>
                <p className="text-lg font-bold text-slate-900">{selectedAdvisor.transCount}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Store Contrib.</p>
                <p className="text-lg font-bold text-blue-600">{fmtPct(selectedAdvisor.storeData.advisorContrib)}</p>
              </div>
            </div>
            {selectedAdvisor.categoryMix.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Category Mix</p>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={selectedAdvisor.categoryMix.map(c => ({name:c.category, value:c.amount}))} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {selectedAdvisor.categoryMix.map((c,i) => <Cell key={i} fill={CAT_COLORS[c.category]||'#8B5CF6'} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtTooltip} />
                      <Legend verticalAlign="bottom" formatter={v => <span className="text-[10px] font-bold text-slate-500">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tables grouped by location */}
      <div className="space-y-8">
        {locations.map(loc => {
          const locAdvisors = filtered.filter(a => a.location === loc).sort((a,b) => b.netSales - a.netSales);
          return (
            <div key={loc} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-blue-600 rounded-full" />
                  <h2 className="text-base font-bold text-slate-900">{loc}</h2>
                  <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold">{locAdvisors.length} STAFF</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-3 text-center w-12">#</th>
                      <th className="px-6 py-3">Advisor Name</th>
                      <th className="px-6 py-3 text-right w-40">Net Sales</th>
                      <th className="px-6 py-3 text-right text-blue-600 bg-blue-50 w-40">Crossing Sales</th>
                      <th className="px-6 py-3 text-right w-40">Target</th>
                      <th className="px-6 py-3 text-center w-48">Achievement</th>
                      <th className="px-6 py-3 text-center w-24">Trans</th>
                      <th className="px-6 py-3 text-center w-16">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {locAdvisors.map((adv, idx) => (
                      <tr key={adv.name} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 text-center">
                          {idx === 0 ? <span className="text-lg">🥇</span> :
                           idx === 1 ? <span className="text-lg">🥈</span> :
                           idx === 2 ? <span className="text-lg">🥉</span> :
                           <span className="text-xs font-bold text-slate-400">{idx+1}</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                              <User className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{adv.name}</p>
                              <p className="text-[10px] text-slate-400">Contrib: {fmtPct(adv.contribution)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs font-bold text-slate-700">{formatCurrency(adv.netSales)}</td>
                        <td className="px-6 py-4 text-right font-mono text-xs font-bold text-blue-600 bg-blue-50">
                          {adv.crossingNet > 0 ? formatCurrency(adv.crossingNet) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">{formatCurrency(adv.target)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center px-1">
                              <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded",
                                achvColor(adv.achievement),
                                adv.achievement >= 100 ? 'bg-emerald-50' : adv.achievement >= 80 ? 'bg-amber-50' : 'bg-rose-50'
                              )}>{fmtPct(adv.achievement)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-1000 w-[var(--progress)]", achvBg(adv.achievement))}
                                style={{ '--progress': `${Math.min(adv.achievement,100)}%` } as any} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">{adv.transCount}</td>
                        <td className="px-6 py-4 text-center">
                          <button type="button" aria-label={`View details for ${adv.name}`} onClick={() => setSelectedAdvisor(adv)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-blue-600">
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

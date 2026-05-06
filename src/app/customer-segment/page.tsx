"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts';
import {
  Users, Search, RefreshCw, Download,
  TrendingUp, UserCheck, Star, UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import CustomerModal from '@/components/CustomerModal';
import BvlgariLoader from '@/components/BvlgariLoader';
import {
  customerService, SEGMENT_ORDER, SEGMENT_CFG,
  type Segment, type CustomerProfile,
} from '@/services/customerService';

type Overview = Awaited<ReturnType<typeof customerService.getSegmentationOverview>>;

const fmtPct   = (n: number) => n.toFixed(1) + '%';
const fmtShort = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(0) + 'M';
  return n.toLocaleString('id-ID');
};

const SEGMENT_BADGE_STYLE: Record<Segment, string> = {
  'Top':           'bg-slate-900 text-amber-400 border-slate-700',
  'Elite':         'bg-purple-50  text-purple-700  border-purple-200',
  'High Potential':'bg-teal-50    text-teal-700    border-teal-200',
  'Potential':     'bg-blue-50    text-blue-700    border-blue-200',
  'Prospect':      'bg-slate-100  text-slate-500   border-slate-200',
  'Inactive':      'bg-rose-50    text-rose-700    border-rose-200',
};

function SegmentBadge({ seg }: { seg: Segment }) {
  return (
    <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full border', SEGMENT_BADGE_STYLE[seg])}>
      {seg.toUpperCase()}
    </span>
  );
}

export default function CustomerSegmentPage() {
  const [year, setYear]           = useState(String(new Date().getFullYear()));
  const [loading, setLoading]     = useState(true);
  const [data, setData]           = useState<Overview | null>(null);
  const [activeSegments, setActiveSegments] = useState<Set<Segment>>(new Set());
  const [search, setSearch]       = useState('');
  const [modalName, setModalName] = useState<string | null>(null);
  const [modalSeg, setModalSeg]   = useState<Segment | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await customerService.getSegmentationOverview(parseInt(year));
        setData(res);
        setActiveSegments(new Set());
        setSearch('');
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [year]);

  const toggleSegment = (seg: Segment) => {
    setActiveSegments(prev => {
      const next = new Set(prev);
      if (next.has(seg)) next.delete(seg);
      else next.add(seg);
      return next;
    });
  };

  const filteredCustomers = useMemo((): CustomerProfile[] => {
    if (!data) return [];
    return data.customers.filter(c => {
      const matchSeg = activeSegments.size === 0 || activeSegments.has(c.segment);
      const matchTxt = !search || c.name.toLowerCase().includes(search.toLowerCase());
      return matchSeg && matchTxt;
    });
  }, [data, activeSegments, search]);

  const exportCSV = () => {
    if (!data) return;
    const header = ['Name', 'Segment', 'Freq Invoice', 'Freq Qty', 'Recency (Days)', 'LTV'].join(',');
    const rows = filteredCustomers.map(c =>
      [`"${c.name}"`, c.segment, c.freqInvoice, c.freqQty, c.recencyDays, c.ltv].join(',')
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[header, ...rows].join('\n')], { type: 'text/csv' }));
    a.download = `Customer_Segmentation_${year}.csv`;
    a.click();
  };

  const openModal = (c: CustomerProfile) => {
    setModalName(c.name);
    setModalSeg(c.segment);
  };

  if (loading || !data) return <BvlgariLoader message="Loading Customer Intelligence..." />;

  const { kpi, segmentDistribution, revenueMix, growthTrend } = data;
  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Users className="w-5 h-5 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Intelligence &amp; Segmentation</h1>
            </div>
            <p className="text-slate-500 text-sm">Comprehensive analysis of customer purchasing behavior and retention</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Select year"
              value={year}
              onChange={e => setYear(e.target.value)}
              className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer"
            >
              {['2026','2025','2024','2023'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={exportCSV}
              className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm text-xs font-bold text-slate-600 hover:border-slate-300 transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* ── KPI Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Active Customers */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-200">
                <UserCheck className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Active Customers</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {kpi.totalActiveCustomers.toLocaleString('id-ID')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-50">Last 24 months</p>
          </div>

          {/* Avg LTV */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-purple-200">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                Lifetime
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Avg. LTV</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              <Amt value={kpi.avgLtv} short />
            </h3>
            <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-50">Per active customer</p>
          </div>

          {/* Top Spender */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-200">
                <Star className="w-4 h-4 text-white" />
              </div>
              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                #1 Rank
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Top Spender</p>
            <h3 className="text-base font-black text-slate-900 leading-tight line-clamp-1">
              {kpi.topSpender.name || '—'}
            </h3>
            <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-50">
              <span className="font-bold text-amber-600"><Amt value={kpi.topSpender.spend} short /></span> lifetime spend
            </p>
          </div>

          {/* New Customer Ratio */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm shadow-emerald-200">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                {year}
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">New Customer Ratio</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {fmtPct(kpi.newCustomerRatio)}
            </h3>
            <div className="mt-3 pt-3 border-t border-slate-50">
              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(kpi.newCustomerRatio, 100)}%` }} />
              </div>
            </div>
          </div>

        </div>

        {/* ── Segment Filter Badges ─────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Filter:</span>
          {SEGMENT_ORDER.map(seg => {
            const cnt   = data.customers.filter(c => c.segment === seg).length;
            const isOn  = activeSegments.has(seg);
            const cfg   = SEGMENT_CFG[seg];
            return (
              <button
                key={seg}
                type="button"
                onClick={() => toggleSegment(seg)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black transition-all',
                  isOn
                    ? cn(cfg.bg, cfg.text, cfg.border, 'shadow-sm ring-1 ring-offset-1',
                        seg === 'Top' ? 'ring-amber-400' : 'ring-current')
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                )}
              >
                {seg}
                <span className={cn(
                  'text-[9px] px-1.5 py-px rounded-full font-black',
                  isOn ? 'bg-white/20' : 'bg-slate-100 text-slate-400'
                )}>{cnt}</span>
              </button>
            );
          })}
          {activeSegments.size > 0 && (
            <button
              type="button"
              onClick={() => setActiveSegments(new Set())}
              className="ml-2 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Charts Row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Donut: Segment Distribution */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-900">Segment Distribution</h3>
              <p className="text-[10px] text-slate-400">Customer count per tier</p>
            </div>
            <div className="p-4 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={segmentDistribution.filter(s => s.count > 0)}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="name"
                  >
                    {segmentDistribution.filter(s => s.count > 0).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartTooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                    formatter={((v: unknown) => [String(v), '']) as any}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 w-full px-2">
                {segmentDistribution.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[10px] text-slate-500 truncate">{s.name}</span>
                    <span className="text-[10px] font-black text-slate-700 ml-auto">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar: Revenue Source */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-900">Revenue Source</h3>
              <p className="text-[10px] text-slate-400">New vs Repeat customers — {year}</p>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { name: 'New',    value: revenueMix.newRevenue    },
                    { name: 'Repeat', value: revenueMix.repeatRevenue },
                  ]}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => fmtShort(v)} />
                  <RechartTooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                    formatter={(v: unknown) => [fmtShort(Number(v)), 'Revenue']}
                  />
                  <Bar dataKey="value" radius={[6,6,0,0]} maxBarSize={56}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 font-bold">NEW</p>
                  <p className="text-sm font-black text-blue-600"><Amt value={revenueMix.newRevenue} short /></p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 font-bold">REPEAT</p>
                  <p className="text-sm font-black text-emerald-600"><Amt value={revenueMix.repeatRevenue} short /></p>
                </div>
              </div>
            </div>
          </div>

          {/* Line: Acquisition & Retention Trend */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-900">Acquisition &amp; Retention Trend</h3>
              <p className="text-[10px] text-slate-400">Monthly new vs repeat customers — {year}</p>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={growthTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartTooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                    formatter={((v: unknown, name: unknown) => [String(v), name === 'new' ? 'New' : 'Repeat']) as any}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                    formatter={(v: string) => v === 'new' ? 'New' : 'Repeat'} />
                  <Line dataKey="new"    stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  <Line dataKey="repeat" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Customer Table ────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-1 h-4 bg-blue-600 rounded-sm" />
              <h3 className="text-sm font-black text-slate-900">Detailed Segment Analysis</h3>
              <span className="text-[10px] font-bold text-slate-400 ml-1">
                {filteredCustomers.length} customers
                {activeSegments.size > 0 || search ? ` (filtered)` : ''}
              </span>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 placeholder-slate-400 outline-none focus:border-blue-300 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="sticky top-0 bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 shadow-sm">
                <tr>
                  <th className="py-3 px-5">#</th>
                  <th className="py-3 px-5">Customer Name</th>
                  <th className="py-3 px-5">Segment</th>
                  <th className="py-3 px-5 text-right">Freq Invoice</th>
                  <th className="py-3 px-5 text-right">Freq Qty</th>
                  <th className="py-3 px-5 text-right">Recency (Days)</th>
                  <th className="py-3 px-5 text-right">Lifetime Value</th>
                  <th className="py-3 px-5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCustomers.map((c, i) => (
                  <tr key={c.name} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-3 px-5 text-slate-300 font-bold">{i + 1}</td>
                    <td className="py-3 px-5 font-bold text-slate-800 group-hover:text-blue-600 transition-colors max-w-[200px] truncate">
                      {c.name}
                    </td>
                    <td className="py-3 px-5">
                      <SegmentBadge seg={c.segment} />
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-slate-700">{c.freqInvoice}</td>
                    <td className="py-3 px-5 text-right font-mono text-slate-700">{c.freqQty.toLocaleString('id-ID')}</td>
                    <td className={cn('py-3 px-5 text-right font-bold',
                      c.recencyDays <= 90  ? 'text-emerald-600' :
                      c.recencyDays <= 365 ? 'text-amber-500' : 'text-rose-500')}>
                      {c.recencyDays}
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-black text-slate-800">
                      <Amt value={c.ltv} short />
                    </td>
                    <td className="py-3 px-5">
                      <button
                        type="button"
                        onClick={() => openModal(c)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 text-sm">
                      {search || activeSegments.size > 0 ? 'No customers match the current filter.' : 'No customer data available.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Customer Detail Modal ──────────────────────────────────────── */}
      <CustomerModal
        name={modalName}
        segment={modalSeg}
        onClose={() => { setModalName(null); setModalSeg(null); }}
      />
    </>
  );
}

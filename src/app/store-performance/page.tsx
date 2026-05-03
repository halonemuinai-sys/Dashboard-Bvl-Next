"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Building2, Calendar as CalendarIcon, Filter, RefreshCw, PieChart as PieChartIcon
} from 'lucide-react';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { cn, formatCurrency, formatCompact } from '@/lib/utils';
import { dashboardService, MonthlyOverviewData } from '@/services/dashboardService';
import Amt from '@/components/Amt';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CAT_COLORS: Record<string,string> = { Jewelry:'#F59E0B', Watches:'#3B82F6', Accessories:'#EC4899', Perfume:'#10B981', Other:'#8B5CF6' };

const fmtPct = (n: number) => n.toFixed(1) + '%';
const fmtTooltip = (v: any) => formatCurrency(Number(v));

const TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#0f172a', fontSize: 12 };
const GRID_COLOR = '#e2e8f0';
const TICK_COLOR = '#94a3b8';

export default function StorePerformancePage() {
  const [selectedStore, setSelectedStore] = useState('Plaza Indonesia');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonthlyOverviewData | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await dashboardService.getMonthlyOverview('January', parseInt(selectedYear));
        setData(r);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [selectedYear]);

  const storeKpi = useMemo(() => {
    if (!data) return null;
    const store = data.storeData.find(s => s.store === selectedStore);
    if (!store) return null;
    return {
      totalSales: store.actual,
      target: store.target,
      achievement: store.achievement,
      qty: store.qty,
      cost: store.cost,
      costPct: store.actual > 0 ? (store.cost / store.actual) * 100 : 0,
    };
  }, [data, selectedStore]);

  const monthlyTrend = useMemo(() => {
    if (!data?.multiYearStats) return [];
    const yr = parseInt(selectedYear);
    const current = data.multiYearStats[yr] || new Array(12).fill(0);
    const prev = data.multiYearStats[yr - 1] || new Array(12).fill(0);
    return MONTH_SHORT.map((m, i) => ({ name: m, current: current[i], previous: prev[i] }));
  }, [data, selectedYear]);

  const catPieData = useMemo(() => {
    if (!data?.catData) return [];
    return Object.entries(data.catData).map(([name, v]) => ({
      name, value: v.net, color: CAT_COLORS[name] || '#8B5CF6'
    }));
  }, [data]);

  const storeNames = useMemo(() =>
    data?.storeData.filter(s => !s.store.toLowerCase().includes('head office')).map(s => s.store) || []
  , [data]);

  if (loading || !data || !storeKpi) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading Store Performance...</p>
      </div>
    );
  }

  const achvClass = storeKpi.achievement >= 100 ? 'text-emerald-600' : storeKpi.achievement >= 80 ? 'text-amber-500' : 'text-rose-500';
  const achvBarClass = storeKpi.achievement >= 100 ? 'bg-emerald-500' : storeKpi.achievement >= 80 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Performance</h1>
          </div>
          <p className="text-slate-500 text-sm">Annual Overview — {selectedStore} ({selectedYear})</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select aria-label="Select store" value={selectedStore} onChange={e => setSelectedStore(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              {storeNames.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <select aria-label="Select year" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              <option value="2026">2026</option><option value="2025">2025</option><option value="2024">2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Net Sales</p>
          <h3 className="text-xl font-bold text-slate-900"><Amt value={storeKpi.totalSales} compact /></h3>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target</p>
          <h3 className="text-xl font-bold text-blue-600"><Amt value={storeKpi.target} compact /></h3>
          <p className="text-[10px] text-slate-400 mt-1">Remaining: <Amt value={Math.max(0, storeKpi.target - storeKpi.totalSales)} compact /></p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Achievement</p>
          <h3 className={cn("text-2xl font-black", achvClass)}>{fmtPct(storeKpi.achievement)}</h3>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mt-3">
            <div className={cn("h-full rounded-full transition-all duration-1000", achvBarClass)}
              style={{ width: `${Math.min(storeKpi.achievement, 100)}%` as any }} />
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Qty</p>
          <h3 className="text-xl font-bold text-slate-900">{storeKpi.qty} pcs</h3>
          <p className="text-[10px] text-slate-400 mt-1">Cost Ratio: {fmtPct(storeKpi.costPct)}</p>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded-sm" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Sales Trend</h3>
              <p className="text-xs text-slate-400">{selectedYear} vs {parseInt(selectedYear)-1}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
              <div className="w-2 h-2 rounded-full bg-blue-600" />{selectedYear}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
              <div className="w-2 h-2 rounded-full bg-slate-300" />{parseInt(selectedYear)-1}
            </span>
          </div>
        </div>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:TICK_COLOR,fontSize:12}} dy={10} />
              <YAxis 
                stroke="#71717a" 
                fontSize={10} 
                tickFormatter={v => formatCompact(v)}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtTooltip} />
              <Bar dataKey="current" fill="#2563eb" radius={[6,6,0,0]} barSize={25} name={selectedYear} />
              <Bar dataKey="previous" fill="#cbd5e1" radius={[6,6,0,0]} barSize={25} name={String(parseInt(selectedYear)-1)} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Contribution */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-4 bg-blue-600 rounded-sm" />
          <PieChartIcon className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Category Contribution</h3>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={catPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {catPieData.map((e,i) => <Cell key={i} fill={e.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtTooltip} />
              <Legend verticalAlign="bottom" formatter={v => <span className="text-[10px] font-bold text-slate-500">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

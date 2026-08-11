"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon, RefreshCw, Eye, ShieldCheck, Globe, ArrowRight, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { dashboardService, MonthlyOverviewData } from '@/services/dashboardService';
import MultiYearChart from '@/components/MultiYearChart';
import DailySalesChart from '@/components/DailySalesChart';
import StorePerformanceTable from '@/components/StorePerformanceTable';
import KPICards from '@/components/KPICards';
import CrossingSalesWidget from '@/components/CrossingSalesWidget';
import TopAdvisorsWidget from '@/components/TopAdvisorsWidget';
import BvlgariLoader from '@/components/BvlgariLoader';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PublicMonthlyOverviewPage() {
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<MonthlyOverviewData | null>(null);
  const [syncKey, setSyncKey] = useState(0);

  const handleSync = () => { setSyncing(true); setSyncKey(k => k + 1); };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [overview, advisorRes] = await Promise.all([
          dashboardService.getMonthlyOverview(month, parseInt(year)),
          dashboardService.getAdvisorPerformance(month, parseInt(year))
        ]);

        setData({
          ...overview,
          advisorData: advisorRes.advisors
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    })();
  }, [month, year, syncKey]);

  const activeStores = useMemo(() =>
    data?.storeData.filter(s => !s.store.toLowerCase().includes('head office')).sort((a,b) => b.actual - a.actual) || []
  , [data]);

  const storeNetExcHO = useMemo(() => activeStores.reduce((s,r) => s + r.actual, 0), [activeStores]);

  const crossingSummary = useMemo(() => {
    if (!data?.crossingData) return null;
    const { records, totalNet, totalQty, storeStats } = data.crossingData;
    const storeRows = Object.entries(storeStats).map(([store, s]) => {
      const target = data.storeData.find(sd => sd.store === store)?.target || 0;
      const achievement = target > 0 ? (s.adjusted / target) * 100 : 0;
      return { store, adjusted: s.adjusted, physical: s.physical, target, achievement };
    }).filter(r => r.adjusted > 0 || r.target > 0);
    return { records: records.slice(0, 5), totalNet, totalQty, storeRows };
  }, [data]);

  if (loading || !data) return <BvlgariLoader message="Loading Public Monthly Overview..." />;

  const kpi = data.kpi;
  const annual = data.annualStats;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-700 pb-16">
      {/* Public Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold rounded-full">
              <Globe className="w-3.5 h-3.5" />
              Public Executive Access — Daily Sales Report View
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              BVLGARI Monthly Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Live Key Performance Indicators, Store Revenue Breakdown, Daily Sales Trend &amp; Crossing Sales Performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md border border-white/15 p-2 rounded-2xl">
            <div className="flex items-center gap-2 px-2 text-white">
              <CalendarIcon className="w-4 h-4 text-amber-400" />
              <select
                aria-label="Select month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-extrabold text-white outline-none cursor-pointer"
              >
                {MONTHS.map(m => <option key={m} value={m} className="bg-slate-900 text-white">{m}</option>)}
              </select>
              <select
                aria-label="Select year"
                value={year}
                onChange={e => setYear(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-extrabold text-white outline-none cursor-pointer border-l border-white/20 pl-2 ml-1"
              >
                <option value="2026" className="bg-slate-900 text-white">2026</option>
                <option value="2025" className="bg-slate-900 text-white">2025</option>
                <option value="2024" className="bg-slate-900 text-white">2024</option>
                <option value="2023" className="bg-slate-900 text-white">2023</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || loading}
              title="Refresh Data"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm',
                syncing || loading
                  ? 'bg-white/20 text-slate-300 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', (syncing || loading) && 'animate-spin')} />
              <span>{syncing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards 
        {...kpi} 
        storeNetExcHO={storeNetExcHO}
        annualSalesExcHO={annual.salesExcHO}
        annualTarget={annual.target}
        annualAchievement={annual.achievement}
        year={year}
      />

      {/* Row 3: Store Performance Table + Top Advisors (Left) | Crossing Sales (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <StorePerformanceTable 
            stores={activeStores} 
            month={month} 
            year={year} 
          />
          <TopAdvisorsWidget advisors={data.advisorData} />
        </div>

        <div>
          {crossingSummary && (
            <CrossingSalesWidget summary={crossingSummary} />
          )}
        </div>
      </div>

      {/* Row 4: Multi-Year Comparison Chart */}
      <MultiYearChart
        multiYearStats={data.multiYearStats}
        currentMonth={MONTHS.indexOf(month)}
      />

      {/* Row 5: Daily Trend — full width */}
      <DailySalesChart
        dailyData={data.dailyTrendData}
        month={month}
        year={parseInt(year)}
      />

      {/* Public Footer */}
      <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} BVLGARI Retail Intelligence Portal — Executive Report View</p>
      </div>
    </div>
  );
}

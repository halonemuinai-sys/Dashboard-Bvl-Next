"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Info,
  Calendar as CalendarIcon, RefreshCw, BarChart3, ArrowRight, Repeat, ExternalLink
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

const fmtPct = (n: number) => n.toFixed(1) + '%';

export default function MonthlyOverviewPage() {
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




  if (loading || !data) return <BvlgariLoader message="Loading Monthly Overview..." />;

  const kpi = data.kpi;
  const annual = data.annualStats;
  const growthPct = kpi.mtdGrowthPct;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly Overview</h1>
          <p className="text-slate-500 text-sm mt-0.5">Key Performance Indicators & Store Breakdown</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <select aria-label="Select month" value={month} onChange={e => setMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer border-l border-slate-200 pl-2 ml-2">
              <option value="2026">2026</option><option value="2025">2025</option><option value="2024">2024</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || loading}
            title="Sync data dari API"
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all',
              syncing || loading
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', (syncing || loading) && 'animate-spin')} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

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

    </div>
  );
}

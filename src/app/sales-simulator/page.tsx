"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  Sliders, RefreshCw, TrendingUp, TrendingDown, Target, Zap, AlertCircle,
  Megaphone, Users2, ArrowUpRight, CheckCircle2, ChevronRight, Store, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { dashboardService } from '@/services/dashboardService';

type StoreBaseline = {
  sales: number;
  transactions: number;
  footfall: number;
  target: number;
  crmLeads: number;
  ats: number;
  cr: number;
};

type SimulatorData = Record<string, StoreBaseline>;

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const CAMPAIGN_OPTIONS = [
  { id: 'socialMedia', name: 'Social Media (Advisor)', multiplier: 0.10 },
  { id: 'mallPromo', name: 'Mall Public Promotion', multiplier: 0.15 },
  { id: 'endSeasonSale', name: 'End of Season Sale', multiplier: 0.25 },
  { id: 'vipTrunkShow', name: 'VIP Private Trunk Show', multiplier: 0.30 },
  { id: 'birthdayEvent', name: 'Private Birthday Event', multiplier: 0.35 },
  { id: 'privateShowing', name: 'Private Viewing/Showing', multiplier: 0.45 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xl text-xs min-w-[180px]">
      <p className="text-slate-800 font-extrabold mb-2 text-center border-b border-slate-100 pb-1.5">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill || p.color }} />
              <span className="text-slate-500 font-bold">{p.name}:</span>
            </div>
            <span className="text-slate-900 font-black font-mono">
              Rp {(p.value * 1_000_000).toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function SalesSimulatorPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState<number>(now.getMonth()); // 0-indexed
  const [baselineData, setBaselineData] = useState<SimulatorData | null>(null);
  const [prevBaselineData, setPrevBaselineData] = useState<SimulatorData | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulation states per store
  const [simulations, setSimulations] = useState<Record<string, {
    activeCampaigns: Record<string, boolean>;
    dailyFootfall: number;
    crmOutreach: number;
    conversionRate: number;
    ats: number;
  }>>({});

  const [openCampaignDropdown, setOpenCampaignDropdown] = useState<Record<string, boolean>>({});

  const toggleDropdown = (storeName: string) => {
    setOpenCampaignDropdown(prev => ({
      ...prev,
      [storeName]: !prev[storeName]
    }));
  };

  // Fetch baseline data
  useEffect(() => {
    setLoading(true);
    let prevYearNum = Number(year);
    let prevMonthNum = month - 1;
    if (prevMonthNum < 0) {
      prevMonthNum = 11;
      prevYearNum -= 1;
    }

    Promise.all([
      dashboardService.getSimulatorBaseline(Number(year), month),
      dashboardService.getSimulatorBaseline(prevYearNum, prevMonthNum)
    ])
      .then(([currRes, prevRes]) => {
        setBaselineData(currRes);
        setPrevBaselineData(prevRes);
        // Initialize simulation values from baseline
        const initialSims: typeof simulations = {};
        const daysInMonth = new Date(Number(year), month + 1, 0).getDate();

        Object.entries(currRes).forEach(([storeName, data]) => {
          const avgDailyFootfall = Math.round(data.footfall / daysInMonth) || 25;
          initialSims[storeName] = {
            activeCampaigns: {},
            dailyFootfall: avgDailyFootfall,
            crmOutreach: Math.round(data.crmLeads * 0.4), // Target 40% CRM contact default
            conversionRate: data.cr,
            ats: data.ats,
          };
        });
        setSimulations(initialSims);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month]);

  const daysInMonth = useMemo(() => {
    return new Date(Number(year), month + 1, 0).getDate();
  }, [year, month]);

  const prevDaysInMonth = useMemo(() => {
    let prevYearNum = Number(year);
    let prevMonthNum = month - 1;
    if (prevMonthNum < 0) {
      prevMonthNum = 11;
      prevYearNum -= 1;
    }
    return new Date(prevYearNum, prevMonthNum + 1, 0).getDate();
  }, [year, month]);

  // Reset function to revert simulation to default baseline
  const handleReset = () => {
    if (!baselineData) return;
    const resetSims: typeof simulations = {};
    Object.entries(baselineData).forEach(([storeName, data]) => {
      const avgDailyFootfall = Math.round(data.footfall / daysInMonth) || 25;
      resetSims[storeName] = {
        activeCampaigns: {},
        dailyFootfall: avgDailyFootfall,
        crmOutreach: Math.round(data.crmLeads * 0.4),
        conversionRate: data.cr,
        ats: data.ats,
      };
    });
    setSimulations(resetSims);
  };

  // Perform scenario calculations
  const simulatedResults = useMemo(() => {
    if (!baselineData || Object.keys(simulations).length === 0) return [];

    return Object.entries(baselineData).map(([storeName, base]) => {
      const sim = simulations[storeName];
      if (!sim) {
        return {
          name: storeName,
          baseSales: base.sales,
          simSales: 0,
          target: base.target,
          achv: 0,
          isMet: false,
          cr: base.cr,
          dailyFootfall: Math.round(base.footfall / daysInMonth),
          crmOutreach: 0,
          ats: base.ats,
          baseCr: base.cr,
          baseFootfall: Math.round(base.footfall / daysInMonth),
          baseCrm: base.crmLeads,
          baseAts: base.ats,
          campaignMultiplier: 1.0,
        };
      }

      // Calculate combined multiplier
      let campaignMultiplier = 1.0;
      if (sim.activeCampaigns) {
        Object.entries(sim.activeCampaigns).forEach(([campaignId, active]) => {
          if (active) {
            const campaign = CAMPAIGN_OPTIONS.find(c => c.id === campaignId);
            if (campaign) {
              campaignMultiplier += campaign.multiplier;
            }
          }
        });
      }

      // Transactions = (Daily Footfall * Days * CampaignMultiplier * CR%) + (CRM Outreach * CRM Conversion Factor)
      // CRM outreach assumes a 2% baseline conversion rates factor added to standard CR
      const trafficTransactions = (sim.dailyFootfall * daysInMonth) * campaignMultiplier * (sim.conversionRate / 100);
      const crmTransactions = sim.crmOutreach * ((sim.conversionRate + 2.0) / 100);
      const totalSimTransactions = trafficTransactions + crmTransactions;

      const simSales = Math.round(totalSimTransactions * sim.ats);
      const target = base.target || 2_000_000_000;
      const achv = target > 0 ? (simSales / target) * 100 : 0;

      return {
        name: storeName,
        baseSales: base.sales,
        simSales,
        target,
        achv,
        isMet: simSales >= target,
        cr: sim.conversionRate,
        dailyFootfall: sim.dailyFootfall,
        crmOutreach: sim.crmOutreach,
        ats: sim.ats,
        baseCr: base.cr,
        baseFootfall: Math.round(base.footfall / daysInMonth),
        baseCrm: base.crmLeads,
        baseAts: base.ats,
        campaignMultiplier,
      };
    });
  }, [baselineData, simulations, daysInMonth]);

  // Global Summaries
  const totals = useMemo(() => {
    let baseTotal = 0;
    let simTotal = 0;
    let targetTotal = 0;

    simulatedResults.forEach(r => {
      baseTotal += r.baseSales;
      simTotal += r.simSales;
      targetTotal += r.target;
    });

    const gap = simTotal - targetTotal;
    const achv = targetTotal > 0 ? (simTotal / targetTotal) * 100 : 0;

    return {
      baseTotal,
      simTotal,
      targetTotal,
      gap,
      achv
    };
  }, [simulatedResults]);

  // Handler to update specific simulation parameter
  const updateSim = (storeName: string, key: keyof typeof simulations[string], val: number) => {
    setSimulations(prev => ({
      ...prev,
      [storeName]: {
        ...prev[storeName],
        [key]: val
      }
    }));
  };

  const toggleCampaign = (storeName: string, campaignId: string) => {
    setSimulations(prev => {
      const storeSim = prev[storeName];
      if (!storeSim) return prev;
      const currentActive = storeSim.activeCampaigns || {};
      return {
        ...prev,
        [storeName]: {
          ...storeSim,
          activeCampaigns: {
            ...currentActive,
            [campaignId]: !currentActive[campaignId]
          }
        }
      };
    });
  };

  const chartData = useMemo(() => {
    return simulatedResults.map(r => ({
      name: r.name,
      'Target': Math.round(r.target / 1_000_000), // in Millions
      'Simulated Net Sales': Math.round(r.simSales / 1_000_000), // in Millions
    }));
  }, [simulatedResults]);

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Sliders className="w-4 h-4 text-blue-600" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Scenario Simulator</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">BETA</span>
          </div>
          <p className="text-slate-500 text-sm">Terapkan skenario kampanye dan model traffic operasional untuk memproyeksikan pencapaian target butik.</p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Select month" value={month} onChange={e => setMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {['2026', '2025', '2024'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            title="Reset to Baseline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-500 text-sm italic">Memuat baseline parameter & target butik...</p>
        </div>
      ) : (
        <>
          {/* ── Section 1: Global simulated P&L impact ────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Total Target */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Target</span>
                <p className="text-3xl font-black text-slate-800 font-sans leading-none">
                  {Math.round(totals.targetTotal / 1_000_000_000)}B
                </p>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">IDR</span>
              </div>
              <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-blue-500" />
              </span>
            </div>

            {/* Simulated Sales */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Projected Sim Sales</span>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-black text-blue-600 font-sans leading-none">
                    {(totals.simTotal / 1_000_000_000).toFixed(1)}B
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">IDR</span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold leading-none">
                  Baseline: {(totals.baseTotal / 1_000_000_000).toFixed(1)}B
                </div>
              </div>
              <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </span>
            </div>

            {/* Gap to Target */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gap / Excess</span>
                <div className="flex items-baseline gap-1">
                  <p className={cn("text-3xl font-black font-sans leading-none",
                    totals.gap >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {totals.gap >= 0 ? '+' : ''}{(totals.gap / 1_000_000_000).toFixed(1)}B
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">IDR</span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold leading-none">
                  Selisih proyeksi simulasi dengan target
                </div>
              </div>
              <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                totals.gap >= 0 ? "bg-emerald-50" : "bg-rose-50"
              )}>
                {totals.gap >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-rose-500" />
                )}
              </span>
            </div>

            {/* Achievement Rate */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Projected Achv Rate</span>
                <span className={cn("text-sm font-black px-1.5 py-0.5 rounded-full font-mono",
                  totals.achv >= 100 ? "text-emerald-500" : totals.achv >= 80 ? "text-amber-500" : "text-rose-500"
                )}>
                  {totals.achv.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden my-1.5">
                <div className={cn("h-full rounded-full transition-all duration-500",
                  totals.achv >= 100 ? "bg-emerald-500" : totals.achv >= 80 ? "bg-amber-400" : "bg-rose-500"
                )} style={{ width: `${Math.min(totals.achv, 100)}%` }} />
              </div>
              <span className="text-[10px] text-slate-400 font-semibold leading-none">
                Rasio pencapaian target kumulatif butik
              </span>
            </div>
          </div>

          {/* ── Section 2: Store Sliders Simulation ──────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {simulatedResults.map(store => {
              const sim = simulations[store.name];
              if (!sim) return null;

              return (
                <div key={store.name} className={cn(
                  "bg-white rounded-2xl border shadow-md p-5 flex flex-col justify-between transition-all duration-300 relative border-slate-200/85 hover:shadow-lg",
                  store.isMet && "hover:border-emerald-300 hover:shadow-emerald-50/20"
                )}>
                  <div>
                    {/* Title */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 text-white shadow-sm shadow-blue-200">
                          <Store className="w-5 h-5" />
                        </span>
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-base leading-tight">{store.name}</h3>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
                            Target: {Math.round(store.target / 1_000_000_000)}B
                          </p>
                        </div>
                      </div>
                      <span className={cn("text-xs font-black px-2 py-0.5 rounded-full font-mono border",
                        store.isMet ? "bg-emerald-50 text-emerald-600 border-emerald-100" : store.achv >= 80 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-rose-50 text-rose-600 border-rose-100"
                      )}>
                        {store.achv.toFixed(1)}%
                      </span>
                    </div>

                    {/* Campaign Type Dropdown */}
                    <div className="relative mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Active Campaigns</label>
                        <div className="group relative inline-block">
                          <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" />
                          <div className="absolute bottom-full right-0 mb-1.5 w-56 hidden group-hover:block bg-slate-800 text-white text-[9.5px] p-2 rounded-lg shadow-lg z-50 leading-normal font-medium normal-case tracking-normal">
                            Pengali aktivitas marketing (VIP Event, Public Promo, Social Media) yang mendongkrak ketertarikan traffic butik. Dapat dipilih lebih dari satu.
                            <div className="absolute top-full right-1.5 border-4 border-transparent border-t-slate-800" />
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleDropdown(store.name)}
                        className="w-full flex items-center justify-between bg-slate-50/80 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-3.5 py-2.5 rounded-xl text-[11px] font-bold text-slate-700 shadow-sm transition-all focus:outline-none"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Megaphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">
                            {Object.entries(sim.activeCampaigns || {}).filter(([_, val]) => val).length > 0
                              ? Object.entries(sim.activeCampaigns || {})
                                  .filter(([_, val]) => val)
                                  .map(([id]) => CAMPAIGN_OPTIONS.find(c => c.id === id)?.name)
                                  .join(', ')
                              : 'Pilih Kampanye Aktif...'}
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold text-amber-700 shrink-0 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/60 ml-2">
                          {store.campaignMultiplier.toFixed(2)}x
                        </span>
                      </button>

                      {/* Dropdown Menu Popup */}
                      {openCampaignDropdown[store.name] && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => toggleDropdown(store.name)} />
                          <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-xl p-1.5 shadow-xl z-50 space-y-0.5 max-h-[200px] overflow-y-auto">
                            {CAMPAIGN_OPTIONS.map(c => {
                              const isActive = !!sim.activeCampaigns?.[c.id];
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => toggleCampaign(store.name, c.id)}
                                  className={cn(
                                    "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[10px] font-bold text-left transition-all border",
                                    isActive
                                      ? "bg-amber-50/40 border-amber-200 text-amber-900 font-extrabold"
                                      : "bg-white border-transparent text-slate-650 hover:bg-slate-50 hover:border-slate-100"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all shrink-0",
                                      isActive 
                                        ? "bg-amber-500 border-amber-500 text-white shadow-sm" 
                                        : "border-slate-350 bg-white"
                                    )}>
                                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </span>
                                    <span className="truncate">{c.name}</span>
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-mono shrink-0 ml-1.5",
                                    isActive ? "text-amber-600" : "text-slate-400"
                                  )}>
                                    +{Math.round(c.multiplier * 100)}%
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Simulation Parameters Sliders */}
                    <div className="space-y-4">
                      {/* Parameter 1: Daily Footfall */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                            <Users2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Daily Footfall (Traffic)</span>
                            <div className="group relative inline-block">
                              <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 hidden group-hover:block bg-slate-800 text-white text-[9.5px] p-2 rounded-lg shadow-lg z-50 leading-normal font-medium text-center normal-case">
                                Rata-rata jumlah pengunjung fisik yang masuk ke butik per hari.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {prevBaselineData && prevBaselineData[store.name] && (
                              <span className="text-[10px] text-purple-600 font-extrabold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100/80" title="Rata-rata footfall bulan lalu">
                                Prev: {Math.round(prevBaselineData[store.name].footfall / prevDaysInMonth)}
                              </span>
                            )}
                            <span className="font-black text-slate-800 font-sans">
                              {sim.dailyFootfall} <span className="text-[10px] text-slate-400 font-normal">/day</span>
                            </span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="150"
                          step="1"
                          value={sim.dailyFootfall}
                          onChange={(e) => updateSim(store.name, 'dailyFootfall', parseInt(e.target.value))}
                          className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400 font-bold mt-1">
                          <span>Min: 5</span>
                          <span>Base Avg: {store.baseFootfall}</span>
                          <span>Max: 150</span>
                        </div>
                      </div>

                      {/* Parameter 2: CRM Outreach */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                            <Users2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>CRM Clienteling Reachout</span>
                            <div className="group relative inline-block">
                              <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 hidden group-hover:block bg-slate-800 text-white text-[9.5px] p-2 rounded-lg shadow-lg z-50 leading-normal font-medium text-center normal-case">
                                Jumlah pelanggan database CRM yang dihubungi secara personal untuk datang ke butik.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {prevBaselineData && prevBaselineData[store.name] && (
                              <span className="text-[10px] text-purple-600 font-extrabold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100/80" title="Outreach database CRM bulan lalu">
                                Prev: {Math.round(prevBaselineData[store.name].crmLeads * 0.4)}
                              </span>
                            )}
                            <span className="font-black text-slate-800 font-sans">
                              {sim.crmOutreach} <span className="text-[10px] text-slate-400 font-normal">contacts</span>
                            </span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={store.baseCrm}
                          step="10"
                          value={sim.crmOutreach}
                          onChange={(e) => updateSim(store.name, 'crmOutreach', parseInt(e.target.value))}
                          className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400 font-bold mt-1">
                          <span>Min: 0</span>
                          <span>Max database: {store.baseCrm}</span>
                          <span>Max: {store.baseCrm}</span>
                        </div>
                      </div>

                      {/* Parameter 3: Conversion Rate */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                            <span>Conversion Rate (CR)</span>
                            <div className="group relative inline-block">
                              <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 hidden group-hover:block bg-slate-800 text-white text-[9.5px] p-2 rounded-lg shadow-lg z-50 leading-normal font-medium text-center normal-case">
                                Persentase pengunjung butik yang berhasil dikonversi menjadi transaksi penjualan.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                            </div>
                          </div>
                          <span className="font-black text-slate-800 font-sans">
                            {sim.conversionRate.toFixed(1)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="15"
                          step="0.1"
                          value={sim.conversionRate}
                          onChange={(e) => updateSim(store.name, 'conversionRate', parseFloat(e.target.value))}
                          className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400 font-bold mt-1">
                          <span>Min: 0.5%</span>
                          <span>Base actual: {store.baseCr.toFixed(1)}%</span>
                          <span>Max: 15%</span>
                        </div>
                      </div>

                      {/* Parameter 4: Average Ticket Size */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                            <Store className="w-3.5 h-3.5 text-slate-400" />
                            <span>Average Ticket Size (ATS)</span>
                            <div className="group relative inline-block">
                              <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 hidden group-hover:block bg-slate-800 text-white text-[9.5px] p-2 rounded-lg shadow-lg z-50 leading-normal font-medium text-center normal-case">
                                Rata-rata nominal nilai belanja per transaksi.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                            </div>
                          </div>
                          <span className="font-black text-slate-800 font-sans">
                            {(sim.ats / 1_000_000).toFixed(1)}M
                          </span>
                        </div>
                        <input
                          type="range"
                          min="5000000"
                          max="300000000"
                          step="1000000"
                          value={sim.ats}
                          onChange={(e) => updateSim(store.name, 'ats', parseInt(e.target.value))}
                          className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400 font-bold mt-1">
                          <span>Min: 5M</span>
                          <span>Base: {(store.baseAts / 1_000_000).toFixed(1)}M</span>
                          <span>Max: 300M</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Result Box for Store */}
                  <div className={cn("mt-6 border p-3.5 rounded-xl flex items-center justify-between",
                    store.isMet ? "bg-emerald-50/30 border-emerald-100 text-emerald-800" : "bg-blue-50/20 border-blue-100 text-blue-900"
                  )}>
                    <div>
                      <span className="text-[9px] uppercase font-extrabold tracking-wider block text-slate-400 mb-0.5">Projected Net Sales</span>
                      <span className="text-lg font-black font-sans tracking-tight">
                        {store.simSales.toLocaleString('id-ID')}
                      </span>
                    </div>
                    {store.isMet ? (
                      <div className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>MET</span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block font-bold">Kekurangan:</span>
                        <span className="text-xs font-bold text-rose-500 font-mono">
                          -{(Math.max(0, store.target - store.simSales) / 1_000_000).toFixed(0)}M
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Section 3: Visual Charts & Action Playbooks ───────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Target vs Simulation Bar Chart (2/3) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Scenario Target Gap Comparison</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Actual Target vs Simulated Performance (in IDR Millions)</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-blue-500 inline-block" /> Simulated Sales</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-slate-300 inline-block" /> Target</span>
                </div>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Target" name="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Simulated Net Sales" name="Simulated Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Playbook Penyelamatan Sales (1/3) */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full pointer-events-none" />

              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                  <Megaphone className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-200">Taktik Penyelamatan Sales</h3>
                    <p className="text-[8.5px] text-slate-400">Rekomendasi taktis berbasis kondisi simulasi saat ini</p>
                  </div>
                </div>

                <div className="space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                  {simulatedResults.every(r => r.isMet) ? (
                    <div className="flex flex-col items-center justify-center text-center py-6">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-7 h-7 text-emerald-450" />
                        </div>
                      </div>
                      <p className="text-xs font-black text-emerald-400">Target Semua Store Terpenuhi!</p>
                      <p className="text-[10px] text-slate-400 mt-1.5 max-w-[240px] leading-relaxed">Skenario saat ini aman dan berada di atas target. Pastikan tim retail menjaga tingkat kepuasan pelanggan.</p>
                    </div>
                  ) : (
                    simulatedResults.map(r => {
                      if (r.isMet) return null;

                      // Determine primary driver failures
                      const isFootfallLow = r.dailyFootfall < r.baseFootfall;
                      const isCrLow = r.cr < r.baseCr;
                      const isAtsLow = r.ats < r.baseAts;

                      return (
                        <div key={r.name} className="border border-white/5 bg-white/5 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-xs font-black text-rose-400 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{r.name} Drop</span>
                            </span>
                            <span className="text-[8px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.5 rounded-full">
                              -{Math.round((r.target - r.simSales) / 1_000_000)}M
                            </span>
                          </div>

                          <ul className="space-y-2">
                            {isFootfallLow && (
                              <li className="flex gap-1.5 text-[9.5px] text-slate-300 leading-normal">
                                <ChevronRight className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-white font-extrabold">Footfall Rendah:</span> Adakan event mall lokal atau kirim undangan VIP eksklusif via CRM untuk memicu kunjungan butik.
                                </div>
                              </li>
                            )}
                            {isCrLow && (
                              <li className="flex gap-1.5 text-[9.5px] text-slate-300 leading-normal">
                                <ChevronRight className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-white font-extrabold">CR di Bawah Baseline:</span> Rotasi Sales Advisor terbaik (dengan CR tinggi) ke butik ini, atau lakukan coaching harian.
                                </div>
                              </li>
                            )}
                            {isAtsLow && (
                              <li className="flex gap-1.5 text-[9.5px] text-slate-300 leading-normal">
                                <ChevronRight className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-white font-extrabold">Transaksi Murah:</span> Lakukan program bundling perhiasan entry-level atau tawarkan program cross-selling jam tangan.
                                </div>
                              </li>
                            )}
                            {!isFootfallLow && !isCrLow && !isAtsLow && (
                              <li className="flex gap-1.5 text-[9.5px] text-slate-300 leading-normal">
                                <ChevronRight className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-white font-extrabold">Outreach CRM:</span> Naikkan target outreach CRM hingga 300+ kontak untuk menambah peluang transaksi butik secara cepat.
                                </div>
                              </li>
                            )}
                          </ul>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 mt-4 text-[9px] text-slate-400">
                <p className="font-semibold leading-relaxed">
                  💡 <span className="text-white font-bold">IT Strategy Tips:</span> Simulasi ini menggunakan formula driver-based untuk menyelaraskan tim operasional butik dan CRM. Pastikan sinkronisasi footfall harian berjalan lancar.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

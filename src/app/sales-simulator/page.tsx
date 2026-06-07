"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  Sliders, RefreshCw, TrendingUp, TrendingDown, Target, Zap, AlertCircle,
  Megaphone, Users2, ArrowUpRight, CheckCircle2, ChevronRight, Store
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

const CAMPAIGN_MULTIPLIERS = [
  { name: 'Normal Operations', value: 1.0 },
  { name: 'VIP Private Trunk Show', value: 1.3 },
  { name: 'Mall Public Promotion', value: 1.15 },
  { name: 'End of Season Sale', value: 1.25 },
];

export default function SalesSimulatorPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState<number>(now.getMonth()); // 0-indexed
  const [baselineData, setBaselineData] = useState<SimulatorData | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulation states per store
  const [simulations, setSimulations] = useState<Record<string, {
    campaignMultiplier: number;
    dailyFootfall: number;
    crmOutreach: number;
    conversionRate: number;
    ats: number;
  }>>({});

  // Fetch baseline data
  useEffect(() => {
    setLoading(true);
    dashboardService.getSimulatorBaseline(Number(year), month)
      .then(res => {
        setBaselineData(res);
        // Initialize simulation values from baseline
        const initialSims: typeof simulations = {};
        const daysInMonth = new Date(Number(year), month + 1, 0).getDate();

        Object.entries(res).forEach(([storeName, data]) => {
          const avgDailyFootfall = Math.round(data.footfall / daysInMonth) || 25;
          initialSims[storeName] = {
            campaignMultiplier: 1.0,
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

  // Reset function to revert simulation to default baseline
  const handleReset = () => {
    if (!baselineData) return;
    const resetSims: typeof simulations = {};
    Object.entries(baselineData).forEach(([storeName, data]) => {
      const avgDailyFootfall = Math.round(data.footfall / daysInMonth) || 25;
      resetSims[storeName] = {
        campaignMultiplier: 1.0,
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
        };
      }

      // Transactions = (Daily Footfall * Days * CampaignMultiplier * CR%) + (CRM Outreach * CRM Conversion Factor)
      // CRM outreach assumes a 5% baseline conversion rates factor added to standard CR
      const trafficTransactions = (sim.dailyFootfall * daysInMonth) * sim.campaignMultiplier * (sim.conversionRate / 100);
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
            <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Target</span>
                <Target className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-black text-slate-800 font-mono">
                <Amt value={totals.targetTotal} short />
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Berdasarkan data master target Supabase</p>
            </div>

            {/* Simulated Sales */}
            <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Projected Sim Sales</span>
                <Zap className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-blue-600 font-mono">
                <Amt value={totals.simTotal} short />
              </p>
              <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-400">
                <span>Baseline:</span>
                <span className="text-slate-600 font-mono"><Amt value={totals.baseTotal} short /></span>
              </div>
            </div>

            {/* Gap to Target */}
            <div className={cn("rounded-2xl border p-5 shadow-sm",
              totals.gap >= 0 ? "bg-emerald-50/40 border-emerald-100" : "bg-rose-50/40 border-rose-100"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-[10px] uppercase font-bold tracking-wider",
                  totals.gap >= 0 ? "text-emerald-600" : "text-rose-500"
                )}>Gap / Excess</span>
                {totals.gap >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                )}
              </div>
              <p className={cn("text-2xl font-black font-mono",
                totals.gap >= 0 ? "text-emerald-700" : "text-rose-650"
              )}>
                {totals.gap >= 0 ? '+' : ''}<Amt value={totals.gap} short />
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Selisih proyeksi simulasi dengan target</p>
            </div>

            {/* Achievement Rate */}
            <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Projected Achv Rate</span>
                <span className={cn("text-xs font-black px-1.5 py-0.5 rounded-full font-mono",
                  totals.achv >= 100 ? "bg-emerald-50 text-emerald-700" : totals.achv >= 80 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                )}>
                  {totals.achv.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500",
                  totals.achv >= 100 ? "bg-emerald-500" : totals.achv >= 80 ? "bg-amber-400" : "bg-rose-500"
                )} style={{ width: `${Math.min(totals.achv, 100)}%` }} />
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5 font-bold">Rasio pencapaian target kumulatif butik</p>
            </div>
          </div>

          {/* ── Section 2: Store Sliders Simulation ──────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {simulatedResults.map(store => {
              const sim = simulations[store.name];
              if (!sim) return null;

              return (
                <div key={store.name} className={cn(
                  "bg-white rounded-2xl border shadow-md p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden",
                  store.isMet ? "border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-50" : "border-slate-200 hover:border-blue-200"
                )}>
                  {/* Store Status Accent Top */}
                  <div className={cn("absolute top-0 left-0 right-0 h-1",
                    store.isMet ? "bg-emerald-500" : "bg-slate-200"
                  )} />

                  <div>
                    {/* Title */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-slate-500" />
                          <span>{store.name}</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
                          Target: <Amt value={store.target} short />
                        </p>
                      </div>
                      <span className={cn("text-xs font-black px-2 py-0.5 rounded-full font-mono",
                        store.isMet ? "bg-emerald-50 text-emerald-700" : store.achv >= 80 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-600"
                      )}>
                        {store.achv.toFixed(1)}%
                      </span>
                    </div>

                    {/* Campaign Type Dropdown */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Campaign Model</label>
                      <select
                        aria-label="Campaign Model"
                        value={sim.campaignMultiplier}
                        onChange={(e) => updateSim(store.name, 'campaignMultiplier', parseFloat(e.target.value))}
                        className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-black text-slate-700 outline-none cursor-pointer"
                      >
                        {CAMPAIGN_MULTIPLIERS.map(c => (
                          <option key={c.name} value={c.value}>{c.name} ({c.value}x)</option>
                        ))}
                      </select>
                    </div>

                    {/* Simulation Parameters Sliders */}
                    <div className="space-y-4">
                      {/* Parameter 1: Daily Footfall */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-500 font-bold">Daily Footfall (Traffic)</span>
                          <span className="font-black text-slate-800 font-mono">
                            {sim.dailyFootfall} <span className="text-[10px] text-slate-400">/day</span>
                          </span>
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
                          <span className="text-slate-500 font-bold">CRM Clienteling Reachout</span>
                          <span className="font-black text-slate-800 font-mono">
                            {sim.crmOutreach} <span className="text-[10px] text-slate-400">contacts</span>
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="500"
                          step="10"
                          value={sim.crmOutreach}
                          onChange={(e) => updateSim(store.name, 'crmOutreach', parseInt(e.target.value))}
                          className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400 font-bold mt-1">
                          <span>Min: 0</span>
                          <span>Max database: {store.baseCrm}</span>
                          <span>Max: 500</span>
                        </div>
                      </div>

                      {/* Parameter 3: Conversion Rate */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-500 font-bold">Conversion Rate (CR)</span>
                          <span className="font-black text-slate-800 font-mono">
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
                          <span className="text-slate-500 font-bold">Average Ticket Size (ATS)</span>
                          <span className="font-black text-slate-800 font-mono">
                            <Amt value={sim.ats} short />
                          </span>
                        </div>
                        <input
                          type="range"
                          min="5000000"
                          max="100000000"
                          step="1000000"
                          value={sim.ats}
                          onChange={(e) => updateSim(store.name, 'ats', parseInt(e.target.value))}
                          className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400 font-bold mt-1">
                          <span>Min: 5M</span>
                          <span>Base: <Amt value={store.baseAts} short /></span>
                          <span>Max: 100M</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Result Box for Store */}
                  <div className={cn("mt-6 border p-3.5 rounded-xl flex items-center justify-between",
                    store.isMet ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" : "bg-blue-50/30 border-blue-100 text-blue-900"
                  )}>
                    <div>
                      <span className="text-[9px] uppercase font-extrabold tracking-wider block text-slate-400 mb-0.5">Projected Net Sales</span>
                      <span className="text-lg font-black font-mono">
                        <Amt value={store.simSales} />
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
                          -<Amt value={Math.max(0, store.target - store.simSales)} short />
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
            <div className="bg-white rounded-2xl border border-slate-150 p-6 lg:col-span-2">
              <div className="mb-4">
                <h3 className="text-sm font-black text-slate-900">Scenario Target Gap Comparison</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Actual Target vs Simulated Performance (in IDR Millions)</p>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 11, padding: '10px 14px' }}
                    labelStyle={{ fontWeight: 800, marginBottom: 4 }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="Target" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Simulated Net Sales" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
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
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2 animate-bounce" />
                      <p className="text-xs font-black text-emerald-300">Target Semua Store Terpenuhi!</p>
                      <p className="text-[10px] text-slate-400 mt-1">Skenario saat ini aman dan berada di atas target. Pastikan tim retail menjaga tingkat kepuasan pelanggan.</p>
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

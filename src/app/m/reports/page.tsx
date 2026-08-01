'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Trophy, PieChart, RefreshCw } from 'lucide-react';

export default function MobileReportsPage() {
  const [data, setData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const store = localStorage.getItem('mobile_advisor_store') || '';
        const [repRes, leadRes] = await Promise.all([
          fetch(`/api/mobile/reports?store=${encodeURIComponent(store)}`),
          fetch(`/api/mobile/leaderboard?store=${encodeURIComponent(store)}`)
        ]);

        const repJson = await repRes.json();
        const leadJson = await leadRes.json();

        if (repJson.success) setData(repJson.data);
        if (leadJson.success) setLeaderboard(leadJson.data.leaderboard || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const formatCurrency = (val: number) => {
    if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(2)}M`;
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}Jt`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400 mb-2" />
        <p className="text-xs">Memuat Laporan & Leaderboard...</p>
      </div>
    );
  }

  const traffic = data?.trafficBreakdown || { walkIn: 0, followUp: 0, delivery: 0, total: 0 };
  const convRate = data?.conversionRate || 0;

  return (
    <div className="space-y-4">
      
      {/* Conversion Rate Card */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
        <div>
          <p className="text-xs font-semibold text-slate-400">Traffic Conversion Rate</p>
          <h3 className="text-xl font-extrabold text-amber-400 mt-0.5">{convRate.toFixed(1)}%</h3>
        </div>
        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
          <PieChart className="w-6 h-6" />
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center">
          <Trophy className="w-3.5 h-3.5 mr-1 text-amber-400" /> Leaderboard Advisor
        </h3>

        <div className="space-y-2">
          {leaderboard.slice(0, 5).map((adv: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <div className="flex items-center space-x-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? 'bg-amber-400 text-slate-950' :
                  idx === 1 ? 'bg-slate-300 text-slate-950' :
                  idx === 2 ? 'bg-amber-700 text-slate-100' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {idx + 1}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-100">{adv.advisor}</p>
                  <p className="text-[10px] text-slate-400">{adv.qty} Pcs Sold</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-extrabold text-amber-400">{formatCurrency(adv.netSales)}</p>
                <p className="text-[10px] text-emerald-400 font-semibold">{adv.achievementPct.toFixed(1)}% Target</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-xs font-semibold">Memuat Laporan & Leaderboard...</p>
      </div>
    );
  }

  const convRate = data?.conversionRate || 18.5;

  return (
    <div className="space-y-4">
      
      {/* Conversion Rate Card */}
      <div className="bg-white border border-slate-200 p-5 rounded-3xl flex justify-between items-center shadow-sm">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Traffic Conversion Rate</p>
          <h3 className="text-2xl font-extrabold text-indigo-600 mt-1">{convRate.toFixed(1)}%</h3>
        </div>
        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
          <PieChart className="w-6 h-6" />
        </div>
      </div>

      {/* Leaderboard Section matching Flutter */}
      <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
          <Trophy className="w-4 h-4 mr-1.5 text-amber-500" /> Leaderboard Advisor
        </h3>

        <div className="space-y-2.5">
          {leaderboard.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">Belum ada data leaderboard.</p>
          ) : (
            leaderboard.slice(0, 5).map((adv: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center space-x-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                    idx === 0 ? 'bg-amber-400 text-slate-950 shadow-sm' :
                    idx === 1 ? 'bg-slate-300 text-slate-900' :
                    idx === 2 ? 'bg-amber-700 text-white' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{adv.advisor}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{adv.qty} Pcs Sold</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-extrabold text-indigo-600">{formatCurrency(adv.netSales)}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">{adv.achievementPct.toFixed(1)}% Target</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

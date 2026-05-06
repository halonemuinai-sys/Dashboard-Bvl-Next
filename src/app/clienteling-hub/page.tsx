"use client";

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Heart, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import BvlgariLoader from '@/components/BvlgariLoader';
import { dashboardService } from '@/services/dashboardService';

type CData = Awaited<ReturnType<typeof dashboardService.getClientelingData>>;

const MEDALS = ['🥇', '🥈', '🥉'];

const TIER_CFG: Record<string, { icon: string; color: string; bg: string; text: string; border: string }> = {
  'Top':           { icon: '👑', color: '#92400e', bg: 'bg-amber-900',    text: 'text-amber-300',   border: 'border-amber-700' },
  'Elite':         { icon: '🎎', color: '#9333ea', bg: 'bg-purple-100',   text: 'text-purple-700',  border: 'border-purple-200' },
  'High Potential':{ icon: '⭐', color: '#0d9488', bg: 'bg-teal-100',     text: 'text-teal-700',    border: 'border-teal-200' },
  'Potential':     { icon: '🔵', color: '#2563eb', bg: 'bg-blue-100',     text: 'text-blue-700',    border: 'border-blue-200' },
  'Prospect':      { icon: '⚪', color: '#94a3b8', bg: 'bg-slate-100',    text: 'text-slate-500',   border: 'border-slate-200' },
  'Inactive':      { icon: '💤', color: '#e11d48', bg: 'bg-rose-100',     text: 'text-rose-700',    border: 'border-rose-200' },
};
const TIER_ORDER = ['Top', 'Elite', 'High Potential', 'Potential', 'Prospect', 'Inactive'];

const fmtPct = (n: number) => n.toFixed(1) + '%';
const fmtDays = (d: number) => d >= 365 ? `${(d/365).toFixed(1)}yr` : `${d}d`;
function fmtShort(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
  return n.toLocaleString('id-ID');
}

function TierBadge({ tier }: { tier: string }) {
  const cfg = TIER_CFG[tier] || TIER_CFG['Prospect'];
  return (
    <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full border', cfg.bg, cfg.text, cfg.border)}>
      {tier.toUpperCase()}
    </span>
  );
}

function LapsedColor({ days }: { days: number }) {
  const cls = days > 365 ? 'text-rose-600 font-black' : days > 270 ? 'text-orange-500 font-bold' : 'text-amber-500 font-bold';
  return <span className={cls}>{days}d</span>;
}

export default function ClientelingHubPage() {
  const [year, setYear]       = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<CData | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setData(await dashboardService.getClientelingData(parseInt(year))); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [year]);

  if (loading || !data) return <BvlgariLoader message="Loading Clienteling Hub..." />;

  const { kpi, tierCounts, tierRevenue, topClients, lapsedAlerts,
          recencyBuckets, freqBuckets, locationSummary, tierMigration, retention } = data;

  const totalTierClients = TIER_ORDER.reduce((s, t) => s + (tierCounts[t] || 0), 0) || 1;
  const maxLocSpend = Math.max(...locationSummary.map(l => l.spend), 1);

  const rfmRecency = Object.entries(recencyBuckets).map(([label, count]) => ({ label, count }));
  const rfmFreq    = Object.entries(freqBuckets).map(([label, count])    => ({ label, count }));
  const maxRfm     = Math.max(...rfmRecency.map(r => r.count), ...rfmFreq.map(f => f.count), 1);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Heart className="w-5 h-5 text-rose-500" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clienteling & Loyalty Hub</h1>
          </div>
          <p className="text-slate-500 text-sm">CRM Deep Dive — Customer Retention & Tier Intelligence</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
          <CalendarIcon className="w-4 h-4 text-rose-500" />
          <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
            {['2026','2025','2024','2023'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── Row 1: 4 KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-sm shadow-rose-200 w-fit mb-4">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Clients</p>
          <h3 className="text-3xl font-black text-slate-900">{kpi.totalActive.toLocaleString('id-ID')}</h3>
          <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-50">Last 24 months</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-sm shadow-emerald-200 w-fit mb-4">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Retention Rate</p>
          <h3 className="text-3xl font-black text-emerald-600">{fmtPct(kpi.retentionRate)}</h3>
          <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-50">Repeat / Active</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-purple-200 w-fit mb-4">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg. Lifetime Value</p>
          <h3 className="text-2xl font-black text-slate-900"><Amt value={kpi.avgLtv} short /></h3>
          <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-50">Per active client</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-200 w-fit mb-4">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lapsed Alert</p>
          <h3 className="text-3xl font-black text-orange-600">{kpi.lapsedCount.toLocaleString('id-ID')}</h3>
          <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-50">VIP inactive 6-24 months</p>
        </div>
      </div>

      {/* ── Row 2: Tier Pyramid + Monthly Retention ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Tier Pyramid */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Client Tier Distribution</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Lifetime spend segmentation</p>
          </div>
          <div className="p-5 space-y-3">
            {TIER_ORDER.map(tier => {
              const count   = tierCounts[tier]  || 0;
              const revenue = tierRevenue[tier] || 0;
              const pct     = (count / totalTierClients) * 100;
              const cfg     = TIER_CFG[tier];
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cfg.icon}</span>
                      <span className="text-xs font-bold text-slate-700">{tier}</span>
                      <span className="text-[9px] text-slate-400">({fmtPct(pct)})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-black text-slate-800">{count}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{fmtShort(revenue)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: cfg.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Retention Chart */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Acquisition & Retention</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">New vs Returning clients — {year}</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> New</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Returning</span>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={retention} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                  formatter={((v: unknown, name: unknown) => [v, name === 'newCust' ? 'New' : 'Returning']) as any}
                />
                <Bar dataKey="newCust"   name="newCust"   stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />
                <Bar dataKey="returning" name="returning" stackId="a" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Row 3: Top Clients + Lapsed Alerts ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top 50 Clients */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Top Clients</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Ranked by lifetime spend — top 50</p>
          </div>
          <div className="overflow-auto max-h-[420px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="sticky top-0 bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 text-center">#</th>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4 text-right">Spend</th>
                  <th className="py-2.5 px-4 text-center">Visits</th>
                  <th className="py-2.5 px-4">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topClients.map((c, i) => (
                  <tr key={c.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 text-center">
                      {i < 3
                        ? <span className="text-sm">{MEDALS[i]}</span>
                        : <span className="text-slate-300 font-bold">{i + 1}</span>}
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="font-bold text-slate-800 max-w-[140px] truncate">{c.name}</p>
                      <p className="text-[9px] text-slate-400">{c.location} · {c.lastVisit}</p>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-slate-800">
                      <Amt value={c.spend} short />
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-600">{c.visits}</td>
                    <td className="py-2.5 px-4"><TierBadge tier={c.tier} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lapsed Alerts */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h3 className="text-sm font-black text-slate-900">Lapsed VIP Alerts</h3>
            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full ml-auto">
              {lapsedAlerts.length} clients
            </span>
          </div>
          <div className="overflow-auto max-h-[420px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="sticky top-0 bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4 text-right">Spend</th>
                  <th className="py-2.5 px-4 text-center">Inactive</th>
                  <th className="py-2.5 px-4">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lapsedAlerts.map(c => (
                  <tr key={c.name} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-2.5 px-4">
                      <p className="font-bold text-slate-800 max-w-[140px] truncate">{c.name}</p>
                      <p className="text-[9px] text-slate-400">{c.location} · {c.lastVisit}</p>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-slate-800">
                      <Amt value={c.spend} short />
                    </td>
                    <td className="py-2.5 px-4 text-center"><LapsedColor days={c.daysSince} /></td>
                    <td className="py-2.5 px-4"><TierBadge tier={c.tier} /></td>
                  </tr>
                ))}
                {lapsedAlerts.length === 0 && (
                  <tr><td colSpan={4} className="py-10 text-center text-slate-400">No lapsed VIP clients</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Row 4: RFM + Tier Migration + Location Loyalty ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* RFM Analysis */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">RFM Analysis</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Recency + Frequency distribution</p>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Recency</p>
              <div className="space-y-2">
                {rfmRecency.map(b => (
                  <div key={b.label}>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-0.5">
                      <span>{b.label} days</span><span>{b.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-700"
                        style={{ width: `${(b.count / maxRfm) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Frequency</p>
              <div className="space-y-2">
                {rfmFreq.map(b => (
                  <div key={b.label}>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-0.5">
                      <span>{b.label}</span><span>{b.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all duration-700"
                        style={{ width: `${(b.count / maxRfm) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tier Migration */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Tier Migration</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">YoY tier changes ({data.year - 1} → {data.year})</p>
          </div>
          <div className="overflow-auto max-h-[360px]">
            {tierMigration.length === 0 && (
              <p className="p-6 text-center text-slate-400 text-xs">No tier migrations detected</p>
            )}
            <div className="divide-y divide-slate-50">
              {tierMigration.map((m, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <span className={cn('text-lg font-black w-5 text-center shrink-0',
                    m.direction === 'up' ? 'text-emerald-500' : 'text-rose-500')}>
                    {m.direction === 'up' ? '↑' : '↓'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{m.name}</p>
                    <p className="text-[9px] text-slate-400">
                      {m.from} → <span className="font-bold text-slate-600">{m.to}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-black text-slate-700">{fmtShort(m.currSpend)}</p>
                    <p className="text-[9px] text-slate-400">{fmtShort(m.prevSpend)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Location Loyalty */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Location Loyalty</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Primary store preference</p>
          </div>
          <div className="p-5 space-y-4">
            {locationSummary.map(loc => {
              const pct = (loc.spend / maxLocSpend) * 100;
              return (
                <div key={loc.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{loc.name}</span>
                    <span className="text-[10px] font-black text-slate-500">{loc.active} clients</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>{fmtShort(loc.spend)}</span>
                    <span>Avg: {fmtShort(loc.avgSpend)}</span>
                  </div>
                </div>
              );
            })}
            {locationSummary.length === 0 && (
              <p className="text-center text-slate-400 text-xs py-6">No location data</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

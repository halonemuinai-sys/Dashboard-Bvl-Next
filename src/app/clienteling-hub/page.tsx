"use client";

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Heart, RefreshCw, Calendar as CalendarIcon, Users, Repeat2, Gem, BellRing, ArrowUpRight, ShoppingBag, Moon, ArrowRight, Clock3, MapPin, type LucideIcon } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import styles from './clienteling.module.css';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import BvlgariLoader from '@/components/BvlgariLoader';
import { dashboardService } from '@/services/dashboardService';
import type { JourneyStage } from '@/lib/clienteling';

type CData = Awaited<ReturnType<typeof dashboardService.getClientelingData>>;


const TIER_CFG: Record<string, { icon: string; color: string; bg: string; text: string; border: string }> = {
  'Top':           { icon: '👑', color: '#92400e', bg: 'bg-amber-900',    text: 'text-amber-300',   border: 'border-amber-700' },
  'Elite':         { icon: '🎎', color: '#9333ea', bg: 'bg-purple-100',   text: 'text-purple-700',  border: 'border-purple-200' },
  'High Potential':{ icon: '⭐', color: '#0d9488', bg: 'bg-teal-100',     text: 'text-teal-700',    border: 'border-teal-200' },
  'Potential':     { icon: '🔵', color: '#2563eb', bg: 'bg-blue-100',     text: 'text-blue-700',    border: 'border-blue-200' },
  'Prospect':      { icon: '⚪', color: '#94a3b8', bg: 'bg-slate-100',    text: 'text-slate-500',   border: 'border-slate-200' },
  'Inactive':      { icon: '💤', color: '#e11d48', bg: 'bg-rose-100',     text: 'text-rose-700',    border: 'border-rose-200' },
};
const TIER_ORDER = ['Top', 'Elite', 'High Potential', 'Potential', 'Prospect', 'Inactive'];

const JOURNEY_META: Record<JourneyStage, { title: string; signal: string; next: string; icon: LucideIcon; tone: string }> = {
  early: { title: 'Early relationship', signal: '0–1 known invoices', next: 'Confirm client details and plan a personal follow-up.', icon: ShoppingBag, tone: 'blue' },
  returning: { title: 'Returning', signal: '2+ invoices, below 200M', next: 'Build on purchase preferences and invite another visit.', icon: Repeat2, tone: 'violet' },
  highValue: { title: 'High value', signal: '200M+ spend · purchased within 180 days', next: 'Offer tailored service and recognize the relationship.', icon: Gem, tone: 'gold' },
  reconnect: { title: 'Reconnect', signal: '50M+ spend · 180–730 days away', next: 'Prioritize a thoughtful, relevant reconnection.', icon: BellRing, tone: 'rose' },
  dormant: { title: 'Dormant', signal: 'More than 730 days away', next: 'Review consent and preferences before outreach.', icon: Moon, tone: 'slate' },
};

const fmtPct = (n: number) => n.toFixed(1) + '%';

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

  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [journeyStage, setJourneyStage] = useState<JourneyStage>('reconnect');
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const result = await dashboardService.getClientelingData(Number(year));
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load client insights.');
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [year, reload]);

  if (loading) return <BvlgariLoader message="Loading client insights..." />;
  if (error || !data) return <div className={styles.error} role="alert"><BellRing size={28} /><h1>Client insights could not be loaded</h1><p>{error}</p><button onClick={() => setReload(n => n + 1)}>Try again</button></div>;

  const { kpi, tierCounts, tierRevenue, topClients, lapsedAlerts,
          recencyBuckets, freqBuckets, locationSummary, tierMigration, retention } = data;

  const totalTierClients = TIER_ORDER.reduce((s, t) => s + (tierCounts[t] || 0), 0) || 1;
  const maxLocSpend = Math.max(...locationSummary.map(l => l.spend), 1);

  const rfmRecency = Object.entries(recencyBuckets).map(([label, count]) => ({ label, count }));
  const rfmFreq    = Object.entries(freqBuckets).map(([label, count])    => ({ label, count }));
  const maxRfm     = Math.max(...rfmRecency.map(r => r.count), ...rfmFreq.map(f => f.count), 1);
  const selectedJourney = data.journey.find(item => item.stage === journeyStage) ?? data.journey[0];
  const journeyTotal = data.journey.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className={styles.page}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className={styles.hero}>
        <div className={styles.heroCopy}><span className={styles.eyebrow}><Heart size={15} /> CLIENT RELATIONSHIPS</span><h1>Clienteling &amp; Loyalty Hub</h1><p>Understand loyalty. Recognize your most valued clients. Make every reconnection count.</p></div>
        <div className={styles.controls}><label><CalendarIcon size={17} /><span className="sr-only">Reporting year</span><select value={year} onChange={e => setYear(e.target.value)}>{Array.from({ length: Math.max(1, new Date().getFullYear() - 2022) }, (_, i) => String(new Date().getFullYear() - i)).map(y => <option key={y}>{y}</option>)}</select></label><button onClick={() => setReload(n => n + 1)} aria-label="Refresh client insights" title="Refresh client insights"><RefreshCw size={17} /></button></div>
        <div className={styles.heroFoot}><span><span className={styles.dot} /> Snapshot as of {data.asOf}</span><span>Lifetime insights through the selected date <ArrowUpRight size={14} /></span></div>
      </header>
      <div className={styles.scope}><span>Client intelligence <b>/ {year}</b></span><span>Amounts in IDR &bull; Unique invoices, not store visits</span></div>

      {/* ── Row 1: 4 KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-sm shadow-rose-200 w-fit mb-4">
            <Users className="w-4 h-4 text-white" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Clients</p>
          <h3 className="text-3xl font-black text-slate-900">{kpi.totalActive.toLocaleString('id-ID')}</h3>
          <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-50">Purchased within 730 days of snapshot</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-sm shadow-emerald-200 w-fit mb-4">
            <Repeat2 className="w-4 h-4 text-white" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Repeat Client Rate</p>
          <h3 className="text-3xl font-black text-emerald-600">{fmtPct(kpi.retentionRate)}</h3>
          <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-50">2+ lifetime invoices / active clients</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-purple-200 w-fit mb-4">
            <Gem className="w-4 h-4 text-white" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg. Lifetime Value</p>
          <h3 className="text-2xl font-black text-slate-900"><Amt value={kpi.avgLtv} short /></h3>
          <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-50">Per active client</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-200 w-fit mb-4">
            <BellRing className="w-4 h-4 text-white" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lapsed Alert</p>
          <h3 className="text-3xl font-black text-orange-600">{kpi.lapsedCount.toLocaleString('id-ID')}</h3>
          <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-50">Spend 50M+ / last purchase 180-730 days ago</p>
        </div>
      </div>

      <section className={styles.journey} aria-labelledby="journey-title">
        <div className={styles.journeyHeader}>
          <div><span className={styles.sectionEyebrow}>THE RELATIONSHIP JOURNEY</span><h2 id="journey-title">Relationship stages at a glance</h2><p>One stage per client as of {data.asOf}, based on purchase frequency, lifetime value and time since the last purchase. This is a snapshot, not a conversion funnel.</p></div>
          <span className={styles.journeyTotal}>{journeyTotal.toLocaleString('en-US')} known clients</span>
        </div>
        <div className={styles.journeySteps} role="group" aria-label="Select a client journey stage">
          {data.journey.map((item, index) => {
            const meta = JOURNEY_META[item.stage];
            const Icon = meta.icon;
            return <button key={item.stage} type="button" onClick={() => setJourneyStage(item.stage)} aria-pressed={journeyStage === item.stage} className={cn(styles.journeyStep, styles[`journey${meta.tone}`], journeyStage === item.stage && styles.journeySelected)}>
              <span className={styles.stepTop}><span className={styles.stepIcon}><Icon size={19} /></span><span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span></span>
              <strong>{meta.title}</strong><span className={styles.stepCount}>{item.count.toLocaleString('en-US')} <small>clients</small></span><span className={styles.stepSignal}>{meta.signal}</span>
              {index < data.journey.length - 1 && <ArrowRight className={styles.stepArrow} size={16} aria-hidden="true" />}
            </button>;
          })}
        </div>
        <div className={styles.journeyDetail}>
          <div className={styles.detailIntro}><div><span className={styles.sectionEyebrow}>SELECTED STAGE</span><h3>{JOURNEY_META[selectedJourney.stage].title}</h3><p>{JOURNEY_META[selectedJourney.stage].signal}. {JOURNEY_META[selectedJourney.stage].next}</p></div><span>{selectedJourney.count.toLocaleString('en-US')} clients</span></div>
          {selectedJourney.clients.length > 0 ? <><div className={styles.focusList}>
            {selectedJourney.clients.map(client => <div className={styles.focusClient} key={client.id}>
              <div className={styles.focusIdentity}><span className={styles.initials}>{client.name.trim().slice(0, 1).toUpperCase()}</span><div><strong title={client.name}>{client.name}</strong><small><MapPin size={11} />{client.location}</small></div></div>
              <div className={styles.focusStats}><span><Clock3 size={12} />{client.daysSince} days since purchase</span><span>{client.invoices} known invoices</span><b><Amt value={client.spend} short /></b></div>
            </div>)}
          </div><p className={styles.sampleNote}>Showing up to 12 clients with the highest lifetime spend in this stage.</p></> : <p className={styles.journeyEmpty}>No clients in this stage for the selected snapshot.</p>}
        </div>
      </section>

      {/* Tier Pyramid + Monthly Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Tier Pyramid */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Client Tier Distribution</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Lifetime net sales / inactive after 730 days</p>
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
                      <span className={styles.tierDot} style={{ backgroundColor: cfg.color }} />
                      <span className="text-xs font-bold text-slate-700">{tier}</span>
                      <span className="text-[9px] text-slate-400">({fmtPct(pct)})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-black text-slate-800">{count}</span>
                      <span className="text-slate-400 font-mono text-[10px]"><Amt value={revenue} short /></span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(0, Math.min(pct, 100))}%`, backgroundColor: cfg.color }} />
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
              <h3 className="text-sm font-black text-slate-900">New & Returning Clients</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">New vs Returning clients — {year}</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> New</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Returning</span>
            </div>
          </div>
          <div className="p-4"><p className="text-xs text-slate-500 mb-3">New in the first purchase month; returning in later months. Each client is counted once per month.</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={retention} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                  formatter={(value, name) => [value, name === 'newCust' ? 'New' : 'Returning']}
                />
                <Bar isAnimationActive={!reducedMotion} animationDuration={650} maxBarSize={32} dataKey="newCust"   name="newCust"   stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />
                <Bar isAnimationActive={!reducedMotion} animationDuration={650} maxBarSize={32} dataKey="returning" name="returning" stackId="a" fill="#10b981" radius={[4,4,0,0]} />
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
                  <th className="py-2.5 px-4 text-center">Invoices</th>
                  <th className="py-2.5 px-4">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topClients.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-slate-500">No named clients in this reporting period.</td></tr>}
                {topClients.map((c, i) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 text-center">
                      <span className={cn(styles.rankBadge, i < 3 && styles[`rank${i + 1}`])}>{i + 1}</span>
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
              {lapsedAlerts.length} of {kpi.lapsedCount} clients
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
                  <tr key={c.id} className="hover:bg-rose-50/30 transition-colors">
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

      {/* ── Row 4: RFM + Annual Spend Movement + Location Loyalty ──────────── */}
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
            <p className="text-[10px] text-slate-400 mt-0.5">Same-period spend tiers: {data.year - 1} to {data.year}</p>
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
                    <p className="text-[10px] font-black text-slate-700"><Amt value={m.currSpend} short /></p>
                    <p className="text-[9px] text-slate-400"><Amt value={m.prevSpend} short /></p>
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
            <p className="text-[10px] text-slate-400 mt-0.5">Active clients grouped by highest-spend boutique</p>
          </div>
          <div className="p-5 space-y-4">
            {locationSummary.map(loc => {
              const pct = Math.max(0, Math.min(100, (loc.spend / maxLocSpend) * 100));
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
                    <span><Amt value={loc.spend} short /></span>
                    <span>Avg: <Amt value={loc.avgSpend} short /></span>
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
      <details className={styles.method}><summary>How these insights are calculated</summary><p>Client identity uses customer code when available; records without a code are grouped by exact name. Inconsistent or missing codes may split a client profile. Lifetime spend includes available sales history through {data.asOf}. Anonymous clients and invalid rows are excluded ({data.excludedRows} rows).</p><p>Active means a purchase within 730 days. Repeat client rate is the share of active clients with at least two distinct invoice numbers. Missing invoice numbers appear as Unknown frequency. This is not cohort retention.</p><p>Journey stages are mutually exclusive. Dormant (over 730 days) takes priority, followed by Reconnect (50M+ lifetime spend and 180–730 days since purchase), High value (200M+ lifetime spend), Returning (at least two known invoices), then Early relationship. Missing invoice numbers count as zero known invoices. The journey is a current-status snapshot, not a conversion funnel.</p><p>Top: 1.35B+; Elite: 200M+; High Potential: 50M+; Potential: positive spend below 50M; Prospect: zero or negative net spend. Inactive overrides spend tiers after 730 days.</p><p>Annual spend movement compares purchases through {data.asOf} with the same period through {data.priorCutoff}, for clients with positive spend in both periods. Boutique totals represent the lifetime value of assigned clients, not sales recorded at that store.</p></details>
      <footer className={styles.footer}><span>BVLGARI &bull; Client intelligence</span><span>Aris Setiyono</span></footer>
    </div>
  );
}

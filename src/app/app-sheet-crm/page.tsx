"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database, RefreshCw, Download, Search, Calendar as CalendarIcon,
  TrendingUp, Users, CheckCircle, XCircle, Clock, ArrowRight,
  MapPin, Wifi,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { crmService, FUNNEL_MAP, STATUS_MAP, type TrafficRow } from '@/services/crmService';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmtDate = (s: string) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Funnel card config ──────────────────────────────────────────────────────
const FUNNEL_CFG: Record<string, { icon: React.ElementType; grad: string; text: string; border: string; badge: string }> = {
  potensial:  { icon: Users,       grad: 'from-blue-500 to-blue-600',     text: 'text-blue-600',   border: 'border-blue-100',   badge: 'bg-blue-50 text-blue-700 border-blue-100' },
  menunggu:   { icon: Clock,       grad: 'from-amber-400 to-amber-500',   text: 'text-amber-600',  border: 'border-amber-100',  badge: 'bg-amber-50 text-amber-700 border-amber-100' },
  negosiasi:  { icon: ArrowRight,  grad: 'from-orange-400 to-orange-500', text: 'text-orange-600', border: 'border-orange-100', badge: 'bg-orange-50 text-orange-700 border-orange-100' },
  berhasil:   { icon: CheckCircle, grad: 'from-emerald-500 to-emerald-600', text: 'text-emerald-600', border: 'border-emerald-100', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  gagal:      { icon: XCircle,     grad: 'from-rose-500 to-rose-600',     text: 'text-rose-600',   border: 'border-rose-100',   badge: 'bg-rose-50 text-rose-700 border-rose-100' },
};

// ── Status icon config ──────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  walkin:   { icon: Users,       color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100' },
  followup: { icon: RefreshCw,   color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
  delivery: { icon: TrendingUp,  color: 'text-teal-600',   bg: 'bg-teal-50 border-teal-100' },
  service:  { icon: Database,    color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-100' },
  online:   { icon: Wifi,        color: 'text-slate-600',  bg: 'bg-slate-50 border-slate-200' },
};

// ── Prospect level badge color ──────────────────────────────────────────────
function ProspekBadge({ level }: { level: string }) {
  const lower = level.toLowerCase();
  const cls =
    lower.includes('berhasil')  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    lower.includes('gagal')     ? 'bg-rose-50 text-rose-700 border-rose-200' :
    lower.includes('negosiasi') ? 'bg-orange-50 text-orange-700 border-orange-200' :
    lower.includes('menunggu')  ? 'bg-amber-50 text-amber-700 border-amber-200' :
    lower.includes('potensial') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                   'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap', cls)}>
      {level || '—'}
    </span>
  );
}

export default function AppSheetCrmPage() {
  const now = new Date();
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [year, setYear]     = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [rows, setRows]     = useState<TrafficRow[]>([]);

  // Table filters (client-side)
  const [search, setSearch]       = useState('');
  const [filterLoc, setFilterLoc] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLevel, setFilterLevel]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crmService.getTrafficRows(month, parseInt(year));
      setRows(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  // Derived: overview computed from all rows (no filter)
  const overview = useMemo(() => crmService.computeOverview(rows), [rows]);

  // Derived: distinct options from current month data
  const locations     = useMemo(() => [...new Set(rows.map(r => r.location).filter(Boolean))].sort(), [rows]);
  const statuses      = useMemo(() => [...new Set(rows.map(r => r.status).filter(Boolean))].sort(), [rows]);
  const prospekLevels = useMemo(() => [...new Set(rows.map(r => r.prospect_item).filter(Boolean))].sort(), [rows]);

  // Derived: filtered table rows
  const filtered = useMemo(() => rows.filter(r => {
    if (filterLoc    && r.location      !== filterLoc)    return false;
    if (filterStatus && r.status        !== filterStatus) return false;
    if (filterLevel  && r.prospect_item !== filterLevel)  return false;
    if (search && !(r.customer_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, filterLoc, filterStatus, filterLevel, search]);

  const exportCSV = () => {
    const header = ['Tanggal','Nama Lengkap','Lokasi','Served By','Status','Prospek Level','Net Sales','No Invoice'].join(',');
    const body   = filtered.map(r => [
      r.transaction_date, `"${r.customer_name}"`, r.location,
      r.served_by, r.status, r.prospect_item,
      r.net_sales,
    ].join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[header, body].join('\n')], { type: 'text/csv' }));
    a.download = `CRM_Traffic_${year}_${String(month).padStart(2,'0')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Database className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">App Sheet (CRM Dashboard)</h1>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-slate-500 text-sm">Monitoring Prospect Pipeline &amp; Customer Relationship Management</p>
            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              Live Connection
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Month */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <select aria-label="Select month" value={month} onChange={e => setMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          {/* Year */}
          <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {['2026','2025','2024','2023'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={exportCSV}
            className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm text-xs font-bold text-slate-600 hover:border-slate-300 transition-colors">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-60 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-400 animate-pulse">Loading CRM data...</p>
        </div>
      ) : (
        <>
          {/* ── Section 1: Traffic Pipeline Funnel ───────────────────── */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-sm" />
              <h2 className="text-sm font-black text-slate-900">Traffic Pipeline Analysis</h2>
              <span className="ml-auto text-xs text-slate-400 font-medium">{MONTHS[month-1]} {year}</span>
            </div>
            <div className="p-5 grid grid-cols-2 md:grid-cols-5 gap-3">
              {overview.funnel.map(f => {
                const cfg = FUNNEL_CFG[f.key];
                if (!cfg) return null;
                const Icon = cfg.icon;
                return (
                  <div key={f.key} className={cn('bg-white border rounded-2xl p-4 hover:shadow-md transition-shadow', cfg.border)}>
                    <div className={cn('p-2 rounded-xl bg-gradient-to-br w-fit mb-3', cfg.grad)}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className={cn('text-3xl font-black tracking-tight', cfg.text)}>{f.count}</h3>
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight">{f.label}</p>
                    {f.revenue > 0 && (
                      <p className="text-[9px] text-slate-400 mt-2 pt-2 border-t border-slate-50">
                        <Amt value={f.revenue} short />
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Section 2: Status Kedatangan ─────────────────────────── */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-1 h-4 bg-violet-600 rounded-sm" />
              <h2 className="text-sm font-black text-slate-900">Status Kedatangan</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* 5 Status pills */}
              <div className="flex flex-wrap gap-3">
                {overview.statusBreakdown.map(s => {
                  const cfg = STATUS_CFG[s.key];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  return (
                    <div key={s.key} className={cn('flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border', cfg.bg)}>
                      <div className={cn('p-1.5 rounded-lg bg-white shadow-sm')}>
                        <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">{s.count}</p>
                        <p className="text-[9px] font-bold text-slate-400">{s.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Per-location breakdown */}
              {overview.byLocation.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  {overview.byLocation.map(loc => (
                    <div key={loc.name} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-xs font-black text-slate-700 truncate">{loc.name}</p>
                        <span className="ml-auto text-xs font-black text-blue-600">{(loc as any).total}</span>
                      </div>
                      <div className="space-y-1.5">
                        {STATUS_MAP.map(s => {
                          const cnt = (loc as Record<string, number>)[s.key] || 0;
                          if (!cnt) return null;
                          const pct = loc.total > 0 ? (cnt / (loc.total as number)) * 100 : 0;
                          return (
                            <div key={s.key}>
                              <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-0.5">
                                <span>{s.label}</span>
                                <span>{cnt}</span>
                              </div>
                              <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400 rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Section 3: Prospect Detail Table ─────────────────────── */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-1 h-4 bg-slate-700 rounded-sm" />
                <h2 className="text-sm font-black text-slate-900">Prospect Detail Data</h2>
                <span className="text-[10px] font-bold text-slate-400">
                  {filtered.length}/{rows.length} records
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <input type="text" placeholder="Cari nama..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-300 focus:bg-white transition-colors w-40" />
                </div>
                {/* Location filter */}
                <select aria-label="Filter lokasi" value={filterLoc} onChange={e => setFilterLoc(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 outline-none cursor-pointer">
                  <option value="">All Lokasi</option>
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                {/* Prospect level filter */}
                <select aria-label="Filter prospek level" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 outline-none cursor-pointer max-w-[160px]">
                  <option value="">All Level</option>
                  {prospekLevels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                {/* Status filter */}
                <select aria-label="Filter status kedatangan" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 outline-none cursor-pointer max-w-[160px]">
                  <option value="">All Status</option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {(filterLoc || filterLevel || filterStatus || search) && (
                  <button type="button"
                    onClick={() => { setFilterLoc(''); setFilterLevel(''); setFilterStatus(''); setSearch(''); }}
                    className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors underline px-1">
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 shadow-sm">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Lokasi Store</th>
                    <th className="py-3 px-4">Served By</th>
                    <th className="py-3 px-4">Status Kedatangan</th>
                    <th className="py-3 px-4">Prospek Level</th>
                    <th className="py-3 px-4 text-right">Net Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((r, i) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-300 font-bold">{i + 1}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-medium">{fmtDate(r.transaction_date)}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{r.customer_name || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{r.location || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{r.served_by || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{r.status || '—'}</td>
                      <td className="py-2.5 px-4">
                        <ProspekBadge level={r.prospect_item} />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-slate-800">
                        {r.net_sales > 0 ? <Amt value={r.net_sales} short /> : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400 text-sm">
                        {rows.length === 0
                          ? 'Belum ada data untuk periode ini. Jalankan syncTrafficOnly() di GAS terlebih dahulu.'
                          : 'Tidak ada data yang sesuai filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

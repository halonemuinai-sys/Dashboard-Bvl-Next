"use client";

import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  TrendingUp, CalendarIcon, RefreshCw, Save, Check, Download, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, FootfallStoreRow, FootfallCrmRow } from '@/services/dashboardService';
import BvlgariLoader from '@/components/BvlgariLoader';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

// GAS-aligned thresholds: ≥30% green, 15–29% amber, <15% red
const rateColor = (r: number) =>
  r >= 30 ? 'text-emerald-600' : r >= 15 ? 'text-amber-500' : 'text-rose-500';
const rateBg = (r: number) =>
  r >= 30 ? 'bg-emerald-500' : r >= 15 ? 'bg-amber-400' : 'bg-rose-400';

export default function FootfallCrmPage() {
  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear]   = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [storeData, setStoreData] = useState<FootfallStoreRow[]>([]);
  const [crmData, setCrmData]     = useState<FootfallCrmRow[]>([]);

  const [edits, setEdits]   = useState<Record<string, Partial<FootfallCrmRow>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved]   = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, cRes] = await Promise.all([
        dashboardService.getFootfallStore(month, parseInt(year)),
        dashboardService.getFootfallCrm(month, parseInt(year)),
      ]);
      setStoreData(sRes);
      setCrmData(cRes);
      setEdits({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month, year]);

  const daysInMonth = useMemo(() => {
    return new Date(parseInt(year), MONTHS.indexOf(month) + 1, 0).getDate();
  }, [month, year]);

  // day → store → min(traffic_in, traffic_out) as door count
  const doorCount = (d: FootfallStoreRow) =>
    d.traffic_out > 0 ? Math.min(d.traffic_in, d.traffic_out) : d.traffic_in;

  const storeMap = useMemo(() => {
    const map: Record<number, Record<string, number>> = {};
    storeData.forEach(d => {
      const day = new Date(d.transaction_date).getDate();
      if (!map[day]) map[day] = {};
      map[day][d.location] = doorCount(d);
    });
    return map;
  }, [storeData]);

  // day → store → FootfallCrmRow
  const crmMap = useMemo(() => {
    const map: Record<number, Record<string, FootfallCrmRow>> = {};
    crmData.forEach(d => {
      const day = new Date(d.transaction_date).getDate();
      if (!map[day]) map[day] = {};
      map[day][d.location] = d;
    });
    return map;
  }, [crmData]);

  const handleEdit = (day: number, store: string, val: number) => {
    const key = `${day}||${store}`;
    setEdits(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        walk_in: val,
        transaction_date: `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
        location: store,
      },
    }));
  };

  const handleSave = async (day: number, store: string) => {
    const key  = `${day}||${store}`;
    const edit = edits[key];
    if (!edit) return;
    const existing = crmMap[day]?.[store];
    setSaving(key);
    try {
      await dashboardService.saveFootfallCrm({ ...existing, ...edit });
      setSaved(prev => new Set(prev).add(key));
      setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(key); return n; }), 2000);
      setEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
      const updated = await dashboardService.getFootfallCrm(month, parseInt(year));
      setCrmData(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(null); }
  };

  // KPI summaries per store
  const summaries = useMemo(() => {
    const res: Record<string, { door: number; crm: number }> = {};
    STORES.forEach(s => {
      const door = storeData.filter(d => d.location === s).reduce((a, d) => a + doorCount(d), 0);
      const crm  = crmData.filter(d => d.location === s).reduce((a, d) => a + (d.walk_in || 0), 0);
      res[s] = { door, crm };
    });
    return res;
  }, [storeData, crmData]);

  // Grand totals for TOTAL row
  const totals = useMemo(() => {
    const res: Record<string, { door: number; crm: number }> = {};
    STORES.forEach(s => {
      res[s] = { door: 0, crm: 0 };
      for (let d = 1; d <= daysInMonth; d++) {
        res[s].door += storeMap[d]?.[s] || 0;
        const editKey = `${d}||${s}`;
        const editedVal = edits[editKey]?.walk_in;
        res[s].crm += editedVal !== undefined ? editedVal : (crmMap[d]?.[s]?.walk_in || 0);
      }
    });
    return res;
  }, [storeData, crmData, edits, daysInMonth, storeMap, crmMap]);

  // CSV Export (GAS-aligned format with BOM)
  const exportCSV = () => {
    const pad  = (n: number) => String(n).padStart(2, '0');
    const mIdx = MONTHS.indexOf(month) + 1;

    const headers = ['Date',
      ...STORES.flatMap(s => [`${s} Door`, `${s} CRM`, `${s} Rate%`]),
    ].join(',');

    const rows = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dayLabel = `${d} ${month.slice(0,3)}`;
      const cols = STORES.flatMap(s => {
        const door = storeMap[d]?.[s] || 0;
        const editKey = `${d}||${s}`;
        const crm  = edits[editKey]?.walk_in !== undefined ? edits[editKey].walk_in! : (crmMap[d]?.[s]?.walk_in || 0);
        const rate = door > 0 ? ((crm / door) * 100).toFixed(1) : '0.0';
        return [door, crm, rate];
      });
      return [dayLabel, ...cols].join(',');
    });

    const totalRow = ['TOTAL',
      ...STORES.flatMap(s => {
        const { door, crm } = totals[s];
        const rate = door > 0 ? ((crm / door) * 100).toFixed(1) : '0.0';
        return [door, crm, rate];
      }),
    ].join(',');

    const csv = '﻿' + [headers, ...rows, totalRow].join('\n');
    const a   = document.createElement('a');
    a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `Footfall_CaptureRate_${month}_${year}.csv`;
    a.click();
  };

  if (loading) return <BvlgariLoader message="Analyzing Capture Rates..." />;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Footfall (CRM)</h1>
          </div>
          <p className="text-slate-500 text-sm">Capture Rate analysis — Store traffic vs CRM data entry</p>
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
              {['2026','2025','2024','2023'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button type="button" onClick={exportCSV}
            className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm text-xs font-bold text-slate-600 hover:border-slate-300 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STORES.map(s => {
          const { door, crm } = summaries[s];
          const rate = door > 0 ? (crm / door) * 100 : 0;
          return (
            <div key={s} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-800 text-sm">{s}</h3>
                <span className={cn('text-[10px] font-black px-2.5 py-0.5 rounded-full border',
                  rate >= 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  rate >= 15 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                               'bg-rose-50 text-rose-700 border-rose-100')}>
                  {rate.toFixed(1)}%
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Total Masuk (Door)</span>
                  <span className="font-black text-slate-700">{door.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Captured (CRM)</span>
                  <span className="font-black text-indigo-600">{crm.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  <span>Capture Rate</span>
                  <span className={rateColor(rate)}>{rate.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-1000', rateBg(rate))}
                    style={{ width: `${Math.min(rate, 100)}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Breakdown Table ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Daily Capture Breakdown</h3>
          <span className="ml-auto text-[10px] font-bold text-slate-400">{month} {year}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="py-3 px-5 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 w-24">Date</th>
                {STORES.map(s => (
                  <th key={s} colSpan={3} className="py-3 px-4 text-center border-r border-slate-100 min-w-[240px]">
                    {s}
                  </th>
                ))}
              </tr>
              <tr className="bg-white text-[9px] text-slate-400 border-b border-slate-100">
                <th className="py-2 px-5 sticky left-0 bg-white z-10 border-r border-slate-200"><span className="sr-only">Date</span></th>
                {STORES.map(s => (
                  <Fragment key={s}>
                    <th className="py-2 px-4 text-center text-slate-400">Total Masuk</th>
                    <th className="py-2 px-4 text-center text-indigo-400">Captured</th>
                    <th className="py-2 px-4 text-center border-r border-slate-100 text-emerald-500">Rate %</th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const isWeekend = [0, 6].includes(
                  new Date(parseInt(year), MONTHS.indexOf(month), day).getDay()
                );
                return (
                  <tr key={day} className={cn(
                    'hover:bg-slate-50/50 transition-colors',
                    isWeekend ? 'bg-rose-50/20' : ''
                  )}>
                    <td className={cn(
                      'py-2.5 px-5 font-bold sticky left-0 z-10 border-r border-slate-200',
                      isWeekend ? 'text-rose-500 bg-rose-50/30' : 'text-slate-600 bg-white'
                    )}>
                      {day} {month.slice(0,3)}
                    </td>

                    {STORES.map(store => {
                      const key        = `${day}||${store}`;
                      const door       = storeMap[day]?.[store] || 0;
                      const cEntry     = crmMap[day]?.[store];
                      const editedVal  = edits[key]?.walk_in;
                      const crmVal     = editedVal !== undefined ? editedVal : (cEntry?.walk_in || 0);
                      const rate       = door > 0 ? (crmVal / door) * 100 : 0;
                      const isSaving   = saving === key;
                      const isSaved    = saved.has(key);
                      const hasChange  = editedVal !== undefined;

                      return (
                        <Fragment key={store}>
                          {/* Door count */}
                          <td className="py-2.5 px-4 text-center font-mono text-slate-400">
                            {door > 0 ? door.toLocaleString('id-ID') : <span className="text-slate-200">—</span>}
                          </td>

                          {/* CRM entry (editable) */}
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                value={editedVal !== undefined ? editedVal : (cEntry?.walk_in ?? '')}
                                onChange={e => handleEdit(day, store, parseInt(e.target.value) || 0)}
                                className={cn(
                                  'w-14 border rounded-lg px-2 py-1 text-xs font-bold text-center outline-none transition-colors',
                                  hasChange
                                    ? 'border-indigo-300 text-indigo-700 bg-indigo-50'
                                    : 'border-slate-200 text-slate-600 bg-slate-50'
                                )}
                                placeholder="0"
                              />
                              {hasChange && (
                                <button type="button"
                                  onClick={() => handleSave(day, store)}
                                  disabled={isSaving}
                                  className={cn(
                                    'p-1 rounded-lg transition-all',
                                    isSaved ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                                  )}>
                                  {isSaving
                                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                                    : isSaved
                                      ? <Check className="w-3 h-3" />
                                      : <Save className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Rate % */}
                          <td className="py-2.5 px-4 text-center border-r border-slate-100">
                            {door > 0
                              ? <span className={cn('font-black', rateColor(rate))}>{rate.toFixed(1)}%</span>
                              : <span className="text-slate-200">—</span>}
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>

            {/* ── TOTAL Row ─────────────────────────────────────────────── */}
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold">
              <tr>
                <td className="py-3 px-5 text-[10px] font-black text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  TOTAL
                </td>
                {STORES.map(store => {
                  const { door, crm } = totals[store];
                  const rate = door > 0 ? (crm / door) * 100 : 0;
                  return (
                    <Fragment key={store}>
                      <td className="py-3 px-4 text-center font-mono font-black text-slate-700">
                        {door.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-indigo-700">
                        {crm.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center border-r border-slate-100">
                        <span className={cn('font-black', rateColor(rate))}>
                          {door > 0 ? rate.toFixed(1) + '%' : '—'}
                        </span>
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

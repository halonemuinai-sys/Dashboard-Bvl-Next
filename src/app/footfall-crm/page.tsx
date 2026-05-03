"use client";

import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  TrendingUp, CalendarIcon, RefreshCw, Save, Check, AlertCircle, BarChart3, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, FootfallStoreRow, FootfallCrmRow } from '@/services/dashboardService';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

export default function FootfallCrmPage() {
  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear] = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [storeData, setStoreData] = useState<FootfallStoreRow[]>([]);
  const [crmData, setCrmData] = useState<FootfallCrmRow[]>([]);
  
  const [edits, setEdits] = useState<Record<string, Partial<FootfallCrmRow>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, cRes] = await Promise.all([
        dashboardService.getFootfallStore(month, parseInt(year)),
        dashboardService.getFootfallCrm(month, parseInt(year))
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
    const monthIdx = MONTHS.indexOf(month);
    return new Date(parseInt(year), monthIdx + 1, 0).getDate();
  }, [month, year]);

  const storeMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    storeData.forEach(d => {
      const day = new Date(d.transaction_date).getDate();
      if (!map[day]) map[day] = {};
      map[day][d.location] = d.traffic_in;
    });
    return map;
  }, [storeData]);

  const crmMap = useMemo(() => {
    const map: Record<string, Record<string, FootfallCrmRow>> = {};
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
        transaction_date: `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        location: store
      }
    }));
  };

  const handleSave = async (day: number, store: string) => {
    const key = `${day}||${store}`;
    const edit = edits[key];
    if (!edit) return;

    const existing = crmMap[day]?.[store];
    const payload = { ...existing, ...edit };

    setSaving(key);
    try {
      await dashboardService.saveFootfallCrm(payload);
      setSaved(prev => new Set(prev).add(key));
      setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(key); return n; }), 2000);
      setEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
      const updated = await dashboardService.getFootfallCrm(month, parseInt(year));
      setCrmData(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(null); }
  };

  // Summaries
  const summaries = useMemo(() => {
    const res: Record<string, { store: number; crm: number }> = {};
    STORES.forEach(s => {
      const sTotal = storeData.filter(d => d.location === s).reduce((acc, d) => acc + d.traffic_in, 0);
      const cTotal = crmData.filter(d => d.location === s).reduce((acc, d) => acc + (d.walk_in || 0), 0);
      res[s] = { store: sTotal, crm: cTotal };
    });
    return res;
  }, [storeData, crmData]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Analyzing Capture Rates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Footfall (CRM)</h1>
          </div>
          <p className="text-slate-500 text-sm">Capture Rate analysis — Store traffic vs CRM data entry</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
          <CalendarIcon className="w-4 h-4 text-blue-600" />
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer border-l border-slate-200 pl-2 ml-2">
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STORES.map(s => {
          const stats = summaries[s];
          const rate = stats.store > 0 ? (stats.crm / stats.store) * 100 : 0;
          return (
            <div key={s} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <h3 className="font-bold text-slate-900 text-lg mb-4">{s}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Store Traffic</span>
                    <span className="font-bold text-slate-700">{stats.store.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Captured (CRM)</span>
                    <span className="font-bold text-indigo-600">{stats.crm.toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capture Rate</span>
                    <span className={cn("text-2xl font-black", rate >= 40 ? "text-emerald-600" : rate >= 25 ? "text-amber-500" : "text-rose-500")}>
                      {rate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Daily Capture Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 w-24">Date</th>
                {STORES.map(s => (
                  <th key={s} className="py-4 px-6 text-center border-r border-slate-100 min-w-[220px]" colSpan={2}>{s}</th>
                ))}
              </tr>
              <tr className="bg-white text-[9px] text-slate-400">
                <th className="py-2 px-6 sticky left-0 bg-white z-10 border-r border-slate-200"></th>
                {STORES.map(s => (
                  <Fragment key={s}>
                    <th className="py-2 px-4 text-center border-b border-slate-100">Capture %</th>
                    <th className="py-2 px-4 text-center border-b border-r border-slate-100">Manual Entry</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const isWeekend = [0, 6].includes(new Date(parseInt(year), MONTHS.indexOf(month), day).getDay());
                return (
                  <tr key={day} className={cn("hover:bg-slate-50/50 transition-colors", isWeekend ? "bg-slate-50/30" : "")}>
                    <td className={cn("py-3 px-6 font-bold text-sm sticky left-0 z-10 border-r border-slate-200", isWeekend ? "text-rose-600 bg-rose-50/30" : "text-slate-700 bg-white")}>
                      {day} {month.substring(0, 3)}
                    </td>
                    {STORES.map(store => {
                      const key = `${day}||${store}`;
                      const sTraffic = storeMap[day]?.[store] || 0;
                      const cEntry = crmMap[day]?.[store];
                      const editedVal = edits[key]?.walk_in;
                      const currentVal = editedVal !== undefined ? editedVal : (cEntry?.walk_in || 0);
                      const rate = sTraffic > 0 ? (currentVal / sTraffic) * 100 : 0;
                      
                      const isSaving = saving === key;
                      const isSaved = saved.has(key);
                      const hasChange = editedVal !== undefined;

                      return (
                        <Fragment key={store}>
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className={cn("text-xs font-black", rate >= 40 ? "text-emerald-600" : rate >= 25 ? "text-amber-500" : "text-rose-500")}>
                                {rate.toFixed(1)}%
                              </span>
                              <div className="flex items-center gap-1 text-[8px] text-slate-400 font-bold">
                                <span>{currentVal}</span>
                                <ArrowRight className="w-2 h-2" />
                                <span>{sTraffic}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center border-r border-slate-100">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={editedVal !== undefined ? editedVal : (cEntry?.walk_in || '')}
                                onChange={e => handleEdit(day, store, parseInt(e.target.value) || 0)}
                                className={cn(
                                  "w-16 bg-slate-50 border rounded px-2 py-1 text-xs font-bold outline-none text-center",
                                  hasChange ? "border-indigo-300 text-indigo-700 bg-indigo-50/50" : "border-slate-200 text-slate-600"
                                )}
                                placeholder="0"
                              />
                              {hasChange && (
                                <button
                                  onClick={() => handleSave(day, store)}
                                  disabled={isSaving}
                                  className={cn(
                                    "p-1 rounded transition-all",
                                    isSaved ? "bg-emerald-100 text-emerald-600" : "bg-blue-600 text-white shadow-sm"
                                  )}
                                >
                                  {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Users, Home, RotateCcw, RefreshCw, Save, Check, ChevronDown, CalendarIcon, AlertCircle, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, AdvisorProfile, AdvisorRotation } from '@/services/dashboardService';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali', 'Head Office'];
const STORE_ORDER = ['Plaza Indonesia', 'Plaza Senayan', 'Bali', 'Head Office'];
const STORE_COLORS: Record<string, string> = {
  'Plaza Indonesia': 'bg-blue-100 text-blue-700',
  'Plaza Senayan':   'bg-amber-100 text-amber-700',
  'Bali':            'bg-emerald-100 text-emerald-700',
  'Head Office':     'bg-slate-100 text-slate-600',
};
const STORE_FILTER_COLORS: Record<string, string> = {
  'Plaza Indonesia': 'bg-blue-600 text-white border-blue-600',
  'Plaza Senayan':   'bg-amber-500 text-white border-amber-500',
  'Bali':            'bg-emerald-600 text-white border-emerald-600',
  'Head Office':     'bg-slate-600 text-white border-slate-600',
};

type Tab = 'homebase' | 'rotation' | 'target';

export default function AdvisorSetupPage() {
  const today = new Date();
  const [tab, setTab] = useState<Tab>('homebase');
  const [year, setYear] = useState(String(today.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-indexed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const [advisors, setAdvisors] = useState<AdvisorProfile[]>([]);
  const [rotations, setRotations] = useState<AdvisorRotation[]>([]);
  const [targets, setTargets] = useState<{ advisor_name: string; month_number: number; target_value: number }[]>([]);
  const [filterStore, setFilterStore] = useState<string | null>(null);
  const [homeEdits, setHomeEdits] = useState<Record<string, string>>({});
  const [rotEdits, setRotEdits] = useState<Record<string, string>>({}); // key: "advisorName||monthNum"
  const [targetEdits, setTargetEdits] = useState<Record<string, string>>({}); // key: "advisorName||monthNum"

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getAdvisorSetup(parseInt(year));
      setAdvisors(data.advisors);
      setRotations(data.rotations);
      setTargets(data.targets);
      setHomeEdits({});
      setRotEdits({});
      setTargetEdits({});
      setSaved(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load advisor data');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [year]);

  // Build rotation lookup: advisorName -> monthNum -> location
  const rotationLookup = useMemo(() => {
    const map: Record<string, Record<number, string>> = {};
    rotations.forEach(r => {
      if (!map[r.advisor_name]) map[r.advisor_name] = {};
      map[r.advisor_name][r.month_number] = r.assigned_location;
    });
    return map;
  }, [rotations]);

  // Build target lookup: advisorName -> monthNum -> targetValue
  const targetLookup = useMemo(() => {
    const map: Record<string, Record<number, number>> = {};
    targets.forEach(t => {
      if (!map[t.advisor_name]) map[t.advisor_name] = {};
      map[t.advisor_name][t.month_number] = t.target_value;
    });
    return map;
  }, [targets]);

  // Sorted by STORE_ORDER then name, filtered by selected store
  const displayAdvisors = useMemo(() => {
    const sorted = [...advisors].sort((a, b) => {
      const ai = STORE_ORDER.indexOf(a.home_location);
      const bi = STORE_ORDER.indexOf(b.home_location);
      const aIdx = ai === -1 ? 99 : ai;
      const bIdx = bi === -1 ? 99 : bi;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.name.localeCompare(b.name);
    });
    return filterStore ? sorted.filter(a => a.home_location === filterStore) : sorted;
  }, [advisors, filterStore]);

  const flash = (key: string) => {
    setSaved(prev => { const s = new Set(prev); s.add(key); return s; });
    setTimeout(() => setSaved(prev => { const s = new Set(prev); s.delete(key); return s; }), 1800);
  };

  const saveHomeBase = async (advisor: AdvisorProfile) => {
    const newLoc = homeEdits[advisor.name] ?? advisor.home_location;
    if (newLoc === advisor.home_location) return;
    setSaving(advisor.name);
    try {
      await dashboardService.updateAdvisorHomeBase(advisor.name, newLoc);
      setAdvisors(prev => prev.map(a => a.name === advisor.name ? { ...a, home_location: newLoc } : a));
      setHomeEdits(prev => { const n = { ...prev }; delete n[advisor.name]; return n; });
      flash(advisor.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save home base');
    } finally { setSaving(null); }
  };

  const saveRotation = async (advisorName: string, monthNum: number, loc: string) => {
    const key = `${advisorName}||${monthNum}`;
    setSaving(key);
    setError(null);
    try {
      if (!loc || loc === '—') {
        await dashboardService.deleteRotation(advisorName, parseInt(year), monthNum);
        setRotations(prev => prev.filter(r => !(r.advisor_name === advisorName && r.month_number === monthNum)));
      } else {
        await dashboardService.saveRotation(advisorName, parseInt(year), monthNum, loc);
        setRotations(prev => {
          const filtered = prev.filter(r => !(r.advisor_name === advisorName && r.month_number === monthNum));
          return [...filtered, { advisor_name: advisorName, year: parseInt(year), month_number: monthNum, assigned_location: loc }];
        });
      }
      setRotEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
      flash(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save rotation');
    } finally { setSaving(null); }
  };

  const saveTarget = async (advisorName: string, monthNum: number, rawValue: string) => {
    const key = `${advisorName}||${monthNum}`;
    const targetValue = parseFloat(rawValue.replace(/[^0-9.-]/g, '')) || 0;
    setSaving(key);
    setError(null);
    try {
      await dashboardService.saveAdvisorTarget(advisorName, parseInt(year), monthNum, targetValue);
      setTargets(prev => {
        const filtered = prev.filter(t => !(t.advisor_name === advisorName && t.month_number === monthNum));
        return [...filtered, { advisor_name: advisorName, year: parseInt(year), month_number: monthNum, target_value: targetValue }];
      });
      setTargetEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
      flash(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save target');
    } finally { setSaving(null); }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading Advisor Setup...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Advisor Setup</h1>
          </div>
          <p className="text-slate-500 text-sm">Manage home base & monthly rotation assignments</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
          <CalendarIcon className="w-4 h-4 text-blue-600" />
          <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600 font-bold text-xs">✕</button>
        </div>
      )}

      {/* Store filter */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilterStore(null)}
          className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
            !filterStore ? "bg-slate-700 text-white border-slate-700 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
          )}>All Stores</button>
        {STORE_ORDER.map(s => (
          <button type="button" key={s} onClick={() => setFilterStore(filterStore === s ? null : s)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
              filterStore === s ? STORE_FILTER_COLORS[s] + " shadow-sm" : "bg-white border-slate-200 hover:border-slate-300 " + (STORE_COLORS[s]?.split(' ')[1] || 'text-slate-500')
            )}>
            {s}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['homebase', 'rotation', 'target'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
              tab === t ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}>
            {t === 'homebase' && <Home className="w-4 h-4" />}
            {t === 'rotation' && <RotateCcw className="w-4 h-4" />}
            {t === 'target' && <Target className="w-4 h-4" />}
            {t === 'homebase' ? 'Home Base' : t === 'rotation' ? 'Monthly Rotation' : 'Monthly Targets'}
          </button>
        ))}
      </div>

      {/* ── TAB: HOME BASE ── */}
      {tab === 'homebase' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
              <h3 className="text-sm font-bold text-slate-900">Permanent Home Base</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {displayAdvisors.length} / {advisors.length} advisors
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Advisor Name</th>
                  <th className="py-3 px-5">Current Home Base</th>
                  <th className="py-3 px-5">Change To</th>
                  <th className="py-3 px-5 w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayAdvisors.map(advisor => {
                  const edited = homeEdits[advisor.name];
                  const current = advisor.home_location || '—';
                  const isSavingThis = saving === advisor.name;
                  const isSaved = saved.has(advisor.name);
                  const hasChange = edited !== undefined && edited !== advisor.home_location;
                  return (
                    <tr key={advisor.name} className="hover:bg-slate-50 transition-colors text-sm">
                      <td className="py-3 px-5 font-bold text-slate-800">{advisor.name}</td>
                      <td className="py-3 px-5">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold", STORE_COLORS[current] || 'bg-slate-100 text-slate-500')}>
                          {current}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <div className="relative w-44">
                          <select
                            aria-label={`Home base for ${advisor.name}`}
                            value={edited ?? advisor.home_location ?? ''}
                            onChange={e => setHomeEdits(prev => ({ ...prev, [advisor.name]: e.target.value }))}
                            className={cn(
                              "w-full appearance-none bg-slate-50 border rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer pr-7",
                              hasChange ? "border-blue-300 text-blue-700" : "border-slate-200 text-slate-600"
                            )}>
                            <option value="">— No base —</option>
                            {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        {hasChange && (
                          <button onClick={() => saveHomeBase(advisor)} disabled={isSavingThis}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                              isSaved
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                            )}>
                            {isSavingThis ? <RefreshCw className="w-3 h-3 animate-spin" /> : isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                            {isSaved ? 'Saved' : 'Save'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: MONTHLY ROTATION ── */}
      {tab === 'rotation' && (
        <div className="space-y-4">
          {/* Month selector */}
          <div className="flex flex-wrap gap-2">
            {MONTH_SHORT.map((m, i) => (
              <button key={m} onClick={() => setSelectedMonth(i)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                  selectedMonth === i
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                )}>
                {m}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full" />
              <h3 className="text-sm font-bold text-slate-900">
                Rotation — {MONTHS[selectedMonth]} {year}
              </h3>
              <span className="ml-auto text-[10px] text-slate-400 font-medium">
                Rotation overrides home base for crossing sales detection
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-5">Advisor Name</th>
                    <th className="py-3 px-5">Home Base</th>
                    <th className="py-3 px-5">Rotation for {MONTH_SHORT[selectedMonth]}</th>
                    <th className="py-3 px-5 w-32">Status</th>
                    <th className="py-3 px-5 w-28"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayAdvisors.map(advisor => {
                    const monthNum = selectedMonth + 1;
                    const editKey = `${advisor.name}||${monthNum}`;
                    const existingRot = rotationLookup[advisor.name]?.[monthNum];
                    const edited = rotEdits[editKey];
                    const currentRot = edited ?? existingRot ?? '';
                    const isCrossing = currentRot && currentRot !== advisor.home_location;
                    const isSavingThis = saving === editKey;
                    const isSaved = saved.has(editKey);
                    const hasChange = edited !== undefined && edited !== (existingRot ?? '');

                    return (
                      <tr key={advisor.name} className={cn("transition-colors text-sm", isCrossing ? "bg-amber-50/30" : "hover:bg-slate-50")}>
                        <td className="py-3 px-5 font-bold text-slate-800">{advisor.name}</td>
                        <td className="py-3 px-5">
                          <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-bold", STORE_COLORS[advisor.home_location] || 'bg-slate-100 text-slate-500')}>
                            {advisor.home_location || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <div className="relative w-44">
                            <select
                              aria-label={`Rotation for ${advisor.name} in ${MONTHS[selectedMonth]}`}
                              value={currentRot}
                              onChange={e => setRotEdits(prev => ({ ...prev, [editKey]: e.target.value }))}
                              className={cn(
                                "w-full appearance-none bg-slate-50 border rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer pr-7",
                                hasChange ? "border-amber-300 text-amber-700" : existingRot ? "border-amber-200 text-amber-700 bg-amber-50" : "border-slate-200 text-slate-600"
                              )}>
                              <option value="">— Same as home base —</option>
                              {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          {isCrossing ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Rolling</span>
                          ) : existingRot ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Same store</span>
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-5">
                          {hasChange && (
                            <button onClick={() => saveRotation(advisor.name, monthNum, currentRot)} disabled={isSavingThis}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                                isSaved
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                              )}>
                              {isSavingThis ? <RefreshCw className="w-3 h-3 animate-spin" /> : isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                              {isSaved ? 'Saved' : 'Save'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 text-[11px] text-slate-500 px-1">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Advisor rolling ke store lain bulan ini</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Tidak ada rotation — gunakan home base</div>
          </div>
        </div>
      )}

      {/* ── TAB: MONTHLY TARGET ── */}
      {tab === 'target' && (
        <div className="space-y-4">
          {/* Month selector */}
          <div className="flex flex-wrap gap-2">
            {MONTH_SHORT.map((m, i) => (
              <button key={m} onClick={() => setSelectedMonth(i)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                  selectedMonth === i
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                )}>
                {m}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full" />
              <h3 className="text-sm font-bold text-slate-900">
                Targets — {MONTHS[selectedMonth]} {year}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-5">Advisor Name</th>
                    <th className="py-3 px-5">Home Base</th>
                    <th className="py-3 px-5">Target Value (Rp)</th>
                    <th className="py-3 px-5 w-28"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayAdvisors.map(advisor => {
                    const monthNum = selectedMonth + 1;
                    const editKey = `${advisor.name}||${monthNum}`;
                    const existingTarget = targetLookup[advisor.name]?.[monthNum] || 0;
                    const edited = targetEdits[editKey];
                    // Display string: if editing, show edit value. Else formatted existing target.
                    const displayVal = edited !== undefined ? edited : new Intl.NumberFormat('id-ID').format(existingTarget);
                    
                    const isSavingThis = saving === editKey;
                    const isSaved = saved.has(editKey);
                    
                    // Consider it changed if edited exists and parsing it differs from existing target
                    const parsedEdited = edited !== undefined ? parseFloat(edited.replace(/[^0-9.-]/g, '')) || 0 : existingTarget;
                    const hasChange = edited !== undefined && parsedEdited !== existingTarget;

                    return (
                      <tr key={advisor.name} className="hover:bg-slate-50 transition-colors text-sm">
                        <td className="py-3 px-5 font-bold text-slate-800">{advisor.name}</td>
                        <td className="py-3 px-5">
                          <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-bold", STORE_COLORS[advisor.home_location] || 'bg-slate-100 text-slate-500')}>
                            {advisor.home_location || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <div className="relative w-44">
                            <input
                              type="text"
                              value={displayVal}
                              onChange={e => {
                                // Allow only digits, dots, commas
                                const val = e.target.value.replace(/[^0-9.,]/g, '');
                                setTargetEdits(prev => ({ ...prev, [editKey]: val }));
                              }}
                              className={cn(
                                "w-full appearance-none bg-slate-50 border rounded-lg px-3 py-1.5 text-xs font-bold outline-none",
                                hasChange ? "border-indigo-300 text-indigo-700" : existingTarget > 0 ? "border-indigo-200 text-indigo-700 bg-indigo-50" : "border-slate-200 text-slate-600"
                              )}
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          {hasChange && (
                            <button onClick={() => saveTarget(advisor.name, monthNum, edited!)} disabled={isSavingThis}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                                isSaved
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                              )}>
                              {isSavingThis ? <RefreshCw className="w-3 h-3 animate-spin" /> : isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                              {isSaved ? 'Saved' : 'Save'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

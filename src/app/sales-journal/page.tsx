'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  NotebookPen,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  Printer,
  Sparkles,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Percent,
  HeartHandshake,
  Tag,
  Calendar,
  Store,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { supabase } from '@/lib/supabase';
import { useUserAccess } from '@/lib/user-access-context';
import {
  JournalEntry,
  DayContext,
  DailyTrafficStat,
  getJournalEntries,
  saveJournalEntry,
  deleteJournalEntry,
  getDayContext,
  getMonthlyTraffic,
} from '@/services/dashboard/journalService';

// Reporting Module
import {
  exportJournalExcel,
  JournalReportPayload,
  JournalDayRecord,
} from './reports';
import JournalSynthesisModal from './components/JournalSynthesisModal';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STORES = ['ALL', 'Plaza Indonesia', 'Plaza Senayan', 'Bali'];
const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const TAG_OPTIONS = ['Promo', 'Event', 'VIP Customer', 'Weather', 'Stockout', 'Staffing', 'Complaint', 'Lainnya'];
const HEATMAP_NOTE_KEY = (y: number, m: number, d: number) => `heatmap_note_${y}_${m}_${d}`;

interface DailyStat { net: number; qty: number; trans: number; }

export default function SalesJournalPage() {
  const { isAdmin, userEmail, assignedStore } = useUserAccess();
  const isStoreScoped = Boolean(assignedStore && assignedStore !== 'ALL');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [store, setStore] = useState(isStoreScoped ? assignedStore : 'ALL');
  const [filterMode, setFilterMode] = useState<'all' | 'noted' | 'unnoted'>('all');

  const [dailyStats, setDailyStats] = useState<Record<number, DailyStat>>({});
  const [dailyTraffic, setDailyTraffic] = useState<Record<number, DailyTrafficStat>>({});
  const [entries, setEntries] = useState<Record<string, JournalEntry>>({});
  const [importedNotes, setImportedNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Expanded row context
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [contexts, setContexts] = useState<Record<string, DayContext>>({});
  const [contextLoading, setContextLoading] = useState<number | null>(null);
  const [draftNote, setDraftNote] = useState<Record<number, string>>({});
  const [draftTags, setDraftTags] = useState<Record<number, string[]>>({});
  const [saving, setSaving] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    if (isStoreScoped && assignedStore) setStore(assignedStore);
  }, [assignedStore, isStoreScoped]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateKey = (d: number) => `${year}-${pad(month)}-${pad(d)}`;
  const lastDay = useMemo(() => new Date(Number(year), month, 0).getDate(), [year, month]);

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    setExpandedDay(null);
    setContexts({});
    try {
      const from = `${year}-${pad(month)}-01T00:00:00`;
      const to = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59`;

      let q = supabase.from('clean_master')
        .select('trans_no, transaction_date, net_sales, qty, location')
        .gte('transaction_date', from)
        .lte('transaction_date', to)
        .not('location', 'ilike', '%head office%');
      if (store !== 'ALL') q = q.eq('location', store);

      const [{ data }, journalMap, trafficMap] = await Promise.all([
        q,
        getJournalEntries(month, Number(year), store),
        getMonthlyTraffic(month, Number(year), store),
      ]);

      const stats: Record<number, { net: number; qty: number; trans: Set<string> }> = {};
      (data || []).forEach((r: any) => {
        const d = new Date(r.transaction_date).getDate();
        if (!stats[d]) stats[d] = { net: 0, qty: 0, trans: new Set() };
        stats[d].net += r.net_sales || 0;
        stats[d].qty += r.qty || 0;
        if (r.trans_no) stats[d].trans.add(r.trans_no);
      });

      const finalStats: Record<number, DailyStat> = {};
      Object.entries(stats).forEach(([d, s]) => {
        finalStats[Number(d)] = { net: s.net, qty: s.qty, trans: s.trans.size };
      });

      setDailyStats(finalStats);
      setDailyTraffic(trafficMap);
      setEntries(journalMap);

      // Pull in legacy notes from Heatmap Calendar localStorage
      const imported: Record<string, string> = {};
      for (let d = 1; d <= lastDay; d++) {
        const key = `${year}-${pad(month)}-${pad(d)}`;
        if (journalMap[key]?.note?.trim()) continue;
        const legacy = localStorage.getItem(HEATMAP_NOTE_KEY(Number(year), month, d));
        if (legacy?.trim()) imported[key] = legacy;
      }
      setImportedNotes(imported);
    } catch (err) {
      console.error('Error fetching sales journal:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year, store, lastDay]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  const summary = useMemo(() => {
    const days = Object.values(dailyStats);
    const totalNet = days.reduce((s, d) => s + d.net, 0);
    const totalQty = days.reduce((s, d) => s + d.qty, 0);
    const totalTrans = days.reduce((s, d) => s + d.trans, 0);
    const daysWithData = days.length;
    const notedKeys = new Set([
      ...Object.keys(entries).filter(k => entries[k]?.note?.trim()),
      ...Object.keys(importedNotes),
    ]);

    const trafficList = Object.values(dailyTraffic);
    const totalTraffic = trafficList.reduce((s, t) => s + t.totalCrm, 0);
    const totalWalkIn = trafficList.reduce((s, t) => s + t.walkIn, 0);
    const totalFollowUp = trafficList.reduce((s, t) => s + t.followUp, 0);
    const totalInHouse = trafficList.reduce((s, t) => s + t.inHouse, 0);
    const avgConversionRate = totalTraffic > 0 ? (totalTrans / totalTraffic) * 100 : null;

    return {
      totalNet,
      totalQty,
      totalTrans,
      daysWithData,
      daysNoted: notedKeys.size,
      totalTraffic,
      totalWalkIn,
      totalFollowUp,
      totalInHouse,
      avgConversionRate,
    };
  }, [dailyStats, entries, importedNotes, dailyTraffic]);

  const rows = useMemo(() => {
    const list = Array.from({ length: lastDay }, (_, i) => i + 1).map(d => {
      const stat = dailyStats[d] || { net: 0, qty: 0, trans: 0 };
      const traffic = dailyTraffic[d] || {
        doorTraffic: 0,
        totalCrm: 0,
        uniqueCrm: 0,
        walkIn: 0,
        followUp: 0,
        inHouse: 0,
        other: 0,
      };
      const convRate = traffic.totalCrm > 0 ? (stat.trans / traffic.totalCrm) * 100 : null;
      const key = dateKey(d);
      const entry = entries[key];
      const importedNote = importedNotes[key];
      const hasNote = Boolean(entry?.note?.trim() || importedNote);
      const prevStat = d > 1 ? dailyStats[d - 1] : undefined;
      const deltaPct = prevStat && prevStat.net > 0 ? ((stat.net - prevStat.net) / prevStat.net) * 100 : null;
      return {
        day: d,
        stat,
        traffic,
        convRate,
        entry,
        importedNote,
        hasNote,
        deltaPct,
        dow: new Date(Number(year), month - 1, d).getDay(),
      };
    });
    if (filterMode === 'noted') return list.filter(r => r.hasNote);
    if (filterMode === 'unnoted') return list.filter(r => !r.hasNote);
    return list;
  }, [lastDay, dailyStats, dailyTraffic, entries, importedNotes, filterMode, year, month]);

  const toggleRow = useCallback(async (day: number) => {
    if (expandedDay === day) { setExpandedDay(null); return; }
    setExpandedDay(day);
    const key = dateKey(day);
    if (draftNote[day] === undefined) {
      setDraftNote(prev => ({ ...prev, [day]: entries[key]?.note ?? importedNotes[key] ?? '' }));
      setDraftTags(prev => ({ ...prev, [day]: entries[key]?.tags ?? [] }));
    }
    if (!contexts[key]) {
      setContextLoading(day);
      try {
        const ctx = await getDayContext(key, store);
        setContexts(prev => ({ ...prev, [key]: ctx }));
      } catch (err) {
        console.error('Error loading day context:', err);
      } finally {
        setContextLoading(null);
      }
    }
  }, [expandedDay, entries, importedNotes, contexts, store, month, year, draftNote]);

  const toggleTag = (day: number, tag: string) => {
    setDraftTags(prev => {
      const current = prev[day] || [];
      const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
      return { ...prev, [day]: next };
    });
  };

  const handleSave = async (day: number) => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const key = dateKey(day);
      const note = (draftNote[day] || '').trim();
      const tags = draftTags[day] || [];
      await saveJournalEntry({ entry_date: key, location: store, note, tags }, userEmail);
      setEntries(prev => ({ ...prev, [key]: { entry_date: key, location: store, note, tags } }));
    } catch (err) {
      console.error('Error saving journal entry:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (day: number) => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const key = dateKey(day);
      await deleteJournalEntry(key, store);
      setEntries(prev => { const n = { ...prev }; delete n[key]; return n; });
      setDraftNote(prev => ({ ...prev, [day]: '' }));
      setDraftTags(prev => ({ ...prev, [day]: [] }));
    } catch (err) {
      console.error('Error deleting journal entry:', err);
    } finally {
      setSaving(false);
    }
  };

  // Build payload for Executive Reports
  const reportPayload: JournalReportPayload = useMemo(() => {
    const records: JournalDayRecord[] = Array.from({ length: lastDay }, (_, i) => i + 1).map((d) => {
      const stat = dailyStats[d] || { net: 0, qty: 0, trans: 0 };
      const traffic = dailyTraffic[d] || {
        doorTraffic: 0,
        totalCrm: 0,
        uniqueCrm: 0,
        walkIn: 0,
        followUp: 0,
        inHouse: 0,
        other: 0,
      };
      const convRate = traffic.totalCrm > 0 ? (stat.trans / traffic.totalCrm) * 100 : null;
      const key = dateKey(d);
      const entry = entries[key];
      const importedNote = importedNotes[key];
      const prevStat = d > 1 ? dailyStats[d - 1] : undefined;
      const deltaPct = prevStat && prevStat.net > 0 ? ((stat.net - prevStat.net) / prevStat.net) * 100 : null;
      const dow = new Date(Number(year), month - 1, d).getDay();

      return {
        day: d,
        dateStr: key,
        dayName: DAY_NAMES[dow],
        isWeekend: dow === 0 || dow === 6,
        store: store === 'ALL' ? 'All Stores' : store,
        netSales: stat.net,
        qty: stat.qty,
        transCount: stat.trans,
        doorTraffic: traffic.doorTraffic,
        crmTraffic: traffic.totalCrm,
        walkIn: traffic.walkIn,
        followUp: traffic.followUp,
        inHouse: traffic.inHouse,
        conversionRate: convRate !== null ? convRate / 100 : null,
        deltaPct,
        note: entry?.note?.trim() || importedNote || '',
        tags: entry?.tags || [],
        hasNote: Boolean(entry?.note?.trim() || importedNote),
        author: entry?.created_by || entry?.updated_by,
      };
    });

    return {
      month,
      monthName: MONTHS[month - 1],
      year: Number(year),
      store,
      totalNet: summary.totalNet,
      totalQty: summary.totalQty,
      totalTrans: summary.totalTrans,
      totalTraffic: summary.totalTraffic,
      avgConversionRate: summary.avgConversionRate,
      daysWithData: summary.daysWithData,
      daysNoted: summary.daysNoted,
      totalDays: lastDay,
      records,
    };
  }, [month, year, store, summary, lastDay, dailyStats, dailyTraffic, entries, importedNotes]);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await exportJournalExcel(reportPayload);
    } catch (err) {
      console.error('Error exporting journal report to Excel:', err);
      alert('Gagal mengekspor laporan Excel.');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 print:space-y-3">
      {/* Report Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
              <NotebookPen className="w-5 h-5 text-amber-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Journal</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                  OPERATIONAL LOG
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Catatan harian operasional penunjang sales butik.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Advanced Reporting Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Selector */}
          <select
            aria-label="month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm outline-none cursor-pointer"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            aria-label="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm outline-none cursor-pointer"
          >
            {['2026', '2025', '2024', '2023'].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>

          {/* Store Selector */}
          <select
            aria-label="store"
            value={store}
            disabled={isStoreScoped}
            onChange={(e) => setStore(e.target.value)}
            className={cn(
              'bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm outline-none cursor-pointer',
              isStoreScoped && 'opacity-60 cursor-not-allowed'
            )}
          >
            {STORES.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All Stores' : s}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchMonth}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm cursor-pointer"
            title="Muat ulang data"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin text-amber-600')} />
          </button>

          {/* Advanced Executive Synthesis Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Synthesis Brief</span>
          </button>

          {/* Advanced Excel Export Button */}
          <button
            type="button"
            disabled={exportingExcel || loading}
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{exportingExcel ? 'Generating Excel...' : 'Export Excel (4 Sheets)'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:grid-cols-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Net Sales</span>
          <p className="text-xl font-black text-slate-900 mt-1">
            <Amt value={summary.totalNet} />
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{summary.daysWithData} / {lastDay} hari aktif</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Volume Penjualan</span>
          <p className="text-xl font-black text-slate-900 mt-1">{summary.totalQty.toLocaleString('id-ID')} pcs</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{summary.totalTrans.toLocaleString('id-ID')} total transaksi</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Traffic (CRM)</span>
          <p className="text-xl font-black text-slate-900 mt-1">{summary.totalTraffic.toLocaleString('id-ID')} customer</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
            {summary.totalWalkIn} WI &bull; {summary.totalFollowUp} FU
            {summary.totalInHouse > 0 ? ` • ${summary.totalInHouse} In-House` : ''}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales Conversion</span>
          <p className="text-xl font-black text-emerald-600 mt-1">
            {summary.avgConversionRate !== null ? `${summary.avgConversionRate.toFixed(1)}%` : '-'}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Trx per customer komersial</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Journal Coverage</span>
          <p className="text-xl font-black text-blue-600 mt-1">
            {summary.daysNoted} / {lastDay} hari
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{Math.round((summary.daysNoted / lastDay) * 100)}% tercatat</span>
        </div>
      </div>

      {/* Main Journal Data Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Filter Tabs */}
        <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={cn('px-3 py-1 rounded-lg transition-all', filterMode === 'all' && 'bg-white text-slate-900 shadow-sm')}
            >
              Semua Hari ({lastDay})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('noted')}
              className={cn('px-3 py-1 rounded-lg transition-all', filterMode === 'noted' && 'bg-white text-slate-900 shadow-sm')}
            >
              Sudah Dicatat ({summary.daysNoted})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('unnoted')}
              className={cn('px-3 py-1 rounded-lg transition-all', filterMode === 'unnoted' && 'bg-white text-slate-900 shadow-sm')}
            >
              Belum Dicatat ({lastDay - summary.daysNoted})
            </button>
          </div>

          <span className="text-xs text-slate-400">
            Klik baris tanggal untuk melihat breakdown traffic CRM, diskon, koleksi, dan menambahkan catatan harian.
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> Memuat data jurnal penjualan...
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map(({ day, stat, traffic, convRate, entry, importedNote, hasNote, deltaPct, dow }) => {
              const isExpanded = expandedDay === day;
              const key = dateKey(day);
              const isWeekend = dow === 0 || dow === 6;
              const noteText = entry?.note?.trim() || importedNote || '';
              const tags = entry?.tags || [];

              return (
                <div key={day} className={cn('transition-colors', isExpanded && 'bg-slate-50/70')}>
                  {/* Row Header Bar */}
                  <div
                    onClick={() => toggleRow(day)}
                    className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50/90 transition-colors"
                  >
                    {/* Day Pill */}
                    <div
                      className={cn(
                        'w-12 text-center py-1 rounded-lg font-black text-xs flex-shrink-0',
                        isWeekend ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'
                      )}
                    >
                      <div className="text-sm leading-none font-bold">{day}</div>
                      <div className="text-[9px] uppercase tracking-wider mt-0.5">{DAY_NAMES[dow]?.slice(0, 3)}</div>
                    </div>

                    {/* Net Sales & DoD Delta */}
                    <div className="w-38 flex-shrink-0">
                      <div className="text-xs font-bold text-slate-900">
                        <Amt value={stat.net} />
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>{stat.qty} pcs</span>
                        <span>&bull;</span>
                        <span>{stat.trans} trx</span>
                        {deltaPct !== null && (
                          <span
                            className={cn(
                              'font-bold flex items-center ml-1',
                              deltaPct > 0 ? 'text-emerald-600' : deltaPct < 0 ? 'text-rose-600' : 'text-slate-400'
                            )}
                          >
                            {deltaPct > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                            {Math.abs(deltaPct).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CRM Traffic & Conversion Pill */}
                    <div className="w-48 flex-shrink-0 hidden sm:block">
                      {traffic.totalCrm > 0 ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{traffic.totalCrm} Customer</span>
                            {convRate !== null && (
                              <span
                                className={cn(
                                  'px-1.5 py-0.2 rounded text-[10px] font-bold',
                                  convRate >= 35
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : convRate >= 20
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                )}
                              >
                                {convRate.toFixed(1)}% conv
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <span>{traffic.walkIn} WI</span>
                            <span>&bull;</span>
                            <span>{traffic.followUp} FU</span>
                            {traffic.inHouse > 0 && (
                              <>
                                <span>&bull;</span>
                                <span className="text-purple-600 font-semibold">{traffic.inHouse} In-House</span>
                              </>
                            )}
                            {traffic.other > 0 && (
                              <>
                                <span>&bull;</span>
                                <span>{traffic.other} Lain</span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] text-slate-300 italic">
                          <Users className="w-3 h-3" />
                          <span>0 customer</span>
                        </div>
                      )}
                    </div>

                    {/* Narrative Note & Tag Chips preview */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {hasNote ? (
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 truncate font-medium">{noteText}</p>
                          {tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-[9px] bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 italic">Belum ada catatan — klik untuk menambahkan</span>
                      )}
                    </div>

                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-slate-400 transition-transform flex-shrink-0',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </div>

                  {/* Expanded Context & Note Editor Drawer */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-slate-200/60 bg-white space-y-4">
                      {/* Day Context Summary (Collections, Discounts, Support, Traffic) */}
                      {contextLoading === day ? (
                        <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menghubungkan konteks penjualan &amp; traffic...
                        </div>
                      ) : contexts[key] ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl text-xs border border-slate-200/70">
                            {/* 1. Traffic & Conversion */}
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                                Customer Traffic (CRM):
                              </span>
                              {traffic.totalCrm === 0 ? (
                                <span className="text-slate-400 italic">Tidak ada kunjungan tercatat</span>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-700">Total Customer:</span>
                                    <span className="font-bold text-slate-900">
                                      {traffic.totalCrm} customer ({traffic.uniqueCrm} unik)
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-[11px] text-slate-600">
                                    <span>Walk-In / Follow-Up:</span>
                                    <span>{traffic.walkIn} WI &bull; {traffic.followUp} FU</span>
                                  </div>
                                  {traffic.inHouse > 0 && (
                                    <div className="flex justify-between items-center text-[11px] text-purple-700 font-medium">
                                      <span>In-House Resort:</span>
                                      <span>{traffic.inHouse} customer</span>
                                    </div>
                                  )}
                                  {traffic.doorTraffic > 0 && (
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5 border-t border-slate-200/60">
                                      <span>Sensor Pintu:</span>
                                      <span>{traffic.doorTraffic} footfall</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 font-semibold">
                                    <span className="text-slate-700">Konversi Sales:</span>
                                    <span
                                      className={cn(
                                        convRate && convRate >= 30
                                          ? 'text-emerald-600 font-bold'
                                          : convRate && convRate >= 15
                                          ? 'text-blue-600 font-bold'
                                          : 'text-slate-700'
                                      )}
                                    >
                                      {convRate !== null ? `${convRate.toFixed(1)}%` : '-'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 2. Top Collections */}
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                                Top Koleksi:
                              </span>
                              {contexts[key].topCollections.length === 0 ? (
                                <span className="text-slate-400 italic">Tidak ada transaksi</span>
                              ) : (
                                <ul className="space-y-0.5">
                                  {contexts[key].topCollections.map((c) => (
                                    <li key={c.name} className="flex justify-between">
                                      <span className="text-slate-700">{c.name}</span>
                                      <span className="font-bold text-slate-900">
                                        <Amt value={c.net} />
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* 3. Discount Reasons */}
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                                Alasan Diskon:
                              </span>
                              {contexts[key].discountReasons.length === 0 ? (
                                <span className="text-slate-400 italic">Tidak ada diskon khusus</span>
                              ) : (
                                <ul className="space-y-0.5">
                                  {contexts[key].discountReasons.map((r) => (
                                    <li key={r.reason} className="flex justify-between">
                                      <span className="text-slate-700">{r.reason}</span>
                                      <span className="font-bold text-slate-900">{r.count}x</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* 4. After-Sales Support */}
                            <div>
                              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                                After-Sales Support:
                              </span>
                              <p className="text-slate-700 leading-relaxed">
                                {contexts[key].afterSalesCount > 0
                                  ? `${contexts[key].afterSalesCount} transaksi mendapatkan dukungan after-sales`
                                  : 'Tidak ada catatan after-sales'}
                              </p>
                            </div>
                          </div>

                          {/* Visitors breakdown list if available */}
                          {contexts[key].visitors && contexts[key].visitors.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-2">
                                Customer Komersial Dilayani ({contexts[key].visitors.length} Kunjungan Non-Repair):
                              </span>
                              <div className="divide-y divide-slate-200/60 max-h-48 overflow-y-auto pr-1">
                                {contexts[key].visitors.map((v) => (
                                  <div
                                    key={v.id}
                                    className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-800">{v.customerName}</span>
                                      <span
                                        className={cn(
                                          'px-1.5 py-0.2 rounded text-[9px] font-bold',
                                          v.status.toLowerCase().includes('walk in')
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : v.status.toLowerCase().includes('follow up')
                                            ? 'bg-blue-100 text-blue-800'
                                            : v.status.toLowerCase().includes('in house')
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-slate-200 text-slate-700'
                                        )}
                                      >
                                        {v.status}
                                      </span>
                                      {v.servedBy && (
                                        <span className="text-slate-400 text-[10px]">
                                          CA: <strong className="text-slate-600 font-normal">{v.servedBy}</strong>
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-slate-500 text-[10px] flex items-center gap-2">
                                      {v.prospectItem && <span>Prospek: {v.prospectItem}</span>}
                                      {v.notes && (
                                        <span className="italic text-slate-400 truncate max-w-xs">
                                          &quot;{v.notes}&quot;
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Note Editor Textarea */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Catatan Harian ({dateKey(day)}):
                        </label>
                        <textarea
                          rows={3}
                          disabled={!isAdmin}
                          value={draftNote[day] ?? ''}
                          onChange={(e) => setDraftNote((prev) => ({ ...prev, [day]: e.target.value }))}
                          placeholder={isAdmin ? 'Tulis catatan harian (kunjungan VIP, event, stok, cuaca)...' : 'Hanya admin yang dapat mengedit'}
                          className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 disabled:opacity-60 transition-all placeholder:text-slate-400"
                        />
                      </div>

                      {/* Tag Options */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Kategori Catatan:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {TAG_OPTIONS.map((t) => {
                            const selected = (draftTags[day] || []).includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                disabled={!isAdmin}
                                onClick={() => toggleTag(day, t)}
                                className={cn(
                                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                                  selected
                                    ? 'bg-slate-900 text-amber-300 border-slate-900 font-bold'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                )}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Save & Delete Action Buttons */}
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          {hasNote && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleDelete(day)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                            >
                              Hapus Catatan
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleSave(day)}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
                          >
                            {saving ? 'Menyimpan...' : 'Simpan Catatan'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Executive Synthesis Modal */}
      <JournalSynthesisModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        payload={reportPayload}
        onExportExcel={handleExportExcel}
      />
    </div>
  );
}

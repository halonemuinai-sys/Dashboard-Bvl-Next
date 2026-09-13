'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  NotebookPen,
  RefreshCw,
  Loader2,
  Tag,
  Percent,
  HeartHandshake,
  Package,
  Trash2,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileText,
  Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { supabase } from '@/lib/supabase';
import { useUserAccess } from '@/lib/user-access-context';
import {
  JournalEntry,
  DayContext,
  getJournalEntries,
  saveJournalEntry,
  deleteJournalEntry,
  getDayContext,
} from '@/services/dashboard/journalService';

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
  const [entries, setEntries] = useState<Record<string, JournalEntry>>({});
  const [importedNotes, setImportedNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [contexts, setContexts] = useState<Record<string, DayContext>>({});
  const [contextLoading, setContextLoading] = useState<number | null>(null);
  const [draftNote, setDraftNote] = useState<Record<number, string>>({});
  const [draftTags, setDraftTags] = useState<Record<number, string[]>>({});
  const [saving, setSaving] = useState(false);

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

      const [{ data }, journalMap] = await Promise.all([
        q,
        getJournalEntries(month, Number(year), store),
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
      setEntries(journalMap);

      // Pull in legacy notes still sitting in localStorage from Heatmap Calendar
      // (never migrated to Supabase) — only for days that don't already have a real entry.
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
    const daysWithData = days.length;
    const notedKeys = new Set([
      ...Object.keys(entries).filter(k => entries[k]?.note?.trim()),
      ...Object.keys(importedNotes),
    ]);
    return { totalNet, totalQty, daysWithData, daysNoted: notedKeys.size };
  }, [dailyStats, entries, importedNotes]);

  const rows = useMemo(() => {
    const list = Array.from({ length: lastDay }, (_, i) => i + 1).map(d => {
      const stat = dailyStats[d] || { net: 0, qty: 0, trans: 0 };
      const key = dateKey(d);
      const entry = entries[key];
      const importedNote = importedNotes[key];
      const hasNote = Boolean(entry?.note?.trim() || importedNote);
      const prevStat = d > 1 ? dailyStats[d - 1] : undefined;
      const deltaPct = prevStat && prevStat.net > 0 ? ((stat.net - prevStat.net) / prevStat.net) * 100 : null;
      return { day: d, stat, entry, importedNote, hasNote, deltaPct, dow: new Date(Number(year), month - 1, d).getDay() };
    });
    if (filterMode === 'noted') return list.filter(r => r.hasNote);
    if (filterMode === 'unnoted') return list.filter(r => !r.hasNote);
    return list;
  }, [lastDay, dailyStats, entries, importedNotes, filterMode, year, month]);

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

  return (
    <div className="space-y-6 pb-16 print:space-y-3">

      {/* Report Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
              <NotebookPen className="w-4 h-4 text-white" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Journal</h1>
          </div>
          <p className="text-slate-500 text-sm">Log naratif operasional — kenapa penjualan naik atau turun, hari demi hari.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select aria-label="month" value={month} onChange={e => setMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
          <select aria-label="year" value={year} onChange={e => setYear(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {['2026','2025','2024','2023'].map(y => <option key={y}>{y}</option>)}
          </select>
          <select aria-label="store" value={store} disabled={isStoreScoped}
            onChange={e => setStore(e.target.value)}
            className={cn(
              "bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer",
              isStoreScoped && "opacity-60 cursor-not-allowed"
            )}>
            {STORES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Stores' : s}</option>)}
          </select>
          <button type="button" onClick={fetchMonth}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm cursor-pointer"
            title="Muat ulang">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button type="button" onClick={() => window.print()}
            className="flex items-center gap-1.5 p-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm cursor-pointer text-xs font-bold"
            title="Cetak / Export PDF">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-4 py-2.5 rounded-xl print:hidden">
          Mode lihat saja — hanya admin yang bisa menulis atau mengubah catatan journal.
        </div>
      )}

      {/* Report Letterhead */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-slate-400 print:shadow-none print:rounded-none">
        <div className="px-6 py-5 border-b-2 border-slate-900 print:border-b print:border-black">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Laporan Bulanan</p>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">
                {MONTHS[month-1]} {year} {store !== 'ALL' && `· ${store}`}
              </h2>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Net Sales</p>
                <p className="text-sm font-black text-slate-900"><Amt value={summary.totalNet} compact /></p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Qty</p>
                <p className="text-sm font-black text-slate-900">{summary.totalQty.toLocaleString('id-ID')}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hari Bertransaksi</p>
                <p className="text-sm font-black text-slate-900">{summary.daysWithData} / {lastDay}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Ada Catatan</p>
                <p className="text-sm font-black text-blue-700">{summary.daysNoted} hari</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 print:hidden">
          {([
            { key: 'all', label: 'Semua Hari' },
            { key: 'noted', label: 'Ada Catatan' },
            { key: 'unnoted', label: 'Belum Ada Catatan' },
          ] as const).map(f => (
            <button key={f.key} type="button" onClick={() => setFilterMode(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                filterMode === f.key ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              )}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Journal Ledger */}
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Tidak ada entri untuk filter ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map(({ day, stat, entry, importedNote, hasNote, deltaPct, dow }) => {
              const isExpanded = expandedDay === day;
              const key = dateKey(day);
              const ctx = contexts[key];
              const isWeekend = dow === 0 || dow === 6;

              return (
                <div key={day} className={cn('print:break-inside-avoid', isWeekend && 'bg-slate-50/40')}>
                  {/* Row header */}
                  <button type="button" onClick={() => toggleRow(day)}
                    className="w-full flex items-center gap-4 px-6 py-3.5 text-left hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                    <div className="w-16 shrink-0">
                      <p className="text-lg font-black text-slate-900 leading-none">{String(day).padStart(2,'0')}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{DAY_NAMES[dow].slice(0,3)}</p>
                    </div>

                    <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 gap-3 items-center min-w-0">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Net Sales</p>
                        <p className="text-xs font-black text-slate-800"><Amt value={stat.net} compact /></p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Qty / Trans</p>
                        <p className="text-xs font-bold text-slate-600">{stat.qty} pcs · {stat.trans} trx</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">vs Kemarin</p>
                        {deltaPct === null ? (
                          <p className="text-xs font-bold text-slate-300 flex items-center gap-0.5"><Minus className="w-3 h-3" /> —</p>
                        ) : (
                          <p className={cn('text-xs font-bold flex items-center gap-0.5',
                            deltaPct > 0 ? 'text-emerald-600' : deltaPct < 0 ? 'text-rose-500' : 'text-slate-400')}>
                            {deltaPct > 0 ? <ArrowUpRight className="w-3 h-3" /> : deltaPct < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {Math.abs(deltaPct).toFixed(0)}%
                          </p>
                        )}
                      </div>
                      <div className="min-w-0 hidden sm:block">
                        {entry?.note?.trim() ? (
                          <p className="text-xs text-slate-600 italic truncate">&ldquo;{entry.note}&rdquo;</p>
                        ) : importedNote ? (
                          <p className="text-xs text-amber-600 italic truncate">&ldquo;{importedNote}&rdquo; <span className="not-italic font-bold">(dari Heatmap)</span></p>
                        ) : (
                          <p className="text-xs text-slate-300 italic">belum ada catatan</p>
                        )}
                      </div>
                    </div>

                    <ChevronDown className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform print:hidden', isExpanded && 'rotate-180')} />
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-1 space-y-4 print:pb-3">
                      {/* Auto context */}
                      {contextLoading === day ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat konteks invoice...
                        </div>
                      ) : ctx && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Package className="w-3 h-3" /> Konteks Otomatis dari Invoice
                          </p>
                          {ctx.topCollections.length === 0 && ctx.discountReasons.length === 0 && ctx.afterSalesCount === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">Tidak ada data invoice tambahan untuk hari ini.</p>
                          ) : (
                            <>
                              {ctx.topCollections.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className="text-[10px] font-bold text-slate-500">Top Koleksi:</span>
                                  {ctx.topCollections.map(c => (
                                    <span key={c.name} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {c.name} · <Amt value={c.net} short />
                                    </span>
                                  ))}
                                </div>
                              )}
                              {ctx.discountReasons.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Percent className="w-3 h-3" />Diskon:</span>
                                  {ctx.discountReasons.map(r => (
                                    <span key={r.reason} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                                      {r.reason} ({r.count})
                                    </span>
                                  ))}
                                </div>
                              )}
                              {ctx.afterSalesCount > 0 && (
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                                  <HeartHandshake className="w-3.5 h-3.5 text-blue-500" />
                                  {ctx.afterSalesCount} invoice ada catatan after-sales support
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 print:hidden">
                          <Tag className="w-3 h-3" /> Tag Penyebab
                        </p>
                        <div className="flex flex-wrap gap-1.5 print:hidden">
                          {TAG_OPTIONS.map(tag => (
                            <button key={tag} type="button" disabled={!isAdmin}
                              onClick={() => toggleTag(day, tag)}
                              className={cn(
                                'text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all',
                                (draftTags[day] || []).includes(tag)
                                  ? 'bg-slate-900 border-slate-900 text-white'
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50',
                                !isAdmin && 'cursor-not-allowed opacity-70'
                              )}>
                              {tag}
                            </button>
                          ))}
                        </div>
                        {/* Print-only tag display */}
                        {(entry?.tags?.length ?? 0) > 0 && (
                          <div className="hidden print:flex flex-wrap gap-1.5">
                            {entry!.tags.map(t => <span key={t} className="text-[10px] font-bold text-slate-600">#{t}</span>)}
                          </div>
                        )}
                      </div>

                      {/* Note */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5 print:hidden">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan Manager</p>
                          {!entry?.note?.trim() && importedNote && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              Diimpor dari Heatmap Calendar — klik Simpan untuk permanenkan
                            </span>
                          )}
                        </div>
                        {isAdmin ? (
                          <textarea rows={4} maxLength={800} value={draftNote[day] ?? ''}
                            onChange={e => setDraftNote(prev => ({ ...prev, [day]: e.target.value }))}
                            className="w-full bg-white border border-slate-300 rounded-xl p-4 text-sm text-slate-700 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 resize-none outline-none transition-all placeholder:text-slate-400 print:hidden"
                            placeholder="Kenapa sales naik/turun hari ini? Contoh: ada event komunitas, 2 VIP customer datang, promo weekend..."
                          />
                        ) : (
                          <p className="text-sm text-slate-700 leading-relaxed border-l-2 border-slate-300 pl-3 italic print:hidden">
                            {entry?.note?.trim() || importedNote || 'Belum ada catatan untuk hari ini.'}
                          </p>
                        )}
                        {/* Print-only note (serif, formal) */}
                        <p className="hidden print:block text-sm text-slate-800 leading-relaxed font-serif">
                          {entry?.note?.trim() || '—'}
                        </p>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center justify-between pt-1 print:hidden">
                          {entry?.note ? (
                            <button type="button" onClick={() => handleDelete(day)} disabled={saving}
                              className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl transition-all">
                              <Trash2 className="w-3.5 h-3.5" /> Hapus Catatan
                            </button>
                          ) : <div />}
                          <button type="button" onClick={() => handleSave(day)} disabled={saving}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm active:scale-95 disabled:opacity-60">
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Simpan Catatan
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
    </div>
  );
}

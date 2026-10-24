"use client";

import { useState } from 'react';
import { Search, RefreshCw, X, Calendar, User, Phone, Mail, Store, CheckCircle2, ShoppingBag, Eye, ChevronLeft, ChevronRight, Sparkles, Loader2, Layers, UserPlus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MASTER_DATA } from '../masterData';
import { DatePicker } from '@/components/DatePicker';
import styles from '../crm-workspace.module.css';
import explorer from '../traffic-history.module.css';
import Amt from '@/components/Amt';
import { boutiqueDate } from '@/lib/crm-visit';
import { mediaUrl } from '@/lib/media';
import { useTrafficHistory, emptyHistoryFilters, historyPageSize } from '../useTrafficHistory';

export interface IntegratedTrafficItem {
  id: number | string;
  customer_name: string;
  nama_panggilan?: string;
  no_hp?: string;
  email?: string;
  served_by?: string;
  customer_advisor?: string;
  location?: string;
  status?: string;
  prospect_item?: string;
  gross_sales?: number;
  disc_pct?: number;
  net_sales?: number;
  siapa?: string;
  akses_masuk?: string;
  tanggal_berkunjung?: string;
  minat_barang?: string;
  detail_items?: string;
  notes?: string;
  bukti_chat?: string;
  group_size?: number | string;
  faktor_pemicu?: string;
  hasCrmProfile: boolean;
  crmProfile?: {
    id: number | string;
    nama_lengkap: string;
    nama_panggilan?: string;
    no_hp?: string;
    email?: string;
    status_pelanggan?: string;
    customer_advisor?: string;
    lokasi_store?: string;
    pekerjaan?: string;
    etnis?: string;
    hobby?: string;
    warna_favorit?: string;
    fashion_style?: string;
    barang_antusias?: string;
    faktor_pemicu_pembelian?: string;
    foto_customer?: string;
    domisili?: string;
    umur?: string;
    kewarganegaraan?: string;
  } | null;
}

interface TrafficHistoryTableProps {
  onSelectCustomerForProfiling?: (name: string, phone: string, email: string) => void;
}

export function TrafficHistoryTable({ onSelectCustomerForProfiling }: TrafficHistoryTableProps) {
  const { draft, setDraft, result, loading, error, dirty, load } = useTrafficHistory();
  const [detailItem, setDetailItem] = useState<IntegratedTrafficItem | null>(null);
  const trafficList = result?.rows || [];
  const total = result?.total || 0;
  const currentPage = result?.page || 1;
  const pageCount = Math.max(1, Math.ceil(total / historyPageSize));
  const linked = trafficList.filter(row => row.hasCrmProfile).length;
  const pageValue = trafficList.reduce((sum, row) => sum + (Number(row.net_sales) || 0), 0);
  const withValue = trafficList.filter(row => Number(row.net_sales) > 0).length;
  const update = (key: keyof typeof draft, value: string) => setDraft(previous => ({ ...previous, [key]: value }));
  const selectPeriod = (period: 'month' | '30days' | 'all') => {
    const today = boutiqueDate();
    const start = new Date(today + 'T00:00:00Z');
    if (period === 'month') start.setUTCDate(1);
    else start.setUTCDate(start.getUTCDate() - 29);
    setDraft(previous => ({ ...previous, startDate: period === 'all' ? '' : start.toISOString().slice(0, 10), endDate: period === 'all' ? '' : today }));
  };
  const rangeLabel = result ? [result.filters.startDate || 'Beginning', result.filters.endDate || 'Latest'].join(' / ') : 'No period loaded';

  const formatDate = (val?: string) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return val;
    }
  };

  // Status color helpers
  const getStatusBadgeColor = (status?: string) => {
    if (!status) return 'bg-slate-100 text-slate-700 border-slate-200';
    const s = status.toLowerCase();
    if (s.includes('closing') || s.includes('complete') || s.includes('berhasil')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('walk')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('follow')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('repair')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getProspectBadgeColor = (prospect?: string) => {
    if (!prospect) return 'bg-slate-100 text-slate-700';
    const p = prospect.toLowerCase();
    if (p.includes('berhasil')) return 'bg-emerald-100 text-emerald-800 font-bold';
    if (p.includes('gagal')) return 'bg-rose-50 text-rose-700 font-medium';
    if (p.includes('respon')) return 'bg-amber-100 text-amber-800 font-bold';
    if (p.includes('negosiasi')) return 'bg-blue-100 text-blue-800 font-bold';
    return 'bg-slate-100 text-slate-700 font-medium';
  };

  return (
    <div className={cn(styles.history, styles.panelEntry, "space-y-6")}>
      <section className={explorer.controlPanel}>
        <div className={explorer.heading}>
          <div><span className={explorer.eyebrow}><Layers size={14} /> CUSTOMER TIMELINE</span><h2>See the story behind each visit</h2><p>Find a visit, explore product interests and open the customer story.</p></div>
          <span className={explorer.mode}><CheckCircle2 size={14} /> Load on demand</span>
        </div>
        <form onSubmit={event => { event.preventDefault(); void load(); }} className={explorer.filters}>
          <div className={explorer.searchRow}>
            <div className={explorer.search}>
              <Search size={18} />
              <input aria-label="Search visits" placeholder="Search customer, phone, advisor or product interest..." value={draft.query} onChange={event => update('query', event.target.value)} />
              {draft.query && <button type="button" aria-label="Clear search" onClick={() => update('query', '')}><X size={15} /></button>}
            </div>
            <button type="submit" disabled={loading} className={explorer.loadButton}>{loading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}{loading ? 'Loading...' : 'Load visits'}</button>
          </div>
          <div className={explorer.filterGrid}>
            <label>Boutique<select value={draft.store} onChange={event => update('store', event.target.value)}><option value="ALL">All boutiques</option>{MASTER_DATA.stores.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Visit status<select value={draft.status} onChange={event => update('status', event.target.value)}><option value="ALL">All statuses</option>{MASTER_DATA.prospekStatus.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Prospect stage<select value={draft.prospect} onChange={event => update('prospect', event.target.value)}><option value="ALL">All stages</option>{MASTER_DATA.prospekLevel.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <div className={explorer.dateField}><span>From date</span><DatePicker value={draft.startDate} onChange={value => update('startDate', value)} placeholder="Any start date" fromYear={2020} toYear={new Date().getFullYear() + 1} showShortcuts align="left" /></div>
            <div className={explorer.dateField}><span>To date</span><DatePicker value={draft.endDate} onChange={value => update('endDate', value)} placeholder="Any end date" fromYear={2020} toYear={new Date().getFullYear() + 1} showShortcuts align="right" /></div>
          </div>
          <div className={explorer.filterFooter}>
            <div className={explorer.periods}><Calendar size={14} />{[['month', 'This month'], ['30days', 'Last 30 days'], ['all', 'All dates']].map(([period, label]) => <button type="button" key={period} onClick={() => selectPeriod(period as 'month' | '30days' | 'all')}>{label}</button>)}</div>
            <button type="button" className={explorer.reset} onClick={() => setDraft({ ...emptyHistoryFilters })}><X size={13} />Reset filters</button>
          </div>
        </form>
        <div className={cn(explorer.loadStatus, dirty && explorer.pending)} role="status">
          <span>{loading ? 'Loading the requested visits...' : dirty ? 'Filters changed. Click Load visits to apply them.' : result ? 'Loaded ' + result.loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' / ' + rangeLabel : 'Choose your filters, then click Load visits to begin.'}</span>
          {result && <span>{result.filters.store === 'ALL' ? 'All boutiques' : result.filters.store}{result.filters.query ? ' / Search: ' + result.filters.query : ''}{result.filters.status !== 'ALL' ? ' / ' + result.filters.status : ''}{result.filters.prospect !== 'ALL' ? ' / ' + result.filters.prospect : ''}</span>}
        </div>
      </section>
      {error && <div role="alert" className={explorer.error}><AlertCircle size={18} /><div><strong>Unable to load these filters</strong><p>{error}{result ? ' Previously loaded results are still shown.' : ''}</p></div></div>}
      <section className={explorer.metrics} aria-label="Loaded visit summary">
        <article><span><Layers size={16} />Matching visits</span><strong>{result ? total.toLocaleString('en-US') : '—'}</strong><small>All results for loaded filters</small></article>
        <article><span><ShoppingBag size={16} />Recorded visit value</span><strong>{result ? <Amt value={pageValue} compact /> : '—'}</strong><small>IDR / current page only</small></article>
        <article><span><CheckCircle2 size={16} />CRM matched visits</span><strong>{result ? linked : '—'}{result && <em>/ {trafficList.length}</em>}</strong><small>Current page / matched profiles</small></article>
        <article><span><Sparkles size={16} />Visits with value</span><strong>{result ? withValue : '—'}</strong><small>Current page / includes product interests</small></article>
      </section>
      <div className={cn(styles.historyTable, "bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs")}>
        <div className={explorer.tableHeading}><div><h3>Visit history</h3><p>{result ? "Open a visit to explore customer details and notes." : "Your customer timeline will appear here."}</p></div><span>{result ? trafficList.length + " visits on this page" : "Ready when you are"}</span></div>
        <div className={styles.tableScroll} aria-busy={loading} tabIndex={0} role="region" aria-label="Customer visit history">
          <table className="w-full text-left text-xs" style={!result ? { minWidth: 0 } : undefined}>
            <thead hidden={!result} className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Customer / CRM status</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Boutique / Advisor</th>
                <th className="p-4">Status / Prospect</th>
                <th className="p-4">Product interests</th>
                <th className="p-4 text-right">Visit value / IDR</th>
                <th className="p-4 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!result && !loading ? (
                <tr><td colSpan={8} className={explorer.empty}><span><Search size={28} /></span><h3>Start with the visit you want to find</h3><p>Set a boutique, period or customer name above, then select Load visits.</p></td></tr>
              ) : loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="font-semibold">Loading visits and linked profiles...</p>
                  </td>
                </tr>
              ) : trafficList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">No visits match your filters.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try a different search or clear the filters.</p>
                  </td>
                </tr>
              ) : (
                trafficList.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Tanggal */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{formatDate(row.tanggal_berkunjung)}</span>
                    </td>

                    {/* Pengunjung & CRM Status */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">{row.customer_name}</span>
                          {row.nama_panggilan && (
                            <span className="text-[10px] text-slate-400">({row.nama_panggilan})</span>
                          )}
                        </div>
                        <div>
                          {row.hasCrmProfile ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Linked profile ({row.crmProfile?.status_pelanggan || 'Member'})
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              New walk-in
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Kontak */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="space-y-0.5 text-[11px] text-slate-600 font-medium">
                        {row.no_hp && (
                          <div className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {row.no_hp}
                          </div>
                        )}
                        {row.email && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[140px]">{row.email}</span>
                          </div>
                        )}
                        {!row.no_hp && !row.email && <span className="text-slate-300">—</span>}
                      </div>
                    </td>

                    {/* Butik & SA */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <Store className="w-3 h-3 text-slate-400 shrink-0" />
                          {row.location || '—'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>SA: <strong>{row.served_by || row.customer_advisor || '—'}</strong></span>
                        </div>
                      </div>
                    </td>

                    {/* Status & Prospek */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border inline-block', getStatusBadgeColor(row.status))}>
                          {row.status || 'Walk-in'}
                        </span>
                        <div>
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-md inline-block', getProspectBadgeColor(row.prospect_item))}>
                            {row.prospect_item || 'Potensial Baru'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Barang Diminati */}
                    <td className="p-4">
                      <div className="max-w-[180px]">
                        <p className="font-semibold text-slate-800 truncate" title={row.minat_barang || row.detail_items}>
                          {row.minat_barang || row.detail_items || '—'}
                        </p>
                        {row.akses_masuk && (
                          <p className="text-[10px] text-slate-400 truncate">Source: {row.akses_masuk}</p>
                        )}
                      </div>
                    </td>

                    {/* Net Sales */}
                    <td className="p-4 text-right whitespace-nowrap">
                      <span className={cn(
                        "font-black",
                        (row.net_sales || 0) > 0 ? "text-emerald-600" : "text-slate-400"
                      )}>
                        <Amt value={Number(row.net_sales) || 0} />
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDetailItem(row)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail 360°
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination info */}
        <div className={cn(styles.historyFooter, "p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium")}>
          <span>{result ? (trafficList.length ? ((currentPage - 1) * historyPageSize + 1) + '–' + ((currentPage - 1) * historyPageSize + trafficList.length) : '0') + ' of ' + total.toLocaleString('en-US') + ' matching visits' : 'No visits loaded'}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous page" disabled={!result || loading || dirty || currentPage <= 1}
              onClick={() => { if (result) void load(result.filters, currentPage - 1); }}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700">{result ? 'Page ' + currentPage + ' / ' + pageCount : 'Page —'}</span>
            <button
              type="button"
              aria-label="Next page" disabled={!result || loading || dirty || currentPage >= pageCount}
              onClick={() => { if (result) void load(result.filters, currentPage + 1); }}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL DETAIL 360° (VISIT + PROFILING) ── */}
      {detailItem && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5"
          onClick={e => { if (e.target === e.currentTarget) setDetailItem(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-slate-900">
                    {detailItem.customer_name}
                  </h3>
                  {detailItem.nama_panggilan && (
                    <span className="text-xs text-slate-400 font-medium">({detailItem.nama_panggilan})</span>
                  )}
                  {detailItem.hasCrmProfile ? (
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ Terdaftar di CRM ({detailItem.crmProfile?.status_pelanggan || 'VIP'})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-600">
                      Walk-in without a CRM profile
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 font-medium">
                  {detailItem.no_hp && <span className="font-mono">📱 {detailItem.no_hp}</span>}
                  {detailItem.email && <span>✉️ {detailItem.email}</span>}
                  <span>📍 Butik: <strong>{detailItem.location || '—'}</strong></span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-6 flex-1 divide-y divide-slate-100">
              {/* Section 1: Informasi Kunjungan */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> 1. Visit details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Visit date</p>
                    <p className="font-bold text-slate-900 mt-0.5">{formatDate(detailItem.tanggal_berkunjung)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Served By (SA)</p>
                    <p className="font-bold text-slate-900 mt-0.5">{detailItem.served_by || detailItem.customer_advisor || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Visit status</p>
                    <p className="font-bold text-slate-900 mt-0.5">{detailItem.status || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Prospect stage</p>
                    <p className="font-bold text-emerald-700 mt-0.5">{detailItem.prospect_item || '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Product interests</p>
                    <p className="font-bold text-slate-900 mt-0.5">{detailItem.minat_barang || detailItem.detail_items || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Source &amp; segmentation</p>
                    <p className="font-bold text-slate-900 mt-0.5">{detailItem.akses_masuk || detailItem.siapa || '—'}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Recorded visit value</p>
                    <p className="text-base font-black text-emerald-700 mt-0.5">IDR <Amt value={Number(detailItem.net_sales) || 0} /></p>
                  </div>
                </div>

                {detailItem.notes && (
                  <div className="p-3 bg-slate-50 rounded-2xl text-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Visit notes</p>
                    <p className="text-slate-700 font-medium whitespace-pre-wrap">{detailItem.notes}</p>
                  </div>
                )}

                {mediaUrl(detailItem.bukti_chat) && (
                  <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Visit attachment</p>
                    <a href={mediaUrl(detailItem.bukti_chat)!} target="_blank" rel="noreferrer" className="block w-32 h-32 rounded-xl overflow-hidden border border-slate-200">
                      <img src={mediaUrl(detailItem.bukti_chat)!} alt="Chat proof" className="w-full h-full object-cover" />
                    </a>
                  </div>
                )}
              </div>

              {/* Section 2: Integrasi Profil CRM */}
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                    <User className="w-4 h-4" /> 2. Linked customer profile
                  </h4>
                  {detailItem.hasCrmProfile && (
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      Profile ID #{detailItem.crmProfile?.id}
                    </span>
                  )}
                </div>

                {detailItem.hasCrmProfile && detailItem.crmProfile ? (
                  <div className="p-4 bg-gradient-to-br from-blue-50/40 via-white to-slate-50 border border-blue-100 rounded-3xl space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Occupation</p>
                        <p className="font-semibold text-slate-900">{detailItem.crmProfile.pekerjaan || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Residence</p>
                        <p className="font-semibold text-slate-900">{detailItem.crmProfile.domisili || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Nationality / Ethnicity</p>
                        <p className="font-semibold text-slate-900">
                          {detailItem.crmProfile.kewarganegaraan || ''} {detailItem.crmProfile.etnis && `(${detailItem.crmProfile.etnis})`}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-blue-50">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Fashion Style</p>
                        <p className="font-semibold text-slate-900">{detailItem.crmProfile.fashion_style || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Favorite color</p>
                        <p className="font-semibold text-slate-900">{detailItem.crmProfile.warna_favorit || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Interests</p>
                        <p className="font-semibold text-slate-900">{detailItem.crmProfile.hobby || '—'}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-blue-50">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Products / Favorite collections</p>
                      <p className="font-bold text-blue-900">{detailItem.crmProfile.barang_antusias || '—'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-amber-50/60 border border-amber-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-amber-900">This visitor has no linked CRM profile.</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Create a profile to capture their interests and preferences.
                      </p>
                    </div>
                    {onSelectCustomerForProfiling && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCustomerForProfiling(
                            detailItem.customer_name,
                            detailItem.no_hp || '',
                            detailItem.email || ''
                          );
                          setDetailItem(null);
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shrink-0 shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Create CRM profile
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Traffic ID #{detailItem.id}</span>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

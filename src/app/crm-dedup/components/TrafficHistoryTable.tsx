"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Filter, RefreshCw, X, Calendar, User, Phone, Mail, Store,
  CheckCircle2, ShoppingBag, Eye, ArrowUpDown, ChevronLeft, ChevronRight,
  Sparkles, ExternalLink, Loader2, Image as ImageIcon, Heart, Briefcase,
  Layers, UserPlus, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MASTER_DATA } from '../masterData';
import { DatePicker } from '@/components/DatePicker';

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

interface TrafficHistoryMetrics {
  totalRows: number;
  totalNetSales: number;
  crmLinkedCount: number;
  closingCount: number;
}

interface TrafficHistoryTableProps {
  onSelectCustomerForProfiling?: (name: string, phone: string, email: string) => void;
}

export function TrafficHistoryTable({ onSelectCustomerForProfiling }: TrafficHistoryTableProps) {
  const [loading, setLoading] = useState(true);
  const [trafficList, setTrafficList] = useState<IntegratedTrafficItem[]>([]);
  const [metrics, setMetrics] = useState<TrafficHistoryMetrics>({
    totalRows: 0,
    totalNetSales: 0,
    crmLinkedCount: 0,
    closingCount: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedProspect, setSelectedProspect] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 40;

  // Selected item for 360 Detail Modal
  const [detailItem, setDetailItem] = useState<IntegratedTrafficItem | null>(null);

  const fetchTrafficData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'get_integrated_traffic',
        limit: String(pageSize),
        page: String(currentPage),
      });

      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (selectedStore !== 'ALL') params.append('store', selectedStore);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedProspect !== 'ALL') params.append('prospect', selectedProspect);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/crm/dedup?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTrafficList(data.trafficRows || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error('Error fetching integrated traffic:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedStore, selectedStatus, selectedProspect, startDate, endDate, currentPage]);

  useEffect(() => {
    fetchTrafficData();
  }, [fetchTrafficData]);

  // Debounce search
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStore('ALL');
    setSelectedStatus('ALL');
    setSelectedProspect('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const formatCurrency = (val?: number) => {
    if (!val) return 'Rp 0';
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

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
    if (s.includes('repair')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getProspectBadgeColor = (prospect?: string) => {
    if (!prospect) return 'bg-slate-100 text-slate-700';
    const p = prospect.toLowerCase();
    if (p.includes('berhasil')) return 'bg-emerald-100 text-emerald-800 font-bold';
    if (p.includes('gagal')) return 'bg-rose-50 text-rose-700 font-medium';
    if (p.includes('respon')) return 'bg-amber-100 text-amber-800 font-bold';
    if (p.includes('negosiasi')) return 'bg-indigo-100 text-indigo-800 font-bold';
    return 'bg-slate-100 text-slate-700 font-medium';
  };

  return (
    <div className="space-y-6">
      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kunjungan */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Kunjungan Toko</span>
            <p className="text-2xl font-black text-slate-900">{metrics.totalRows.toLocaleString('id-ID')}</p>
            <p className="text-[11px] text-slate-500 font-medium">Record traffic tersimpan</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Net Sales Kunjungan */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Sales dari Traffic</span>
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(metrics.totalNetSales)}</p>
            <p className="text-[11px] text-slate-500 font-medium">Dari {metrics.closingCount} transaksi closing</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Customer Terhubung CRM */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terhubung Profil CRM</span>
            <p className="text-2xl font-black text-purple-600">{metrics.crmLinkedCount.toLocaleString('id-ID')}</p>
            <p className="text-[11px] text-slate-500 font-medium">
              {metrics.totalRows > 0 ? `${Math.round((metrics.crmLinkedCount / metrics.totalRows) * 100)}% terintegrasi` : '0%'}
            </p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Closing Rate */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kunjungan Closing Sales</span>
            <p className="text-2xl font-black text-amber-600">{metrics.closingCount.toLocaleString('id-ID')}</p>
            <p className="text-[11px] text-slate-500 font-medium">Penjualan berhasil dicapai</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: FILTER & PENCARIAN ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama pengunjung, panggilan, nomor HP, SA, atau barang..."
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-slate-800 outline-none font-medium focus:border-blue-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchTrafficData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 transition-all shrink-0"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-blue-600")} />
            Segarkan Data
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Store Filter */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Butik / Store</label>
            <select
              value={selectedStore}
              onChange={e => { setSelectedStore(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="ALL">Semua Store</option>
              {MASTER_DATA.stores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Status Visit Filter */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Status Kunjungan</label>
            <select
              value={selectedStatus}
              onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="ALL">Semua Status</option>
              {MASTER_DATA.prospekStatus.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Tahap Prospek Filter */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Tahap Prospek</label>
            <select
              value={selectedProspect}
              onChange={e => { setSelectedProspect(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="ALL">Semua Prospek</option>
              {MASTER_DATA.prospekLevel.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Dari Tanggal */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Dari Tanggal</label>
            <DatePicker
              value={startDate}
              onChange={val => { setStartDate(val); setCurrentPage(1); }}
              placeholder="Dari tgl..."
              buttonClassName="p-2 text-xs"
              fromYear={2020}
              toYear={new Date().getFullYear() + 1}
              showShortcuts={true}
              align="left"
            />
          </div>

          {/* Sampai Tanggal */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Sampai Tanggal</label>
              <DatePicker
                value={endDate}
                onChange={val => { setEndDate(val); setCurrentPage(1); }}
                placeholder="Sampai tgl..."
                buttonClassName="p-2 text-xs"
                fromYear={2020}
                toYear={new Date().getFullYear() + 1}
                showShortcuts={true}
                align="right"
              />
            </div>
            {(searchQuery || selectedStore !== 'ALL' || selectedStatus !== 'ALL' || selectedProspect !== 'ALL' || startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 shrink-0"
                title="Reset Semua Filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── TABEL DATA KUNJUNGAN & INTEGRASI CRM ── */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Pengunjung &amp; Status CRM</th>
                <th className="p-4">Kontak</th>
                <th className="p-4">Butik &amp; SA</th>
                <th className="p-4">Status &amp; Prospek</th>
                <th className="p-4">Barang Diminati</th>
                <th className="p-4 text-right">Net Sales</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="font-semibold">Memuat riwayat kunjungan &amp; integrasi profil...</p>
                  </td>
                </tr>
              ) : trafficList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">Tidak ada data traffic yang sesuai filter.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
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
                              Profil Terdaftar ({row.crmProfile?.status_pelanggan || 'Member'})
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              Walk-in Baru
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
                          <p className="text-[10px] text-slate-400 truncate">Akses: {row.akses_masuk}</p>
                        )}
                      </div>
                    </td>

                    {/* Net Sales */}
                    <td className="p-4 text-right whitespace-nowrap">
                      <span className={cn(
                        "font-black",
                        (row.net_sales || 0) > 0 ? "text-emerald-600" : "text-slate-400"
                      )}>
                        {formatCurrency(row.net_sales)}
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
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Menampilkan {trafficList.length} dari {metrics.totalRows.toLocaleString('id-ID')} kunjungan</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700">Hal {currentPage}</span>
            <button
              type="button"
              disabled={trafficList.length < pageSize}
              onClick={() => setCurrentPage(prev => prev + 1)}
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
                      Walk-in Belum Terdaftar CRM
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
                  <Calendar className="w-4 h-4" /> 1. DETAIL KUNJUNGAN TOKO
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Kunjungan</p>
                    <p className="font-bold text-slate-900 mt-0.5">{formatDate(detailItem.tanggal_berkunjung)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Served By (SA)</p>
                    <p className="font-bold text-slate-900 mt-0.5">{detailItem.served_by || detailItem.customer_advisor || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Status Visit</p>
                    <p className="font-bold text-slate-900 mt-0.5">{detailItem.status || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tahap Prospek</p>
                    <p className="font-bold text-emerald-700 mt-0.5">{detailItem.prospect_item || '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Kategori Minat / Barang</p>
                    <p className="font-bold text-slate-900 mt-0.5">{detailItem.minat_barang || detailItem.detail_items || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Akses &amp; Segmentasi</p>
                    <p className="font-bold text-slate-900 mt-0.5">{detailItem.akses_masuk || detailItem.siapa || '—'}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Net Sales Closing</p>
                    <p className="text-base font-black text-emerald-700 mt-0.5">{formatCurrency(detailItem.net_sales)}</p>
                  </div>
                </div>

                {detailItem.notes && (
                  <div className="p-3 bg-slate-50 rounded-2xl text-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Catatan Kunjungan</p>
                    <p className="text-slate-700 font-medium whitespace-pre-wrap">{detailItem.notes}</p>
                  </div>
                )}

                {detailItem.bukti_chat && (
                  <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Lampiran / Bukti Kunjungan</p>
                    <div className="w-32 h-32 rounded-xl overflow-hidden border border-slate-200">
                      <img src={detailItem.bukti_chat} alt="Bukti" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Integrasi Profil CRM */}
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-purple-700 uppercase tracking-widest flex items-center gap-1.5">
                    <User className="w-4 h-4" /> 2. DATA PROFILING CRM TERHUBUNG
                  </h4>
                  {detailItem.hasCrmProfile && (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                      Profil ID #{detailItem.crmProfile?.id}
                    </span>
                  )}
                </div>

                {detailItem.hasCrmProfile && detailItem.crmProfile ? (
                  <div className="p-4 bg-gradient-to-br from-purple-50/40 via-white to-slate-50 border border-purple-100 rounded-3xl space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Pekerjaan</p>
                        <p className="font-semibold text-slate-900">{detailItem.crmProfile.pekerjaan || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Domisili</p>
                        <p className="font-semibold text-slate-900">{detailItem.crmProfile.domisili || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Kewarganegaraan / Etnis</p>
                        <p className="font-semibold text-slate-900">
                          {detailItem.crmProfile.kewarganegaraan || ''} {detailItem.crmProfile.etnis && `(${detailItem.crmProfile.etnis})`}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-50">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Fashion Style</p>
                        <p className="font-semibold text-slate-900">{detailItem.crmProfile.fashion_style || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Warna Favorit</p>
                        <p className="font-semibold text-slate-900">{detailItem.crmProfile.warna_favorit || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Hobi</p>
                        <p className="font-semibold text-slate-900">{detailItem.crmProfile.hobby || '—'}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-purple-50">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Barang Antusias / Koleksi Favorit</p>
                      <p className="font-bold text-purple-900">{detailItem.crmProfile.barang_antusias || '—'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-amber-50/60 border border-amber-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-amber-900">Pengunjung ini belum memiliki profil CRM resmi.</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Anda dapat membuat profil CRM lengkap untuk menyimpan hobi, ukuran, dan preferensinya.
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
                        Buat Profil CRM
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
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ContactRound, Search, RefreshCw, X, Phone, Mail, MapPin,
  User, Heart, Briefcase, Globe,
  AtSign, UtensilsCrossed, FileDown, Store,
  ChevronLeft, ChevronRight, Users, Filter,
  ShoppingBag, Calendar, Sparkles, Loader2, Image as ImageIcon,
  CheckCircle2, TrendingUp, ArrowUpRight, Clock, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, type CrmProfilingRow } from '@/services/dashboardService';
import BvlgariLoader from '@/components/BvlgariLoader';

// ── helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const val = (v: string | null | undefined) => (v && v.trim() ? v.trim() : '—');

const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];
const PAGE_SIZE = 24;

// Store abbreviation for badges
const storeBadge = (s: string) => {
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower.includes('indonesia') || lower.includes('intermark') || lower === 'pi') return 'PI';
  if (lower.includes('senayan') || lower.includes('superstore') || lower === 'ps') return 'PS';
  if (lower.includes('bali')) return 'Bali';
  return s.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
};

const storeBadgeColor = (s: string) => {
  const ab = storeBadge(s);
  if (ab === 'PI')   return 'bg-blue-50 text-blue-700 border-blue-200';
  if (ab === 'PS')   return 'bg-violet-50 text-violet-700 border-violet-200';
  if (ab === 'Bali') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
};

// Initials avatar
function Avatar({ name, store }: { name: string; store: string }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const colors: Record<string, string> = {
    PI:   'from-blue-500 to-blue-700',
    PS:   'from-violet-500 to-violet-700',
    Bali: 'from-emerald-500 to-emerald-700',
  };
  const grad = colors[storeBadge(store)] ?? 'from-slate-400 to-slate-600';
  return (
    <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black text-lg shrink-0', grad)}>
      {initials}
    </div>
  );
}

// ── Profile Card ─────────────────────────────────────────────────────────────

function ProfileCard({ row, onClick }: { row: CrmProfilingRow; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={row.nama_lengkap || row.nama_depan} store={row.lokasi_store} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-tight truncate">
            {row.full_name_tittle || row.nama_lengkap || `${row.nama_depan} ${row.nama_belakang}`.trim() || '—'}
          </p>
          {row.nama_panggilan && (
            <p className="text-[11px] text-slate-400 truncate">Panggilan: {row.nama_panggilan}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full border', storeBadgeColor(row.lokasi_store))}>
              {storeBadge(row.lokasi_store) || row.lokasi_store || '—'}
            </span>
            {row.status_pelanggan && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {row.status_pelanggan}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 text-[11px] text-slate-500">
        {row.no_hp && (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{row.no_hp}</span>
          </div>
        )}
        {row.customer_advisor && (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{row.customer_advisor}</span>
          </div>
        )}
        {row.pekerjaan && (
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{row.pekerjaan}</span>
          </div>
        )}
        {row.hobby && (
          <div className="flex items-center gap-1.5">
            <Heart className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{row.hobby}</span>
          </div>
        )}
      </div>

      {/* Interest chips */}
      <div className="flex flex-wrap gap-1 mt-3">
        {row.warna_favorit && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{row.warna_favorit}</span>
        )}
        {row.fashion_style && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{row.fashion_style}</span>
        )}
        {row.barang_antusias && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{row.barang_antusias}</span>
        )}
      </div>
    </button>
  );
}

// ── Profile Detail Modal ──────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pl-8">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value: v }: { label: string; value: string | null | undefined }) {
  const display = val(v);
  return (
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={cn('text-xs font-medium', display === '—' ? 'text-slate-300' : 'text-slate-800')}>{display}</p>
    </div>
  );
}

interface CustomerHistoryTraffic {
  id: number | string;
  tanggal_berkunjung?: string;
  location?: string;
  served_by?: string;
  customer_advisor?: string;
  status?: string;
  prospect_item?: string;
  minat_barang?: string;
  detail_items?: string;
  gross_sales?: number;
  disc_pct?: number;
  net_sales?: number;
  notes?: string;
  bukti_chat?: string;
  siapa?: string;
  akses_masuk?: string;
}

interface CustomerHistorySales {
  id: number | string;
  doc_date?: string;
  doc_num?: string;
  store?: string;
  item_code?: string;
  item_name?: string;
  product_line?: string;
  collection?: string;
  qty?: number;
  net_sales?: number;
}

interface CustomerHistoryData {
  summary: {
    totalVisits: number;
    totalSalesTransactions: number;
    totalLifetimeSales: number;
    lastVisitDate: string | null;
    topCollections: (string | { name: string; spend: number })[];
  };
  trafficVisits: CustomerHistoryTraffic[];
  salesTransactions: CustomerHistorySales[];
}

function ProfileModal({ row, onClose }: { row: CrmProfilingRow; onClose: () => void }) {
  const [modalTab, setModalTab] = useState<'profile' | 'traffic' | 'sales'>('profile');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyData, setHistoryData] = useState<CustomerHistoryData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fullName = row.full_name_tittle || row.nama_lengkap || `${row.nama_depan || ''} ${row.nama_belakang || ''}`.trim() || '—';

  useEffect(() => {
    let isMounted = true;
    const fetchCustomerHistory = async () => {
      setHistoryLoading(true);
      try {
        const params = new URLSearchParams({
          action: 'get_customer_history',
          name: fullName !== '—' ? fullName : (row.nama_lengkap || ''),
          phone: row.no_hp || '',
          email: row.email || '',
        });
        const res = await fetch(`/api/crm/dedup?${params.toString()}`);
        const data = await res.json();
        if (isMounted && data.success) {
          setHistoryData(data);
        }
      } catch (err) {
        console.error('Failed to fetch customer 360 history:', err);
      } finally {
        if (isMounted) setHistoryLoading(false);
      }
    };

    fetchCustomerHistory();
    return () => {
      isMounted = false;
    };
  }, [row, fullName]);

  const getTrafficStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('closing')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('prospect')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('browsing')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const visitsCount = historyData?.summary.totalVisits ?? 0;
  const salesCount = historyData?.summary.totalSalesTransactions ?? 0;
  const lifetimeSales = historyData?.summary.totalLifetimeSales ?? 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="p-6 border-b border-slate-100 shrink-0 space-y-4">
            <div className="flex items-start gap-4">
              <Avatar name={row.nama_lengkap || row.nama_depan} store={row.lokasi_store} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 leading-tight">
                    {fullName}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">
                    ID #{row.id}
                  </span>
                </div>
                {row.nama_panggilan && (
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">Panggilan: {row.nama_panggilan}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={cn('text-[10px] font-black px-2.5 py-0.5 rounded-full border', storeBadgeColor(row.lokasi_store))}>
                    {storeBadge(row.lokasi_store) || row.lokasi_store || '—'}
                  </span>
                  {row.status_pelanggan && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {row.status_pelanggan}
                    </span>
                  )}
                  {row.kewarganegaraan && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {row.kewarganegaraan}
                    </span>
                  )}
                  {row.customer_advisor && (
                    <span className="text-[10px] font-medium text-slate-400">
                      CA: <span className="font-bold text-slate-600">{row.customer_advisor}</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                title="Tutup"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer 360° Summary KPI Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kunjungan Toko</p>
                  <p className="text-sm font-black text-slate-900">
                    {historyLoading ? (
                      <span className="inline-block w-8 h-4 bg-slate-200 animate-pulse rounded" />
                    ) : (
                      `${visitsCount} kali`
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Belanja (POS)</p>
                  <p className="text-sm font-black text-emerald-700 truncate">
                    {historyLoading ? (
                      <span className="inline-block w-16 h-4 bg-slate-200 animate-pulse rounded" />
                    ) : (
                      `Rp ${lifetimeSales.toLocaleString('id-ID')}`
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kunjungan Terakhir</p>
                  <p className="text-xs font-black text-slate-900 truncate">
                    {historyLoading ? (
                      <span className="inline-block w-14 h-4 bg-slate-200 animate-pulse rounded" />
                    ) : (
                      fmtDate(historyData?.summary.lastVisitDate ?? null)
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Tabs Header */}
            <div className="flex items-center gap-2 border-b border-slate-200 pt-1">
              <button
                type="button"
                onClick={() => setModalTab('profile')}
                className={cn(
                  'flex items-center gap-2 pb-2.5 px-3 text-xs font-bold transition-all border-b-2 -mb-px',
                  modalTab === 'profile'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                )}
              >
                <User className="w-3.5 h-3.5" />
                Profil & Preferensi
              </button>

              <button
                type="button"
                onClick={() => setModalTab('traffic')}
                className={cn(
                  'flex items-center gap-2 pb-2.5 px-3 text-xs font-bold transition-all border-b-2 -mb-px',
                  modalTab === 'traffic'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                )}
              >
                <Store className="w-3.5 h-3.5" />
                Riwayat Kunjungan Toko
                <span className={cn(
                  'text-[10px] font-black px-1.5 py-0.2 rounded-full',
                  modalTab === 'traffic' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                )}>
                  {visitsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('sales')}
                className={cn(
                  'flex items-center gap-2 pb-2.5 px-3 text-xs font-bold transition-all border-b-2 -mb-px',
                  modalTab === 'sales'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                )}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Riwayat Transaksi POS
                <span className={cn(
                  'text-[10px] font-black px-1.5 py-0.2 rounded-full',
                  modalTab === 'sales' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                )}>
                  {salesCount}
                </span>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
            {/* ── TAB 1: PROFIL & PREFERENSI ── */}
            {modalTab === 'profile' && (
              <div className="space-y-6">
                {/* Contact */}
                <Section title="Kontak & Identitas" icon={Phone}>
                  <Field label="No. HP" value={row.no_hp} />
                  <Field label="Email" value={row.email} />
                  <Field label="KTP / Passport" value={row.ktp_passport} />
                  <Field label="Customer Advisor" value={row.customer_advisor} />
                  <Field label="Tanggal Lahir" value={fmtDate(row.tanggal_lahir)} />
                  <Field label="Umur" value={row.umur} />
                  <Field label="Tanggal Input" value={fmtDate(row.tanggal_input)} />
                  <Field label="Lokasi Store" value={row.lokasi_store} />
                </Section>

                {/* Demografi */}
                <Section title="Demografi" icon={Globe}>
                  <Field label="Domisili" value={row.domisili} />
                  <Field label="Domisili LN" value={row.domisili_luar_negeri} />
                  <Field label="Etnis" value={row.etnis} />
                  <Field label="Agama" value={row.agama} />
                  <Field label="Kewarganegaraan" value={row.kewarganegaraan} />
                </Section>

                {/* Pekerjaan & Lifestyle */}
                <Section title="Pekerjaan & Lifestyle" icon={Briefcase}>
                  <Field label="Pekerjaan" value={row.pekerjaan} />
                  <Field label="Fashion Style" value={row.fashion_style} />
                  <Field label="Bentuk Tubuh" value={row.bentuk_tubuh} />
                  <Field label="Tinggi Badan" value={row.tinggi_badan} />
                  <Field label="Warna Favorit" value={row.warna_favorit} />
                </Section>

                {/* Makanan & Minuman */}
                <Section title="Makanan & Minuman" icon={UtensilsCrossed}>
                  <Field label="Cake Favorit" value={row.cake_favorit} />
                  <Field label="Makanan Favorit" value={row.makanan_favorit} />
                  <Field label="Minuman Favorit" value={row.minuman_favorit} />
                  <Field label="Alergi Makanan" value={row.alergi_makanan} />
                </Section>

                {/* Hobby & Interests */}
                <Section title="Hobby & Minat" icon={Heart}>
                  <Field label="Hobby" value={row.hobby} />
                  <Field label="Kategori Hobby" value={row.hobby_kategori} />
                  <Field label="Sub Hobby" value={row.hobby_sub} />
                  <Field label="Hobby Lainnya" value={row.hobby_others} />
                  <Field label="Tempat Liburan" value={row.tempat_liburan_favorit} />
                  <Field label="Topik Favorit" value={row.topik_pembicaraan_favorit} />
                </Section>

                {/* Keluarga */}
                <Section title="Keluarga" icon={Users}>
                  <Field label="Status Pernikahan" value={row.status_pernikahan} />
                  <Field label="Tanggal Pernikahan" value={fmtDate(row.tanggal_pernikahan)} />
                  <Field label="Memiliki Anak" value={row.memiliki_anak} />
                  <Field label="Jumlah Anak" value={row.jumlah_anak} />
                </Section>

                {/* Sosmed & Karakter */}
                <Section title="Sosmed & Karakter" icon={AtSign}>
                  <Field label="Instagram" value={row.instagram} />
                  <Field label="TikTok" value={row.tiktok} />
                  <Field label="Karakter" value={row.karakter} />
                  <Field label="Faktor Pemicu Beli" value={row.faktor_pemicu_pembelian} />
                  <Field label="Barang Antusias" value={row.barang_antusias} />
                </Section>
              </div>
            )}

            {/* ── TAB 2: RIWAYAT KUNJUNGAN TOKO ── */}
            {modalTab === 'traffic' && (
              <div>
                {historyLoading ? (
                  <div className="py-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-xs font-medium">Memuat riwayat kunjungan toko...</p>
                  </div>
                ) : !historyData?.trafficVisits || historyData.trafficVisits.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Store className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Belum Ada Riwayat Kunjungan</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Pelanggan ini belum memiliki catatan kedatangan di database boutique traffic.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-700">
                        Total {historyData.trafficVisits.length} Kunjungan Tercatat
                      </p>
                      <span className="text-[11px] text-slate-400">Diurutkan dari kunjungan terbaru</span>
                    </div>

                    <div className="space-y-3">
                      {historyData.trafficVisits.map((visit, vIdx) => (
                        <div
                          key={visit.id || vIdx}
                          className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-4 shadow-sm transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                {fmtDate(visit.tanggal_berkunjung || null)}
                              </span>
                              <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', storeBadgeColor(visit.location || ''))}>
                                {visit.location || 'Store —'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {visit.status && (
                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', getTrafficStatusBadge(visit.status))}>
                                  {visit.status}
                                </span>
                              )}
                              {visit.prospect_item && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  {visit.prospect_item}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Sales Advisor</p>
                              <p className="font-semibold text-slate-800">{visit.served_by || visit.customer_advisor || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Minat / Koleksi</p>
                              <p className="font-semibold text-slate-800">{visit.minat_barang || visit.detail_items || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Net Sales Closing</p>
                              <p className={cn(
                                'font-black',
                                (visit.net_sales || 0) > 0 ? 'text-emerald-700' : 'text-slate-400'
                              )}>
                                {(visit.net_sales || 0) > 0 ? `Rp ${Number(visit.net_sales).toLocaleString('id-ID')}` : 'Rp 0'}
                              </p>
                            </div>
                          </div>

                          {(visit.notes || visit.siapa || visit.bukti_chat) && (
                            <div className="pt-2 border-t border-slate-100 flex items-start justify-between gap-4 text-xs">
                              <div className="space-y-1 flex-1">
                                {visit.notes && (
                                  <p className="text-slate-600 italic">
                                    &ldquo;{visit.notes}&rdquo;
                                  </p>
                                )}
                                {visit.siapa && (
                                  <p className="text-[10px] text-slate-400">
                                    Berkunjung bersama: <span className="font-medium text-slate-600">{visit.siapa}</span>
                                  </p>
                                )}
                              </div>

                              {visit.bukti_chat && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(visit.bukti_chat || null)}
                                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shrink-0"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  Bukti Chat
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 3: RIWAYAT TRANSAKSI POS ── */}
            {modalTab === 'sales' && (
              <div>
                {historyLoading ? (
                  <div className="py-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-xs font-medium">Memuat riwayat transaksi POS...</p>
                  </div>
                ) : !historyData?.salesTransactions || historyData.salesTransactions.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <ShoppingBag className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Belum Ada Transaksi POS</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Tidak ditemukan riwayat faktur penjualan POS di database clean_master atas nama pelanggan ini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Top Collections Chips */}
                    {historyData.summary.topCollections && historyData.summary.topCollections.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Koleksi Favorit:
                        </span>
                        {historyData.summary.topCollections.map((col, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-xs font-black px-2.5 py-1 bg-white border border-slate-200 text-slate-800 rounded-xl shadow-xs"
                          >
                            {typeof col === 'string' ? col : col.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sales Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="p-3">Tanggal</th>
                              <th className="p-3">No. Faktur</th>
                              <th className="p-3">Boutique</th>
                              <th className="p-3">Koleksi / Line</th>
                              <th className="p-3">Deskripsi Produk</th>
                              <th className="p-3 text-center">Qty</th>
                              <th className="p-3 text-right">Net Sales</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {historyData.salesTransactions.map((tx, tIdx) => (
                              <tr key={tx.id || tIdx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                                  {fmtDate(tx.doc_date || null)}
                                </td>
                                <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                                  {tx.doc_num || '—'}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', storeBadgeColor(tx.store || ''))}>
                                    {tx.store || '—'}
                                  </span>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className="font-bold text-slate-900">{tx.collection || '—'}</span>
                                  {tx.product_line && (
                                    <span className="text-[10px] text-slate-400 block">{tx.product_line}</span>
                                  )}
                                </td>
                                <td className="p-3 max-w-[200px] truncate" title={tx.item_name || ''}>
                                  <span className="text-slate-900 font-semibold block truncate">{tx.item_name || '—'}</span>
                                  {tx.item_code && <span className="text-[10px] font-mono text-slate-400">{tx.item_code}</span>}
                                </td>
                                <td className="p-3 text-center font-bold text-slate-800">
                                  {tx.qty ?? 1}
                                </td>
                                <td className="p-3 text-right font-black text-emerald-700 whitespace-nowrap">
                                  Rp {(tx.net_sales || 0).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900 text-xs">
                            <tr>
                              <td colSpan={5} className="p-3 text-right uppercase tracking-wider text-[10px] font-black text-slate-500">
                                Total Lifetime Net Sales:
                              </td>
                              <td className="p-3 text-center font-black">
                                {historyData.salesTransactions.reduce((sum, item) => sum + (item.qty || 1), 0)}
                              </td>
                              <td className="p-3 text-right font-black text-emerald-700 text-sm">
                                Rp {lifetimeSales.toLocaleString('id-ID')}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <p className="text-[10px] text-slate-400">
              ID #{row.id} · Dibuat {fmtDate(row.created_at)} · Diperbarui {fmtDate(row.updated_at)}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Integrated Bvlgari CRM 360°
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-900/60 text-white flex items-center justify-center hover:bg-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImage}
              alt="Bukti Chat"
              className="w-full h-full object-contain rounded-xl max-h-[80vh]"
            />
          </div>
        </div>
      )}
    </>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className={cn('bg-white border rounded-2xl p-4 shadow-sm', `border-l-4 ${accent}`)}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', accent.replace('border-l-', 'bg-').replace('-600', '-50').replace('-500', '-50'))}>
          <Icon className={cn('w-4 h-4', accent.replace('border-l-', 'text-').replace('-50', ''))} />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CrmProfilingPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows]       = useState<CrmProfilingRow[]>([]);
  const [search, setSearch]   = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [selected, setSelected] = useState<CrmProfilingRow | null>(null);
  const [page, setPage]       = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getCrmProfiling('', '');
      setRows(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filterStore]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      if (filterStore && !r.lokasi_store?.toLowerCase().includes(filterStore.toLowerCase())) return false;
      if (q && !r.nama_lengkap?.toLowerCase().includes(q)
            && !r.nama_panggilan?.toLowerCase().includes(q)
            && !r.no_hp?.includes(q)
            && !r.customer_advisor?.toLowerCase().includes(q)
            && !r.email?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, filterStore]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPI breakdown
  const byStore = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      const k = storeBadge(r.lokasi_store) || r.lokasi_store || 'Unknown';
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [rows]);

  const exportCsv = () => {
    const q = (v: string | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'Nama Lengkap','Title','Panggilan','Store','CA','No HP','Email',
      'Tanggal Lahir','Umur','Status Pelanggan','Domisili','Etnis','Agama','Kewarganegaraan',
      'Pekerjaan','Fashion Style','Bentuk Tubuh','Tinggi','Warna Favorit',
      'Cake','Makanan','Minuman','Alergi','Hobby','Kat. Hobby','Tempat Liburan',
      'Status Nikah','Anak','Jumlah Anak','Instagram','TikTok',
      'Karakter','Barang Antusias','Faktor Pemicu','Tanggal Input',
    ];
    const csvRows = filtered.map(r => [
      q(r.full_name_tittle || r.nama_lengkap), q(r.title), q(r.nama_panggilan),
      q(r.lokasi_store), q(r.customer_advisor), q(r.no_hp), q(r.email),
      q(fmtDate(r.tanggal_lahir)), q(r.umur), q(r.status_pelanggan),
      q(r.domisili), q(r.etnis), q(r.agama), q(r.kewarganegaraan),
      q(r.pekerjaan), q(r.fashion_style), q(r.bentuk_tubuh), q(r.tinggi_badan), q(r.warna_favorit),
      q(r.cake_favorit), q(r.makanan_favorit), q(r.minuman_favorit), q(r.alergi_makanan),
      q(r.hobby), q(r.hobby_kategori), q(r.tempat_liburan_favorit),
      q(r.status_pernikahan), q(r.memiliki_anak), q(r.jumlah_anak),
      q(r.instagram), q(r.tiktok),
      q(r.karakter), q(r.barang_antusias), q(r.faktor_pemicu_pembelian),
      q(fmtDate(r.tanggal_input)),
    ].join(','));
    const csv = '﻿' + [headers.join(','), ...csvRows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'CRM_Profiling.csv';
    a.click();
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <BvlgariLoader />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ContactRound className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CRM Profiling</h1>
          </div>
          <p className="text-slate-500 text-sm">
            {rows.length.toLocaleString()} profil pelanggan tersimpan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <a
            href="/crm_profiling_export.xlsx"
            download="CRM_Profiling_Tier_Export.xlsx"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Download Custom Excel</span>
            <span className="sm:hidden">Excel Custom</span>
          </a>
        </div>
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <ContactRound className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-bold text-sm mb-1">Belum ada data profiling</p>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            Jalankan SQL <code className="bg-slate-100 px-1 rounded">create_crm_profiling.sql</code> di Supabase,
            lalu sync data dari GAS AppSheet Profiling form.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Total Profil"
              value={rows.length.toLocaleString()}
              sub={`${filtered.length} setelah filter`}
              icon={ContactRound}
              accent="border-l-blue-600"
            />
            {Object.entries(byStore).map(([store, count]) => (
              <KpiCard
                key={store}
                label={`Store ${store}`}
                value={count.toLocaleString()}
                sub={`${((count / rows.length) * 100).toFixed(1)}% dari total`}
                icon={Store}
                accent={
                  store === 'PI'   ? 'border-l-blue-500' :
                  store === 'PS'   ? 'border-l-violet-500' :
                  store === 'Bali' ? 'border-l-emerald-500' :
                  'border-l-slate-400'
                }
              />
            ))}
          </div>

          {/* Search + Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Cari nama, nomor HP, email, atau CA..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
                />
                {search && (
                  <button type="button" title="Hapus pencarian" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  aria-label="Filter store"
                  value={filterStore}
                  onChange={e => setFilterStore(e.target.value)}
                  className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
                >
                  <option value="">Semua Store</option>
                  {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
                <span className="font-bold text-slate-700">{filtered.length}</span> profil ditemukan
              </div>
            </div>
          </div>

          {/* Profile Grid */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold text-sm">Tidak ada profil yang cocok</p>
              <p className="text-slate-400 text-xs mt-1">Coba ubah kata kunci atau filter</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {paged.map(row => (
                  <ProfileCard key={row.id} row={row} onClick={() => setSelected(row)} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    title="Halaman sebelumnya"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let p = i + 1;
                    if (totalPages > 7) {
                      if (page <= 4) p = i + 1;
                      else if (page >= totalPages - 3) p = totalPages - 6 + i;
                      else p = page - 3 + i;
                    }
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-xs font-bold border transition-all',
                          p === page
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    title="Halaman berikutnya"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-400 ml-1">
                    Hal {page} / {totalPages}
                  </span>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Profile Detail Modal */}
      {selected && (
        <ProfileModal row={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

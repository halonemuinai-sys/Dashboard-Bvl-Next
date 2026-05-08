"use client";

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Search, X, ChevronLeft, Printer, User, Diamond,
  Phone, Mail, MapPin, Briefcase, Heart, Calendar,
  TrendingUp, ShoppingBag, Star, ArrowLeft, Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, type CrmProfilingRow } from '@/services/dashboardService';
import BvlgariLoader from '@/components/BvlgariLoader';

// ── Types ─────────────────────────────────────────────────────────────────────

type Purchase = {
  trans_no: string; transaction_date: string; customer: string;
  location: string; net_sales: number; gross_sales: number;
  sap_code: string; collection: string; main_category: string;
  qty: number; catalogue_code: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtCur = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString('id-ID');

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const val = (v: string | null | undefined, fallback = '—') =>
  v && v.trim() ? v.trim() : fallback;

const storeBadge = (s: string) => {
  if (!s) return s;
  if (s.includes('Intermark') || s.toLowerCase() === 'pi') return 'Plaza Indonesia';
  if (s.includes('Superstore') || s.toLowerCase() === 'ps') return 'Plaza Senayan';
  return s;
};

// ── Search Result Card ────────────────────────────────────────────────────────

function SearchCard({ row, onSelect }: { row: CrmProfilingRow; onSelect: () => void }) {
  const fullName = row.full_name_tittle || row.nama_lengkap ||
    `${row.nama_depan} ${row.nama_belakang}`.trim();
  const initials = fullName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-amber-300 hover:shadow-md transition-all text-left group"
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black text-lg shrink-0">
        {initials || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 truncate">{fullName}</p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
          {row.no_hp && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{row.no_hp}</span>}
          {row.lokasi_store && <span className="flex items-center gap-1"><Store className="w-3 h-3" />{row.lokasi_store}</span>}
          {row.customer_advisor && <span className="flex items-center gap-1"><User className="w-3 h-3" />{row.customer_advisor}</span>}
        </div>
      </div>
      <span className="text-amber-500 group-hover:translate-x-1 transition-transform text-sm font-bold">View →</span>
    </button>
  );
}

// ── Document Section Header ───────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center my-4">
      <h3 className="text-sm font-black tracking-[0.2em] text-slate-800 uppercase">{title}</h3>
      <div className="flex items-center gap-2 mt-0.5">
        <div className="h-px w-24 bg-amber-400" />
        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
        <div className="h-px w-24 bg-amber-400" />
      </div>
    </div>
  );
}

// ── Profile Row (label + value) ───────────────────────────────────────────────

function ProfileRow({ label, value: v, span }: { label: string; value?: string | null; span?: boolean }) {
  return (
    <div className={cn("flex gap-2 py-1 border-b border-slate-100 text-[11px]", span && "col-span-2")}>
      <span className="font-bold text-slate-500 uppercase tracking-wide shrink-0 w-40">{label}:</span>
      <span className="text-slate-800">{val(v)}</span>
    </div>
  );
}

// ── Important Purchase Card ───────────────────────────────────────────────────

function PurchaseCard({ purchase, rank }: { purchase: Purchase; rank: number }) {
  return (
    <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black tracking-widest text-amber-700 uppercase">Important Purchase #{rank}</span>
        <span className="text-xs font-black text-slate-900">{fmtCur(purchase.net_sales)}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        <div className="text-slate-500">DATE: <span className="text-slate-800 font-medium">{fmtDate(purchase.transaction_date)}</span></div>
        <div className="text-slate-500">STORE/EVENT: <span className="text-slate-800 font-medium">{purchase.location}</span></div>
        <div className="text-slate-500">SAP CODE: <span className="text-slate-800 font-medium">{purchase.sap_code || '—'}</span></div>
        <div className="text-slate-500">QTY: <span className="text-slate-800 font-medium">{purchase.qty}</span></div>
      </div>
      {purchase.catalogue_code && (
        <div className="mt-1.5 text-[10px] text-slate-500">
          DESCRIPTION: <span className="text-slate-800 font-medium">{purchase.catalogue_code}</span>
        </div>
      )}
      {purchase.collection && (
        <div className="text-[10px] text-slate-500">
          COLLECTION: <span className="text-slate-800 font-medium">{purchase.collection}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Event Selling Plan Document ─────────────────────────────────────────

function SellingPlanDocument({
  profile, purchases, onBack
}: {
  profile: CrmProfilingRow;
  purchases: Purchase[];
  onBack: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const fullName = profile.full_name_tittle || profile.nama_lengkap ||
    `${profile.nama_depan} ${profile.nama_belakang}`.trim();
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Stats from purchase history
  const totalSpend    = purchases.reduce((s, p) => s + p.net_sales, 0);
  const highestTicket = purchases.length > 0 ? purchases[0].net_sales : 0;
  const lastPurchase  = purchases.find(p => p.transaction_date);
  const firstYear     = purchases.length > 0
    ? Math.min(...purchases.map(p => new Date(p.transaction_date).getFullYear()).filter(y => !isNaN(y)))
    : null;
  const topPurchases  = purchases.slice(0, 3);

  // Recent purchases (for history table)
  const recentByDate = [...purchases].sort((a, b) =>
    new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
  ).slice(0, 20);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4 pb-10">
      {/* Top Action Bar — hidden in print */}
      <div className="esp-action-bar flex items-center justify-between">
        <button
          type="button"
          title="Kembali ke pencarian"
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-medium shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <button
          type="button"
          title="Print / Export PDF"
          onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-bold shadow-sm"
        >
          <Printer className="w-4 h-4" /> Print / PDF
        </button>
      </div>

      {/* ── DOCUMENT ── */}
      <div ref={printRef} className="esp-document bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* ══ DOCUMENT HEADER ══ */}
        <div className="esp-section border-b-2 border-amber-400 p-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Client Info Grid */}
            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
              <div className="flex gap-2">
                <span className="font-black text-slate-500 uppercase tracking-wide w-32 shrink-0">Country/Store:</span>
                <span className="font-bold text-slate-800">{storeBadge(profile.lokasi_store) || 'Indonesia'}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-black text-slate-500 uppercase tracking-wide w-32 shrink-0">Client Name:</span>
                <span className="font-bold text-slate-800">{fullName}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-black text-slate-500 uppercase tracking-wide w-32 shrink-0">Client Segment:</span>
                <span className="font-bold text-slate-800">{val(profile.status_pelanggan)}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-black text-slate-500 uppercase tracking-wide w-32 shrink-0">Client Potential:</span>
                <span className="font-bold text-slate-800">
                  {totalSpend > 0 ? `${fmtCur(totalSpend)} IDR (Lifetime)` : '—'}
                </span>
              </div>
              <div className="flex gap-2 col-span-2">
                <span className="font-black text-slate-500 uppercase tracking-wide w-32 shrink-0">Appointment Date:</span>
                <span className="font-bold text-slate-800">{today}</span>
              </div>
            </div>

            {/* Center: Bvlgari Branding */}
            <div className="flex flex-col items-center shrink-0 px-4">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Diamond className="w-4 h-4 text-blue-600" />
                <span className="text-xl font-black tracking-[0.3em] text-slate-900">BVLGARI</span>
              </div>
              <span className="text-[9px] font-bold tracking-[0.2em] text-slate-500 mb-2">ROMA</span>
              <div className="h-px w-32 bg-amber-400 mb-2" />
              <p className="text-[11px] font-black tracking-[0.15em] text-slate-700 uppercase">Event Selling Plan</p>
            </div>

            {/* Right: Client Avatar */}
            <div className="shrink-0">
              <div className="w-20 h-24 border-2 border-amber-400 rounded-lg bg-gradient-to-br from-amber-50 to-slate-100 flex flex-col items-center justify-center gap-1">
                <User className="w-8 h-8 text-amber-300" />
                <span className="text-[9px] text-slate-400 font-medium">Photo</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══ CLIENT PROFILE ══ */}
        <div className="esp-section p-5 border-b border-slate-200">
          <SectionHeader title="Client Profile" />

          <div className="grid grid-cols-2 gap-8">
            {/* CLIENT Column */}
            <div>
              <p className="text-[10px] font-black tracking-[0.2em] text-slate-600 uppercase border-b-2 border-amber-400 pb-1 mb-2">Client</p>
              <div className="space-y-0">
                <ProfileRow label="Salutation"              value={profile.title} />
                <ProfileRow label="Name and Surname"        value={profile.full_name_tittle || profile.nama_lengkap} />
                <ProfileRow label="Preferred Name"          value={profile.nama_panggilan} />
                <ProfileRow label="Age"                     value={profile.umur} />
                <ProfileRow label="City / Country"          value={profile.domisili && profile.kewarganegaraan ? `${profile.domisili}, ${profile.kewarganegaraan}` : profile.domisili || profile.kewarganegaraan} />
                <ProfileRow label="Spoken Language"         value={profile.kewarganegaraan === 'Indonesia' ? 'Indonesian / English' : profile.kewarganegaraan} />
                <ProfileRow label="CRM ID"                  value={profile.no_hp} />
                <ProfileRow label="Fortune Type"            value={profile.status_pelanggan} />
                <ProfileRow label="Family Status"           value={profile.status_pernikahan} />
                <ProfileRow label="Hobbies"                 value={profile.hobby} />
                <ProfileRow label="Lifestyle"               value={[profile.fashion_style, profile.karakter].filter(Boolean).join(' · ')} />
              </div>
            </div>

            {/* GUEST Column */}
            <div>
              <p className="text-[10px] font-black tracking-[0.2em] text-slate-600 uppercase border-b-2 border-slate-200 pb-1 mb-2">Client&apos;s Guest</p>
              <div className="space-y-0">
                {(['Salutation','Name and Surname','Preferred Name','Age','City / Country','Spoken Language','CRM ID','Fortune Type','Family Status','Hobbies','Lifestyle'] as const).map(label => (
                  <div key={label} className="flex gap-2 py-1 border-b border-slate-100 text-[11px]">
                    <span className="font-bold text-slate-300 uppercase tracking-wide shrink-0 w-40">{label}:</span>
                    <span className="text-slate-300">—</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="mt-3 pt-2 border-t border-slate-200 grid grid-cols-2 gap-x-8 text-[11px]">
            <div className="flex gap-2 py-1">
              <span className="font-black text-slate-500 uppercase tracking-wide w-40 shrink-0">Relation to Guest:</span>
              <span className="text-slate-800">—</span>
            </div>
            <div />
            <div className="flex gap-2 py-1">
              <span className="font-black text-slate-500 uppercase tracking-wide w-40 shrink-0">Attached Store:</span>
              <span className="font-bold text-slate-800">{storeBadge(profile.lokasi_store) || '—'}</span>
            </div>
            <div className="flex gap-2 py-1">
              <span className="font-black text-slate-500 uppercase tracking-wide w-44 shrink-0">Attached Client Advisor:</span>
              <span className="font-bold text-slate-800">{val(profile.customer_advisor)}</span>
            </div>
          </div>
        </div>

        {/* ══ PURCHASING BEHAVIOR ══ */}
        <div className="esp-section p-5 border-b border-slate-200">
          <SectionHeader title="Purchasing Behavior" />

          <div className="grid grid-cols-2 gap-8">
            {/* Left: Stats */}
            <div className="space-y-0">
              <ProfileRow label="Client Since"         value={firstYear ? String(firstYear) : undefined} />
              <ProfileRow label="Lifetime Spending"    value={totalSpend > 0 ? `IDR ${fmtCur(totalSpend)}` : undefined} />
              <ProfileRow label="Highest Ticket"       value={highestTicket > 0 ? `IDR ${fmtCur(highestTicket)}` : undefined} />
              <ProfileRow label="Last Purchase Date"   value={lastPurchase ? fmtDate(lastPurchase.transaction_date) : undefined} />
              <ProfileRow label="Total Transactions"   value={purchases.length > 0 ? String(purchases.length) : undefined} />
              <ProfileRow label="Purchasing Purpose"   value={profile.barang_antusias} />
              <ProfileRow label="Gem / Style Pref."    value={profile.fashion_style} />
              <ProfileRow label="Competitor Creations" value={profile.topik_pembicaraan_favorit} />
              <ProfileRow label="Decision Key Factors" value={profile.faktor_pemicu_pembelian} />
              <ProfileRow label="Karakter"             value={profile.karakter} />
            </div>

            {/* Right: Top 3 Purchases */}
            <div className="space-y-3">
              {topPurchases.length > 0 ? topPurchases.map((p, i) => (
                <PurchaseCard key={p.trans_no || i} purchase={p} rank={i + 1} />
              )) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <ShoppingBag className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">Belum ada riwayat pembelian</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ ADDITIONAL PROFILE ══ */}
        {(profile.email || profile.instagram || profile.tiktok || profile.alergi_makanan || profile.makanan_favorit) && (
          <div className="p-5 border-b border-slate-200">
            <SectionHeader title="Additional Client Notes" />
            <div className="grid grid-cols-3 gap-x-8 gap-y-0">
              <ProfileRow label="Email"              value={profile.email} />
              <ProfileRow label="Instagram"          value={profile.instagram} />
              <ProfileRow label="TikTok"             value={profile.tiktok} />
              <ProfileRow label="Makanan Favorit"    value={profile.makanan_favorit} />
              <ProfileRow label="Minuman Favorit"    value={profile.minuman_favorit} />
              <ProfileRow label="Alergi"             value={profile.alergi_makanan} />
              <ProfileRow label="Cake Favorit"       value={profile.cake_favorit} />
              <ProfileRow label="Warna Favorit"      value={profile.warna_favorit} />
              <ProfileRow label="Tempat Liburan"     value={profile.tempat_liburan_favorit} />
            </div>
          </div>
        )}

        {/* ══ PURCHASE HISTORY TABLE ══ */}
        {recentByDate.length > 0 && (
          <div className="p-5">
            <SectionHeader title="Purchase History" />
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b-2 border-amber-400">
                    {['Date','Location','SAP Code','Collection','Category','Gross','Net Sales','Qty'].map(h => (
                      <th key={h} className="text-left py-1.5 px-2 font-black tracking-wide text-slate-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentByDate.map((p, i) => (
                    <tr key={p.trans_no || i} className={cn('border-b border-slate-100', i % 2 === 0 && 'bg-slate-50/50')}>
                      <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap">{fmtDate(p.transaction_date)}</td>
                      <td className="py-1.5 px-2 text-slate-700 font-medium whitespace-nowrap">{p.location}</td>
                      <td className="py-1.5 px-2 text-slate-600">{p.sap_code || '—'}</td>
                      <td className="py-1.5 px-2 text-slate-600 max-w-[120px] truncate">{p.collection || '—'}</td>
                      <td className="py-1.5 px-2 text-slate-600">{p.main_category || '—'}</td>
                      <td className="py-1.5 px-2 text-right font-medium text-slate-700">{fmtCur(p.gross_sales)}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-900">{fmtCur(p.net_sales)}</td>
                      <td className="py-1.5 px-2 text-center text-slate-600">{p.qty}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-amber-400">
                    <td colSpan={5} className="py-1.5 px-2 text-[10px] font-black text-slate-500 uppercase">Total</td>
                    <td className="py-1.5 px-2 text-right font-black text-slate-700">{fmtCur(recentByDate.reduce((s, p) => s + p.gross_sales, 0))}</td>
                    <td className="py-1.5 px-2 text-right font-black text-slate-900">{fmtCur(recentByDate.reduce((s, p) => s + p.net_sales, 0))}</td>
                    <td className="py-1.5 px-2 text-center font-black text-slate-700">{recentByDate.reduce((s, p) => s + p.qty, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Document Footer */}
        <div className="bg-slate-50 border-t-2 border-amber-400 px-5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Diamond className="w-3 h-3 text-blue-600" />
            <span className="text-[9px] font-black tracking-widest text-slate-500">BVLGARI ROMA — EVENT SELLING PLAN</span>
          </div>
          <p className="text-[9px] text-slate-400">{profile.lokasi_store} · {today}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EventSellingPlanPage() {
  const [query, setQuery]               = useState('');
  const [searching, setSearching]       = useState(false);
  const [results, setResults]           = useState<CrmProfilingRow[]>([]);
  const [searched, setSearched]         = useState(false);
  const [selected, setSelected]         = useState<CrmProfilingRow | null>(null);
  const [purchases, setPurchases]       = useState<Purchase[]>([]);
  const [loadingPlan, setLoadingPlan]   = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const data = await dashboardService.getCrmProfiling(q, '');
      setResults(data.slice(0, 20));
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  }, []);

  const selectClient = useCallback(async (profile: CrmProfilingRow) => {
    setLoadingPlan(true);
    setSelected(profile);
    try {
      const data = await dashboardService.getEventSellingPlan(profile);
      setPurchases(data);
    } catch (e) { console.error(e); }
    finally { setLoadingPlan(false); }
  }, []);

  const reset = () => {
    setSelected(null);
    setPurchases([]);
  };

  // ── Document view ──
  if (selected) {
    if (loadingPlan) return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <BvlgariLoader />
      </div>
    );
    return (
      <SellingPlanDocument profile={selected} purchases={purchases} onBack={reset} />
    );
  }

  // ── Search view ──
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Diamond className="w-5 h-5 text-amber-500" />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Event Selling Plan</h1>
        </div>
        <p className="text-slate-500 text-sm">Cari pelanggan untuk melihat profil lengkap &amp; riwayat pembelian</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-2xl">
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Ketik nama, nomor HP, atau Customer Advisor..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doSearch(query); }}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
            />
            {query && (
              <button type="button" title="Hapus" onClick={() => { setQuery(''); setResults([]); setSearched(false); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => doSearch(query)}
            disabled={searching || !query.trim()}
            className="px-5 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            {searching ? 'Mencari...' : 'Cari'}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 pl-1">Tekan Enter atau klik Cari</p>
      </div>

      {/* Results */}
      {searching && (
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          Mencari...
        </div>
      )}

      {!searching && searched && results.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-2xl">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-500">Tidak ada pelanggan ditemukan</p>
          <p className="text-xs text-slate-400 mt-1">Coba dengan nama lengkap atau nomor HP yang berbeda</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs text-slate-500 font-medium px-1">{results.length} hasil ditemukan — pilih untuk melihat profil lengkap</p>
          {results.map(row => (
            <SearchCard key={row.id} row={row} onSelect={() => selectClient(row)} />
          ))}
        </div>
      )}

      {/* Hint when no search yet */}
      {!searched && (
        <div className="max-w-2xl">
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[
              { icon: User,        label: 'Profile Lengkap',    desc: '45 field profiling dari AppSheet' },
              { icon: TrendingUp,  label: 'Riwayat Pembelian',  desc: 'Histori transaksi dari clean_master' },
              { icon: Printer,     label: 'Print / PDF',        desc: 'Export ke PDF untuk persiapan event' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-2">
                  <Icon className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-xs font-bold text-slate-700">{label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

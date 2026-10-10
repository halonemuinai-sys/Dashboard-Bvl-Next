"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Crosshair, Search, RefreshCw, FileSpreadsheet, MessageCircle, X,
  Users, Gem, Cake, Wallet, ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal, Info, ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import BvlgariLoader from '@/components/BvlgariLoader';
import { getAdvancedClienteling, type AdvancedClient } from '@/services/dashboard/advancedClientelingService';

// ── Filter configuration ─────────────────────────────────────────────────────

type FacetKey =
  | 'store' | 'advisor' | 'status' | 'gender'
  | 'ageBracket' | 'origin' | 'nationality' | 'domicile' | 'ethnicity' | 'occupation' | 'maritalStatus' | 'children'
  | 'interests' | 'fashionStyle' | 'characters' | 'hobbyCategories' | 'hobbySubs';

interface FacetDef {
  key: FacetKey;
  label: string;
  group: 'Dasar' | 'Demografi' | 'Minat & Gaya';
  values: (c: AdvancedClient) => string[];
  limit?: number;
  order?: string[];
}

const one = (v: string) => (v ? [v] : []);

const FACETS: FacetDef[] = [
  { key: 'store',           label: 'Toko',             group: 'Dasar', values: c => one(c.store), order: ['Plaza Indonesia', 'Plaza Senayan', 'Bali'] },
  { key: 'status',          label: 'Status Klien',     group: 'Dasar', values: c => one(c.status), order: ['VIP', 'CURRENT', 'NEW', 'OLD'] },
  { key: 'gender',          label: 'Title',            group: 'Dasar', values: c => one(c.gender), order: ['Mr', 'Mrs', 'Ms'] },
  { key: 'advisor',         label: 'Advisor',          group: 'Dasar', values: c => one(c.advisor), limit: 40 },

  { key: 'ageBracket',      label: 'Umur',             group: 'Demografi', values: c => one(c.ageBracket), order: ['<30', '30-35', '35-40', '40-45', '45-50', '>50'] },
  { key: 'origin',          label: 'Asal Klien',       group: 'Demografi', values: c => (c.nationality ? [c.isForeign ? 'Turis / Asing' : 'Lokal (WNI)'] : []) },
  { key: 'nationality',     label: 'Kewarganegaraan',  group: 'Demografi', values: c => one(c.nationality), limit: 15 },
  { key: 'domicile',        label: 'Domisili',         group: 'Demografi', values: c => one(c.domicile), limit: 15 },
  { key: 'ethnicity',       label: 'Etnis',            group: 'Demografi', values: c => one(c.ethnicity), limit: 12 },
  { key: 'occupation',      label: 'Pekerjaan',        group: 'Demografi', values: c => one(c.occupation), limit: 12 },
  { key: 'maritalStatus',   label: 'Status Nikah',     group: 'Demografi', values: c => one(c.maritalStatus) },
  { key: 'children',        label: 'Anak',             group: 'Demografi', values: c => (c.hasChildren ? ['Punya Anak'] : []) },

  { key: 'interests',       label: 'Barang Diminati',  group: 'Minat & Gaya', values: c => c.interests, order: ['Jewelry', 'Watches', 'LLGA', 'Perfume', 'Semi HJ'] },
  { key: 'fashionStyle',    label: 'Fashion Style',    group: 'Minat & Gaya', values: c => one(c.fashionStyle) },
  { key: 'characters',      label: 'Karakter',         group: 'Minat & Gaya', values: c => c.characters, limit: 15 },
  { key: 'hobbyCategories', label: 'Kategori Hobby',   group: 'Minat & Gaya', values: c => c.hobbyCategories, order: ['Gaya Hidup & Mewah', 'Olahraga & Kesehatan', 'Otomotif', 'Kuliner', 'Hiburan & Seni', 'Alam & Lingkungan', 'Others'] },
  { key: 'hobbySubs',       label: 'Turunan Hobby',    group: 'Minat & Gaya', values: c => c.hobbySubs, limit: 30 },
];

const SPEND_OPTIONS = [
  { id: 'all',   label: 'Semua' },
  { id: 'none',  label: 'Belum pernah beli', test: (c: AdvancedClient) => c.txCount === 0 },
  { id: 'buyer', label: 'Pernah beli',       test: (c: AdvancedClient) => c.txCount > 0 },
  { id: '50',    label: '≥ Rp 50 jt',        test: (c: AdvancedClient) => c.totalSpend >= 50_000_000 },
  { id: '200',   label: '≥ Rp 200 jt',       test: (c: AdvancedClient) => c.totalSpend >= 200_000_000 },
  { id: '500',   label: '≥ Rp 500 jt',       test: (c: AdvancedClient) => c.totalSpend >= 500_000_000 },
  { id: '1000',  label: '≥ Rp 1 M',          test: (c: AdvancedClient) => c.totalSpend >= 1_000_000_000 },
];

const RECENCY_OPTIONS = [
  { id: 'all',  label: 'Semua' },
  { id: '90',   label: 'Beli ≤ 3 bln lalu',      test: (c: AdvancedClient) => c.daysSincePurchase !== null && c.daysSincePurchase <= 90 },
  { id: '180',  label: 'Beli ≤ 6 bln lalu',      test: (c: AdvancedClient) => c.daysSincePurchase !== null && c.daysSincePurchase <= 180 },
  { id: 'd180', label: 'Tidak beli > 6 bln',     test: (c: AdvancedClient) => c.daysSincePurchase !== null && c.daysSincePurchase > 180 },
  { id: 'd365', label: 'Tidak beli > 12 bln',    test: (c: AdvancedClient) => c.daysSincePurchase !== null && c.daysSincePurchase > 365 },
];

const BIRTHDAY_OPTIONS = [
  { id: 'all', label: 'Semua' },
  { id: '7',   label: '7 hari ke depan',  test: (c: AdvancedClient) => c.daysToBirthday !== null && c.daysToBirthday <= 7 },
  { id: '30',  label: '30 hari ke depan', test: (c: AdvancedClient) => c.daysToBirthday !== null && c.daysToBirthday <= 30 },
  { id: 'thisMonth', label: 'Bulan ini',  test: (c: AdvancedClient) => isBirthMonth(c, 0) },
  { id: 'nextMonth', label: 'Bulan depan', test: (c: AdvancedClient) => isBirthMonth(c, 1) },
];

function isBirthMonth(c: AdvancedClient, offset: number) {
  if (!c.birthDate) return false;
  const d = new Date(c.birthDate);
  if (isNaN(d.getTime())) return false;
  return d.getMonth() === (new Date().getMonth() + offset) % 12;
}

const PAGE_SIZE = 25;

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const waLink = (phone: string) => {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d.length >= 9 ? `https://wa.me/${d}` : null;
};

const statusColor: Record<string, string> = {
  VIP: 'bg-amber-100 text-amber-800 border-amber-300',
  CURRENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  OLD: 'bg-slate-100 text-slate-600 border-slate-200',
};

// ── Sub components ───────────────────────────────────────────────────────────

function FacetBlock({
  def, options, coverage, selected, onToggle,
}: {
  def: FacetDef;
  options: [string, number][];
  coverage: number;
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? options : options.slice(0, 8);
  const lowCoverage = coverage < 10;
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{def.label}</p>
        <span
          title="Persentase klien yang sudah mengisi field ini di form profiling"
          className={cn(
            'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
            lowCoverage ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500',
          )}
        >
          {coverage.toFixed(0)}% terisi
        </span>
      </div>
      {options.length === 0 ? (
        <p className="text-[11px] text-slate-400 italic">Belum ada data</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {shown.map(([v, n]) => {
            const active = selected.has(v);
            return (
              <button
                key={v}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(v)}
                className={cn(
                  'text-[11px] px-2 py-1 rounded-lg border transition-all',
                  active
                    ? 'bg-[#123d33] text-white border-[#123d33]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
                )}
              >
                {v} <span className={cn('ml-0.5', active ? 'text-slate-300' : 'text-slate-400')}>{n}</span>
              </button>
            );
          })}
          {options.length > 8 && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="text-[11px] px-2 py-1 text-emerald-700 font-bold hover:underline"
            >
              {expanded ? 'Lebih sedikit' : `+${options.length - 8} lagi`}
            </button>
          )}
        </div>
      )}
      {lowCoverage && (def.key === 'hobbyCategories' || def.key === 'hobbySubs') && (
        <p className="text-[10px] text-rose-500 mt-2 leading-snug">
          Hobby baru diisi sebagian klien. Smart-matching otomatis menghubungkan data lama.
        </p>
      )}
    </div>
  );
}

function SelectRow<T extends { id: string; label: string }>({
  label, options, value, onChange,
}: { label: string; options: T[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="py-3 border-b border-slate-100">
      <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              'text-[11px] px-2 py-1 rounded-lg border transition-all',
              value === o.id
                ? 'bg-[#123d33] text-white border-[#123d33]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, tone }: {
  label: string; value: React.ReactNode; sub?: string; icon: React.ElementType; tone: string;
}) {
  return (
    <div className="relative overflow-hidden bg-white border border-stone-200/80 rounded-2xl p-5 shadow-[0_4px_24px_-12px_rgba(15,52,43,0.15)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', tone)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{sub}</p>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdvancedClientelingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<AdvancedClient[]>([]);

  const [search, setSearch] = useState('');
  const [facetSel, setFacetSel] = useState<Partial<Record<FacetKey, Set<string>>>>({});
  const [spend, setSpend] = useState('all');
  const [recency, setRecency] = useState('all');
  const [birthday, setBirthday] = useState('all');
  const [sortBy, setSortBy] = useState<'spend' | 'recent' | 'birthday' | 'name'>('spend');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setClients(await getAdvancedClienteling());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data klien');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search, facetSel, spend, recency, birthday, sortBy]);

  // Coverage & options per facet (dihitung dari seluruh data)
  const facetMeta = useMemo(() => {
    const meta: Partial<Record<FacetKey, { options: [string, number][]; coverage: number }>> = {};
    for (const def of FACETS) {
      const counts = new Map<string, number>();
      let filled = 0;
      for (const c of clients) {
        const vals = def.values(c);
        if (vals.length) filled++;
        vals.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
      }
      let options = Array.from(counts.entries());
      if (def.order) {
        options.sort((a, b) => {
          const ia = def.order!.indexOf(a[0]); const ib = def.order!.indexOf(b[0]);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || b[1] - a[1];
        });
      } else {
        options.sort((a, b) => b[1] - a[1]);
      }
      if (def.limit) options = options.slice(0, def.limit);
      meta[def.key] = { options, coverage: clients.length ? (filled / clients.length) * 100 : 0 };
    }
    return meta;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const spendTest = SPEND_OPTIONS.find(o => o.id === spend)?.test;
    const recencyTest = RECENCY_OPTIONS.find(o => o.id === recency)?.test;
    const birthdayTest = BIRTHDAY_OPTIONS.find(o => o.id === birthday)?.test;
    const activeFacets = FACETS.filter(f => facetSel[f.key]?.size);

    const list = clients.filter(c => {
      if (q && !c.name.toLowerCase().includes(q) && !c.nickname.toLowerCase().includes(q)
            && !c.phone.includes(q) && !c.advisor.toLowerCase().includes(q)) return false;
      if (spendTest && !spendTest(c)) return false;
      if (recencyTest && !recencyTest(c)) return false;
      if (birthdayTest && !birthdayTest(c)) return false;
      // Dalam satu filter: OR. Antar filter: AND.
      for (const f of activeFacets) {
        const sel = facetSel[f.key]!;
        if (!f.values(c).some(v => sel.has(v))) return false;
      }
      return true;
    });

    const sorters: Record<typeof sortBy, (a: AdvancedClient, b: AdvancedClient) => number> = {
      spend: (a, b) => b.totalSpend - a.totalSpend,
      recent: (a, b) => (a.daysSincePurchase ?? 1e9) - (b.daysSincePurchase ?? 1e9),
      birthday: (a, b) => (a.daysToBirthday ?? 1e9) - (b.daysToBirthday ?? 1e9),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return list.sort(sorters[sortBy]);
  }, [clients, search, facetSel, spend, recency, birthday, sortBy]);

  const kpi = useMemo(() => ({
    count: filtered.length,
    vip: filtered.filter(c => c.status === 'VIP').length,
    buyers: filtered.filter(c => c.txCount > 0).length,
    spend: filtered.reduce((s, c) => s + c.totalSpend, 0),
    birthdays30: filtered.filter(c => c.daysToBirthday !== null && c.daysToBirthday <= 30).length,
  }), [filtered]);

  const activeCount =
    Object.values(facetSel).reduce((n, s) => n + (s?.size || 0), 0) +
    (spend !== 'all' ? 1 : 0) + (recency !== 'all' ? 1 : 0) + (birthday !== 'all' ? 1 : 0);

  const toggle = (key: FacetKey, v: string) => {
    setFacetSel(prev => {
      const next = new Set(prev[key] || []);
      if (next.has(v)) next.delete(v); else next.add(v);
      return { ...prev, [key]: next };
    });
  };

  const resetAll = () => {
    setFacetSel({}); setSpend('all'); setRecency('all'); setBirthday('all'); setSearch('');
  };

  const chips: { label: string; onRemove: () => void }[] = [
    ...FACETS.flatMap(f => Array.from(facetSel[f.key] || []).map(v => ({
      label: `${f.label}: ${v}`, onRemove: () => toggle(f.key, v),
    }))),
    ...(spend !== 'all' ? [{ label: SPEND_OPTIONS.find(o => o.id === spend)!.label, onRemove: () => setSpend('all') }] : []),
    ...(recency !== 'all' ? [{ label: RECENCY_OPTIONS.find(o => o.id === recency)!.label, onRemove: () => setRecency('all') }] : []),
    ...(birthday !== 'all' ? [{ label: `Ultah ${BIRTHDAY_OPTIONS.find(o => o.id === birthday)!.label}`, onRemove: () => setBirthday('all') }] : []),
  ];

  const exportExcel = async () => {
    setExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'MRA Retail BI Dashboard';
      const ws = wb.addWorksheet('Advanced Clienteling', { views: [{ state: 'frozen', ySplit: 3 }] });

      ws.mergeCells('A1:U1');
      ws.getCell('A1').value = `Advanced Clienteling — ${filtered.length} klien`;
      ws.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FF1E3A5F' } };
      ws.mergeCells('A2:U2');
      ws.getCell('A2').value = chips.length ? `Filter: ${chips.map(c => c.label).join(' | ')}` : 'Filter: (tidak ada)';
      ws.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF64748B' } };

      const headers = ['No', 'Nama', 'Title', 'No HP', 'Email', 'Toko', 'Advisor', 'Status', 'Umur',
        'Kewarganegaraan', 'Domisili', 'Pekerjaan', 'Barang Diminati', 'Fashion Style', 'Karakter',
        'Kategori Hobby', 'Turunan Hobby', 'Tanggal Lahir', 'Total Belanja', 'Jumlah Transaksi', 'Terakhir Belanja'];
      const hdr = ws.addRow(headers);
      hdr.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      hdr.height = 26;

      filtered.forEach((c, i) => {
        const row = ws.addRow([
          i + 1, c.name, c.gender, c.phone, c.email, c.store, c.advisor, c.status, c.ageBracket,
          c.nationality, c.domicile, c.occupation, c.interests.join(', '), c.fashionStyle,
          c.characters.join(', '), c.hobbyCategories.join(', '), c.hobbySubs.join(', '), fmtDate(c.birthDate),
          c.totalSpend, c.txCount, fmtDate(c.lastPurchase),
        ]);
        row.getCell(19).numFmt = '#,##0';
        row.font = { size: 9.5 };
      });

      ws.columns = [
        { width: 6 }, { width: 30 }, { width: 7 }, { width: 16 }, { width: 26 }, { width: 16 }, { width: 22 },
        { width: 10 }, { width: 8 }, { width: 16 }, { width: 14 }, { width: 16 }, { width: 20 }, { width: 14 },
        { width: 26 }, { width: 22 }, { width: 26 }, { width: 14 }, { width: 18 }, { width: 10 }, { width: 14 },
      ];

      const buffer = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Advanced_Clienteling_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="h-[60vh] flex items-center justify-center"><BvlgariLoader /></div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700">
          {error}
          <button type="button" onClick={load} className="ml-3 font-bold underline">Coba lagi</button>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const groups: FacetDef['group'][] = ['Dasar', 'Demografi', 'Minat & Gaya'];

  return (
    <div className="min-w-0 space-y-6 rounded-3xl bg-[#f8f9f6] p-3 sm:p-6 [&_button]:cursor-pointer [&_button]:transition-colors [&_button:disabled]:cursor-not-allowed [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-emerald-700">
      {/* Header */}
      <div className="relative isolate overflow-hidden rounded-3xl bg-[#123d33] px-6 py-8 sm:p-9 text-white shadow-lg shadow-emerald-950/10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-40 -z-10 h-96 w-96 rounded-full border-[50px] border-[#c9b681]/10" />
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-7">
          <div className="max-w-xl">
            <p className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#dfd0a6]"><Crosshair className="h-4 w-4" /> Bvlgari · Client relationships</p>
            <h1 className="text-3xl sm:text-4xl font-medium tracking-tight">Advanced Clienteling</h1>
            <p className="mt-3 text-sm leading-relaxed text-emerald-50/75">Kenali setiap klien. Ciptakan hubungan yang lebih personal.</p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-emerald-50"><Users className="h-3.5 w-3.5" />{clients.length.toLocaleString('id-ID')} profil klien tersedia</p>
          </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowFilters(s => !s)}
            aria-expanded={showFilters} aria-controls="clienteling-filters"
            className="lg:hidden flex items-center gap-1.5 text-xs font-semibold px-3 py-3 rounded-xl border border-white/20 bg-white/10">
            <SlidersHorizontal className="w-4 h-4" /> Filter {activeCount > 0 && `(${activeCount})`}
          </button>
          <button type="button" onClick={load} aria-label="Refresh data klien"
            className="flex items-center gap-2 text-xs font-semibold px-4 py-3 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20">
            <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button type="button" onClick={exportExcel} disabled={exporting || filtered.length === 0}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-3 rounded-xl bg-[#e5d6ad] text-[#123d33] hover:bg-[#f2e6c8] disabled:opacity-50">
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export Excel ({filtered.length})
          </button>
        </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Klien Ditemukan" value={kpi.count.toLocaleString('id-ID')} sub={`${kpi.buyers.toLocaleString('id-ID')} pernah belanja`} icon={Users} tone="bg-blue-50 text-blue-600" />
        <Kpi label="VIP" value={kpi.vip.toLocaleString('id-ID')} sub="Status VIP di form profiling" icon={Gem} tone="bg-amber-50 text-amber-600" />
        <Kpi label="Total Belanja" value={<Amt value={kpi.spend} short />} sub="Akumulasi belanja klien terpilih" icon={Wallet} tone="bg-emerald-50 text-emerald-600" />
        <Kpi label="Ultah 30 Hari" value={kpi.birthdays30.toLocaleString('id-ID')} sub="Kesempatan sapaan personal" icon={Cake} tone="bg-rose-50 text-rose-600" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-xs font-semibold text-slate-500">Segmen cepat</span>
        {[
          { label: 'Semua klien', icon: Users, active: activeCount === 0 && !search, action: resetAll },
          { label: 'Klien VIP', icon: Gem, active: activeCount === 1 && facetSel.status?.has('VIP'), action: () => { resetAll(); setFacetSel({ status: new Set(['VIP']) }); } },
          { label: 'Ulang tahun mendatang', icon: Cake, active: activeCount === 1 && birthday === '30', action: () => { resetAll(); setBirthday('30'); } },
          { label: 'Sapa kembali', icon: MessageCircle, active: activeCount === 1 && recency === 'd180', action: () => { resetAll(); setRecency('d180'); } },
        ].map(segment => (
          <button key={segment.label} type="button" onClick={segment.action} aria-pressed={!!segment.active}
            title={segment.label === 'Sapa kembali' ? 'Klien yang tidak berbelanja lebih dari 6 bulan' : segment.label}
            className={cn('inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-medium', segment.active ? 'border-[#123d33] bg-[#123d33] text-white' : 'border-stone-200 bg-white text-slate-600 hover:border-emerald-700 hover:text-emerald-800')}>
            <segment.icon className="h-3.5 w-3.5" />{segment.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Filter panel */}
        <aside id="clienteling-filters" className={cn('w-full lg:w-64 xl:w-72 shrink-0 bg-white border border-stone-200 rounded-2xl shadow-sm', !showFilters && 'hidden lg:block')}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><SlidersHorizontal className="h-4 w-4 text-emerald-700" />Filter klien {activeCount > 0 && <span className="text-emerald-700">({activeCount})</span>}</p>
            {activeCount > 0 && (
              <button type="button" onClick={resetAll} className="text-[11px] font-bold text-rose-600 hover:underline">Reset semua</button>
            )}
          </div>
          <div className="px-4 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">
            <p className="pt-4 pb-1 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Nilai Belanja</p>
            <SelectRow label="Total Belanja" options={SPEND_OPTIONS} value={spend} onChange={setSpend} />
            <SelectRow label="Terakhir Belanja" options={RECENCY_OPTIONS} value={recency} onChange={setRecency} />

            <p className="pt-4 pb-1 text-[10px] font-black text-emerald-800 uppercase tracking-widest">Momen</p>
            <SelectRow label="Ulang Tahun" options={BIRTHDAY_OPTIONS} value={birthday} onChange={setBirthday} />

            {groups.map(g => (
              <details key={g} open={g === 'Dasar'} className="group border-b border-slate-100">
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">{g}<ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /></summary>
                {FACETS.filter(f => f.group === g).map(def => (
                  <FacetBlock
                    key={def.key}
                    def={def}
                    options={facetMeta[def.key]?.options || []}
                    coverage={facetMeta[def.key]?.coverage || 0}
                    selected={facetSel[def.key] || new Set()}
                    onToggle={v => toggle(def.key, v)}
                  />
                ))}
              </details>
            ))}
            <div className="flex gap-2 text-[10px] text-slate-400 py-4 leading-snug">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Dalam satu filter, pilihan digabung dengan ATAU. Antar filter berbeda digabung dengan DAN.
            </div>
          </div>
        </aside>

        {/* Results */}
        <section className="flex-1 min-w-0 space-y-3 w-full">
          <div className="flex items-center justify-between gap-3 pb-1">
            <div><h2 className="text-lg font-semibold tracking-tight text-slate-900">Direktori klien</h2><p className="mt-1 text-xs text-slate-500" aria-live="polite">{filtered.length.toLocaleString('id-ID')} klien {activeCount || search ? 'sesuai pencarian Anda' : 'siap untuk lebih dikenal'}</p></div>
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-800"><ArrowUpRight className="h-4 w-4" /> Personal connections</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                aria-label="Cari nama, nomor HP, atau advisor"
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama, No HP, atau advisor..."
                className="w-full pl-9 pr-3 py-3 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Urutkan"
              className="text-sm px-3 py-2.5 bg-white border border-slate-200 rounded-xl"
            >
              <option value="spend">Urut: Belanja terbesar</option>
              <option value="recent">Urut: Belanja terbaru</option>
              <option value="birthday">Urut: Ulang tahun terdekat</option>
              <option value="name">Urut: Nama A–Z</option>
            </select>
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map(c => (
                <span key={c.label} className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full pl-2.5 pr-1 py-0.5">
                  {c.label}
                  <button type="button" onClick={c.onRemove} aria-label={`Hapus ${c.label}`} className="p-0.5 rounded-full hover:bg-emerald-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-emerald-700" tabIndex={0} role="region" aria-label="Daftar klien">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-4">Klien</th>
                    <th className="text-left px-3 py-4">Toko / Advisor</th>
                    <th className="text-left px-3 py-4">Minat & Hobby</th>
                    <th className="text-right px-3 py-4">Total Belanja</th>
                    <th className="text-left px-3 py-4">Terakhir Beli</th>
                    <th className="text-left px-3 py-4">Ultah</th>
                    <th className="px-3 py-4"><span className="sr-only">Hubungi klien</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.length === 0 && (
                    <tr><td colSpan={7} className="text-center px-4 py-16 text-sm"><Search className="mx-auto mb-4 h-8 w-8 text-stone-300" /><p className="font-semibold text-slate-700">Belum ada klien yang cocok</p><p className="mt-2 text-xs text-slate-500">Coba kata kunci lain atau sesuaikan filter pencarian.</p><button type="button" onClick={resetAll} className="mt-5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">Reset pencarian</button></td></tr>
                  )}
                  {paged.map(c => {
                    const wa = waLink(c.phone);
                    return (
                      <tr key={c.id} className="hover:bg-[#f6f9f6] transition-colors align-top">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5"><span aria-hidden="true" className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold', c.status === 'VIP' ? 'bg-[#f3ebd6] text-[#8a6d2b]' : 'bg-emerald-50 text-emerald-800')}>{c.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?'}</span><p className="min-w-[110px] font-semibold text-slate-900">{c.gender && <span className="text-slate-400 font-medium">{c.gender} </span>}{c.name || '—'}</p></div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {c.status && (
                              <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full border', statusColor[c.status] || statusColor.OLD)}>{c.status}</span>
                            )}
                            {c.isForeign && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">{c.nationality}</span>
                            )}
                            {c.ageBracket && <span className="text-[10px] text-slate-400">{c.ageBracket} th</span>}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{c.phone || '—'}</p>
                        </td>
                        <td className="px-3 py-4">
                          <p className="text-xs font-semibold text-slate-700">{c.store || '—'}</p>
                          <p className="text-[11px] text-slate-400">{c.advisor || '—'}</p>
                        </td>
                        <td className="px-3 py-4 max-w-[220px]">
                          <div className="flex flex-wrap gap-1">
                            {c.interests.map(i => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">{i}</span>
                            ))}
                            {(c.hobbySubs.length > 0 ? c.hobbySubs : c.hobbyCategories).map(h => (
                              <span key={h} className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-medium">{h}</span>
                            ))}
                            {c.fashionStyle && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{c.fashionStyle}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-right whitespace-nowrap">
                          {c.txCount > 0 ? (
                            <>
                              <Amt value={c.totalSpend} short className="font-black text-slate-900" />
                              <p className="text-[10px] text-slate-400">{c.txCount} transaksi</p>
                            </>
                          ) : <span className="text-[11px] text-slate-400">Belum ada</span>}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <p className="text-xs text-slate-700">{fmtDate(c.lastPurchase)}</p>
                          {c.daysSincePurchase !== null && (
                            <p className={cn('text-[10px]', c.daysSincePurchase > 180 ? 'text-rose-500 font-bold' : 'text-slate-400')}>
                              {c.daysSincePurchase} hari lalu
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <p className="text-xs text-slate-700">
                            {c.birthDate ? new Date(c.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—'}
                          </p>
                          {c.daysToBirthday !== null && c.daysToBirthday <= 30 && (
                            <p className="text-[10px] font-bold text-rose-500">{c.daysToBirthday === 0 ? 'Hari ini!' : `${c.daysToBirthday} hari lagi`}</p>
                          )}
                        </td>
                        <td className="px-3 py-4 text-right">
                          {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer"
                              aria-label={`Hubungi ${c.name} melalui WhatsApp`}
                              title={`WhatsApp ${c.name}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                              <MessageCircle className="w-3.5 h-3.5" /> WA
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
              <span>
                {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length.toLocaleString('id-ID')}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                <span className="px-2">{page} / {totalPages}</span>
                <button type="button" aria-label="Halaman berikutnya" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

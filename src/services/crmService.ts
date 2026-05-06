import { supabase } from '@/lib/supabase';

// Matches existing mirror_traffic schema created by ARES CRM project
export interface LocationStat {
  name: string;
  total: number;
  walkin: number;
  followup: number;
  delivery: number;
  service: number;
  online: number;
  inhouse: number;
  outsider: number;
  other: number;
}

export interface TrafficRow {
  id: number;
  source_id: string;
  tanggal_input: string;
  transaction_date: string;
  customer_name: string;
  nama_panggilan: string;
  customer_advisor: string;
  served_by: string;
  location: string;
  status: string;
  repair_charge: number;
  siapa: string;
  akses_masuk: string;
  tanggal_berkunjung: string;
  rentang_waktu: string;
  no_hp: string;
  email: string;
  etnis: string;
  status_pelanggan: string;
  prospect_item: string;
  kota: string;
  kewarganegaraan: string;
  minat_barang: string;
  item_1: string;
  item_2: string;
  item_3: string;
  item_4: string;
  item_5: string;
  item_6: string;
  item_7: string;
  item_8: string;
  item_9: string;
  item_10: string;
  detail_items: string;
  gross_sales: number;
  disc_pct: number;
  val_disc: number;
  net_sales: number;
  notes: string;
  bukti_chat: string;
  group_size: number;
  faktor_pemicu: string;
  description_item: string;
}

const FUNNEL_MAP: Array<{ key: string; label: string; match: string[] }> = [
  { key: 'berhasil',   label: 'Penjualan Berhasil', match: ['berhasil'] },
  { key: 'gagal',      label: 'Penjualan Gagal',    match: ['gagal'] },
  { key: 'negosiasi',  label: 'Dalam Negosiasi',    match: ['negosiasi'] },
  { key: 'menunggu',   label: 'Menunggu Respon',    match: ['menunggu', 'respon'] },
  { key: 'potensial',  label: 'Potensial Baru',     match: ['potensial'] },
];

const STATUS_MAP: Array<{ key: string; label: string; match: string[] }> = [
  { key: 'walkin',    label: 'Walk In',            match: ['walk in', 'walk-in', 'walkin'] },
  { key: 'followup',  label: 'Follow Up',          match: ['follow up', 'follow-up', 'followup'] },
  { key: 'delivery',  label: 'Delivery & Showing', match: ['delivery', 'showing'] },
  { key: 'service',   label: 'Service & Repair',   match: ['service', 'repair'] },
  { key: 'online',    label: 'Online Only',        match: ['online'] },
  { key: 'inhouse',   label: 'In House',           match: ['in house', 'in-house', 'inhouse'] },
  { key: 'outsider',  label: 'Outsider',           match: ['outsider'] },
];

function matchKey(value: string, map: typeof FUNNEL_MAP | typeof STATUS_MAP): string {
  // Normalize non-breaking space (U+00A0) to regular space — Bali data uses NBSP
  const lower = (value || '').toLowerCase().replace(/ /g, ' ');
  for (const entry of map) {
    if (entry.match.some(m => lower.includes(m))) return entry.key;
  }
  return 'other';
}

// Bali uses akses_masuk for arrival type instead of status — try both fields
function resolveStatus(r: TrafficRow): string {
  const k = matchKey(r.status, STATUS_MAP);
  if (k !== 'other') return k;
  return matchKey(r.akses_masuk, STATUS_MAP);
}

function dateRange(month: number, year: number) {
  const lastDay = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    from: `${year}-${pad(month)}-01`,
    to:   `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

export const crmService = {

  async getTrafficRows(month: number, year: number): Promise<TrafficRow[]> {
    const { from, to } = dateRange(month, year);
    const { data, error } = await supabase
      .from('mirror_traffic')
      .select('*')
      .gte('transaction_date', from)
      .lte('transaction_date', to)
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return (data || []) as TrafficRow[];
  },

  computeOverview(rows: TrafficRow[]) {
    // ── Funnel (prospect_item) ───────────────────────────────────────────
    const funnelCounts:  Record<string, number> = {};
    const funnelRevenue: Record<string, number> = {};
    for (const f of FUNNEL_MAP) { funnelCounts[f.key] = 0; funnelRevenue[f.key] = 0; }
    funnelCounts['other'] = 0; funnelRevenue['other'] = 0;

    rows.forEach(r => {
      const k = matchKey(r.prospect_item, FUNNEL_MAP);
      funnelCounts[k]++;
      funnelRevenue[k] += r.net_sales || 0;
    });

    const funnel = FUNNEL_MAP.map(f => ({
      key: f.key, label: f.label,
      count: funnelCounts[f.key], revenue: funnelRevenue[f.key],
    }));

    // ── Status Kedatangan (status) ────────────────────────────────────────
    const statusCounts: Record<string, number> = {};
    for (const s of STATUS_MAP) statusCounts[s.key] = 0;
    statusCounts['other'] = 0;

    rows.forEach(r => {
      statusCounts[resolveStatus(r)]++;
    });

    const statusBreakdown = STATUS_MAP.map(s => ({
      key: s.key, label: s.label, count: statusCounts[s.key],
    }));

    // ── Per Location ─────────────────────────────────────────────────────
    const locMap: Record<string, LocationStat> = {};
    rows.forEach(r => {
      const loc = r.location || 'Unknown';
      if (!locMap[loc]) locMap[loc] = { name: loc, total: 0, walkin: 0, followup: 0, delivery: 0, service: 0, online: 0, inhouse: 0, outsider: 0, other: 0 };
      locMap[loc].total++;
      const k = resolveStatus(r) as keyof LocationStat;
      if (k in locMap[loc]) (locMap[loc][k] as number)++;
      else locMap[loc].other++;
    });

    const byLocation: LocationStat[] = Object.values(locMap);

    const kpi = {
      totalVisit:   rows.length,
      totalRevenue: rows.reduce((s, r) => s + (r.net_sales || 0), 0),
      ...Object.fromEntries(STATUS_MAP.map(s => [s.key, statusCounts[s.key]])),
    };

    return { kpi, funnel, statusBreakdown, byLocation };
  },
};

export { FUNNEL_MAP, STATUS_MAP };

import { supabase } from '@/lib/supabase';

// Matches existing mirror_traffic schema created by ARES CRM project
export interface TrafficRow {
  id: number;
  transaction_date: string;   // tanggal berkunjung (main visit date)
  customer_name: string;
  location: string;           // lokasi store
  served_by: string;
  status: string;             // status kedatangan
  prospect_item: string;      // prospek level
  gross_sales: number;
  disc_pct: number;
  val_disc: number;
  net_sales: number;
  repair_charge: number;
  siapa: string;
  akses_masuk: string;
  tanggal_berkunjung: string; // secondary date field (raw from dynamic column)
  rentang_waktu: string;
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
];

function matchKey(value: string, map: typeof FUNNEL_MAP | typeof STATUS_MAP): string {
  const lower = (value || '').toLowerCase();
  for (const entry of map) {
    if (entry.match.some(m => lower.includes(m))) return entry.key;
  }
  return 'other';
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
      statusCounts[matchKey(r.status, STATUS_MAP)]++;
    });

    const statusBreakdown = STATUS_MAP.map(s => ({
      key: s.key, label: s.label, count: statusCounts[s.key],
    }));

    // ── Per Location ─────────────────────────────────────────────────────
    const locMap: Record<string, Record<string, number>> = {};
    rows.forEach(r => {
      const loc = r.location || 'Unknown';
      if (!locMap[loc]) {
        locMap[loc] = { total: 0 };
        for (const s of STATUS_MAP) locMap[loc][s.key] = 0;
      }
      locMap[loc].total++;
      const k = matchKey(r.status, STATUS_MAP);
      if (locMap[loc][k] !== undefined) locMap[loc][k]++;
    });

    const byLocation: Array<{ name: string; total: number } & Record<string, number>> =
      Object.entries(locMap).map(([name, counts]) =>
        ({ name, ...counts }) as { name: string; total: number } & Record<string, number>
      );

    const kpi = {
      totalVisit:   rows.length,
      totalRevenue: rows.reduce((s, r) => s + (r.net_sales || 0), 0),
      ...Object.fromEntries(STATUS_MAP.map(s => [s.key, statusCounts[s.key]])),
    };

    return { kpi, funnel, statusBreakdown, byLocation };
  },
};

export { FUNNEL_MAP, STATUS_MAP };

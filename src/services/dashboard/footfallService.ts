import { supabase } from '@/lib/supabase';
import type { FootfallStoreRow, FootfallCrmRow, StockStoreRow } from './types';
import { MONTH_NAMES } from './constants';

export async function getFootfallStore(month: string, year: number): Promise<FootfallStoreRow[]> {
  const monthIndex = MONTH_NAMES.indexOf(month);
  const mStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const mEnd = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('footfall_store')
    .select('*')
    .gte('transaction_date', mStart)
    .lte('transaction_date', mEnd)
    .order('transaction_date', { ascending: true });

  if (error) throw error;
  return (data || []) as FootfallStoreRow[];
}

export async function getStockStore(year: number): Promise<StockStoreRow[]> {
  const { data, error } = await supabase
    .from('stock_store')
    .select('*')
    .eq('year', year);
  if (error) throw error;
  return (data || []) as StockStoreRow[];
}

export async function getFootfallCrm(month: string, year: number): Promise<FootfallCrmRow[]> {
  const monthIndex = MONTH_NAMES.indexOf(month);
  const mStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const mEnd   = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];

  // 1. Ambil manual entries dari footfall_crm
  const { data: manual, error } = await supabase
    .from('footfall_crm')
    .select('*')
    .gte('transaction_date', mStart)
    .lte('transaction_date', mEnd)
    .order('transaction_date', { ascending: true });
  if (error) throw error;

  // Manual entries (keyed by date||location) jadi prioritas utama
  const manualMap: Record<string, FootfallCrmRow> = {};
  (manual || []).forEach(r => {
    manualMap[`${r.transaction_date}||${r.location}`] = r as FootfallCrmRow;
  });

  // 2. Fallback: hitung dari mirror_traffic per hari per lokasi
  const { data: trafficRows } = await supabase
    .from('mirror_traffic')
    .select('transaction_date, location')
    .gte('transaction_date', mStart)
    .lte('transaction_date', mEnd);

  const trafficCount: Record<string, Record<string, number>> = {};
  (trafficRows || []).forEach(r => {
    const d = r.transaction_date as string;
    const l = (r.location as string) || '';
    if (!trafficCount[d]) trafficCount[d] = {};
    trafficCount[d][l] = (trafficCount[d][l] || 0) + 1;
  });

  // 3. Gabungkan: manual override jika ada, fallback ke traffic count
  const result: FootfallCrmRow[] = [];
  const seen = new Set<string>();

  // Tambahkan manual entries
  Object.values(manualMap).forEach(r => {
    result.push(r);
    seen.add(`${r.transaction_date}||${r.location}`);
  });

  // Tambahkan traffic-derived entries yang belum ada manual entry-nya
  Object.entries(trafficCount).forEach(([date, locs]) => {
    Object.entries(locs).forEach(([location, count]) => {
      const key = `${date}||${location}`;
      if (!seen.has(key)) {
        result.push({ id: 0, transaction_date: date, location, walk_in: count, appointment: 0, new_customer: 0 });
      }
    });
  });

  return result.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
}

export async function saveFootfallStore(row: Partial<FootfallStoreRow>): Promise<void> {
  if (row.id) {
    const { error } = await supabase.from('footfall_store').update(row).eq('id', row.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('footfall_store').insert(row);
    if (error) throw error;
  }
}

export async function saveFootfallCrm(row: Partial<FootfallCrmRow>): Promise<void> {
  if (row.id) {
    const { error } = await supabase.from('footfall_crm').update(row).eq('id', row.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('footfall_crm').insert(row);
    if (error) throw error;
  }
}

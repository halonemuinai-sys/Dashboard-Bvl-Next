import { supabase } from '@/lib/supabase';

export interface JournalEntry {
  id?: number;
  entry_date: string;   // YYYY-MM-DD
  location: string;     // store name or 'ALL'
  note: string;
  tags: string[];
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DayContext {
  netSales: number;
  qty: number;
  transCount: number;
  topCollections: { name: string; net: number }[];
  discountReasons: { reason: string; count: number }[];
  afterSalesCount: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Journal entries for a month, keyed by entry_date (YYYY-MM-DD). */
export async function getJournalEntries(
  month: number,
  year: number,
  location = 'ALL'
): Promise<Record<string, JournalEntry>> {
  const from = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${pad(month)}-${pad(lastDay)}`;

  let q = supabase
    .from('daily_sales_journal')
    .select('*')
    .gte('entry_date', from)
    .lte('entry_date', to);
  if (location !== 'ALL') q = q.eq('location', location);

  const { data, error } = await q;
  if (error) throw error;

  const map: Record<string, JournalEntry> = {};
  (data || []).forEach((r: JournalEntry) => { map[r.entry_date] = r; });
  return map;
}

export async function saveJournalEntry(entry: JournalEntry, userEmail: string): Promise<void> {
  const { error } = await supabase
    .from('daily_sales_journal')
    .upsert(
      {
        entry_date: entry.entry_date,
        location: entry.location,
        note: entry.note,
        tags: entry.tags,
        created_by: entry.created_by || userEmail,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'entry_date,location' }
    );
  if (error) throw error;
}

export async function deleteJournalEntry(entryDate: string, location: string): Promise<void> {
  const { error } = await supabase
    .from('daily_sales_journal')
    .delete()
    .eq('entry_date', entryDate)
    .eq('location', location);
  if (error) throw error;
}

/**
 * Auto-pulled context for one day: sales totals plus the "why" fields already
 * captured in Invoice Management (discount reasons, after-sales support),
 * aggregated so a manager can see them at a glance before writing the note.
 */
export async function getDayContext(entryDate: string, location = 'ALL'): Promise<DayContext> {
  const dayStart = `${entryDate}T00:00:00`;
  const dayEnd = `${entryDate}T23:59:59`;

  let itemsQ = supabase
    .from('clean_master')
    .select('trans_no, net_sales, qty, collection, location')
    .gte('transaction_date', dayStart)
    .lte('transaction_date', dayEnd);
  if (location !== 'ALL') itemsQ = itemsQ.eq('location', location);

  const { data: items, error } = await itemsQ;
  if (error) throw error;

  const transNos = [...new Set((items || []).map(i => i.trans_no).filter(Boolean))];

  const { data: metaRows } = transNos.length
    ? await supabase
        .from('transaction_records_meta')
        .select('trans_no, discount_given_reason, after_sales_support')
        .in('trans_no', transNos)
    : { data: [] as any[] };

  const netSales = (items || []).reduce((s, i) => s + (i.net_sales || 0), 0);
  const qty = (items || []).reduce((s, i) => s + (i.qty || 0), 0);

  const collMap = new Map<string, number>();
  (items || []).forEach(i => {
    if (!i.collection) return;
    collMap.set(i.collection, (collMap.get(i.collection) || 0) + (i.net_sales || 0));
  });
  const topCollections = [...collMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, net]) => ({ name, net }));

  const reasonMap = new Map<string, number>();
  let afterSalesCount = 0;
  (metaRows || []).forEach((m: any) => {
    if (m.discount_given_reason?.trim()) {
      reasonMap.set(m.discount_given_reason, (reasonMap.get(m.discount_given_reason) || 0) + 1);
    }
    if (m.after_sales_support?.trim()) afterSalesCount++;
  });
  const discountReasons = [...reasonMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));

  return {
    netSales,
    qty,
    transCount: transNos.length,
    topCollections,
    discountReasons,
    afterSalesCount,
  };
}

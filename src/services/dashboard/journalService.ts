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

export interface DailyTrafficStat {
  doorTraffic: number;      // from footfall_store
  totalCrm: number;         // non-repair commercial visitors
  uniqueCrm: number;        // distinct customer/phone
  walkIn: number;           // Walk In
  followUp: number;         // Follow Up
  inHouse: number;          // In House / Resort (Bali)
  other: number;            // Online Only, Delivery, etc.
}

export interface DayVisitor {
  id: number;
  customerName: string;
  servedBy?: string;
  status: string;
  prospectItem?: string;
  notes?: string;
  location?: string;
}

export interface DayContext {
  netSales: number;
  qty: number;
  transCount: number;
  topCollections: { name: string; net: number }[];
  discountReasons: { reason: string; count: number }[];
  afterSalesCount: number;
  traffic?: DailyTrafficStat;
  visitors?: DayVisitor[];
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Fetch monthly footfall and CRM commercial traffic (excluding repair)
 * aggregated day-by-day.
 */
export async function getMonthlyTraffic(
  month: number,
  year: number,
  location = 'ALL'
): Promise<Record<number, DailyTrafficStat>> {
  const lastDay = new Date(year, month, 0).getDate();
  const from = `${year}-${pad(month)}-01T00:00:00`;
  const to = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59`;
  const fromDateOnly = `${year}-${pad(month)}-01`;
  const toDateOnly = `${year}-${pad(month)}-${pad(lastDay)}`;

  let crmQ = supabase
    .from('mirror_traffic')
    .select('id, transaction_date, tanggal_berkunjung, location, status, no_hp, customer_name')
    .gte('transaction_date', from)
    .lte('transaction_date', to)
    .not('status', 'ilike', '%repair%');
  if (location !== 'ALL') crmQ = crmQ.eq('location', location);

  let footfallQ = supabase
    .from('footfall_store')
    .select('transaction_date, location, traffic_in')
    .gte('transaction_date', fromDateOnly)
    .lte('transaction_date', toDateOnly);
  if (location !== 'ALL') footfallQ = footfallQ.eq('location', location);

  const [{ data: crmRows, error: crmErr }, { data: footfallRows, error: footfallErr }] = await Promise.all([
    crmQ,
    footfallQ,
  ]);

  if (crmErr) console.warn('Error fetching mirror_traffic:', crmErr);
  if (footfallErr) console.warn('Error fetching footfall_store:', footfallErr);

  const result: Record<number, DailyTrafficStat & { _ids: Set<string> }> = {};
  for (let d = 1; d <= lastDay; d++) {
    result[d] = {
      doorTraffic: 0,
      totalCrm: 0,
      uniqueCrm: 0,
      walkIn: 0,
      followUp: 0,
      inHouse: 0,
      other: 0,
      _ids: new Set<string>(),
    };
  }

  (footfallRows || []).forEach((f: any) => {
    if (!f.transaction_date) return;
    const day = parseInt(f.transaction_date.slice(8, 10), 10);
    if (day && result[day]) {
      result[day].doorTraffic += Number(f.traffic_in) || 0;
    }
  });

  (crmRows || []).forEach((r: any) => {
    const rawDate = r.tanggal_berkunjung || r.transaction_date || '';
    const day = parseInt(rawDate.slice(8, 10), 10);
    if (!day || !result[day]) return;

    const st = result[day];
    st.totalCrm++;

    const identifier = (r.no_hp && r.no_hp.trim()) || (r.customer_name && r.customer_name.trim()) || `id_${r.id}`;
    st._ids.add(identifier);

    const rawStatus = (r.status || '').replace(/\u00a0/g, ' ').trim().toLowerCase();
    if (rawStatus.includes('walk in') || rawStatus === 'walk-in') {
      st.walkIn++;
    } else if (rawStatus.includes('follow up') || rawStatus === 'follow-up') {
      st.followUp++;
    } else if (rawStatus.includes('in house') || rawStatus.includes('in-house') || rawStatus.includes('outsider')) {
      st.inHouse++;
    } else {
      st.other++;
    }
  });

  const finalMap: Record<number, DailyTrafficStat> = {};
  for (let d = 1; d <= lastDay; d++) {
    const st = result[d];
    finalMap[d] = {
      doorTraffic: st.doorTraffic,
      totalCrm: st.totalCrm,
      uniqueCrm: st._ids.size,
      walkIn: st.walkIn,
      followUp: st.followUp,
      inHouse: st.inHouse,
      other: st.other,
    };
  }

  return finalMap;
}

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
 * captured in Invoice Management (discount reasons, after-sales support) and
 * CRM commercial traffic / visitors breakdown.
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

  let crmQ = supabase
    .from('mirror_traffic')
    .select('id, transaction_date, tanggal_berkunjung, location, status, no_hp, customer_name, served_by, customer_advisor, prospect_item, notes')
    .gte('transaction_date', dayStart)
    .lte('transaction_date', dayEnd)
    .not('status', 'ilike', '%repair%');
  if (location !== 'ALL') crmQ = crmQ.eq('location', location);

  let footfallQ = supabase
    .from('footfall_store')
    .select('traffic_in')
    .eq('transaction_date', entryDate);
  if (location !== 'ALL') footfallQ = footfallQ.eq('location', location);

  const [{ data: items, error }, { data: crmRows }, { data: ffRows }] = await Promise.all([
    itemsQ,
    crmQ,
    footfallQ,
  ]);
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

  // Process Traffic & Visitors
  const doorTraffic = (ffRows || []).reduce((s: number, r: any) => s + (Number(r.traffic_in) || 0), 0);
  let walkIn = 0;
  let followUp = 0;
  let inHouse = 0;
  let other = 0;
  const phoneSet = new Set<string>();
  const visitors: DayVisitor[] = [];

  (crmRows || []).forEach((r: any) => {
    const rawStatus = (r.status || '').replace(/\u00a0/g, ' ').trim().toLowerCase();
    const identifier = (r.no_hp && r.no_hp.trim()) || (r.customer_name && r.customer_name.trim()) || `id_${r.id}`;
    phoneSet.add(identifier);

    if (rawStatus.includes('walk in') || rawStatus === 'walk-in') {
      walkIn++;
    } else if (rawStatus.includes('follow up') || rawStatus === 'follow-up') {
      followUp++;
    } else if (rawStatus.includes('in house') || rawStatus.includes('in-house') || rawStatus.includes('outsider')) {
      inHouse++;
    } else {
      other++;
    }

    visitors.push({
      id: r.id,
      customerName: r.customer_name || 'Anonymous Customer',
      servedBy: r.customer_advisor || r.served_by || undefined,
      status: r.status?.replace(/\u00a0/g, ' ').trim() || 'Visit',
      prospectItem: r.prospect_item || undefined,
      notes: r.notes || undefined,
      location: r.location || undefined,
    });
  });

  const traffic: DailyTrafficStat = {
    doorTraffic,
    totalCrm: (crmRows || []).length,
    uniqueCrm: phoneSet.size,
    walkIn,
    followUp,
    inHouse,
    other,
  };

  return {
    netSales,
    qty,
    transCount: transNos.length,
    topCollections,
    discountReasons,
    afterSalesCount,
    traffic,
    visitors,
  };
}

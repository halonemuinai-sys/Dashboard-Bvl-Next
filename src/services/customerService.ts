import { supabase } from '@/lib/supabase';

export type Segment = 'Top' | 'Elite' | 'High Potential' | 'Potential' | 'Prospect' | 'Inactive';

const THRESHOLDS = {
  TOP:            1_350_000_000,
  ELITE:            200_000_000,
  HIGH_POTENTIAL:    50_000_000,
  INACTIVE_DAYS:            730,
};

export const SEGMENT_ORDER: Segment[] = [
  'Top', 'Elite', 'High Potential', 'Potential', 'Prospect', 'Inactive',
];

export const SEGMENT_CFG: Record<Segment, {
  color: string; bg: string; text: string; border: string;
}> = {
  'Top':           { color: '#92400e', bg: 'bg-amber-900',      text: 'text-amber-300',   border: 'border-amber-700' },
  'Elite':         { color: '#9333ea', bg: 'bg-purple-100',     text: 'text-purple-700',  border: 'border-purple-200' },
  'High Potential':{ color: '#0d9488', bg: 'bg-teal-100',       text: 'text-teal-700',    border: 'border-teal-200' },
  'Potential':     { color: '#2563eb', bg: 'bg-blue-100',       text: 'text-blue-700',    border: 'border-blue-200' },
  'Prospect':      { color: '#94a3b8', bg: 'bg-slate-100',      text: 'text-slate-500',   border: 'border-slate-200' },
  'Inactive':      { color: '#e11d48', bg: 'bg-rose-100',       text: 'text-rose-700',    border: 'border-rose-200' },
};

// Pie / donut chart colors mapped by segment
export const SEGMENT_DONUT_COLOR: Record<Segment, string> = {
  'Top':            '#1e293b',
  'Elite':          '#9333ea',
  'High Potential': '#0d9488',
  'Potential':      '#2563eb',
  'Prospect':       '#94a3b8',
  'Inactive':       '#e11d48',
};

export interface CustomerProfile {
  name: string;
  segment: Segment;
  freqInvoice: number;
  freqQty: number;
  recencyDays: number;
  ltv: number;
  firstVisit: string;
  lastVisit: string;
}

function classifySegment(spend: number, recencyDays: number): Segment {
  if (recencyDays > THRESHOLDS.INACTIVE_DAYS) return 'Inactive';
  if (spend > THRESHOLDS.TOP)                 return 'Top';
  if (spend >= THRESHOLDS.ELITE)              return 'Elite';
  if (spend >= THRESHOLDS.HIGH_POTENTIAL)     return 'High Potential';
  if (spend > 0)                              return 'Potential';
  return 'Prospect';
}

const isGroup = (name: string) => {
  const l = name.toLowerCase();
  return l.includes('group') || l.includes('corp') || l.includes('company') || l.includes('pt ');
};

const isInvalid = (name: string) => {
  if (!name || !name.trim()) return true;
  const l = name.toLowerCase().trim();
  return ['customer', 'n/a', '-', 'walk in', 'walkin', 'tamu', 'guest'].includes(l);
};

export const customerService = {

  async getSegmentationOverview(year: number) {
    const today = new Date();
    const [{ data: allRows, error }, { data: yearRows }] = await Promise.all([
      supabase
        .from('clean_master')
        .select('customer, transaction_date, net_sales, qty, trans_no')
        .order('transaction_date', { ascending: true }),
      supabase
        .from('clean_master')
        .select('customer, transaction_date, net_sales, trans_no')
        .gte('transaction_date', `${year}-01-01`)
        .lte('transaction_date', `${year}-12-31`),
    ]);
    if (error) throw error;

    // ── Build lifetime profiles ──────────────────────────────────────────
    type Profile = {
      name: string; totalSpend: number; totalQty: number;
      txSet: Set<string>; firstDate: Date; lastDate: Date; firstYear: number;
    };
    const pMap = new Map<string, Profile>();

    for (const r of allRows || []) {
      const name = (r.customer || '').trim();
      if (isInvalid(name)) continue;
      const d   = new Date(r.transaction_date);
      const net = r.net_sales || 0;
      if (!pMap.has(name)) {
        pMap.set(name, { name, totalSpend: 0, totalQty: 0,
          txSet: new Set(), firstDate: d, lastDate: d, firstYear: d.getFullYear() });
      }
      const p = pMap.get(name)!;
      p.totalSpend += net;
      p.totalQty   += r.qty || 0;
      if (r.trans_no) p.txSet.add(r.trans_no);
      if (d < p.firstDate) { p.firstDate = d; p.firstYear = d.getFullYear(); }
      if (d > p.lastDate)  p.lastDate = d;
    }

    // ── Classify & build customer list ───────────────────────────────────
    const segCounts = Object.fromEntries(SEGMENT_ORDER.map(s => [s, 0])) as Record<Segment, number>;
    const customers: CustomerProfile[] = [];

    let totalActiveCustomers = 0;
    let totalSpendActive     = 0;
    let topSpender           = { name: '', spend: 0 };
    let newCustomersCount    = 0;

    pMap.forEach(p => {
      const recencyDays = Math.floor((today.getTime() - p.lastDate.getTime()) / 86_400_000);
      const segment     = classifySegment(p.totalSpend, recencyDays);
      segCounts[segment]++;

      const isActive = recencyDays <= THRESHOLDS.INACTIVE_DAYS;
      if (isActive) {
        totalActiveCustomers++;
        totalSpendActive += p.totalSpend;
        if (!isGroup(p.name) && p.totalSpend > topSpender.spend)
          topSpender = { name: p.name, spend: p.totalSpend };
        if (p.firstYear === year) newCustomersCount++;
      }

      customers.push({
        name: p.name, segment,
        freqInvoice: p.txSet.size,
        freqQty:     p.totalQty,
        recencyDays,
        ltv:         p.totalSpend,
        firstVisit:  p.firstDate.toISOString().slice(0, 10),
        lastVisit:   p.lastDate.toISOString().slice(0, 10),
      });
    });

    customers.sort((a, b) => b.ltv - a.ltv);

    const kpi = {
      totalActiveCustomers,
      avgLtv:          totalActiveCustomers > 0 ? totalSpendActive / totalActiveCustomers : 0,
      topSpender,
      newCustomerRatio: totalActiveCustomers > 0 ? (newCustomersCount / totalActiveCustomers) * 100 : 0,
    };

    // ── Revenue Mix (new = single-invoice customers, repeat = multi) ─────
    const singleBuyers  = new Set<string>();
    const repeatBuyers  = new Set<string>();
    pMap.forEach(p => {
      if (p.txSet.size <= 1) singleBuyers.add(p.name);
      else repeatBuyers.add(p.name);
    });

    let newRevenue = 0, repeatRevenue = 0;
    for (const r of yearRows || []) {
      const name = (r.customer || '').trim();
      if (isInvalid(name)) continue;
      const net = r.net_sales || 0;
      if (singleBuyers.has(name))  newRevenue    += net;
      else if (repeatBuyers.has(name)) repeatRevenue += net;
    }

    // ── Monthly Acquisition Trend ─────────────────────────────────────────
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const firstMonthInYear: Record<string, number> = {};
    const sortedYear = [...(yearRows || [])].sort((a, b) =>
      a.transaction_date.localeCompare(b.transaction_date));
    for (const r of sortedYear) {
      const name = (r.customer || '').trim();
      if (isInvalid(name) || firstMonthInYear[name] !== undefined) continue;
      firstMonthInYear[name] = new Date(r.transaction_date).getMonth();
    }

    const seenThisMonth = new Map<string, Set<number>>();
    const monthlyNew    = new Array(12).fill(0);
    const monthlyRepeat = new Array(12).fill(0);
    for (const r of yearRows || []) {
      const name = (r.customer || '').trim();
      if (isInvalid(name)) continue;
      const m = new Date(r.transaction_date).getMonth();
      if (!seenThisMonth.has(name)) seenThisMonth.set(name, new Set());
      const mSet = seenThisMonth.get(name)!;
      if (mSet.has(m)) continue;
      mSet.add(m);
      if (firstMonthInYear[name] === m) monthlyNew[m]++;
      else monthlyRepeat[m]++;
    }

    const growthTrend = MONTHS.map((month, i) => ({
      month, new: monthlyNew[i], repeat: monthlyRepeat[i],
    }));

    const segmentDistribution = SEGMENT_ORDER.map(seg => ({
      name: seg,
      count: segCounts[seg],
      color: SEGMENT_DONUT_COLOR[seg],
    }));

    return { kpi, customers, segmentDistribution, revenueMix: { newRevenue, repeatRevenue }, growthTrend };
  },

  async getCustomerDetail(name: string) {
    const { data, error } = await supabase
      .from('clean_master')
      .select('transaction_date, net_sales, qty, trans_no, location, main_category, collection')
      .eq('customer', name)
      .order('transaction_date', { ascending: false });
    if (error) throw error;

    const rows = data || [];

    const collMap: Record<string, { value: number; qty: number }> = {};
    for (const r of rows) {
      const col = (r.collection || 'Uncategorized').trim() || 'Uncategorized';
      if (!collMap[col]) collMap[col] = { value: 0, qty: 0 };
      collMap[col].value += r.net_sales || 0;
      collMap[col].qty   += r.qty || 0;
    }

    const topCollections = Object.entries(collMap)
      .map(([col, d]) => ({ name: col, value: d.value, qty: d.qty }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const totalSpend = rows.reduce((s, r) => s + (r.net_sales || 0), 0);
    const totalQty   = rows.reduce((s, r) => s + (r.qty || 0), 0);
    const dates      = rows.map(r => r.transaction_date).sort();

    return {
      transactions: rows.map(r => ({
        date:       r.transaction_date,
        qty:        r.qty || 0,
        collection: (r.collection   || '—').trim(),
        category:   (r.main_category || '—').trim(),
        location:   (r.location      || '—').trim(),
        netSales:   r.net_sales || 0,
        transNo:    r.trans_no  || '',
      })),
      topCollections,
      kpi: {
        totalSpend,
        totalQty,
        firstVisit: dates[0]               || '—',
        lastVisit:  dates[dates.length - 1] || '—',
      },
    };
  },
};

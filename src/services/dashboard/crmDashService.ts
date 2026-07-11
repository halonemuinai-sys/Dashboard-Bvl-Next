import { supabase } from '@/lib/supabase';
import type { CrmProfilingRow } from './types';

export async function getCrmProfiling(search = '', store = ''): Promise<CrmProfilingRow[]> {
  let q = supabase.from('crm_profiling').select('*').order('created_at', { ascending: false });
  if (store) q = q.eq('lokasi_store', store);
  if (search) {
    q = q.or(
      `nama_lengkap.ilike.%${search}%,no_hp.ilike.%${search}%,customer_advisor.ilike.%${search}%,nama_panggilan.ilike.%${search}%`
    );
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as CrmProfilingRow[];
}

export async function getEventSellingPlan(profile: CrmProfilingRow) {
  const name = profile.nama_lengkap || `${profile.nama_depan} ${profile.nama_belakang}`.trim();
  const { data, error } = await supabase
    .from('clean_master')
    .select('trans_no,transaction_date,customer,location,net_sales,gross_sales,sap_code,collection,main_category,qty,catalogue_code')
    .ilike('customer', `%${name}%`)
    .order('net_sales', { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data || []) as {
    trans_no: string; transaction_date: string; customer: string;
    location: string; net_sales: number; gross_sales: number;
    sap_code: string; collection: string; main_category: string;
    qty: number; catalogue_code: string;
  }[];
}

export async function getClientelingData(year: number) {
  const today    = new Date();
  const INACTIVE = 730;   // days = 24 months
  const LAPSED_MIN = 180; // 6 months
  const VIP_MIN = 50_000_000;

  const TIER_ORDER = ['Top', 'Elite', 'High Potential', 'Potential', 'Prospect', 'Inactive'];

  const isInvalid = (name: string) => {
    if (!name?.trim()) return true;
    const l = name.toLowerCase().trim();
    return ['customer','n/a','-','walk in','walkin','tamu','guest'].includes(l);
  };

  const classifyTier = (spend: number, recencyDays: number): string => {
    if (recencyDays > INACTIVE)      return 'Inactive';
    if (spend >= 1_350_000_000)       return 'Top';
    if (spend >= 200_000_000)         return 'Elite';
    if (spend >= VIP_MIN)             return 'High Potential';
    if (spend > 0)                    return 'Potential';
    return 'Prospect';
  };

  // Fetch all + current year + prev year in parallel
  const [{ data: allRows, error }, { data: yearRows }, { data: pyRows }] = await Promise.all([
    supabase.from('clean_master')
      .select('customer, transaction_date, net_sales, qty, trans_no, location, main_category')
      .order('transaction_date', { ascending: true }),
    supabase.from('clean_master')
      .select('customer, transaction_date, net_sales, trans_no, location')
      .gte('transaction_date', `${year}-01-01`).lte('transaction_date', `${year}-12-31`),
    supabase.from('clean_master')
      .select('customer, transaction_date, net_sales, trans_no')
      .gte('transaction_date', `${year - 1}-01-01`).lte('transaction_date', `${year - 1}-12-31`),
  ]);
  if (error) throw error;

  // ── Build lifetime customer profiles ─────────────────────────────
  type Profile = {
    name: string; totalSpend: number; totalQty: number;
    txSet: Set<string>; firstDate: Date; lastDate: Date;
    locSpend: Record<string, number>;
    yearSpend: Record<number, number>;
  };
  const pMap = new Map<string, Profile>();

  for (const r of allRows || []) {
    const name = (r.customer || '').trim();
    if (isInvalid(name)) continue;
    const d   = new Date(r.transaction_date);
    const net = r.net_sales || 0;
    const yr  = d.getFullYear();
    const loc = (r.location || '').trim();

    if (!pMap.has(name)) {
      pMap.set(name, { name, totalSpend: 0, totalQty: 0,
        txSet: new Set(), firstDate: d, lastDate: d,
        locSpend: {}, yearSpend: {} });
    }
    const p = pMap.get(name)!;
    p.totalSpend += net;
    p.totalQty   += r.qty || 0;
    if (r.trans_no) p.txSet.add(r.trans_no);
    if (d < p.firstDate) p.firstDate = d;
    if (d > p.lastDate)  p.lastDate  = d;
    p.locSpend[loc]  = (p.locSpend[loc]  || 0) + net;
    p.yearSpend[yr]  = (p.yearSpend[yr]  || 0) + net;
  }

  // ── Classify + build derived fields ──────────────────────────────
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const tierCounts:  Record<string, number> = {};
  const tierRevenue: Record<string, number> = {};
  for (const t of TIER_ORDER) { tierCounts[t] = 0; tierRevenue[t] = 0; }

  let totalActive = 0, totalRepeat = 0, totalNew = 0;
  let repeatRevenue = 0, newRevenue = 0;

  const allProfiles: {
    name: string; totalSpend: number; visits: number;
    recencyDays: number; tier: string; primaryLocation: string;
    firstVisit: string; lastVisit: string;
    yearSpend: Record<number, number>;
  }[] = [];

  pMap.forEach(p => {
    const recencyDays = Math.floor((today.getTime() - p.lastDate.getTime()) / 86_400_000);
    const tier        = classifyTier(p.totalSpend, recencyDays);
    const primaryLoc  = Object.entries(p.locSpend).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const isActive    = recencyDays <= INACTIVE;

    tierCounts[tier]++;
    tierRevenue[tier] += p.totalSpend;

    if (isActive) {
      totalActive++;
      if (p.txSet.size > 1) { totalRepeat++; repeatRevenue += p.totalSpend; }
      else                  { totalNew++;    newRevenue    += p.totalSpend; }
    }

    allProfiles.push({
      name: p.name, totalSpend: p.totalSpend, visits: p.txSet.size,
      recencyDays, tier, primaryLocation: primaryLoc,
      firstVisit: p.firstDate.toISOString().slice(0, 10),
      lastVisit:  p.lastDate.toISOString().slice(0, 10),
      yearSpend:  p.yearSpend,
    });
  });

  // ── KPIs ──────────────────────────────────────────────────────────
  const retentionRate = totalActive > 0 ? (totalRepeat / totalActive) * 100 : 0;
  const avgLtv        = totalActive > 0 ? (repeatRevenue + newRevenue) / totalActive : 0;
  const lapsedCount   = allProfiles.filter(p =>
    p.recencyDays >= LAPSED_MIN && p.recencyDays <= INACTIVE && p.totalSpend >= VIP_MIN
  ).length;

  // ── Top 50 clients ────────────────────────────────────────────────
  const topClients = [...allProfiles]
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 50)
    .map(p => ({ name: p.name, spend: p.totalSpend, visits: p.visits,
      recency: p.recencyDays, tier: p.tier, location: p.primaryLocation,
      firstVisit: p.firstVisit, lastVisit: p.lastVisit }));

  // ── Lapsed alerts ─────────────────────────────────────────────────
  const lapsedAlerts = allProfiles
    .filter(p => p.recencyDays >= LAPSED_MIN && p.recencyDays <= INACTIVE && p.totalSpend >= VIP_MIN)
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 30)
    .map(p => ({ name: p.name, spend: p.totalSpend, daysSince: p.recencyDays,
      lastVisit: p.lastVisit, tier: p.tier, location: p.primaryLocation }));

  // ── RFM buckets (active customers) ───────────────────────────────
  const active = allProfiles.filter(p => p.recencyDays <= INACTIVE);
  const recencyBuckets = { '0-30': 0, '31-90': 0, '91-180': 0, '181-365': 0, '365+': 0 };
  const freqBuckets    = { '1x': 0, '2-3x': 0, '4-6x': 0, '7-10x': 0, '10+x': 0 };
  for (const p of active) {
    const d = p.recencyDays;
    if      (d <= 30)  recencyBuckets['0-30']++;
    else if (d <= 90)  recencyBuckets['31-90']++;
    else if (d <= 180) recencyBuckets['91-180']++;
    else if (d <= 365) recencyBuckets['181-365']++;
    else               recencyBuckets['365+']++;

    const v = p.visits;
    if      (v === 1)   freqBuckets['1x']++;
    else if (v <= 3)    freqBuckets['2-3x']++;
    else if (v <= 6)    freqBuckets['4-6x']++;
    else if (v <= 10)   freqBuckets['7-10x']++;
    else                freqBuckets['10+x']++;
  }

  // ── Location loyalty ──────────────────────────────────────────────
  const locMap: Record<string, { active: number; spend: number }> = {};
  for (const p of active) {
    const loc = p.primaryLocation || '—';
    if (!locMap[loc]) locMap[loc] = { active: 0, spend: 0 };
    locMap[loc].active++;
    locMap[loc].spend += p.totalSpend;
  }
  const locationSummary = Object.entries(locMap)
    .map(([name, d]) => ({ name, active: d.active, spend: d.spend, avgSpend: d.active > 0 ? d.spend / d.active : 0 }))
    .sort((a, b) => b.spend - a.spend);

  // ── Tier migration (customers with spend in both years) ───────────
  const tierMigration: { name: string; from: string; to: string; prevSpend: number; currSpend: number; direction: string }[] = [];
  for (const p of allProfiles) {
    const prev = p.yearSpend[year - 1] || 0;
    const curr = p.yearSpend[year]     || 0;
    if (!prev || !curr) continue;
    const prevRecency = Math.floor((today.getTime() - new Date(p.lastVisit).getTime()) / 86_400_000);
    const fromTier = classifyTier(prev, INACTIVE - 1); // treat both as active for classification
    const toTier   = classifyTier(curr, prevRecency);
    if (fromTier === toTier) continue;
    const fromIdx = TIER_ORDER.indexOf(fromTier);
    const toIdx   = TIER_ORDER.indexOf(toTier);
    tierMigration.push({
      name: p.name, from: fromTier, to: toTier,
      prevSpend: prev, currSpend: curr,
      direction: toIdx < fromIdx ? 'up' : 'down', // lower index = higher tier
    });
  }
  tierMigration.sort((a, b) => b.currSpend - a.currSpend);

  // ── Monthly retention (current year) ──────────────────────────────
  // Determine which customers had their first-ever visit in current year
  const firstVisitYear: Record<string, number> = {};
  pMap.forEach((p, name) => { firstVisitYear[name] = p.firstDate.getFullYear(); });

  // Track unique customers per month in current year
  const monthNew      = new Array(12).fill(0);
  const monthReturning = new Array(12).fill(0);
  const seenMonth = new Map<string, Set<number>>();
  for (const r of (yearRows || []).sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))) {
    const name = (r.customer || '').trim();
    if (isInvalid(name)) continue;
    const m = new Date(r.transaction_date).getMonth();
    if (!seenMonth.has(name)) seenMonth.set(name, new Set());
    const ms = seenMonth.get(name)!;
    if (ms.has(m)) continue;
    ms.add(m);
    if (firstVisitYear[name] === year) monthNew[m]++;
    else                               monthReturning[m]++;
  }
  const retention = MONTH_SHORT.map((month, i) => ({ month, newCust: monthNew[i], returning: monthReturning[i] }));

  return {
    year,
    kpi: { totalActive, retentionRate, avgLtv, lapsedCount, repeatRevenue, newRevenue,
           repeatPct: totalActive > 0 ? (totalRepeat / totalActive) * 100 : 0,
           newPct:    totalActive > 0 ? (totalNew    / totalActive) * 100 : 0 },
    tierCounts,
    tierRevenue,
    topClients,
    lapsedAlerts,
    recencyBuckets,
    freqBuckets,
    locationSummary,
    tierMigration: tierMigration.slice(0, 20),
    retention,
  };
}

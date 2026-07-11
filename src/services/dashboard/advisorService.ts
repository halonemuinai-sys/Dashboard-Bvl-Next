import { supabase } from '@/lib/supabase';
import type { AdvisorPerformanceData, AdvisorRecord, AdvisorProfile, AdvisorRotation, AdvisorSetupData } from './types';
import { MONTH_NAMES } from './constants';

/**
 * Advisor Performance — Replicates calculateAdvisorPerformance() from GAS
 * Now fetches from 'advisors' and 'advisor_targets' tables for full parity.
 */
export async function getAdvisorPerformance(month: string, year: number): Promise<AdvisorPerformanceData> {
  const monthIndex = MONTH_NAMES.indexOf(month);
  const mStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01T00:00:00`;
  const mEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59).toISOString();

  // 1. Fetch Sales, Advisor Profiles, and Advisor Targets in parallel
  const [
    { data: salesRows, error: salesErr },
    { data: advisorProfiles },
    { data: advisorTargets },
    { data: storeTargets },
    { data: rotationRows }
  ] = await Promise.all([
    supabase
      .from('clean_master')
      .select('trans_no, transaction_date, salesman, location, main_category, net_sales, qty, type')
      .gte('transaction_date', mStart)
      .lte('transaction_date', mEnd),
    supabase.from('advisors').select('name, home_location'),
    supabase.from('advisor_targets').select('advisor_name, target_value').eq('year', year).eq('month_number', monthIndex + 1),
    supabase.from('targets').select('store_name, target_value').eq('year', year).eq('month_number', monthIndex + 1),
    supabase.from('advisor_rotations').select('advisor_name, assigned_location').eq('year', year).eq('month_number', monthIndex + 1)
  ]);

  if (salesErr) throw salesErr;
  const rows = salesRows || [];

  // 2. Maps for quick lookup
  const homeLocMap: Record<string, string> = {};
  advisorProfiles?.forEach(p => { homeLocMap[p.name.toLowerCase()] = p.home_location; });

  const rotationMap: Record<string, string> = {};
  rotationRows?.forEach(r => { rotationMap[r.advisor_name.toLowerCase()] = r.assigned_location; });

  const effectiveLoc = (key: string, fallback: string) => rotationMap[key] || homeLocMap[key] || fallback;

  const advTargetMap: Record<string, number> = {};
  advisorTargets?.forEach(t => { advTargetMap[t.advisor_name.toLowerCase()] = t.target_value || 0; });

  const storeTargetMap: Record<string, number> = {};
  storeTargets?.forEach(t => { storeTargetMap[t.store_name] = t.target_value || 0; });

  // 3. Aggregate store-level sales for contribution context
  const storeStats: Record<string, number> = {};
  let globalTarget = 0;
  storeTargets?.forEach(t => { if (!t.store_name.toLowerCase().includes('head office')) globalTarget += t.target_value || 0; });

  // 4. Aggregate Advisor Stats (Mirrors GAS logic)
  const advisorMap = new Map<string, {
    name: string; net: number; loc: string; target: number;
    categories: Record<string, { net: number; qty: number }>;
    transactions: Set<string>; productiveMonths: Set<number>;
    crossingNet: number; crossingQty: number;
  }>();

  rows.forEach(row => {
    const name = (row.salesman || '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    const loc = (row.location || '').trim();
    const cat = (row.main_category || 'Other').trim();
    const net = row.net_sales || 0;
    const qty = row.qty || 0;
    const isHO = loc.toLowerCase().includes('head office') || loc.toLowerCase() === 'ho';

    if (isHO) return;

    if (!storeStats[loc]) storeStats[loc] = 0;
    storeStats[loc] += net;

    if (!advisorMap.has(key)) {
      advisorMap.set(key, {
        name, net: 0, loc: effectiveLoc(key, loc), target: advTargetMap[key] || 0,
        categories: {}, transactions: new Set(), productiveMonths: new Set(),
        crossingNet: 0, crossingQty: 0
      });
    }

    const entry = advisorMap.get(key)!;
    entry.net += net;
    if (row.trans_no) entry.transactions.add(row.trans_no);
    entry.productiveMonths.add(new Date(row.transaction_date).getMonth());

    // Crossing Sale Detection: transLoc != homeLoc
    const homeLoc = effectiveLoc(key, '');
    if (homeLoc && loc.toLowerCase() !== homeLoc.toLowerCase()) {
      entry.crossingNet += net;
      entry.crossingQty += qty;
    }

    if (!entry.categories[cat]) entry.categories[cat] = { net: 0, qty: 0 };
    entry.categories[cat].net += net;
    entry.categories[cat].qty += qty;
  });

  // Ensure advisors with targets but no sales also show up
  advisorTargets?.forEach(t => {
    const key = t.advisor_name.toLowerCase();
    if (!advisorMap.has(key)) {
      advisorMap.set(key, {
        name: t.advisor_name, net: 0, loc: effectiveLoc(key, 'Unknown'), target: t.target_value || 0,
        categories: {}, transactions: new Set(), productiveMonths: new Set(),
        crossingNet: 0, crossingQty: 0
      });
    }
  });

  // 5. Build Final Records
  const results: AdvisorRecord[] = Array.from(advisorMap.values()).map(stats => {
    const storeTotal = storeStats[stats.loc] || 0;
    const storeTarget = storeTargetMap[stats.loc] || 0;
    const storeAchv = storeTarget > 0 ? (storeTotal / storeTarget) * 100 : 0;

    const catMix = Object.entries(stats.categories)
      .map(([cat, v]) => ({ category: cat, amount: v.net, qty: v.qty, pct: stats.net > 0 ? (v.net / stats.net) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);

    return {
      name: stats.name,
      location: stats.loc,
      netSales: stats.net,
      crossingNet: stats.crossingNet,
      crossingQty: stats.crossingQty,
      target: stats.target,
      achievement: stats.target > 0 ? (stats.net / stats.target) * 100 : 0,
      contribution: globalTarget > 0 ? (stats.net / globalTarget) * 100 : 0,
      transCount: stats.transactions.size,
      productiveMonths: stats.productiveMonths.size,
      categoryMix: catMix,
      storeData: {
        totalSales: storeTotal,
        target: storeTarget,
        achievement: storeAchv,
        status: storeAchv >= 100 ? 'Achieved' : storeAchv >= 85 ? 'On Track' : 'Risk',
        advisorContrib: storeTotal > 0 ? (stats.net / storeTotal) * 100 : 0
      }
    };
  });

  return {
    advisors: results.sort((a, b) => b.netSales - a.netSales),
    month, year
  };
}

/**
 * Annual YTD Advisor Performance — mirrors GAS getAnnualAdvisorData(year)
 * Aggregates full-year sales per advisor + sum of all 12-month targets
 */
export async function getAnnualAdvisorPerformance(year: number) {
  const yStart = `${year}-01-01T00:00:00`;
  const yEnd   = `${year}-12-31T23:59:59`;

  const [{ data: txRows, error }, { data: tgtRows }] = await Promise.all([
    supabase.from('clean_master')
      .select('transaction_date,location,net_sales,qty,salesman,trans_no')
      .gte('transaction_date', yStart).lte('transaction_date', yEnd),
    supabase.from('advisor_targets')
      .select('advisor_name,month_number,target_value').eq('year', year),
  ]);
  if (error) throw error;

  const isHO = (l: string) => l.toLowerCase().includes('head office') || l.toLowerCase() === 'ho';

  const advMap: Record<string, {
    name: string; location: string;
    netSales: number; qty: number;
    transactions: Set<string>; months: Set<number>;
  }> = {};
  let totalNet = 0;

  (txRows || []).forEach((r: { transaction_date: string; location: string; net_sales: number; qty: number; salesman: string; trans_no: string }) => {
    if (isHO(r.location || '')) return;
    const name = (r.salesman || '').trim();
    if (!name) return;
    const key  = name.toLowerCase();
    const net  = r.net_sales || 0;
    const mon  = new Date(r.transaction_date).getMonth() + 1;

    totalNet += net;
    if (!advMap[key]) advMap[key] = { name, location: (r.location || '').trim(), netSales: 0, qty: 0, transactions: new Set(), months: new Set() };
    advMap[key].netSales += net;
    advMap[key].qty      += r.qty || 0;
    if (r.trans_no) advMap[key].transactions.add(r.trans_no);
    advMap[key].months.add(mon);
  });

  // Target: sum all 12 months per advisor
  const tgtMap: Record<string, number> = {};
  (tgtRows || []).forEach((t: { advisor_name: string; target_value: number }) => {
    const key = (t.advisor_name || '').trim().toLowerCase();
    tgtMap[key] = (tgtMap[key] || 0) + (t.target_value || 0);
  });

  const advisors = Object.values(advMap).map(a => {
    const key    = a.name.toLowerCase();
    const target = tgtMap[key] || 0;
    return {
      name: a.name, location: a.location,
      netSales: a.netSales, qty: a.qty,
      transCount:       a.transactions.size,
      productiveMonths: a.months.size,
      target,
      achievement:  target > 0 ? (a.netSales / target) * 100 : 0,
      contribution: totalNet > 0 ? (a.netSales / totalNet) * 100 : 0,
    };
  }).sort((a, b) => b.achievement - a.achievement);

  return { year, advisors, totalNet };
}

/**
 * Advisor Setup — fetch all advisors + rotations for a given year
 */
export async function getAdvisorSetup(year: number): Promise<AdvisorSetupData> {
  const [{ data: advisors }, { data: rotations }, { data: targets }, { data: storeTargets }] = await Promise.all([
    supabase.from('advisors').select('name, home_location').order('name'),
    supabase.from('advisor_rotations').select('advisor_name, year, month_number, assigned_location').eq('year', year),
    supabase.from('advisor_targets').select('advisor_name, year, month_number, target_value').eq('year', year),
    supabase.from('targets').select('store_name, year, month_number, target_value').eq('year', year)
  ]);
  return {
    advisors: (advisors || []) as AdvisorProfile[],
    rotations: (rotations || []) as AdvisorRotation[],
    targets: (targets || []) as any[],
    storeTargets: (storeTargets || []) as any[]
  };
}

export async function updateAdvisorHomeBase(name: string, homeLocation: string): Promise<void> {
  const { error } = await supabase
    .from('advisors')
    .update({ home_location: homeLocation })
    .eq('name', name);
  if (error) throw error;
}

export async function saveRotation(advisorName: string, year: number, monthNumber: number, assignedLocation: string): Promise<void> {
  // 1. Coba update dulu
  const { data, error: updateErr } = await supabase
    .from('advisor_rotations')
    .update({ assigned_location: assignedLocation })
    .eq('advisor_name', advisorName)
    .eq('year', year)
    .eq('month_number', monthNumber)
    .select();

  if (updateErr) throw updateErr;

  // 2. Jika tidak ada baris yang terupdate (data belum ada) -> lakukan INSERT
  if (!data || data.length === 0) {
    const { error: insertErr } = await supabase
      .from('advisor_rotations')
      .insert({ advisor_name: advisorName, year, month_number: monthNumber, assigned_location: assignedLocation });

    if (insertErr) throw insertErr;
  }
}

export async function deleteRotation(advisorName: string, year: number, monthNumber: number): Promise<void> {
  const { error } = await supabase
    .from('advisor_rotations')
    .delete()
    .eq('advisor_name', advisorName)
    .eq('year', year)
    .eq('month_number', monthNumber);
  if (error) throw error;
}

export async function saveAdvisorTarget(advisorName: string, year: number, monthNumber: number, targetValue: number): Promise<void> {
  const { data, error: updateErr } = await supabase
    .from('advisor_targets')
    .update({ target_value: targetValue })
    .eq('advisor_name', advisorName)
    .eq('year', year)
    .eq('month_number', monthNumber)
    .select();

  if (updateErr) throw updateErr;

  if (!data || data.length === 0) {
    const { error: insertErr } = await supabase
      .from('advisor_targets')
      .insert({ advisor_name: advisorName, year, month_number: monthNumber, target_value: targetValue });

    if (insertErr) throw insertErr;
  }
}

export async function saveStoreTarget(storeName: string, year: number, monthNumber: number, targetValue: number): Promise<void> {
  const { data, error: updateErr } = await supabase
    .from('targets')
    .update({ target_value: targetValue })
    .eq('store_name', storeName)
    .eq('year', year)
    .eq('month_number', monthNumber)
    .select();

  if (updateErr) throw updateErr;

  if (!data || data.length === 0) {
    const { error: insertErr } = await supabase
      .from('targets')
      .insert({ store_name: storeName, year, month_number: monthNumber, target_value: targetValue });

    if (insertErr) throw insertErr;
  }
}

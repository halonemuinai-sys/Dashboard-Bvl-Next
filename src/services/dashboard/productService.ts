import { supabase } from '@/lib/supabase';

export async function getProductRank(month: number, year: number, store = 'ALL') {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const from = `${year}-${pad(month)}-01`;
  const to   = `${year}-${pad(month)}-${pad(lastDay)}`;

  let q = supabase.from('clean_master')
    .select('sap_code,main_category,collection,catalogue_code,qty,net_sales,location')
    .gte('transaction_date', from)
    .lte('transaction_date', to)
    .not('location', 'ilike', '%head office%');
  if (store !== 'ALL') q = q.eq('location', store);

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data || []) as {
    sap_code: string; main_category: string; collection: string;
    catalogue_code: string; qty: number; net_sales: number; location: string;
  }[];

  const sapMap:  Record<string, { sap: string; category: string; collection: string; qty: number; net: number }> = {};
  const catMap:  Record<string, { name: string; qty: number; net: number }> = {};
  const collMap: Record<string, { name: string; qty: number; net: number }> = {};
  const catMap2: Record<string, string> = {}; // dominant category per collection
  const catalogueMap: Record<string, { name: string; qty: number; net: number }> = {};

  rows.forEach(r => {
    const sap  = String(r.sap_code  || 'Unknown').trim();
    const cat  = String(r.main_category || 'Other').trim();
    const coll = String(r.collection    || 'Other').trim();
    const cat2 = String(r.catalogue_code || '-').trim();
    const qty  = Number(r.qty)       || 0;
    const net  = Number(r.net_sales) || 0;

    if (!sapMap[sap])  sapMap[sap]  = { sap, category: cat, collection: coll, qty: 0, net: 0 };
    sapMap[sap].qty += qty; sapMap[sap].net += net;

    if (!catMap[cat])  catMap[cat]  = { name: cat,  qty: 0, net: 0 };
    catMap[cat].qty += qty; catMap[cat].net += net;

    if (!collMap[coll]) collMap[coll] = { name: coll, qty: 0, net: 0 };
    collMap[coll].qty += qty; collMap[coll].net += net;
    if (!catMap2[coll] || net > 0) catMap2[coll] = cat;

    if (!catalogueMap[cat2]) catalogueMap[cat2] = { name: cat2, qty: 0, net: 0 };
    catalogueMap[cat2].qty += qty; catalogueMap[cat2].net += net;
  });

  const byNet = (a: { net: number }, b: { net: number }) => b.net - a.net;
  const byQty = (a: { qty: number }, b: { qty: number }) => b.qty - a.qty;

  const topSapVal    = Object.values(sapMap).sort(byNet).slice(0, 20);
  const topSapQty    = Object.values(sapMap).sort(byQty).slice(0, 20);
  const topCat       = Object.values(catMap).sort(byNet);
  const topColl      = Object.values(collMap).sort(byNet).slice(0, 20)
    .map(c => ({ ...c, dominantCat: catMap2[c.name] || '' }));
  const topCatalogue = Object.values(catalogueMap).sort(byNet).slice(0, 20);

  return {
    topSapVal, topSapQty, topCat, topColl, topCatalogue,
    kpi: {
      topProductByVal: topSapVal[0] ?? null,
      topProductByQty: topSapQty[0] ?? null,
      topCategory:     topCat[0]    ?? null,
      topCollection:   topColl[0]   ?? null,
    },
  };
}

export async function getHeatmapData(month: number, year: number, store = 'ALL') {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const from = `${year}-${pad(month)}-01`;
  const to   = `${year}-${pad(month)}-${pad(lastDay)}`;

  let q = supabase.from('clean_master')
    .select('transaction_date,net_sales,qty,location')
    .gte('transaction_date', from)
    .lte('transaction_date', to)
    .not('location', 'ilike', '%head office%');
  if (store !== 'ALL') q = q.eq('location', store);

  const { data, error } = await q;
  if (error) throw error;

  const dailyStats: { net: number; qty: number }[] = Array.from(
    { length: lastDay }, () => ({ net: 0, qty: 0 })
  );

  (data || []).forEach((r: { transaction_date: string; net_sales: number; qty: number }) => {
    const day = new Date(r.transaction_date).getDate() - 1;
    if (day >= 0 && day < lastDay) {
      dailyStats[day].net += r.net_sales || 0;
      dailyStats[day].qty += r.qty       || 0;
    }
  });

  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  // Best / worst day (skip zero)
  let bestIdx = -1, worstIdx = -1;
  let bestNet = -Infinity, worstNet = Infinity;
  dailyStats.forEach((d, i) => {
    if (d.net > 0) {
      if (d.net > bestNet)  { bestNet  = d.net;  bestIdx  = i; }
      if (d.net < worstNet) { worstNet = d.net;  worstIdx = i; }
    }
  });

  // Best day of week (avg net by DOW)
  const dowNet   = new Array(7).fill(0);
  const dowCount = new Array(7).fill(0);
  dailyStats.forEach((d, i) => {
    if (d.net > 0) {
      const dow = (firstDayOfWeek + i) % 7;
      dowNet[dow]   += d.net;
      dowCount[dow] += 1;
    }
  });
  const DOW_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let bestDowIdx = 0, bestDowAvg = -1;
  dowNet.forEach((net, i) => {
    const avg = dowCount[i] > 0 ? net / dowCount[i] : 0;
    if (avg > bestDowAvg) { bestDowAvg = avg; bestDowIdx = i; }
  });

  const fmtDay = (idx: number) => {
    const d = new Date(year, month - 1, idx + 1);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  };

  return {
    dailyStats,
    lastDay,
    firstDayOfWeek,
    kpi: {
      bestDay:    bestIdx  >= 0 ? { label: fmtDay(bestIdx),  net: bestNet,  qty: dailyStats[bestIdx].qty  } : null,
      worstDay:   worstIdx >= 0 ? { label: fmtDay(worstIdx), net: worstNet, qty: dailyStats[worstIdx].qty } : null,
      bestDow:    DOW_NAMES[bestDowIdx],
      bestDowAvg: bestDowAvg > 0 ? bestDowAvg : 0,
    },
  };
}

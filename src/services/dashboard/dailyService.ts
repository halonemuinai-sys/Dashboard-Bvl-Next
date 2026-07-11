import { supabase } from '@/lib/supabase';
import { MONTH_NAMES } from './constants';

/**
 * Daily Report — Replicates calculateStoreDaily() + getDailyReportData() from GAS
 * Target source: targets table (mirrors master_target_store sheet)
 * MTD: all transactions from day 1 of month up to and including selected date
 */
export async function getDailyReport(dateStr: string) {
  const selected = new Date(dateStr);
  const year = selected.getFullYear();
  const monthIdx = selected.getMonth();
  const day = selected.getDate();
  const monthName = MONTH_NAMES[monthIdx];

  const mStart = `${year}-${String(monthIdx + 1).padStart(2, '0')}-01T00:00:00`;
  const mEnd   = new Date(year, monthIdx + 1, 0, 23, 59, 59).toISOString();

  const lastMonthDate = new Date(year, monthIdx - 1, 1);
  const lmYear = lastMonthDate.getFullYear();
  const lmMonthIdx = lastMonthDate.getMonth();
  const lmStart = `${lmYear}-${String(lmMonthIdx + 1).padStart(2, '0')}-01T00:00:00`;
  const lmEnd   = new Date(lmYear, lmMonthIdx + 1, 0, 23, 59, 59).toISOString();

  const mStartStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;
  const mEndStr   = new Date(year, monthIdx + 1, 0).toISOString().split('T')[0];

  const isPreJuly2026 = year < 2026 || (year === 2026 && monthIdx < 6);

  const [{ data: rows, error }, { data: lmRows }, { data: targetRows }, { data: stockRows }, { data: valuationRows }] = await Promise.all([
    supabase
      .from('clean_master')
      .select('transaction_date, location, main_category, net_sales, qty, cost, gross_sales, type, comm, val_disc')
      .gte('transaction_date', mStart)
      .lte('transaction_date', mEnd),
    supabase
      .from('clean_master')
      .select('transaction_date, location, net_sales')
      .gte('transaction_date', lmStart)
      .lte('transaction_date', lmEnd),
    supabase
      .from('targets')
      .select('store_name, target_value')
      .eq('year', year)
      .eq('month_number', monthIdx + 1),
    supabase
      .from('stock_store')
      .select('*')
      .eq('year', year),
    !isPreJuly2026
      ? supabase
          .from('inventory_valuation')
          .select('snapshot_date, location_name, location_code, main_category, collection_code, qoh')
          .gte('snapshot_date', mStartStr)
          .lte('snapshot_date', mEndStr)
      : Promise.resolve({ data: [], error: null } as any)
  ]);

  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const currentMonthKey = monthKeys[monthIdx];

  if (error) throw error;

  const normalizeCat = (c: string) => {
    const cu = c.toUpperCase();
    if (cu === 'JWL' || cu === 'JEWELRY') return 'Jewelry';
    if (cu === 'WTH' || cu === 'WATCHES') return 'Watches';
    if (cu === 'ACCS' || cu === 'ACCESSORIES') return 'Accessories';
    if (cu === 'PFM' || cu === 'PERFUME') return 'Perfume';
    return 'Other';
  };

  const normalizeStoreName = (nameOrCode: string) => {
    const trimmed = (nameOrCode || '').trim();
    if (trimmed === 'PI' || trimmed.toLowerCase() === 'plaza indonesia') return 'Plaza Indonesia';
    if (trimmed === 'PS' || trimmed.toLowerCase() === 'plaza senayan') return 'Plaza Senayan';
    if (trimmed === 'BL' || trimmed.toLowerCase() === 'bali') return 'Bali';
    if (trimmed === 'HO' || trimmed.toLowerCase() === 'head office') return 'Head Office';
    return trimmed;
  };

  const snapshotDates = isPreJuly2026
    ? []
    : Array.from(new Set((valuationRows || []).map((r: any) => r.snapshot_date))).sort();
  const earliestSnapshotDate = snapshotDates[0];

  const valStockMap: Record<string, Record<string, number>> = {};
  if (earliestSnapshotDate) {
    const earliestRows = (valuationRows || []).filter((r: any) => r.snapshot_date === earliestSnapshotDate);
    earliestRows.forEach((r: any) => {
      const loc = normalizeStoreName(r.location_name || r.location_code || '');
      const collCode = (r.collection_code || '').split(',')[0].trim().toUpperCase();
      const mainCat = (r.main_category || '').toUpperCase();

      if (collCode === 'PACK' || mainCat === 'PACK' || mainCat === 'PACKAGING') return;

      const cat = normalizeCat(r.main_category || '');
      if (cat === 'Perfume') return;
      if (cat === 'Other') return;

      if (!valStockMap[loc]) {
        valStockMap[loc] = { 'Jewelry': 0, 'Watches': 0, 'Accessories': 0, 'Perfume': 0 };
      }
      valStockMap[loc][cat] = (valStockMap[loc][cat] || 0) + (r.qoh || 0);
    });
  }

  const getOpeningStock = (storeName: string, category: string) => {
    const stdStore = normalizeStoreName(storeName);
    if (earliestSnapshotDate && valStockMap[stdStore] && valStockMap[stdStore][category] !== undefined) {
      return valStockMap[stdStore][category];
    }
    const stockRow = stockRows?.find(sr =>
      normalizeStoreName(sr.location) === stdStore &&
      normalizeCat(sr.category) === category
    );
    return stockRow ? (stockRow[currentMonthKey as keyof typeof stockRow] as number) : 0;
  };

  let globalTarget = 0;
  // Target map from Supabase
  const targetMap: Record<string, number> = {};
  targetRows?.forEach((t: any) => {
    targetMap[t.store_name] = t.target_value || 0;
    if (!t.store_name.toLowerCase().includes('head office') && t.store_name.toLowerCase() !== 'ho') {
      globalTarget += (t.target_value || 0);
    }
  });

  let globalStoreSales = 0;
  let globalHOSales = 0;
  let mtdGross = 0;
  let mtdComm = 0;
  let mtdValDisc = 0;

  type StoreAccum = {
    mtdNet: number; mtdQty: number;
    mtdGross: number; mtdComm: number; mtdValDisc: number;
    todayNet: number; todayQty: number;
    todayCost: number; todayGross: number;
    todayComm: number;
    todayRegNet: number; todaySmiNet: number;
    categories: Record<string, {
      qty: number;
      netNonSMI: number;
      netSMI: number;
      stock: number;
      valDisc: number;
      gross: number;
    }>;
  };
  const storeMap: Record<string, StoreAccum> = {};

  // normalizeCat moved to top

  (rows || []).forEach(row => {
    const loc = (row.location || '').trim();
    const net   = row.net_sales || 0;
    const isHO = loc.toLowerCase().includes('head office') || loc.toLowerCase() === 'ho';

    if (isHO) {
      // Accumulate HO sales up to the selected day
      const rowDate = new Date(row.transaction_date);
      if (rowDate.getDate() <= day) {
        globalHOSales += net;
      }
      return;
    }

    const rowDate = new Date(row.transaction_date);
    const rowDay = rowDate.getDate();
    if (rowDay > day) return; // Only MTD

    globalStoreSales += net;
    mtdGross += (row.gross_sales || 0);
    mtdComm += (row.comm || 0);
    mtdValDisc += (row.val_disc || 0);

    const qty   = row.qty || 0;
    const cost  = row.cost || 0;
    const gross = row.gross_sales || 0;
    const cat   = (row.main_category || 'Other').trim();
    const isSMI = (row.type || '').toUpperCase() === 'SMI';
    const isToday = rowDay === day;

    if (!storeMap[loc]) {
      storeMap[loc] = {
        mtdNet: 0, mtdQty: 0, mtdGross: 0, mtdComm: 0, mtdValDisc: 0,
        todayNet: 0, todayQty: 0,
        todayCost: 0, todayGross: 0, todayComm: 0,
        todayRegNet: 0, todaySmiNet: 0,
        categories: {}
      };
      // Pre-populate core categories
      const coreCats = ['Jewelry', 'Watches', 'Accessories', 'Perfume'];
      coreCats.forEach(c => {
        const openingStock = getOpeningStock(loc, c);
        storeMap[loc].categories[c] = { qty: 0, netNonSMI: 0, netSMI: 0, stock: openingStock, valDisc: 0, gross: 0 };
      });
    }

    const s = storeMap[loc];
    s.mtdNet += net;
    s.mtdQty += qty;
    s.mtdGross += gross;
    s.mtdComm += (row.comm || 0);
    s.mtdValDisc += (row.val_disc || 0);

    const normCat = normalizeCat(cat);
    if (!s.categories[normCat]) {
      // Find opening stock for this store/category
      const openingStock = getOpeningStock(loc, normCat);
      s.categories[normCat] = { qty: 0, netNonSMI: 0, netSMI: 0, stock: openingStock, valDisc: 0, gross: 0 };
    }

    // Deduct from stock (MTD)
    s.categories[normCat].stock = Math.max(0, s.categories[normCat].stock - qty);

    if (isToday) {
      s.todayNet += net;
      s.todayQty += qty;
      s.todayCost += cost;
      s.todayComm += (row.comm || 0);
      s.todayGross += gross;
      if (isSMI) s.todaySmiNet += net; else s.todayRegNet += net;

      s.categories[normCat].qty += qty;
      s.categories[normCat].valDisc += (row.val_disc || 0);
      s.categories[normCat].gross += gross;
      if (isSMI) s.categories[normCat].netSMI += net;
      else       s.categories[normCat].netNonSMI += net;
    }
  });

  // Calculate Last Month MTD for Growth
  let lmStoreSales = 0;
  (lmRows || []).forEach(row => {
    const loc = (row.location || '').trim();
    const isHO = loc.toLowerCase().includes('head office') || loc.toLowerCase() === 'ho';
    if (!isHO) {
      const rowDate = new Date(row.transaction_date);
      if (rowDate.getDate() <= day) {
        lmStoreSales += (row.net_sales || 0);
      }
    }
  });
  const storeSalesGrowth = lmStoreSales > 0 ? ((globalStoreSales - lmStoreSales) / lmStoreSales) * 100 : 0;
  const STORE_ORDER = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];
  const allStores = Array.from(new Set([
    ...STORE_ORDER.filter(s => storeMap[s] || targetMap[s]),
    ...Object.keys(storeMap).filter(s => !STORE_ORDER.includes(s)),
    ...Object.keys(targetMap).filter(s => !STORE_ORDER.includes(s) && !storeMap[s])
  ]));

  const storeResults = allStores.map(storeName => {
    const s = storeMap[storeName] || {
      mtdNet: 0, mtdQty: 0, mtdGross: 0, mtdComm: 0, mtdValDisc: 0,
      todayNet: 0, todayQty: 0,
      todayCost: 0, todayGross: 0, todayComm: 0,
      todayRegNet: 0, todaySmiNet: 0, categories: {}
    };

    // Ensure target-only stores also get categories pre-populated
    if (Object.keys(s.categories).length === 0) {
      const coreCats = ['Jewelry', 'Watches', 'Accessories', 'Perfume'];
      coreCats.forEach(c => {
        const openingStock = getOpeningStock(storeName, c);
        s.categories[c] = { qty: 0, netNonSMI: 0, netSMI: 0, stock: openingStock, valDisc: 0, gross: 0 };
      });
    }
    const target    = targetMap[storeName] || 0;
    const remaining = Math.max(0, target - s.mtdNet);
    const achievement = target > 0 ? (s.mtdNet / target) * 100 : 0;
    const todayTotal  = s.todayRegNet + s.todaySmiNet;
    const costPct     = s.todayGross > 0 ? (s.todayCost / s.todayGross) * 100 : 0;

    return {
      storeName,
      metrics: {
        mtdSales: s.mtdNet,
        mtdTotalQty: s.mtdQty,
        mtdCostPct: s.mtdGross > 0 ? ((s.mtdComm + s.mtdValDisc) / s.mtdGross) * 100 : 0,
        mtdMdrPct: s.mtdGross > 0 ? (s.mtdComm / s.mtdGross) * 100 : 0,
        avgDiscMtd: s.mtdGross > 0 ? (s.mtdValDisc / s.mtdGross) * 100 : 0,
        target,
        remaining,
        achievement,
        todaySales: s.todayNet,
        todayQty: s.todayQty,
        sellingCostTodayVal: s.todayCost,
        sellingCostTodayPct: costPct,
        mdrCostTodayVal: s.todayComm,
        mdrCostTodayPct: s.todayGross > 0 ? (s.todayComm / s.todayGross) * 100 : 0,
        regSalesTodayPct: todayTotal > 0 ? +((s.todayRegNet / todayTotal) * 100).toFixed(1) : 0,
        smiSalesTodayPct: todayTotal > 0 ? +((s.todaySmiNet / todayTotal) * 100).toFixed(1) : 0,
      },
      tableData: s.categories
    };
  });

  const mtdCostPct = mtdGross > 0 ? ((mtdComm + mtdValDisc) / mtdGross) * 100 : 0;
  const avgDiscMtd = mtdGross > 0 ? (mtdValDisc / mtdGross) * 100 : 0;
  const globalAchievement = globalTarget > 0 ? (globalStoreSales / globalTarget) * 100 : 0;

  return {
    date: dateStr,
    monthName,
    globalKPIs: {
      storeSales: globalStoreSales,
      totalSales: globalStoreSales + globalHOSales,
      globalTarget,
      globalAchievement,
      storeSalesGrowth,
      mtdCostPct,
      avgDiscMtd
    },
    stores: storeResults
  };
}

export async function getDailyBreakdown(month: string, year: number) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthIdx = MONTH_NAMES.indexOf(month);
  if (monthIdx === -1) throw new Error('Invalid month');
  const monthNum = monthIdx + 1;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const from = `${year}-${pad(monthNum)}-01T00:00:00`;
  const to   = `${year}-${pad(monthNum)}-${pad(lastDay)}T23:59:59`;

  const { data: rows, error } = await supabase
    .from('clean_master')
    .select('transaction_date, location, net_sales, qty')
    .gte('transaction_date', from)
    .lte('transaction_date', to);

  if (error) throw error;

  const daysData = Array.from({ length: lastDay }, (_, i) => {
    const dayNum = i + 1;
    const d = new Date(year, monthIdx, dayNum);
    const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = `${dayNum} ${month.slice(0, 3)} ${year}`;

    return {
      dayNum,
      dateStr,
      dayOfWeek,
      totalSales: 0,
      totalQty: 0,
      stores: {
        'Bali':            { netSales: 0, qty: 0 },
        'Head Office':     { netSales: 0, qty: 0 },
        'Plaza Indonesia': { netSales: 0, qty: 0 },
        'Plaza Senayan':   { netSales: 0, qty: 0 }
      }
    };
  });

  const getStoreKey = (loc: string) => {
    const l = loc.trim().toLowerCase();
    if (l.includes('head office') || l === 'ho') return 'Head Office';
    if (l.includes('plaza indonesia') || l === 'pi') return 'Plaza Indonesia';
    if (l.includes('plaza senayan') || l === 'ps') return 'Plaza Senayan';
    if (l.includes('bali') || l === 'bl') return 'Bali';
    return null;
  };

  (rows || []).forEach(row => {
    const rowDate = new Date(row.transaction_date);
    const dayNum = rowDate.getDate();
    if (dayNum >= 1 && dayNum <= lastDay) {
      const storeKey = getStoreKey(row.location || '');
      if (storeKey) {
        const net = row.net_sales || 0;
        const qty = row.qty || 0;
        const idx = dayNum - 1;

        daysData[idx].stores[storeKey].netSales += net;
        daysData[idx].stores[storeKey].qty += qty;
        daysData[idx].totalSales += net;
        daysData[idx].totalQty += qty;
      }
    }
  });

  return daysData;
}

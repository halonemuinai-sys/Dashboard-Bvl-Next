import { supabase } from '@/lib/supabase';
import type { MonthlyOverviewData, CategoryTrendData, StorePerformanceRow } from './types';
import { MONTH_NAMES } from './constants';

/**
 * Monthly Overview — Replicates getDashboardData() + aggregateOverview() from GAS
 */
export async function getMonthlyOverview(month: string, year: number): Promise<MonthlyOverviewData> {
  const monthIndex = MONTH_NAMES.indexOf(month);
  if (monthIndex === -1) throw new Error(`Invalid month: ${month}`);

  // --- 2. Fetch Multi-Year Data (2023-2026) for Comparison & Projection ---
  const startRange = `2023-01-01T00:00:00`;
  const endRange   = `2026-12-31T23:59:59`;

  const [
    { data: multiYearRows, error: multiYearErr },
    { data: allTargetRows },
    { data: advisorProfiles },
    { data: rotationRows }
  ] = await Promise.all([
    supabase
      .from('clean_master')
      .select('transaction_date, location, net_sales, gross_sales, val_disc, cost, qty, main_category, trans_no, customer, salesman, comm')
      .gte('transaction_date', startRange)
      .lte('transaction_date', endRange),
    supabase
      .from('targets')
      .select('year, month_number, target_value, store_name')
      .gte('year', 2023)
      .lte('year', 2026),
    supabase.from('advisors').select('name, home_location'),
    supabase.from('advisor_rotations').select('advisor_name, assigned_location')
      .eq('year', year)
      .eq('month_number', monthIndex + 1)
  ]);

  if (multiYearErr) throw multiYearErr;

  // --- 3. Process Multi-Year Stats & Projections ---
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const multiYearStats: Record<number, number[]> = {
    2023: new Array(12).fill(0),
    2024: new Array(12).fill(0),
    2025: new Array(12).fill(0),
    2026: new Array(12).fill(0)
  };

  // A. Fill with Actual Sales (Retail only — exclude HO)
  multiYearRows?.forEach(row => {
    const loc = (row.location || '').trim().toLowerCase();
    if (loc.includes('head office')) return;
    const d = new Date(row.transaction_date);
    const rYear = d.getFullYear();
    const rMonth = d.getMonth();
    if (multiYearStats[rYear]) {
      multiYearStats[rYear][rMonth] += (row.net_sales || 0);
    }
  });

  // B. Fill Projection for 2026 (Current Year)
  // For future months, we use Target as the "Projection"
  const monthlyTargetTotals: Record<number, Record<number, number>> = {};
  allTargetRows?.forEach(t => {
    if (!monthlyTargetTotals[t.year]) monthlyTargetTotals[t.year] = {};
    if (!monthlyTargetTotals[t.year][t.month_number - 1]) monthlyTargetTotals[t.year][t.month_number - 1] = 0;

    // Exclude HO from target projection if needed (usually retail focus)
    if (!t.store_name.toLowerCase().includes('head office')) {
      monthlyTargetTotals[t.year][t.month_number - 1] += (t.target_value || 0);
    }
  });

  // Apply projection to 2026 future months
  for (let m = 0; m < 12; m++) {
    // If it's a future month in the current year, or current year has 0 sales for that month
    if (m > currentMonthIdx || (multiYearStats[currentYear][m] === 0 && m >= currentMonthIdx)) {
      const targetForMonth = monthlyTargetTotals[currentYear]?.[m] || 0;
      if (targetForMonth > 0) {
        multiYearStats[currentYear][m] = targetForMonth;
      }
    }
  }

  // --- 4. Fetch Targets for the selected month (UI Cards) ---
  const targetMap: Record<string, number> = {};
  let annualTargetExcHO = 0;

  allTargetRows?.forEach(t => {
    if (t.year === year) {
      const isHO = t.store_name.toLowerCase().includes('head office');
      if (!isHO) annualTargetExcHO += (t.target_value || 0);
      if (t.month_number === (monthIndex + 1)) {
        targetMap[t.store_name] = (t.target_value || 0);
      }
    }
  });

  // --- 5. SINGLE PASS AGGREGATION for Monthly Overview ---
  // (We filter the multiYearRows for the specific year and month to get the detailed KPIs)
  const yearData = multiYearRows?.filter(r => new Date(r.transaction_date).getFullYear() === year) || [];
  const rows = yearData;
  let annualSalesExcHO = 0;
  const crossingRecordMap = new Map<string, { salesman: string; baseLoc: string; crossingLoc: string; net: number; qty: number }>();
  const crossingResult = {
    totalNet: 0,
    totalQty: 0,
    storeStats: {
      "Plaza Indonesia": { physical: 0, adjusted: 0 },
      "Plaza Senayan": { physical: 0, adjusted: 0 },
      "Bali": { physical: 0, adjusted: 0 }
    } as Record<string, { physical: number; adjusted: number }>,
    records: [] as { salesman: string; baseLoc: string; crossingLoc: string; net: number; qty: number }[]
  };

  const validStores = ["plaza indonesia", "plaza senayan", "bali", "bali boutique"];

  const advisorMap = (advisorProfiles || []).reduce((acc: any, curr: any) => {
    acc[curr.name.toLowerCase()] = curr.home_location;
    return acc;
  }, {});

  const rotationMap = (rotationRows || []).reduce((acc: any, curr: any) => {
    acc[curr.advisor_name.toLowerCase()] = curr.assigned_location;
    return acc;
  }, {});

  const trendStats = Array.from({length: 12}, () => ({
    net: 0, qty: 0, transSet: new Set<string>(), custSet: new Set<string>()
  }));

  const categoryTrend: CategoryTrendData = {};
  const monthlyRows: typeof rows = [];
  const pmIdx = monthIndex === 0 ? 11 : monthIndex - 1;
  const pmYear = monthIndex === 0 ? year - 1 : year;

  let ytdQtyCurrent = 0, ytdQtyPrevYear = 0;
  const ytdTxSetCurrent = new Set<string>();
  const ytdTxSetPrevYear = new Set<string>();

  let mtdQtyCurrent = 0, mtdQtyPrevMonth = 0;
  const mtdTxSetCurrent = new Set<string>();
  const mtdTxSetPrevMonth = new Set<string>();
  let totalNet = 0, totalGross = 0, totalCost = 0, totalValDisc = 0, totalQty = 0;
  const storeStats: Record<string, { net: number; cost: number; qty: number }> = {};
  const catStats: Record<string, { qty: number; net: number }> = {};
  const dailyStats = Array.from({length: 31}, () => ({ net: 0, qty: 0 }));

  // Real MTD bounds for fair comparison
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && monthIndex === now.getMonth();
  const maxDay = isCurrentMonth ? now.getDate() : 31;

  rows.forEach(row => {
    const d = new Date(row.transaction_date);
    const rMonth = d.getMonth();
    const net = row.net_sales || 0;
    const qty = row.qty || 0;
    const loc = (row.location || '').trim();
    const cat = (row.main_category || 'Other').trim();
    const isHO = loc.toLowerCase().includes('head office');

    // A: Trend Stats
    trendStats[rMonth].net += net;
    trendStats[rMonth].qty += qty;
    if (row.trans_no) trendStats[rMonth].transSet.add(row.trans_no);
    if (row.customer && row.customer.toLowerCase() !== 'customer') trendStats[rMonth].custSet.add(row.customer);

    // C: Annual Sales Exc HO
    if (!isHO) annualSalesExcHO += net;

    // D: Category Trend
    if (!categoryTrend[cat]) categoryTrend[cat] = { net: new Array(12).fill(0), qty: new Array(12).fill(0) };
    categoryTrend[cat].net[rMonth] += net;
    categoryTrend[cat].qty[rMonth] += qty;

    // F: Crossing Sales & Mobility check (GAS Style)
    if (rMonth === monthIndex) {
      let tLoc = loc;
      const salesmanKey = (row.salesman || '').trim().toLowerCase();
      // Rotation takes precedence over home_location. Fallback to transaction location if unknown.
      let hLoc = (rotationMap[salesmanKey] || advisorMap[salesmanKey] || loc).trim();

      const tLocLower = tLoc.toLowerCase();
      const hLocLower = hLoc.toLowerCase();

      const isValidT = validStores.includes(tLocLower);
      const isValidH = validStores.includes(hLocLower);

      if (isValidT && isValidH) {
        // Normalize Bali
        const normT = (tLocLower === 'bali boutique') ? 'Bali' : (tLocLower === 'plaza indonesia' ? 'Plaza Indonesia' : (tLocLower === 'plaza senayan' ? 'Plaza Senayan' : 'Bali'));
        const normH = (hLocLower === 'bali boutique') ? 'Bali' : (hLocLower === 'plaza indonesia' ? 'Plaza Indonesia' : (hLocLower === 'plaza senayan' ? 'Plaza Senayan' : 'Bali'));

        if (crossingResult.storeStats[normT]) crossingResult.storeStats[normT].physical += net;
        if (crossingResult.storeStats[normH]) crossingResult.storeStats[normH].adjusted += net;

        if (tLocLower !== hLocLower) {
          crossingResult.totalNet += net;
          crossingResult.totalQty += qty;
          const salesman = row.salesman || 'Unknown';
          const cKey = `${salesman}||${normH}||${normT}`;
          if (crossingRecordMap.has(cKey)) {
            const r = crossingRecordMap.get(cKey)!;
            r.net += net;
            r.qty += qty;
          } else {
            crossingRecordMap.set(cKey, { salesman, baseLoc: normH, crossingLoc: normT, net, qty });
          }
        }
      }

      monthlyRows.push(row);
      totalNet += net;
      totalGross += (row.gross_sales || 0);
      totalCost += (row.cost || 0) + (row.comm || 0);
      totalValDisc += (row.val_disc || 0);
      totalQty += qty;

      if (!storeStats[loc]) storeStats[loc] = { net: 0, cost: 0, qty: 0 };
      storeStats[loc].net += net;
      storeStats[loc].cost += (row.cost || 0) + (row.comm || 0);
      storeStats[loc].qty += qty;

      if (!catStats[cat]) catStats[cat] = { qty: 0, net: 0 };
      catStats[cat].net += net;
      catStats[cat].qty += qty;

      const day = d.getDate() - 1;
      if (day >= 0 && day < 31) {
        dailyStats[day].net += net;
        dailyStats[day].qty += qty;
      }
    }
  });

  // MTD YoY & MoM calculation
  let currentMtd = 0, prevYearMtd = 0, prevMonthMtd = 0;

  monthlyRows.forEach(r => {
    const loc = (r.location || '').trim();
    if (!loc.toLowerCase().includes('head office')) {
      currentMtd += (r.net_sales || 0);
      // MTD Qty & Tx (Current)
      const d = new Date(r.transaction_date);
      if (d.getDate() <= maxDay) {
        mtdQtyCurrent += (r.qty || 0);
        if (r.trans_no) mtdTxSetCurrent.add(r.trans_no);
      }
    }
  });

  multiYearRows?.forEach(r => {
    const d = new Date(r.transaction_date);
    const loc = (r.location || '').trim();
    if (loc.toLowerCase().includes('head office')) return;

    const rYear = d.getFullYear();
    const rMonth = d.getMonth();
    const rDay = d.getDate();

    const qty = r.qty || 0;
    const tx = r.trans_no;

    // YTD Current Year (up to selected month)
    if (rYear === year) {
      if (rMonth < monthIndex) {
        ytdQtyCurrent += qty;
        if (tx) ytdTxSetCurrent.add(tx);
      } else if (rMonth === monthIndex && rDay <= maxDay) {
        ytdQtyCurrent += qty;
        if (tx) ytdTxSetCurrent.add(tx);
      }
    }

    // YTD Previous Year (up to selected month)
    if (rYear === (year - 1)) {
      if (rMonth < monthIndex) {
        ytdQtyPrevYear += qty;
        if (tx) ytdTxSetPrevYear.add(tx);
      } else if (rMonth === monthIndex && rDay <= maxDay) {
        ytdQtyPrevYear += qty;
        if (tx) ytdTxSetPrevYear.add(tx);
      }
    }

    // YoY Sales (Same Month, Previous Year)
    if (rYear === (year - 1) && rMonth === monthIndex && rDay <= maxDay) {
      prevYearMtd += (r.net_sales || 0);
    }

    // MoM Sales, Qty, Tx (Previous Month, Same/Adjusted Year)
    if (rYear === pmYear && rMonth === pmIdx && rDay <= maxDay) {
      prevMonthMtd += (r.net_sales || 0);
      mtdQtyPrevMonth += qty;
      if (tx) mtdTxSetPrevMonth.add(tx);
    }
  });

  // Build store performance array
  const allStoreNames = new Set([...Object.keys(storeStats), ...Object.keys(targetMap)]);
  let totalTarget = 0;
  const storeData: StorePerformanceRow[] = [];
  allStoreNames.forEach(store => {
    const actual = storeStats[store]?.net || 0;
    const cost = storeStats[store]?.cost || 0;
    const qtyS = storeStats[store]?.qty || 0;
    const target = targetMap[store] || 0;
    totalTarget += target;
    storeData.push({
      store, actual, cost, target, qty: qtyS,
      achievement: target > 0 ? (actual / target) * 100 : 0
    });
  });

  crossingResult.records = Array.from(crossingRecordMap.values()).sort((a, b) => b.net - a.net);

  const activeStores = storeData.filter(s => !s.store.toLowerCase().includes('head office'));
  const storeNetExcHO = activeStores.reduce((s, r) => s + r.actual, 0);
  const storeTargetExcHO = activeStores.reduce((s, r) => s + r.target, 0);

  return {
    kpi: {
      totalNet,
      totalTarget: storeTargetExcHO,
      totalQty,
      achievement: storeTargetExcHO > 0 ? (storeNetExcHO / storeTargetExcHO) * 100 : 0,
      totalCost,
      costPercentage: totalGross > 0 ? (totalCost / totalGross) * 100 : 0,
      totalValDisc,
      avgDiscountPercentage: totalGross > 0 ? (totalValDisc / totalGross) * 100 : 0,
      mtdSalesCurrent: currentMtd,
      mtdSalesPrevYear: prevYearMtd,
      mtdGrowthPct: prevYearMtd > 0 ? ((currentMtd - prevYearMtd) / prevYearMtd) * 100 : 0,
      momGrowthPct: prevMonthMtd > 0 ? ((currentMtd - prevMonthMtd) / prevMonthMtd) * 100 : 0,

      ytdQtyCurrent,
      ytdQtyPrevYear,
      ytdTxCurrent: ytdTxSetCurrent.size,
      ytdTxPrevYear: ytdTxSetPrevYear.size,
      mtdQtyCurrent,
      mtdQtyPrevMonth,
      mtdTxCurrent: mtdTxSetCurrent.size,
      mtdTxPrevMonth: mtdTxSetPrevMonth.size
    },
    annualStats: {
      salesExcHO: annualSalesExcHO,
      target: annualTargetExcHO,
      achievement: annualTargetExcHO > 0 ? (annualSalesExcHO / annualTargetExcHO) * 100 : 0
    },
    storeData,
    catData: catStats,
    trendData: trendStats.map(t => ({ net: t.net, qty: t.qty, trans: t.transSet.size, customers: t.custSet.size })),
    multiYearStats,
    categoryTrend,
    crossingData: crossingResult,
    advisorData: [], // Loaded separately via getAdvisorPerformance
    dailyTrendData: dailyStats.slice(0, new Date(year, monthIndex + 1, 0).getDate())
  };
}

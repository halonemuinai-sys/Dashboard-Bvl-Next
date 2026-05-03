import { supabase } from '@/lib/supabase';

// ==========================================
// --- TYPES (Matching GAS Output Exactly) ---
// ==========================================

export interface StorePerformanceRow {
  store: string;
  actual: number;
  cost: number;
  target: number;
  qty: number;
  achievement: number;
}

export interface MonthlyKpi {
  totalNet: number;        // Total Sales Inc. HO
  totalTarget: number;     // Sum of all store targets for the month
  totalQty: number;
  achievement: number;     // totalNet(exc HO) / totalTarget * 100
  totalCost: number;       // Nominal cost value
  costPercentage: number;  // totalCost / totalGross * 100
  totalValDisc: number;    // Nominal discount value
  avgDiscountPercentage: number; // totalValDisc / totalGross * 100
  mtdSalesCurrent: number;   // MTD store sales (exc HO)
  mtdSalesPrevYear: number;  // Same period last year
  mtdGrowthPct: number;      // YoY growth
  momGrowthPct: number;      // MoM growth (vs same period last month)
  
  // New metrics for Qty and Transactions (Items Sold & Transactions)
  ytdQtyCurrent: number;
  ytdQtyPrevYear: number;
  ytdTxCurrent: number;
  ytdTxPrevYear: number;
  mtdQtyCurrent: number;
  mtdQtyPrevMonth: number;
  mtdTxCurrent: number;
  mtdTxPrevMonth: number;
}

export interface AnnualStats {
  salesExcHO: number;
  target: number;
  achievement: number;
}

export interface TrendDataPoint {
  net: number;
  qty: number;
  trans: number;
  customers: number;
}

export interface CategoryTrendData {
  [category: string]: {
    net: number[];  // 12 months
    qty: number[];  // 12 months
  };
}

export interface MonthlyOverviewData {
  kpi: MonthlyKpi;
  annualStats: AnnualStats;
  storeData: StorePerformanceRow[];
  catData: { [key: string]: { qty: number; net: number } };
  crossingData: {
    totalNet: number;
    totalQty: number;
    storeStats: Record<string, { physical: number; adjusted: number }>;
    records: { salesman: string; baseLoc: string; crossingLoc: string; net: number; qty: number }[];
  };
  trendData: TrendDataPoint[];        // 12 months current year
  multiYearStats: { [year: number]: number[] }; // year -> 12 monthly totals
  categoryTrend: CategoryTrendData;
  advisorData: AdvisorRecord[];
  dailyTrendData: { net: number; qty: number }[];
}

export interface AdvisorRecord {
  name: string;
  location: string;
  netSales: number;
  crossingNet: number;
  crossingQty: number;
  target: number;
  achievement: number;
  contribution: number;
  transCount: number;
  productiveMonths: number;
  categoryMix: { category: string; amount: number; qty: number; pct: number }[];
  storeData: {
    totalSales: number;
    target: number;
    achievement: number;
    status: string;
    advisorContrib: number;
  };
}

export interface AdvisorPerformanceData {
  advisors: AdvisorRecord[];
  month: string;
  year: number;
}

export interface CrossingRecord {
  salesman: string;
  baseLoc: string;
  crossingLoc: string;
  net: number;
  qty: number;
}

export interface CrossingSalesData {
  records: CrossingRecord[];
  totalNet: number;
  totalQty: number;
  totalNetSalesGenerated: number;
  totalQtyGenerated: number;
  hoExcludedNet: number;
  hoExcludedQty: number;
  storeStats: Record<string, { physical: number; adjusted: number }>;
  month: string;
  year: number;
}

export interface AdvisorProfile {
  name: string;
  home_location: string;
}

export interface AdvisorRotation {
  advisor_name: string;
  year: number;
  month_number: number;
  assigned_location: string;
}

export interface AdvisorSetupData {
  advisors: AdvisorProfile[];
  rotations: AdvisorRotation[];
  targets: { advisor_name: string; year: number; month_number: number; target_value: number }[];
}

export interface FootfallStoreRow {
  id: number;
  transaction_date: string;
  location: string;
  traffic_in: number;
  traffic_out: number;
  men_pct: number;
  women_pct: number;
}

export interface FootfallCrmRow {
  id: number;
  transaction_date: string;
  location: string;
  walk_in: number;
  appointment: number;
  new_customer: number;
}

export interface StockStoreRow {
  id: number;
  year: number;
  location: string;
  category: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

// ==========================================
// --- HELPERS ---
// ==========================================

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];


// ==========================================
// --- SERVICE ---
// ==========================================

export const dashboardService = {

  /**
   * Monthly Overview — Replicates getDashboardData() + aggregateOverview() from GAS
   */
  async getMonthlyOverview(month: string, year: number): Promise<MonthlyOverviewData> {
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
  },  /**
   * Advisor Performance — Replicates calculateAdvisorPerformance() from GAS
   * Now fetches from 'advisors' and 'advisor_targets' tables for full parity.
   */
  async getAdvisorPerformance(month: string, year: number): Promise<AdvisorPerformanceData> {
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
  },

  /**
   * Daily Report — Replicates calculateStoreDaily() + getDailyReportData() from GAS
   * Target source: targets table (mirrors master_target_store sheet)
   * MTD: all transactions from day 1 of month up to and including selected date
   */
  async getDailyReport(dateStr: string) {
    const selected = new Date(dateStr);
    const year = selected.getFullYear();
    const monthIdx = selected.getMonth();
    const day = selected.getDate();
    const monthName = MONTH_NAMES[monthIdx];

    const mStart = `${year}-${String(monthIdx + 1).padStart(2, '0')}-01T00:00:00`;
    const mEnd   = new Date(year, monthIdx + 1, 0, 23, 59, 59).toISOString();

    const [{ data: rows, error }, { data: targetRows }, { data: stockRows }] = await Promise.all([
      supabase
        .from('clean_master')
        .select('transaction_date, location, main_category, net_sales, qty, cost, gross_sales, type, comm, val_disc')
        .gte('transaction_date', mStart)
        .lte('transaction_date', mEnd),
      supabase
        .from('targets')
        .select('store_name, target_value')
        .eq('year', year)
        .eq('month_number', monthIdx + 1),
      supabase
        .from('stock_store')
        .select('*')
        .eq('year', year)
    ]);

    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const currentMonthKey = monthKeys[monthIdx];

    if (error) throw error;

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

    const normalizeCat = (c: string) => {
      const cu = c.toUpperCase();
      if (cu === 'JWL' || cu === 'JEWELRY') return 'Jewelry';
      if (cu === 'WTH' || cu === 'WATCHES') return 'Watches';
      if (cu === 'ACCS' || cu === 'ACCESSORIES') return 'Accessories';
      if (cu === 'PFM' || cu === 'PERFUME') return 'Perfume';
      return 'Other';
    };

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
          const stockRow = stockRows?.find(sr => sr.location.toLowerCase() === loc.toLowerCase() && normalizeCat(sr.category) === c);
          const openingStock = stockRow ? (stockRow[currentMonthKey as keyof typeof stockRow] as number) : 0;
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
        const stockRow = stockRows?.find(sr => sr.location.toLowerCase() === loc.toLowerCase() && normalizeCat(sr.category) === normCat);
        const openingStock = stockRow ? (stockRow[currentMonthKey as keyof typeof stockRow] as number) : 0;
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

    // Merge stores from both sales data and target map
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
          const stockRow = stockRows?.find(sr => sr.location.toLowerCase() === storeName.toLowerCase() && normalizeCat(sr.category) === c);
          const openingStock = stockRow ? (stockRow[currentMonthKey as keyof typeof stockRow] as number) : 0;
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
          mtdAvgDisc: s.mtdGross > 0 ? (s.mtdValDisc / s.mtdGross) * 100 : 0,
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
        mtdCostPct,
        avgDiscMtd
      },
      stores: storeResults
    };
  },

  /**
   * Advisor Setup — fetch all advisors + rotations for a given year
   */
  async getAdvisorSetup(year: number): Promise<AdvisorSetupData> {
    const [{ data: advisors }, { data: rotations }, { data: targets }] = await Promise.all([
      supabase.from('advisors').select('name, home_location').order('name'),
      supabase.from('advisor_rotations').select('advisor_name, year, month_number, assigned_location').eq('year', year),
      supabase.from('advisor_targets').select('advisor_name, year, month_number, target_value').eq('year', year)
    ]);
    return {
      advisors: (advisors || []) as AdvisorProfile[],
      rotations: (rotations || []) as AdvisorRotation[],
      targets: (targets || []) as any[]
    };
  },

  async updateAdvisorHomeBase(name: string, homeLocation: string): Promise<void> {
    const { error } = await supabase
      .from('advisors')
      .update({ home_location: homeLocation })
      .eq('name', name);
    if (error) throw error;
  },

  async saveRotation(advisorName: string, year: number, monthNumber: number, assignedLocation: string): Promise<void> {
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
  },

  async deleteRotation(advisorName: string, year: number, monthNumber: number): Promise<void> {
    const { error } = await supabase
      .from('advisor_rotations')
      .delete()
      .eq('advisor_name', advisorName)
      .eq('year', year)
      .eq('month_number', monthNumber);
    if (error) throw error;
  },

  async saveAdvisorTarget(advisorName: string, year: number, monthNumber: number, targetValue: number): Promise<void> {
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
  },

  async getFootfallStore(month: string, year: number): Promise<FootfallStoreRow[]> {
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
  },

  async getStockStore(year: number): Promise<StockStoreRow[]> {
    const { data, error } = await supabase
      .from('stock_store')
      .select('*')
      .eq('year', year);
    if (error) throw error;
    return (data || []) as StockStoreRow[];
  },

  async getFootfallCrm(month: string, year: number): Promise<FootfallCrmRow[]> {
    const monthIndex = MONTH_NAMES.indexOf(month);
    const mStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const mEnd = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('footfall_crm')
      .select('*')
      .gte('transaction_date', mStart)
      .lte('transaction_date', mEnd)
      .order('transaction_date', { ascending: true });

    if (error) throw error;
    return (data || []) as FootfallCrmRow[];
  },

  async saveFootfallStore(row: Partial<FootfallStoreRow>): Promise<void> {
    if (row.id) {
      const { error } = await supabase.from('footfall_store').update(row).eq('id', row.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('footfall_store').insert(row);
      if (error) throw error;
    }
  },

  async saveFootfallCrm(row: Partial<FootfallCrmRow>): Promise<void> {
    if (row.id) {
      const { error } = await supabase.from('footfall_crm').update(row).eq('id', row.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('footfall_crm').insert(row);
      if (error) throw error;
    }
  },

  /**
   * Crossing Sales — Replicates getCrossingSalesData() from GAS (5-API_Reports.gs)
   * Detects advisors selling outside their home boutique for the selected month.
   * Uses advisor_rotations override first, then advisors.home_location as fallback.
   */
  async getCrossingSalesData(month: string, year: number): Promise<CrossingSalesData> {
    const monthIndex = MONTH_NAMES.indexOf(month);
    if (monthIndex === -1) throw new Error(`Invalid month: ${month}`);

    const mStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01T00:00:00`;
    const mEnd   = new Date(year, monthIndex + 1, 0, 23, 59, 59).toISOString();

    const [{ data: rows, error }, { data: advisorProfiles }, { data: rotationRows }] = await Promise.all([
      supabase
        .from('clean_master')
        .select('salesman, location, net_sales, qty')
        .gte('transaction_date', mStart)
        .lte('transaction_date', mEnd),
      supabase.from('advisors').select('name, home_location'),
      supabase.from('advisor_rotations').select('advisor_name, assigned_location')
        .eq('year', year).eq('month_number', monthIndex + 1)
    ]);

    if (error) throw error;

    const homeLocMap: Record<string, string> = {};
    advisorProfiles?.forEach(p => { homeLocMap[p.name.toLowerCase()] = p.home_location; });

    // Rotation overrides for this month (takes precedence over home_location)
    const rotationMap: Record<string, string> = {};
    rotationRows?.forEach(r => { rotationMap[r.advisor_name.toLowerCase()] = r.assigned_location; });

    const validStores = ['plaza indonesia', 'plaza senayan', 'bali', 'bali boutique'];
    const normalize = (l: string) => {
      const ll = l.toLowerCase();
      if (ll === 'plaza indonesia') return 'Plaza Indonesia';
      if (ll === 'plaza senayan')   return 'Plaza Senayan';
      if (ll === 'bali' || ll === 'bali boutique') return 'Bali';
      return l;
    };

    const storeStats: Record<string, { physical: number; adjusted: number }> = {
      'Plaza Indonesia': { physical: 0, adjusted: 0 },
      'Plaza Senayan':   { physical: 0, adjusted: 0 },
      'Bali':            { physical: 0, adjusted: 0 },
    };

    let totalNet = 0, totalQty = 0, totalNetSalesGenerated = 0, totalQtyGenerated = 0;
    let hoExcludedNet = 0, hoExcludedQty = 0;
    const recordMap = new Map<string, CrossingRecord>();
    const isHO = (l: string) => l === 'head office' || l === 'ho';

    (rows || []).forEach(row => {
      const tLoc = (row.location || '').trim();
      const salesman = (row.salesman || '').trim();
      const key = salesman.toLowerCase();
      // GAS fallback: if advisor not in master, use transaction location as home (no crossing detected)
      const hLoc = (rotationMap[key] || homeLocMap[key] || tLoc).trim();
      const net = row.net_sales || 0;
      const qty = row.qty || 0;

      const tLocLower = tLoc.toLowerCase();
      const hLocLower = hLoc.toLowerCase();

      // Track HO crossings separately BEFORE whitelist filter (mirrors GAS)
      if (tLocLower !== hLocLower && (isHO(tLocLower) || isHO(hLocLower))) {
        hoExcludedNet += net;
        hoExcludedQty += qty;
      }

      const isValidT = validStores.includes(tLocLower);
      const isValidH = validStores.includes(hLocLower);
      if (!isValidT || !isValidH) return;

      totalNetSalesGenerated += net;
      totalQtyGenerated += qty;

      const normT = normalize(tLoc);
      const normH = normalize(hLoc);

      if (storeStats[normT]) storeStats[normT].physical += net;
      if (storeStats[normH]) storeStats[normH].adjusted += net;

      if (tLocLower !== hLocLower) {
        totalNet += net;
        totalQty += qty;
        const key = `${salesman}||${normH}||${normT}`;
        if (recordMap.has(key)) {
          const r = recordMap.get(key)!;
          r.net += net;
          r.qty += qty;
        } else {
          recordMap.set(key, { salesman, baseLoc: normH, crossingLoc: normT, net, qty });
        }
      }
    });

    const records = Array.from(recordMap.values()).sort((a, b) => b.net - a.net);

    return { records, totalNet, totalQty, totalNetSalesGenerated, totalQtyGenerated, hoExcludedNet, hoExcludedQty, storeStats, month, year };
  },

  /**
   * Monthly Transactions — raw transaction detail from clean_master
   */
  async getTransactions(month: string, year: number) {
    const monthIndex = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(month);
    const mStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01T00:00:00`;
    const mEnd   = new Date(year, monthIndex + 1, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from('clean_master')
      .select('id, trans_no, transaction_date, customer, salesman, location, main_category, collection, gross_sales, val_disc, disc_pct, net_sales, qty, cost, comm, type')
      .gte('transaction_date', mStart)
      .lte('transaction_date', mEnd)
      .order('transaction_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateTransaction(id: number, patch: { comm?: number; type?: string }) {
    const { error } = await supabase
      .from('clean_master')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  }
};

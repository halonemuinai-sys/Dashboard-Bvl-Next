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
  crossingData: { [store: string]: number }; // Crossing Sales per store
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
      { data: advisorProfiles }
    ] = await Promise.all([
      supabase
        .from('clean_master')
        .select('transaction_date, location, net_sales, gross_sales, val_disc, cost, qty, main_category, trans_no, customer, salesman')
        .gte('transaction_date', startRange)
        .lte('transaction_date', endRange),
      supabase
        .from('targets')
        .select('year, month_number, target_value, store_name')
        .gte('year', 2023)
        .lte('year', 2026),
      supabase.from('advisors').select('name, home_location')
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

    // A. Fill with Actual Sales
    multiYearRows?.forEach(row => {
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
    const crossingData: Record<string, number> = {};
    const advisorMap = (advisorProfiles || []).reduce((acc: any, curr: any) => {
      acc[curr.name] = curr.home_location;
      return acc;
    }, {});

    const trendStats = Array.from({length: 12}, () => ({
      net: 0, qty: 0, transSet: new Set<string>(), custSet: new Set<string>()
    }));

    const categoryTrend: CategoryTrendData = {};
    const monthlyRows: typeof rows = [];

    // Monthly aggregation accumulators
    let totalNet = 0, totalGross = 0, totalCost = 0, totalValDisc = 0, totalQty = 0;
    const storeStats: Record<string, { net: number; cost: number; qty: number }> = {};
    const catStats: Record<string, { qty: number; net: number }> = {};
    const dailyStats = Array.from({length: 31}, () => ({ net: 0, qty: 0 }));
    let maxDay = 0;

    rows.forEach(row => {
      const d = new Date(row.transaction_date);
      const rMonth = d.getMonth();
      const net = row.net_sales || 0;
      const qty = row.qty || 0;
      const loc = (row.location || '').trim();
      const cat = (row.main_category || 'Other').trim();
      const isHO = loc.toLowerCase().includes('head office');

      // A: Multi-Year Stats
      if (multiYearStats[year]) multiYearStats[year][rMonth] += net;

      // B: Trend Stats
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

      // F: Crossing Sales check & Monthly Aggregation
      if (rMonth === monthIndex) {
        const advisorHome = advisorMap[row.salesman || ''];
        if (advisorHome && advisorHome.trim().toLowerCase() !== loc.toLowerCase() && !isHO) {
          crossingData[loc] = (crossingData[loc] || 0) + net;
        }
        
        monthlyRows.push(row);
        totalNet += net;
        totalGross += (row.gross_sales || 0);
        totalCost += (row.cost || 0);
        totalValDisc += (row.val_disc || 0);
        totalQty += qty;

        if (!storeStats[loc]) storeStats[loc] = { net: 0, cost: 0, qty: 0 };
        storeStats[loc].net += net;
        storeStats[loc].cost += (row.cost || 0);
        storeStats[loc].qty += qty;

        if (!catStats[cat]) catStats[cat] = { qty: 0, net: 0 };
        catStats[cat].net += net;
        catStats[cat].qty += qty;

        const day = d.getDate() - 1;
        if (day >= 0 && day < 31) {
          dailyStats[day].net += net;
          dailyStats[day].qty += qty;
          if (d.getDate() > maxDay) maxDay = d.getDate();
        }
      }
    });

    // MTD YoY calculation
    let currentMtd = 0, prevMtd = 0;
    monthlyRows.forEach(r => {
      const loc = (r.location || '').trim();
      if (!loc.toLowerCase().includes('head office')) currentMtd += (r.net_sales || 0);
    });
    
    multiYearRows?.forEach(r => {
      const d = new Date(r.transaction_date);
      if (d.getFullYear() === (year - 1) && d.getMonth() === monthIndex && d.getDate() <= maxDay) {
        const loc = (r.location || '').trim();
        if (!loc.toLowerCase().includes('head office')) prevMtd += (r.net_sales || 0);
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
        mtdSalesPrevYear: prevMtd,
        mtdGrowthPct: prevMtd > 0 ? ((currentMtd - prevMtd) / prevMtd) * 100 : 0
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
      crossingData,
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
      { data: storeTargets }
    ] = await Promise.all([
      supabase
        .from('clean_master')
        .select('trans_no, transaction_date, salesman, location, main_category, net_sales, qty, type')
        .gte('transaction_date', mStart)
        .lte('transaction_date', mEnd),
      supabase.from('advisors').select('name, home_location'),
      supabase.from('advisor_targets').select('advisor_name, target_value').eq('year', year).eq('month_number', monthIndex + 1),
      supabase.from('targets').select('store_name, target_value').eq('year', year).eq('month_number', monthIndex + 1)
    ]);

    if (salesErr) throw salesErr;
    const rows = salesRows || [];

    // 2. Maps for quick lookup
    const homeLocMap: Record<string, string> = {};
    advisorProfiles?.forEach(p => { homeLocMap[p.name.toLowerCase()] = p.home_location; });

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
          name, net: 0, loc: homeLocMap[key] || loc, target: advTargetMap[key] || 0,
          categories: {}, transactions: new Set(), productiveMonths: new Set(),
          crossingNet: 0, crossingQty: 0
        });
      }

      const entry = advisorMap.get(key)!;
      entry.net += net;
      if (row.trans_no) entry.transactions.add(row.trans_no);
      entry.productiveMonths.add(new Date(row.transaction_date).getMonth());

      // Crossing Sale Detection: transLoc != homeLoc
      const homeLoc = homeLocMap[key];
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
          name: t.advisor_name, net: 0, loc: homeLocMap[key] || 'Unknown', target: t.target_value || 0,
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

    const [{ data: rows, error }, { data: targetRows }] = await Promise.all([
      supabase
        .from('clean_master')
        .select('transaction_date, location, main_category, net_sales, qty, cost, gross_sales, type')
        .gte('transaction_date', mStart)
        .lte('transaction_date', mEnd),
      supabase
        .from('targets')
        .select('store_name, target_value')
        .eq('year', year)
        .eq('month_number', monthIdx + 1)
    ]);

    if (error) throw error;

    // Target map from Supabase
    const targetMap: Record<string, number> = {};
    targetRows?.forEach((t: any) => { targetMap[t.store_name] = t.target_value || 0; });

    type StoreAccum = {
      mtdNet: number; mtdQty: number;
      todayNet: number; todayQty: number;
      todayCost: number; todayGross: number;
      todayRegNet: number; todaySmiNet: number;
      categories: Record<string, { qty: number; netNonSMI: number; netSMI: number }>;
    };
    const storeMap: Record<string, StoreAccum> = {};

    (rows || []).forEach(row => {
      const loc = (row.location || '').trim();
      if (loc.toLowerCase().includes('head office')) return;

      const rowDate = new Date(row.transaction_date);
      const rowDay = rowDate.getDate();
      if (rowDay > day) return; // Only MTD

      const net   = row.net_sales || 0;
      const qty   = row.qty || 0;
      const cost  = row.cost || 0;
      const gross = row.gross_sales || 0;
      const cat   = (row.main_category || 'Other').trim();
      const isSMI = (row.type || '').toUpperCase() === 'SMI';
      const isToday = rowDay === day;

      if (!storeMap[loc]) storeMap[loc] = {
        mtdNet: 0, mtdQty: 0, todayNet: 0, todayQty: 0,
        todayCost: 0, todayGross: 0, todayRegNet: 0, todaySmiNet: 0,
        categories: {}
      };

      const s = storeMap[loc];
      s.mtdNet += net;
      s.mtdQty += qty;

      if (isToday) {
        s.todayNet += net;
        s.todayQty += qty;
        s.todayCost += cost;
        s.todayGross += gross;
        if (isSMI) s.todaySmiNet += net; else s.todayRegNet += net;

        if (!s.categories[cat]) s.categories[cat] = { qty: 0, netNonSMI: 0, netSMI: 0 };
        s.categories[cat].qty += qty;
        if (isSMI) s.categories[cat].netSMI += net;
        else       s.categories[cat].netNonSMI += net;
      }
    });

    // Merge stores from both sales data and target map
    const STORE_ORDER = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];
    const allStores = Array.from(new Set([
      ...STORE_ORDER.filter(s => storeMap[s] || targetMap[s]),
      ...Object.keys(storeMap).filter(s => !STORE_ORDER.includes(s)),
      ...Object.keys(targetMap).filter(s => !STORE_ORDER.includes(s) && !storeMap[s])
    ]));

    const stores = allStores.map(storeName => {
      const s = storeMap[storeName] || {
        mtdNet: 0, mtdQty: 0, todayNet: 0, todayQty: 0,
        todayCost: 0, todayGross: 0, todayRegNet: 0, todaySmiNet: 0, categories: {}
      };
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
          target,
          remaining,
          achievement,
          todaySales: s.todayNet,
          todayQty: s.todayQty,
          sellingCostTodayVal: s.todayCost,
          sellingCostTodayPct: costPct,
          regSalesTodayPct: todayTotal > 0 ? +((s.todayRegNet / todayTotal) * 100).toFixed(1) : 0,
          smiSalesTodayPct: todayTotal > 0 ? +((s.todaySmiNet / todayTotal) * 100).toFixed(1) : 0,
        },
        tableData: s.categories
      };
    });

    return { date: dateStr, monthName, stores };
  }
};

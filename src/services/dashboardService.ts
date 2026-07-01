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
  storeTargets: { store_name: string; year: number; month_number: number; target_value: number }[];
}

export interface CrmProfilingRow {
  id: number;
  tanggal_input: string | null;
  nama_depan: string;
  nama_belakang: string;
  title: string;
  nama_lengkap: string;
  nama_panggilan: string;
  customer_advisor: string;
  lokasi_store: string;
  tanggal_lahir: string | null;
  status_pelanggan: string;
  domisili: string;
  domisili_luar_negeri: string;
  umur: string;
  etnis: string;
  agama: string;
  kewarganegaraan: string;
  no_hp: string;
  email: string;
  pekerjaan: string;
  fashion_style: string;
  bentuk_tubuh: string;
  tinggi_badan: string;
  cake_favorit: string;
  makanan_favorit: string;
  minuman_favorit: string;
  alergi_makanan: string;
  hobby: string;
  hobby_kategori: string;
  hobby_sub: string;
  hobby_others: string;
  warna_favorit: string;
  status_pernikahan: string;
  memiliki_anak: string;
  jumlah_anak: string;
  tempat_liburan_favorit: string;
  topik_pembicaraan_favorit: string;
  karakter: string;
  tanggal_pernikahan: string | null;
  barang_antusias: string;
  instagram: string;
  tiktok: string;
  ktp_passport: string;
  foto_customer: string;
  faktor_pemicu_pembelian: string;
  full_name_tittle: string;
  created_at: string;
  updated_at: string;
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
   * Annual YTD Advisor Performance — mirrors GAS getAnnualAdvisorData(year)
   * Aggregates full-year sales per advisor + sum of all 12-month targets
   */
  async getAnnualAdvisorPerformance(year: number) {
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

    const lastMonthDate = new Date(year, monthIdx - 1, 1);
    const lmYear = lastMonthDate.getFullYear();
    const lmMonthIdx = lastMonthDate.getMonth();
    const lmStart = `${lmYear}-${String(lmMonthIdx + 1).padStart(2, '0')}-01T00:00:00`;
    const lmEnd   = new Date(lmYear, lmMonthIdx + 1, 0, 23, 59, 59).toISOString();

    const mStartStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;
    const mEndStr   = new Date(year, monthIdx + 1, 0).toISOString().split('T')[0];

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
      supabase
        .from('inventory_valuation')
        .select('snapshot_date, location_name, location_code, main_category, collection_code, qoh')
        .gte('snapshot_date', mStartStr)
        .lte('snapshot_date', mEndStr)
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

    const snapshotDates = Array.from(new Set((valuationRows || []).map(r => r.snapshot_date))).sort();
    const earliestSnapshotDate = snapshotDates[0];

    const valStockMap: Record<string, Record<string, number>> = {};
    if (earliestSnapshotDate) {
      const earliestRows = (valuationRows || []).filter(r => r.snapshot_date === earliestSnapshotDate);
      earliestRows.forEach(r => {
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
  },

  /**
   * Advisor Setup — fetch all advisors + rotations for a given year
   */
  async getAdvisorSetup(year: number): Promise<AdvisorSetupData> {
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

  async saveStoreTarget(storeName: string, year: number, monthNumber: number, targetValue: number): Promise<void> {
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
    const mEnd   = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];

    // 1. Ambil manual entries dari footfall_crm
    const { data: manual, error } = await supabase
      .from('footfall_crm')
      .select('*')
      .gte('transaction_date', mStart)
      .lte('transaction_date', mEnd)
      .order('transaction_date', { ascending: true });
    if (error) throw error;

    // Manual entries (keyed by date||location) jadi prioritas utama
    const manualMap: Record<string, FootfallCrmRow> = {};
    (manual || []).forEach(r => {
      manualMap[`${r.transaction_date}||${r.location}`] = r as FootfallCrmRow;
    });

    // 2. Fallback: hitung dari mirror_traffic per hari per lokasi
    const { data: trafficRows } = await supabase
      .from('mirror_traffic')
      .select('transaction_date, location')
      .gte('transaction_date', mStart)
      .lte('transaction_date', mEnd);

    const trafficCount: Record<string, Record<string, number>> = {};
    (trafficRows || []).forEach(r => {
      const d = r.transaction_date as string;
      const l = (r.location as string) || '';
      if (!trafficCount[d]) trafficCount[d] = {};
      trafficCount[d][l] = (trafficCount[d][l] || 0) + 1;
    });

    // 3. Gabungkan: manual override jika ada, fallback ke traffic count
    const result: FootfallCrmRow[] = [];
    const seen = new Set<string>();

    // Tambahkan manual entries
    Object.values(manualMap).forEach(r => {
      result.push(r);
      seen.add(`${r.transaction_date}||${r.location}`);
    });

    // Tambahkan traffic-derived entries yang belum ada manual entry-nya
    Object.entries(trafficCount).forEach(([date, locs]) => {
      Object.entries(locs).forEach(([location, count]) => {
        const key = `${date}||${location}`;
        if (!seen.has(key)) {
          result.push({ id: 0, transaction_date: date, location, walk_in: count, appointment: 0, new_customer: 0 });
        }
      });
    });

    return result.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
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

    const [{ data, error }, { data: salesData }] = await Promise.all([
      supabase
        .from('clean_master')
        .select('id, trans_no, transaction_date, customer, salesman, location, main_category, collection, sap_code, catalogue_code, gross_sales, val_disc, disc_pct, net_sales, qty, cost, comm, type')
        .gte('transaction_date', mStart)
        .lte('transaction_date', mEnd)
        .order('transaction_date', { ascending: true }),
      supabase
        .from('bvlgari_sales')
        .select('transaction_no, collection, phone_no')
        .gte('transaction_date', mStart)
        .lte('transaction_date', mEnd),
    ]);

    if (error) throw error;

    // Build lookup map from bvlgari_sales by transaction_no
    const salesMap = new Map<string, { collection_code: string; phone_no: string }>();
    (salesData || []).forEach((s: { transaction_no: string; collection: string; phone_no: string }) => {
      if (s.transaction_no && !salesMap.has(s.transaction_no)) {
        salesMap.set(s.transaction_no, {
          collection_code: s.collection || '',
          phone_no:        s.phone_no   || '',
        });
      }
    });

    // Merge: enrich each clean_master row with collection_code + phone_no
    return (data || []).map(r => {
      const extra = salesMap.get(r.trans_no) ?? { collection_code: '', phone_no: '' };
      return { ...r, ...extra };
    });
  },

  async updateTransaction(id: number, patch: { comm?: number; type?: string }) {
    const { error } = await supabase
      .from('clean_master')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  },

  async deleteTransaction(id: number) {
    const { error } = await supabase
      .from('clean_master')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Quarterly Budget — Actual vs Budget per store per month
   * Mirrors GAS getQuarterlyBudgetData() from 8-API_Quarterly.gs
   */
  async getQuarterlyBudget(quarter: number, year: number) {
    const QUARTER_MONTHS: Record<number, number[]> = {
      1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12]
    };
    const months = QUARTER_MONTHS[quarter];
    const mStart = `${year}-${String(months[0]).padStart(2, '0')}-01T00:00:00`;
    const mEnd   = new Date(year, months[months.length - 1], 0, 23, 59, 59).toISOString();

    const [{ data: salesRows, error }, { data: budgetRows }] = await Promise.all([
      supabase
        .from('clean_master')
        .select('transaction_date, location, net_sales')
        .gte('transaction_date', mStart)
        .lte('transaction_date', mEnd),
      supabase
        .from('store_budgets')
        .select('month_number, store_name, budget_value')
        .eq('year', year)
        .in('month_number', months)
    ]);

    if (error) throw error;

    const MONTH_SHORT = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const isHO = (loc: string) => loc.toLowerCase().includes('head office') || loc.toLowerCase() === 'ho';

    // Actual: { storeName -> { monthNum -> netSales } }
    const actualMap: Record<string, Record<number, number>> = {};
    (salesRows || []).forEach(r => {
      const loc = (r.location || '').trim();
      if (isHO(loc)) return;
      const m = new Date(r.transaction_date).getMonth() + 1;
      if (!actualMap[loc]) actualMap[loc] = {};
      actualMap[loc][m] = (actualMap[loc][m] || 0) + (r.net_sales || 0);
    });

    // Budget: { storeName -> { monthNum -> budgetValue } }
    const budgetMap: Record<string, Record<number, number>> = {};
    (budgetRows || []).forEach(b => {
      const s = (b.store_name || '').trim();
      if (isHO(s) || s.toLowerCase() === 'total') return;
      if (!budgetMap[s]) budgetMap[s] = {};
      budgetMap[s][b.month_number] = (budgetMap[s][b.month_number] || 0) + (b.budget_value || 0);
    });

    const allStores = [...new Set([...Object.keys(actualMap), ...Object.keys(budgetMap)])].sort();

    let totalActual = 0, totalBudget = 0;

    const storeData = allStores.map(store => {
      const monthlyBreakdown = months.map(m => {
        const actual  = actualMap[store]?.[m]  || 0;
        const budget  = budgetMap[store]?.[m]  || 0;
        const variance = actual - budget;
        return { monthNum: m, monthName: MONTH_SHORT[m], actual, budget, variance,
                 achievement: budget > 0 ? (actual / budget) * 100 : 0 };
      });
      const actual  = monthlyBreakdown.reduce((s, m) => s + m.actual, 0);
      const budget  = monthlyBreakdown.reduce((s, m) => s + m.budget, 0);
      totalActual  += actual;
      totalBudget  += budget;
      return { store, actual, budget, variance: actual - budget,
               achievement: budget > 0 ? (actual / budget) * 100 : 0,
               monthlyBreakdown };
    });

    const totalVariance    = totalActual - totalBudget;
    const totalAchievement = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    return {
      quarter, year,
      monthNames: months.map(m => MONTH_SHORT[m]),
      kpi: { totalActual, totalBudget, totalVariance, totalAchievement },
      storeData
    };
  },

  /**
   * Annual Net Sales — mirrors GAS getAnnualNetSalesData()
   * Per-store monthly breakdown + YoY vs previous year + targets
   */
  async getAnnualNetSales(year: number) {
    const yStart  = `${year}-01-01T00:00:00`;
    const yEnd    = `${year}-12-31T23:59:59`;
    const pyStart = `${year - 1}-01-01T00:00:00`;
    const pyEnd   = `${year - 1}-12-31T23:59:59`;

    const [
      { data: rows,    error: e1 },
      { data: pyRows,  error: e2 },
      { data: tgtRows, error: e3 },
    ] = await Promise.all([
      supabase.from('clean_master').select('transaction_date, location, net_sales')
        .gte('transaction_date', yStart).lte('transaction_date', yEnd),
      supabase.from('clean_master').select('transaction_date, location, net_sales')
        .gte('transaction_date', pyStart).lte('transaction_date', pyEnd),
      supabase.from('targets').select('store_name, month_number, target_value').eq('year', year),
    ]);

    if (e1 || e2 || e3) throw e1 ?? e2 ?? e3;

    const isHO = (l: string) => l.toLowerCase().includes('head office') || l.toLowerCase() === 'ho';

    // Aggregate helper: rows → { store: number[12] }
    const aggregate = (data: typeof rows) => {
      const map: Record<string, number[]> = {};
      (data || []).forEach(r => {
        const loc = (r.location || '').trim();
        if (isHO(loc)) return;
        const m = new Date(r.transaction_date).getMonth();
        if (!map[loc]) map[loc] = new Array(12).fill(0);
        map[loc][m] += r.net_sales || 0;
      });
      return map;
    };

    const actualMap = aggregate(rows);
    const prevMap   = aggregate(pyRows);

    // Target map: { store: number[12] }
    const tgtMap: Record<string, number[]> = {};
    (tgtRows || []).forEach(t => {
      const s = (t.store_name || '').trim();
      if (isHO(s) || s.toLowerCase() === 'total') return;
      if (!tgtMap[s]) tgtMap[s] = new Array(12).fill(0);
      tgtMap[s][(t.month_number ?? 1) - 1] += t.target_value || 0;
    });

    const allStores = [...new Set([
      ...Object.keys(actualMap),
      ...Object.keys(tgtMap),
    ])].sort();

    // Grand total accumulators
    const grandMonthly     = new Array(12).fill(0);
    const grandPrevMonthly = new Array(12).fill(0);
    const grandTargets     = new Array(12).fill(0);

    const stores = allStores.map(name => {
      const monthly     = actualMap[name] ?? new Array(12).fill(0);
      const prevMonthly = prevMap[name]   ?? new Array(12).fill(0);
      const targets     = tgtMap[name]    ?? new Array(12).fill(0);
      const ytd         = monthly.reduce((s, v) => s + v, 0);
      const prevYtd     = prevMonthly.reduce((s, v) => s + v, 0);
      const ytdTarget   = targets.reduce((s, v) => s + v, 0);
      const yoyGrowth   = prevYtd > 0 ? ((ytd - prevYtd) / prevYtd) * 100 : 0;
      const bestMonth   = monthly.indexOf(Math.max(...monthly));

      monthly.forEach((v, i) => { grandMonthly[i] += v; grandPrevMonthly[i] += prevMonthly[i]; grandTargets[i] += targets[i]; });

      return { name, monthly, prevMonthly, targets, ytd, prevYtd, ytdTarget, yoyGrowth, bestMonth };
    });

    // Sort by YTD desc, compute contribution
    const grandYtd     = grandMonthly.reduce((s, v) => s + v, 0);
    const grandPrevYtd = grandPrevMonthly.reduce((s, v) => s + v, 0);
    stores.sort((a, b) => b.ytd - a.ytd);
    const storeData = stores.map(s => ({
      ...s,
      contribution: grandYtd > 0 ? (s.ytd / grandYtd) * 100 : 0,
    }));

    return {
      year, prevYear: year - 1,
      storeData,
      grandTotal: {
        monthly: grandMonthly,
        prevMonthly: grandPrevMonthly,
        targets: grandTargets,
        ytd: grandYtd,
        prevYtd: grandPrevYtd,
        ytdTarget: grandTargets.reduce((s, v) => s + v, 0),
        yoyGrowth: grandPrevYtd > 0 ? ((grandYtd - grandPrevYtd) / grandPrevYtd) * 100 : 0,
      },
    };
  },

  /**
   * Quarterly Standard — mirrors GAS getQuarterlyData()
   * QTD sales, monthly pacing, category breakdown, top collections & catalogues
   */
  async getQuarterlyStandard(quarter: number, year: number) {
    const QUARTER_MONTHS: Record<number, number[]> = {
      1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12],
    };
    const MONTH_NAMES = ['','January','February','March','April','May','June',
                         'July','August','September','October','November','December'];
    const months = QUARTER_MONTHS[quarter];
    const mStart  = `${year}-${String(months[0]).padStart(2,'0')}-01T00:00:00`;
    const mEnd    = new Date(year, months[months.length-1], 0, 23, 59, 59).toISOString();
    const pyStart = `${year-1}-${String(months[0]).padStart(2,'0')}-01T00:00:00`;
    const pyEnd   = new Date(year-1, months[months.length-1], 0, 23, 59, 59).toISOString();

    const [
      { data: rows,    error: e1 },
      { data: pyRows },
      { data: tgtRows },
    ] = await Promise.all([
      supabase.from('clean_master')
        .select('transaction_date, location, net_sales, qty, main_category, collection, catalogue_code')
        .gte('transaction_date', mStart).lte('transaction_date', mEnd),
      supabase.from('clean_master')
        .select('transaction_date, location, net_sales')
        .gte('transaction_date', pyStart).lte('transaction_date', pyEnd),
      supabase.from('targets')
        .select('store_name, month_number, target_value')
        .eq('year', year).in('month_number', months),
    ]);
    if (e1) throw e1;

    const isHO = (l: string) => l.toLowerCase().includes('head office') || l.toLowerCase() === 'ho';

    // Monthly target totals (exc HO)
    const tgtByMonth: Record<number, number> = {};
    (tgtRows || []).forEach(t => {
      if (isHO(t.store_name || '')) return;
      tgtByMonth[t.month_number] = (tgtByMonth[t.month_number] || 0) + (t.target_value || 0);
    });

    // Current + prev QTD
    let qtdSales = 0, prevQtdSales = 0;
    const salesByMonth: Record<number, number> = {};
    const catMap: Record<string, number> = {};
    const collMap: Record<string, { cat: string; value: number; qty: number }> = {};
    const catgMap: Record<string, { cat: string; value: number; qty: number }> = {};

    (rows || []).forEach(r => {
      if (isHO(r.location || '')) return;
      const m   = new Date(r.transaction_date).getMonth() + 1;
      const net = r.net_sales || 0;
      const qty = r.qty || 0;
      const cat = (r.main_category || 'Other').trim();
      const col = (r.collection    || '').trim();
      const ctg = (r.catalogue_code|| '').trim();

      qtdSales += net;
      salesByMonth[m] = (salesByMonth[m] || 0) + net;
      catMap[cat] = (catMap[cat] || 0) + net;

      if (col && col !== '-') {
        if (!collMap[col]) collMap[col] = { cat, value: 0, qty: 0 };
        collMap[col].value += net; collMap[col].qty += qty;
      }
      if (ctg && ctg !== '-') {
        if (!catgMap[ctg]) catgMap[ctg] = { cat, value: 0, qty: 0 };
        catgMap[ctg].value += net; catgMap[ctg].qty += qty;
      }
    });

    (pyRows || []).forEach(r => {
      if (isHO(r.location || '')) return;
      prevQtdSales += r.net_sales || 0;
    });

    const qtdTarget  = months.reduce((s, m) => s + (tgtByMonth[m] || 0), 0);
    const qtdAchv    = qtdTarget > 0 ? (qtdSales / qtdTarget) * 100 : 0;
    const yoyGrowth  = prevQtdSales > 0 ? ((qtdSales - prevQtdSales) / prevQtdSales) * 100 : 0;

    const monthlyPacing = months.map(m => ({
      name:   MONTH_NAMES[m],
      index:  m - 1,
      sales:  salesByMonth[m]  || 0,
      target: tgtByMonth[m]   || 0,
      achv:   tgtByMonth[m] > 0 ? ((salesByMonth[m]||0) / tgtByMonth[m]) * 100 : 0,
    }));

    const categories = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const topCollections = Object.entries(collMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.value - a.value).slice(0, 10);

    const topCatalogue = Object.entries(catgMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.value - a.value).slice(0, 10);

    return { quarter, year, prevYear: year-1, qtdSales, qtdTarget, qtdAchv, yoyGrowth,
             monthlyPacing, categories, topCollections, topCatalogue };
  },

  /**
   * Forecasting & Projection — mirrors GAS getForecastingData()
   * Month-end projection, year-end projection, category momentum, store projections,
   * day-of-week patterns, holiday impact, seasonal chart
   */
  async getForecastingData(year: number, activeMonthIdx?: number) {
    const yStart  = `${year}-01-01T00:00:00`;
    const yEnd    = `${year}-12-31T23:59:59`;
    const pyStart = `${year-1}-01-01T00:00:00`;
    const pyEnd   = `${year-1}-12-31T23:59:59`;

    const [
      { data: rows,    error },
      { data: pyRows },
      { data: tgtRows },
    ] = await Promise.all([
      supabase.from('clean_master')
        .select('transaction_date, location, net_sales, qty, main_category')
        .gte('transaction_date', yStart).lte('transaction_date', yEnd),
      supabase.from('clean_master')
        .select('transaction_date, location, net_sales')
        .gte('transaction_date', pyStart).lte('transaction_date', pyEnd),
      supabase.from('targets')
        .select('store_name, month_number, target_value').eq('year', year),
    ]);
    if (error) throw error;

    const isHO = (l: string) => l.toLowerCase().includes('head office') || l.toLowerCase() === 'ho';
    const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DOW_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    // --- Determine active month ---
    let latestDate = new Date(year, 0, 1);
    (rows || []).forEach(r => {
      const d = new Date(r.transaction_date);
      if (!isHO(r.location||'') && d > latestDate) latestDate = d;
    });
    const activeMonth = activeMonthIdx !== undefined ? activeMonthIdx : latestDate.getMonth();
    const activeDay   = latestDate.getMonth() === activeMonth ? latestDate.getDate() : new Date(year, activeMonth+1, 0).getDate();
    const daysInMonth = new Date(year, activeMonth+1, 0).getDate();
    const monthProgress = (activeDay / daysInMonth) * 100;

    // --- Aggregate current year: monthly, daily, by-store, by-category ---
    const monthly   = new Array(12).fill(0);
    const storeMap: Record<string, { mtd: number; days: Set<number> }> = {};
    const catMap: Record<string, number[]> = {};  // cat -> monthly[12]
    const dowMap: Record<number, { total: number; count: Set<string> }> = {};
    let sellingDays = 0;
    const sellingDaysSet = new Set<string>();

    (rows || []).forEach(r => {
      if (isHO(r.location||'')) return;
      const d = new Date(r.transaction_date);
      const m = d.getMonth();
      const net = r.net_sales || 0;
      const loc = (r.location||'').trim();
      const cat = (r.main_category||'Other').trim();
      const dow = d.getDay();
      const dayKey = d.toISOString().slice(0,10);

      monthly[m] += net;

      if (!storeMap[loc]) storeMap[loc] = { mtd: 0, days: new Set() };
      if (m === activeMonth) {
        storeMap[loc].mtd += net;
        storeMap[loc].days.add(d.getDate());
        sellingDaysSet.add(dayKey);
      }

      if (!catMap[cat]) catMap[cat] = new Array(12).fill(0);
      catMap[cat][m] += net;

      if (m === activeMonth) {
        if (!dowMap[dow]) dowMap[dow] = { total: 0, count: new Set() };
        dowMap[dow].total += net;
        dowMap[dow].count.add(dayKey);
      }
    });
    sellingDays = sellingDaysSet.size;

    // --- Targets ---
    const tgtByMonth: Record<number, number> = {};
    const tgtByStore: Record<string, Record<number, number>> = {};
    (tgtRows || []).forEach(t => {
      const s = (t.store_name||'').trim();
      if (isHO(s) || s.toLowerCase() === 'total') return;
      const m = (t.month_number||1) - 1;
      tgtByMonth[m] = (tgtByMonth[m]||0) + (t.target_value||0);
      if (!tgtByStore[s]) tgtByStore[s] = {};
      tgtByStore[s][m] = (tgtByStore[s][m]||0) + (t.target_value||0);
    });

    // --- Previous year monthly ---
    const prevMonthly = new Array(12).fill(0);
    (pyRows || []).forEach(r => {
      if (isHO(r.location||'')) return;
      prevMonthly[new Date(r.transaction_date).getMonth()] += r.net_sales||0;
    });

    // --- Month-End Projection ---
    const mtd = monthly[activeMonth];
    const runRate = sellingDays > 0 ? mtd / sellingDays : 0;
    const remainingDays = Math.max(0, daysInMonth - activeDay);
    const projectedSellingDays = remainingDays * (sellingDays / Math.max(1, activeDay));

    let projected: number;
    if (sellingDays < 4 && activeDay <= 7) {
      const anchor = prevMonthly[activeMonth] || tgtByMonth[activeMonth] || 0;
      const linear = runRate * daysInMonth;
      projected = anchor > 0 ? anchor * 0.7 + linear * 0.3 : linear;
    } else {
      projected = mtd + runRate * projectedSellingDays;
    }
    const mTarget = tgtByMonth[activeMonth] || 0;
    const confidence = monthProgress >= 75 ? 'High' : monthProgress >= 40 ? 'Medium' : 'Low';

    // --- Year-End Projection ---
    const completedMonths = Array.from({length: activeMonth}, (_, i) => i);
    const ytdActual  = completedMonths.reduce((s, m) => s + monthly[m], 0) + mtd;
    const prevYtd    = completedMonths.reduce((s, m) => s + prevMonthly[m], 0) + prevMonthly[activeMonth];
    const growthRate = prevYtd > 0 ? ytdActual / prevYtd : 1;

    const projectedMonthly = Array.from({length: 12}, (_, m) => {
      if (m < activeMonth)  return monthly[m];
      if (m === activeMonth) return projected;
      return prevMonthly[m] > 0 ? prevMonthly[m] * growthRate : 0;
    });
    const yearEndProjected = projectedMonthly.reduce((s, v) => s + v, 0);
    const annualTarget     = Object.values(tgtByMonth).reduce((s, v) => s + v, 0);

    // --- Store Projections (exc HO) ---
    const storeProjections = Object.entries(storeMap)
      .filter(([s]) => !isHO(s))
      .map(([name, d]) => {
        const sRunRate = d.days.size > 0 ? d.mtd / d.days.size : 0;
        const sProjDays = projectedSellingDays;
        const sProj = d.mtd + sRunRate * sProjDays;
        const sTgt = tgtByStore[name]?.[activeMonth] || 0;
        return { name, mtd: d.mtd, projected: sProj, target: sTgt,
                 achievement: sTgt > 0 ? (sProj / sTgt) * 100 : 0 };
      })
      .sort((a, b) => b.projected - a.projected);

    // --- Category Momentum ---
    const prevMonth = activeMonth > 0 ? activeMonth - 1 : 11;
    const categoryMomentum = Object.entries(catMap)
      .map(([name, arr]) => ({
        name,
        current:  arr[activeMonth],
        previous: arr[prevMonth],
        growth:   arr[prevMonth] > 0 ? ((arr[activeMonth] - arr[prevMonth]) / arr[prevMonth]) * 100 : 0,
      }))
      .sort((a, b) => b.current - a.current);

    // --- Day-of-Week Pattern ---
    const dayOfWeek = DOW_NAMES.map((day, i) => ({
      day,
      avg:   dowMap[i] ? dowMap[i].total / dowMap[i].count.size : 0,
      total: dowMap[i]?.total || 0,
      count: dowMap[i]?.count.size || 0,
    }));

    // --- Seasonal chart data ---
    const seasonalPattern = MONTH_SHORT.map((month, i) => ({
      month, actual: monthly[i], prevYear: prevMonthly[i],
      target: tgtByMonth[i]||0, projected: projectedMonthly[i],
    }));

    return {
      year, prevYear: year-1, activeMonth, activeMonthName: ['January','February','March','April','May','June','July','August','September','October','November','December'][activeMonth],
      activeDay, daysInMonth, monthProgress,
      monthEnd: {
        mtd, projected,
        projectedDown: projected * 0.85,
        projectedUp:   projected * 1.15,
        target: mTarget,
        achievement: mTarget > 0 ? (projected / mTarget) * 100 : 0,
        runRate, sellingDays, remainingDays, confidence,
      },
      yearEnd: {
        ytdActual, projected: yearEndProjected, target: annualTarget,
        achievement: annualTarget > 0 ? (yearEndProjected / annualTarget) * 100 : 0,
        growthRate: (growthRate - 1) * 100,
        projectedMonthly,
      },
      storeProjections,
      categoryMomentum,
      dayOfWeek,
      seasonalPattern,
    };
  },
  async getSimulatorBaseline(year: number, month: number) {
    const monthNum = month + 1; // 1-indexed
    const mStart = `${year}-${String(monthNum).padStart(2, '0')}-01T00:00:00`;
    const mEndStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, '0')}T23:59:59`;

    // Available CRM database for the current simulated month is up to the end of the previous month
    let prevYearForCrm = year;
    let prevMonthForCrm = month; // if month = 5 (June), prevMonthForCrm = 5 (May)
    if (prevMonthForCrm === 0) {
      prevMonthForCrm = 12;
      prevYearForCrm = year - 1;
    }
    const lastDayOfPrevCrmMonth = new Date(prevYearForCrm, prevMonthForCrm, 0).getDate();
    const crmCutoffDate = `${prevYearForCrm}-${String(prevMonthForCrm).padStart(2, '0')}-${String(lastDayOfPrevCrmMonth).padStart(2, '0')}`;

    const [
      { data: salesData },
      { data: targetData },
      { data: footfallData },
      { data: crmData }
    ] = await Promise.all([
      supabase.from('clean_master')
        .select('location, net_sales, qty')
        .gte('transaction_date', mStart)
        .lte('transaction_date', mEndStr),
      supabase.from('targets')
        .select('store_name, target_value')
        .eq('year', year)
        .eq('month_number', monthNum),
      supabase.from('footfall_store')
        .select('location, traffic_count')
        .gte('transaction_date', mStart.slice(0, 10))
        .lte('transaction_date', mEndStr.slice(0, 10)),
      supabase.from('crm_profiling')
        .select('lokasi_store')
        .lte('tanggal_input', crmCutoffDate)
    ]);

    const isHO = (l: string) => l.toLowerCase().includes('head office') || l.toLowerCase() === 'ho';
    const cleanLoc = (l: string) => (l || '').trim();

    const stores = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

    // Compute dynamic CRM count per store
    let piCrmCount = 0;
    let psCrmCount = 0;
    let baliCrmCount = 0;

    (crmData || []).forEach(c => {
      const loc = (c.lokasi_store || '').toLowerCase();
      if (loc.includes('intermark') || loc === 'pi' || loc.includes('indonesia')) {
        piCrmCount++;
      } else if (loc.includes('superstore') || loc === 'ps' || loc.includes('senayan')) {
        psCrmCount++;
      } else if (loc.includes('bali')) {
        baliCrmCount++;
      }
    });

    if (piCrmCount === 0) piCrmCount = 3855;
    if (psCrmCount === 0) psCrmCount = 2996;
    if (baliCrmCount === 0) baliCrmCount = 1434;

    const baseline: Record<string, {
      sales: number;
      transactions: number;
      footfall: number;
      target: number;
      crmLeads: number;
      ats: number;
      cr: number;
    }> = {};

    stores.forEach(s => {
      const crmCount = s === 'Plaza Indonesia' ? piCrmCount : s === 'Plaza Senayan' ? psCrmCount : baliCrmCount;
      baseline[s] = {
        sales: 0,
        transactions: 0,
        footfall: 0,
        target: s === 'Plaza Indonesia' ? 12_000_000_000 : 4_000_000_000,
        crmLeads: crmCount,
        ats: s === 'Plaza Indonesia' ? 223_600_000 : s === 'Plaza Senayan' ? 84_000_000 : 74_500_000,
        cr: s === 'Plaza Indonesia' ? 2.5 : s === 'Plaza Senayan' ? 2.0 : 3.0
      };
    });

    (salesData || []).forEach(r => {
      const loc = cleanLoc(r.location || '');
      const matchedStore = stores.find(s => loc.toLowerCase().includes(s.toLowerCase()));
      if (matchedStore) {
        baseline[matchedStore].sales += (r.net_sales || 0);
        baseline[matchedStore].transactions += 1;
      }
    });

    (targetData || []).forEach(t => {
      const name = cleanLoc(t.store_name || '');
      const matchedStore = stores.find(s => name.toLowerCase().includes(s.toLowerCase()));
      if (matchedStore) {
        baseline[matchedStore].target = t.target_value || 0;
      }
    });

    (footfallData || []).forEach(f => {
      const loc = cleanLoc(f.location || '');
      const matchedStore = stores.find(s => loc.toLowerCase().includes(s.toLowerCase()));
      if (matchedStore) {
        baseline[matchedStore].footfall += (f.traffic_count || 0);
      }
    });

    const daysInMonth = new Date(year, monthNum, 0).getDate();
    stores.forEach(s => {
      const store = baseline[s];
      if (store.target === 0) {
        store.target = s === 'Plaza Indonesia' ? 12_000_000_000 : 4_000_000_000;
      }
      if (store.transactions > 0 && store.sales > 0) {
        store.ats = Math.round(store.sales / store.transactions);
      }
      if (store.footfall > 0 && store.transactions > 0) {
        store.cr = parseFloat(((store.transactions / store.footfall) * 100).toFixed(2));
      } else {
        store.footfall = Math.round(store.transactions / (store.cr / 100)) || (s === 'Plaza Indonesia' ? 40 * daysInMonth : s === 'Plaza Senayan' ? 7 * daysInMonth : 16 * daysInMonth);
      }
    });

    return baseline;
  },

  async getCategorySalesTrend(baseYear: number) {
    const years = [baseYear - 3, baseYear - 2, baseYear - 1, baseYear];
    const { data, error } = await supabase
      .from('clean_master')
      .select('transaction_date, net_sales, qty, main_category, location')
      .gte('transaction_date', `${years[0]}-01-01`)
      .lte('transaction_date', `${baseYear}-12-31`);
    if (error) throw error;

    const isHO = (l: string) => l.toLowerCase().includes('head office') || l.toLowerCase() === 'ho';
    const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const catSet = new Set<string>();
    // [year][month][cat] → { net, qty }
    const agg: Record<number, Record<number, Record<string, { net: number; qty: number }>>> = {};

    (data || []).forEach(r => {
      if (isHO(r.location || '')) return;
      const d = new Date(r.transaction_date);
      const y = d.getFullYear();
      const m = d.getMonth();
      if (!years.includes(y)) return;
      const cat = (r.main_category || 'Other').trim();
      catSet.add(cat);
      if (!agg[y]) agg[y] = {};
      if (!agg[y][m]) agg[y][m] = {};
      if (!agg[y][m][cat]) agg[y][m][cat] = { net: 0, qty: 0 };
      agg[y][m][cat].net += r.net_sales || 0;
      agg[y][m][cat].qty += r.qty || 0;
    });

    const categories = Array.from(catSet).sort();

    // Determine last filled month for baseYear
    let lastFilledMonth = -1;
    for (let m = 0; m < 12; m++) {
      const hasData = categories.some(c => (agg[baseYear]?.[m]?.[c]?.net || 0) > 0);
      if (hasData) lastFilledMonth = m;
    }
    const activeMonth = lastFilledMonth >= 0 ? lastFilledMonth : new Date().getMonth();

    // Build chart rows: one row per month
    const chartData = MONTH_SHORT.map((month, mi) => {
      const point: Record<string, number | string | null> = { month };
      years.forEach(y => {
        // total (all cats)
        const totalNet = categories.reduce((s, c) => s + (agg[y]?.[mi]?.[c]?.net || 0), 0);
        const totalQty = categories.reduce((s, c) => s + (agg[y]?.[mi]?.[c]?.qty || 0), 0);
        // For current year, null out months after activeMonth so line stops
        const isFuture = y === baseYear && mi > activeMonth;
        point[`${y}`]     = isFuture ? null : totalNet;
        point[`${y}_qty`] = isFuture ? null : totalQty;
        categories.forEach(cat => {
          point[`${y}_${cat}`]     = isFuture ? null : (agg[y]?.[mi]?.[cat]?.net || 0);
          point[`${y}_${cat}_qty`] = isFuture ? null : (agg[y]?.[mi]?.[cat]?.qty || 0);
        });
      });
      return point;
    });

    // YTD per year
    const ytd: Record<number, Record<string, { value: number; qty: number }>> = {};
    years.forEach(y => {
      ytd[y] = { __total__: { value: 0, qty: 0 } };
      const maxM = y === baseYear ? activeMonth : 11;
      categories.forEach(cat => {
        let v = 0, q = 0;
        for (let m = 0; m <= maxM; m++) {
          v += agg[y]?.[m]?.[cat]?.net || 0;
          q += agg[y]?.[m]?.[cat]?.qty || 0;
        }
        ytd[y][cat] = { value: v, qty: q };
        ytd[y]['__total__'].value += v;
        ytd[y]['__total__'].qty  += q;
      });
    });

    return { years, categories, chartData, ytd, activeMonth };
  },

  async getStorePerformance(store: string, year: number) {
    const isAll = !store || store === 'ALL';
    const isHO  = (l: string) => l.toLowerCase().includes('head office') || l.toLowerCase() === 'ho';
    const yStart  = `${year}-01-01`,     yEnd  = `${year}-12-31`;
    const pyStart = `${year - 1}-01-01`, pyEnd = `${year - 1}-12-31`;

    // ── 6 parallel queries ────────────────────────────────────────────
    let q1 = supabase.from('clean_master')
      .select('transaction_date,location,net_sales,gross_sales,val_disc,cost,qty,main_category,salesman,trans_no')
      .gte('transaction_date', yStart).lte('transaction_date', yEnd);
    if (!isAll) q1 = q1.eq('location', store);

    let q2 = supabase.from('clean_master')
      .select('transaction_date,location,net_sales')
      .gte('transaction_date', pyStart).lte('transaction_date', pyEnd);
    if (!isAll) q2 = q2.eq('location', store);

    let q3 = supabase.from('store_budgets')
      .select('month_number,store_name,budget_value').eq('year', year);
    if (!isAll) q3 = q3.eq('store_name', store);

    let q4 = supabase.from('footfall_store')
      .select('transaction_date,location,traffic_in,traffic_out')
      .gte('transaction_date', yStart).lte('transaction_date', yEnd);
    if (!isAll) q4 = q4.eq('location', store);

    // Traffic dari mirror_traffic (AppSheet data) — sesuai GAS Traffic_Summary
    let q5 = supabase.from('mirror_traffic')
      .select('transaction_date,location,prospect_item')
      .gte('transaction_date', yStart).lte('transaction_date', yEnd);
    if (!isAll) q5 = q5.eq('location', store);

    // Advisor annual targets (sum per advisor)
    const q6 = supabase.from('advisor_targets')
      .select('advisor_name,month_number,target_value').eq('year', year);

    const [{ data: rows, error }, { data: pyRows }, { data: budgetRows }, { data: ffRows }, { data: trafficRows }, { data: advTargetRows }] =
      await Promise.all([q1, q2, q3, q4, q5, q6]);
    if (error) throw error;

    // ── Aggregate current year sales ──────────────────────────────────
    let totalSales = 0, totalGross = 0, totalDisc = 0, totalCost = 0, totalQty = 0;
    const txSet = new Set<string>();
    const monthlyTrend = new Array(12).fill(0);
    const catMap: Record<string, { value: number; qty: number }> = {};
    const advMap: Record<string, { location: string; totalSales: number; qty: number; txSet: Set<string> }> = {};

    for (const r of rows || []) {
      if (isHO(r.location || '')) continue;
      const m   = new Date(r.transaction_date).getMonth();
      const net = r.net_sales || 0;
      totalSales += net;
      totalGross += r.gross_sales || 0;
      totalDisc  += r.val_disc || 0;
      totalCost  += r.cost || 0;
      totalQty   += r.qty || 0;
      if (r.trans_no) txSet.add(r.trans_no);
      monthlyTrend[m] += net;

      const cat = (r.main_category || 'Other').trim();
      if (!catMap[cat]) catMap[cat] = { value: 0, qty: 0 };
      catMap[cat].value += net;
      catMap[cat].qty   += r.qty || 0;

      const adv = (r.salesman || '').trim();
      if (adv) {
        if (!advMap[adv]) advMap[adv] = { location: (r.location || '').trim(), totalSales: 0, qty: 0, txSet: new Set() };
        advMap[adv].totalSales += net;
        advMap[adv].qty        += r.qty || 0;
        if (r.trans_no) advMap[adv].txSet.add(r.trans_no);
      }
    }
    const transCount = txSet.size;

    // ── Prev year ─────────────────────────────────────────────────────
    const prevYearTrend = new Array(12).fill(0);
    let prevYearSales = 0;
    for (const r of pyRows || []) {
      if (isHO(r.location || '')) continue;
      prevYearTrend[new Date(r.transaction_date).getMonth()] += r.net_sales || 0;
      prevYearSales += r.net_sales || 0;
    }

    // ── Budgets ───────────────────────────────────────────────────────
    const monthlyTargets = new Array(12).fill(0);
    for (const b of budgetRows || []) monthlyTargets[(b.month_number || 1) - 1] += b.budget_value || 0;
    const annualTarget = monthlyTargets.reduce((s, v) => s + v, 0);

    // ── Footfall (door counter) ───────────────────────────────────────
    let footfall = 0;
    for (const f of ffRows || []) {
      const ti = f.traffic_in || 0, to = f.traffic_out || 0;
      footfall += to > 0 ? Math.min(ti, to) : ti;
    }

    // ── Traffic (AppSheet CRM) + breakdown by prospect_item ──────────
    let trafficBerhasil = 0, trafficGagal = 0, trafficMenunggu = 0, trafficPotensial = 0, trafficNego = 0;
    for (const t of trafficRows || []) {
      const p = (t.prospect_item || '').toLowerCase();
      if      (p.includes('berhasil'))  trafficBerhasil++;
      else if (p.includes('gagal'))     trafficGagal++;
      else if (p.includes('menunggu'))  trafficMenunggu++;
      else if (p.includes('negosiasi')) trafficNego++;
      else if (p.includes('potensial')) trafficPotensial++;
    }
    const traffic = (trafficRows || []).length;

    // ── Advisor targets (sum all months per advisor) ──────────────────
    const advTargetMap: Record<string, number> = {};
    for (const t of advTargetRows || []) {
      const name = (t.advisor_name || '').trim();
      advTargetMap[name] = (advTargetMap[name] || 0) + (t.target_value || 0);
    }

    // ── Derived KPIs ──────────────────────────────────────────────────
    const achievement    = annualTarget > 0 ? (totalSales / annualTarget) * 100 : 0;
    const avgTransValue  = transCount   > 0 ? totalSales / transCount : 0;
    const discountPct    = totalGross   > 0 ? (totalDisc / totalGross) * 100 : 0;
    const costPct        = totalGross   > 0 ? (totalCost / totalGross) * 100 : 0;
    const yoyGrowth      = prevYearSales > 0 ? ((totalSales - prevYearSales) / prevYearSales) * 100 : 0;
    const captureRate    = footfall > 0 ? (traffic / footfall) * 100 : 0;
    const conversionRate = traffic  > 0 ? (transCount / traffic) * 100 : 0;

    const categoryStats = Object.entries(catMap)
      .map(([name, d]) => ({ name, value: d.value, qty: d.qty }))
      .sort((a, b) => b.value - a.value);

    const advisorStats = Object.entries(advMap)
      .map(([name, d]) => {
        const target = advTargetMap[name] || 0;
        return {
          name, location: d.location,
          totalSales: d.totalSales, qty: d.qty, trans: d.txSet.size,
          target,
          achievement: target > 0 ? (d.totalSales / target) * 100 : 0,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);

    return {
      store: isAll ? 'ALL' : store,
      year,
      prevYear: year - 1,
      kpi: { totalSales, annualTarget, achievement, avgTransValue, transCount, discountPct, costPct, yoyGrowth, prevYearSales },
      efficiency: {
        footfall, traffic, captureRate, conversionRate,
        trafficBreakdown: { berhasil: trafficBerhasil, gagal: trafficGagal, menunggu: trafficMenunggu, potensial: trafficPotensial, nego: trafficNego },
      },
      monthlyTrend,
      prevYearTrend,
      monthlyTargets,
      categoryStats,
      advisorStats,
    };
  },

  async getClientelingData(year: number) {
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
  },

  async getProductRank(month: number, year: number, store = 'ALL') {
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
  },

  async getHeatmapData(month: number, year: number, store = 'ALL') {
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
  },

  async getEventSellingPlan(profile: CrmProfilingRow) {
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
  },

  async getCrmProfiling(search = '', store = ''): Promise<CrmProfilingRow[]> {
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
  },

  async getDailyBreakdown(month: string, year: number) {
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
  },
};

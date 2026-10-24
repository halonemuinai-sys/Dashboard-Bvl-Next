import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { advisorHomeResolver, normalizeReportStore, isReportCrossing, type AdvisorHome, type AdvisorRotation } from '@/lib/report-attribution';
import { businessDate, salesDate } from '@/lib/sales-chart-data';
import type { MonthlyOverviewData, CategoryTrendData, StorePerformanceRow } from './types';
import { MONTH_NAMES } from './constants';
import type { RequestCache } from '@/lib/request-cache';

const isHeadOffice = (value: string) => {
  const key = (value || '').trim().toLowerCase();
  return key.includes('head office') || key === 'ho';
};
const overviewStore = (value: string) => isHeadOffice(value) ? 'Head Office' : normalizeReportStore(value);

export interface OverviewSale {
  transaction_date: string; location: string; net_sales: number; gross_sales: number;
  val_disc: number; cost: number; qty: number; main_category: string;
  trans_no: string; customer: string; salesman: string; comm: number;
}
/** Net sales per Jakarta calendar month, Head Office excluded (view clean_master_monthly_net). */
export interface MonthlyNetTotal { year: number; month: number; net_sales: number }
export interface OverviewSources {
  sales: OverviewSale[];
  monthlyTotals?: MonthlyNetTotal[];
  targets: { year: number; month_number: number; target_value: number; store_name: string }[];
  advisors: AdvisorHome[];
  rotations: AdvisorRotation[];
}
export async function getMonthlyOverview(month: string, year: number, cache?: RequestCache): Promise<MonthlyOverviewData> {
  const monthIndex = MONTH_NAMES.indexOf(month);
  if (monthIndex < 0 || !Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('Invalid reporting period.');
  const now = new Date();
  const currentYear = Number(businessDate(now).slice(0, 4));
  const fromYear = Math.min(2023, year - 1);
  const toYear = Math.max(currentYear, year);
  const read = <T>(key: string, loader: () => Promise<T>) => cache ? cache.read(`${businessDate(now)}:${key}`, loader) : loader();
  // Only the selected and previous year need invoice-level details. Other years feed
  // only the annual chart, so they come as monthly totals computed by the database.
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i);
  const detailedYears = years.filter(y => y === year || y === year - 1);
  const chartYears = years.filter(y => !detailedYears.includes(y));
  async function loadRows(list: number[], workers: number, detailed: boolean) {
    const byYear: OverviewSale[][] = new Array(list.length);
    let next = 0, failed = false;
    await Promise.all(Array.from({ length: Math.min(workers, list.length) }, async () => {
      while (!failed && next < list.length) {
        const index = next++;
        const salesYear = list[index];
        try {
          byYear[index] = await read(`sales:${salesYear}:${detailed}`, async () => {
            const rows = await fetchAllRows((from, to) => supabase.from('clean_master')
              .select(detailed ? 'transaction_date,location,net_sales,gross_sales,val_disc,cost,qty,main_category,trans_no,customer,salesman,comm' : 'transaction_date,location,net_sales')
              .gte('transaction_date', salesYear + '-01-01T00:00:00+07:00')
              .lt('transaction_date', (salesYear + 1) + '-01-01T00:00:00+07:00').order('id').range(from, to));
            return rows as unknown as OverviewSale[];
          });
        } catch (error) { failed = true; throw error; }
      }
    }));
    return byYear.flat();
  }
  async function loadChartYears(): Promise<{ rows: OverviewSale[]; totals: MonthlyNetTotal[] }> {
    if (!chartYears.length) return { rows: [], totals: [] };
    try {
      const totals = await read(`monthly-net:${chartYears.join(',')}`, () => fetchAllRows<MonthlyNetTotal>((from, to) => supabase
        .from('clean_master_monthly_net').select('year,month,net_sales').in('year', chartYears).order('year').order('month').range(from, to)));
      return { rows: [], totals };
    } catch {
      // A database without the view (e.g. the old Supabase project): fall back to raw rows for these years.
      return { rows: await loadRows(chartYears, 1, false), totals: [] };
    }
  }
  const [detailedRows, chart, targets, advisors, rotations] = await Promise.all([
    loadRows(detailedYears, 2, true),
    loadChartYears(),
    read(`targets:${fromYear}:${toYear}`, () => fetchAllRows((from, to) => supabase.from('targets').select('year,month_number,target_value,store_name')
      .gte('year', fromYear).lte('year', toYear).order('year').order('month_number').order('store_name').range(from, to))),
    read('advisors', () => fetchAllRows((from, to) => supabase.from('advisors').select('name,home_location').order('name').range(from, to))),
    read(`rotations:${year}:${monthIndex}`, () => fetchAllRows((from, to) => supabase.from('advisor_rotations').select('advisor_name,assigned_location')
      .eq('year', year).eq('month_number', monthIndex + 1).order('advisor_name').range(from, to))),
  ]);
  return aggregateMonthlyOverview(month, year, { sales: [...detailedRows, ...chart.rows], monthlyTotals: chart.totals, targets, advisors, rotations }, now);
}

export function aggregateMonthlyOverview(month: string, year: number, sources: OverviewSources, now = new Date()): MonthlyOverviewData {
  const monthIndex = MONTH_NAMES.indexOf(month);
  if (monthIndex < 0) throw new Error('Invalid reporting month.');
  const today = businessDate(now);
  const [currentYear, currentMonthNumber, currentDay] = today.split('-').map(Number);
  const currentMonthIdx = currentMonthNumber - 1;
  // Normalise every timestamp to its Jakarta calendar date once; the code below reads slice(0, 10).
  const multiYearRows = sources.sales.map(row => ({ ...row, transaction_date: salesDate(row.transaction_date) })).filter(row => {
    const date = row.transaction_date;
    const parsed = new Date(date + 'T00:00:00Z');
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime())
      && parsed.toISOString().slice(0, 10) === date && date <= today;
  });
  const allTargetRows = sources.targets;
  const advisorProfiles = sources.advisors;
  const rotationRows = sources.rotations;
  const multiYearStats: Record<number, number[]> = {};
  const multiYearTargets: Record<number, number[]> = {};
  for (let y = Math.min(2023, year); y <= Math.max(currentYear, year); y++) {
    multiYearStats[y] = new Array(12).fill(0);
    multiYearTargets[y] = new Array(12).fill(0);
  }
  multiYearRows.forEach(row => {
    if (isHeadOffice(row.location)) return;
    const date = new Date(row.transaction_date.slice(0, 10) + 'T00:00:00Z');
    if (multiYearStats[date.getUTCFullYear()]) multiYearStats[date.getUTCFullYear()][date.getUTCMonth()] += row.net_sales || 0;
  });
  // Chart-only years arrive pre-aggregated (Head Office and future days already excluded).
  sources.monthlyTotals?.forEach(total => {
    if (multiYearStats[total.year] && total.month >= 1 && total.month <= 12) multiYearStats[total.year][total.month - 1] += Number(total.net_sales) || 0;
  });
  allTargetRows.forEach(target => {
    if (multiYearTargets[target.year] && target.month_number >= 1 && target.month_number <= 12
      && !isHeadOffice(target.store_name)) {
      multiYearTargets[target.year][target.month_number - 1] += target.target_value || 0;
    }
  });

  // --- 4. Fetch Targets for the selected month (UI Cards) ---
  const targetMap: Record<string, number> = {};
  let annualTargetExcHO = 0;

  allTargetRows?.forEach(t => {
    if (t.year === year) {
      const isHO = isHeadOffice(t.store_name);
      if (!isHO) annualTargetExcHO += (t.target_value || 0);
      if (t.month_number === (monthIndex + 1)) {
        const store = overviewStore(t.store_name || '');
        targetMap[store] = (targetMap[store] || 0) + (t.target_value || 0);
      }
    }
  });

  // --- 5. SINGLE PASS AGGREGATION for Monthly Overview ---
  // (We filter the multiYearRows for the specific year and month to get the detailed KPIs)
  const yearData = multiYearRows?.filter(r => new Date(r.transaction_date.slice(0, 10) + 'T00:00:00Z').getUTCFullYear() === year) || [];
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

  const resolveHome = advisorHomeResolver(advisorProfiles, rotationRows);

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
  let annualTotalGross = 0, annualTotalCost = 0, annualTotalValDisc = 0;
  const storeStats: Record<string, { net: number; cost: number; qty: number }> = {};
  const catStats: Record<string, { qty: number; net: number }> = {};
  const dailyStats = Array.from({length: 31}, () => ({ net: 0, qty: 0 }));

  // Real MTD bounds for fair comparison
  const isCurrentMonth = year === currentYear && monthIndex === currentMonthIdx;
  const maxDay = isCurrentMonth ? currentDay : 31;

  rows.forEach(row => {
    const d = new Date(row.transaction_date.slice(0, 10) + 'T00:00:00Z');
    const rMonth = d.getUTCMonth();
    const net = row.net_sales || 0;
    const qty = row.qty || 0;
    const loc = overviewStore(row.location || '');
    const cat = (row.main_category || 'Other').trim();
    const isHO = isHeadOffice(loc);

    // A: Trend Stats
    trendStats[rMonth].net += net;
    trendStats[rMonth].qty += qty;
    if (row.trans_no) trendStats[rMonth].transSet.add(row.trans_no);
    if (row.customer && row.customer.toLowerCase() !== 'customer') trendStats[rMonth].custSet.add(row.customer);

    // C: Annual Sales Exc HO
    if (!isHO) annualSalesExcHO += net;

    // C2: Annual Cost % / Avg Disc % — Exc HO, full selected year (Jan-Dec)
    if (!isHO) {
      annualTotalGross += (row.gross_sales || 0);
      annualTotalCost += (row.cost || 0) + (row.comm || 0);
      annualTotalValDisc += (row.val_disc || 0);
    }

    // D: Category Trend
    if (!categoryTrend[cat]) categoryTrend[cat] = { net: new Array(12).fill(0), qty: new Array(12).fill(0) };
    categoryTrend[cat].net[rMonth] += net;
    categoryTrend[cat].qty[rMonth] += qty;

    // F: Crossing Sales & Mobility check (GAS Style)
    if (rMonth === monthIndex) {
      const home = resolveHome(row.salesman || '', loc);
      // Physical sales stay in their store when the advisor has no retail assignment.
      if (crossingResult.storeStats[loc]) {
        crossingResult.storeStats[loc].physical += net;
        const attributedStore = crossingResult.storeStats[home] ? home : loc;
        crossingResult.storeStats[attributedStore].adjusted += net;
        if (isReportCrossing(home, loc)) {
          crossingResult.totalNet += net;
          crossingResult.totalQty += qty;
          const salesman = row.salesman || 'Unknown';
          const key = salesman.trim().toLowerCase() + '||' + home + '||' + loc;
          const record = crossingRecordMap.get(key) || { salesman, baseLoc: home, crossingLoc: loc, net: 0, qty: 0 };
          record.net += net; record.qty += qty;
          crossingRecordMap.set(key, record);
        }
      }

      monthlyRows.push(row);
      totalNet += net; // Total Sales Inc. HO — HO breakdown shown separately in the UI
      if (!isHO) {
        totalGross += (row.gross_sales || 0);
        totalCost += (row.cost || 0) + (row.comm || 0);
        totalValDisc += (row.val_disc || 0);
      }
      totalQty += qty;

      if (!storeStats[loc]) storeStats[loc] = { net: 0, cost: 0, qty: 0 };
      storeStats[loc].net += net;
      storeStats[loc].cost += (row.cost || 0) + (row.comm || 0);
      storeStats[loc].qty += qty;

      if (!catStats[cat]) catStats[cat] = { qty: 0, net: 0 };
      catStats[cat].net += net;
      catStats[cat].qty += qty;

      const day = d.getUTCDate() - 1;
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
    if (!isHeadOffice(loc)) {
      // MTD Qty & Tx (Current)
      const d = new Date(r.transaction_date.slice(0, 10) + 'T00:00:00Z');
      if (d.getUTCDate() <= maxDay) {
        currentMtd += (r.net_sales || 0);
        mtdQtyCurrent += (r.qty || 0);
        if (r.trans_no) mtdTxSetCurrent.add(r.trans_no);
      }
    }
  });

  multiYearRows?.forEach(r => {
    const d = new Date(r.transaction_date.slice(0, 10) + 'T00:00:00Z');
    const loc = (r.location || '').trim();
    if (isHeadOffice(loc)) return;

    const rYear = d.getUTCFullYear();
    const rMonth = d.getUTCMonth();
    const rDay = d.getUTCDate();

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
  const storeData: StorePerformanceRow[] = [];
  allStoreNames.forEach(store => {
    const actual = storeStats[store]?.net || 0;
    const cost = storeStats[store]?.cost || 0;
    const qtyS = storeStats[store]?.qty || 0;
    const target = targetMap[store] || 0;
    storeData.push({
      store, actual, cost, target, qty: qtyS,
      achievement: target > 0 ? (actual / target) * 100 : 0
    });
  });

  crossingResult.records = Array.from(crossingRecordMap.values()).sort((a, b) => b.net - a.net);

  const activeStores = storeData.filter(s => !isHeadOffice(s.store));
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
      annualTotalCost,
      annualCostPercentage: annualTotalGross > 0 ? (annualTotalCost / annualTotalGross) * 100 : 0,
      annualTotalValDisc,
      annualAvgDiscountPercentage: annualTotalGross > 0 ? (annualTotalValDisc / annualTotalGross) * 100 : 0,
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
    multiYearTargets,
    asOfDate: today,
    categoryTrend,
    crossingData: crossingResult,
    advisorData: [], // Loaded separately via getAdvisorPerformance
    dailyTrendData: dailyStats.slice(0, new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate())
  };
}

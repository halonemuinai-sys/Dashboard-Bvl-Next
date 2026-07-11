import { supabase } from '@/lib/supabase';

/**
 * Quarterly Budget — Actual vs Budget per store per month
 * Mirrors GAS getQuarterlyBudgetData() from 8-API_Quarterly.gs
 */
export async function getQuarterlyBudget(quarter: number, year: number) {
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
}

/**
 * Annual Net Sales — mirrors GAS getAnnualNetSalesData()
 * Per-store monthly breakdown + YoY vs previous year + targets
 */
export async function getAnnualNetSales(year: number) {
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
}

/**
 * Quarterly Standard — mirrors GAS getQuarterlyData()
 * QTD sales, monthly pacing, category breakdown, top collections & catalogues
 */
export async function getQuarterlyStandard(quarter: number, year: number) {
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
}

/**
 * Forecasting & Projection — mirrors GAS getForecastingData()
 * Month-end projection, year-end projection, category momentum, store projections,
 * day-of-week patterns, holiday impact, seasonal chart
 */
export async function getForecastingData(year: number, activeMonthIdx?: number) {
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
}

export async function getSimulatorBaseline(year: number, month: number) {
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

  (footfallData || []).forEach((f: any) => {
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
}

export async function getCategorySalesTrend(baseYear: number) {
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
}

export async function getStorePerformance(store: string, year: number) {
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
}

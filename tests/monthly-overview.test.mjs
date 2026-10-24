import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
function loadTS(relative, mocks = {}) {
  const filename = path.resolve(relative);
  const compiledModule = new Module(filename);
  compiledModule.filename = filename;
  compiledModule.paths = Module._nodeModulePaths(path.dirname(filename));
  const realRequire = compiledModule.require.bind(compiledModule);
  compiledModule.require = name => Object.hasOwn(mocks, name) ? mocks[name] : realRequire(name);
  compiledModule._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
  return compiledModule.exports;
}

const charts = loadTS('src/lib/sales-chart-data.ts');
const attribution = loadTS('src/lib/report-attribution.ts');
const pager = loadTS('src/lib/fetch-all-rows.ts');
const { createRequestCache } = loadTS('src/lib/request-cache.ts');
const constants = loadTS('src/services/dashboard/constants.ts');
function service(db = {}) {
  return loadTS('src/services/dashboard/overviewService.ts', {
    '@/lib/supabase': { supabase: db }, '@/lib/fetch-all-rows': pager,
    '@/lib/report-attribution': attribution, '@/lib/sales-chart-data': charts, './constants': constants,
  });
}
const { aggregateMonthlyOverview } = service();
const now = new Date('2026-10-20T05:00:00Z');
function sale(patch = {}) {
  return { transaction_date: '2026-10-01', location: 'Plaza Indonesia', net_sales: 100, gross_sales: 200,
    val_disc: 10, cost: 40, qty: 1, main_category: 'Jewelry', trans_no: 'INV-1', customer: 'Example',
    salesman: 'Advisor', comm: 10, ...patch };
}
function sources(sales = [], patch = {}) { return { sales, targets: [], advisors: [], rotations: [], ...patch }; }

test('monthly totals, daily totals, HO scope, cost rate and fair MTD comparisons reconcile', () => {
  const input = sources([
    sale(),
    sale({ transaction_date: '2026-10-20', net_sales: 200, gross_sales: 300, cost: 60, comm: 15, qty: 2 }),
    sale({ transaction_date: '2026-10-05', location: 'Head Office', net_sales: 50, cost: 999 }),
    sale({ transaction_date: '2026-10-21', net_sales: 9999 }),
    sale({ transaction_date: '2025-10-20', net_sales: 150, qty: 2 }),
    sale({ transaction_date: '2025-10-21', net_sales: 1000 }),
    sale({ transaction_date: '2026-09-20', net_sales: 120, qty: 2 }),
    sale({ transaction_date: '2026-09-21', net_sales: 80 }),
  ], { targets: [
    { year: 2026, month_number: 10, store_name: 'Plaza Indonesia', target_value: 600 },
    { year: 2026, month_number: 10, store_name: 'Head Office', target_value: 999 },
  ] });
  const result = aggregateMonthlyOverview('October', 2026, input, now);
  assert.equal(result.kpi.totalNet, 350);
  assert.equal(result.dailyTrendData.reduce((sum, day) => sum + day.net, 0), 350);
  assert.equal(result.kpi.costPercentage, 25);
  assert.equal(result.kpi.avgDiscountPercentage, 4);
  assert.equal(result.kpi.achievement, 50);
  assert.equal(result.kpi.mtdSalesCurrent, 300);
  assert.equal(result.kpi.mtdSalesPrevYear, 150);
  assert.equal(result.kpi.mtdGrowthPct, 100);
  assert.equal(result.kpi.momGrowthPct, 150);
  assert.equal(result.kpi.mtdQtyCurrent, 3);
  assert.equal(result.kpi.mtdTxCurrent, 1);
  assert.equal(result.kpi.ytdQtyCurrent, 6);
  assert.equal(result.annualStats.salesExcHO, 500);
  assert.equal(result.multiYearStats[2026][9], 300);
});

test('targets never replace actuals and years continue beyond 2026', () => {
  const result = aggregateMonthlyOverview('January', 2027, sources([
    sale({ transaction_date: '2027-01-03', net_sales: 400 }),
  ], { targets: [
    { year: 2027, month_number: 1, store_name: 'Plaza Indonesia', target_value: 500 },
    { year: 2027, month_number: 2, store_name: 'Plaza Indonesia', target_value: 900 },
  ] }), new Date('2027-01-20T00:00:00Z'));
  assert.equal(result.multiYearStats[2027][0], 400);
  assert.equal(result.multiYearStats[2027][1], 0);
  assert.equal(result.multiYearTargets[2027][1], 900);
  assert.equal(result.annualStats.salesExcHO, 400);
  assert.equal(result.annualStats.target, 1400);
});

test('January compares with December of the previous year and leap-month days are preserved', () => {
  const jan = aggregateMonthlyOverview('January', 2026, sources([
    sale({ transaction_date: '2026-01-02', net_sales: 100 }),
    sale({ transaction_date: '2025-12-02', net_sales: 50 }),
  ]), now);
  assert.equal(jan.kpi.momGrowthPct, 100);
  const feb = aggregateMonthlyOverview('February', 2024, sources([sale({ transaction_date: '2024-02-29', net_sales: 20 })]), now);
  assert.equal(feb.dailyTrendData.length, 29);
  assert.equal(feb.dailyTrendData[28].net, 20);
});

test('crossing uses shared advisor rotation, normalizes Bali and conserves physical sales', () => {
  const input = sources([
    sale({ location: 'Bali Boutique', salesman: 'Bali Advisor' }),
    sale({ location: 'Plaza Indonesia', salesman: ' Rotating Advisor ', net_sales: 200 }),
    sale({ location: 'Plaza Senayan', salesman: 'Office Advisor', net_sales: 300 }),
  ], {
    advisors: [{ name: 'Bali Advisor', home_location: 'Bali' }, { name: 'Rotating Advisor', home_location: 'Plaza Indonesia' }, { name: 'Office Advisor', home_location: 'Head Office' }],
    rotations: [{ advisor_name: 'rotating advisor', assigned_location: 'Plaza Senayan' }],
    targets: [{ year: 2026, month_number: 10, store_name: 'Bali', target_value: 200 }],
  });
  const result = aggregateMonthlyOverview('October', 2026, input, now);
  assert.equal(result.crossingData.records.length, 1);
  assert.equal(result.crossingData.totalNet, 200);
  assert.deepEqual(result.crossingData.storeStats['Bali'], { physical: 100, adjusted: 100 });
  assert.deepEqual(result.crossingData.storeStats['Plaza Senayan'], { physical: 300, adjusted: 500 });
  assert.equal(result.storeData.find(store => store.store === 'Bali').achievement, 50);
  const values = Object.values(result.crossingData.storeStats);
  assert.equal(values.reduce((s, r) => s + r.physical, 0), values.reduce((s, r) => s + r.adjusted, 0));
});

test('daily series keeps zero/negative sales, excludes future days and computes a true trailing average', () => {
  const days = Array.from({ length: 31 }, (_, i) => ({ net: i === 0 ? -70 : i === 1 ? 0 : 70, qty: 1 }));
  const result = charts.buildDailySalesSeries(days, 2026, 9, '2026-10-08');
  assert.equal(result[0].net, -70);
  assert.equal(result[1].net, 0);
  assert.equal(result[1].average, -35);
  assert.equal(result[7].average, 60);
  assert.equal(result[7].cumulative, 350);
  assert.equal(result[8].net, null);
  assert.equal(result[8].average, null);
  assert.equal(result[8].cumulative, null);
  assert.equal(charts.buildDailySalesSeries([], 2024, 1, '2024-03-01').length, 29);
  assert.equal(charts.businessDate(new Date('2026-10-19T18:00:00Z')), '2026-10-20');
});

// Postgres compares timestamptz by instant (session time zone UTC), not as text.
const instant = value => Date.parse(/(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : value + 'Z');
const cmp = (a, b) => typeof a === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(a) && /^\d{4}-\d{2}-\d{2}T/.test(String(b)) ? instant(a) - instant(b) : a < b ? -1 : a > b ? 1 : 0;
function database(tables, failTable) {
  const calls = [];
  return { calls, from(table) {
    const filters = [];
    let start = 0, end = Infinity, columns = '', fromDate = '';
    const q = {
      select(value) { columns = value; return q; }, order() { return q; },
      gte(key, value) { if (key === 'transaction_date') fromDate = value; filters.push(row => cmp(row[key], value) >= 0); return q; },
      lte(key, value) { filters.push(row => cmp(row[key], value) <= 0); return q; },
      lt(key, value) { filters.push(row => cmp(row[key], value) < 0); return q; },
      eq(key, value) { filters.push(row => row[key] === value); return q; },
      in(key, values) { filters.push(row => values.includes(row[key])); return q; },
      range(from, to) { start = from; end = to; return q; },
      then(resolve, reject) {
        calls.push({ table, start, end, columns, fromDate });
        return Promise.resolve(table === failTable ? { data: null, error: { message: 'Source unavailable' } } : { data: (tables[table] || []).filter(row => filters.every(filter => filter(row))).slice(start, end + 1).map(row => Object.fromEntries(columns.split(',').map(key => [key, row[key]]))), error: null }).then(resolve, reject);
      },
    };
    return q;
  } };
}

test('service paginates beyond API limits instead of truncating sales', async () => {
  const db = database({ clean_master: Array.from({ length: 1201 }, (_, i) => sale({ id: i, trans_no: 'INV-' + i, transaction_date: '2024-10-01T00:00:00', net_sales: 1 })) });
  const result = await service(db).getMonthlyOverview('October', 2024);
  assert.equal(result.kpi.totalNet, 1201);
  assert.equal(result.kpi.mtdTxCurrent, 1201);
  assert.deepEqual(db.calls.filter(call => call.table === 'clean_master' && call.fromDate.startsWith('2024-')).map(call => call.start), [0, 500, 1000]);
});

test('failed target/advisor sources do not silently become zero targets or false crossing', async () => {
  for (const table of ['targets', 'advisors', 'advisor_rotations', 'clean_master']) {
    await assert.rejects(service(database({}, table)).getMonthlyOverview('October', 2026), /Source unavailable/);
  }
});

test('advisor summary includes every page and the full last day, but excludes the next month', async () => {
  const db = database({
    clean_master: [
      ...Array.from({ length: 1001 }, (_, i) => sale({ id: i, trans_no: 'INV-' + i, transaction_date: '2024-09-30T17:00:00+00:00', location: 'Bali Boutique', net_sales: 1 })),
      sale({ transaction_date: '2024-10-31T00:00:00+00:00', location: 'Bali', net_sales: 100, trans_no: 'LAST-DAY' }),
      sale({ transaction_date: '2024-10-31T17:00:00+00:00', net_sales: 999 }),
    ],
    advisors: [{ name: 'Advisor', home_location: 'Bali' }],
    advisor_targets: [{ advisor_name: 'Advisor', year: 2024, month_number: 10, target_value: 2000 }],
    targets: [{ store_name: 'Bali', year: 2024, month_number: 10, target_value: 2000 }],
  });
  const module = loadTS('src/services/dashboard/advisorService.ts', {
    '@/lib/supabase': { supabase: db }, '@/lib/fetch-all-rows': pager,
    '@/lib/report-attribution': attribution, '@/lib/sales-chart-data': charts, './constants': constants,
  });
  const result = await module.getAdvisorPerformance('October', 2024);
  assert.equal(result.advisors[0].netSales, 1101);
  assert.equal(result.advisors[0].transCount, 1002);
  assert.equal(result.advisors[0].crossingNet, 0);
  assert.equal(result.advisors[0].location, 'Bali');
  assert.equal(result.advisors[0].storeData.totalSales, 1101);
});

test('chart axes use compact English units for positive, zero and negative amounts', () => {
  assert.equal(charts.formatSalesAxis(1000000000), '1B');
  assert.equal(charts.formatSalesAxis(-250000000), '-250M');
  assert.equal(charts.formatSalesAxis(0), '0');
});

test('HO aliases are included in monthly total but excluded from retail targets and annual charts', () => {
  const data = aggregateMonthlyOverview('October', 2026, sources([sale(), sale({ location: ' HO ', net_sales: 50 })], {
    targets: [{ year: 2026, month_number: 10, store_name: 'HO', target_value: 900 }],
  }), now);
  assert.equal(data.kpi.totalNet, 150);
  assert.equal(data.multiYearStats[2026][9], 100);
  assert.equal(data.multiYearTargets[2026][9], 0);
  assert.equal(data.kpi.totalTarget, 0);
  assert.equal(data.storeData.find(store => store.store === 'Head Office').actual, 50);
});

test('salesDate reads clean_master timestamps as Jakarta calendar dates', () => {
  assert.equal(charts.salesDate('2023-11-30T17:00:00+00:00'), '2023-12-01');
  assert.equal(charts.salesDate('2023-12-01T00:00:00+00:00'), '2023-12-01');
  assert.equal(charts.salesDate('2023-12-01'), '2023-12-01');
  assert.equal(charts.salesDate(''), '');
});

test('legacy 17:00 UTC rows count in the Jakarta month, not the previous UTC day', () => {
  const data = aggregateMonthlyOverview('October', 2026, { targets: [], advisors: [], rotations: [], sales: [
    sale({ transaction_date: '2026-09-30T17:00:00+00:00', net_sales: 500 }),
    sale({ transaction_date: '2026-10-01T00:00:00+00:00', net_sales: 300 }),
  ] }, now);
  assert.equal(data.multiYearStats[2026][9], 800);
  assert.equal(data.multiYearStats[2026][8], 0);
});


test('changing month reuses sales history and targets; refresh forces all sources to reload', async () => {
  const db = database({ clean_master: [sale({ transaction_date: '2024-10-01', net_sales: 200 }), sale({ transaction_date: '2024-11-01', net_sales: 300 })] });
  const api = service(db); const cache = createRequestCache();
  assert.equal((await api.getMonthlyOverview('October', 2024, cache)).kpi.totalNet, 200);
  const first = db.calls.length;
  assert.equal((await api.getMonthlyOverview('November', 2024, cache)).kpi.totalNet, 300);
  assert.deepEqual(db.calls.slice(first).map(call => call.table), ['advisor_rotations']);
  const second = db.calls.length;
  cache.clear(); await api.getMonthlyOverview('November', 2024, cache);
  assert.ok(db.calls.slice(second).some(call => call.table === 'clean_master'));
});

test('chart-only years come as database monthly totals while comparison years keep full detail', async () => {
  const db = database({
    clean_master: [sale({ transaction_date: '2023-10-01', net_sales: 250 }), sale({ transaction_date: '2025-10-01', net_sales: 500 }), sale({ transaction_date: '2026-10-01', net_sales: 1000 })],
    clean_master_monthly_net: [{ year: 2023, month: 10, net_sales: 250 }, { year: 2024, month: 3, net_sales: 75 }],
  });
  const data = await service(db).getMonthlyOverview('October', 2026);
  assert.ok(!db.calls.some(c => c.table === 'clean_master' && /^202[34]-/.test(c.fromDate)), 'no raw rows for chart-only years');
  assert.ok(db.calls.find(c => c.fromDate.startsWith('2025-')).columns.includes('trans_no'));
  assert.ok(db.calls.find(c => c.fromDate.startsWith('2026-')).columns.includes('cost'));
  assert.equal(data.multiYearStats[2023][9], 250);
  assert.equal(data.multiYearStats[2024][2], 75);
  assert.equal(data.multiYearStats[2025][9], 500);
  assert.equal(data.kpi.mtdSalesPrevYear, 500);
});

test('without the monthly view, chart-only years fall back to three-column raw rows', async () => {
  const db = database({ clean_master: [sale({ transaction_date: '2023-10-01', net_sales: 250 }), sale({ transaction_date: '2023-10-02', location: 'Head Office', net_sales: 999 }), sale({ transaction_date: '2026-10-01', net_sales: 1000 })] }, 'clean_master_monthly_net');
  const data = await service(db).getMonthlyOverview('October', 2026);
  assert.equal(db.calls.find(c => c.table === 'clean_master' && c.fromDate.startsWith('2023-')).columns, 'transaction_date,location,net_sales');
  assert.equal(data.multiYearStats[2023][9], 250);
  assert.equal(data.kpi.totalNet, 1000);
});

test('cache deduplicates in-flight loads, expires and retries errors', async () => {
  let time = 0, calls = 0;
  const cache = createRequestCache(60, 2, () => time);
  const loader = async () => ++calls;
  assert.deepEqual(await Promise.all([cache.read('a', loader), cache.read('a', loader)]), [1, 1]);
  time = 59; assert.equal(await cache.read('a', loader), 1);
  time = 60; assert.equal(await cache.read('a', loader), 2);
  await assert.rejects(cache.read('bad', async () => { throw Error('offline'); }));
  assert.equal(await cache.read('bad', loader), 3);
  await cache.read('third', loader);
  assert.equal(await cache.read('a', loader), 5);
});

test('clearing during an in-flight load cannot repopulate the refreshed cache', async () => {
  const cache = createRequestCache(); let finish;
  const stale = cache.read('key', () => new Promise(resolve => { finish = resolve; }));
  await Promise.resolve(); cache.clear();
  assert.equal(await cache.read('key', async () => 'fresh'), 'fresh');
  finish('old'); assert.equal(await stale, 'old');
  assert.equal(await cache.read('key', async () => 'wrong'), 'fresh');
});

test('cold sales loading overlaps requests but never exceeds three concurrent sales requests', async () => {
  const db = database({}); const originalFrom = db.from;
  let active = 0, peak = 0;
  db.from = table => {
    const query = originalFrom(table);
    if (table !== 'clean_master' && table !== 'clean_master_monthly_net') return query;
    const then = query.then;
    query.then = (resolve, reject) => {
      active++; peak = Math.max(peak, active);
      return new Promise(done => setTimeout(done, 5))
        .then(() => then(value => value))
        .finally(() => { active--; }).then(resolve, reject);
    };
    return query;
  };
  await service(db).getMonthlyOverview('October', 2026);
  assert.equal(peak, 3); assert.equal(active, 0);
});

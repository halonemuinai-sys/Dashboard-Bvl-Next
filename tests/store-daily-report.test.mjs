import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
import ExcelJS from 'exceljs';

const cache = new Map();
function loadTS(relative, mocks = {}) {
  const filename = path.resolve(relative.endsWith('.ts') ? relative : `${relative}.ts`);
  if (!Object.keys(mocks).length && cache.has(filename)) return cache.get(filename);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const module = new Module(filename); module.filename = filename; module.paths = Module._nodeModulePaths(path.dirname(filename));
  const require = module.require.bind(module);
  module.require = id => {
    if (id in mocks) return mocks[id];
    if (id === '@/lib/supabase') return { supabase: {} };
    if (id.startsWith('@/')) return loadTS(path.join('src', id.slice(2)), mocks);
    if (id.startsWith('.')) return loadTS(path.resolve(path.dirname(filename), id), mocks);
    return require(id);
  };
  // Resolve source module extension without a runtime TS loader.
  module._compile(compiled, filename);
  if (!Object.keys(mocks).length) cache.set(filename, module.exports);
  return module.exports;
}
const { buildStoreReportData } = loadTS('src/services/storeDailyReport.ts');
const { buildStoreDailyWorkbook } = loadTS('src/services/storeDailyWorkbook.ts');
const { aggregateProductivity, getAdvisorProductivity } = loadTS('src/services/dashboard/productivityService.ts');
const homes = [{ name: 'A', home_location: 'Plaza Indonesia' }, { name: 'B', home_location: 'Plaza Senayan' }, { name: 'C', home_location: 'Plaza Senayan' }];
const rotations = [{ advisor_name: 'C', assigned_location: 'Plaza Indonesia' }];
function invoice(id, advisor, store, net, type = 'Regular', collection = 'Serpenti') {
  const trans_no = `INV-${id}`;
  const item = { id, trans_no, transaction_date: '2026-10-31T23:59:59', sap_code: '001', catalogue_code: 'CAT', main_category: 'Jewelry', collection, qty: net < 0 ? -1 : 1, gross_sales: net, val_disc: 0, net_sales: net, comm: 0, type };
  return { trans_no, transaction_date: item.transaction_date, customer: `Customer ${id}`, salesman: advisor, location: store, item_count: 1, items: [item], total_net: net,
    meta: { trans_no, cash_bill_no: '', other_remarks: '', payment_splits: [{ paymentType: 'Cash', amount: net }] } };
}
const invoices = [invoice(1, 'A', 'Plaza Indonesia', 100), invoice(2, 'B', 'Plaza Indonesia', 200, 'SMI'), invoice(3, 'A', 'Plaza Senayan', 50), invoice(4, 'C', 'Bali Boutique', 75), invoice(5, 'Unknown', 'Plaza Indonesia', 30), invoice(6, 'A', 'Plaza Indonesia', -10), invoice(7, 'B', 'Plaza Senayan', 10), invoice(8, 'A', 'Plaza Indonesia', 500, 'Regular', 'DPS'), invoice(9, 'A', 'Plaza Indonesia', 600, 'Regular', 'SVC')];
let template;
test.before(async () => { template = new ExcelJS.Workbook(); await template.xlsx.readFile('public/templates/daily_sales_template.xlsx'); });

test('store totals reconcile physical minus IN plus OUT, rotation overrides home, and DP/SVC stay separate', () => {
  const report = buildStoreReportData(invoices, homes, rotations, 'Plaza Indonesia');
  assert.deepEqual(report.totals.physical, { net: 320, regular: 120, smi: 200, qty: 2 });
  assert.equal(report.totals.incoming.net, 200);
  assert.equal(report.totals.outgoing.net, 125);
  assert.deepEqual(report.totals.adjusted, { net: 245, regular: 245, smi: 0, qty: 3 });
  assert.equal(report.flows.length, 3);
  assert.ok(report.invoices.every(i => i.location === 'Plaza Indonesia'));
  assert.deepEqual(report.outgoing.map(line => line.invoice.trans_no), ['INV-3', 'INV-4']);
  assert.equal(report.physical.find(line => line.invoice.trans_no === 'INV-5').crossing, false);
  const all = buildStoreReportData(invoices, homes, rotations, 'ALL');
  assert.equal(all.totals.adjusted.net, all.totals.physical.net);
  assert.equal(all.totals.incoming.net, all.totals.outgoing.net);
  const bali = buildStoreReportData([invoice(10, 'D', 'Bali Boutique', 10)], [{ name: 'D', home_location: 'Bali' }], [], 'Bali');
  assert.equal(bali.totals.incoming.net, 0);
  assert.equal(bali.totals.physical.net, 10);
});

test('SPPR counts invoices and customers distinctly and keeps visit counts at the correct store', () => {
  const base = { date: '2026-10-01', transNo: 'INV-1', customer: 'Customer', phone: '08123', advisor: 'A', store: 'Plaza Indonesia', category: 'Jewelry', collection: 'Serpenti', qty: 1, netSales: 100, customerType: 'EXISTING' };
  const metrics = aggregateProductivity([base, { ...base, qty: 0, netSales: 50 }, { ...base, store: 'Bali', transNo: 'INV-2', phone: '08999', customerType: 'NEW', netSales: 200 }], [
    { customer_advisor: 'A', location: 'Plaza Indonesia', status: 'Walk In', akses_masuk: '' },
    { customer_advisor: 'A', location: 'Bali', status: '', akses_masuk: 'follow-up' },
  ]);
  const pi = metrics.find(row => row.store === 'Plaza Indonesia');
  assert.equal(pi.totalInvoices, 1); assert.equal(pi.totalQty, 1); assert.equal(pi.existingCustomerCount, 1);
  assert.equal(pi.atv, 150); assert.equal(pi.walkIn, 1); assert.equal(pi.followUp, 0);
  const bali = metrics.find(row => row.store === 'Bali');
  assert.equal(bali.walkIn, 0); assert.equal(bali.followUp, 1); assert.equal(bali.newCustomerSales, 200);
});

test('monthly workbook retains template details, emits all requested tabs and reconciles formulas after reopening', async () => {
  const report = buildStoreReportData(invoices, homes, rotations, 'Plaza Indonesia');
  const raw = [
    { id: 1, transaction_no: 'DP-1', transaction_date: '2026-10-01', customer_name: 'Deposit Customer', salesman: 'A', location: 'Plaza Indonesia', collection: 'DPS', sap_code: 'DP', catalogue_code: 'DP', qty: 1, price: 111, sub_total_discount: 0, net_sales: 100, card_comm: 3, type: 'SMI' },
    { id: 2, transaction_no: 'SVC-1', transaction_date: '2026-10-31', customer_name: 'Service Customer', salesman: 'A', location: 'Plaza Indonesia', collection: 'SVC', sap_code: 'SVC', catalogue_code: 'SVC', qty: 0, price: 111, sub_total_discount: 0, net_sales: 0, card_comm: 0, type: 'Regular' },
  ];
  const { workbook, totalNet } = buildStoreDailyWorkbook(template, report, [], raw, [{ transNo: 'DP-1', invoiceNo: 'PAST-INV', invoiceDate: '2026-10-03' }], { metrics: [], details: [] }, { month: 10, year: 2026, store: 'Plaza Indonesia' });
  assert.equal(totalNet, 320);
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['Summary', 'DS', 'DP', 'Service', 'Packaging', 'IN', 'OUT', 'SPPR_', 'Payment Details']);
  const reopened = new ExcelJS.Workbook(); await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
  // Store totals live on the compact Summary sheet: B=Net, C=Regular, D=SMI, F=Achievement.
  const summary = reopened.getWorksheet('Summary');
  assert.equal(reopened.worksheets[0].name, 'Summary');
  assert.equal(summary.columnCount, 7);
  assert.equal(summary.getCell('B6').result, 320); assert.equal(summary.getCell('B7').result, 200); assert.equal(summary.getCell('B8').result, 125);
  assert.equal(summary.getCell('B10').result, 245); assert.equal(summary.getCell('C10').result, 245); assert.equal(summary.getCell('D10').result, 0);
  assert.equal(summary.getCell('F10').result, 245 / 1.11);
  assert.ok(summary.getCell('B6').formula.includes("'DS'!S"));
  assert.ok(summary.getCell('B7').formula.includes("'IN'!N"));
  assert.ok(summary.getCell('B8').formula.includes("'OUT'!N"));
  const ds = reopened.getWorksheet('DS');
  // DS is now a pure ledger: header on row 6, first transaction on row 7.
  const first = 7;
  assert.equal(ds.getCell(`C${first}`).value, 'INV-1');
  assert.equal(ds.getCell(`AI${first + 1}`).value, 'SMI');
  assert.equal(ds.getCell(`AC${first}`).formula, `S${first}/1.11`);
  assert.equal(ds.getCell(`S${first + 4}`).result, 320);
  assert.equal(ds.getCell(`V${first}`).value, 100);
  assert.equal(reopened.getWorksheet('DP').getCell('O6').value, 'Claimed');
  assert.equal(reopened.getWorksheet('DP').getCell('P6').value, 'PAST-INV');
  assert.equal(reopened.getWorksheet('Service').getCell('K6').value, 0);
  assert.equal(reopened.getWorksheet('OUT').getCell('N8').result, 125);
  assert.equal(reopened.getWorksheet('Payment Details').getCell('E2').value, 100);
  for (const sheet of reopened.worksheets) sheet.eachRow(row => row.eachCell(cell => {
    assert.notEqual(cell.type, ExcelJS.ValueType.Error);
    if (cell.formula) { assert.ok(!cell.formula.includes('#REF!')); assert.ok(Number.isFinite(cell.result)); }
  }));
});

test('empty monthly report still contains the summary and all detail sheets with zero summary totals', () => {
  const report = buildStoreReportData([], [], [], 'Plaza Indonesia');
  const { workbook } = buildStoreDailyWorkbook(template, report, [], [], [], { metrics: [], details: [] }, { month: 2, year: 2024, store: 'Plaza Indonesia' });
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['Summary', 'DS', 'DP', 'Service', 'Packaging', 'IN', 'OUT', 'SPPR_']);
  const summary = workbook.getWorksheet('Summary');
  assert.equal(summary.getCell('B10').result, 0);
  assert.equal(summary.getCell('C11').result, 0);
  assert.equal(summary.getCell('A16').value, 'No crossing sales for this period and store.');
});

test('SPPR loader includes the full last day, paginates, scopes stores, and classifies customer history', async () => {
  const tables = {
    clean_master: Array.from({ length: 501 }, (_, id) => ({ id, trans_no: `I-${id}`, transaction_date: '2026-10-31T23:59:59', customer: 'C', salesman: 'A', location: 'Plaza Indonesia', main_category: 'Jewelry', collection: 'Serpenti', qty: id === 0 ? 0 : 1, net_sales: 1 })),
    bvlgari_sales: [{ id: 1, transaction_no: 'I-0', phone_no: '08123', transaction_date: '2026-10-31T23:59:59' }],
    customer_master: [{ phone_no: '08123', first_txn_date: '2025-01-01' }], mirror_traffic: [],
  };
  tables.clean_master.push({ ...tables.clean_master[0], id: 502, trans_no: 'NOV', transaction_date: '2026-11-01' }, { ...tables.clean_master[0], id: 503, trans_no: 'OTHER', location: 'Bali' });
  const db = { from(name) {
    let filters = [], start = 0, end = Infinity;
    const query = { select() { return query; }, order() { return query; }, gte(k, v) { filters.push(r => r[k] >= v); return query; }, lt(k, v) { filters.push(r => r[k] < v); return query; }, range(a, b) { start = a; end = b; return query; }, then(resolve, reject) { return Promise.resolve({ data: tables[name].filter(r => filters.every(f => f(r))).slice(start, end + 1), error: null }).then(resolve, reject); } };
    return query;
  } };
  const report = await getAdvisorProductivity(10, 2026, db, 'Plaza Indonesia');
  assert.equal(report.details.length, 501); assert.equal(report.metrics[0].totalNetSales, 501); assert.equal(report.metrics[0].totalQty, 500);
  assert.equal(report.details[0].customerType, 'EXISTING'); assert.equal(report.details[1].customerType, 'NEW');
});

test('service center sheet reports RB service-counter SVC under its boutique', async () => {
  const { serviceCenterStore, normalizeReportStore } = loadTS('src/lib/report-attribution.ts');
  assert.equal(serviceCenterStore('RBPlaza Indonesia'), 'Plaza Indonesia');
  assert.equal(serviceCenterStore('RBPlaza Senayan'), 'Plaza Senayan');
  assert.equal(serviceCenterStore('RBBali'), 'Bali');
  assert.equal(serviceCenterStore('RB Bali'), 'Bali');
  assert.equal(serviceCenterStore('Plaza Senayan'), 'Plaza Senayan', 'boutique names are unchanged');
  assert.equal(normalizeReportStore('RBPlaza Indonesia'), 'RBPlaza Indonesia', 'sales attribution is not affected');
  const report = buildStoreReportData(invoices, homes, rotations, 'Plaza Indonesia');
  const raw = [{ id: 'uuid-1', transaction_no: 'SVC-RB-1', transaction_date: '2026-10-05', customer_name: 'Repair Customer', salesman: 'A', location: 'RBPlaza Indonesia', collection: 'SVC', sap_code: 'SVC', catalogue_code: 'SVC', qty: 1, price: 500, sub_total_discount: 0, net_sales: 450, card_comm: 0, type: 'Regular' }];
  const { workbook } = buildStoreDailyWorkbook(template, report, [], raw, [], { metrics: [], details: [] }, { month: 10, year: 2026, store: 'Plaza Indonesia' });
  const service = workbook.getWorksheet('Service');
  assert.equal(service.getCell('B6').value, 'SVC-RB-1');
  assert.equal(service.getCell('E6').value, 'Plaza Indonesia');
  assert.equal(service.getCell('M6').value, 450);
});

test('packaging (PACK) lines get their own tab with the quantity as sent', async () => {
  const report = buildStoreReportData(invoices, homes, rotations, 'Plaza Indonesia');
  const raw = [{ id: 'uuid-2', transaction_no: 'SI-PI/2611/1', transaction_date: '2026-11-02', customer_name: 'Gift Customer', salesman: 'A', location: 'Plaza Indonesia', collection: 'PACK', sap_code: 'BOX01', catalogue_code: 'BOX01', description: 'Gift box', qty: 0, price: 0, sub_total_discount: 0, net_sales: 0, card_comm: 0, type: 'Regular' }];
  const { workbook, totalNet } = buildStoreDailyWorkbook(template, report, [], raw, [], { metrics: [], details: [] }, { month: 10, year: 2026, store: 'Plaza Indonesia' });
  const pack = workbook.getWorksheet('Packaging');
  assert.equal(pack.getCell('B6').value, 'SI-PI/2611/1');
  assert.equal(pack.getCell('I6').value, 'Gift box');
  assert.equal(pack.getCell('J6').value, 0);
  assert.equal(totalNet, 320, 'packaging never changes the sales totals');
  assert.equal(workbook.getWorksheet('Service').getCell('A6').value, 'No records for this period and store.');
});

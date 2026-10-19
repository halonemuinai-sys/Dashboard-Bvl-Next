import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
import ExcelJS from 'exceljs';

// Load pure TypeScript modules with the project's installed compiler, without
// requiring a browser, database credentials, or changes to production data.
function loadTS(relative) {
  const filename = path.resolve(relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const compiledModule = new Module(filename);
  compiledModule.filename = filename;
  compiledModule.paths = Module._nodeModulePaths(path.dirname(filename));
  compiledModule._compile(compiled, filename);
  return compiledModule.exports;
}
const { buildDailySalesWorkbook, getSaInitial, getReportPayments } = loadTS('src/services/dailyReportWorkbook.ts');
const { monthBounds, filterInvoices } = loadTS('src/lib/invoice-report-filters.ts');
const { fetchAllRows } = loadTS('src/lib/fetch-all-rows.ts');
function invoice(overrides = {}) {
  const item = { id: 1, trans_no: 'INV-1', transaction_date: '2026-09-30T23:59:59', sap_code: '001', catalogue_code: 'CAT-1', main_category: 'JEWELRY', collection: 'Serpenti', qty: 2, gross_sales: 222, val_disc: 22, net_sales: 200, comm: 3, type: 'Regular', serial_no: 'SERIAL-1', description: 'Ring', phone_no: '081234567890' };
  return { trans_no: 'INV-1', transaction_date: item.transaction_date, customer: 'Customer One', salesman: 'Arif PS', location: 'Plaza Indonesia', item_count: 1, total_qty: 2, total_gross: 222, total_disc: 22, total_net: 200, total_comm: 3, meta: { trans_no: 'INV-1', cash_bill_no: 'CB-001', discount_given_reason: 'Approved', after_sales_support: 'Resize', dwa_no: 'DWA-1', other_remarks: '' }, items: [item], ...overrides };
}
let template;
test.before(async () => { template = new ExcelJS.Workbook(); await template.xlsx.readFile('public/templates/daily_sales_template.xlsx'); });

test('exclusive month bounds preserve leap days and year rollover', () => {
  assert.deepEqual(monthBounds(2, 2024), { start: '2024-02-01', end: '2024-03-01' });
  assert.deepEqual(monthBounds(12, 2026), { start: '2026-12-01', end: '2027-01-01' });
  for (const month of [0, 13, 1.5, NaN]) assert.throws(() => monthBounds(month, 2026));
});
test('server and UI filters use the same invoice selection', () => {
  const one = invoice();
  const two = invoice({ trans_no: 'INV-2', location: 'Bali', item_count: 2, meta: { ...one.meta, cash_bill_no: '' } });
  assert.deepEqual(filterInvoices([one, two], { store: 'Bali', filterType: 'multi' }), [two]);
  assert.deepEqual(filterInvoices([one, two], { filterType: 'missing_cb' }), [two]);
  assert.deepEqual(filterInvoices([one, two], { store: 'Plaza Indonesia', search: '  cb-001 ' }), [one]);
  assert.equal(filterInvoices([one], { search: 'Serpenti' }).length, 1);
  assert.equal(filterInvoices([one], { store: 'Bali' }).length, 0);
});
test('pagination returns all rows and propagates later-page errors', async () => {
  const data = Array.from({ length: 1205 }, (_, id) => ({ id }));
  const rows = await fetchAllRows(async (from, to) => ({ data: data.slice(from, to + 1), error: null }));
  assert.equal(rows.length, 1205);
  assert.equal(rows.at(-1).id, 1204);
  await assert.rejects(fetchAllRows(async (from, to) => from ? { data: null, error: { message: 'page failed' } } : { data: data.slice(from, to + 1), error: null }), /page failed/);
});
test('uses invoice metadata, totals and real commission; preserves zero quantities and amounts', () => {
  const inv = invoice();
  inv.items.push({ ...inv.items[0], id: 2, qty: 0, gross_sales: 0, val_disc: 0, net_sales: 0, comm: 0 });
  inv.item_count = 2;
  inv.meta.payment_splits = [{ paymentType: 'Credit Card', amount: 200, bank: 'BCA', edc: 'BCA', cardType: 'Visa', cardComm: 3, mdrPct: 1.5 }];
  const profile = { nama_lengkap: 'Customer One', no_hp: '+6281234567890', kewarganegaraan: 'Singapore', status_pelanggan: 'New' };
  const result = buildDailySalesWorkbook(template, [inv], [profile], { month: 9, year: 2026, store: 'Plaza Indonesia' });
  const sheet = result.workbook.getWorksheet('DS');
  assert.equal(sheet.getCell('B7').value, 'CB-001');
  assert.equal(sheet.getCell('N7').value, 'SERIAL-1');
  assert.equal(sheet.getCell('Q7').value, 222);
  assert.equal(sheet.getCell('S7').value, 200);
  assert.equal(sheet.getCell('AC7').value.result, 200 / 1.11);
  assert.equal(sheet.getCell('AB7').value, 3);
  assert.equal(sheet.getCell('W7').value, 200);
  assert.equal(sheet.getCell('W8').value, null);
  assert.equal(sheet.getCell('G7').value, 1);
  assert.equal(sheet.getCell('G8').value, null);
  assert.equal(sheet.getCell('P8').value, 0);
  assert.equal(sheet.getCell('S8').value, 0);
  assert.equal(sheet.getCell('R8').result, 0);
  assert.equal(sheet.getCell('E7').value, null);
  assert.equal(sheet.getCell('I7').value, null);
  assert.equal(sheet.getCell('F7').value, 'Singapore');
  assert.equal(result.totalNet, 200);
  assert.equal(result.totalRows, 2);
  assert.equal(result.workbook.getWorksheet('Payment Details').rowCount, 2);
  assert.equal(sheet.getCell('S9').value.result, 200);
});
test('exports over 313 rows without stale template data or stale cached totals', async () => {
  const inv = invoice();
  inv.items = Array.from({ length: 1205 }, (_, id) => ({ ...inv.items[0], id, qty: 1, gross_sales: 111, val_disc: 0, net_sales: 111, comm: 0 }));
  const { workbook, totalRows, totalNet } = buildDailySalesWorkbook(template, [inv], [], { month: 9, year: 2026 });
  assert.equal(totalRows, 1205);
  assert.equal(totalNet, 133755);
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['DS']);
  const sheet = workbook.getWorksheet('DS');
  assert.equal(sheet.getCell('C1211').value, 'INV-1');
  assert.equal(sheet.getCell('S1212').value.result, totalNet);
  assert.equal(sheet.getCell('H7').value, null);
  assert.equal(sheet.getCell('F7').value, '');
  const bytes = await workbook.xlsx.writeBuffer();
  const reopened = new ExcelJS.Workbook(); await reopened.xlsx.load(bytes);
  assert.equal(reopened.getWorksheet('DS').getCell('S1212').value.result, totalNet);
  for (const row of reopened.getWorksheet('DS').getSheetValues().filter(Boolean)) {
    for (const value of row.filter(Boolean)) if (typeof value === 'object') assert.ok(!value.error && !value.result?.error);
  }
});
test('unknown and ambiguous CRM matches stay blank', () => {
  const dup = { nama_lengkap: 'Customer One', no_hp: null, kewarganegaraan: 'Indonesia', status_pelanggan: 'Old' };
  const result = buildDailySalesWorkbook(template, [invoice()], [dup, { ...dup }], { month: 9, year: 2026 });
  assert.equal(result.workbook.getWorksheet('DS').getCell('F7').value, '');
  assert.equal(result.workbook.getWorksheet('DS').getCell('H7').value, null);
});
test('Served By and Entitle come from Data Penunjang in full; CA is the API salesman', () => {
  const inv = invoice();
  inv.meta.served_by = 'Richie Bagoes Wahyoe';
  inv.meta.entitle = 'Inezia Amanda Tedjo';
  const sheet = buildDailySalesWorkbook(template, [inv], [], { month: 9, year: 2026 }).workbook.getWorksheet('DS');
  assert.equal(sheet.getCell('AE7').value, 'Richie Bagoes Wahyoe');
  assert.equal(sheet.getCell('AF7').value, 'Arif PS');
  assert.equal(sheet.getCell('AG7').value, 'Inezia Amanda Tedjo');
  // Not filled yet: stays blank instead of falling back to the salesman or initials.
  const blank = buildDailySalesWorkbook(template, [invoice()], [], { month: 9, year: 2026 }).workbook.getWorksheet('DS');
  assert.equal(blank.getCell('AE7').value, '');
  assert.equal(blank.getCell('AG7').value, '');
});
test('legacy payment encoding and advisor initials are parsed correctly', () => {
  const inv = invoice();
  inv.meta.other_remarks = 'Customer note\n[PAYMENT_SPLITS]:[{"paymentType":"Cash","amount":200}]\n[FINANCE_VERIFY]:{"status":"VERIFIED"}';
  assert.equal(getReportPayments(inv)[0].amount, 200);
  assert.equal(getSaInitial('Arif PS'), 'AR');
  assert.equal(getSaInitial('Ari'), 'AK');
  inv.meta.other_remarks = '[PAYMENT_SPLITS]:invalid';
  assert.throws(() => getReportPayments(inv), /Invalid saved payment/);
});
test('empty selection has zero totals and no previous-period transactions', () => {
  const { workbook, totalRows } = buildDailySalesWorkbook(template, [], [], { month: 10, year: 2026 });
  assert.equal(totalRows, 0);
  assert.equal(workbook.getWorksheet('DS').getCell('B7').value, 'NO MATCHING INVOICES');
  assert.equal(workbook.getWorksheet('DS').getCell('S8').result, 0);
});


test('POS split payments populate Rp, Card, transfer bank, EDC and card type exactly once per invoice', async () => {
  const inv = invoice();
  inv.items.push({ ...inv.items[0], id: 2 });
  inv.meta.payment_splits = [
    { paymentType: 'Cash', amount: 20 },
    { paymentType: 'Transfer', amount: 30, bank: 'BNI', edc: '--', cardType: '--' },
    { paymentType: 'Deposit', amount: 10 },
    { paymentType: 'Voucher', amount: 5 },
    { paymentType: 'Rounding', amount: -1 },
    { paymentType: 'QRIS', amount: 6, bank: 'BCA', edc: 'BCA', cardType: '--' },
    { paymentType: 'Credit Card', amount: 50, bank: 'BCA', edc: 'BCA', cardType: 'VISA' },
    { paymentType: 'Debit Card', amount: 60, bank: 'Mandiri', edc: 'Mandiri', cardType: 'MASTER' },
    { paymentType: 'Link Payment', amount: 20, bank: 'BCA', edc: 'BCA', cardType: 'VISA' },
  ];
  const result = buildDailySalesWorkbook(template, [inv], [], { month: 9, year: 2026 });
  const sheet = result.workbook.getWorksheet('DS');
  assert.equal(sheet.getCell('V7').value, 70);
  assert.equal(sheet.getCell('W7').value, 130);
  assert.equal(sheet.getCell('V7').value + sheet.getCell('W7').value, 200);
  assert.equal(sheet.getCell('Y7').value, 'BNI');
  assert.equal(sheet.getCell('Z7').value, 'BCA, Mandiri');
  assert.equal(sheet.getCell('AA7').value, 'VISA, MASTER');
  assert.equal(sheet.getCell('X7').value, null);
  for (const col of ['V', 'W', 'Y', 'Z', 'AA']) assert.equal(sheet.getCell(`${col}8`).value, null);
  assert.equal(sheet.getCell('V9').result, 70);
  assert.equal(sheet.getCell('W9').result, 130);
  assert.equal(result.workbook.getWorksheet('Payment Details').rowCount, 10);
  const reopened = new ExcelJS.Workbook();
  await reopened.xlsx.load(await result.workbook.xlsx.writeBuffer());
  assert.equal(reopened.getWorksheet('DS').getCell('V7').value, 70);
  assert.match(JSON.stringify(reopened.getWorksheet('DS').getCell('V7').note), /Cash: 20 IDR/);
});

test('missing POS payments stay blank and legacy saved splits populate the same columns', () => {
  const inv = invoice();
  let sheet = buildDailySalesWorkbook(template, [inv], [], { month: 9, year: 2026 }).workbook.getWorksheet('DS');
  assert.equal(sheet.getCell('V7').value, null);
  assert.equal(sheet.getCell('W7').value, null);
  inv.meta.other_remarks = 'Note\n[PAYMENT_SPLITS]: [{"paymentType":"Cash","amount":40},{"paymentType":"Credit Card","amount":160,"edc":"BCA","cardType":"VISA"}]\n[FINANCE_VERIFY]: {"status":"VERIFIED"}';
  sheet = buildDailySalesWorkbook(template, [inv], [], { month: 9, year: 2026 }).workbook.getWorksheet('DS');
  assert.equal(sheet.getCell('V7').value, 40);
  assert.equal(sheet.getCell('W7').value, 160);
  assert.equal(sheet.getCell('Z7').value, 'BCA');
  inv.meta.payment_splits = [{ paymentType: '--', amount: 200 }];
  assert.throws(() => buildDailySalesWorkbook(template, [inv], [], { month: 9, year: 2026 }), /valid payment type/);
});

test('linked DP references appear once without adding payment or sales amounts', () => {
  const inv = invoice();
  inv.items.push({ ...inv.items[0], id: 2 });
  inv.depositLinks = [{ transNo: 'DP-001', amount: 50 }, { transNo: 'DP-002', amount: 100 }];
  const result = buildDailySalesWorkbook(template, [inv], [], { month: 9, year: 2026 });
  const sheet = result.workbook.getWorksheet('DS');
  assert.equal(sheet.getCell('U7').value, 'DP-001\nDP-002');
  assert.equal(sheet.getCell('U8').value, null);
  assert.equal(sheet.getCell('V7').value, null);
  assert.equal(result.totalNet, 400);
});

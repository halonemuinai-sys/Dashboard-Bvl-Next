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
const model = loadTS('src/lib/deposit-links.ts');
const policy = loadTS('src/lib/access-policy.ts');
const pager = loadTS('src/lib/fetch-all-rows.ts');
function source(overrides = {}) { return { id: 1, transaction_no: 'DP-1', transaction_date: '2026-09-01', customer_name: 'Customer', salesman: 'Advisor', location: 'Plaza Indonesia', collection: 'DPS', qty: 1, price: 111, sub_total_discount: 0, net_sales: 100, ...overrides }; }
function harness() {
  const user = { email: 'admin@example.test', role: 'super_admin', assigned_store: 'ALL' };
  const tables = {
    bvlgari_sales: [source(), source({ id: 2, transaction_no: 'DP-2', price: 222, net_sales: 200 })],
    clean_master: [{ id: 1, trans_no: 'INV-1', transaction_date: '2026-10-01', location: 'Plaza Indonesia', collection: 'Serpenti' }, { id: 2, trans_no: 'INV-2', transaction_date: '2026-10-02', location: 'Plaza Indonesia', collection: 'Serpenti' }],
    transaction_records_meta: [], role_menu_access: [],
  };
  const db = { from(table) {
    let filters = [], offset = 0, end = Infinity, mutation = null, payload = null, single = false;
    const query = {
      select() { return query; }, order() { return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      in(key, values) { filters.push(row => values.includes(row[key])); return query; },
      like(key, pattern) { filters.push(row => row[key].startsWith(pattern.replaceAll('\\_', '_').replace(/%$/, ''))); return query; },
      range(from, to) { offset = from; end = to; return query; },
      single() { single = true; return query; },
      insert(rows) { mutation = 'insert'; payload = rows; return query; },
      delete() { mutation = 'delete'; return query; },
      then(resolve, reject) { return Promise.resolve().then(() => {
        const selected = tables[table].filter(row => filters.every(filter => filter(row))).slice(offset, end + 1);
        if (mutation === 'insert') {
          if (payload.some(row => tables[table].some(saved => saved.trans_no === row.trans_no))) return { data: null, error: { code: '23505' } };
          tables[table].push(...payload); return { data: payload, error: null };
        }
        if (mutation === 'delete') tables[table] = tables[table].filter(row => !selected.includes(row));
        return { data: single ? selected[0] : selected, error: single && !selected.length ? { code: 'PGRST116' } : null };
      }).then(resolve, reject); },
    };
    return query;
  } };
  const actions = loadTS('src/app/invoice-management/deposit-actions.ts', {
    'next/cache': { revalidatePath() {} }, '@/lib/server-access': { async getSessionUser() { return { db, user }; } },
    '@/lib/access-policy': policy, '@/lib/fetch-all-rows': pager, '@/lib/deposit-links': model,
  });
  return { actions, tables, user };
}

test('only positive sales DPS is eligible; service, returns and mixed transactions are excluded', () => {
  assert.equal(model.groupSalesDeposits([source(), source({ id: 2, price: 222, net_sales: 200 })])[0].amount, 333);
  for (const row of [source({ collection: 'SVC' }), source({ location: 'RBPlaza Indonesia' }), source({ transaction_no: 'SI-RBPI/2610/1' }), source({ qty: -1 }), source({ qty: 0 }), source({ price: 'invalid' })]) assert.equal(model.groupSalesDeposits([row]).length, 0);
  assert.equal(model.groupSalesDeposits([source(), source({ id: 2, collection: 'SVC' })]).length, 0);
});
test('multiple DPs can link to one invoice, with no changes to sales or payments', async () => {
  const { actions, tables } = harness();
  const initial = JSON.stringify(tables.clean_master);
  const result = await actions.linkSalesDepositsAction('INV-1', ['DP-1', 'DP-2']);
  assert.equal(result.ok, true);
  assert.equal(result.data.length, 2);
  assert.deepEqual(result.data.map(link => link.amount), [111, 222]);
  assert.equal(tables.transaction_records_meta.length, 2);
  assert.equal(JSON.stringify(tables.clean_master), initial);
  assert.ok(tables.transaction_records_meta.every(row => model.readDepositLink(row)?.invoiceNo === 'INV-1'));
  const retry = await actions.linkSalesDepositsAction('INV-1', ['DP-1']);
  assert.equal(retry.ok, true);
  assert.equal(tables.transaction_records_meta.length, 2);
});
test('a DP cannot be claimed by two concurrent invoices', async () => {
  const { actions, tables } = harness();
  const results = await Promise.all([actions.linkSalesDepositsAction('INV-1', ['DP-1']), actions.linkSalesDepositsAction('INV-2', ['DP-1'])]);
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(tables.transaction_records_meta.length, 1);
});
test('conflict rejects entire selection, and unlink releases only the matching invoice reference', async () => {
  const { actions, tables } = harness();
  await actions.linkSalesDepositsAction('INV-1', ['DP-1']);
  assert.equal((await actions.linkSalesDepositsAction('INV-2', ['DP-1', 'DP-2'])).ok, false);
  assert.equal(tables.transaction_records_meta.length, 1);
  assert.equal((await actions.unlinkSalesDepositAction('INV-2', 'DP-1')).ok, false);
  assert.equal((await actions.unlinkSalesDepositAction('INV-1', 'DP-1')).ok, true);
  assert.equal((await actions.linkSalesDepositsAction('INV-2', ['DP-1'])).ok, true);
});
test('cross-store, future DP, invalid sources, and unauthorized actors are rejected server-side', async () => {
  for (const change of [{ location: 'Bali' }, { transaction_date: '2026-11-01' }, { collection: 'SVC' }, { location: 'RBPlaza Indonesia' }]) {
    const { actions, tables } = harness(); Object.assign(tables.bvlgari_sales[0], change);
    assert.equal((await actions.linkSalesDepositsAction('INV-1', ['DP-1'])).ok, false);
    assert.equal(tables.transaction_records_meta.length, 0);
  }
  const { actions, user } = harness();
  user.role = 'crm';
  assert.equal((await actions.linkSalesDepositsAction('INV-1', ['DP-1'])).ok, false);
  user.role = 'super_admin'; user.assigned_store = 'Bali';
  assert.equal((await actions.searchSalesDepositsAction('INV-1', '')).ok, false);
});
test('claimed DP disappears from search but keeps invoice and monitoring references; unlink restores it', async () => {
  const { actions } = harness();
  await actions.linkSalesDepositsAction('INV-1', ['DP-1']);
  const response = await actions.searchSalesDepositsAction('INV-2', 'dp-1');
  assert.equal(response.ok, true);
  assert.equal(response.data.results.length, 0);
  assert.equal(response.data.total, 0);
  for (const invoiceNo of ['INV-1', 'INV-2']) {
    const available = await actions.searchSalesDepositsAction(invoiceNo, '');
    assert.equal(available.ok, true);
    assert.deepEqual(available.data.results.map(dp => dp.transNo), ['DP-2']);
    assert.equal(available.data.total, 1);
    assert.deepEqual(available.data.linked.map(dp => dp.transNo), invoiceNo === 'INV-1' ? ['DP-1'] : []);
  }
  const lookup = await actions.getDepositLinksAction(['DP-1']);
  assert.equal(lookup.data[0].invoiceNo, 'INV-1');
  assert.equal((await actions.unlinkSalesDepositAction('INV-1', 'DP-1')).ok, true);
  const restored = await actions.searchSalesDepositsAction('INV-2', 'dp-1');
  assert.equal(restored.ok, true);
  assert.equal(restored.data.total, 1);
  assert.equal(restored.data.results[0].transNo, 'DP-1');
  assert.equal(restored.data.results[0].link, null);
});
test('12-month window is inclusive, handles leap years, and rejects invalid dates', () => {
  for (const [deposit, invoice, expected] of [
    ['2025-10-01', '2026-10-01', true],
    ['2025-09-30', '2026-10-01', false],
    ['2026-10-01T18:30:00+07:00', '2026-10-01', true],
    ['2026-10-02', '2026-10-01', false],
    ['2023-02-28', '2024-02-29', true],
    ['2023-02-27', '2024-02-29', false],
    ['2024-02-29', '2025-02-28', true],
    ['2025-02-30', '2026-02-28', false],
    ['', '2026-10-01', false],
    ['2026-10-01', 'invalid', false],
  ]) assert.equal(model.isDepositWithinInvoicePeriod(deposit, invoice), expected, `${deposit} against ${invoice}`);
});

test('invoice-number search and saving enforce the same 12-month boundary', async () => {
  for (const [date, eligible] of [['2025-10-01', true], ['2025-09-30', false], ['2026-10-01', true], ['2026-10-02', false]]) {
    const { actions, tables } = harness();
    Object.assign(tables.bvlgari_sales[0], { transaction_no: 'SI-PI/2510/37995', transaction_date: date });
    for (const query of ['si-pi/2510/37995', '37995']) {
      const found = await actions.searchSalesDepositsAction('INV-1', query);
      assert.equal(found.ok, true);
      assert.equal(found.data.total, eligible ? 1 : 0, date);
    }
    const saved = await actions.linkSalesDepositsAction('INV-1', ['SI-PI/2510/37995']);
    assert.equal(saved.ok, eligible, date);
    assert.equal(tables.transaction_records_meta.length, eligible ? 1 : 0);
  }
});

test('malformed saved references fail closed', async () => {
  const { actions, tables } = harness();
  tables.transaction_records_meta.push({ trans_no: model.depositLinkKey('DP-1'), other_remarks: '{bad json' });
  assert.equal((await actions.linkSalesDepositsAction('INV-1', ['DP-1'])).ok, false);
});

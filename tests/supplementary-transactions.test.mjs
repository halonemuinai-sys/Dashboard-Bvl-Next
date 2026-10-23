import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file, deps = {}) {
  const exports = {};
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(exports, name => {
    if (!(name in deps)) throw Error(name); return deps[name];
  }); return exports;
}
const policy = load('src/lib/access-policy.ts');
const model = load('src/lib/supplementary-transactions.ts', { './report-attribution': load('src/lib/report-attribution.ts') });
const pager = load('src/lib/fetch-all-rows.ts');
const periods = load('src/lib/invoice-report-filters.ts', { './crm-cosmo': {} });
const deposits = load('src/lib/deposit-links.ts');
const constants = load('src/services/dashboard/constants.ts');
const row = (patch = {}) => ({ id: 1, transaction_no: 'DP-1', collection: 'DPS', location: 'Plaza Indonesia', transaction_date: '2026-10-01T00:00:00+07:00', qty: 1, price: 100, net_sales: 90, card_comm: 5, sub_total_discount: 10, ...patch });
function harness(records = [row()]) {
  const user = { role: 'operations_sales', assigned_store: 'Plaza Indonesia' };
  const tables = { bvlgari_sales: records, role_menu_access: [], transaction_records_meta: [] };
  let writes = 0;
  const db = { from(table) {
    const filters = []; let start = 0, end = Infinity, singular = false, mutation, values;
    const q = {
      select() { return q; }, order() { return q; },
      eq(k, v) { filters.push(r => r[k] === v); return q; },
      in(k, v) { filters.push(r => v.includes(r[k])); return q; },
      gte(k, v) { filters.push(r => Date.parse(r[k]) >= Date.parse(v)); return q; },
      lt(k, v) { filters.push(r => Date.parse(r[k]) < Date.parse(v)); return q; },
      ilike(k, v) { filters.push(r => r[k].toUpperCase().startsWith(v.replace('%', '').toUpperCase())); return q; },
      or() { filters.push(r => model.supplementaryKind(r.collection)); return q; },
      range(a, b) { start = a; end = b; return q; },
      single() { singular = true; return q; }, maybeSingle() { singular = true; return q; },
      update(patch) { mutation = 'update'; values = patch; return q; }, delete() { mutation = 'delete'; return q; },
      then(resolve, reject) { return Promise.resolve().then(() => {
        const chosen = tables[table].filter(r => filters.every(f => f(r))).slice(start, end + 1);
        if (mutation) { writes++; if (mutation === 'update') chosen.forEach(r => Object.assign(r, values)); else tables[table] = tables[table].filter(r => !chosen.includes(r)); }
        return { data: singular ? chosen[0] || null : chosen, error: null };
      }).then(resolve, reject); },
    }; return q;
  } };
  const actions = load('src/app/monthly-dps-svc/actions.ts', { '@/lib/server-access': { getSessionUser: async () => ({ db, user }) }, '@/lib/access-policy': policy, '@/lib/fetch-all-rows': pager, '@/lib/invoice-report-filters': periods, '@/services/dashboard/constants': constants, '@/lib/supplementary-transactions': model, '@/lib/deposit-links': deposits });
  return { actions, user, tables, writes: () => writes };
}

test('Store Manager can open all three submenus without extending finance or CRM access', () => {
  for (const path of policy.DP_TRANSACTION_PATHS) {
    assert.equal(policy.hasMenuAccess('operations_sales', [], path), true);
    assert.equal(policy.hasMenuAccess('crm', [], path), false);
    assert.equal(policy.hasMenuAccess('finance', [], path), false);
    assert.equal(policy.hasMenuAccess('crm', ['/monthly-dps-svc'], path), true);
  }
  assert.equal(policy.hasMenuAccess('operations_sales', [], '/user-access'), false);
});
test('server restricts rows to assigned boutique and its RB counter and hides commission', async () => {
  const { actions } = harness([row(), row({ id: 2, location: 'Plaza Senayan' }), row({ id: 3, location: 'RBPlaza Indonesia', collection: 'SVC' })]);
  const result = await actions.loadSupplementaryTransactions('October', 2026);
  assert.deepEqual(result.map(r => r.id), [1, 3]);
  assert.ok(result.every(r => r.comm === 0 && r.cost === 10));
  assert.deepEqual((await actions.loadSupplementaryTransactions('October', 2026, 'SVC')).map(r => r.id), [3]);
});
test('unassigned managers fail closed; administrators retain all-store access', async () => {
  const h = harness(); h.user.assigned_store = 'ALL';
  await assert.rejects(h.actions.loadSupplementaryTransactions('October', 2026), /assign your boutique/);
  h.user.role = 'super_admin';
  assert.equal((await h.actions.loadSupplementaryTransactions('October', 2026))[0].comm, 5);
});
test('packaging suffixes paginate beyond 1000 and exclude next-month rows', async () => {
  const h = harness(Array.from({ length: 1001 }, (_, id) => row({ id, collection: 'PACK,1', transaction_date: '2026-10-31T23:59:00+07:00', qty: 0 })));
  h.tables.bvlgari_sales.push(row({ id: 2000, collection: 'PACK', transaction_date: '2026-11-01T00:00:00+07:00' }));
  const result = await h.actions.loadSupplementaryTransactions('October', 2026, 'PACK');
  assert.equal(result.length, 1001); assert.equal(result[0].gross_sales, 0);
  await assert.rejects(h.actions.loadSupplementaryTransactions('October', 2026, 'invalid'), /Invalid/);
});
test('Bali aliases map to the same boutique', async () => {
  const h = harness([row({ location: 'Bali Boutique' }), row({ id: 2, location: 'RBBali', collection: 'SVC' }), row({ id: 3 })]);
  h.user.assigned_store = 'Bali';
  assert.equal((await h.actions.loadSupplementaryTransactions('October', 2026)).length, 2);
});
test('manager edits are limited to sales type in the assigned store', async () => {
  const h = harness([row(), row({ id: 2, location: 'Bali' })]);
  await h.actions.updateSupplementaryTransaction(1, { type: 'SMI' });
  assert.equal(h.tables.bvlgari_sales[0].type, 'SMI');
  await assert.rejects(h.actions.updateSupplementaryTransaction(2, { type: 'SMI' }), /outside/);
  await assert.rejects(h.actions.updateSupplementaryTransaction(1, { card_comm: 100 }), /Finance/);
  await assert.rejects(h.actions.deleteSupplementaryTransaction(1), /Administrator/);
  await assert.rejects(h.actions.updateSupplementaryTransaction(1, { location: 'Bali' }), /Invalid/);
  assert.equal(h.writes(), 1);
});
test('linked DP cannot be deleted and unapproved roles cannot load records', async () => {
  const h = harness(); h.user.role = 'super_admin';
  h.tables.transaction_records_meta.push({ trans_no: deposits.depositLinkKey('DP-1') });
  await assert.rejects(h.actions.deleteSupplementaryTransaction(1), /invoice link/);
  h.user.role = 'crm';
  await assert.rejects(h.actions.loadSupplementaryTransactions('October', 2026), /access/);
  assert.equal(h.writes(), 0);
});
test('UUID source ids remain editable within the assigned boutique', async () => {
  const id = '31bfec69-3da5-4c5c-8911-67c01263cbe7';
  const h = harness([row({ id })]);
  await h.actions.updateSupplementaryTransaction(id, { type: 'SMI' });
  assert.equal(h.tables.bvlgari_sales[0].type, 'SMI');
  await assert.rejects(h.actions.updateSupplementaryTransaction('invalid-id', { type: 'SMI' }), /Invalid/);
});

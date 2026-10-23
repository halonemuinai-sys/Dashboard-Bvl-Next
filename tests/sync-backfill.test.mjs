import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';

function loadTS(relative, mocks = {}) {
  const filename = path.resolve(relative);
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  const realRequire = compiled.require.bind(compiled);
  compiled.require = name => Object.hasOwn(mocks, name) ? mocks[name] : realRequire(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
  return compiled.exports;
}

// Minimal Supabase stand-in: UPDATE ... IN (...) WHERE column IS NULL on in-memory tables.
function database(tables) {
  return { from(table) {
    let patch = {}; const filters = [];
    const q = {
      update(values) { patch = values; return q; },
      in(key, list) { filters.push(row => list.includes(row[key])); return q; },
      is(key, value) { filters.push(row => (row[key] ?? null) === value); return q; },
      select() { return q; },
      then(resolve) {
        const hit = tables[table].filter(row => filters.every(f => f(row)));
        hit.forEach(row => Object.assign(row, patch));
        return Promise.resolve({ data: hit.map(r => ({ id: r.id })), error: null }).then(resolve);
      },
    };
    return q;
  } };
}

test('backfill fills only empty POS fields on invoices that already exist', async () => {
  const tables = {
    bvlgari_sales: [
      { id: 1, transaction_no: 'SI-1', in_charge: null, customer_code: null },
      { id: 2, transaction_no: 'SI-2', in_charge: 'Manual Name', customer_code: null },
      { id: 3, transaction_no: 'SI-NEW', in_charge: null, customer_code: null },
    ],
    clean_master: [
      { id: 11, trans_no: 'SI-1', in_charge: null, customer_code: null },
      { id: 12, trans_no: 'SI-2', in_charge: 'Manual Name', customer_code: null },
    ],
  };
  const { backfillPosFields } = loadTS('src/services/syncService.ts', {
    '@/lib/supabase': { supabase: database(tables) },
    '@/lib/fetch-all-rows': loadTS('src/lib/fetch-all-rows.ts'),
  });
  const updated = await backfillPosFields([
    { transactionNo: 'SI-1', inCharge: ' Ayu ', customerCode: 'C-9' },
    { transactionNo: 'SI-2', inCharge: 'Budi', customerCode: null },
    { transactionNo: 'SI-NEW', inCharge: 'Citra', customerCode: 'C-1' },
    { transactionNo: 'SI-1', inCharge: '', customerCode: '' },
  ], new Set(['SI-1', 'SI-2']));

  assert.equal(tables.bvlgari_sales[0].in_charge, 'Ayu');
  assert.equal(tables.clean_master[0].in_charge, 'Ayu');
  assert.equal(tables.bvlgari_sales[0].customer_code, 'C-9');
  assert.equal(tables.bvlgari_sales[1].in_charge, 'Manual Name', 'an existing value is never overwritten');
  assert.equal(tables.bvlgari_sales[2].in_charge, null, 'invoices not yet stored are left to the insert path');
  assert.equal(updated, 4);
});

test('servedBy and crmId take priority over the older inCharge and customerCode fields', async () => {
  const tables = {
    bvlgari_sales: [{ id: 1, transaction_no: 'SI-9', in_charge: null, customer_code: null }],
    clean_master: [{ id: 11, trans_no: 'SI-9', in_charge: null, customer_code: null }],
  };
  const sync = loadTS('src/services/syncService.ts', {
    '@/lib/supabase': { supabase: database(tables) },
    '@/lib/fetch-all-rows': loadTS('src/lib/fetch-all-rows.ts'),
  });
  assert.equal(sync.posCrmId({ crmId: '', customerCode: null }), null, 'an empty crmId is treated as missing');
  assert.equal(sync.posCrmId({ crmId: null, customerCode: 'OLD-1' }), 'OLD-1');
  await sync.backfillPosFields([{ transactionNo: 'SI-9', servedBy: 'Siska Nurhalimah', inCharge: 'Old Name', crmId: '13278246', customerCode: null }], new Set(['SI-9']));
  assert.equal(tables.clean_master[0].in_charge, 'Siska Nurhalimah');
  assert.equal(tables.clean_master[0].customer_code, '13278246');
});

test('sync never re-inserts into clean_master an invoice it already holds from a legacy import', async () => {
  const inserts = { bvlgari_sales: [], clean_master: [] };
  const existing = { bvlgari_sales: [], clean_master: [{ trans_no: 'SI-OLD' }], master_main_category: [], master_collection: [] };
  const db = { from(table) {
    let action = 'select'; let payload;
    const q = {};
    for (const m of ['select', 'gte', 'lte', 'lt', 'order', 'range', 'in', 'is', 'eq']) q[m] = () => q;
    q.insert = rows => { action = 'insert'; payload = rows; return q; };
    q.update = () => { action = 'update'; return q; };
    q.then = (resolve, reject) => {
      if (action === 'insert') inserts[table].push(...payload);
      const data = action === 'select' ? (existing[table] || []) : [];
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    };
    return q;
  } };
  const sync = loadTS('src/services/syncService.ts', {
    '@/lib/supabase': { supabase: db },
    '@/lib/fetch-all-rows': loadTS('src/lib/fetch-all-rows.ts'),
  });
  const item = (no, sap) => ({ transactionDate: '2025-05-02', transactionNo: no, sapCode: sap, location: 'Plaza Indonesia', collectionCode: 'JWL,TB', qty: 1, price: 100, subTotalDiscount: 0, tax: 1.11, subTotaltax: 10, servedBy: 'Ayu', crmId: '123' });
  const original = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => [item('SI-OLD', '1'), item('SI-NEW', '2')] });
  try {
    const result = await sync.syncService.syncSalesData(5, 2025);
    assert.equal(result.success, true);
    assert.deepEqual(inserts.clean_master.map(r => r.trans_no), ['SI-NEW']);
    assert.equal(inserts.bvlgari_sales.length, 2, 'raw mirror still records both invoices');
  } finally { global.fetch = original; }
});

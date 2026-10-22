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

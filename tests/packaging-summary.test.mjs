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
const { summarizeBySap } = loadTS('src/app/packaging/packagingSummary.ts', { '@/lib/supabase': { supabase: {} } });

const line = (sap, store, qty, invoice) => ({ sap_code: sap, item: `Item ${sap}`, store, qty, transaction_no: invoice });
const stock = [
  { store: 'Plaza Indonesia', date: '2026-10-24', qty: new Map([['804197', 50], ['804188', 2]]) },
  { store: 'Plaza Senayan', date: '2026-10-24', qty: new Map([['804197', 10]]) },
];

test('groups packaging out by SAP code and boutique, with distinct invoices', () => {
  const rows = summarizeBySap([
    line('804197', 'Plaza Indonesia', 1, 'INV-1'), line('804197', 'Plaza Indonesia', 2, 'INV-2'),
    line('804197', 'Plaza Senayan', 1, 'INV-3'), line('804188', 'Plaza Indonesia', 3, 'INV-1'),
  ], stock, ['Plaza Indonesia', 'Plaza Senayan', 'Bali', 'Head Office']);
  const folder = rows.find(r => r.sap === '804197');
  assert.equal(folder.out, 4);
  assert.deepEqual(folder.outByStore, { 'Plaza Indonesia': 3, 'Plaza Senayan': 1 });
  assert.equal(folder.invoices, 3);
  assert.equal(folder.stock, 60, 'stock is summed across the boutiques in scope');
  assert.equal(folder.status, 'ok');
  const bag = rows.find(r => r.sap === '804188');
  assert.equal(bag.stock, 2);
  assert.equal(bag.status, 'low', 'stock below the units issued in the period');
});

test('stock follows the boutique filter and flags missing or empty stock', () => {
  const rows = summarizeBySap([line('804197', 'Plaza Senayan', 1, 'INV-1'), line('999999', 'Plaza Senayan', 1, 'INV-2')], stock, ['Plaza Senayan']);
  assert.equal(rows.find(r => r.sap === '804197').stock, 10);
  assert.equal(rows.find(r => r.sap === '999999').status, 'out');
  const bali = summarizeBySap([line('804197', 'Bali', 1, 'INV-9')], stock, ['Bali']);
  assert.equal(bali[0].stock, null);
  assert.equal(bali[0].status, 'unknown', 'no saved snapshot for Bali yet');
});

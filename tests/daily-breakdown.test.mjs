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

const { aggregateDailyBreakdown } = loadTS('src/services/dashboard/dailyService.ts', {
  '@/lib/supabase': { supabase: {} },
  '@/lib/fetch-all-rows': loadTS('src/lib/fetch-all-rows.ts'),
  '@/lib/sales-chart-data': loadTS('src/lib/sales-chart-data.ts'),
  './constants': loadTS('src/services/dashboard/constants.ts'),
});

test('buckets legacy 17:00 UTC rows into the Jakarta calendar day', () => {
  const days = aggregateDailyBreakdown('October', 2026, [
    { transaction_date: '2026-09-30T17:00:00+00:00', location: 'Plaza Indonesia', net_sales: 100, qty: 1 },
    { transaction_date: '2026-10-01T00:00:00+00:00', location: 'BVLGARI PLAZA SENAYAN', net_sales: 50, qty: 2 },
    { transaction_date: '2026-10-31T17:00:00+00:00', location: 'Bali', net_sales: 999, qty: 9 },
  ]);
  assert.equal(days.length, 31);
  assert.equal(days[0].stores['Plaza Indonesia'].netSales, 100);
  assert.equal(days[0].stores['Plaza Senayan'].qty, 2);
  assert.equal(days[0].totalSales, 150);
  assert.equal(days[0].dayOfWeek, 'Thursday');
  assert.equal(days.reduce((sum, d) => sum + d.totalSales, 0), 150, 'November 1 (Jakarta) is excluded');
});

test('keeps Head Office separate and ignores unknown locations', () => {
  const days = aggregateDailyBreakdown('February', 2028, [
    { transaction_date: '2028-02-29T00:00:00+00:00', location: 'HO', net_sales: 70, qty: 1 },
    { transaction_date: '2028-02-29T00:00:00+00:00', location: 'Online', net_sales: 30, qty: 1 },
  ]);
  assert.equal(days.length, 29);
  assert.equal(days[28].stores['Head Office'].netSales, 70);
  assert.equal(days[28].totalSales, 70);
});

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
  const originalRequire = compiled.require.bind(compiled);
  compiled.require = name => Object.hasOwn(mocks, name) ? mocks[name] : originalRequire(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
  return compiled.exports;
}

test('segmentation includes customers and annual spend beyond the API page limit', async () => {
  const source = Array.from({ length: 1200 }, (_, id) => ({ id, customer: 'Ari', transaction_date: '2026-05-03', net_sales: 1_000_000, qty: 1, trans_no: `TX-${id}` }));
  source.push({ id: 1200, customer: 'Bela', transaction_date: '2025-05-03', net_sales: 2_000_000, qty: 1, trans_no: 'TX-old' });
  const requests = [];
  const supabase = { from(table) {
    const request = { table };
    requests.push(request);
    const builder = {
      select(columns) { request.columns = columns; return this; },
      order(column) { request.order = column; return this; },
      range(from, to) { request.from = from; request.to = to; return this; },
      then(resolve, reject) { return Promise.resolve({ data: source.slice(request.from, request.to + 1), error: null }).then(resolve, reject); },
    };
    return builder;
  } };
  const helpers = loadTS('src/lib/fetch-all-rows.ts');
  const { customerService } = loadTS('src/services/customerService.ts', {
    '@/lib/supabase': { supabase },
    '@/lib/fetch-all-rows': helpers,
  });
  const result = await customerService.getSegmentationOverview(2026);
  assert.deepEqual(requests.map(request => request.from), [0, 500, 1000]);
  assert.ok(requests.every(request => request.table === 'clean_master' && request.order === 'id'));
  assert.equal(result.customers.length, 2);
  assert.equal(result.customers.find(customer => customer.name === 'Ari').freqInvoice, 1200);
  assert.equal(result.revenueMix.repeatRevenue, 1_200_000_000);
  assert.equal(result.growthTrend[4].new, 1);
  assert.equal(result.growthTrend[4].repeat, 0);
});

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

test('monthly CRM visits include all pages in stable order', async () => {
  const source = Array.from({ length: 1205 }, (_, id) => ({ id, transaction_date: '2026-10-01', prospect_item: 'Berhasil', net_sales: 10, status: 'Walk In', location: 'Bali' }));
  const requests = [];
  const supabase = { from(table) {
    const request = { table, order: [] };
    requests.push(request);
    const builder = {
      select(columns) { request.columns = columns; return this; },
      gte(column, value) { request.fromDate = [column, value]; return this; },
      lte(column, value) { request.toDate = [column, value]; return this; },
      order(column, options) { request.order.push([column, options]); return this; },
      range(from, to) { request.from = from; request.to = to; return this; },
      then(resolve, reject) { return Promise.resolve({ data: source.slice(request.from, request.to + 1), error: null }).then(resolve, reject); },
    };
    return builder;
  } };
  const helpers = loadTS('src/lib/fetch-all-rows.ts');
  const { crmService } = loadTS('src/services/crmService.ts', {
    '@/lib/supabase': { supabase },
    '@/lib/fetch-all-rows': helpers,
  });
  const rows = await crmService.getTrafficRows(10, 2026);
  assert.equal(rows.length, 1205);
  assert.equal(new Set(rows.map(row => row.id)).size, 1205);
  assert.deepEqual(requests.map(request => request.from), [0, 500, 1000]);
  assert.ok(requests.every(request => request.table === 'mirror_traffic' && request.columns === '*' && request.fromDate[1] === '2026-10-01' && request.toDate[1] === '2026-10-31'));
  assert.deepEqual(requests[0].order.map(([column]) => column), ['transaction_date', 'id']);
  const overview = crmService.computeOverview(rows);
  assert.equal(overview.kpi.totalVisit, 1205);
  assert.equal(overview.kpi.totalRevenue, 12050);
  assert.equal(overview.funnel.find(item => item.key === 'berhasil').count, 1205);
});

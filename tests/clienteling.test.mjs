import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(path, deps = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', code)(exports, name => { if (!(name in deps)) throw Error(name); return deps[name]; });
  return exports;
}
const lib = load('src/lib/clienteling.ts');
const now = new Date('2026-10-23T08:00:00Z');
const row = (date, invoice, amount = 100) => ({ customer: 'Alice', transaction_date: date, trans_no: invoice, net_sales: amount, location: 'Bali' });
const build = (rows, year = 2026) => lib.buildClientelingData(rows, year, now);

test('historical snapshot excludes later sales and measures recency at year end', () => {
  const d = build([row('2024-12-31', 'A'), row('2025-01-01', 'B', 9999)], 2024);
  assert.equal(d.asOf, '2024-12-31'); assert.equal(d.topClients[0].recency, 0); assert.equal(d.topClients[0].spend, 100);
  assert.equal(lib.clientelingSnapshot(2026, new Date('2026-10-22T18:00:00Z')), '2026-10-23');
  assert.throws(() => lib.clientelingSnapshot(2027, now));
});
test('first purchase month is new; subsequent months returning; invoice items deduplicate frequency', () => {
  const d = build([row('2026-01-02', 'A'), row('2026-01-02', 'A'), row('2026-02-02', 'B')]);
  assert.deepEqual(d.retention[0], { month: 'Jan', newCust: 1, returning: 0 });
  assert.deepEqual(d.retention[1], { month: 'Feb', newCust: 0, returning: 1 });
  assert.equal(d.topClients[0].visits, 2); assert.equal(d.topClients[0].spend, 300);
  assert.equal(d.retention.length, 10); assert.equal(d.kpi.retentionRate, 100);
});
test('customer codes distinguish identical names; invalid rows excluded and numeric strings summed', () => {
  const d = build([{ ...row('2026-01-01', 'A', '100'), customer_code: '001' }, { ...row('2026-02-01', 'B', '200'), customer_code: '002' }, row('2026-02-30', 'C'), { ...row('2026-01-01', 'D'), customer: 'Guest' }, row('bad-date', 'E'), row('2026-01-01', 'F', 'bad')]);
  assert.equal(d.kpi.totalActive, 2); assert.equal(d.kpi.avgLtv, 150); assert.equal(d.excludedRows, 4);
  assert.equal(build([row('2026-01-01', '', 100)]).freqBuckets.Unknown, 1);
});
test('lapsed boundary and inactive boundary remain distinct', () => {
  const rows = [179,180,730,731].map(days => ({ ...row(new Date(Date.parse('2026-10-23') - days * 86400000).toISOString().slice(0,10), String(days), 50000000), customer: `Client ${days}` }));
  const d = build(rows); assert.equal(d.kpi.lapsedCount, 2); assert.equal(d.kpi.totalActive, 3); assert.equal(d.tierCounts.Inactive, 1);
});
test('annual movement uses comparable prior-year cutoff, not full prior year', () => {
  const d = build([row('2025-03-01', 'A', 10000000), row('2025-12-01', 'B', 2000000000), row('2026-03-01', 'C', 60000000)]);
  assert.equal(d.priorCutoff, '2025-10-23'); assert.equal(d.tierMigration[0].prevSpend, 10000000); assert.equal(d.tierMigration[0].direction, 'up');
  assert.equal(lib.buildClientelingData([], 2024, new Date('2024-02-29T12:00:00Z')).priorCutoff, '2023-02-28');
  assert.equal(build([]).kpi.avgLtv, 0);
});
test('service paginates history and propagates later-page failures', async () => {
  const pager = load('src/lib/fetch-all-rows.ts');
  let calls = 0, fail = false;
  const db = { from() { return { select() { return this; }, lt() { return this; }, order() { return this; }, async range(from) { calls++; return fail && from > 0 ? { data: null, error: { message: 'Page failed' } } : { data: from === 0 ? Array.from({ length: 500 }, (_, i) => ({ ...row('2024-01-01', String(i)), customer: `C${i}` })) : from === 500 ? [row('2024-12-31', 'last')] : [], error: null }; } }; } };
  const service = load('src/services/dashboard/crmDashService.ts', { '@/lib/supabase': { supabase: db }, '@/lib/clienteling': lib, '@/lib/fetch-all-rows': pager });
  assert.equal((await service.getClientelingData(2024)).kpi.totalActive, 501); assert.equal(calls, 2);
  fail = true; await assert.rejects(service.getClientelingData(2024), /Page failed/);
});

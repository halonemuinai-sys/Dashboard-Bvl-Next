import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compiledModule = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('src/app/advisor-performance/annual-ranking.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(compiledModule.exports);
const { rankAnnualAdvisors } = compiledModule.exports;
const row = (name, netSales, achievement, target = 100, location = 'Bali') => ({ name, netSales, achievement, target, location, transCount: 1, productiveMonths: 1, contribution: 10 });
const options = { metric: 'percent', direction: 'desc', search: '', location: '' };

test('value and achievement produce distinct correct rankings without changing source or contribution', () => {
  const source = [row('A', 100, 200), row('B', 300, 150), row('C', -20, -20)];
  const original = structuredClone(source);
  assert.deepEqual(rankAnnualAdvisors(source, options).rows.map(a => a.name), ['A', 'B', 'C']);
  assert.deepEqual(rankAnnualAdvisors(source, { ...options, metric: 'value' }).rows.map(a => a.name), ['B', 'A', 'C']);
  assert.deepEqual(rankAnnualAdvisors(source, { ...options, metric: 'value', direction: 'asc' }).rows.map(a => a.name), ['C', 'A', 'B']);
  assert.deepEqual(source, original);
});

test('undefined achievement sorts last in both directions and ties are deterministic', () => {
  const source = [row('No target', 999, 0, 0), row('Zero', 0, 0), row('Negative', -1, -1), row('Beta', 20, 20), row('Alpha', 20, 20)];
  assert.deepEqual(rankAnnualAdvisors(source, options).rows.map(a => a.name), ['Alpha', 'Beta', 'Zero', 'Negative', 'No target']);
  assert.deepEqual(rankAnnualAdvisors(source, { ...options, direction: 'asc' }).rows.map(a => a.name), ['Negative', 'Zero', 'Alpha', 'Beta', 'No target']);
});

test('location and trimmed case-insensitive search combine; totals follow the visible subset', () => {
  const source = [row('Aris', 200, 200), row('Aris II', 400, 200, 200, 'Plaza Indonesia'), row('Budi', 100, 50, 200)];
  const result = rankAnnualAdvisors(source, { ...options, search: '  ARIS ', location: 'Bali' });
  assert.deepEqual(result.rows.map(a => a.name), ['Aris']);
  assert.equal(result.totalSales, 200);
  assert.equal(result.totalTarget, 100);
  assert.equal(result.achieved, 1);
  assert.equal(result.rows[0].contribution, 10);
  const empty = rankAnnualAdvisors(source, { ...options, search: 'missing' });
  assert.deepEqual(empty, { rows: [], totalSales: 0, totalTarget: 0, achieved: 0 });
});

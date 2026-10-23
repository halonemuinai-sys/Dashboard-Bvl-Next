import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';

function loadTS(relative) {
  const filename = path.resolve(relative);
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
  return compiled.exports;
}
const { buildOpnameLines, resolveScan, lineStatus, summarizeOpname } = loadTS('src/lib/stock-opname.ts');

const stock = [
  { item_code: 'ALLX81', item_sku: '360400', description: 'Ring', main_category: 'Jewelry', qoh: 1 },
  { item_code: '6RLNPA', item_sku: '360396', description: 'Ring', main_category: 'Jewelry', qoh: 1 },
  { item_code: '804197', item_sku: '804197', description: 'Receipt folder', main_category: 'PACK', qoh: 120 },
  { item_code: '103445', item_sku: '103445', description: 'Watch', main_category: 'Watches', qoh: 2 },
];

test('builds lines for the chosen categories and deducts sales since the snapshot', () => {
  const lines = buildOpnameLines(stock, [
    { case_no: 'ALLX81', sap_code: '360400', qty: 1, collection: 'JWL,DV' },   // serial sold
    { case_no: null, sap_code: '804197', qty: 3, collection: 'PACK' },         // packaging issued
    { case_no: null, sap_code: 'Deposit', qty: 1, collection: 'DPS' },          // deposits hold no stock
  ], ['Jewelry', 'PACK']);
  assert.equal(lines.length, 3, 'Watches are not in the chosen categories');
  const sold = lines.find(l => l.item_code === 'ALLX81');
  assert.equal(sold.serialised, true);
  assert.equal(sold.system_qty, 0, 'a sold serial is no longer expected on the shelf');
  const folder = lines.find(l => l.item_code === '804197');
  assert.equal(folder.serialised, false);
  assert.equal(folder.out_qty, 3);
  assert.equal(folder.system_qty, 117);
});

test('scans: serial found once, SAP code counts up, unknown and ambiguous codes are reported', () => {
  const lines = buildOpnameLines(stock, [], []);
  assert.equal(resolveScan(lines, 'allx81').kind, 'serial', 'serials match case-insensitively');
  lines.find(l => l.item_code === 'ALLX81').counted_qty = 1;
  assert.equal(resolveScan(lines, 'ALLX81').kind, 'already');
  assert.equal(resolveScan(lines, '804197').kind, 'increment');
  assert.equal(resolveScan(lines, '360400').kind, 'ambiguous', 'SAP code of serialised stock cannot identify the piece');
  assert.equal(resolveScan(lines, 'ZZZ999').kind, 'unknown');
});

test('status and totals: short, over, match and not counted', () => {
  const lines = [
    { counted_qty: null, system_qty: 2, unexpected: false },
    { counted_qty: 5, system_qty: 5, unexpected: false },
    { counted_qty: 3, system_qty: 5, unexpected: false },
    { counted_qty: 7, system_qty: 5, unexpected: false },
    { counted_qty: 1, system_qty: 0, unexpected: true },
  ];
  assert.deepEqual(lines.map(lineStatus), ['pending', 'match', 'short', 'over', 'unexpected']);
  const s = summarizeOpname(lines);
  assert.equal(s.counted, 4); assert.equal(s.short, 2); assert.equal(s.over, 3); assert.equal(s.match, 1);
  assert.equal(s.systemUnits, 17); assert.equal(s.countedUnits, 16);
});

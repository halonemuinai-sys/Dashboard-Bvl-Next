import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', code)(exports, name => {
    if (!(name in dependencies)) throw Error('Unexpected dependency ' + name);
    return dependencies[name];
  });
  return exports;
}
const validation = load('src/lib/mdr-config.ts');
const engine = load('src/services/dashboard/paymentEngine.ts', { '@/lib/mdr-config': validation, '@/lib/supabase': { supabase: {} } });
const guide = load('src/lib/installment-guide.ts', { '@/services/dashboard/paymentEngine': engine });
const configuration = () => structuredClone({ rules: engine.BANK_MDR_RULES, debitConfig: engine.DEFAULT_DEBIT_CONFIG, creditConfig: engine.DEFAULT_CREDIT_CONFIG });

test('every guide offer matches the MDR Setup engine for both matching and crossing EDCs', () => {
  const config = configuration();
  for (const edc of ['BCA', 'Mandiri']) {
    const offers = guide.buildInstallmentComparisons(config, 50000001, edc);
    assert.ok(offers.length > 20);
    for (const offer of offers) {
      const expected = engine.computePaymentMdr({ paymentType: 'Credit Card', bank: offer.bankKey === 'AMEX' ? 'BCA' : offer.bankKey, cardType: offer.bankKey === 'AMEX' ? 'AMEX' : 'VISA', edc, installment: offer.tenor, amount: 50000001 }, config.rules, config.debitConfig, config.creditConfig);
      assert.equal(offer.mdrPct, expected.mdrPct);
      assert.equal(offer.commAmount, expected.cardComm);
      assert.equal(offer.processMethod, expected.processMethod);
      assert.equal(offer.warningNote, expected.warningNote);
    }
  }
});

test('custom rates, processing, admin fee and store scope replace baseline values', () => {
  const config = configuration();
  Object.assign(config.rules.DBS, { rates: { '6 mth': .012345 }, minAmount: 75000000, adminFee: 25000, validStores: 'Bali', processMethod: 'EDC' });
  const [offer] = guide.buildInstallmentComparisons(config, 75000001, 'BCA', 'all', ' DBS ');
  assert.equal(offer.mdrPct, .012345); assert.equal(offer.commAmount, 925875);
  assert.equal(offer.minRequired, 75000000); assert.equal(offer.adminFee, 25000);
  assert.equal(offer.validStores, 'Bali'); assert.equal(offer.processMethod, 'EDC');
  assert.match(offer.warningNote, /DBS EDC/);
});

test('disabled terms disappear; an explicitly configured zero rate remains active', () => {
  const config = configuration();
  config.rules.OCBC.rates = { '3 mth': 0, '--': .02 };
  const offers = guide.buildInstallmentComparisons(config, 50000000, 'BCA', 'all', 'OCBC');
  assert.equal(offers.length, 1); assert.equal(offers[0].tenor, '3 mth'); assert.equal(offers[0].commAmount, 0);
  assert.deepEqual(guide.buildInstallmentComparisons(config, 50000000, 'BCA', '6 mth', 'OCBC'), []);
});

test('minimums preserve the shared BCA three-month exception and configured other terms', () => {
  const config = configuration(); config.rules.BCA.minAmount = 60000000;
  const offers = guide.buildInstallmentComparisons(config, 10000000, 'BCA');
  const three = offers.find(o => o.bankKey === 'BCA' && o.tenor === '3 mth');
  const six = offers.find(o => o.bankKey === 'BCA' && o.tenor === '6 mth');
  assert.equal(three.minRequired, 10000000); assert.equal(three.meetsMinimum, true);
  assert.equal(six.minRequired, 60000000); assert.equal(six.meetsMinimum, false);
  assert.match(six.warningNote, /60.000.000/);
});

test('AMEX uses its program with BCA issuer rather than the VISA program', () => {
  const config = configuration(); config.rules.AMEX.rates['3 mth'] = .075;
  const [offer] = guide.buildInstallmentComparisons(config, 50000000, 'BCA', '3 mth', 'AMEX');
  assert.equal(offer.mdrPct, .075); assert.equal(offer.commAmount, 3750000);
});

test('invalid amounts produce no offers and percentages retain configured precision', () => {
  for (const amount of [0, -1, NaN, Infinity]) assert.deepEqual(guide.buildInstallmentComparisons(configuration(), amount, 'BCA'), []);
  assert.equal(guide.formatMdrRate(.0175), '1.75%');
  assert.equal(guide.formatMdrRate(.012345), '1.2345%');
  assert.equal(guide.formatMdrRate(0), '0%');
});

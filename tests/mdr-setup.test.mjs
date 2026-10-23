import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', code)(exports, name => { if (!(name in dependencies)) throw new Error('Unexpected dependency ' + name); return dependencies[name]; });
  return exports;
}
const helpers = load('src/lib/mdr-config.ts');
function engine(reply = { data: null, error: null }) {
  const db = { from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => reply }) };
  return load('src/services/dashboard/paymentEngine.ts', { '@/lib/mdr-config': helpers, '@/lib/supabase': { supabase: db } });
}
const e = engine();
const config = () => structuredClone({ rules: e.BANK_MDR_RULES, creditConfig: e.DEFAULT_CREDIT_CONFIG, debitConfig: e.DEFAULT_DEBIT_CONFIG });
const split = { paymentType: 'Credit Card', bank: 'BCA', edc: 'BCA', cardType: 'VISA', installment: '--', amount: 10000000 };

test('percent input accepts decimal comma, keeps zero, rejects partial or out-of-range rates', () => {
  assert.equal(helpers.parseMdrPercent('1,75'), .0175);
  assert.equal(helpers.parseMdrPercent('0'), 0);
  assert.equal(helpers.parseMdrPercent('100'), 1);
  for (const value of ['', '-1', '101', 'Infinity', '1.2.3', '5abc', '1e2']) assert.equal(helpers.parseMdrPercent(value), null);
});
test('configuration validation rejects invalid rates, amounts and processing methods', () => {
  helpers.validateMdrConfiguration(config());
  for (const value of [-.01, 1.01, NaN, Infinity, null]) {
    const c = config(); c.rules.BCA.rates['3 mth'] = value;
    assert.throws(() => helpers.validateMdrConfiguration(c));
  }
  const c = config(); c.rules.BCA.minAmount = -1; assert.throws(() => helpers.validateMdrConfiguration(c));
  c.rules.BCA.minAmount = 0; c.rules.BCA.processMethod = 'UNKNOWN'; assert.throws(() => helpers.validateMdrConfiguration(c));
});
test('disabled tenors stay disabled after reload and explicit zero rates stay active', async () => {
  const c = config(); delete c.rules.BCA.rates['6 mth']; c.rules.BCA.rates['12 mth'] = 0;
  const loaded = await engine({ data: { other_remarks: JSON.stringify(c), updated_at: 'saved-at', updated_by: 'finance' }, error: null }).getMergedBankMdrRules({ strict: true });
  assert.equal(loaded.rules.BCA.rates['6 mth'], undefined);
  assert.equal(loaded.rules.BCA.rates['12 mth'], 0);
  assert.equal(loaded.rules.BNI.rates['6 mth'], .05);
  assert.equal(loaded.updatedAt, 'saved-at');
});
test('strict setup loading refuses a failed database read or invalid JSON', async () => {
  await assert.rejects(engine({ data: null, error: new Error('Unavailable') }).getMergedBankMdrRules({ strict: true }));
  await assert.rejects(engine({ data: { other_remarks: '{bad' }, error: null }).getMergedBankMdrRules({ strict: true }));
  await assert.rejects(engine({ data: { other_remarks: '{}' }, error: null }).getMergedBankMdrRules({ strict: true }));
  const defaults = await engine().getMergedBankMdrRules({ strict: true }); assert.equal(defaults.isCustom, false);
});
test('credit uses settlement EDC while debit uses issuer and correctly rounds commission', () => {
  const c = config(); c.creditConfig.edcRates.BCA.offUs = .0234; c.debitConfig.bankRates.Mandiri.offUs = .009;
  const credit = e.computePaymentMdr({ ...split, bank: 'Mandiri', amount: 10000001 }, c.rules, c.debitConfig, c.creditConfig);
  assert.equal(credit.mdrPct, .0234); assert.equal(credit.cardComm, 234000);
  const debit = e.computePaymentMdr({ ...split, paymentType: 'Debit Card', bank: 'Mandiri' }, c.rules, c.debitConfig, c.creditConfig);
  assert.equal(debit.mdrPct, .009); assert.equal(debit.cardComm, 90000);
});
test('special card rates override full-payment EDC but not installment rates', () => {
  const c = config(); c.creditConfig.cardTypeRates.AMEX = .041; c.creditConfig.cardTypeRates.VISA = .9;
  assert.equal(e.computePaymentMdr({ ...split, cardType: 'AMEX' }, c.rules, c.debitConfig, c.creditConfig).mdrPct, .041);
  assert.equal(e.computePaymentMdr(split, c.rules, c.debitConfig, c.creditConfig).mdrPct, .017);
  assert.equal(e.computePaymentMdr({ ...split, bank: 'AMEX', cardType: 'AMEX', installment: '6 mth' }, c.rules, c.debitConfig, c.creditConfig).mdrPct, .05);
  assert.equal(e.computePaymentMdr({ ...split, bank: 'BCA', cardType: 'AMEX', installment: '3 mth' }, c.rules, c.debitConfig, c.creditConfig).mdrPct, .05);
});
test('unsupported installments are visibly warned and zero-fee manual programs keep zero commission', () => {
  const c = config(); delete c.rules.BCA.rates['6 mth'];
  c.creditConfig.edcRates.BCA.onUs = .028;
  assert.equal(e.computePaymentMdr({ ...split, installment: '6 mth' }, c.rules, c.debitConfig, c.creditConfig).mdrPct, .028);
  assert.match(e.computePaymentMdr({ ...split, installment: '6 mth' }, c.rules, c.debitConfig, c.creditConfig).warningNote, /not listed/);
  const manual = e.computePaymentMdr({ ...split, bank: 'OCBC', installment: '6 mth' }, c.rules, c.debitConfig, c.creditConfig);
  assert.equal(manual.cardComm, 0); assert.equal(manual.processMethod, 'MANUAL_FORM');
});
test('service saving validates before posting and sends the loaded version for conflict checking', async () => {
  const original = global.fetch; const requests = [];
  global.fetch = async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return { ok: true, json: async () => ({ success: true }) }; };
  try {
    const c = config(); await e.saveCustomBankMdrRules(c.rules, 'ignored', c.debitConfig, c.creditConfig, 'saved-at');
    assert.equal(requests[0].url, '/api/finance/mdr-config'); assert.equal(requests[0].body.expectedUpdatedAt, 'saved-at');
    assert.equal(requests[0].body.config.updatedBy, undefined);
    c.creditConfig.edcRates.BCA.onUs = -1;
    assert.equal((await e.saveCustomBankMdrRules(c.rules, 'ignored', c.debitConfig, c.creditConfig)).success, false);
    assert.equal(requests.length, 1);
  } finally { global.fetch = original; }
});

function api({ role = 'finance', active = true, session = { email: 'Finance@Example.test' }, current = { updated_at: 'saved-at' }, changed = [{ trans_no: '__CONFIG_MDR_RULES__' }] } = {}) {
  const calls = [];
  const db = { from(table) {
    const call = { table, action: 'select' }; const builder = {};
    for (const method of ['select', 'eq', 'is', 'single', 'maybeSingle', 'insert', 'update', 'delete']) builder[method] = (...args) => { call[method] = args; if (['insert','update','delete'].includes(method)) call.action = method; return builder; };
    builder.then = (resolve, reject) => { calls.push(call); const data = table === 'dashboard_users' ? { role, is_active: active } : call.action === 'select' ? current : changed; return Promise.resolve({ data, error: null }).then(resolve, reject); };
    return builder;
  } };
  const route = load('src/app/api/finance/mdr-config/route.ts', { 'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } }, '@/utils/auth': { verifySessionToken: async () => session }, '@/utils/supabase/admin': { createAdminClient: () => db }, '@/lib/mdr-config': helpers });
  return { calls, post: body => route.POST({ cookies: { get: () => ({ value: 'test-session' }) }, json: async () => body }) };
}
test('save endpoint checks active finance/admin role and denies other accounts before writes', async () => {
  const body = { action: 'save', config: config(), expectedUpdatedAt: 'saved-at' };
  for (const options of [{ session: null }, { role: 'crm' }, { active: false }]) {
    const server = api(options); const result = await server.post(body); assert.ok([401,403].includes(result.status)); assert.equal(server.calls.some(c => c.action !== 'select'), false);
  }
  for (const role of ['finance', 'management_it', 'super_admin']) {
    const server = api({ role }); const result = await server.post(body); assert.equal(result.body.success, true);
    const write = server.calls.find(c => c.action === 'update'); assert.equal(write.update[0].updated_by, 'finance@example.test'); assert.deepEqual(write.eq, ['updated_at', 'saved-at']);
  }
});
test('invalid configuration and stale versions cannot overwrite saved settings', async () => {
  const server = api(); const invalid = config(); invalid.debitConfig.offUsRate = 2;
  assert.equal((await server.post({ action: 'save', config: invalid, expectedUpdatedAt: 'saved-at' })).status, 400);
  assert.equal((await server.post({ action: 'save', config: config(), expectedUpdatedAt: 'old' })).status, 409);
  assert.equal(server.calls.some(c => c.action !== 'select'), false);
  assert.equal((await api({ changed: [] }).post({ action: 'save', config: config(), expectedUpdatedAt: 'saved-at' })).status, 409);
});
test('baseline reset deletes only the version-matched config row; first save inserts a new row', async () => {
  const server = api(); assert.equal((await server.post({ action: 'reset', expectedUpdatedAt: 'saved-at' })).body.success, true);
  const removal = server.calls.find(c => c.action === 'delete'); assert.deepEqual(removal.eq, ['updated_at', 'saved-at']); assert.deepEqual(removal.select, ['trans_no']);
  const fresh = api({ current: null }); assert.equal((await fresh.post({ action: 'save', config: config() })).body.success, true);
  assert.equal(fresh.calls.find(c => c.action === 'insert').insert[0].trans_no, '__CONFIG_MDR_RULES__');
});

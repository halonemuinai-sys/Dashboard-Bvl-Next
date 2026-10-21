import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', code)(exports, name => {
    if (!(name in dependencies)) throw new Error('Unexpected dependency: ' + name);
    return dependencies[name];
  });
  return exports;
}
const logic = load('src/lib/crm-visit.ts');
const item = { item_code: 'A', sap_code: '1', deskripsi: 'Ring', harga: 123456.78, kategori: 'Jewelry', koleksi: '' };
const visit = { customer_name: '  Customer  ', tanggal_berkunjung: '2026-10-21', location: 'Bali', diskon_pct: 10, email: '' };

test('calculates item totals and percentage discount, ignoring forged client net sales', () => {
  const result = logic.validateVisit({ ...visit, net_sales: 1 }, [item, { ...item, harga: 100 }]);
  assert.equal(result.subtotal, 123556.78);
  assert.equal(result.net, 111201.1);
  assert.equal(result.customerName, 'Customer');
  assert.equal(logic.validateVisit({ ...visit, diskon_pct: 100 }, [item]).net, 0);
  assert.equal(logic.validateVisit(visit, []).net, 0);
});

test('rejects invalid dates, names, email, discount and item prices', () => {
  for (const patch of [{ customer_name: '   ' }, { tanggal_berkunjung: '2026-02-30' }, { email: 'invalid' }, { location: '' }, ...[-1, 101, NaN, Infinity, '10'].map(diskon_pct => ({ diskon_pct }))]) {
    assert.throws(() => logic.validateVisit({ ...visit, ...patch }, [item]));
  }
  for (const harga of [-1, 0, NaN, Infinity, '10']) assert.throws(() => logic.validateVisit(visit, [{ ...item, harga }]));
  assert.throws(() => logic.validateVisit(visit, [{ ...item, deskripsi: '  ' }]));
  assert.throws(() => logic.validateVisit(visit, null));
  assert.equal(logic.validateVisit({ ...visit, tanggal_berkunjung: '2024-02-29' }, []).net, 0);
});

test('default boutique date uses Jakarta calendar at UTC date boundaries', () => {
  assert.equal(logic.boutiqueDate(new Date('2026-10-20T18:00:00Z')), '2026-10-21');
});

function routeWith(respond) {
  const calls = [];
  const db = { from(table) {
    const call = { table, operation: 'select', args: {} };
    const builder = {};
    for (const method of ['select', 'insert', 'delete', 'eq', 'not', 'order', 'limit', 'or', 'single', 'maybeSingle']) {
      builder[method] = (...args) => { call.args[method] = args; if (method === 'insert' || method === 'delete') call.operation = method; return builder; };
    }
    builder.then = (resolve, reject) => { calls.push(call); return Promise.resolve(respond(call)).then(resolve, reject); };
    return builder;
  } };
  const route = load('src/app/api/crm/dedup/route.ts', {
    '@/lib/crm-visit': logic,
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@supabase/supabase-js': { createClient: () => db },
  });
  return { ...route, calls };
}
const request = (extra = {}) => ({ json: async () => ({ action: 'create_traffic', autoCreateProfile: false, trafficData: { ...visit, net_sales: 1 }, trafficItems: [item], ...extra }) });

test('API validates before writes and persists recalculated amounts', async () => {
  const api = routeWith(call => ({ data: call.table === 'mirror_traffic' ? { id: 7 } : null, error: null }));
  const invalid = await api.POST(request({ trafficData: { ...visit, diskon_pct: 101 } }));
  assert.equal(invalid.status, 400);
  assert.equal(api.calls.length, 0);
  const result = await api.POST(request());
  assert.equal(result.body.success, true);
  assert.equal(api.calls.find(c => c.table === 'mirror_traffic').args.insert[0].net_sales, 111111.1);
  assert.equal(api.calls.find(c => c.table === 'traffic_items').args.insert[0][0].traffic_id, 7);
});

test('selected CRM ID is checked and reused without making another profile', async () => {
  const api = routeWith(call => ({ data: call.table === 'crm_profiling' ? { id: 12 } : { id: 7 }, error: null }));
  const result = await api.POST(request({ autoCreateProfile: true, trafficData: { ...visit, crm_profile_id: 12 } }));
  assert.equal(result.body.success, true);
  assert.equal(api.calls.filter(c => c.table === 'crm_profiling' && c.operation === 'insert').length, 0);
  assert.equal(api.calls.find(c => c.table === 'mirror_traffic').args.insert[0].crm_profile_id, 12);
});

test('item failure rolls back only the newly created visit and profile', async () => {
  const api = routeWith(call => {
    if (call.table === 'traffic_items') return { error: { message: 'Item insert failed' } };
    if (call.operation === 'delete') return { data: [{ id: 7 }], error: null };
    return { data: { id: call.table === 'crm_profiling' ? 12 : 7 }, error: null };
  });
  const result = await api.POST(request({ autoCreateProfile: true }));
  assert.equal(result.body.success, false);
  assert.equal(result.status, 500);
  assert.deepEqual(api.calls.filter(c => c.operation === 'delete').map(c => [c.table, c.args.eq]), [['mirror_traffic', ['id', 7]], ['crm_profiling', ['id', 12]]]);
});

test('failed rollback returns a saved-record warning to prevent blind retry duplicates', async () => {
  const api = routeWith(call => call.table === 'traffic_items' || call.operation === 'delete' ? { error: { message: 'Failed' } } : { data: { id: 7 }, error: null });
  const result = await api.POST(request());
  assert.equal(result.body.success, true);
  assert.match(result.body.warning, /Visit #7.*do not submit it again/);
});

test('customer search preserves same-name customers and uses CRM ID when merging a linked visit', async () => {
  const api = routeWith(call => ({ data: call.table === 'crm_profiling' ? [
    { id: 12, nama_lengkap: 'Same Name', no_hp: '111' }, { id: 13, nama_lengkap: 'Same Name', no_hp: '222' },
  ] : [ { id: 500, crm_profile_id: 12, customer_name: 'Same Name', no_hp: '111' }, { id: 501, customer_name: 'Same Name', no_hp: '333' } ], error: null }));
  const result = await api.GET({ url: 'http://localhost/api/crm/dedup?action=search_customers&q=Same' });
  assert.equal(result.body.customers.length, 3);
  const linked = result.body.customers.find(c => c.phone === '111');
  assert.equal(linked.id, 12);
  assert.equal(linked.source, 'CRM Profile');
});

function hookHarness() {
  let index = 0;
  const state = [];
  const react = {
    useState(initial) { const i = index++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    useRef(value) { const [ref] = react.useState({ current: value }); return ref; },
    useEffect() {}, useCallback(fn) { return fn; }, useMemo(fn) { return fn(); },
  };
  const hook = load('src/app/crm-dedup/useCrmDedup.ts', { react, './masterData': {}, '@/lib/crm-visit': logic });
  return () => { index = 0; return hook.useCrmDedup(); };
}

test('switching customers clears missing contacts and does not inherit a completed visit', () => {
  const render = hookHarness(); let crm = render();
  crm.selectCustomerFromDb({ id: 1, name: 'A', source: 'CRM Profile', nickname: 'Alias', phone: '123', email: 'a@test.com', statusVisit: 'Completed', groupSize: '5' });
  crm = render(); assert.equal(crm.trStatus, 'Follow Up'); assert.equal(crm.trGroupSize, '1');
  crm.selectCustomerFromDb({ id: 2, name: 'B', source: 'Traffic Record' });
  crm = render(); assert.equal(crm.trNoHp, ''); assert.equal(crm.trEmail, ''); assert.equal(crm.trNamaPanggilan, ''); assert.equal(crm.trAutoProfile, false);
  crm.clearSelectedCustomer(); crm = render(); assert.equal(crm.selectedDbCustomer, null); assert.equal(crm.trStatusPelanggan, 'New Prospect');
});

test('double-click save sends one POST, links CRM ID, and resets discount for next visit', async () => {
  const originalFetch = global.fetch;
  let resolveSave; let posts = 0; let payload;
  global.fetch = async (url, options) => {
    if (options?.method === 'POST') { posts++; payload = JSON.parse(options.body); return new Promise(resolve => { resolveSave = () => resolve({ json: async () => ({ success: true }) }); }); }
    return { json: async () => ({ success: true }) };
  };
  try {
    const render = hookHarness(); let crm = render();
    crm.selectCustomerFromDb({ id: 12, name: 'Customer', source: 'CRM Profile' }); crm.setTrDiskonPct(20);
    crm = render(); const first = crm.handleCreateTraffic(); const second = crm.handleCreateTraffic();
    assert.equal(posts, 1); assert.equal(payload.trafficData.crm_profile_id, 12); assert.equal(render().savingVisit, true);
    resolveSave(); await Promise.all([first, second]); crm = render();
    assert.equal(crm.savingVisit, false); assert.equal(crm.trDiskonPct, 0); assert.equal(crm.trAutoProfile, true); assert.equal(crm.trCustomerName, '');
  } finally { global.fetch = originalFetch; }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function harness() {
  const state = [];
  let index = 0;
  const react = {
    useState(initial) { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    useRef(value) { const [ref] = react.useState({ current: value }); return ref; },
    useEffect() {},
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/app/crm-dedup/useTrafficHistory.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', code)(exports, name => { assert.equal(name, 'react'); return react; });
  return { ...exports, render() { index = 0; return exports.useTrafficHistory(); } };
}
const response = (id, total = 80) => ({ ok: true, json: async () => ({ success: true, trafficRows: [{ id, customer_name: 'Sample visitor' }], totalCount: total }) });

test('opening history and editing filters do not fetch until Load is called', async () => {
  const original = global.fetch; const urls = [];
  global.fetch = async url => { urls.push(url); return response(1); };
  try {
    const app = harness(); let state = app.render();
    assert.equal(state.loading, false); assert.equal(state.result, null);
    state.setDraft({ ...state.draft, query: '  Aris  ', store: 'Bali' }); state = app.render();
    assert.equal(urls.length, 0);
    await state.load(); state = app.render();
    assert.equal(urls.length, 1); const params = new URL(urls[0], 'http://localhost').searchParams;
    assert.equal(params.get('q'), 'Aris'); assert.equal(params.get('store'), 'Bali'); assert.equal(params.get('page'), '1'); assert.equal(params.get('limit'), '40');
    assert.equal(state.result.filters.store, 'Bali'); assert.equal(state.dirty, false);
  } finally { global.fetch = original; }
});

test('draft changes retain loaded data and pagination uses the applied snapshot', async () => {
  const original = global.fetch; const urls = [];
  global.fetch = async url => { urls.push(url); return response(urls.length); };
  try {
    const app = harness(); let state = app.render(); await state.load(); state = app.render();
    state.setDraft({ ...state.draft, store: 'Bali' }); state = app.render();
    assert.equal(state.dirty, true); assert.equal(state.result.rows[0].id, 1); assert.equal(urls.length, 1);
    await state.load(state.result.filters, 2); state = app.render();
    assert.equal(state.result.page, 2); assert.equal(new URL(urls[1], 'http://localhost').searchParams.has('store'), false);
    await state.load(); state = app.render(); assert.equal(state.result.page, 1); assert.equal(state.result.filters.store, 'Bali');
    state.setDraft({ ...app.emptyHistoryFilters }); state = app.render(); assert.equal(state.dirty, true); assert.equal(urls.length, 3);
  } finally { global.fetch = original; }
});

test('invalid dates and reversed ranges are rejected before the API call', async () => {
  const original = global.fetch; let calls = 0;
  global.fetch = async () => { calls++; return response(1); };
  try {
    const app = harness(); let state = app.render();
    for (const [startDate, endDate] of [['2026-10-22', '2026-10-21'], ['2026-02-30', ''], ['invalid', '']]) {
      await state.load({ ...state.draft, startDate, endDate }); state = app.render(); assert.ok(state.error);
    }
    assert.equal(calls, 0);
  } finally { global.fetch = original; }
});

test('failed loads keep the previous successful page and expose an error', async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => response(1);
    const app = harness(); let state = app.render(); await state.load(); state = app.render();
    global.fetch = async () => ({ ok: false, json: async () => ({ success: false, error: 'Connection unavailable' }) });
    await state.load(state.result.filters, 2); state = app.render();
    assert.equal(state.result.page, 1); assert.equal(state.result.rows[0].id, 1); assert.equal(state.error, 'Connection unavailable'); assert.equal(state.loading, false);
  } finally { global.fetch = original; }
});

test('late responses from cancelled loads cannot replace the latest result', async () => {
  const original = global.fetch; const pending = [];
  global.fetch = (url, options) => new Promise(resolve => pending.push({ resolve, signal: options.signal }));
  try {
    const app = harness(); const state = app.render();
    const first = state.load({ ...state.draft, store: 'Bali' });
    const second = state.load({ ...state.draft, store: 'Plaza Indonesia' });
    assert.equal(pending[0].signal.aborted, true);
    pending[1].resolve(response(2)); await second;
    pending[0].resolve(response(1)); await first;
    assert.equal(app.render().result.rows[0].id, 2); assert.equal(app.render().result.filters.store, 'Plaza Indonesia'); assert.equal(app.render().loading, false);
  } finally { global.fetch = original; }
});

test('zero matching visits stays zero and does not inherit an older count', async () => {
  const original = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ success: true, trafficRows: [], totalCount: 0 }) });
  try { const app = harness(); await app.render().load(); assert.equal(app.render().result.total, 0); assert.deepEqual(app.render().result.rows, []); }
  finally { global.fetch = original; }
});

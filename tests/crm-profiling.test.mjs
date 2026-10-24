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
  const original = compiled.require.bind(compiled);
  compiled.require = name => Object.hasOwn(mocks, name) ? mocks[name] : original(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
  return compiled.exports;
}
const queryHelpers = loadTS('src/lib/crm-profiling-query.ts');
const fetchHelpers = loadTS('src/lib/fetch-all-rows.ts');
const { profileSearchFilter, profilePageRange, profileCsvCell, profileDirectoryFilter, profilePhotoSummary } = queryHelpers;

test('photo filters intersect with search rather than expanding the result set', () => {
  assert.equal(profileDirectoryFilter('Jane', 'missing'), `and(or(${profileSearchFilter('Jane')}),or(${queryHelpers.MISSING_PHOTO_FILTER}))`);
  assert.equal(profileDirectoryFilter('', 'missing'), queryHelpers.MISSING_PHOTO_FILTER);
  assert.equal(profileDirectoryFilter('Jane', 'all'), profileSearchFilter('Jane'));
  assert.equal(profileDirectoryFilter('', 'with'), 'foto_customer.match."[^[:space:]]"');
});

test('photo coverage handles empty directories and rounds to one decimal', () => {
  assert.deepEqual(profilePhotoSummary(0, 0), { total: 0, missing: 0, withPhoto: 0, coverage: 0 });
  assert.deepEqual(profilePhotoSummary(3, 2), { total: 3, missing: 2, withPhoto: 1, coverage: 33.3 });
});

test('search quotes punctuation and includes email, full name and advisor', () => {
  const filter = profileSearchFilter('  Lee, "Jane" (VIP)  ');
  for (const column of ['nama_lengkap', 'full_name_tittle', 'email', 'customer_advisor']) {
    assert.ok(filter.includes(`${column}.ilike.${JSON.stringify('%Lee, "Jane" (VIP)%')}`));
  }
  assert.equal(profileSearchFilter('   '), '');
});

test('search escapes SQL wildcard characters', () => {
  const filter = profileSearchFilter('50%_VIP');
  assert.ok(filter.includes(JSON.stringify('%50\\%\\_VIP%')));
});

test('pages do not overlap and invalid pages normalize safely', () => {
  assert.deepEqual(profilePageRange(1), { from: 0, to: 23 });
  assert.deepEqual(profilePageRange(2), { from: 24, to: 47 });
  assert.deepEqual(profilePageRange(NaN), profilePageRange(1));
  assert.deepEqual(profilePageRange(-2), profilePageRange(1));
});

test('CSV quotes commas and keeps formula-like customer input as data', () => {
  assert.equal(profileCsvCell('Lee, "Jane"'), '"Lee, ""Jane"""');
  assert.equal(profileCsvCell('+628123'), '"\'+628123"');
  assert.equal(profileCsvCell(' =HYPERLINK("x")'), '"\' =HYPERLINK(""x"")"');
});

function serviceFixture(failAt = -1) {
  const source = Array.from({ length: 1201 }, (_, id) => ({ id, foto_customer: id % 3 === 0 ? null : id % 3 === 1 ? ' \t ' : 'Form Profiling_Images/photo.jpg' }));
  const requests = [];
  const supabase = { from(table) {
    const request = { table, order: [] };
    requests.push(request);
    const builder = {
      select(columns, options) { request.columns = columns; request.options = options; return this; },
      order(column, options) { request.order.push([column, options]); return this; },
      or(filter) { request.filter = filter; return this; },
      ilike(column, pattern) { request.store = [column, pattern]; return this; },
      range(from, to) { request.from = from; request.to = to; return this; },
      abortSignal(signal) { request.signal = signal; return this; },
      then(resolve, reject) {
        const filtered = request.filter?.includes(queryHelpers.MISSING_PHOTO_FILTER) ? source.filter(row => !row.foto_customer?.trim())
          : request.filter?.includes('foto_customer.match."[^[:space:]]"') ? source.filter(row => !!row.foto_customer?.trim()) : source;
        return Promise.resolve(request.from === failAt
          ? { data: null, error: { message: 'Query failed' } }
          : { data: request.options?.head ? null : filtered.slice(request.from, request.to + 1), count: filtered.length, error: null }).then(resolve, reject);
      },
    };
    return builder;
  } };
  const service = loadTS('src/services/dashboard/crmDashService.ts', {
    '@/lib/clienteling': {}, '@/lib/fetch-all-rows': fetchHelpers,
    '@/lib/supabase': { supabase }, '@/lib/crm-profiling-query': queryHelpers,
  });
  return { service, requests };
}

test('directory fetches only one page with exact count, filters and cancellation', async () => {
  const { service, requests } = serviceFixture();
  const signal = new AbortController().signal;
  const result = await service.getCrmProfilingPage('Jane', 'Bali', 2, signal);
  assert.equal(result.rows.length, 24);
  assert.equal(result.rows[0].id, 24);
  assert.equal(result.total, 1201);
  assert.equal(requests[0].signal, signal);
  assert.equal(requests[0].options.count, 'exact');
  assert.deepEqual(requests[0].store, ['lokasi_store', '%Bali%']);
  assert.equal(requests[0].filter, profileSearchFilter('Jane'));
  assert.deepEqual(requests[0].order.map(item => item[0]), ['created_at', 'id']);
});

test('export includes matches past the default 1000 row cap using identical filters', async () => {
  const { service, requests } = serviceFixture();
  const result = await service.exportCrmProfiling('Jane', 'Bali');
  assert.equal(result.length, 1201);
  assert.equal(new Set(result.map(row => row.id)).size, 1201);
  assert.deepEqual(requests.map(r => r.from), [0, 500, 1000]);
  assert.ok(requests.every(r => r.filter === profileSearchFilter('Jane') && r.store[1] === '%Bali%'));
});

test('export fails rather than silently downloading incomplete data', async () => {
  const { service } = serviceFixture(500);
  await assert.rejects(service.exportCrmProfiling('', ''), /Query failed/);
});

test('photo KPIs count the entire matching directory without downloading profiles', async () => {
  const { service, requests } = serviceFixture();
  const signal = new AbortController().signal;
  const result = await service.getCrmProfilingSummary('Jane', 'Bali', signal);
  assert.deepEqual(result, { total: 1201, missing: 801, withPhoto: 400, coverage: 33.3 });
  assert.equal(requests.length, 2);
  assert.ok(requests.every(r => r.columns === 'id' && r.options.head && r.options.count === 'exact' && r.signal === signal));
  assert.ok(requests.every(r => r.filter.includes(profileSearchFilter('Jane')) && r.store[1] === '%Bali%'));
});

test('missing-photo pagination and export use the same definition including whitespace', async () => {
  const { service } = serviceFixture();
  const page = await service.getCrmProfilingPage('', '', 1, new AbortController().signal, 'missing');
  const exported = await service.exportCrmProfiling('', '', 'missing');
  assert.equal(page.total, 801);
  assert.equal(page.rows.length, 24);
  assert.equal(exported.length, 801);
  assert.ok(exported.every(row => !row.foto_customer?.trim()));
});

'use server';

import { getSessionUser } from '@/lib/server-access';
import { hasMenuAccess, isAdminRole } from '@/lib/access-policy';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { businessDate } from '@/lib/sales-chart-data';
import { syncService } from '@/services/syncService';
import { OPNAME_STORES, buildOpnameLines, resolveScan, summarizeOpname, type OpnameLine, type StockRow, type SaleRow } from '@/lib/stock-opname';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
async function run<T>(work: () => Promise<T>): Promise<Result<T>> {
  try { return { ok: true, data: await work() }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'The stock opname request failed.' }; }
}

async function access() {
  const { db, user } = await getSessionUser();
  const { data, error } = await db.from('role_menu_access').select('menu_path,allowed').eq('role', user.role);
  if (error || !hasMenuAccess(user.role, (data || []).filter(r => r.allowed).map(r => r.menu_path), '/stock-opname')) throw new Error('You do not have access to stock opname.');
  const own = user.assigned_store && user.assigned_store !== 'ALL' ? user.assigned_store : '';
  const stores = OPNAME_STORES.filter(s => !own || s.name === own);
  return { db, user, stores, admin: isAdminRole(user.role) };
}
type Ctx = Awaited<ReturnType<typeof access>>;

async function sessionFor(ctx: Ctx, id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid stock opname session.');
  const { data, error } = await ctx.db.from('stock_opname_sessions').select('*').eq('id', id).single();
  if (error || !data) throw new Error('Stock opname session not found.');
  if (!ctx.stores.some(s => s.code === data.store_code)) throw new Error('This session is outside your boutique.');
  return data;
}

async function latestSnapshot(ctx: Ctx, storeCode: string) {
  const { data, error } = await ctx.db.from('inventory_valuation').select('snapshot_date').eq('location_code', storeCode).order('snapshot_date', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return data?.[0]?.snapshot_date as string | undefined;
}

async function refreshTotals(ctx: Ctx, sessionId: number) {
  const { data, error } = await ctx.db.from('stock_opname_lines').select('counted_qty,system_qty,unexpected').eq('session_id', sessionId);
  if (error) throw new Error(error.message);
  const s = summarizeOpname(data || []);
  await ctx.db.from('stock_opname_sessions').update({ total_lines: s.total, counted_lines: s.counted, short_qty: s.short, over_qty: s.over }).eq('id', sessionId);
}

/** Boutiques the user may count, with their latest stock snapshot and its categories. */
export async function getOpnameSetupAction() {
  return run(async () => {
    const ctx = await access();
    return Promise.all(ctx.stores.map(async store => {
      const date = await latestSnapshot(ctx, store.code);
      if (!date) return { ...store, snapshotDate: null, categories: [] as { name: string; lines: number }[] };
      const rows = await fetchAllRows<{ main_category: string | null }>((from, to) => ctx.db.from('inventory_valuation').select('main_category')
        .eq('location_code', store.code).eq('snapshot_date', date).order('id').range(from, to));
      const counts = new Map<string, number>();
      rows.forEach(r => { const c = (r.main_category || 'Other').trim(); counts.set(c, (counts.get(c) || 0) + 1); });
      return { ...store, snapshotDate: date, categories: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, lines]) => ({ name, lines })) };
    }));
  });
}

export async function listOpnameSessionsAction() {
  return run(async () => {
    const ctx = await access();
    const { data, error } = await ctx.db.from('stock_opname_sessions').select('*').in('store_code', ctx.stores.map(s => s.code)).order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return { sessions: data || [], canDelete: ctx.admin };
  });
}

export async function createOpnameSessionAction(input: { storeCode: string; categories: string[]; title?: string }) {
  return run(async () => {
    const ctx = await access();
    const store = ctx.stores.find(s => s.code === input.storeCode);
    if (!store) throw new Error('Select a boutique you are assigned to.');
    if (!Array.isArray(input.categories) || !input.categories.length || input.categories.some(c => typeof c !== 'string' || c.length > 60)) throw new Error('Select at least one category.');
    // Pull today's sales first so items sold before the count are deducted (best effort).
    const today = businessDate();
    try { await syncService.syncSalesData(Number(today.slice(5, 7)), Number(today.slice(0, 4))); } catch (error) { console.error('Opname pre-sync failed:', error); }
    const snapshotDate = await latestSnapshot(ctx, store.code);
    if (!snapshotDate) throw new Error(`No stock snapshot for ${store.name}. Run Sync stock in Inventory Valuation first.`);
    const [stock, sales] = await Promise.all([
      fetchAllRows<StockRow>((from, to) => ctx.db.from('inventory_valuation').select('item_code,item_sku,description,main_category,qoh')
        .eq('location_code', store.code).eq('snapshot_date', snapshotDate).order('id').range(from, to)),
      fetchAllRows<SaleRow>((from, to) => ctx.db.from('bvlgari_sales').select('case_no,sap_code,qty,collection')
        .eq('location', store.name).gte('transaction_date', snapshotDate).order('id').range(from, to)),
    ]);
    const lines = buildOpnameLines(stock, sales, input.categories);
    if (!lines.length) throw new Error('The selected categories have no stock in the latest snapshot.');
    const title = (input.title || '').trim().slice(0, 120) || `${store.name} · ${input.categories.join(', ')} · ${today}`;
    const { data: session, error } = await ctx.db.from('stock_opname_sessions').insert({
      store_code: store.code, store_name: store.name, categories: input.categories, title, snapshot_date: snapshotDate, created_by: ctx.user.email, total_lines: lines.length,
    }).select('id').single();
    if (error || !session) throw new Error(error?.message || 'The session could not be created.');
    for (let i = 0; i < lines.length; i += 500) {
      const { error: lineError } = await ctx.db.from('stock_opname_lines').insert(lines.slice(i, i + 500).map(line => ({ ...line, session_id: session.id })));
      if (lineError) { await ctx.db.from('stock_opname_sessions').delete().eq('id', session.id); throw new Error(`The count sheet could not be saved: ${lineError.message}`); }
    }
    return { id: session.id as number };
  });
}

export async function getOpnameSessionAction(id: number) {
  return run(async () => {
    const ctx = await access();
    const session = await sessionFor(ctx, id);
    const lines = await fetchAllRows<OpnameLine & { id: number; counted_by: string | null; counted_at: string | null }>((from, to) => ctx.db.from('stock_opname_lines')
      .select('*').eq('session_id', id).order('category').order('item_code').range(from, to));
    return { session, lines };
  });
}

/** Barcode scan: a serial is marked found, a SAP code adds one, an unknown code is added as unexpected. */
export async function scanOpnameCodeAction(sessionId: number, code: string) {
  return run(async () => {
    const ctx = await access();
    const session = await sessionFor(ctx, sessionId);
    if (session.status !== 'in_progress') throw new Error('This session is completed and locked.');
    const value = typeof code === 'string' ? code.trim().slice(0, 80) : '';
    if (!value) throw new Error('Scan or type a code.');
    const { data: lines, error } = await ctx.db.from('stock_opname_lines').select('*').eq('session_id', sessionId);
    if (error) throw new Error(error.message);
    const result = resolveScan((lines || []) as OpnameLine[], value);
    const stamp = { counted_by: ctx.user.email, counted_at: new Date().toISOString() };
    let message: string;
    if (result.kind === 'already') return { status: 'warning' as const, message: `${result.line.item_code} was already counted.`, line: result.line };
    if (result.kind === 'ambiguous') return { status: 'warning' as const, message: `${result.sku} is a SAP code for serialised stock. Scan the serial number instead.`, line: null };
    if (result.kind === 'unknown') {
      const { error: insertError } = await ctx.db.from('stock_opname_lines').insert({ session_id: sessionId, item_code: value, item_sku: null, description: 'Not in system stock', category: null, serialised: false, snapshot_qty: 0, out_qty: 0, system_qty: 0, counted_qty: 1, unexpected: true, ...stamp });
      if (insertError) throw new Error(insertError.message);
      message = `${value} is not in the system stock. Added as an unexpected item.`;
    } else {
      const line = result.line as OpnameLine & { id: number };
      const next = result.kind === 'serial' ? 1 : (line.counted_qty ?? 0) + 1;
      // Only apply when nobody changed the line meanwhile (two scanners on one sheet).
      let query = ctx.db.from('stock_opname_lines').update({ counted_qty: next, ...stamp }).eq('id', line.id);
      query = line.counted_qty === null ? query.is('counted_qty', null) : query.eq('counted_qty', line.counted_qty);
      const { data: changed, error: updateError } = await query.select('id');
      if (updateError) throw new Error(updateError.message);
      if (!changed?.length) throw new Error('This line was updated by someone else. Scan again.');
      message = result.kind === 'serial' ? `${line.item_code} found.` : `${line.item_code} counted: ${next}.`;
    }
    await refreshTotals(ctx, sessionId);
    return { status: 'success' as const, message, line: null };
  });
}

export async function setOpnameCountAction(sessionId: number, lineId: number, counted: number | null, note?: string) {
  return run(async () => {
    const ctx = await access();
    const session = await sessionFor(ctx, sessionId);
    if (session.status !== 'in_progress') throw new Error('This session is completed and locked.');
    if (counted !== null && (!Number.isInteger(counted) || counted < 0 || counted > 100000)) throw new Error('Enter a whole number of 0 or more.');
    const values: Record<string, unknown> = { counted_qty: counted, counted_by: counted === null ? null : ctx.user.email, counted_at: counted === null ? null : new Date().toISOString() };
    if (note !== undefined) values.note = typeof note === 'string' ? note.trim().slice(0, 300) || null : null;
    const { data, error } = await ctx.db.from('stock_opname_lines').update(values).eq('id', lineId).eq('session_id', sessionId).select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('Line not found in this session.');
    await refreshTotals(ctx, sessionId);
    return null;
  });
}

/** Locks the session; lines never counted are recorded as 0 (not found). */
export async function completeOpnameSessionAction(sessionId: number) {
  return run(async () => {
    const ctx = await access();
    const session = await sessionFor(ctx, sessionId);
    if (session.status !== 'in_progress') throw new Error('This session is already completed.');
    const { error } = await ctx.db.from('stock_opname_lines').update({ counted_qty: 0 }).eq('session_id', sessionId).is('counted_qty', null);
    if (error) throw new Error(error.message);
    await refreshTotals(ctx, sessionId);
    const { error: doneError } = await ctx.db.from('stock_opname_sessions').update({ status: 'completed', completed_by: ctx.user.email, completed_at: new Date().toISOString() }).eq('id', sessionId).eq('status', 'in_progress');
    if (doneError) throw new Error(doneError.message);
    return null;
  });
}

export async function deleteOpnameSessionAction(sessionId: number) {
  return run(async () => {
    const ctx = await access();
    if (!ctx.admin) throw new Error('Only administrators can delete a stock opname session.');
    await sessionFor(ctx, sessionId);
    const { error } = await ctx.db.from('stock_opname_sessions').delete().eq('id', sessionId);
    if (error) throw new Error(error.message);
    return null;
  });
}

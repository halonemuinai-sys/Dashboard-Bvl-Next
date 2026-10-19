'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/server-access';
import { hasMenuAccess } from '@/lib/access-policy';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { DEPOSIT_LINK_PREFIX, depositLinkKey, groupSalesDeposits, isDepositWithinInvoicePeriod, readDepositLink, type DepositSourceRow, type DepositLink } from '@/lib/deposit-links';

const SOURCE_FIELDS = 'id,transaction_no,transaction_date,customer_name,salesman,location,collection,qty,price,sub_total_discount,net_sales';
async function access(path: '/invoice-management' | '/monthly-dps-svc') {
  const { db, user } = await getSessionUser();
  const { data, error } = await db.from('role_menu_access').select('menu_path,allowed').eq('role', user.role);
  if (error || !hasMenuAccess(user.role, (data || []).filter(row => row.allowed).map(row => row.menu_path), path)) throw new Error('You do not have permission to access these records.');
  return { db, user };
}
async function invoiceAccess(invoiceNo: string) {
  if (typeof invoiceNo !== 'string' || !invoiceNo.trim() || invoiceNo.length > 150) throw new Error('Invalid sales invoice.');
  const context = await access('/invoice-management');
  const items = await fetchAllRows((from, to) => context.db.from('clean_master').select('id,trans_no,transaction_date,location,collection').eq('trans_no', invoiceNo).order('id').range(from, to));
  if (!items.length || items.some(item => ['DPS', 'SVC', 'PACK'].includes((item.collection || '').toUpperCase()) || item.location?.toUpperCase().startsWith('RB'))) throw new Error('Select a regular sales invoice.');
  const locations = new Set(items.map(item => item.location));
  if (locations.size !== 1) throw new Error('This invoice has conflicting store locations. Correct it before linking a DP.');
  const location = items[0].location;
  if (context.user.assigned_store && context.user.assigned_store !== 'ALL' && context.user.assigned_store !== location) throw new Error('This invoice is outside your assigned store.');
  return { ...context, location, invoiceDate: items[0].transaction_date as string };
}
async function links(db: Awaited<ReturnType<typeof access>>['db']) {
  const rows = await fetchAllRows((from, to) => db.from('transaction_records_meta').select('trans_no,other_remarks')
    .like('trans_no', `${DEPOSIT_LINK_PREFIX.replaceAll('_', '\\_')}%`).order('trans_no').range(from, to));
  return rows.map(row => {
    const value = readDepositLink(row);
    if (!value) throw new Error('A saved DP reference is unreadable. Contact your administrator before changing links.');
    return value;
  });
}
async function result<T>(work: () => Promise<T>) {
  try { return { ok: true as const, data: await work() }; }
  catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : 'The DP request failed. Please retry.' }; }
}

export async function searchSalesDepositsAction(invoiceNo: string, search: string) {
  return result(async () => {
    if (typeof search !== 'string' || search.length > 150) throw new Error('Search must be 150 characters or fewer.');
    const { db, location, invoiceDate } = await invoiceAccess(invoiceNo);
    const [raw, saved] = await Promise.all([
      fetchAllRows((from, to) => db.from('bvlgari_sales').select(SOURCE_FIELDS).eq('collection', 'DPS').eq('location', location).order('id').range(from, to)),
      links(db),
    ]);
    const byDeposit = new Map(saved.map(link => [link.transNo, link]));
    const q = search.trim().toLowerCase();
    const matches = groupSalesDeposits(raw as DepositSourceRow[]).filter(dp => !byDeposit.has(dp.transNo) && isDepositWithinInvoicePeriod(dp.date, invoiceDate)
      && (!q || `${dp.transNo} ${dp.customer} ${dp.salesman}`.toLowerCase().includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date) || a.transNo.localeCompare(b.transNo));
    return { results: matches.slice(0, 100).map(dp => ({ ...dp, link: byDeposit.get(dp.transNo) || null })), total: matches.length, linked: saved.filter(link => link.invoiceNo === invoiceNo) };
  });
}

export async function linkSalesDepositsAction(invoiceNo: string, depositNos: string[]) {
  return result(async () => {
    if (!Array.isArray(depositNos) || !depositNos.length || depositNos.length > 30 || depositNos.some(no => typeof no !== 'string' || !no || no.length > 150) || new Set(depositNos).size !== depositNos.length) throw new Error('Select up to 30 distinct DP transactions.');
    const { db, user, location, invoiceDate } = await invoiceAccess(invoiceNo);
    const raw = await fetchAllRows((from, to) => db.from('bvlgari_sales').select(SOURCE_FIELDS).in('transaction_no', depositNos).order('id').range(from, to));
    const deposits = groupSalesDeposits(raw as DepositSourceRow[]);
    if (deposits.length !== depositNos.length || deposits.some(dp => dp.location !== location || !isDepositWithinInvoicePeriod(dp.date, invoiceDate))) throw new Error('Only sales DP transactions from the same store within the 12 months up to the invoice date can be linked. Service and return transactions are excluded.');
    const existing = await links(db);
    if (existing.some(link => depositNos.includes(link.transNo) && link.invoiceNo !== invoiceNo)) throw new Error('One of these DPs is already linked to another invoice. Refresh the search results.');
    const pending = deposits.filter(dp => !existing.some(link => link.transNo === dp.transNo));
    const created: DepositLink[] = pending.map(dp => ({ ...dp, kind: 'sales_deposit_link', version: 1, invoiceNo, invoiceDate, linkedAt: new Date().toISOString(), linkedBy: user.email }));
    if (created.length) {
      // One bulk INSERT is atomic. Never upsert: a conflicting unique key must
      // reject the entire request instead of stealing another invoice's DP.
      const { error } = await db.from('transaction_records_meta').insert(created.map(link => ({ trans_no: depositLinkKey(link.transNo), other_remarks: JSON.stringify(link), updated_by: user.email, updated_at: link.linkedAt })));
      if (error?.code === '23505') throw new Error('A selected DP was just linked by another user. Refresh and try again.');
      if (error) throw new Error('DP references could not be saved. Please retry.');
    }
    revalidatePath('/invoice-management'); revalidatePath('/monthly-dps-svc');
    return [...existing.filter(link => link.invoiceNo === invoiceNo), ...created];
  });
}

export async function unlinkSalesDepositAction(invoiceNo: string, depositNo: string) {
  return result(async () => {
    const { db } = await invoiceAccess(invoiceNo);
    if (typeof depositNo !== 'string' || !depositNo || depositNo.length > 150) throw new Error('Invalid DP reference.');
    const { data, error } = await db.from('transaction_records_meta').select('trans_no,other_remarks').eq('trans_no', depositLinkKey(depositNo)).single();
    const link = data ? readDepositLink(data) : null;
    if (error || !link || link.invoiceNo !== invoiceNo) throw new Error('This DP is not linked to this invoice. Refresh the data.');
    const removed = await db.from('transaction_records_meta').delete().eq('trans_no', data!.trans_no).eq('other_remarks', data!.other_remarks).select('trans_no');
    if (removed.error || removed.data?.length !== 1) throw new Error('The DP reference changed. Refresh and try again.');
    revalidatePath('/invoice-management'); revalidatePath('/monthly-dps-svc');
    return null;
  });
}

export async function getDepositLinksAction(depositNos: string[]) {
  return result(async () => {
    const { db, user } = await access('/monthly-dps-svc');
    if (!Array.isArray(depositNos) || depositNos.length > 500 || depositNos.some(no => typeof no !== 'string' || no.length > 150)) throw new Error('Invalid DP lookup.');
    if (!depositNos.length) return [];
    const saved = await links(db);
    return saved.filter(link => depositNos.includes(link.transNo) && (!user.assigned_store || user.assigned_store === 'ALL' || user.assigned_store === link.location));
  });
}

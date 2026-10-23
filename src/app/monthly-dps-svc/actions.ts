'use server';
import { getSessionUser } from '@/lib/server-access';
import { hasMenuAccess, isAdminRole } from '@/lib/access-policy';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { monthBounds } from '@/lib/invoice-report-filters';
import { MONTH_NAMES } from '@/services/dashboard/constants';
import { supplementaryKind, supplementaryStoreScope, supplementaryStoreMatches, type SupplementaryKind } from '@/lib/supplementary-transactions';
import { depositLinkKey } from '@/lib/deposit-links';

async function access() {
  const context = await getSessionUser();
  const { db, user } = context;
  const { data, error } = await db.from('role_menu_access').select('menu_path,allowed').eq('role', user.role);
  if (error || !hasMenuAccess(user.role, (data || []).filter(r => r.allowed).map(r => r.menu_path), '/monthly-dps-svc')) throw new Error('You do not have access to these transactions.');
  return { ...context, store: supplementaryStoreScope(user.role, user.assigned_store), finance: isAdminRole(user.role) || user.role === 'finance' };
}

export async function loadSupplementaryTransactions(month: string, year: number, kind?: SupplementaryKind) {
  const { db, store, finance } = await access();
  const { start, end } = monthBounds(MONTH_NAMES.indexOf(month) + 1, year);
  if (kind !== undefined && !['DPS', 'SVC', 'PACK'].includes(kind)) throw new Error('Invalid transaction section.');
  const data = await fetchAllRows((from, to) => {
    let query = db.from('bvlgari_sales').select('id,transaction_no,transaction_date,customer_name,salesman,location,collection,sap_code,catalogue_code,price,qty,sub_total_discount,net_sales,card_comm,type,phone_no')
      .gte('transaction_date', start + 'T00:00:00+07:00').lt('transaction_date', end + 'T00:00:00+07:00');
    query = kind === 'PACK' ? query.ilike('collection', 'PACK%') : kind ? query.eq('collection', kind) : query.or('collection.in.(DPS,SVC),collection.ilike.PACK*');
    if (store) {
      const stores = store === 'Bali' ? ['Bali', 'Bali Boutique'] : [store];
      query = query.in('location', stores.flatMap(s => [s, `RB${s}`, `RB ${s}`]));
    }
    return query.order('id').range(from, to);
  });
  return data.filter(row => supplementaryKind(row.collection) && supplementaryStoreMatches(row.location, store)).map(r => {
    const qty = Number(r.qty) || 0, gross = qty * (Number(r.price) || 0), discount = Number(r.sub_total_discount) || 0;
    const comm = finance ? Number(r.card_comm) || 0 : 0;
    return { id: r.id, trans_no: r.transaction_no || '', transaction_date: r.transaction_date || '', customer: r.customer_name || '', salesman: r.salesman || '', location: r.location || '', main_category: r.collection || '', collection: r.collection || '', sap_code: r.sap_code || '', catalogue_code: r.catalogue_code || '', collection_code: r.collection || '', phone_no: r.phone_no || '', gross_sales: gross, val_disc: discount, disc_pct: gross > 0 ? discount / gross : 0, net_sales: Number(r.net_sales) || 0, qty, cost: discount + comm, comm, type: r.type || 'Regular' };
  });
}

async function rowAccess(id: number | string) {
  if (!(typeof id === 'number' && Number.isInteger(id) && id > 0) && !(typeof id === 'string' && (/^[1-9]\d*$/.test(id) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))) throw new Error('Invalid transaction.');
  const context = await access();
  const { data, error } = await context.db.from('bvlgari_sales').select('id,location,collection,transaction_no').eq('id', id).single();
  if (error || !data || !supplementaryKind(data.collection) || !supplementaryStoreMatches(data.location, context.store)) throw new Error('This transaction is outside your access.');
  return { ...context, row: data };
}
export async function updateSupplementaryTransaction(id: number | string, patch: { type?: string; card_comm?: number }) {
  const { db, row, finance } = await rowAccess(id);
  if (!patch || Object.keys(patch).length !== 1) throw new Error('Update one field at a time.');
  const values: { type?: string; card_comm?: number } = {};
  if (patch.type !== undefined) {
    if (!['Regular', 'SMI'].includes(patch.type)) throw new Error('Invalid sales type.');
    values.type = patch.type;
  } else if (patch.card_comm !== undefined) {
    if (!finance || !Number.isFinite(patch.card_comm) || patch.card_comm < 0) throw new Error('Finance access and a valid commission are required.');
    values.card_comm = patch.card_comm;
  } else throw new Error('Invalid field.');
  const { data, error } = await db.from('bvlgari_sales').update(values).eq('id', id).eq('location', row.location).eq('collection', row.collection).select('id');
  if (error || data?.length !== 1) throw new Error('The transaction changed. Reload and try again.');
}
export async function deleteSupplementaryTransaction(id: number | string) {
  const { db, user, row } = await rowAccess(id);
  if (!isAdminRole(user.role)) throw new Error('Administrator access is required to delete transactions.');
  const reference = await db.from('transaction_records_meta').select('trans_no').eq('trans_no', depositLinkKey(row.transaction_no)).maybeSingle();
  if (reference.error) throw reference.error;
  if (reference.data) throw new Error('Remove the DP invoice link before deleting this transaction.');
  const { error } = await db.from('bvlgari_sales').delete().eq('id', id).eq('location', row.location).eq('collection', row.collection);
  if (error) throw new Error('The transaction could not be deleted.');
}

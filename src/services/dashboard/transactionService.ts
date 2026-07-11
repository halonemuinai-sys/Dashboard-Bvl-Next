import { supabase } from '@/lib/supabase';

/**
 * Monthly Transactions — raw transaction detail from clean_master
 */
export async function getTransactions(month: string, year: number) {
  const monthIndex = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(month);
  const mStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01T00:00:00`;
  const mEnd   = new Date(year, monthIndex + 1, 0, 23, 59, 59).toISOString();

  const [{ data, error }, { data: salesData }] = await Promise.all([
    supabase
      .from('clean_master')
      .select('id, trans_no, transaction_date, customer, salesman, location, main_category, collection, sap_code, catalogue_code, gross_sales, val_disc, disc_pct, net_sales, qty, cost, comm, type')
      .gte('transaction_date', mStart)
      .lte('transaction_date', mEnd)
      .order('transaction_date', { ascending: true }),
    supabase
      .from('bvlgari_sales')
      .select('transaction_no, collection, phone_no')
      .gte('transaction_date', mStart)
      .lte('transaction_date', mEnd),
  ]);

  if (error) throw error;

  // Build lookup map from bvlgari_sales by transaction_no
  const salesMap = new Map<string, { collection_code: string; phone_no: string }>();
  (salesData || []).forEach((s: { transaction_no: string; collection: string; phone_no: string }) => {
    if (s.transaction_no && !salesMap.has(s.transaction_no)) {
      salesMap.set(s.transaction_no, {
        collection_code: s.collection || '',
        phone_no:        s.phone_no   || '',
      });
    }
  });

  // Merge: enrich each clean_master row with collection_code + phone_no
  return (data || []).map(r => {
    const extra = salesMap.get(r.trans_no) ?? { collection_code: '', phone_no: '' };
    return { ...r, ...extra };
  });
}

export async function updateTransaction(id: number, patch: { comm?: number; type?: string }) {
  const { error } = await supabase
    .from('clean_master')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTransaction(id: number) {
  const { error } = await supabase
    .from('clean_master')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

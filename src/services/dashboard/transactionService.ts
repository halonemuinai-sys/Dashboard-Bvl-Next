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

export async function getDpsSvcTransactions(month: string, year: number) {
  const monthIndex = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(month);
  const mStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const mEnd   = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('bvlgari_sales')
    .select('id, transaction_no, transaction_date, customer_name, salesman, location, collection, sap_code, catalogue_code, price, qty, sub_total_discount, net_sales, card_comm, type, phone_no')
    .gte('transaction_date', mStart)
    .lte('transaction_date', mEnd)
    .in('collection', ['DPS', 'SVC'])
    .order('transaction_date', { ascending: true });

  if (error) throw error;
  
  return (data || []).map(r => {
    const gross = (r.qty || 1) * (r.price || 0);
    const discPct = gross > 0 ? (r.sub_total_discount || 0) / gross : 0;
    return {
      id:               r.id,
      trans_no:         r.transaction_no || '',
      transaction_date: r.transaction_date || '',
      customer:         r.customer_name || '',
      salesman:         r.salesman || '',
      location:         r.location || '',
      main_category:    r.collection || '', // 'DPS' or 'SVC'
      collection:       r.collection || '',
      sap_code:         r.sap_code || '',
      catalogue_code:   r.catalogue_code || '',
      collection_code:  r.collection || '',
      phone_no:         r.phone_no || '',
      gross_sales:      gross,
      val_disc:         r.sub_total_discount || 0,
      disc_pct:         discPct,
      net_sales:        r.net_sales || 0,
      qty:              r.qty || 0,
      cost:             (r.sub_total_discount || 0) + (r.card_comm || 0),
      comm:             r.card_comm || 0,
      type:             r.type || 'Regular',
    };
  });
}

export async function updateDpsSvcTransaction(id: number, patch: { card_comm?: number; type?: string }) {
  const { error } = await supabase
    .from('bvlgari_sales')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteDpsSvcTransaction(id: number) {
  const { error } = await supabase
    .from('bvlgari_sales')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

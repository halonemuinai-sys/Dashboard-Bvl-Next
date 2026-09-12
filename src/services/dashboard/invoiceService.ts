import { supabase } from '@/lib/supabase';

export interface InvoiceItem {
  id: number;
  trans_no: string;
  transaction_date: string;
  sap_code: string;
  catalogue_code: string;
  main_category: string;
  collection: string;
  collection_code?: string;
  phone_no?: string;
  qty: number;
  gross_sales: number;
  val_disc: number;
  disc_pct: number;
  net_sales: number;
  comm: number;
  type: string;
}

export interface InvoiceMeta {
  trans_no: string;
  cash_bill_no: string;
  discount_given_reason: string;
  after_sales_support: string;
  dwa_no: string;
  other_remarks: string;
  updated_by?: string;
  updated_at?: string;
}

export interface InvoiceHeader {
  trans_no: string;
  transaction_date: string;
  customer: string;
  salesman: string;
  location: string;
  item_count: number;
  total_qty: number;
  total_gross: number;
  total_disc: number;
  total_net: number;
  total_comm: number;
  meta: InvoiceMeta;
  items: InvoiceItem[];
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export async function getInvoices(month: string, year: number): Promise<InvoiceHeader[]> {
  const monthIndex = MONTHS.indexOf(month);
  const mStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01T00:00:00`;
  const mEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59).toISOString();

  // Fetch clean_master items, bvlgari_sales enrichment, and transaction_records_meta
  const [{ data: rawItems, error: itemsErr }, { data: salesData }, { data: metaData }] = await Promise.all([
    supabase
      .from('clean_master')
      .select('id, trans_no, transaction_date, customer, salesman, location, main_category, collection, sap_code, catalogue_code, gross_sales, val_disc, disc_pct, net_sales, qty, cost, comm, type')
      .gte('transaction_date', mStart)
      .lte('transaction_date', mEnd)
      .order('transaction_date', { ascending: false })
      .order('trans_no', { ascending: true }),
    supabase
      .from('bvlgari_sales')
      .select('transaction_no, collection, phone_no')
      .gte('transaction_date', mStart)
      .lte('transaction_date', mEnd),
    supabase
      .from('transaction_records_meta')
      .select('*'),
  ]);

  if (itemsErr) throw itemsErr;

  // Build lookup map for bvlgari_sales (collection_code, phone_no)
  const salesMap = new Map<string, { collection_code: string; phone_no: string }>();
  (salesData || []).forEach((s: { transaction_no: string; collection: string; phone_no: string }) => {
    if (s.transaction_no && !salesMap.has(s.transaction_no)) {
      salesMap.set(s.transaction_no, {
        collection_code: s.collection || '',
        phone_no: s.phone_no || '',
      });
    }
  });

  // Build lookup map for transaction_records_meta
  const metaMap = new Map<string, InvoiceMeta>();
  (metaData || []).forEach((m: any) => {
    if (m.trans_no) {
      metaMap.set(m.trans_no, {
        trans_no: m.trans_no,
        cash_bill_no: m.cash_bill_no || '',
        discount_given_reason: m.discount_given_reason || '',
        after_sales_support: m.after_sales_support || '',
        dwa_no: m.dwa_no || '',
        other_remarks: m.other_remarks || '',
        updated_by: m.updated_by || '',
        updated_at: m.updated_at || '',
      });
    }
  });

  // Group clean_master rows by trans_no
  const groupMap = new Map<string, {
    trans_no: string;
    transaction_date: string;
    customer: string;
    salesman: string;
    location: string;
    items: InvoiceItem[];
  }>();

  (rawItems || []).forEach((r: any) => {
    const tNo = r.trans_no || `UNKNOWN-${r.id}`;
    if (!groupMap.has(tNo)) {
      groupMap.set(tNo, {
        trans_no: tNo,
        transaction_date: r.transaction_date || '',
        customer: r.customer || '',
        salesman: r.salesman || '',
        location: r.location || '',
        items: [],
      });
    }

    const extra = salesMap.get(tNo) ?? { collection_code: '', phone_no: '' };
    groupMap.get(tNo)!.items.push({
      id: r.id,
      trans_no: tNo,
      transaction_date: r.transaction_date || '',
      sap_code: r.sap_code || '',
      catalogue_code: r.catalogue_code || '',
      main_category: r.main_category || '',
      collection: r.collection || '',
      collection_code: extra.collection_code,
      phone_no: extra.phone_no,
      qty: r.qty || 1,
      gross_sales: r.gross_sales || 0,
      val_disc: r.val_disc || 0,
      disc_pct: r.disc_pct || 0,
      net_sales: r.net_sales || 0,
      comm: r.comm || 0,
      type: r.type || 'Regular',
    });
  });

  // Construct InvoiceHeader array with aggregate calculations
  const result: InvoiceHeader[] = [];
  groupMap.forEach((grp, tNo) => {
    const totalGross = grp.items.reduce((s, it) => s + (it.gross_sales || 0), 0);
    const totalDisc = grp.items.reduce((s, it) => s + (it.val_disc || 0), 0);
    const totalNet = grp.items.reduce((s, it) => s + (it.net_sales || 0), 0);
    const totalComm = grp.items.reduce((s, it) => s + (it.comm || 0), 0);
    const totalQty = grp.items.reduce((s, it) => s + (it.qty || 0), 0);

    const defaultMeta: InvoiceMeta = {
      trans_no: tNo,
      cash_bill_no: '',
      discount_given_reason: '',
      after_sales_support: '',
      dwa_no: '',
      other_remarks: '',
    };

    result.push({
      trans_no: tNo,
      transaction_date: grp.transaction_date,
      customer: grp.customer,
      salesman: grp.salesman,
      location: grp.location,
      item_count: grp.items.length,
      total_qty: totalQty,
      total_gross: totalGross,
      total_disc: totalDisc,
      total_net: totalNet,
      total_comm: totalComm,
      meta: metaMap.get(tNo) || defaultMeta,
      items: grp.items,
    });
  });

  // Sort descending by transaction date
  return result.sort((a, b) => {
    return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
  });
}

export async function saveInvoiceMeta(
  trans_no: string,
  patch: Partial<InvoiceMeta>,
  userEmail?: string
): Promise<InvoiceMeta> {
  const payload: any = {
    trans_no,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  if (userEmail) {
    payload.updated_by = userEmail.toLowerCase();
  }

  const { data, error } = await supabase
    .from('transaction_records_meta')
    .upsert(payload, { onConflict: 'trans_no' })
    .select()
    .single();

  if (error) throw error;
  return data as InvoiceMeta;
}

export async function updateInvoiceLocation(
  trans_no: string,
  newLocation: string,
  userEmail?: string
) {
  const { error } = await supabase
    .from('clean_master')
    .update({ location: newLocation })
    .eq('trans_no', trans_no);

  if (error) throw error;

  if (userEmail) {
    try {
      const { data: latestLogs } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('table_name', 'clean_master')
        .eq('user_email', 'system')
        .order('id', { ascending: false })
        .limit(10);

      if (latestLogs && latestLogs.length > 0) {
        await supabase
          .from('audit_logs')
          .update({ user_email: userEmail.toLowerCase() })
          .in('id', latestLogs.map(l => l.id));
      }
    } catch {}
  }
}

export async function updateInvoiceItemComm(
  id: number,
  comm: number,
  userEmail?: string
) {
  const { error } = await supabase
    .from('clean_master')
    .update({ comm })
    .eq('id', id);

  if (error) throw error;

  if (userEmail) {
    try {
      const { data: latestLog } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('table_name', 'clean_master')
        .eq('record_id', String(id))
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestLog?.id) {
        await supabase
          .from('audit_logs')
          .update({ user_email: userEmail.toLowerCase() })
          .eq('id', latestLog.id);
      }
    } catch {}
  }
}

export async function updateInvoiceItemType(
  id: number,
  type: string,
  userEmail?: string
) {
  const { error } = await supabase
    .from('clean_master')
    .update({ type })
    .eq('id', id);

  if (error) throw error;

  if (userEmail) {
    try {
      const { data: latestLog } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('table_name', 'clean_master')
        .eq('record_id', String(id))
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestLog?.id) {
        await supabase
          .from('audit_logs')
          .update({ user_email: userEmail.toLowerCase() })
          .eq('id', latestLog.id);
      }
    } catch {}
  }
}

export async function deleteInvoice(trans_no: string, userEmail?: string) {
  // Delete from clean_master
  const { error: delErr } = await supabase
    .from('clean_master')
    .delete()
    .eq('trans_no', trans_no);

  if (delErr) throw delErr;

  // Delete meta
  await supabase
    .from('transaction_records_meta')
    .delete()
    .eq('trans_no', trans_no);

  if (userEmail) {
    try {
      const { data: latestLogs } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('table_name', 'clean_master')
        .eq('user_email', 'system')
        .order('id', { ascending: false })
        .limit(10);

      if (latestLogs && latestLogs.length > 0) {
        await supabase
          .from('audit_logs')
          .update({ user_email: userEmail.toLowerCase() })
          .in('id', latestLogs.map(l => l.id));
      }
    } catch {}
  }
}

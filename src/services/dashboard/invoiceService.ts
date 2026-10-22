import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { monthBounds } from '@/lib/invoice-report-filters';
import { readDepositLink, DEPOSIT_LINK_PREFIX, type DepositLink } from '@/lib/deposit-links';

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
  description?: string;
  serial_no?: string;
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
  entitle?: string;
  served_by?: string;
  /** CRM Cosmo ID typed in Invoice Management. Wins over the POS customerCode. */
  crm_cosmo_id?: string;
  /** Where served_by came from: typed in Invoice Management, or the POS "inCharge" field. */
  served_by_source?: 'manual' | 'pos';
  payment_splits?: unknown;
  updated_by?: string;
  updated_at?: string;
}

export interface InvoiceHeader {
  depositLinks?: DepositLink[];
  trans_no: string;
  transaction_date: string;
  customer: string;
  /** CRM Cosmo customer code from the POS (customerCode); empty until the POS sends it. Read via crmCosmoId(). */
  crm_cosmo: string;
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

export async function getInvoices(month: string, year: number, db: SupabaseClient = supabase): Promise<InvoiceHeader[]> {
  const monthIndex = MONTHS.indexOf(month);
  const { start, end } = monthBounds(monthIndex + 1, year);
  // Use an exclusive month end and page through every source. Supabase's default
  // row limit must never silently truncate invoices or their line items.
  const [rawItems, salesData, metaData] = await Promise.all([
    fetchAllRows((from, to) => db.from('clean_master')
      .select('id, trans_no, transaction_date, customer, salesman, location, main_category, collection, sap_code, catalogue_code, gross_sales, val_disc, disc_pct, net_sales, qty, cost, comm, type, in_charge, customer_code')
      .gte('transaction_date', start).lt('transaction_date', end)
      .order('id', { ascending: true }).range(from, to)),
    fetchAllRows((from, to) => db.from('bvlgari_sales')
      .select('id, transaction_no, collection, phone_no, sap_code, catalogue_code, description')
      .gte('transaction_date', start).lt('transaction_date', end)
      .order('id', { ascending: true }).range(from, to)),
    fetchAllRows((from, to) => db.from('transaction_records_meta').select('*')
      .order('trans_no', { ascending: true }).range(from, to)),
  ]);

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

  const rawItemMap = new Map<string, { serial_no: string; description: string }[]>();
  for (const row of salesData) {
    const key = JSON.stringify([String(row.transaction_no), String(row.sap_code || ''), String(row.catalogue_code || '')]);
    const matches = rawItemMap.get(key) || [];
    // Serial numbers are not supplied by the current sync schema.
    matches.push({ serial_no: '', description: row.description || '' });
    rawItemMap.set(key, matches);
  }

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
        entitle: m.entitle || '',
        served_by: m.served_by || '',
        crm_cosmo_id: m.crm_cosmo_id || '',
        payment_splits: m.payment_splits,
        updated_by: m.updated_by || '',
        updated_at: m.updated_at || '',
      });
    }
  });

  const depositLinks = metaData.filter(row => row.trans_no?.startsWith(DEPOSIT_LINK_PREFIX)).map(row => {
    const link = readDepositLink(row);
    if (!link) throw new Error('A saved DP reference could not be read. Please contact your administrator.');
    return link;
  });

  // Group clean_master rows by trans_no
  const groupMap = new Map<string, {
    trans_no: string;
    transaction_date: string;
    customer: string;
    salesman: string;
    location: string;
    in_charge: string;
    crm_cosmo: string;
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
        in_charge: '',
        crm_cosmo: '',
        items: [],
      });
    }
    const group = groupMap.get(tNo)!;
    if (!group.in_charge && r.in_charge?.trim()) group.in_charge = r.in_charge.trim();
    if (!group.crm_cosmo && r.customer_code?.trim()) group.crm_cosmo = r.customer_code.trim();

    const extra = salesMap.get(tNo) ?? { collection_code: '', phone_no: '' };
    const rawExtra = rawItemMap.get(JSON.stringify([String(tNo), String(r.sap_code || ''), String(r.catalogue_code || '')]))?.shift();
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
      serial_no: rawExtra?.serial_no || '',
      description: rawExtra?.description || '',
      qty: r.qty ?? 0,
      gross_sales: r.gross_sales || 0,
      val_disc: r.val_disc || 0,
      disc_pct: r.disc_pct || 0,
      net_sales: r.net_sales || 0,
      comm: r.comm || 0,
      type: r.type || 'Regular',
    });
  });

  // A Served By typed in Invoice Management always wins; the POS inCharge only fills a blank one.
  const withServedBy = (meta: InvoiceMeta, inCharge: string): InvoiceMeta => {
    if (meta.served_by?.trim()) return { ...meta, served_by_source: 'manual' };
    return inCharge ? { ...meta, served_by: inCharge, served_by_source: 'pos' } : meta;
  };

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
      depositLinks: depositLinks.filter(link => link.invoiceNo === tNo),
      transaction_date: grp.transaction_date,
      customer: grp.customer,
      crm_cosmo: grp.crm_cosmo,
      salesman: grp.salesman,
      location: grp.location,
      item_count: grp.items.length,
      total_qty: totalQty,
      total_gross: totalGross,
      total_disc: totalDisc,
      total_net: totalNet,
      total_comm: totalComm,
      meta: withServedBy(metaMap.get(tNo) || defaultMeta, grp.in_charge),
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

// ── Entitle dropdown: active Customer Advisors (managed in Setup & Targets) ──

export interface EntitleAdvisor {
  name: string;
  home_location: string;
}

export async function getEntitleAdvisors(): Promise<EntitleAdvisor[]> {
  const { data, error } = await supabase
    .from('advisors')
    .select('name, home_location')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map((a: any) => ({ name: a.name, home_location: a.home_location || '' }));
}

export async function updateInvoiceLocation(
  trans_no: string,
  newLocation: string,
  userEmail?: string
) {
  const references = await fetchAllRows((from, to) => supabase.from('transaction_records_meta').select('trans_no,other_remarks')
    .like('trans_no', `${DEPOSIT_LINK_PREFIX.replaceAll('_', '\\_')}%`).order('trans_no').range(from, to));
  if (references.some(row => readDepositLink(row)?.invoiceNo === trans_no)) throw new Error('Remove linked DP references before changing the invoice store.');
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
  const references = await fetchAllRows((from, to) => supabase.from('transaction_records_meta').select('trans_no,other_remarks')
    .like('trans_no', `${DEPOSIT_LINK_PREFIX.replaceAll('_', '\\_')}%`).order('trans_no').range(from, to));
  if (references.some(row => readDepositLink(row)?.invoiceNo === trans_no)) throw new Error('Remove the linked DP references before deleting this invoice.');
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

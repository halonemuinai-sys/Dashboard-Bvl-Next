import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { monthBounds } from '@/lib/invoice-report-filters';
import { normalizeReportStore } from '@/lib/report-attribution';

export interface AdvisorMetrics {
  advisor: string; store: string; totalNetSales: number; totalQty: number; totalInvoices: number;
  newCustomerSales: number; newCustomerCount: number; pctNewSales: number;
  existingCustomerSales: number; existingCustomerCount: number; pctExistingSales: number;
  atv: number; upt: number; walkIn: number; followUp: number;
}
export interface DetailTransaction {
  date: string; transNo: string; customer: string; phone: string; advisor: string;
  store: string; category: string; collection: string; qty: number; netSales: number;
  customerType: 'NEW' | 'EXISTING';
}
interface Traffic { customer_advisor: string; location: string; status: string; akses_masuk: string }
export function aggregateProductivity(details: DetailTransaction[], traffic: Traffic[]): AdvisorMetrics[] {
  const key = (store: string, advisor: string) => JSON.stringify([normalizeReportStore(store), advisor.trim().toLowerCase()]);
  const visits = new Map<string, { walkIn: number; followUp: number }>();
  const statusKey = (value: string) => {
    const text = (value || '').toLowerCase().replace(/\u00a0/g, ' ');
    if (['walk in', 'walk-in', 'walkin'].some(part => text.includes(part))) return 'walkIn';
    if (['follow up', 'follow-up', 'followup'].some(part => text.includes(part))) return 'followUp';
    return null;
  };
  for (const row of traffic) {
    if (!row.customer_advisor?.trim()) continue;
    const id = key(row.location, row.customer_advisor);
    const counts = visits.get(id) || { walkIn: 0, followUp: 0 };
    const status = statusKey(row.status) || statusKey(row.akses_masuk);
    if (status) counts[status]++;
    visits.set(id, counts);
  }
  const groups = new Map<string, { metrics: AdvisorMetrics; invoices: Set<string>; newCustomers: Set<string>; existing: Set<string> }>();
  for (const row of details) {
    const id = key(row.store, row.advisor);
    if (!groups.has(id)) groups.set(id, { metrics: {
      advisor: row.advisor, store: normalizeReportStore(row.store), totalNetSales: 0, totalQty: 0, totalInvoices: 0,
      newCustomerSales: 0, newCustomerCount: 0, pctNewSales: 0, existingCustomerSales: 0,
      existingCustomerCount: 0, pctExistingSales: 0, atv: 0, upt: 0, ...(visits.get(id) || { walkIn: 0, followUp: 0 }),
    }, invoices: new Set(), newCustomers: new Set(), existing: new Set() });
    const group = groups.get(id)!;
    group.metrics.totalNetSales += row.netSales;
    group.metrics.totalQty += row.qty;
    group.invoices.add(row.transNo);
    const customer = row.phone && row.phone !== '—' ? row.phone : row.customer;
    if (row.customerType === 'NEW') { group.metrics.newCustomerSales += row.netSales; group.newCustomers.add(customer); }
    else { group.metrics.existingCustomerSales += row.netSales; group.existing.add(customer); }
  }
  return [...groups.values()].map(({ metrics: m, invoices, newCustomers, existing }) => ({
    ...m, totalInvoices: invoices.size, newCustomerCount: newCustomers.size, existingCustomerCount: existing.size,
    pctNewSales: m.totalNetSales > 0 ? m.newCustomerSales / m.totalNetSales * 100 : 0,
    pctExistingSales: m.totalNetSales > 0 ? m.existingCustomerSales / m.totalNetSales * 100 : 0,
    atv: invoices.size ? m.totalNetSales / invoices.size : 0, upt: invoices.size ? m.totalQty / invoices.size : 0,
  })).sort((a, b) => b.totalNetSales - a.totalNetSales);
}
export async function getAdvisorProductivity(month: number, year: number, db: SupabaseClient = supabase, store = 'ALL') {
  const { start, end } = monthBounds(month, year);
  const [rows, phones, customers, traffic] = await Promise.all([
    fetchAllRows((from, to) => db.from('clean_master').select('id,trans_no,transaction_date,customer,salesman,location,main_category,collection,qty,net_sales').gte('transaction_date', start).lt('transaction_date', end).order('id').range(from, to)),
    fetchAllRows((from, to) => db.from('bvlgari_sales').select('id,transaction_no,phone_no').gte('transaction_date', start).lt('transaction_date', end).order('id').range(from, to)),
    fetchAllRows((from, to) => db.from('customer_master').select('phone_no,first_txn_date').order('phone_no').range(from, to)),
    fetchAllRows((from, to) => db.from('mirror_traffic').select('id,customer_advisor,location,status,akses_masuk').gte('transaction_date', start).lt('transaction_date', end).order('id').range(from, to)),
  ]);
  const phoneMap = new Map(phones.filter(row => row.phone_no).map(row => [row.transaction_no, row.phone_no.trim() as string]));
  const masterMap = new Map(customers.filter(row => row.phone_no).map(row => [row.phone_no.trim(), row.first_txn_date as string]));
  const details: DetailTransaction[] = rows.filter(row => store === 'ALL' || normalizeReportStore(row.location) === normalizeReportStore(store)).map(row => {
    const phone = phoneMap.get(row.trans_no) || '';
    const first = masterMap.get(phone);
    return { date: row.transaction_date?.slice(0, 10) || '', transNo: row.trans_no || '', customer: row.customer?.trim() || 'Unknown Customer', phone: phone || '—',
      advisor: row.salesman || 'Unassigned', store: normalizeReportStore(row.location || 'Unknown Store'), category: row.main_category || 'General', collection: row.collection || '',
      qty: Number(row.qty ?? 0), netSales: Number(row.net_sales ?? 0), customerType: first && first < start ? 'EXISTING' : 'NEW' };
  });
  return { details, metrics: aggregateProductivity(details, traffic as Traffic[]) };
}

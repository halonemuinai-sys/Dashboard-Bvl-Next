import { buildClientelingData, clientelingSnapshot } from '@/lib/clienteling';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { supabase } from '@/lib/supabase';
import type { CrmProfilingRow } from './types';
import { profilePageRange, profileDirectoryFilter, profilePhotoSummary, type ProfilePhotoFilter } from '@/lib/crm-profiling-query';

function profileQuery(search: string, store: string, count = false, photo: ProfilePhotoFilter = 'all', head = false) {
  let query = supabase.from('crm_profiling')
    .select(head ? 'id' : '*', count ? { count: 'exact', head } : {})
    .order('created_at', { ascending: false }).order('id', { ascending: false });
  const filter = profileDirectoryFilter(search, photo);
  if (filter) query = query.or(filter);
  if (store) query = query.ilike('lokasi_store', `%${store.replace(/[\\%_]/g, '\\$&')}%`);
  return query;
}

export async function getCrmProfilingPage(search: string, store: string, page: number, signal: AbortSignal, photo: ProfilePhotoFilter = 'all') {
  const { from, to } = profilePageRange(page);
  const { data, count, error } = await profileQuery(search, store, true, photo).range(from, to).abortSignal(signal);
  if (error) throw error;
  return { rows: (data || []) as CrmProfilingRow[], total: count ?? 0 };
}

export async function getCrmProfilingSummary(search: string, store: string, signal: AbortSignal) {
  const [all, missing] = await Promise.all([
    profileQuery(search, store, true, 'all', true).abortSignal(signal),
    profileQuery(search, store, true, 'missing', true).abortSignal(signal),
  ]);
  if (all.error || missing.error) throw all.error || missing.error;
  return profilePhotoSummary(all.count ?? 0, missing.count ?? 0);
}

export async function exportCrmProfiling(search: string, store: string, photo: ProfilePhotoFilter = 'all') {
  return fetchAllRows<CrmProfilingRow>((from, to) => profileQuery(search, store, false, photo).range(from, to));
}

export async function getCrmProfiling(search = '', store = ''): Promise<CrmProfilingRow[]> {
  let q = supabase.from('crm_profiling').select('*').order('created_at', { ascending: false });
  if (store) q = q.eq('lokasi_store', store);
  if (search) {
    q = q.or(
      `nama_lengkap.ilike.%${search}%,no_hp.ilike.%${search}%,customer_advisor.ilike.%${search}%,nama_panggilan.ilike.%${search}%`
    );
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as CrmProfilingRow[];
}

export async function getEventSellingPlan(profile: CrmProfilingRow) {
  const name = profile.nama_lengkap || `${profile.nama_depan} ${profile.nama_belakang}`.trim();
  const { data, error } = await supabase
    .from('clean_master')
    .select('trans_no,transaction_date,customer,location,net_sales,gross_sales,sap_code,collection,main_category,qty,catalogue_code')
    .ilike('customer', `%${name}%`)
    .order('net_sales', { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data || []) as {
    trans_no: string; transaction_date: string; customer: string;
    location: string; net_sales: number; gross_sales: number;
    sap_code: string; collection: string; main_category: string;
    qty: number; catalogue_code: string;
  }[];
}

export async function getClientelingData(year: number) {
  const now = new Date();
  const asOf = clientelingSnapshot(year, now);
  const end = new Date(Date.parse(asOf + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
  const rows = await fetchAllRows((from, to) => supabase.from('clean_master')
    .select('id,customer,customer_code,transaction_date,net_sales,trans_no,location')
    .lt('transaction_date', end).order('id').range(from, to));
  return buildClientelingData(rows, year, now);
}

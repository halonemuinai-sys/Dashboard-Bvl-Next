// Single client entry point for "Sync to API". The Bvlgari API needs a server-only
// token and is plain HTTP, so the browser must never call it directly: every Sync
// button goes through the server route, which pulls sales, DP and SVC in one pass
// (bvlgari_sales gets everything, clean_master excludes DPS/SVC/PACK/RB).
export interface SalesSyncResult {
  success: boolean;
  rawInserted: number;
  normalizedInserted: number;
  skippedDuplicates: number;
  error?: string;
}

export async function runSalesSync(month: number, year: number): Promise<SalesSyncResult> {
  const res = await fetch(`/api/cron/sync-sales?month=${month}&year=${year}`, { method: 'POST' });
  let data: Partial<SalesSyncResult> = {};
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok || !data.success) {
    return { success: false, rawInserted: 0, normalizedInserted: 0, skippedDuplicates: 0, error: data.error || `Sync gagal (HTTP ${res.status}).` };
  }
  return {
    success: true,
    rawInserted: data.rawInserted ?? 0,
    normalizedInserted: data.normalizedInserted ?? 0,
    skippedDuplicates: data.skippedDuplicates ?? 0,
  };
}

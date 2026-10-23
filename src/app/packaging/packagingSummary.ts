import { supabase } from '@/lib/supabase';

export const SUMMARY_STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali', 'Head Office'] as const;
const STOCK_STORES: { code: string; name: string }[] = [
  { code: 'PI', name: 'Plaza Indonesia' }, { code: 'PS', name: 'Plaza Senayan' }, { code: 'BL', name: 'Bali' },
];

export interface StoreStock { store: string; date: string; qty: Map<string, number> }
export interface SummaryLine { sap_code: string | null; item: string; store: string; qty: number | null; transaction_no: string }
export type StockStatus = 'out' | 'low' | 'ok' | 'unknown';
export interface SapSummary {
  sap: string;
  item: string;
  out: number;
  outByStore: Record<string, number>;
  invoices: number;
  stock: number | null;
  status: StockStatus;
}

/** Latest saved stock snapshot of packaging items for each boutique (Inventory Valuation). */
export async function loadLatestPackagingStock(): Promise<StoreStock[]> {
  const result: StoreStock[] = [];
  for (const { code, name } of STOCK_STORES) {
    const { data: latest, error } = await supabase.from('inventory_valuation').select('snapshot_date')
      .eq('location_code', code).order('snapshot_date', { ascending: false }).limit(1);
    if (error) throw new Error(error.message);
    const date = latest?.[0]?.snapshot_date;
    if (!date) continue;
    const { data: rows, error: rowsError } = await supabase.from('inventory_valuation').select('item_sku,qoh')
      .eq('location_code', code).eq('snapshot_date', date).or('collection_code.ilike.PACK%,main_category.ilike.PACK%');
    if (rowsError) throw new Error(rowsError.message);
    const qty = new Map<string, number>();
    (rows || []).forEach(row => { const sku = String(row.item_sku || '').trim(); if (sku) qty.set(sku, (qty.get(sku) || 0) + (Number(row.qoh) || 0)); });
    result.push({ store: name, date, qty });
  }
  return result;
}

/**
 * Units issued per SAP code next to the latest stock. Stock covers only the boutiques in scope;
 * "low" means the stock left is below what went out in the selected period.
 */
export function summarizeBySap(lines: SummaryLine[], stock: StoreStock[], scopeStores: string[]): SapSummary[] {
  const groups = new Map<string, { sap: string; item: string; out: number; outByStore: Record<string, number>; invoices: Set<string> }>();
  for (const line of lines) {
    const sap = (line.sap_code || '').trim() || '—';
    const group = groups.get(sap) || { sap, item: line.item, out: 0, outByStore: {}, invoices: new Set<string>() };
    const qty = Number(line.qty) || 0;
    group.out += qty;
    group.outByStore[line.store] = (group.outByStore[line.store] || 0) + qty;
    group.invoices.add(line.transaction_no);
    groups.set(sap, group);
  }
  const inScope = stock.filter(s => scopeStores.includes(s.store));
  return [...groups.values()].map(group => {
    const stockQty = inScope.length ? inScope.reduce((sum, s) => sum + (s.qty.get(group.sap) || 0), 0) : null;
    const status: StockStatus = stockQty === null ? 'unknown' : stockQty <= 0 ? 'out' : stockQty < group.out ? 'low' : 'ok';
    return { sap: group.sap, item: group.item, out: group.out, outByStore: group.outByStore, invoices: group.invoices.size, stock: stockQty, status };
  });
}

// Stock opname logic shared by the server actions and tests (no database access here).

export const OPNAME_STORES: { code: string; name: string }[] = [
  { code: 'PI', name: 'Plaza Indonesia' },
  { code: 'PS', name: 'Plaza Senayan' },
  { code: 'BL', name: 'Bali' },
];

export interface StockRow { item_code: string | null; item_sku: string | null; description: string | null; main_category: string | null; qoh: number | null }
export interface SaleRow { case_no: string | null; sap_code: string | null; qty: number | null; collection: string | null }
export interface OpnameLine {
  id?: number;
  item_code: string;
  item_sku: string | null;
  description: string | null;
  category: string | null;
  serialised: boolean;
  snapshot_qty: number;
  out_qty: number;
  system_qty: number;
  counted_qty: number | null;
  unexpected: boolean;
  note?: string | null;
}
export type LineStatus = 'pending' | 'match' | 'short' | 'over' | 'unexpected';

const clean = (value: string | null | undefined) => (value || '').trim();

/**
 * One opname line per stock row of the chosen categories. Serialised items (serial number differs
 * from the SAP code) are counted one by one; other stock is counted per SAP code. Sales since the
 * snapshot date are deducted: by serial number when it matches, otherwise by SAP code.
 */
export function buildOpnameLines(stock: StockRow[], salesSinceSnapshot: SaleRow[], categories: string[]): OpnameLine[] {
  const wanted = new Set(categories.map(c => c.toUpperCase()));
  const lines = new Map<string, OpnameLine>();
  for (const row of stock) {
    const category = clean(row.main_category);
    if (wanted.size && !wanted.has(category.toUpperCase())) continue;
    const code = clean(row.item_code) || clean(row.item_sku);
    if (!code) continue;
    const sku = clean(row.item_sku) || null;
    const existing = lines.get(code);
    const qty = Number(row.qoh) || 0;
    if (existing) { existing.snapshot_qty += qty; continue; }
    lines.set(code, { item_code: code, item_sku: sku, description: clean(row.description) || null, category: category || null, serialised: Boolean(sku && sku !== code), snapshot_qty: qty, out_qty: 0, system_qty: 0, counted_qty: null, unexpected: false });
  }
  const bySerial = lines;
  const bySku = new Map<string, OpnameLine>();
  for (const line of lines.values()) if (!line.serialised && line.item_sku) bySku.set(line.item_sku, line);
  for (const sale of salesSinceSnapshot) {
    const collection = clean(sale.collection).toUpperCase();
    if (collection === 'DPS' || collection === 'SVC') continue; // deposits and services hold no stock
    const qty = Number(sale.qty) || 0;
    const line = bySerial.get(clean(sale.case_no)) || bySku.get(clean(sale.sap_code));
    if (line) line.out_qty += qty;
  }
  for (const line of lines.values()) line.system_qty = Math.max(0, line.snapshot_qty - line.out_qty);
  return [...lines.values()];
}

export function lineStatus(line: Pick<OpnameLine, 'counted_qty' | 'system_qty' | 'unexpected'>): LineStatus {
  if (line.unexpected) return 'unexpected';
  if (line.counted_qty === null || line.counted_qty === undefined) return 'pending';
  if (line.counted_qty === line.system_qty) return 'match';
  return line.counted_qty < line.system_qty ? 'short' : 'over';
}

/** What a scanned barcode does: count a serial, add one to a SAP line, or report a problem. */
export type ScanResult =
  | { kind: 'serial'; line: OpnameLine }
  | { kind: 'increment'; line: OpnameLine }
  | { kind: 'already'; line: OpnameLine }
  | { kind: 'ambiguous'; sku: string }
  | { kind: 'unknown'; code: string };

export function resolveScan(lines: OpnameLine[], rawCode: string): ScanResult {
  const code = clean(rawCode);
  const exact = lines.find(line => line.item_code.toUpperCase() === code.toUpperCase());
  if (exact) {
    if (!exact.serialised) return { kind: 'increment', line: exact };
    return (exact.counted_qty ?? 0) >= 1 ? { kind: 'already', line: exact } : { kind: 'serial', line: exact };
  }
  // A SAP code scanned for serialised stock cannot say which piece it is.
  if (lines.some(line => line.serialised && clean(line.item_sku).toUpperCase() === code.toUpperCase())) return { kind: 'ambiguous', sku: code };
  return { kind: 'unknown', code };
}

export function summarizeOpname(lines: Pick<OpnameLine, 'counted_qty' | 'system_qty' | 'unexpected'>[]) {
  let counted = 0, short = 0, over = 0, match = 0, systemUnits = 0, countedUnits = 0;
  for (const line of lines) {
    systemUnits += line.system_qty;
    if (line.counted_qty === null || line.counted_qty === undefined) continue;
    counted++;
    countedUnits += line.counted_qty;
    const diff = line.counted_qty - line.system_qty;
    if (diff < 0) short += -diff; else if (diff > 0) over += diff; else match++;
  }
  return { total: lines.length, counted, short, over, match, systemUnits, countedUnits };
}

// One metadata record per DP transaction. The existing unique trans_no key makes
// reservation atomic: two invoices cannot claim the same DP concurrently.
export const DEPOSIT_LINK_PREFIX = '__DP_SALES_LINK__:';
export const depositLinkKey = (transNo: string) => `${DEPOSIT_LINK_PREFIX}${transNo}`;
// Inclusive rolling 12 calendar months, anchored to the sales invoice date.
export function isDepositWithinInvoicePeriod(depositDate: string, invoiceDate: string): boolean {
  const day = (value: string) => {
    const date = typeof value === 'string' ? value.slice(0, 10) : '';
    const parsed = new Date(`${date}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
  };
  const end = day(invoiceDate);
  const deposit = day(depositDate);
  if (!end || !deposit) return false;
  const endDate = new Date(`${end}T00:00:00Z`);
  const year = endDate.getUTCFullYear() - 1;
  const month = endDate.getUTCMonth();
  // February 29 maps to February 28 when the prior year is not a leap year.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const start = new Date(Date.UTC(year, month, Math.min(endDate.getUTCDate(), lastDay))).toISOString().slice(0, 10);
  return deposit >= start && deposit <= end;
}
export interface DepositSourceRow {
  id: number; transaction_no: string; transaction_date: string; customer_name: string;
  salesman: string; location: string; collection: string; qty: number; price: number;
  sub_total_discount: number; net_sales: number;
}
export interface SalesDeposit {
  transNo: string; date: string; customer: string; salesman: string; location: string;
  amount: number; netSales: number; sourceIds: number[];
}
export interface DepositLink extends SalesDeposit {
  kind: 'sales_deposit_link'; version: 1; invoiceNo: string; invoiceDate: string;
  linkedAt: string; linkedBy: string;
}
export function isSalesDeposit(row: DepositSourceRow) {
  return row.collection?.trim().toUpperCase() === 'DPS'
    && !row.location?.trim().toUpperCase().startsWith('RB')
    && !/^SI-RB/i.test(row.transaction_no || '')
    && Number.isFinite(Number(row.qty)) && Number(row.qty) > 0
    && Number.isFinite(Number(row.price)) && Number.isFinite(Number(row.sub_total_discount ?? 0))
    && Number(row.qty) * Number(row.price) - Number(row.sub_total_discount ?? 0) > 0;
}
export function groupSalesDeposits(rows: DepositSourceRow[]): SalesDeposit[] {
  const groups = new Map<string, DepositSourceRow[]>();
  for (const row of rows) if (row.transaction_no) groups.set(row.transaction_no, [...(groups.get(row.transaction_no) || []), row]);
  return [...groups.entries()].flatMap(([transNo, items]) => {
    if (!items.every(isSalesDeposit) || new Set(items.map(item => item.location)).size !== 1) return [];
    const first = items[0];
    return [{ transNo, date: first.transaction_date, customer: first.customer_name || '', salesman: first.salesman || '', location: first.location,
      amount: items.reduce((sum, row) => sum + Number(row.qty) * Number(row.price) - Number(row.sub_total_discount ?? 0), 0),
      netSales: items.reduce((sum, row) => sum + Number(row.net_sales ?? 0), 0), sourceIds: items.map(row => row.id) }];
  });
}
export function readDepositLink(row: { trans_no: string; other_remarks?: string | null }): DepositLink | null {
  if (!row.trans_no.startsWith(DEPOSIT_LINK_PREFIX)) return null;
  try {
    const value = JSON.parse(row.other_remarks || '') as DepositLink;
    if (value.kind !== 'sales_deposit_link' || value.version !== 1 || typeof value.transNo !== 'string' || row.trans_no !== depositLinkKey(value.transNo)
      || typeof value.invoiceNo !== 'string' || !value.invoiceNo || typeof value.amount !== 'number' || !Number.isFinite(value.amount) || value.amount <= 0
      || ![value.invoiceDate, value.date, value.customer, value.salesman, value.location, value.linkedAt, value.linkedBy].every(field => typeof field === 'string')
      || !/^\d{4}-\d{2}-\d{2}/.test(value.date) || !/^\d{4}-\d{2}-\d{2}/.test(value.invoiceDate)
      || !Array.isArray(value.sourceIds) || !value.sourceIds.length || !value.sourceIds.every(Number.isSafeInteger)) return null;
    return value;
  } catch { return null; }
}

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
export interface DepositSearchMatch extends SalesDeposit {
  customerMatch: number | null;
  matchKind: 'invoice' | 'customer' | 'advisor' | null;
}

function normalizeCustomerName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter(token => token && !['mr', 'mrs', 'ms', 'miss', 'bapak', 'ibu', 'pak', 'bu', 'dr'].includes(token)).join(' ');
}

// A name similarity score, never an identity check or permission to claim a DP.
export function customerNameSimilarity(left: string, right: string): number {
  const a = normalizeCustomerName(left);
  const b = normalizeCustomerName(right);
  const generic = new Set(['walk in', 'walk in guest', 'walkin', 'walkin guest', 'guest', 'customer', 'cash', 'unknown', 'na', 'n a']);
  if (!a || !b || generic.has(a) || generic.has(b)) return 0;
  if (a === b) return 100;
  if (Math.min(a.length, b.length) < 4) return 0;
  const sortedA = a.split(' ').sort().join(' ');
  const sortedB = b.split(' ').sort().join(' ');
  if (sortedA === sortedB) return 100;
  const similarity = (first: string, second: string) => {
    let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
    for (let i = 1; i <= first.length; i++) {
      const current = [i];
      for (let j = 1; j <= second.length; j++) {
        current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (first[i - 1] === second[j - 1] ? 0 : 1));
      }
      previous = current;
    }
    return 1 - previous[second.length] / Math.max(first.length, second.length);
  };
  return Math.round(100 * Math.max(similarity(a, b), similarity(sortedA, sortedB)));
}

export function rankSalesDeposits(deposits: SalesDeposit[], search: string, invoiceCustomer: string): DepositSearchMatch[] {
  const query = search.trim().toLowerCase();
  const normalizedQuery = normalizeCustomerName(query);
  const matches = deposits.flatMap(dp => {
    const score = customerNameSimilarity(query || invoiceCustomer, dp.customer);
    const customerMatch = score >= 80 ? score : null;
    const nameContainsQuery = Boolean(query && normalizedQuery && normalizeCustomerName(dp.customer).includes(normalizedQuery));
    const matchKind: DepositSearchMatch['matchKind'] = query && dp.transNo.toLowerCase().includes(query) ? 'invoice'
      : customerMatch !== null || nameContainsQuery ? 'customer'
      : query && dp.salesman.toLowerCase().includes(query) ? 'advisor' : null;
    if (query && !matchKind) return [];
    return [{ ...dp, customerMatch, matchKind }];
  });
  const priority = (dp: DepositSearchMatch) => dp.matchKind === 'invoice' ? 3 : dp.matchKind === 'customer' ? 2 : dp.matchKind === 'advisor' ? 1 : 0;
  return matches.sort((a, b) => priority(b) - priority(a) || (b.customerMatch || 0) - (a.customerMatch || 0)
    || b.date.localeCompare(a.date) || a.transNo.localeCompare(b.transNo));
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

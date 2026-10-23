import type { InvoiceHeader, InvoiceItem } from './dashboard/invoiceService';
import { advisorHomeResolver, isReportCrossing, normalizeReportStore, reportSalesType, type AdvisorHome, type AdvisorRotation } from '@/lib/report-attribution';

export interface ReportLine { invoice: InvoiceHeader; item: InvoiceItem; store: string; home: string; crossing: boolean; type: 'Regular' | 'SMI' }
export interface SalesTotals { net: number; regular: number; smi: number; qty: number }
export interface CrossingFlow extends SalesTotals { home: string; store: string; direction: string }
export interface DpServiceRow {
  id: number; transaction_no: string; transaction_date: string; customer_name: string; salesman: string; location: string;
  collection: string; sap_code: string; catalogue_code: string; price: number; qty: number; sub_total_discount: number;
  net_sales: number; card_comm: number; type: string; description?: string;
}
export const sumReportLines = (lines: ReportLine[]): SalesTotals => lines.reduce((sum, { item, type }) => ({
  net: sum.net + Number(item.net_sales), regular: sum.regular + (type === 'Regular' ? Number(item.net_sales) : 0),
  smi: sum.smi + (type === 'SMI' ? Number(item.net_sales) : 0), qty: sum.qty + Number(item.qty),
}), { net: 0, regular: 0, smi: 0, qty: 0 });

export function buildStoreReportData(invoices: InvoiceHeader[], advisors: AdvisorHome[], rotations: AdvisorRotation[], store = 'ALL') {
  const selected = normalizeReportStore(store);
  const resolveHome = advisorHomeResolver(advisors, rotations);
  // Deposit, service and packaging records have their own meaning; never add
  // them to merchandise sales, even if imported into clean_master.
  const salesInvoices = invoices.map(invoice => ({ ...invoice, items: invoice.items.filter(item =>
    !['DPS', 'SVC', 'PACK'].includes((item.collection || '').trim().toUpperCase()) && !['DPS', 'SVC', 'PACK', 'PACKAGING'].includes((item.main_category || '').trim().toUpperCase()))
  })).filter(invoice => invoice.items.length);
  const lines: ReportLine[] = salesInvoices.flatMap(invoice => invoice.items.map(item => {
    const physical = normalizeReportStore(invoice.location);
    const home = resolveHome(invoice.salesman, physical);
    return { invoice, item, store: physical, home, crossing: isReportCrossing(home, physical), type: reportSalesType(item.type) };
  }));
  const physical = lines.filter(line => selected === 'ALL' || line.store === selected);
  const incoming = lines.filter(line => line.crossing && (selected === 'ALL' || line.store === selected));
  const outgoing = lines.filter(line => line.crossing && (selected === 'ALL' || line.home === selected));
  const p = sumReportLines(physical), i = sumReportLines(incoming), o = sumReportLines(outgoing);
  const local: SalesTotals = { net: p.net - i.net, regular: p.regular - i.regular, smi: p.smi - i.smi, qty: p.qty - i.qty };
  const adjusted: SalesTotals = { net: local.net + o.net, regular: local.regular + o.regular, smi: local.smi + o.smi, qty: local.qty + o.qty };
  const crossLines = lines.filter(line => line.crossing && (selected === 'ALL' || line.home === selected || line.store === selected));
  const grouped = new Map<string, ReportLine[]>();
  for (const line of crossLines) {
    const key = JSON.stringify([line.home, line.store]);
    grouped.set(key, [...(grouped.get(key) || []), line]);
  }
  const flows: CrossingFlow[] = [...grouped.values()].map(group => ({ ...sumReportLines(group), home: group[0].home, store: group[0].store,
    direction: selected === 'ALL' ? 'IN / OUT' : group[0].store === selected ? 'IN' : 'OUT',
  })).sort((a, b) => a.direction.localeCompare(b.direction) || a.home.localeCompare(b.home) || a.store.localeCompare(b.store));
  const categories = new Map<string, ReportLine[]>();
  for (const line of physical) { const category = line.item.main_category || 'Other'; categories.set(category, [...(categories.get(category) || []), line]); }
  return { invoices: salesInvoices.filter(invoice => selected === 'ALL' || normalizeReportStore(invoice.location) === selected),
    physical, incoming, outgoing, flows, categories: [...categories].map(([category, rows]) => ({ category, ...sumReportLines(rows) })),
    totals: { physical: p, incoming: i, outgoing: o, local, adjusted }, store: selected };
}
export type StoreReportData = ReturnType<typeof buildStoreReportData>;

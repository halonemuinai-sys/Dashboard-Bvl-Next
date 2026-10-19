import type { InvoiceHeader } from '@/services/dashboard/invoiceService';

export const INVOICE_FILTER_TYPES = ['all', 'multi', 'single', 'has_cb', 'missing_cb'] as const;
export type InvoiceFilterType = typeof INVOICE_FILTER_TYPES[number];
export interface InvoiceReportFilters { store?: string; search?: string; filterType?: InvoiceFilterType }

export function monthBounds(month: number, year: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('Select a valid month and year.');
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`,
  };
}

export function filterInvoices(invoices: InvoiceHeader[], { store, search = '', filterType = 'all' }: InvoiceReportFilters) {
  const q = search.toLowerCase().trim();
  return invoices.filter(invoice => {
    if (store && store !== 'ALL' && invoice.location !== store) return false;
    if (filterType === 'multi' && invoice.item_count <= 1) return false;
    if (filterType === 'single' && invoice.item_count > 1) return false;
    if (filterType === 'has_cb' && !invoice.meta.cash_bill_no) return false;
    if (filterType === 'missing_cb' && invoice.meta.cash_bill_no) return false;
    return !q || [invoice.trans_no, invoice.customer, invoice.salesman, invoice.meta.cash_bill_no, invoice.meta.dwa_no, invoice.meta.discount_given_reason, invoice.meta.after_sales_support,
      ...invoice.items.flatMap(item => [item.collection, item.catalogue_code, item.sap_code])].some(value => value?.toLowerCase().includes(q));
  });
}

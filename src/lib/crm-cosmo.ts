import type { InvoiceHeader } from '@/services/dashboard/invoiceService';

/** CRM Cosmo ID shown everywhere: the ID typed in Invoice Management first, then the POS customerCode. */
export const crmCosmoId = (invoice: Pick<InvoiceHeader, 'crm_cosmo' | 'meta'>) => invoice.meta.crm_cosmo_id?.trim() || invoice.crm_cosmo || '';

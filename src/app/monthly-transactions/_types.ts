export const PAGE_SIZE = 50;

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export type SortKey = 'transaction_date' | 'net_sales' | 'gross_sales' | 'qty' | 'val_disc';
export type SortDir = 'asc' | 'desc';

export type Row = {
  id: number;
  trans_no: string;
  transaction_date: string;
  customer: string;
  salesman: string;
  location: string;
  main_category: string;
  collection: string;
  sap_code: string;
  catalogue_code: string;
  collection_code: string;
  phone_no: string;
  gross_sales: number;
  val_disc: number;
  disc_pct: number;
  net_sales: number;
  qty: number;
  cost: number;
  comm: number;
  type: string;
};

export type Summary = {
  totalTrans: number;
  totalQty: number;
  totalGross: number;
  totalDisc: number;
  totalNet: number;
};

export const TYPE_COLORS: Record<string, string> = {
  SMI:     'bg-blue-100 text-blue-700',
  Regular: 'bg-slate-100 text-slate-600',
};

import { InvoiceHeader, InvoiceItem } from '@/services/dashboard/invoiceService';

export interface LocationSummary {
  store: string;
  invoicesCount: number;
  qty: number;
  grossSales: number;
  valDisc: number;
  discPct: number;
  physicalNet: number;
  adjustedNet: number;
  netImpact: number;
  sharePct: number;
  atv: number;
}

export interface BoutiqueCrossingStats {
  store: string;
  physical: number;
  adjusted: number;
  impact: number;
  varPct: number;
}

export interface CrossingDetail {
  salesman: string;
  baseLocation: string;
  destinationLocation: string;
  flowLabel: string;
  transNo: string;
  customer: string;
  cashBillNo: string;
  netSales: number;
  qty: number;
  date: string;
}

export interface EnrichedInvoiceHeader extends InvoiceHeader {
  advisorHomeStore: string;
  isCrossing: boolean;
  crossingFlow: string;
}

export interface ReportData {
  month: string;
  year: number;
  invoices: EnrichedInvoiceHeader[];
  locationSummaries: LocationSummary[];
  crossingStats: BoutiqueCrossingStats[];
  crossingDetails: CrossingDetail[];
  totalRetailPhysicalNet: number;
  totalRetailAdjustedNet: number;
  totalRetailGross: number;
  totalRetailDisc: number;
  totalRetailQty: number;
  totalRetailInvoices: number;
}

import { supabase } from '@/lib/supabase';
import { InvoiceHeader } from '@/services/dashboard/invoiceService';
import {
  ReportData,
  LocationSummary,
  BoutiqueCrossingStats,
  CrossingDetail,
  EnrichedInvoiceHeader,
} from './types';
import { downloadBlob } from './styles';
import { buildLocationSheet } from './sheetLocation';
import { buildCrossingSheet } from './sheetCrossing';
import { buildInvoicesSheet } from './sheetInvoices';
import { buildItemsSheet } from './sheetItems';
import { buildComplianceSheet } from './sheetCompliance';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function normalizeStore(loc: string): string {
  const l = (loc || '').trim().toLowerCase();
  if (l === 'plaza indonesia') return 'Plaza Indonesia';
  if (l === 'plaza senayan') return 'Plaza Senayan';
  if (l === 'bali' || l === 'bali boutique') return 'Bali';
  if (l === 'head office' || l === 'ho') return 'Head Office';
  return loc || 'Other';
}

function getStoreAbbr(store: string): string {
  if (store === 'Plaza Indonesia') return 'PI';
  if (store === 'Plaza Senayan') return 'PS';
  if (store === 'Bali') return 'BL';
  if (store === 'Head Office') return 'HO';
  return store.slice(0, 3).toUpperCase();
}

export async function exportInvoiceExecutiveReport(
  invoices: InvoiceHeader[],
  month: string,
  year: number
): Promise<void> {
  const monthIndex = MONTH_NAMES.indexOf(month);

  // 1. Fetch advisor base locations & rotation overrides
  const [{ data: advisorProfiles }, { data: rotationRows }] = await Promise.all([
    supabase.from('advisors').select('name, home_location'),
    supabase
      .from('advisor_rotations')
      .select('advisor_name, assigned_location')
      .eq('year', year)
      .eq('month_number', monthIndex + 1),
  ]);

  const homeLocMap: Record<string, string> = {};
  advisorProfiles?.forEach((p: { name: string; home_location: string }) => {
    if (p.name) homeLocMap[p.name.toLowerCase()] = normalizeStore(p.home_location);
  });

  const rotationMap: Record<string, string> = {};
  rotationRows?.forEach((r: { advisor_name: string; assigned_location: string }) => {
    if (r.advisor_name) rotationMap[r.advisor_name.toLowerCase()] = normalizeStore(r.assigned_location);
  });

  // 2. Enrich Invoices with Home Store & Crossing Flags
  const enrichedInvoices: EnrichedInvoiceHeader[] = invoices.map((inv) => {
    const sName = (inv.salesman || '').trim().toLowerCase();
    const transLoc = normalizeStore(inv.location);
    const homeLoc = rotationMap[sName] || homeLocMap[sName] || transLoc;

    const isCrossing = transLoc.toLowerCase() !== homeLoc.toLowerCase();
    const crossingFlow = isCrossing
      ? `${getStoreAbbr(homeLoc)} ➔ ${getStoreAbbr(transLoc)}`
      : 'Same Store';

    return {
      ...inv,
      location: transLoc,
      advisorHomeStore: homeLoc,
      isCrossing,
      crossingFlow,
    };
  });

  // 3. Compute Location Summaries (Physical vs Adjusted)
  const stores = ['Plaza Indonesia', 'Plaza Senayan', 'Bali', 'Head Office'];
  const storeDataMap: Record<
    string,
    {
      invoicesCount: number;
      qty: number;
      grossSales: number;
      valDisc: number;
      physicalNet: number;
      adjustedNet: number;
    }
  > = {};

  stores.forEach((st) => {
    storeDataMap[st] = {
      invoicesCount: 0,
      qty: 0,
      grossSales: 0,
      valDisc: 0,
      physicalNet: 0,
      adjustedNet: 0,
    };
  });

  let totalRetailPhysicalNet = 0;
  let totalRetailAdjustedNet = 0;
  let totalRetailGross = 0;
  let totalRetailDisc = 0;
  let totalRetailQty = 0;
  let totalRetailInvoices = enrichedInvoices.length;

  enrichedInvoices.forEach((inv) => {
    const tLoc = normalizeStore(inv.location);
    const hLoc = normalizeStore(inv.advisorHomeStore);

    if (!storeDataMap[tLoc]) {
      storeDataMap[tLoc] = {
        invoicesCount: 0,
        qty: 0,
        grossSales: 0,
        valDisc: 0,
        physicalNet: 0,
        adjustedNet: 0,
      };
    }
    if (!storeDataMap[hLoc]) {
      storeDataMap[hLoc] = {
        invoicesCount: 0,
        qty: 0,
        grossSales: 0,
        valDisc: 0,
        physicalNet: 0,
        adjustedNet: 0,
      };
    }

    // Physical attribution
    storeDataMap[tLoc].invoicesCount += 1;
    storeDataMap[tLoc].qty += inv.total_qty;
    storeDataMap[tLoc].grossSales += inv.total_gross;
    storeDataMap[tLoc].valDisc += inv.total_disc;
    storeDataMap[tLoc].physicalNet += inv.total_net;

    // Adjusted attribution (to advisor's home/assigned store)
    storeDataMap[hLoc].adjustedNet += inv.total_net;

    totalRetailPhysicalNet += inv.total_net;
    totalRetailAdjustedNet += inv.total_net;
    totalRetailGross += inv.total_gross;
    totalRetailDisc += inv.total_disc;
    totalRetailQty += inv.total_qty;
  });

  const locationSummaries: LocationSummary[] = Object.keys(storeDataMap)
    .filter((st) => storeDataMap[st].physicalNet > 0 || storeDataMap[st].adjustedNet > 0 || stores.includes(st))
    .map((st) => {
      const d = storeDataMap[st];
      const netImpact = d.adjustedNet - d.physicalNet;
      const sharePct = totalRetailPhysicalNet > 0 ? (d.physicalNet / totalRetailPhysicalNet) * 100 : 0;
      const discPct = d.grossSales > 0 ? (d.valDisc / d.grossSales) * 100 : 0;
      const atv = d.invoicesCount > 0 ? d.physicalNet / d.invoicesCount : 0;

      return {
        store: st,
        invoicesCount: d.invoicesCount,
        qty: d.qty,
        grossSales: d.grossSales,
        valDisc: d.valDisc,
        discPct,
        physicalNet: d.physicalNet,
        adjustedNet: d.adjustedNet,
        netImpact,
        sharePct,
        atv,
      };
    })
    .sort((a, b) => b.physicalNet - a.physicalNet);

  // 4. Compute Boutique Crossing Stats & Crossing Details
  const crossingStats: BoutiqueCrossingStats[] = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'].map((st) => {
    const d = storeDataMap[st] || { physicalNet: 0, adjustedNet: 0 };
    const impact = d.adjustedNet - d.physicalNet;
    const varPct = d.physicalNet > 0 ? (impact / d.physicalNet) * 100 : 0;

    return {
      store: st,
      physical: d.physicalNet,
      adjusted: d.adjustedNet,
      impact,
      varPct,
    };
  });

  const crossingDetails: CrossingDetail[] = [];
  enrichedInvoices.forEach((inv) => {
    if (inv.isCrossing) {
      crossingDetails.push({
        salesman: inv.salesman,
        baseLocation: inv.advisorHomeStore,
        destinationLocation: inv.location,
        flowLabel: inv.crossingFlow,
        transNo: inv.trans_no,
        customer: inv.customer,
        cashBillNo: inv.meta.cash_bill_no,
        netSales: inv.total_net,
        qty: inv.total_qty,
        date: inv.transaction_date ? inv.transaction_date.slice(0, 10) : '',
      });
    }
  });

  const reportData: ReportData = {
    month,
    year,
    invoices: enrichedInvoices,
    locationSummaries,
    crossingStats,
    crossingDetails,
    totalRetailPhysicalNet,
    totalRetailAdjustedNet,
    totalRetailGross,
    totalRetailDisc,
    totalRetailQty,
    totalRetailInvoices,
  };

  // 5. Generate Excel Workbook using ExcelJS
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MRA Retail BI — Bvlgari Intelligence';
  wb.created = new Date();

  buildLocationSheet(wb, reportData);
  buildCrossingSheet(wb, reportData);
  buildInvoicesSheet(wb, reportData);
  buildItemsSheet(wb, reportData);
  buildComplianceSheet(wb, reportData);

  // 6. Write Buffer & Download
  const buffer = await wb.xlsx.writeBuffer();
  const filename = `BVLGARI_Executive_Invoice_Report_${month}_${year}.xlsx`;
  downloadBlob(buffer, filename);
}

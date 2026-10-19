import ExcelJS from 'exceljs';
import { populateStoreSummary } from './storeDailySummary';
import { buildDailySalesWorkbook, type CrmReportProfile } from './dailyReportWorkbook';
import type { StoreReportData, ReportLine, DpServiceRow } from './storeDailyReport';
import type { DepositLink } from '@/lib/deposit-links';
import type { AdvisorMetrics, DetailTransaction } from './dashboard/productivityService';
import { normalizeReportStore, reportSalesType } from '@/lib/report-attribution';

const MONEY = '#,##0.00;[Red](#,##0.00);"–"';
const NAVY = 'FF183E32';
type ReportOptions = { month: number; year: number; store?: string };
function band(sheet: ExcelJS.Worksheet, row: number, end: number) {
  for (let col = 1; col <= end; col++) {
    const cell = sheet.getCell(row, col);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  }
  sheet.getRow(row).height = 30;
}
function mergeText(sheet: ExcelJS.Worksheet, row: number, start: number, end: number, text: ExcelJS.CellValue) {
  sheet.mergeCells(row, start, row, end);
  sheet.getCell(row, start).value = text;
}
function detailSheet(book: ExcelJS.Workbook, name: string, title: string, headers: string[], options: ReportOptions, note: string) {
  const sheet = book.addWorksheet(name);
  sheet.properties.defaultRowHeight = 24;
  sheet.columns = headers.map((header, index) => ({ width: index === 0 ? 18 : /Invoice|Customer|Advisor|Store|Reference|Location/.test(header) ? 28 : 19 }));
  mergeText(sheet, 1, 1, headers.length, title); band(sheet, 1, headers.length); sheet.getRow(1).height = 34;
  mergeText(sheet, 2, 1, headers.length, `${options.year}-${String(options.month).padStart(2, '0')} | ${options.store || 'ALL'} | IDR`);
  mergeText(sheet, 3, 1, headers.length, note); sheet.getCell('A3').alignment = { wrapText: true }; sheet.getRow(3).height = 32;
  headers.forEach((header, index) => { sheet.getCell(5, index + 1).value = header; }); band(sheet, 5, headers.length);
  sheet.views = [{ state: 'frozen', ySplit: 5, xSplit: 2, showGridLines: false }];
  sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '5:5' };
  sheet.headerFooter.oddFooter = 'Created by Aris Setiyono | &P of &N';
  return sheet;
}
function styleDetails(sheet: ExcelJS.Worksheet, first: number, last: number, columns: number, money: number[]) {
  for (let row = first; row <= last; row++) {
    for (let col = 1; col <= columns; col++) {
      const cell = sheet.getCell(row, col);
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF233348' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      if (row % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      if (money.includes(col)) cell.numFmt = MONEY;
    }
    sheet.getRow(row).height = 32;
  }
}
function numericTotal(sheet: ExcelJS.Worksheet, first: number, last: number, row: number, col: number) {
  let total = 0;
  for (let r = first; r <= last; r++) {
    const cell = sheet.getCell(r, col);
    total += Number(typeof cell.value === 'object' ? cell.result || 0 : cell.value || 0);
  }
  sheet.getCell(row, col).value = { formula: `SUM(${sheet.getColumn(col).letter}${first}:${sheet.getColumn(col).letter}${last})`, result: total };
  sheet.getCell(row, col).numFmt = MONEY;
}
function finishDetails(sheet: ExcelJS.Worksheet, count: number, columns: number, totals: number[]) {
  const last = 5 + Math.max(1, count);
  if (!count) sheet.getCell('A6').value = 'No records for this period and store.';
  const row = last + 1;
  sheet.getCell(row, 1).value = 'TOTAL'; band(sheet, row, columns);
  for (const col of totals) numericTotal(sheet, 6, last, row, col);
  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: last, column: columns } };
  sheet.pageSetup.printArea = `A1:${sheet.getColumn(columns).letter}${row}`;
  return { first: 6, last, totalRow: row };
}
function addCrossingSheet(book: ExcelJS.Workbook, name: 'IN' | 'OUT', lines: ReportLine[], options: ReportOptions) {
  const sheet = detailSheet(book, name, `CROSSING SALES — ${name}`, ['Date', 'Invoice', 'Customer', 'Advisor', 'Home Location', 'Sales Location', 'Sales Type', 'Category', 'SAP Code', 'Catalogue', 'Qty', 'Gross Sales', 'Discount', 'Net Sales', 'Achievement'], options,
    name === 'IN' ? 'IN: sales at this store by advisors assigned to another store; deducted from physical store sales.' : 'OUT: sales by this store’s advisors at another store; added to the home store. Assignment uses the selected month’s rotation.');
  lines.sort((a, b) => a.item.transaction_date.localeCompare(b.item.transaction_date) || a.invoice.trans_no.localeCompare(b.invoice.trans_no)).forEach((line, index) => {
    const { invoice, item } = line;
    const row = index + 6;
    sheet.getRow(row).values = [new Date(`${item.transaction_date.slice(0, 10)}T00:00:00Z`), invoice.trans_no, invoice.customer, invoice.salesman, line.home, line.store, line.type, item.main_category, item.sap_code, item.catalogue_code, Number(item.qty), Number(item.gross_sales), Number(item.val_disc), Number(item.net_sales), { formula: `N${row}/1.11`, result: Number(item.net_sales) / 1.11 }];
    sheet.getCell(row, 1).numFmt = 'dd mmm yyyy';
  });
  styleDetails(sheet, 6, 5 + lines.length, 15, [12, 13, 14, 15]);
  return finishDetails(sheet, lines.length, 15, [11, 12, 13, 14, 15]);
}
function addDpServiceSheet(book: ExcelJS.Workbook, name: 'DP' | 'Service', rows: DpServiceRow[], links: DepositLink[], options: ReportOptions) {
  const linked = new Map(links.map(link => [link.transNo, link]));
  const sheet = detailSheet(book, name, name === 'DP' ? 'DOWN PAYMENTS' : 'SALES SERVICE CENTER', ['Date', 'Invoice / Transaction', 'Customer', 'Advisor', 'Store', 'Sales Type', 'Collection', 'SAP Code', 'Catalogue', 'Qty', 'Gross Amount', 'Discount', 'Net Sales', 'Card Commission', 'DP Status', 'Linked Sales Invoice', 'Linked Invoice Date'], options,
    'All records for the selected month and store from DP & Service Transactions. Gross = Qty × Price; net sales and commission use saved values.');
  rows.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date) || a.transaction_no.localeCompare(b.transaction_no)).forEach((row, index) => {
    const link = linked.get(row.transaction_no);
    const target = index + 6;
    const isReturn = Number(row.qty) < 0 || /^RB/i.test(row.location) || /^SI-RB/i.test(row.transaction_no);
    sheet.getRow(target).values = [new Date(`${row.transaction_date.slice(0, 10)}T00:00:00Z`), row.transaction_no, row.customer_name, row.salesman, normalizeReportStore(row.location), reportSalesType(row.type), row.collection, row.sap_code, row.catalogue_code, Number(row.qty), Number(row.qty) * Number(row.price), Number(row.sub_total_discount || 0), Number(row.net_sales || 0), Number(row.card_comm || 0), name === 'DP' ? link ? 'Claimed' : isReturn ? 'Return' : 'Unclaimed' : '', link?.invoiceNo || '', link?.invoiceDate.slice(0, 10) || ''];
    sheet.getCell(target, 1).numFmt = 'dd mmm yyyy';
  });
  styleDetails(sheet, 6, 5 + rows.length, 17, [11, 12, 13, 14]);
  finishDetails(sheet, rows.length, 17, [10, 11, 12, 13, 14]);
}
function addSppr(book: ExcelJS.Workbook, data: { metrics: AdvisorMetrics[]; details: DetailTransaction[] }, options: ReportOptions) {
  const sheet = detailSheet(book, 'SPPR_', 'SALES PERSON PRODUCTIVITY REPORT', ['Store', 'Advisor', 'Net Sales', 'Invoices', 'Qty', 'New Customers', 'New Customer Sales', '% New Sales', 'Existing Customers', 'Existing Customer Sales', '% Existing Sales', 'ATV', 'UPT', 'Walk In', 'Follow Up'], options,
    'Advisor Productivity source. EXISTING = first customer transaction before this month; otherwise NEW. Walk In / Follow Up are counted by advisor and visit location.');
  data.metrics.forEach((m, index) => {
    const row = index + 6;
    sheet.getRow(row).values = [m.store, m.advisor, m.totalNetSales, m.totalInvoices, m.totalQty, m.newCustomerCount, m.newCustomerSales,
      { formula: `IF(C${row}>0,G${row}/C${row},0)`, result: m.pctNewSales / 100 }, m.existingCustomerCount, m.existingCustomerSales,
      { formula: `IF(C${row}>0,J${row}/C${row},0)`, result: m.pctExistingSales / 100 },
      { formula: `IF(D${row}=0,0,C${row}/D${row})`, result: m.atv }, { formula: `IF(D${row}=0,0,E${row}/D${row})`, result: m.upt }, m.walkIn, m.followUp];
    sheet.getCell(row, 8).numFmt = '0.0%'; sheet.getCell(row, 11).numFmt = '0.0%'; sheet.getCell(row, 13).numFmt = '0.00';
  });
  styleDetails(sheet, 6, 5 + data.metrics.length, 15, [3, 7, 10, 12]);
  const { totalRow } = finishDetails(sheet, data.metrics.length, 15, [3, 4, 5, 6, 7, 9, 10, 14, 15]);
  sheet.getCell(totalRow, 1).value = 'TOTAL (advisor groups)';
  const net = data.metrics.reduce((sum, m) => sum + m.totalNetSales, 0);
  const invoices = data.metrics.reduce((sum, m) => sum + m.totalInvoices, 0);
  for (const [col, numerator, result] of [[8, 'G', net > 0 ? data.metrics.reduce((sum, m) => sum + m.newCustomerSales, 0) / net : 0], [11, 'J', net > 0 ? data.metrics.reduce((sum, m) => sum + m.existingCustomerSales, 0) / net : 0]] as const) {
    sheet.getCell(totalRow, col).value = { formula: `IF(C${totalRow}>0,${numerator}${totalRow}/C${totalRow},0)`, result }; sheet.getCell(totalRow, col).numFmt = '0.0%';
  }
  sheet.getCell(totalRow, 12).value = { formula: `IF(D${totalRow}=0,0,C${totalRow}/D${totalRow})`, result: invoices ? net / invoices : 0 };
  sheet.getCell(totalRow, 12).numFmt = MONEY;
  sheet.getCell(totalRow, 13).value = { formula: `IF(D${totalRow}=0,0,E${totalRow}/D${totalRow})`, result: invoices ? data.metrics.reduce((sum, m) => sum + m.totalQty, 0) / invoices : 0 };
  sheet.getCell(totalRow, 13).numFmt = '0.00';
  const header = totalRow + 3;
  mergeText(sheet, header - 1, 1, 15, 'Transaction detail — physical sales location; customer counts above are distinct within each advisor group.');
  const headers = ['Date', 'Invoice', 'Store', 'Advisor', 'Customer', 'Phone', 'Customer Status', 'Category', 'Collection', 'Qty', 'Net Sales'];
  headers.forEach((value, index) => { sheet.getCell(header, index + 1).value = value; }); band(sheet, header, 15);
  data.details.forEach((d, index) => { sheet.getRow(header + index + 1).values = [d.date, d.transNo, d.store, d.advisor, d.customer, d.phone, d.customerType, d.category, d.collection, d.qty, d.netSales]; });
  styleDetails(sheet, header + 1, header + data.details.length, 11, [11]);
  if (!data.details.length) sheet.getCell(header + 1, 1).value = 'No transactions.';
  sheet.pageSetup.printArea = `A1:O${header + Math.max(data.details.length, 1)}`;
}

export function buildStoreDailyWorkbook(template: ExcelJS.Workbook, report: StoreReportData, profiles: CrmReportProfile[], raw: DpServiceRow[], links: DepositLink[], productivity: { metrics: AdvisorMetrics[]; details: DetailTransaction[] }, options: ReportOptions) {
  const header = 6, first = 7;
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet('Summary');
  const result = buildDailySalesWorkbook(template, report.invoices, profiles, options, workbook);
  const sheet = workbook.getWorksheet('DS')!;
  for (const merge of [...(sheet.model.merges || [])]) {
    if (Number(merge.split(':').pop()?.replace(/[A-Z]/g, '')) <= 3) sheet.unMergeCells(merge);
  }
  for (let r = 1; r <= 3; r++) for (let c = 1; c <= 40; c++) { sheet.getCell(r, c).value = null; sheet.getCell(r, c).style = {}; }
  mergeText(sheet, 1, 1, 40, `BVLGARI — ${options.store && options.store !== 'ALL' ? options.store : 'All stores'}`);
  band(sheet, 1, 40); sheet.getRow(1).height = 36; sheet.getCell('A1').font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  const period = new Date(Date.UTC(options.year, options.month - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  mergeText(sheet, 2, 1, 40, `Daily Sales Transaction Report | ${period} | Amounts in IDR`); sheet.getRow(2).height = 28; sheet.getCell('A2').font = { name: 'Calibri', size: 12, bold: true };
  mergeText(sheet, 3, 1, 20, 'Full month / selected store — screen search and invoice filters are not applied');
  mergeText(sheet, 3, 21, 40, 'Achievement = Net Sales / 1.11');
  sheet.getRow(3).height = 32;
  sheet.getCell('A3').alignment = { wrapText: true }; sheet.getCell('U3').alignment = { wrapText: true };
  // The summary has its own compact sheet; freeze the ledger column headers.
  sheet.views = [{ state: 'frozen', xSplit: 3, ySplit: header, showGridLines: false }];
  sheet.headerFooter.oddFooter = 'Created by Aris Setiyono | &P of &N';
  ['Sales Type', 'Sales Location', 'Advisor Home', 'Crossing'].forEach((label, index) => {
    const col = index + 37;
    sheet.getColumn(col).width = index === 0 ? 14 : 25;
    sheet.getCell(header, col).value = label;
    sheet.getCell(header, col).style = structuredClone(sheet.getCell(header, 36).style);
  });
  const lineMap = new Map(report.physical.map(line => [line.item.id, line]));
  let row = first;
  const sorted = [...report.invoices].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date) || a.trans_no.localeCompare(b.trans_no));
  for (const invoice of sorted) for (const item of invoice.items) {
    const line = lineMap.get(item.id)!;
    sheet.getCell(row, 37).value = line.type; sheet.getCell(row, 38).value = line.store; sheet.getCell(row, 39).value = line.home;
    sheet.getCell(row, 40).value = line.crossing ? 'IN' : 'Local';
    for (let col = 37; col <= 40; col++) sheet.getCell(row, col).alignment = { vertical: 'middle', wrapText: true };
    sheet.getCell(row, 37).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: line.type === 'SMI' ? 'FFEDE9FE' : 'FFDCFCE7' } };
    sheet.getCell(row, 37).font = { bold: true, color: { argb: line.type === 'SMI' ? 'FF6D28D9' : 'FF166534' } };
    row++;
  }
  const last = Math.max(first, row - 1);
  sheet.autoFilter = `A${header}:AN${last}`;
  sheet.pageSetup.printArea = `A1:AN${Math.max(first + 1, row) + 2}`;
  // Required tabs are kept before the optional POS split detail tab.
  const paymentSheet = workbook.getWorksheet('Payment Details');
  const paymentModel = paymentSheet?.model;
  if (paymentSheet) workbook.removeWorksheet(paymentSheet.id);
  addDpServiceSheet(workbook, 'DP', raw.filter(row => row.collection === 'DPS'), links, options);
  addDpServiceSheet(workbook, 'Service', raw.filter(row => row.collection === 'SVC'), links, options);
  const inRange = addCrossingSheet(workbook, 'IN', [...report.incoming], options);
  const outRange = addCrossingSheet(workbook, 'OUT', [...report.outgoing], options);
  addSppr(workbook, productivity, options);
  if (paymentModel) { const restored = workbook.addWorksheet('Payment Details'); restored.model = { ...paymentModel, id: restored.id }; }

  populateStoreSummary(summary, report, { first, last }, inRange, outRange, options);
  return result;
}

import type ExcelJS from 'exceljs';
import type { StoreReportData, SalesTotals } from './storeDailyReport';

const MONEY = '#,##0.00;[Red](#,##0.00);"–"';
const NAVY = 'FF183E32';
type Range = { first: number; last: number };

export function populateStoreSummary(sheet: ExcelJS.Worksheet, report: StoreReportData, ds: Range, incoming: Range, outgoing: Range, options: { month: number; year: number; store?: string }) {
  sheet.columns = [38, 24, 24, 24, 24, 24, 10].map(width => ({ width }));
  sheet.properties.defaultRowHeight = 27;
  sheet.properties.tabColor = { argb: NAVY };
  sheet.views = [{ state: 'frozen', ySplit: 3, showGridLines: false, zoomScale: 90 }];
  sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
    margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 } };
  sheet.headerFooter.oddFooter = 'Created by Aris Setiyono | &P of &N';
  function merged(row: number, start: number, end: number, value: ExcelJS.CellValue) {
    if (end > start) sheet.mergeCells(row, start, row, end);
    sheet.getCell(row, start).value = value;
  }
  function band(row: number, text?: string) {
    if (text) merged(row, 1, 7, text);
    for (let col = 1; col <= 7; col++) {
      const cell = sheet.getCell(row, col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    }
    sheet.getRow(row).height = 30;
  }
  function detail(row: number) {
    for (let col = 1; col <= 7; col++) {
      const cell = sheet.getCell(row, col);
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF233348' } };
      cell.alignment = { vertical: 'middle', wrapText: true, horizontal: col === 1 ? 'left' : 'right' };
      if (row % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    }
    sheet.getRow(row).height = 30;
  }
  function headers(row: number, first = 'Sales basis') {
    [first, 'Net Sales', 'Regular', 'SMI', 'Qty'].forEach((text, index) => { sheet.getCell(row, index + 1).value = text; });
    merged(row, 6, 7, 'Achievement'); band(row);
  }
  const period = new Date(Date.UTC(options.year, options.month - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  band(1, 'BVLGARI | MONTHLY SALES SUMMARY'); sheet.getRow(1).height = 40;
  sheet.getCell('A1').font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  merged(2, 1, 7, `${options.store && options.store !== 'ALL' ? options.store : 'All stores'} • ${period} • IDR`);
  sheet.getCell('A2').font = { name: 'Calibri', size: 12, bold: true, color: { argb: NAVY } };
  merged(3, 1, 7, 'Full monthly report. Transaction details are on DS, DP, Service, IN, OUT and SPPR_.');
  sheet.getCell('A3').font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  band(4, 'STORE SALES'); headers(5);
  const metrics: [number, string, SalesTotals][] = [[6, 'Physical store sales', report.totals.physical], [7, 'Less: Crossing IN', report.totals.incoming], [8, 'Plus: Crossing OUT', report.totals.outgoing], [9, 'Local sales (Physical − IN)', report.totals.local], [10, 'Adjusted sales (Physical − IN + OUT)', report.totals.adjusted]];
  const columns = [[2, 'net'], [3, 'regular'], [4, 'smi'], [5, 'qty']] as const;
  for (const [row, label, totals] of metrics) {
    detail(row); sheet.getCell(row, 1).value = label;
    for (const [col, key] of columns) {
      const letter = sheet.getColumn(col).letter;
      let formula: string;
      if (row === 6) {
        formula = key === 'regular' || key === 'smi'
          ? `SUMIFS('DS'!S${ds.first}:S${ds.last},'DS'!AK${ds.first}:AK${ds.last},"${key === 'smi' ? 'SMI' : 'Regular'}")`
          : `SUM('DS'!${key === 'qty' ? 'P' : 'S'}${ds.first}:${key === 'qty' ? 'P' : 'S'}${ds.last})`;
      } else if (row === 7 || row === 8) {
        const name = row === 7 ? 'IN' : 'OUT', range = row === 7 ? incoming : outgoing;
        formula = key === 'regular' || key === 'smi'
          ? `SUMIFS('${name}'!N${range.first}:N${range.last},'${name}'!G${range.first}:G${range.last},"${key === 'smi' ? 'SMI' : 'Regular'}")`
          : `SUM('${name}'!${key === 'qty' ? 'K' : 'N'}${range.first}:${key === 'qty' ? 'K' : 'N'}${range.last})`;
      } else formula = row === 9 ? `${letter}6-${letter}7` : `${letter}9+${letter}8`;
      sheet.getCell(row, col).value = { formula, result: totals[key] };
      sheet.getCell(row, col).numFmt = key === 'qty' ? '#,##0.##' : MONEY;
    }
    merged(row, 6, 7, { formula: `B${row}/1.11`, result: totals.net / 1.11 }); sheet.getCell(row, 6).numFmt = MONEY;
    if (row === 10) { band(row); sheet.getRow(row).height = 38; }
  }
  detail(11); merged(11, 1, 2, 'Adjusted sales mix: Regular / SMI');
  sheet.getCell('C11').value = { formula: 'IF(B10=0,0,C10/B10)', result: report.totals.adjusted.net ? report.totals.adjusted.regular / report.totals.adjusted.net : 0 };
  sheet.getCell('D11').value = { formula: 'IF(B10=0,0,D10/B10)', result: report.totals.adjusted.net ? report.totals.adjusted.smi / report.totals.adjusted.net : 0 };
  sheet.getCell('C11').numFmt = '0.0%'; sheet.getCell('D11').numFmt = '0.0%';
  sheet.getCell('E11').value = 'Store invoices'; merged(11, 6, 7, new Set(report.invoices.map(invoice => invoice.trans_no)).size);
  merged(12, 1, 7, 'Adjusted sales = Physical − IN + OUT. Achievement = Net Sales / 1.11. DP and Service are reported separately.');
  sheet.getCell('A12').font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  sheet.getCell('A12').alignment = { wrapText: true, vertical: 'middle' }; sheet.getRow(12).height = 30;
  sheet.getRow(13).height = 12;
  band(14, 'CROSSING BY LOCATION');
  ['Direction', 'Advisor home', 'Sales location', 'Net Sales', 'Regular', 'SMI', 'Qty'].forEach((text, index) => { sheet.getCell(15, index + 1).value = text; }); band(15);
  report.flows.forEach((flow, index) => {
    const row = index + 16;
    sheet.getRow(row).values = [flow.direction, flow.home, flow.store, flow.net, flow.regular, flow.smi, flow.qty]; detail(row);
    sheet.getCell(row, 2).alignment = { vertical: 'middle', wrapText: true }; sheet.getCell(row, 3).alignment = { vertical: 'middle', wrapText: true };
    for (const col of [4, 5, 6]) sheet.getCell(row, col).numFmt = MONEY;
  });
  if (!report.flows.length) { merged(16, 1, 7, 'No crossing sales for this period and store.'); detail(16); }
  const categoryStart = 17 + Math.max(1, report.flows.length);
  sheet.getRow(categoryStart - 1).height = 12;
  band(categoryStart, 'PHYSICAL STORE SALES BY CATEGORY'); headers(categoryStart + 1, 'Category');
  report.categories.forEach((category, index) => {
    const row = categoryStart + 2 + index; detail(row); sheet.getCell(row, 1).value = category.category;
    for (const [col, key] of columns) { sheet.getCell(row, col).value = category[key]; sheet.getCell(row, col).numFmt = key === 'qty' ? '#,##0.##' : MONEY; }
    merged(row, 6, 7, { formula: `B${row}/1.11`, result: category.net / 1.11 }); sheet.getCell(row, 6).numFmt = MONEY;
  });
  if (!report.categories.length) { merged(categoryStart + 2, 1, 7, 'No sales for this period and store.'); detail(categoryStart + 2); }
  const footer = categoryStart + 3 + Math.max(1, report.categories.length);
  merged(footer, 1, 7, 'Crossing follows monthly advisor rotation, then home store. Applies between Plaza Indonesia, Plaza Senayan and Bali.');
  sheet.getCell(footer, 1).alignment = { wrapText: true, vertical: 'middle' }; sheet.getRow(footer).height = 30;
  sheet.getCell(footer, 1).font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  merged(footer + 1, 1, 7, 'Created by Aris Setiyono'); sheet.getCell(footer + 1, 1).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  sheet.pageSetup.printArea = `A1:G${footer + 1}`;
}

import { ReportData } from './types';
import {
  C,
  borderAll,
  doubleBottomBorder,
  numFmt,
  pctFmt,
  pctPositiveFmt,
  intFmt,
  createTitleHeader,
} from './styles';

export function buildLocationSheet(wb: any, data: ReportData) {
  const ws = wb.addWorksheet('Sales by Location', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
  });

  // Set initial column widths (11 columns)
  ws.columns = [
    { width: 24 }, // A: Boutique Location
    { width: 14 }, // B: Invoices Count
    { width: 14 }, // C: Qty Sold
    { width: 22 }, // D: Gross Sales
    { width: 20 }, // E: Total Diskon
    { width: 14 }, // F: Diskon Rate
    { width: 24 }, // G: Physical Net Sales
    { width: 24 }, // H: Adjusted Net Sales
    { width: 22 }, // I: Net Crossing Impact
    { width: 16 }, // J: Sales Share %
    { width: 22 }, // K: ATV (Average Ticket)
  ];

  createTitleHeader(
    ws,
    'BVLGARI — SALES BY BOUTIQUE & LOCATION PERFORMANCE',
    `Executive Summary of Physical vs Adjusted Sales — ${data.month} ${data.year}`,
    11
  );

  // Row 4: Section title
  const secRow = ws.addRow(['BOUTIQUE PERFORMANCE BREAKDOWN', '', '', '', '', '', '', '', '', '', '']);
  secRow.height = 24;
  ws.mergeCells(`A4:K4`);
  secRow.getCell(1).font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
  secRow.getCell(1).alignment = { vertical: 'middle' };

  // Row 5: Table Header
  const headers = [
    'Boutique Location',
    'Total Invoices',
    'Qty (pcs)',
    'Gross Sales',
    'Total Diskon',
    'Disc Rate (%)',
    'Physical Net Sales',
    'Adjusted Net Sales',
    'Net Impact (+/-)',
    'Sales Share (%)',
    'Avg Ticket (ATV)',
  ];

  const hdrRow = ws.addRow(headers);
  hdrRow.height = 26;
  hdrRow.eachCell((cell: any, colIdx: number) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.navyText }, size: 9 };
    cell.border = borderAll(C.navyBg);
    cell.alignment = {
      vertical: 'middle',
      horizontal: colIdx === 1 ? 'left' : colIdx === 6 || colIdx === 10 ? 'center' : 'right',
    };
  });

  const startRow = 6;
  data.locationSummaries.forEach((item, idx) => {
    const row = ws.addRow([
      item.store,
      item.invoicesCount,
      item.qty,
      item.grossSales,
      item.valDisc,
      item.discPct / 100,
      item.physicalNet,
      item.adjustedNet,
      item.netImpact,
      item.sharePct / 100,
      item.atv,
    ]);
    row.height = 21;

    row.eachCell((cell: any, colIdx: number) => {
      cell.border = borderAll();
      cell.font = { name: 'Arial', size: 9.5 };

      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
      }

      if (colIdx === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.font = { name: 'Arial', bold: true, size: 9.5 };
      } else if (colIdx === 2 || colIdx === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = intFmt;
      } else if (colIdx === 4 || colIdx === 5 || colIdx === 7 || colIdx === 8 || colIdx === 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = numFmt;
      } else if (colIdx === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = pctPositiveFmt;
      } else if (colIdx === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = numFmt;
        cell.font = {
          name: 'Arial',
          bold: true,
          size: 9.5,
          color: { argb: 'FF' + (item.netImpact >= 0 ? C.greenText : C.redText) },
        };
      } else if (colIdx === 10) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = pctPositiveFmt;
        cell.font = { name: 'Arial', bold: true, size: 9.5 };
      }
    });
  });

  const endRow = ws.rowCount;

  // Grand Total Row
  const totalRow = ws.addRow([
    'TOTAL RETAIL CONSOLIDATED',
    { formula: `SUM(B${startRow}:B${endRow})` },
    { formula: `SUM(C${startRow}:C${endRow})` },
    { formula: `SUM(D${startRow}:D${endRow})` },
    { formula: `SUM(E${startRow}:E${endRow})` },
    { formula: `IF(D${endRow + 1}>0, E${endRow + 1}/D${endRow + 1}, 0)` },
    { formula: `SUM(G${startRow}:G${endRow})` },
    { formula: `SUM(H${startRow}:H${endRow})` },
    { formula: `SUM(I${startRow}:I${endRow})` },
    { formula: `SUM(J${startRow}:J${endRow})` },
    { formula: `IF(B${endRow + 1}>0, G${endRow + 1}/B${endRow + 1}, 0)` },
  ]);
  totalRow.height = 24;

  totalRow.eachCell((cell: any, colIdx: number) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
    cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
    cell.border = doubleBottomBorder(C.navyBg);

    if (colIdx === 1) {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    } else if (colIdx === 2 || colIdx === 3) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = intFmt;
    } else if (colIdx === 4 || colIdx === 5 || colIdx === 7 || colIdx === 8 || colIdx === 9 || colIdx === 11) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = numFmt;
    } else if (colIdx === 6 || colIdx === 10) {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.numFmt = pctPositiveFmt;
    }
  });

  // Notes block at bottom
  ws.addRow([]);
  const noteRow1 = ws.addRow(['Catatan Metodologi:']);
  noteRow1.getCell(1).font = { name: 'Arial', italic: true, bold: true, size: 8.5, color: { argb: 'FF64748B' } };
  const noteRow2 = ws.addRow(['1. Physical Net Sales: Nilai penjualan riil yang dibukukan kasir/store register butik bersangkutan.']);
  noteRow2.getCell(1).font = { name: 'Arial', italic: true, size: 8, color: { argb: 'FF64748B' } };
  const noteRow3 = ws.addRow(['2. Adjusted Net Sales: Nilai penjualan setelah mengatribusikan transaksi sales advisor ke home store masing-masing.']);
  noteRow3.getCell(1).font = { name: 'Arial', italic: true, size: 8, color: { argb: 'FF64748B' } };
  const noteRow4 = ws.addRow(['3. Net Impact: Selisih Adjusted Sales dikurangi Physical Sales (+ menunjukkan net inflow, - menunjukkan net outflow).']);
  noteRow4.getCell(1).font = { name: 'Arial', italic: true, size: 8, color: { argb: 'FF64748B' } };
}

import { ReportData } from './types';
import {
  C,
  borderAll,
  doubleBottomBorder,
  numFmt,
  intFmt,
  createTitleHeader,
} from './styles';

export function buildInvoicesSheet(wb: any, data: ReportData) {
  const ws = wb.addWorksheet('Invoice Register', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
  });

  ws.columns = [
    { width: 6 },  // A: No
    { width: 13 }, // B: Tanggal
    { width: 24 }, // C: No. Invoice
    { width: 16 }, // D: No. Cash Bill
    { width: 24 }, // E: Customer
    { width: 22 }, // F: Sales Advisor
    { width: 18 }, // G: Advisor Home Store
    { width: 18 }, // H: Lokasi Transaksi
    { width: 20 }, // I: Crossing Status
    { width: 11 }, // J: Item Count
    { width: 11 }, // K: Total Qty
    { width: 22 }, // L: Gross Sales
    { width: 20 }, // M: Total Diskon
    { width: 18 }, // N: Total Card Comm
    { width: 22 }, // O: Net Sales
    { width: 26 }, // P: Discount Given Reason
    { width: 26 }, // Q: After Sales Support
    { width: 16 }, // R: DWA No
    { width: 26 }, // S: Other Remarks
  ];

  createTitleHeader(
    ws,
    'BVLGARI — INVOICE & TRANSACTION REGISTER',
    `Header-Detail Transaction Log with Cash Bill & Crossing Attributes — ${data.month} ${data.year}`,
    19
  );

  // Section Row
  const secRow = ws.addRow(['INVOICE TRANSACTION RECORDS', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  secRow.height = 24;
  ws.mergeCells(`A4:S4`);
  secRow.getCell(1).font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
  secRow.getCell(1).alignment = { vertical: 'middle' };

  // Headers
  const headers = [
    'No.',
    'Tanggal',
    'No. Invoice',
    'No. Cash Bill (CB)',
    'Customer Name',
    'Sales Advisor',
    'Advisor Home Store',
    'Lokasi Transaksi',
    'Crossing Status',
    'Items',
    'Qty (pcs)',
    'Gross Sales',
    'Total Diskon',
    'Total Comm',
    'Net Sales',
    'Discount Given Reason',
    'After Sales Support',
    'DWA No / Ref',
    'Remarks',
  ];

  const hdrRow = ws.addRow(headers);
  hdrRow.height = 26;
  hdrRow.eachCell((cell: any, colIdx: number) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.navyText }, size: 9 };
    cell.border = borderAll(C.navyBg);
    cell.alignment = {
      vertical: 'middle',
      horizontal: colIdx === 1 || colIdx === 2 || colIdx === 9 || colIdx === 10 || colIdx === 11 ? 'center' : colIdx >= 12 && colIdx <= 15 ? 'right' : 'left',
    };
  });

  const startRow = 6;
  data.invoices.forEach((inv, idx) => {
    const dStr = inv.transaction_date ? inv.transaction_date.slice(0, 10) : '';
    const crossingText = inv.isCrossing ? `CROSSING (${inv.crossingFlow})` : 'Normal';

    const row = ws.addRow([
      idx + 1,
      dStr,
      inv.trans_no,
      inv.meta.cash_bill_no || '—',
      inv.customer || '—',
      inv.salesman || '—',
      inv.advisorHomeStore || '—',
      inv.location || '—',
      crossingText,
      inv.item_count,
      inv.total_qty,
      inv.total_gross,
      inv.total_disc,
      inv.total_comm,
      inv.total_net,
      inv.meta.discount_given_reason || '—',
      inv.meta.after_sales_support || '—',
      inv.meta.dwa_no || '—',
      inv.meta.other_remarks || '—',
    ]);
    row.height = 20;

    row.eachCell((cell: any, colIdx: number) => {
      cell.border = borderAll();
      cell.font = { name: 'Arial', size: 9 };

      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
      }

      if (colIdx === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Arial', color: { argb: 'FF64748B' }, size: 8.5 };
      } else if (colIdx === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colIdx === 3 || colIdx === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.font = { name: 'Consolas', bold: true, size: 9 };
      } else if (colIdx === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (inv.isCrossing) {
          cell.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF' + C.blueText } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.blueBg } };
        } else {
          cell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
        }
      } else if (colIdx === 10 || colIdx === 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = intFmt;
      } else if (colIdx >= 12 && colIdx <= 15) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = numFmt;
        if (colIdx === 15) cell.font = { name: 'Arial', bold: true, size: 9 };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  const endRow = ws.rowCount;

  // Grand Total Row
  const totRow = ws.addRow([
    'TOTAL INVOICES',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    { formula: `SUM(J${startRow}:J${endRow})` },
    { formula: `SUM(K${startRow}:K${endRow})` },
    { formula: `SUM(L${startRow}:L${endRow})` },
    { formula: `SUM(M${startRow}:M${endRow})` },
    { formula: `SUM(N${startRow}:N${endRow})` },
    { formula: `SUM(O${startRow}:O${endRow})` },
    '',
    '',
    '',
    '',
  ]);
  totRow.height = 24;
  ws.mergeCells(`A${endRow + 1}:I${endRow + 1}`);

  totRow.eachCell((cell: any, colIdx: number) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
    cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyBg } };
    cell.border = doubleBottomBorder(C.navyBg);

    if (colIdx === 1) {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    } else if (colIdx === 10 || colIdx === 11) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = intFmt;
    } else if (colIdx >= 12 && colIdx <= 15) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = numFmt;
    }
  });
}

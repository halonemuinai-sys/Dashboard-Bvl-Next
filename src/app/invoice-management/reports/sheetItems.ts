import { ReportData } from './types';
import {
  C,
  borderAll,
  doubleBottomBorder,
  numFmt,
  pctPositiveFmt,
  intFmt,
  createTitleHeader,
} from './styles';

export function buildItemsSheet(wb: any, data: ReportData) {
  const ws = wb.addWorksheet('Item Breakdown', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
  });

  ws.columns = [
    { width: 6 },  // A: No
    { width: 22 }, // B: No. Invoice
    { width: 16 }, // C: No. Cash Bill
    { width: 13 }, // D: Tanggal
    { width: 18 }, // E: Lokasi Boutique
    { width: 22 }, // F: Sales Advisor
    { width: 22 }, // G: Customer Name
    { width: 14 }, // H: SAP Code
    { width: 18 }, // I: Catalogue Code
    { width: 16 }, // J: Main Category
    { width: 20 }, // K: Collection
    { width: 10 }, // L: Qty
    { width: 20 }, // M: Gross Sales
    { width: 18 }, // N: Diskon
    { width: 14 }, // O: Diskon (%)
    { width: 20 }, // P: Net Sales
    { width: 12 }, // Q: Type Item
    { width: 18 }, // R: Card Comm
  ];

  createTitleHeader(
    ws,
    'BVLGARI — PRODUCT LINE ITEM BREAKDOWN',
    `Merchandising, Line-Item Attributes & Commission Log — ${data.month} ${data.year}`,
    18
  );

  // Section Row
  const secRow = ws.addRow(['TRANSACTION LINE ITEMS', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  secRow.height = 24;
  ws.mergeCells(`A4:R4`);
  secRow.getCell(1).font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
  secRow.getCell(1).alignment = { vertical: 'middle' };

  // Headers
  const headers = [
    'No.',
    'No. Invoice',
    'No. Cash Bill',
    'Tanggal',
    'Lokasi Boutique',
    'Sales Advisor',
    'Customer Name',
    'SAP Code',
    'Catalogue Code',
    'Main Category',
    'Collection',
    'Qty',
    'Gross Sales',
    'Diskon',
    'Diskon (%)',
    'Net Sales',
    'Type',
    'Card Comm',
  ];

  const hdrRow = ws.addRow(headers);
  hdrRow.height = 26;
  hdrRow.eachCell((cell: any, colIdx: number) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.navyText }, size: 9 };
    cell.border = borderAll(C.navyBg);
    cell.alignment = {
      vertical: 'middle',
      horizontal: colIdx === 1 || colIdx === 4 || colIdx === 12 || colIdx === 15 || colIdx === 17 ? 'center' : colIdx === 13 || colIdx === 14 || colIdx === 16 || colIdx === 18 ? 'right' : 'left',
    };
  });

  const startRow = 6;
  let counter = 1;

  data.invoices.forEach((inv) => {
    const dStr = inv.transaction_date ? inv.transaction_date.slice(0, 10) : '';

    inv.items.forEach((it) => {
      const discPct = it.gross_sales > 0 ? (it.val_disc / it.gross_sales) : 0;

      const row = ws.addRow([
        counter++,
        inv.trans_no,
        inv.meta.cash_bill_no || '—',
        dStr,
        inv.location || '—',
        inv.salesman || '—',
        inv.customer || '—',
        it.sap_code || '—',
        it.catalogue_code || '—',
        it.main_category || '—',
        it.collection || '—',
        it.qty || 1,
        it.gross_sales || 0,
        it.val_disc || 0,
        discPct,
        it.net_sales || 0,
        it.type || 'Regular',
        it.comm || 0,
      ]);
      row.height = 19;

      const isEven = (counter - 1) % 2 === 0;
      row.eachCell((cell: any, colIdx: number) => {
        cell.border = borderAll();
        cell.font = { name: 'Arial', size: 9 };

        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
        }

        if (colIdx === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Arial', color: { argb: 'FF64748B' }, size: 8.5 };
        } else if (colIdx === 2 || colIdx === 3 || colIdx === 8 || colIdx === 9) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.font = { name: 'Consolas', size: 8.5 };
        } else if (colIdx === 4 || colIdx === 17) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colIdx === 12) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.numFmt = intFmt;
        } else if (colIdx === 13 || colIdx === 14 || colIdx === 16 || colIdx === 18) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = numFmt;
          if (colIdx === 16) cell.font = { name: 'Arial', bold: true, size: 9 };
          if (colIdx === 18) cell.font = { name: 'Arial', size: 9, color: { argb: 'FF' + C.greenText } };
        } else if (colIdx === 15) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.numFmt = pctPositiveFmt;
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });
  });

  const endRow = ws.rowCount;

  // Grand Total Row
  const totRow = ws.addRow([
    'TOTAL PRODUCT LINE ITEMS',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    { formula: `SUM(L${startRow}:L${endRow})` },
    { formula: `SUM(M${startRow}:M${endRow})` },
    { formula: `SUM(N${startRow}:N${endRow})` },
    { formula: `IF(M${endRow + 1}>0, N${endRow + 1}/M${endRow + 1}, 0)` },
    { formula: `SUM(P${startRow}:P${endRow})` },
    '',
    { formula: `SUM(R${startRow}:R${endRow})` },
  ]);
  totRow.height = 24;
  ws.mergeCells(`A${endRow + 1}:K${endRow + 1}`);

  totRow.eachCell((cell: any, colIdx: number) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
    cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyBg } };
    cell.border = doubleBottomBorder(C.navyBg);

    if (colIdx === 1) {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    } else if (colIdx === 12) {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.numFmt = intFmt;
    } else if (colIdx === 13 || colIdx === 14 || colIdx === 16 || colIdx === 18) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = numFmt;
    } else if (colIdx === 15) {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.numFmt = pctPositiveFmt;
    }
  });
}

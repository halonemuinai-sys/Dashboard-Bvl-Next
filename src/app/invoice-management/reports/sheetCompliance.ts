import { ReportData } from './types';
import {
  C,
  borderAll,
  doubleBottomBorder,
  numFmt,
  pctPositiveFmt,
  createTitleHeader,
} from './styles';

export function buildComplianceSheet(wb: any, data: ReportData) {
  const ws = wb.addWorksheet('Discounts & Compliance', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
  });

  ws.columns = [
    { width: 6 },  // A: No
    { width: 13 }, // B: Tanggal
    { width: 24 }, // C: No. Invoice
    { width: 16 }, // D: No. Cash Bill
    { width: 18 }, // E: Boutique
    { width: 22 }, // F: Sales Advisor
    { width: 24 }, // G: Customer Name
    { width: 20 }, // H: Gross Sales
    { width: 18 }, // I: Diskon (Rp)
    { width: 14 }, // J: Diskon (%)
    { width: 18 }, // K: DWA No / Ref
    { width: 32 }, // L: Alasan Pemberian Diskon
  ];

  createTitleHeader(
    ws,
    'BVLGARI — DISCOUNTS & AFTER SALES COMPLIANCE LOG',
    `Audit of Special Authorizations (DWA) & Client Service Commitments — ${data.month} ${data.year}`,
    12
  );

  // Table A: Special Discounts Audit
  const secRow1 = ws.addRow(['SPECIAL DISCOUNTS & DWA AUTHORIZATION AUDIT', '', '', '', '', '', '', '', '', '', '', '']);
  secRow1.height = 24;
  ws.mergeCells(`A4:L4`);
  secRow1.getCell(1).font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
  secRow1.getCell(1).alignment = { vertical: 'middle' };

  const discHeaders = [
    'No.',
    'Tanggal',
    'No. Invoice',
    'No. Cash Bill',
    'Boutique',
    'Sales Advisor',
    'Customer Name',
    'Gross Sales',
    'Diskon (Rp)',
    'Diskon (%)',
    'DWA No / Ref',
    'Alasan Pemberian Diskon',
  ];

  const discHdrRow = ws.addRow(discHeaders);
  discHdrRow.height = 26;
  discHdrRow.eachCell((cell: any, colIdx: number) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.navyText }, size: 9 };
    cell.border = borderAll(C.navyBg);
    cell.alignment = {
      vertical: 'middle',
      horizontal: colIdx === 1 || colIdx === 2 || colIdx === 10 ? 'center' : colIdx === 8 || colIdx === 9 ? 'right' : 'left',
    };
  });

  const discountedInvoices = data.invoices.filter(
    (inv) => inv.total_disc > 0 || inv.meta.discount_given_reason || inv.meta.dwa_no
  );

  const discStartRow = ws.rowCount + 1;

  if (discountedInvoices.length === 0) {
    const emptyRow = ws.addRow(['Tidak ada transaksi dengan diskon atau otorisasi DWA pada periode ini.', '', '', '', '', '', '', '', '', '', '', '']);
    ws.mergeCells(`A${discStartRow}:L${discStartRow}`);
    emptyRow.getCell(1).font = { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } };
    emptyRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    emptyRow.height = 28;
  } else {
    discountedInvoices.forEach((inv, idx) => {
      const dStr = inv.transaction_date ? inv.transaction_date.slice(0, 10) : '';
      const discPct = inv.total_gross > 0 ? (inv.total_disc / inv.total_gross) : 0;

      const row = ws.addRow([
        idx + 1,
        dStr,
        inv.trans_no,
        inv.meta.cash_bill_no || '—',
        inv.location || '—',
        inv.salesman || '—',
        inv.customer || '—',
        inv.total_gross,
        inv.total_disc,
        discPct,
        inv.meta.dwa_no || '—',
        inv.meta.discount_given_reason || '—',
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
        } else if (colIdx === 2 || colIdx === 10) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          if (colIdx === 10) cell.numFmt = pctPositiveFmt;
        } else if (colIdx === 3 || colIdx === 4 || colIdx === 11) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.font = { name: 'Consolas', size: 9 };
          if (colIdx === 11 && inv.meta.dwa_no) {
            cell.font = { name: 'Consolas', bold: true, size: 9, color: { argb: 'FF' + C.blueText } };
          }
        } else if (colIdx === 8 || colIdx === 9) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = numFmt;
          if (colIdx === 9) cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF' + C.redText } };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    const discEndRow = ws.rowCount;

    // Total Discounts Row
    const totRow = ws.addRow([
      'TOTAL SPECIAL DISCOUNTS',
      '',
      '',
      '',
      '',
      '',
      '',
      { formula: `SUM(H${discStartRow}:H${discEndRow})` },
      { formula: `SUM(I${discStartRow}:I${discEndRow})` },
      { formula: `IF(H${discEndRow + 1}>0, I${discEndRow + 1}/H${discEndRow + 1}, 0)` },
      '',
      '',
    ]);
    totRow.height = 24;
    ws.mergeCells(`A${discEndRow + 1}:G${discEndRow + 1}`);

    totRow.eachCell((cell: any, colIdx: number) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
      cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyBg } };
      cell.border = doubleBottomBorder(C.navyBg);

      if (colIdx === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colIdx === 8 || colIdx === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = numFmt;
      } else if (colIdx === 10) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = pctPositiveFmt;
      }
    });
  }

  // Spacer
  ws.addRow([]);
  ws.addRow([]);

  // Table B: After Sales Support Commitments
  const afterStartRow = ws.rowCount + 1;
  const secRow2 = ws.addRow(['AFTER SALES SERVICE & CLIENT COMMITMENTS LOG', '', '', '', '', '', '', '', '', '', '', '']);
  secRow2.height = 24;
  ws.mergeCells(`A${afterStartRow}:L${afterStartRow}`);
  secRow2.getCell(1).font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
  secRow2.getCell(1).alignment = { vertical: 'middle' };

  const afterHdrRow = ws.addRow([
    'No.',
    'Tanggal',
    'No. Invoice',
    'No. Cash Bill',
    'Boutique',
    'Sales Advisor',
    'Customer Name',
    'Layanan After Sales Dijanjikan',
    '',
    '',
    'Catatan / Remarks',
    '',
  ]);
  afterHdrRow.height = 26;
  ws.mergeCells(`H${afterStartRow + 1}:J${afterStartRow + 1}`);
  ws.mergeCells(`K${afterStartRow + 1}:L${afterStartRow + 1}`);

  afterHdrRow.eachCell((cell: any, colIdx: number) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.slateBg } };
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.slateText }, size: 9 };
    cell.border = borderAll(C.slateBg);
    cell.alignment = {
      vertical: 'middle',
      horizontal: colIdx === 1 || colIdx === 2 ? 'center' : 'left',
    };
  });

  const afterSalesInvoices = data.invoices.filter((inv) => Boolean(inv.meta.after_sales_support));
  const afterDataStartRow = ws.rowCount + 1;

  if (afterSalesInvoices.length === 0) {
    const emptyRow = ws.addRow(['Tidak ada komitmen after sales khusus tercatat pada periode ini.', '', '', '', '', '', '', '', '', '', '', '']);
    ws.mergeCells(`A${afterDataStartRow}:L${afterDataStartRow}`);
    emptyRow.getCell(1).font = { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } };
    emptyRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    emptyRow.height = 28;
  } else {
    afterSalesInvoices.forEach((inv, idx) => {
      const dStr = inv.transaction_date ? inv.transaction_date.slice(0, 10) : '';
      const rIdx = ws.rowCount + 1;
      const row = ws.addRow([
        idx + 1,
        dStr,
        inv.trans_no,
        inv.meta.cash_bill_no || '—',
        inv.location || '—',
        inv.salesman || '—',
        inv.customer || '—',
        inv.meta.after_sales_support,
        '',
        '',
        inv.meta.other_remarks || '—',
        '',
      ]);
      row.height = 22;
      ws.mergeCells(`H${rIdx}:J${rIdx}`);
      ws.mergeCells(`K${rIdx}:L${rIdx}`);

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
          cell.font = { name: 'Consolas', size: 9 };
        } else if (colIdx === 8) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF' + C.blueText } };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });
  }
}

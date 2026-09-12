import { ReportData } from './types';
import {
  C,
  borderAll,
  doubleBottomBorder,
  numFmt,
  pctFmt,
  intFmt,
  createTitleHeader,
} from './styles';

export function buildCrossingSheet(wb: any, data: ReportData) {
  const ws = wb.addWorksheet('Crossing Sales', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
  });

  ws.columns = [
    { width: 6 },  // A: No
    { width: 13 }, // B: Date
    { width: 22 }, // C: Sales Advisor
    { width: 20 }, // D: Base Boutique
    { width: 20 }, // E: Destination Boutique
    { width: 14 }, // F: Flow Direction
    { width: 24 }, // G: No. Invoice
    { width: 16 }, // H: No. Cash Bill
    { width: 24 }, // I: Customer Name
    { width: 22 }, // J: Net Sales Generated
    { width: 12 }, // K: Qty (pcs)
  ];

  createTitleHeader(
    ws,
    'BVLGARI — CROSSING SALES & MOBILITY REPORT',
    `Detailed Inter-Boutique Sales Operations — ${data.month} ${data.year}`,
    11
  );

  // Table A: Store Performance Adjustment Summary
  const secRow1 = ws.addRow(['BOUTIQUE PERFORMANCE ADJUSTMENT SUMMARY', '', '', '', '', '', '', '', '', '', '']);
  secRow1.height = 24;
  ws.mergeCells(`A4:K4`);
  secRow1.getCell(1).font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
  secRow1.getCell(1).alignment = { vertical: 'middle' };

  const adjHeaders = ['Boutique Location', 'Physical Sales', 'Adjusted Sales', 'Net Impact (+/-)', 'Variance %'];
  const adjHdrRow = ws.addRow([...adjHeaders, '', '', '', '', '', '']);
  adjHdrRow.height = 24;
  ws.mergeCells(`E5:K5`);

  adjHdrRow.eachCell((cell: any, colIdx: number) => {
    if (colIdx <= 5) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.slateBg } };
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.slateText }, size: 9 };
      cell.border = borderAll(C.slateBg);
      cell.alignment = {
        vertical: 'middle',
        horizontal: colIdx === 1 ? 'left' : colIdx === 5 ? 'center' : 'right',
      };
    }
  });

  data.crossingStats.forEach((st, idx) => {
    const rIdx = ws.rowCount + 1;
    const r = ws.addRow([st.store, st.physical, st.adjusted, st.impact, st.varPct / 100, '', '', '', '', '', '']);
    r.height = 20;
    ws.mergeCells(`E${rIdx}:K${rIdx}`);

    r.eachCell((cell: any, colIdx: number) => {
      if (colIdx <= 5) {
        cell.border = borderAll();
        cell.font = { name: 'Arial', size: 9.5 };

        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
        }

        if (colIdx === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.font = { name: 'Arial', bold: true, size: 9.5 };
        } else if (colIdx >= 2 && colIdx <= 4) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = numFmt;
          if (colIdx === 4) {
            cell.font = {
              name: 'Arial',
              bold: true,
              size: 9.5,
              color: { argb: 'FF' + (st.impact >= 0 ? C.greenText : C.redText) },
            };
          }
        } else if (colIdx === 5) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.numFmt = pctFmt;
          cell.font = {
            name: 'Arial',
            bold: true,
            size: 9.5,
            color: { argb: 'FF' + (st.impact >= 0 ? C.greenText : C.redText) },
          };
        }
      }
    });
  });

  // Spacer
  ws.addRow([]);

  // Table B: Detailed Crossing Activity
  const actStartRow = ws.rowCount + 1;
  const secRow2 = ws.addRow(['DETAILED CROSSING TRANSACTIONS LOG', '', '', '', '', '', '', '', '', '', '']);
  secRow2.height = 24;
  ws.mergeCells(`A${actStartRow}:K${actStartRow}`);
  secRow2.getCell(1).font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
  secRow2.getCell(1).alignment = { vertical: 'middle' };

  const actHdrRow = ws.addRow([
    'No.',
    'Tanggal',
    'Sales Advisor',
    'Base Boutique',
    'Destination Boutique',
    'Mobility Flow',
    'No. Invoice',
    'No. Cash Bill',
    'Customer Name',
    'Net Sales (Rp)',
    'Qty (pcs)',
  ]);
  actHdrRow.height = 26;

  actHdrRow.eachCell((cell: any, colIdx: number) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.navyText }, size: 9 };
    cell.border = borderAll(C.navyBg);
    cell.alignment = {
      vertical: 'middle',
      horizontal: colIdx === 1 || colIdx === 6 ? 'center' : colIdx >= 10 ? 'right' : 'left',
    };
  });

  const detailStartRow = ws.rowCount + 1;

  if (data.crossingDetails.length === 0) {
    const emptyRow = ws.addRow(['Tidak ada transaksi crossing sales tercatat pada periode ini.', '', '', '', '', '', '', '', '', '', '']);
    ws.mergeCells(`A${detailStartRow}:K${detailStartRow}`);
    emptyRow.getCell(1).font = { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } };
    emptyRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    emptyRow.height = 30;
  } else {
    data.crossingDetails.forEach((cd, idx) => {
      const row = ws.addRow([
        idx + 1,
        cd.date,
        cd.salesman,
        cd.baseLocation,
        cd.destinationLocation,
        cd.flowLabel,
        cd.transNo,
        cd.cashBillNo || '—',
        cd.customer || '—',
        cd.netSales,
        cd.qty,
      ]);
      row.height = 20;

      row.eachCell((cell: any, colIdx: number) => {
        cell.border = borderAll();
        cell.font = { name: 'Arial', size: 9.5 };

        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
        }

        if (colIdx === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Arial', color: { argb: 'FF64748B' }, size: 8.5 };
        } else if (colIdx === 2) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colIdx === 6) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.blueText }, size: 9 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.blueBg } };
        } else if (colIdx === 7 || colIdx === 8) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.font = { name: 'Consolas', size: 9 };
        } else if (colIdx === 10) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = numFmt;
          cell.font = { name: 'Arial', bold: true, size: 9.5 };
        } else if (colIdx === 11) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = intFmt;
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    const detailEndRow = ws.rowCount;

    // Total Crossing Activity Row
    const totRow = ws.addRow([
      'TOTAL CROSSING ACTIVITY',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      { formula: `SUM(J${detailStartRow}:J${detailEndRow})` },
      { formula: `SUM(K${detailStartRow}:K${detailEndRow})` },
    ]);
    totRow.height = 24;
    ws.mergeCells(`A${detailEndRow + 1}:I${detailEndRow + 1}`);

    totRow.eachCell((cell: any, colIdx: number) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
      cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyBg } };
      cell.border = doubleBottomBorder(C.navyBg);

      if (colIdx === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colIdx === 10) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = numFmt;
      } else if (colIdx === 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = intFmt;
      }
    });
  }
}

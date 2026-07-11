import { dashboardService, CrossingSalesData } from '@/services/dashboardService';
import { MONTHS } from './constants';
import type { StoreCard } from './constants';
import { generateLineGraphCanvas, generateComparisonGraphCanvas } from './canvasGraphs';

const C = {
  navyBg:   '1E3A5F', navyText:  'FFFFFF',
  slateBg:  '475569', slateText: 'FFFFFF',
  lightBg:  'F8FAFC', accentBg:  'F1F5F9',
  border:   'E2E8F0',
  greenText:'059669', amberText: 'D97706', redText: 'DC2626',
};
const C2 = { ...C, accentBg: 'EFF6FF' };

const thinBorder = (color: string) => ({ style: 'thin' as const, color: { argb: 'FF' + color } });
const borderAll  = (color = C.border) => ({
  top: thinBorder(color), bottom: thinBorder(color),
  left: thinBorder(color), right: thinBorder(color),
});

function downloadBlob(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Monthly Crossing Sales ────────────────────────────────────────────────────

export async function exportMonthlyExcel(
  data: CrossingSalesData,
  storeCards: StoreCard[],
  month: string,
  year: string,
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MRA Retail BI Dashboard';
  wb.created = new Date();

  const numFmt = 'Rp #,##0;[Red](Rp #,##0);"-"';
  const pctFmt = '+0.0%;-0.0%;0.0%';

  const ws = wb.addWorksheet('Crossing Sales', { views: [{ showGridLines: true }] });
  ws.columns = [{ width: 28 }, { width: 20 }, { width: 8 }, { width: 20 }, { width: 22 }, { width: 12 }];

  ws.mergeCells('A1:F1');
  Object.assign(ws.getCell('A1'), {
    value: 'BVLGARI - CROSSING SALES & MOBILITY',
    font: { name: 'Georgia', bold: true, size: 15, color: { argb: 'FF' + C.navyBg } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  ws.getRow(1).height = 36;

  ws.mergeCells('A2:F2');
  Object.assign(ws.getCell('A2'), {
    value: `Analysis of Inter-Boutique Operations — ${month} ${year}`,
    font: { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  ws.getRow(2).height = 18;
  ws.addRow([]);

  ws.mergeCells('A4:F4');
  const secRow1 = ws.addRow(['SUMMARY KEY PERFORMANCE INDICATORS']);
  secRow1.getCell(1).font = { name: 'Arial', bold: true, size: 10.5, color: { argb: 'FF' + C.navyBg } };
  ws.getRow(4).height = 24;

  const kpiHdrRow = ws.addRow(['KPI Item', 'Total Generated Value', 'Crossing Value', 'Excluded HO Value', '', '']);
  kpiHdrRow.height = 22;
  ws.mergeCells('D5:F5');
  kpiHdrRow.eachCell((cell: any, colIdx: number) => {
    if (colIdx <= 4) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.navyText }, size: 9 };
      cell.border = borderAll(C.navyBg);
      cell.alignment = { vertical: 'middle', horizontal: colIdx === 1 ? 'left' : 'right' };
    }
  });

  const rSales = ws.addRow(['Total Net Sales Generated', data.totalNetSalesGenerated, data.totalNet, data.hoExcludedNet || 0, '', '']);
  rSales.height = 20;
  ws.mergeCells('D6:F6');
  rSales.eachCell((cell: any, colIdx: number) => {
    if (colIdx <= 4) {
      cell.border = borderAll();
      cell.font   = { name: 'Arial', size: 9.5 };
      if (colIdx === 1) { cell.alignment = { vertical: 'middle', horizontal: 'left' }; }
      else {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt    = numFmt;
        if (colIdx === 2) cell.font = { name: 'Arial', bold: true, size: 9.5 };
      }
    }
  });

  const rQty = ws.addRow(['Total Net Qty Generated', data.totalQtyGenerated, data.totalQty, data.hoExcludedQty || 0, '', '']);
  rQty.height = 20;
  ws.mergeCells('D7:F7');
  rQty.eachCell((cell: any, colIdx: number) => {
    if (colIdx <= 4) {
      cell.border = borderAll();
      cell.font   = { name: 'Arial', size: 9.5 };
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
      if (colIdx === 1) { cell.alignment = { vertical: 'middle', horizontal: 'left' }; }
      else {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt    = '#,##0';
        if (colIdx === 2) cell.font = { name: 'Arial', bold: true, size: 9.5 };
      }
    }
  });

  ws.addRow([]); ws.addRow([]);

  const adjStartRow = ws.rowCount + 1;
  ws.mergeCells(`A${adjStartRow}:F${adjStartRow}`);
  const secRow2 = ws.addRow(['BOUTIQUE PERFORMANCE ADJUSTMENT SUMMARY']);
  secRow2.getCell(1).font = { name: 'Arial', bold: true, size: 10.5, color: { argb: 'FF' + C.navyBg } };
  ws.getRow(adjStartRow).height = 24;

  const adjHdrRow = ws.addRow(['Boutique Location', 'Physical Sales', 'Adjusted Sales', 'Net Impact', 'Variance %', '']);
  adjHdrRow.height = 22;
  ws.mergeCells(`E${adjStartRow + 1}:F${adjStartRow + 1}`);
  adjHdrRow.eachCell((cell: any, colIdx: number) => {
    if (colIdx <= 5) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.slateBg } };
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.slateText }, size: 9 };
      cell.border = borderAll(C.slateBg);
      cell.alignment = { vertical: 'middle', horizontal: colIdx === 1 ? 'left' : colIdx === 5 ? 'center' : 'right' };
    }
  });

  storeCards.forEach((sc, idx) => {
    const rowIdx = ws.rowCount + 1;
    const row = ws.addRow([sc.store, sc.physical, sc.adjusted, sc.impact, sc.varPct / 100, '']);
    row.height = 20;
    ws.mergeCells(`E${rowIdx}:F${rowIdx}`);
    row.eachCell((cell: any, colIdx: number) => {
      if (colIdx <= 5) {
        cell.border = borderAll();
        cell.font   = { name: 'Arial', size: 9.5 };
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
        if (colIdx === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.font      = { name: 'Arial', bold: true, size: 9.5 };
        } else if (colIdx >= 2 && colIdx <= 4) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt    = numFmt;
          if (colIdx === 4) cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + (sc.impact >= 0 ? C.greenText : C.redText) } };
        } else if (colIdx === 5) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.numFmt    = pctFmt;
          cell.font      = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + (sc.impact >= 0 ? C.greenText : C.redText) } };
        }
      }
    });
  });

  ws.addRow([]); ws.addRow([]);

  const actStartRow = ws.rowCount + 1;
  ws.mergeCells(`A${actStartRow}:F${actStartRow}`);
  const secRow3 = ws.addRow(['CROSSING ACTIVITY DETAILS']);
  secRow3.getCell(1).font = { name: 'Arial', bold: true, size: 10.5, color: { argb: 'FF' + C.navyBg } };
  ws.getRow(actStartRow).height = 24;

  const actHdrRow = ws.addRow(['Sales Advisor', 'Base Location', '', 'Crossing Destination', 'Net Sales Generated', 'Qty (pcs)']);
  actHdrRow.height = 22;
  actHdrRow.eachCell((cell: any, colIdx: number) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.slateBg } };
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.slateText }, size: 9 };
    cell.border = borderAll(C.slateBg);
    cell.alignment = { vertical: 'middle', horizontal: [1, 2, 4].includes(colIdx) ? 'left' : colIdx === 3 || colIdx === 6 ? 'center' : 'right' };
  });

  if (data.records.length === 0) {
    const row = ws.addRow(['No crossing sales recorded for this period', '', '', '', '', '']);
    row.height = 24;
    ws.mergeCells(`A${ws.rowCount}:F${ws.rowCount}`);
    Object.assign(row.getCell(1), {
      alignment: { horizontal: 'center', vertical: 'middle' },
      font: { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } },
      border: borderAll(),
    });
  } else {
    data.records.forEach((rec, idx) => {
      const row = ws.addRow([rec.salesman, rec.baseLoc, '→', rec.crossingLoc, rec.net, rec.qty]);
      row.height = 20;
      row.eachCell((cell: any, colIdx: number) => {
        cell.border = borderAll();
        cell.font   = { name: 'Arial', size: 9 };
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
        if (colIdx === 1) { cell.alignment = { vertical: 'middle', horizontal: 'left' }; cell.font = { name: 'Arial', bold: true, size: 9 }; }
        else if (colIdx === 2 || colIdx === 4) cell.alignment = { vertical: 'middle', horizontal: 'left' };
        else if (colIdx === 3) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.font = { name: 'Arial', color: { argb: 'FF94A3B8' }, size: 9 }; }
        else if (colIdx === 5) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
        else if (colIdx === 6) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.numFmt = '#,##0'; }
      });
    });

    const totRowIdx = ws.rowCount + 1;
    const totRow    = ws.addRow(['Total Crossing Sales', '', '', '', data.totalNet, data.totalQty]);
    totRow.height   = 22;
    ws.mergeCells(`A${totRowIdx}:D${totRowIdx}`);
    totRow.eachCell({ includeEmpty: true }, (cell: any, colIdx: number) => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
      cell.border = borderAll(C.slateBg);
      cell.font   = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF' + C.navyBg } };
      if (colIdx === 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
      else if (colIdx === 5) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
      else if (colIdx === 6) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.numFmt = '#,##0'; }
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(buffer as ArrayBuffer, `Crossing_Sales_Report_${month}_${year}.xlsx`);
}

// ── Store Adjusted Performance ────────────────────────────────────────────────

export async function exportAdjustedExcel(year: string): Promise<void> {
  const yr           = parseInt(year);
  const allMonthData = await Promise.all(MONTHS.map(m => dashboardService.getCrossingSalesData(m, yr)));

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MRA Retail BI Dashboard';
  wb.created = new Date();

  const numFmt = '#,##0;[Red](#,##0);"-"';
  const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

  const ws = wb.addWorksheet('Store Performance', { views: [{ showGridLines: true }] });
  ws.columns = [{ width: 16 }, { width: 24 }, { width: 24 }, { width: 24 }, { width: 22 }];

  ws.mergeCells('A1:E1');
  Object.assign(ws.getCell('A1'), {
    value: `BVLGARI — STORE PERFORMANCE ${year}`,
    font: { name: 'Georgia', bold: true, size: 14, color: { argb: 'FF' + C.navyBg } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  ws.getRow(1).height = 34;

  ws.mergeCells('A2:E2');
  Object.assign(ws.getCell('A2'), {
    value: 'Store Performance (Physical Sales + Incoming − Outgoing) (Rp)',
    font: { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  ws.getRow(2).height = 18;
  ws.addRow([]);

  const hdr = ws.addRow(['Month', ...STORES, 'Total Adjusted']);
  hdr.height = 22;
  hdr.eachCell((cell: any) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 };
    cell.border = borderAll(C.navyBg);
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
  });
  hdr.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  const grandTotals: Record<string, number> = { 'Plaza Indonesia': 0, 'Plaza Senayan': 0, 'Bali': 0, total: 0 };

  allMonthData.forEach((md, idx) => {
    const byAdj: Record<string, number> = {};
    Object.entries(md.storeStats).forEach(([store, stats]) => { byAdj[store] = stats.adjusted; });
    const rowTotal = Object.values(byAdj).reduce((s, v) => s + v, 0);
    const row = ws.addRow([
      MONTHS[idx].substring(0, 3),
      byAdj['Plaza Indonesia'] || 0,
      byAdj['Plaza Senayan']   || 0,
      byAdj['Bali']            || 0,
      rowTotal,
    ]);
    row.height = 19;
    row.eachCell((cell: any, col: number) => {
      cell.border = borderAll();
      cell.font   = { name: 'Arial', size: 9.5 };
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
      if (col === 1) { cell.font = { name: 'Arial', bold: true, size: 9.5 }; cell.alignment = { vertical: 'middle', horizontal: 'left' }; }
      else { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
    });
    STORES.forEach(s => { grandTotals[s] = (grandTotals[s] || 0) + (byAdj[s] || 0); });
    grandTotals.total += rowTotal;
  });

  const totRow = ws.addRow(['TOTAL', grandTotals['Plaza Indonesia'], grandTotals['Plaza Senayan'], grandTotals['Bali'], grandTotals.total]);
  totRow.height = 22;
  totRow.eachCell((cell: any, col: number) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C2.accentBg } };
    cell.border = borderAll(C.slateBg);
    cell.font   = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
    if (col === 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
    else { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
  });

  const canvas  = generateLineGraphCanvas(allMonthData, yr);
  const imageId = wb.addImage({ base64: canvas.toDataURL('image/png'), extension: 'png' });
  ws.addImage(imageId, { tl: { col: 0, row: 19 }, ext: { width: 680, height: 340 } });

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(buffer as ArrayBuffer, `Store_Performance_${year}.xlsx`);
}

// ── Jan-Jun Comparison 2023-2026 ──────────────────────────────────────────────

export async function exportComparisonExcel(): Promise<void> {
  const [res2023, res2024, res2025, res2026] = await Promise.all([
    Promise.all(MONTHS.slice(0, 6).map(m => dashboardService.getCrossingSalesData(m, 2023))),
    Promise.all(MONTHS.slice(0, 6).map(m => dashboardService.getCrossingSalesData(m, 2024))),
    Promise.all(MONTHS.slice(0, 6).map(m => dashboardService.getCrossingSalesData(m, 2025))),
    Promise.all(MONTHS.slice(0, 6).map(m => dashboardService.getCrossingSalesData(m, 2026))),
  ]);

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MRA Retail BI Dashboard';
  wb.created = new Date();

  const numFmt = 'Rp #,##0;[Red](Rp #,##0);"-"';
  const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

  const ws = wb.addWorksheet('Jan-Jun Comparison', { views: [{ showGridLines: true }] });
  ws.columns = [
    { width: 14 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
    { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
    { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
    { width: 17 }, { width: 17 }, { width: 17 }, { width: 17 },
  ];

  ws.mergeCells('A1:Q1');
  Object.assign(ws.getCell('A1'), {
    value: 'BVLGARI — SALES PERFORMANCE COMPARISON (JAN-JUN)',
    font: { name: 'Georgia', bold: true, size: 14, color: { argb: 'FF' + C.navyBg } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  ws.getRow(1).height = 34;

  ws.mergeCells('A2:Q2');
  Object.assign(ws.getCell('A2'), {
    value: 'Comparison of Store Adjusted Net Sales (Physical + Incoming − Outgoing) — Years 2023 - 2026',
    font: { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  ws.getRow(2).height = 18;
  ws.addRow([]);

  const r4 = ws.getRow(4);
  r4.height = 24;
  ws.mergeCells('A4:A5');
  r4.getCell(1).value  = 'MONTH';
  ws.mergeCells('B4:E4');   r4.getCell(2).value  = 'PLAZA INDONESIA';
  ws.mergeCells('F4:I4');   r4.getCell(6).value  = 'PLAZA SENAYAN';
  ws.mergeCells('J4:M4');   r4.getCell(10).value = 'BALI';
  ws.mergeCells('N4:Q4');   r4.getCell(14).value = 'TOTAL';

  const r5 = ws.getRow(5);
  r5.height = 20;
  [2, 6, 10, 14].forEach(colIdx => {
    r5.getCell(colIdx).value     = '2023';
    r5.getCell(colIdx + 1).value = '2024';
    r5.getCell(colIdx + 2).value = '2025';
    r5.getCell(colIdx + 3).value = '2026';
  });

  [4, 5].forEach(rowNum => {
    ws.getRow(rowNum).eachCell({ includeEmpty: true }, (cell: any, colIdx: number) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (colIdx <= 1 || colIdx > 13 ? C.navyBg : C.slateBg) } };
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border    = borderAll();
    });
  });

  const storeTotals: Record<string, { s2023: number; s2024: number; s2025: number; s2026: number }> = {
    'Plaza Indonesia': { s2023: 0, s2024: 0, s2025: 0, s2026: 0 },
    'Plaza Senayan':   { s2023: 0, s2024: 0, s2025: 0, s2026: 0 },
    'Bali':            { s2023: 0, s2024: 0, s2025: 0, s2026: 0 },
  };

  for (let idx = 0; idx < 6; idx++) {
    const get = (dataset: typeof res2023, store: string) => dataset[idx].storeStats[store]?.adjusted || 0;

    const pi23 = get(res2023, 'Plaza Indonesia'), pi24 = get(res2024, 'Plaza Indonesia');
    const pi25 = get(res2025, 'Plaza Indonesia'), pi26 = get(res2026, 'Plaza Indonesia');
    const ps23 = get(res2023, 'Plaza Senayan'),   ps24 = get(res2024, 'Plaza Senayan');
    const ps25 = get(res2025, 'Plaza Senayan'),   ps26 = get(res2026, 'Plaza Senayan');
    const bl23 = get(res2023, 'Bali'), bl24 = get(res2024, 'Bali');
    const bl25 = get(res2025, 'Bali'), bl26 = get(res2026, 'Bali');

    const row = ws.addRow([
      MONTHS[idx].toUpperCase(),
      pi23, pi24, pi25, pi26,
      ps23, ps24, ps25, ps26,
      bl23, bl24, bl25, bl26,
      pi23 + ps23 + bl23, pi24 + ps24 + bl24, pi25 + ps25 + bl25, pi26 + ps26 + bl26,
    ]);
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell: any, colIdx: number) => {
      cell.border = borderAll();
      cell.font   = { name: 'Arial', size: 9 };
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
      if (colIdx === 1) { cell.font = { name: 'Arial', bold: true, size: 9 }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; }
      else { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
    });

    storeTotals['Plaza Indonesia'].s2023 += pi23; storeTotals['Plaza Indonesia'].s2024 += pi24;
    storeTotals['Plaza Indonesia'].s2025 += pi25; storeTotals['Plaza Indonesia'].s2026 += pi26;
    storeTotals['Plaza Senayan'].s2023   += ps23; storeTotals['Plaza Senayan'].s2024   += ps24;
    storeTotals['Plaza Senayan'].s2025   += ps25; storeTotals['Plaza Senayan'].s2026   += ps26;
    storeTotals['Bali'].s2023            += bl23; storeTotals['Bali'].s2024            += bl24;
    storeTotals['Bali'].s2025            += bl25; storeTotals['Bali'].s2026            += bl26;
  }

  const { s2023: gpi23, s2024: gpi24, s2025: gpi25, s2026: gpi26 } = storeTotals['Plaza Indonesia'];
  const { s2023: gps23, s2024: gps24, s2025: gps25, s2026: gps26 } = storeTotals['Plaza Senayan'];
  const { s2023: gbl23, s2024: gbl24, s2025: gbl25, s2026: gbl26 } = storeTotals['Bali'];

  const totRow = ws.addRow([
    'TOTAL',
    gpi23, gpi24, gpi25, gpi26,
    gps23, gps24, gps25, gps26,
    gbl23, gbl24, gbl25, gbl26,
    gpi23 + gps23 + gbl23, gpi24 + gps24 + gbl24,
    gpi25 + gps25 + gbl25, gpi26 + gps26 + gbl26,
  ]);
  totRow.height = 24;
  totRow.eachCell({ includeEmpty: true }, (cell: any, colIdx: number) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C2.accentBg } };
    cell.border = borderAll(C.slateBg);
    cell.font   = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyBg } };
    if (colIdx === 1) cell.alignment = { vertical: 'middle', horizontal: 'center' };
    else { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
  });

  const canvas  = generateComparisonGraphCanvas(res2023, res2024, res2025, res2026);
  const imageId = wb.addImage({ base64: canvas.toDataURL('image/png'), extension: 'png' });
  ws.addImage(imageId, { tl: { col: 0, row: 15 }, ext: { width: 780, height: 390 } });

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(buffer as ArrayBuffer, 'Sales_Comparison_Jan_Jun_2023_2026.xlsx');
}

// ── Annual Summary (Incoming / Outgoing / Adjusted + Flow Matrix) ─────────────

export async function exportAnnualExcel(year: string): Promise<void> {
  const yr           = parseInt(year);
  const allMonthData = await Promise.all(MONTHS.map(m => dashboardService.getCrossingSalesData(m, yr)));

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MRA Retail BI Dashboard';
  wb.created = new Date();

  const numFmt = '#,##0;[Red](#,##0);"-"';
  const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

  const addSectionHeader = (ws: any, text: string, rowIdx: number, lastCol: string) => {
    ws.mergeCells(`A${rowIdx}:${lastCol}${rowIdx}`);
    Object.assign(ws.getCell(`A${rowIdx}`), {
      value: text,
      font: { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } },
      alignment: { vertical: 'middle', horizontal: 'left' },
    });
    ws.getRow(rowIdx).height = 22;
  };

  const addMatrixSection = (
    ws: any,
    sectionLabel: string,
    hdrColor: string,
    extractFn: (md: CrossingSalesData) => Record<string, number>,
  ) => {
    const secRow = ws.rowCount + 1;
    addSectionHeader(ws, sectionLabel, secRow, 'E');

    const hdr = ws.addRow(['Month', ...STORES, 'Total Crossing']);
    hdr.height = 20;
    hdr.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hdrColor } };
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      cell.border = borderAll(hdrColor);
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });
    hdr.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

    const grandTotals: Record<string, number> = { 'Plaza Indonesia': 0, 'Plaza Senayan': 0, 'Bali': 0, total: 0 };

    allMonthData.forEach((md, idx) => {
      const byLoc    = extractFn(md);
      const rowTotal = Object.values(byLoc).reduce((s, v) => s + v, 0);
      const row      = ws.addRow([MONTHS[idx].substring(0, 3), byLoc['Plaza Indonesia'] || 0, byLoc['Plaza Senayan'] || 0, byLoc['Bali'] || 0, rowTotal]);
      row.height = 18;
      row.eachCell((cell: any, col: number) => {
        cell.border = borderAll();
        cell.font   = { name: 'Arial', size: 9 };
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
        if (col === 1) { cell.font = { name: 'Arial', bold: true, size: 9 }; cell.alignment = { vertical: 'middle', horizontal: 'left' }; }
        else { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
      });
      STORES.forEach(s => { grandTotals[s] = (grandTotals[s] || 0) + (byLoc[s] || 0); });
      grandTotals.total += rowTotal;
    });

    const totRow = ws.addRow(['TOTAL', grandTotals['Plaza Indonesia'], grandTotals['Plaza Senayan'], grandTotals['Bali'], grandTotals.total]);
    totRow.height = 22;
    totRow.eachCell((cell: any, col: number) => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C2.accentBg } };
      cell.border = borderAll(C.slateBg);
      cell.font   = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyBg } };
      if (col === 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
      else { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
    });

    ws.addRow([]); ws.addRow([]);
  };

  // Sheet 1: Annual Summary
  const ws = wb.addWorksheet('Annual Summary', { views: [{ showGridLines: true }] });
  ws.columns = [{ width: 16 }, { width: 24 }, { width: 24 }, { width: 24 }, { width: 22 }];

  ws.mergeCells('A1:E1');
  Object.assign(ws.getCell('A1'), {
    value: `BVLGARI — CROSSING SALES ANNUAL SUMMARY ${year}`,
    font: { name: 'Georgia', bold: true, size: 14, color: { argb: 'FF' + C.navyBg } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  ws.getRow(1).height = 34;

  ws.mergeCells('A2:E2');
  Object.assign(ws.getCell('A2'), {
    value: 'Crossing Net Sales by Location — Full Year View (Rp)',
    font: { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  ws.getRow(2).height = 18;
  ws.addRow([]);

  addMatrixSection(ws, 'A. CROSSING INCOMING — BY DESTINATION LOCATION', C.navyBg, (md) => {
    const byDest: Record<string, number> = {};
    md.records.forEach(r => { byDest[r.crossingLoc] = (byDest[r.crossingLoc] || 0) + r.net; });
    return byDest;
  });

  addMatrixSection(ws, 'B. CROSSING OUTGOING — BY BASE (HOME) LOCATION', C.slateBg, (md) => {
    const byBase: Record<string, number> = {};
    md.records.forEach(r => { byBase[r.baseLoc] = (byBase[r.baseLoc] || 0) + r.net; });
    return byBase;
  });

  addMatrixSection(ws, 'C. STORE ADJUSTED PERFORMANCE (Physical + Incoming − Outgoing)', C.slateBg, (md) => {
    const byAdj: Record<string, number> = {};
    Object.entries(md.storeStats).forEach(([store, stats]) => { byAdj[store] = stats.adjusted; });
    return byAdj;
  });

  // Sheet 2: Flow Matrix
  const ws2 = wb.addWorksheet('Flow Matrix', { views: [{ showGridLines: true }] });
  ws2.columns = [{ width: 24 }, { width: 6 }, { width: 24 }, { width: 24 }, { width: 14 }];

  ws2.mergeCells('A1:E1');
  Object.assign(ws2.getCell('A1'), {
    value: `BVLGARI — CROSSING FLOW MATRIX ${year}`,
    font: { name: 'Georgia', bold: true, size: 14, color: { argb: 'FF' + C.navyBg } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  ws2.getRow(1).height = 34;

  ws2.mergeCells('A2:E2');
  Object.assign(ws2.getCell('A2'), {
    value: 'Annual aggregate crossing net sales by Base → Destination flow',
    font: { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  ws2.getRow(2).height = 18;
  ws2.addRow([]);

  const hdr3 = ws2.addRow(['Base Location', '', 'Destination', 'Net Sales (Rp)', 'Qty (pcs)']);
  hdr3.height = 22;
  hdr3.eachCell((cell: any, col: number) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    cell.border = borderAll(C.navyBg);
    cell.alignment = { vertical: 'middle', horizontal: col <= 3 ? 'left' : 'right' };
  });
  hdr3.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

  const flowMap = new Map<string, { baseLoc: string; crossingLoc: string; net: number; qty: number }>();
  allMonthData.forEach(md => {
    md.records.forEach(r => {
      const k = `${r.baseLoc}||${r.crossingLoc}`;
      if (flowMap.has(k)) { flowMap.get(k)!.net += r.net; flowMap.get(k)!.qty += r.qty; }
      else flowMap.set(k, { baseLoc: r.baseLoc, crossingLoc: r.crossingLoc, net: r.net, qty: r.qty });
    });
  });

  let grandNet = 0, grandQty = 0;
  Array.from(flowMap.values()).sort((a, b) => b.net - a.net).forEach((f, idx) => {
    const row = ws2.addRow([f.baseLoc, '→', f.crossingLoc, f.net, f.qty]);
    row.height = 20;
    row.eachCell((cell: any, col: number) => {
      cell.border = borderAll();
      cell.font   = { name: 'Arial', size: 9.5 };
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
      if (col === 1) { cell.font = { name: 'Arial', bold: true, size: 9.5 }; cell.alignment = { vertical: 'middle', horizontal: 'left' }; }
      else if (col === 2) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF94A3B8' } }; }
      else if (col === 3) cell.alignment = { vertical: 'middle', horizontal: 'left' };
      else if (col === 4) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
      else { cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.numFmt = '#,##0'; }
    });
    grandNet += f.net; grandQty += f.qty;
  });

  const gRow = ws2.addRow(['TOTAL', '', '', grandNet, grandQty]);
  gRow.height = 22;
  ws2.mergeCells(`A${ws2.rowCount}:C${ws2.rowCount}`);
  gRow.eachCell({ includeEmpty: true }, (cell: any, col: number) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C2.accentBg } };
    cell.border = borderAll(C.slateBg);
    cell.font   = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyBg } };
    if (col === 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
    else if (col === 4) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
    else if (col === 5) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.numFmt = '#,##0'; }
  });

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(buffer as ArrayBuffer, `Crossing_Sales_Annual_Summary_${year}.xlsx`);
}

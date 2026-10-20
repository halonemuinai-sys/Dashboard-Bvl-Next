import type { getDailyReport } from '@/services/dashboard/dailyService';

export type DailyReport = Awaited<ReturnType<typeof getDailyReport>>;
export type DailyStore = DailyReport['stores'][number];

/** "2026-10-20" → a Date at local midnight (never shifted by UTC parsing). */
export const parseReportDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const longReportDate = (date: string) =>
  parseReportDate(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return window.btoa(binary);
}

/** Renders the off-screen #pdf-document element into a one-page A4 PDF. */
export async function renderDailyPdf() {
  const html2canvas = (await import('html2canvas-pro')).default;
  const { jsPDF } = await import('jspdf');
  const element = document.getElementById('pdf-document');
  if (!element) return null;
  element.style.left = '0';
  element.style.top = '0';
  element.style.position = 'absolute';
  element.style.zIndex = '-100';
  try {
    const canvas = await html2canvas(element, { scale: 2.0, useCORS: true, windowWidth: 794 });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    let drawWidth = pdfWidth;
    let drawHeight = (canvas.height * pdfWidth) / canvas.width;
    if (drawHeight > pdfHeight) {
      drawHeight = pdfHeight;
      drawWidth = (canvas.width * pdfHeight) / canvas.height;
    }
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', (pdfWidth - drawWidth) / 2, 0, drawWidth, drawHeight);
    return pdf;
  } finally {
    element.style.left = '-9999px';
  }
}

export function whatsappMessage(data: DailyReport, date: string, origin: string) {
  const k = data.globalKPIs;
  return `*🏢 BVLGARI DAILY SALES REPORT*\n` +
    `📅 ${longReportDate(date)}\n\n` +
    `📊 *GLOBAL OVERVIEW*\n` +
    `• Total Sales: Rp ${k.totalSales.toLocaleString('id-ID')}\n` +
    `• Achievement: *${k.globalAchievement.toFixed(1)}%*\n` +
    `• MTD Cost %: ${k.mtdCostPct.toFixed(1)}%\n\n` +
    `🏪 *STORE PERFORMANCE*\n` +
    data.stores.map(s => `• *${s.storeName}*: ${s.metrics.achievement.toFixed(1)}% Ach.`).join('\n') +
    `\n\n_Generated via Bvlgari Dashboard - MRA Retail_\n` +
    `🔗 View Online: ${origin}/daily-report?date=${date}`;
}

export async function buildDailyExcelWorkbook(data: DailyReport, date: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MRA Retail BI Dashboard';
  wb.created = new Date();

  const C = {
    navyBg: '1E3A5F', navyText: 'FFFFFF', slateBg: '475569', slateText: 'FFFFFF',
    lightBg: 'F8FAFC', accentBg: 'F1F5F9', border: 'E2E8F0',
    greenText: '059669', amberText: 'D97706', redText: 'DC2626',
  };
  const thinBorder = (color: string) => ({ style: 'thin' as const, color: { argb: 'FF' + color } });
  const borderAll = (color = C.border) => ({ top: thinBorder(color), bottom: thinBorder(color), left: thinBorder(color), right: thinBorder(color) });
  const numFmt = 'Rp #,##0;[Red](Rp #,##0);"-"';
  const pctFmt = '0.0%';
  const formattedDate = longReportDate(date);

  // SHEET 1: Overview
  const wsOverview = wb.addWorksheet('Overview', { views: [{ showGridLines: true }] });
  wsOverview.columns = [{ width: 26 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 14 }];

  wsOverview.mergeCells('A1:I1');
  const titleCell = wsOverview.getCell('A1');
  titleCell.value = 'BVLGARI - DAILY SALES REPORT';
  titleCell.font = { name: 'Georgia', bold: true, size: 16, color: { argb: 'FF' + C.navyBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsOverview.getRow(1).height = 36;

  wsOverview.mergeCells('A2:I2');
  const dateCell = wsOverview.getCell('A2');
  dateCell.value = formattedDate;
  dateCell.font = { name: 'Arial', italic: true, size: 10, color: { argb: 'FF64748B' } };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsOverview.getRow(2).height = 20;
  wsOverview.addRow([]);

  const secRow1 = wsOverview.addRow(['GLOBAL OVERVIEW']);
  secRow1.getCell(1).font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF' + C.navyBg } };
  wsOverview.mergeCells('A4:I4');
  wsOverview.getRow(4).height = 24;

  const gHdrRow = wsOverview.addRow(['Metric Name', 'MTD Value', 'Target / Status', 'Achievement %', 'Cost % (MTD)', 'Average Discount']);
  gHdrRow.height = 26;
  gHdrRow.eachCell((cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.navyText }, size: 9.5 };
    cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'right' };
    cell.border = borderAll(C.navyBg);
  });

  const kpis = data.globalKPIs;
  const kpiRows = [
    ['Total Sales (Incl. HO)', kpis.totalSales, kpis.globalTarget, kpis.globalAchievement / 100, kpis.mtdCostPct / 100, kpis.avgDiscMtd / 100],
    ['Store Sales (Excl. HO)', kpis.storeSales, `Growth: ${kpis.storeSalesGrowth >= 0 ? '+' : ''}${kpis.storeSalesGrowth.toFixed(1)}%`, '-', '-', '-'],
  ];
  kpiRows.forEach((kRowData, idx) => {
    const row = wsOverview.addRow(kRowData);
    row.height = 22;
    row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      cell.border = borderAll();
      cell.font = { name: 'Arial', size: 10 };
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
      if (colIdx === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colIdx === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = numFmt;
      } else if (colIdx === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (typeof cell.value === 'number') cell.numFmt = numFmt;
        else { cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.font = { name: 'Arial', size: 10, bold: true }; }
      } else if (colIdx === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (typeof cell.value === 'number') {
          cell.numFmt = pctFmt;
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF' + (cell.value >= 1.0 ? C.greenText : C.amberText) } };
        } else cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colIdx === 5 || colIdx === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (typeof cell.value === 'number') cell.numFmt = pctFmt;
        else cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  });

  wsOverview.addRow([]);
  wsOverview.addRow([]);
  const boutiqueStartRow = wsOverview.rowCount + 1;
  const secRow2 = wsOverview.addRow(['BOUTIQUE PERFORMANCE SUMMARY']);
  secRow2.getCell(1).font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF' + C.navyBg } };
  wsOverview.mergeCells(`A${boutiqueStartRow}:I${boutiqueStartRow}`);
  wsOverview.getRow(boutiqueStartRow).height = 24;

  const bHdrRow = wsOverview.addRow(['Boutique Name', "Today's Sales", 'MTD Sales', 'MTD Target', 'Achv %', 'Rem. to Target', 'MTD Cost %', 'MTD MDR %', 'Avg Disc MTD']);
  bHdrRow.height = 26;
  bHdrRow.eachCell((cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.slateBg } };
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.slateText }, size: 9.5 };
    cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'right' };
    cell.border = borderAll(C.slateBg);
  });

  data.stores.forEach((store, idx) => {
    const row = wsOverview.addRow([
      store.storeName, store.metrics.todaySales, store.metrics.mtdSales, store.metrics.target, store.metrics.achievement / 100,
      store.metrics.remaining, store.metrics.mtdCostPct / 100, store.metrics.mtdMdrPct / 100, store.metrics.avgDiscMtd / 100,
    ]);
    row.height = 22;
    row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      cell.border = borderAll();
      cell.font = { name: 'Arial', size: 9.5 };
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
      if (colIdx === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
        cell.font = { name: 'Arial', bold: true, size: 9.5 };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (colIdx === 2 || colIdx === 3 || colIdx === 4 || colIdx === 6) cell.numFmt = numFmt;
        else if (colIdx === 5) {
          cell.numFmt = pctFmt;
          const val = cell.value as number;
          cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + (val >= 1.0 ? C.greenText : val >= 0.8 ? C.amberText : C.redText) } };
        } else cell.numFmt = pctFmt;
      }
    });
  });

  const storeTotalSalesToday = data.stores.reduce((acc, s) => acc + s.metrics.todaySales, 0);
  const storeTotalSalesMtd = data.stores.reduce((acc, s) => acc + s.metrics.mtdSales, 0);
  const storeTotalTarget = data.stores.reduce((acc, s) => acc + s.metrics.target, 0);
  const storeTotalRemaining = data.stores.reduce((acc, s) => acc + s.metrics.remaining, 0);
  const overallAchv = storeTotalTarget > 0 ? storeTotalSalesMtd / storeTotalTarget : 0;

  const totRow = wsOverview.addRow(['Total Boutiques', storeTotalSalesToday, storeTotalSalesMtd, storeTotalTarget, overallAchv, storeTotalRemaining, '-', '-', '-']);
  totRow.height = 24;
  totRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
    cell.border = borderAll(C.slateBg);
    cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
    if (colIdx === 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
    else {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      if (colIdx === 2 || colIdx === 3 || colIdx === 4 || colIdx === 6) cell.numFmt = numFmt;
      else if (colIdx === 5) cell.numFmt = pctFmt;
      else cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  // SHEET 2: Boutique Category Details
  const wsDetails = wb.addWorksheet('Boutique Category Details', { views: [{ showGridLines: true }] });
  wsDetails.columns = [{ width: 22 }, { width: 14 }, { width: 20 }, { width: 20 }, { width: 16 }, { width: 16 }];
  wsDetails.mergeCells('A1:F1');
  const detTitleCell = wsDetails.getCell('A1');
  detTitleCell.value = 'BOUTIQUE CATEGORY BREAKDOWNS';
  detTitleCell.font = { name: 'Georgia', bold: true, size: 14, color: { argb: 'FF' + C.navyBg } };
  detTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsDetails.getRow(1).height = 32;
  wsDetails.mergeCells('A2:F2');
  const detDateCell = wsDetails.getCell('A2');
  detDateCell.value = `As of ${formattedDate}`;
  detDateCell.font = { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } };
  detDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsDetails.getRow(2).height = 18;
  wsDetails.addRow([]);

  data.stores.forEach(store => {
    const sHeaderRowIdx = wsDetails.rowCount + 1;
    const storeBanner = wsDetails.addRow([store.storeName.toUpperCase()]);
    storeBanner.height = 24;
    wsDetails.mergeCells(`A${sHeaderRowIdx}:F${sHeaderRowIdx}`);
    storeBanner.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
    storeBanner.getCell(1).font = { name: 'Arial', bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } };
    storeBanner.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    const miniSummaryRow = wsDetails.addRow([
      `Today Sales: Rp ${store.metrics.todaySales.toLocaleString('id-ID')} | Qty: ${store.metrics.todayQty} pcs`, '',
      `MTD: Rp ${store.metrics.mtdSales.toLocaleString('id-ID')} / Rp ${store.metrics.target.toLocaleString('id-ID')}`, '',
      `Achv: ${store.metrics.achievement.toFixed(1)}% | MTD Cost: ${store.metrics.mtdCostPct.toFixed(1)}%`, '',
    ]);
    miniSummaryRow.height = 20;
    wsDetails.mergeCells(`A${sHeaderRowIdx + 1}:B${sHeaderRowIdx + 1}`);
    wsDetails.mergeCells(`C${sHeaderRowIdx + 1}:D${sHeaderRowIdx + 1}`);
    wsDetails.mergeCells(`E${sHeaderRowIdx + 1}:F${sHeaderRowIdx + 1}`);
    miniSummaryRow.eachCell({ includeEmpty: false }, cell => {
      cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF475569' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = borderAll();
    });

    const tHdrRow = wsDetails.addRow(['Category', 'Qty (Sold)', 'Reg Sales', 'SMI Sales', 'Disc %', 'Rem. Stock']);
    tHdrRow.height = 22;
    tHdrRow.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.slateBg } };
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.slateText }, size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : colNumber === 2 || colNumber === 5 || colNumber === 6 ? 'center' : 'right' };
      cell.border = borderAll(C.slateBg);
    });

    const catData = Object.entries(store.tableData);
    catData.forEach(([cat, vals], catIdx) => {
      const discPct = vals.gross > 0 ? vals.valDisc / vals.gross : 0;
      const row = wsDetails.addRow([cat, vals.qty, vals.netNonSMI, vals.netSMI, discPct, vals.stock]);
      row.height = 20;
      row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        cell.border = borderAll();
        cell.font = { name: 'Arial', size: 9 };
        if (catIdx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
        if (colIdx === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.font = { name: 'Arial', bold: true, size: 9 };
        } else if (colIdx === 2) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.numFmt = '#,##0';
        } else if (colIdx === 3 || colIdx === 4) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = numFmt;
        } else if (colIdx === 5) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.numFmt = pctFmt;
          if (discPct > 0) cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF' + C.amberText } };
        } else if (colIdx === 6) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.numFmt = '#,##0';
          cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF' + C.redText } };
        }
      });
    });

    const sum = (pick: (v: (typeof catData)[number][1]) => number) => catData.reduce((acc, [, v]) => acc + pick(v), 0);
    const storeTotalGross = sum(v => v.gross);
    const totalRow = wsDetails.addRow([
      'Total', sum(v => v.qty), sum(v => v.netNonSMI), sum(v => v.netSMI),
      storeTotalGross > 0 ? sum(v => v.valDisc) / storeTotalGross : 0, sum(v => v.stock),
    ]);
    totalRow.height = 22;
    totalRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
      cell.border = borderAll(C.slateBg);
      cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF' + C.navyBg } };
      if (colIdx === 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
      else if (colIdx === 2 || colIdx === 6) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.numFmt = '#,##0'; }
      else if (colIdx === 3 || colIdx === 4) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
      else if (colIdx === 5) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.numFmt = pctFmt; }
    });
    wsDetails.addRow([]);
    wsDetails.addRow([]);
    wsDetails.addRow([]);
  });

  return wb;
}

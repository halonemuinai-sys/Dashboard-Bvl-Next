import type ExcelJS from 'exceljs';
import { JournalReportPayload } from './types';
import {
  C,
  createTitleHeader,
  thinBorder,
  borderAll,
  doubleBottomBorder,
  numFmt,
  intFmt,
} from './styles';

export function buildSheetExecutiveSynthesis(wb: ExcelJS.Workbook, payload: JournalReportPayload) {
  const ws = wb.addWorksheet('Peak vs Low Analysis', {
    views: [{ showGridLines: true }],
  });

  const { monthName, year, records } = payload;

  createTitleHeader(
    ws,
    'EXECUTIVE OPERATIONAL SYNTHESIS — PEAK & DIP ANALYSIS',
    `Analisis 5 Hari Penjualan Tertinggi vs 5 Hari Terendah Beserta Narasi Lapangan & Konversi: ${monthName} ${year}`,
    9
  );

  // Filter records that have sales > 0 and sort
  const activeDays = records.filter((r) => r.netSales > 0);
  const top5 = [...activeDays].sort((a, b) => b.netSales - a.netSales).slice(0, 5);
  const bottom5 = [...activeDays].sort((a, b) => a.netSales - b.netSales).slice(0, 5);

  // 1. SECTION TOP 5 PEAK DAYS
  ws.mergeCells('A4:I4');
  const topHeader = ws.getCell('A4');
  topHeader.value = '★ TOP 5 HARI PENJUALAN TERTINGGI (PEAK SALES DAYS) & DRIVER LAPANGAN';
  topHeader.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyText } };
  topHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
  topHeader.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(4).height = 24;

  const colHeaders = [
    'Rank',
    'Tanggal',
    'Hari',
    'Net Sales',
    'Qty (pcs)',
    'Trx',
    'Traffic (Customer)',
    'Konversi %',
    'Catatan Lapangan & Driver Penjualan',
  ];
  const r5 = ws.addRow(colHeaders);
  r5.height = 20;
  r5.eachCell((cell) => {
    cell.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF' + C.navyBg } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
    cell.border = borderAll();
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  r5.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  r5.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
  r5.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
  r5.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
  r5.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
  r5.getCell(9).alignment = { horizontal: 'left', vertical: 'middle' };

  top5.forEach((r, idx) => {
    const convVal = r.conversionRate !== null && r.conversionRate !== undefined ? r.conversionRate : null;
    const row = ws.addRow([
      `#${idx + 1}`,
      r.dateStr,
      r.dayName,
      r.netSales,
      r.qty,
      r.transCount,
      r.crmTraffic ?? 0,
      convVal,
      r.note || (r.tags.length > 0 ? `Tags: ${r.tags.join(', ')}` : 'Tidak ada catatan khusus dicatat pada hari ini'),
    ]);
    row.height = 24;
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 8.5 };
      cell.border = borderAll(C.softBorder);
      cell.alignment = { vertical: 'middle' };
      if (colNum === 1 || colNum === 2 || colNum === 3) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (colNum === 4) {
        cell.numFmt = numFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF' + C.greenText } };
      }
      if (colNum === 5 || colNum === 6 || colNum === 7) {
        cell.numFmt = intFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      if (colNum === 8) {
        if (convVal !== null && convVal > 0) {
          cell.numFmt = '0.0%';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF' + C.navyBg } };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.value = '-';
        }
      }
      if (colNum === 9) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
    });
  });

  // Spacer
  ws.addRow([]);

  // 2. SECTION BOTTOM 5 DIP DAYS
  const botRowIdx = ws.rowCount + 1;
  ws.mergeCells(`A${botRowIdx}:I${botRowIdx}`);
  const botHeader = ws.getCell(`A${botRowIdx}`);
  botHeader.value = '▼ 5 HARI PENJUALAN TERENDAH (DIP DAYS) & KENDALA / ANALISIS OPERASIONAL';
  botHeader.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.redText } };
  botHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.redBg } };
  botHeader.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(botRowIdx).height = 24;

  const rBotHeaders = ws.addRow(colHeaders);
  rBotHeaders.height = 20;
  rBotHeaders.eachCell((cell) => {
    cell.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF' + C.redText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.redBg } };
    cell.border = borderAll();
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  rBotHeaders.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  rBotHeaders.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
  rBotHeaders.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
  rBotHeaders.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
  rBotHeaders.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
  rBotHeaders.getCell(9).alignment = { horizontal: 'left', vertical: 'middle' };

  bottom5.forEach((r, idx) => {
    const convVal = r.conversionRate !== null && r.conversionRate !== undefined ? r.conversionRate : null;
    const row = ws.addRow([
      `#${idx + 1}`,
      r.dateStr,
      r.dayName,
      r.netSales,
      r.qty,
      r.transCount,
      r.crmTraffic ?? 0,
      convVal,
      r.note || (r.tags.length > 0 ? `Tags: ${r.tags.join(', ')}` : 'Hari kerja normal dengan footfall minim, belum ada catatan khusus'),
    ]);
    row.height = 24;
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 8.5 };
      cell.border = borderAll(C.softBorder);
      cell.alignment = { vertical: 'middle' };
      if (colNum === 1 || colNum === 2 || colNum === 3) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (colNum === 4) {
        cell.numFmt = numFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF' + C.redText } };
      }
      if (colNum === 5 || colNum === 6 || colNum === 7) {
        cell.numFmt = intFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      if (colNum === 8) {
        if (convVal !== null && convVal > 0) {
          cell.numFmt = '0.0%';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF' + C.navyBg } };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.value = '-';
        }
      }
      if (colNum === 9) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
    });
  });

  // Column Widths
  ws.columns = [
    { width: 8 },  // Rank
    { width: 13 }, // Tanggal
    { width: 10 }, // Hari
    { width: 22 }, // Net Sales
    { width: 10 }, // Qty
    { width: 8 },  // Trx
    { width: 13 }, // Traffic
    { width: 11 }, // Konversi %
    { width: 60 }, // Narasi
  ];
}

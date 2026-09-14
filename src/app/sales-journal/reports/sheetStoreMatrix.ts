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

export function buildSheetStoreMatrix(wb: ExcelJS.Workbook, payload: JournalReportPayload) {
  const ws = wb.addWorksheet('Store Comparative Matrix', {
    views: [{ showGridLines: true }],
  });

  const { monthName, year, records, storeBreakdown } = payload;

  createTitleHeader(
    ws,
    'BOUTIQUE DAILY COMPARATIVE & NOTES MATRIX',
    `Perbandingan performa harian dan catatan operasional antar butik: ${monthName} ${year}`,
    12
  );

  // Group by date across 3 boutiques: Plaza Indonesia, Plaza Senayan, Bali
  const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

  // Super header
  ws.mergeCells('A4:B4');
  ws.getCell('A4').value = 'PERIODE';
  ws.mergeCells('C4:E4');
  ws.getCell('C4').value = 'PLAZA INDONESIA';
  ws.mergeCells('F4:H4');
  ws.getCell('F4').value = 'PLAZA SENAYAN';
  ws.mergeCells('I4:K4');
  ws.getCell('I4').value = 'BALI';
  ws.mergeCells('L4:L4');
  ws.getCell('L4').value = 'TOTAL';

  const superHeaderRow = ws.getRow(4);
  superHeaderRow.height = 20;
  ['A4', 'C4', 'F4', 'I4', 'L4'].forEach((ref) => {
    const cell = ws.getCell(ref);
    cell.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF' + C.navyText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderAll();
  });

  // Secondary header row
  const headers = [
    'Tanggal',
    'Hari',
    'Net Sales',
    'Qty',
    'Catatan / Notes',
    'Net Sales',
    'Qty',
    'Catatan / Notes',
    'Net Sales',
    'Qty',
    'Catatan / Notes',
    'Grand Net Sales',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 22;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF' + C.goldText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.goldBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderAll();
  });

  const piMap = new Map<number, any>();
  const psMap = new Map<number, any>();
  const blMap = new Map<number, any>();

  if (storeBreakdown) {
    (storeBreakdown['Plaza Indonesia'] || []).forEach((r) => piMap.set(r.day, r));
    (storeBreakdown['Plaza Senayan'] || []).forEach((r) => psMap.set(r.day, r));
    (storeBreakdown['Bali'] || []).forEach((r) => blMap.set(r.day, r));
  }

  const startDataRow = headerRow.number + 1;

  records.forEach((r, idx) => {
    const d = r.day;
    const pi = piMap.get(d) || { netSales: 0, qty: 0, note: '-' };
    const ps = psMap.get(d) || { netSales: 0, qty: 0, note: '-' };
    const bl = blMap.get(d) || { netSales: 0, qty: 0, note: '-' };

    const totalDayNet = (pi.netSales || 0) + (ps.netSales || 0) + (bl.netSales || 0) || r.netSales;

    const row = ws.addRow([
      r.dateStr,
      r.dayName,
      pi.netSales || 0,
      pi.qty || 0,
      pi.note || '-',
      ps.netSales || 0,
      ps.qty || 0,
      ps.note || '-',
      bl.netSales || 0,
      bl.qty || 0,
      bl.note || '-',
      totalDayNet,
    ]);

    row.height = 20;
    const isZebra = idx % 2 === 1;

    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 8 };
      cell.border = borderAll(C.softBorder);
      cell.alignment = { vertical: 'middle' };

      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.zebraBg } };
      }

      if (colNum === 1 || colNum === 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNum === 3 || colNum === 6 || colNum === 9 || colNum === 12) {
        cell.numFmt = numFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (colNum === 12) {
          cell.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF' + C.navyBg } };
        }
      }
      if (colNum === 4 || colNum === 7 || colNum === 10) {
        cell.numFmt = intFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      if (colNum === 5 || colNum === 8 || colNum === 11) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        cell.font = { name: 'Arial', size: 7.5, color: { argb: 'FF475569' } };
      }
    });
  });

  // Column Widths
  ws.columns = [
    { width: 13 }, // Tanggal
    { width: 9 },  // Hari
    { width: 17 }, // PI Net
    { width: 8 },  // PI Qty
    { width: 25 }, // PI Note
    { width: 17 }, // PS Net
    { width: 8 },  // PS Qty
    { width: 25 }, // PS Note
    { width: 17 }, // Bali Net
    { width: 8 },  // Bali Qty
    { width: 25 }, // Bali Note
    { width: 19 }, // Grand Net
  ];
}

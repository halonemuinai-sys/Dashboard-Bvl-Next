import type ExcelJS from 'exceljs';
import { JournalReportPayload } from './types';
import {
  C,
  createTitleHeader,
  thinBorder,
  borderAll,
  doubleBottomBorder,
  numFmt,
  pctFmt,
  intFmt,
} from './styles';

export function buildSheetDailyJournal(wb: ExcelJS.Workbook, payload: JournalReportPayload) {
  const ws = wb.addWorksheet('Daily Journal Register', {
    views: [{ showGridLines: true }],
  });

  const { monthName, year, store, records } = payload;

  createTitleHeader(
    ws,
    'BVLGARI INDONESIA — DAILY SALES JOURNAL REGISTER',
    `Periode: ${monthName} ${year} | Butik: ${store === 'ALL' ? 'All Stores (PI, PS, Bali)' : store} | Generated: ${new Date().toLocaleDateString('id-ID')}`,
    15
  );

  // Table Headers
  const headers = [
    'No',
    'Tanggal',
    'Hari',
    'Butik',
    'Net Sales',
    'Qty (pcs)',
    'Trx',
    'Traffic (Customer)',
    'Walk-In',
    'Follow-Up',
    'In-House',
    'Konversi %',
    'DoD Delta %',
    'Kategori Tag',
    'Catatan Naratif Operasional',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF' + C.navyText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = borderAll();
  });

  // Alignment overrides
  headerRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(15).alignment = { horizontal: 'left', vertical: 'middle' };

  const startDataRow = headerRow.number + 1;

  records.forEach((r, idx) => {
    const deltaVal = r.deltaPct !== null ? r.deltaPct / 100 : null;
    const convVal = r.conversionRate !== null && r.conversionRate !== undefined ? r.conversionRate : null;

    const row = ws.addRow([
      idx + 1,
      r.dateStr,
      r.dayName,
      r.store,
      r.netSales,
      r.qty,
      r.transCount,
      r.crmTraffic ?? 0,
      r.walkIn ?? 0,
      r.followUp ?? 0,
      r.inHouse ?? 0,
      convVal,
      deltaVal,
      r.tags && r.tags.length > 0 ? r.tags.join(', ') : (r.hasNote ? 'General' : '-'),
      r.note || '-',
    ]);

    row.height = r.note && r.note.length > 50 ? 36 : 20;

    const isZebra = idx % 2 === 1;
    const isWeekend = r.isWeekend;

    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 8.5 };
      cell.border = borderAll(C.softBorder);
      cell.alignment = { vertical: 'middle' };

      // Background color
      if (isWeekend) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isZebra ? 'FDF2F8' : 'FFF1F2') } };
      } else if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.zebraBg } };
      }

      // Column specific styling
      if (colNum === 1 || colNum === 2 || colNum === 3 || colNum === 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      if (colNum === 5) {
        cell.numFmt = numFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font = { name: 'Arial', size: 8.5, bold: true };
      }

      if (colNum === 6 || colNum === 7 || colNum === 8 || colNum === 9 || colNum === 10 || colNum === 11) {
        cell.numFmt = intFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }

      // Conversion % (Col 12)
      if (colNum === 12) {
        if (convVal !== null && convVal > 0) {
          cell.numFmt = '0.0%';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF' + C.navyBg } };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.value = '-';
        }
      }

      // DoD Delta % (Col 13)
      if (colNum === 13) {
        if (deltaVal !== null) {
          cell.numFmt = pctFmt;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (deltaVal > 0) {
            cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF' + C.greenText } };
          } else if (deltaVal < 0) {
            cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF' + C.redText } };
          }
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.value = '-';
        }
      }

      // Tag (Col 14)
      if (colNum === 14) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (r.hasNote) {
          cell.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FF' + C.blueText } };
        }
      }

      // Note (Col 15)
      if (colNum === 15) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        if (r.hasNote) {
          cell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF0F172A' } };
        } else {
          cell.font = { name: 'Arial', size: 8, italic: true, color: { argb: 'FF94A3B8' } };
        }
      }
    });
  });

  const endDataRow = startDataRow + records.length - 1;

  // Total Summary Row
  const totalRow = ws.addRow([
    'TOTAL',
    '',
    '',
    '',
    { formula: `SUM(E${startDataRow}:E${endDataRow})` },
    { formula: `SUM(F${startDataRow}:F${endDataRow})` },
    { formula: `SUM(G${startDataRow}:G${endDataRow})` },
    { formula: `SUM(H${startDataRow}:H${endDataRow})` },
    { formula: `SUM(I${startDataRow}:I${endDataRow})` },
    { formula: `SUM(J${startDataRow}:J${endDataRow})` },
    { formula: `SUM(K${startDataRow}:K${endDataRow})` },
    { formula: `IF(H${startDataRow + records.length}>0, G${startDataRow + records.length}/H${startDataRow + records.length}, 0)` },
    '',
    `${payload.daysNoted} / ${payload.totalDays} Dicatat`,
    '',
  ]);

  totalRow.height = 24;
  ws.mergeCells(`A${totalRow.number}:D${totalRow.number}`);

  totalRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF' + C.navyBg } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
    cell.border = doubleBottomBorder();
    cell.alignment = { vertical: 'middle' };

    if (colNum === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (colNum === 5) {
      cell.numFmt = numFmt;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
    if (colNum >= 6 && colNum <= 11) {
      cell.numFmt = intFmt;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
    if (colNum === 12) {
      cell.numFmt = '0.0%';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF' + C.navyBg } };
    }
    if (colNum === 14) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF' + C.blueText } };
    }
  });

  // Column Widths
  ws.columns = [
    { width: 5 },   // 1 No
    { width: 13 },  // 2 Tanggal
    { width: 9 },   // 3 Hari
    { width: 16 },  // 4 Butik
    { width: 22 },  // 5 Net Sales
    { width: 10 },  // 6 Qty
    { width: 8 },   // 7 Trx
    { width: 14 },  // 8 Traffic (Customer)
    { width: 10 },  // 9 Walk-In
    { width: 10 },  // 10 Follow-Up
    { width: 11 },  // 11 In-House
    { width: 11 },  // 12 Konversi %
    { width: 13 },  // 13 DoD Delta %
    { width: 18 },  // 14 Kategori Tag
    { width: 60 },  // 15 Catatan Naratif
  ];
}

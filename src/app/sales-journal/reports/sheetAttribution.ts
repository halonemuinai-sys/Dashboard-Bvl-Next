import type ExcelJS from 'exceljs';
import { JournalReportPayload } from './types';
import {
  C,
  createTitleHeader,
  thinBorder,
  borderAll,
  doubleBottomBorder,
  numFmt,
  pctPositiveFmt,
  intFmt,
} from './styles';

export function buildSheetAttribution(wb: ExcelJS.Workbook, payload: JournalReportPayload) {
  const ws = wb.addWorksheet('Operational Drivers', {
    views: [{ showGridLines: true }],
  });

  const { monthName, year, store, records, totalNet } = payload;

  createTitleHeader(
    ws,
    'OPERATIONAL DRIVERS & SALES ATTRIBUTION',
    `Analisa kontribusi operasional (VIP, Event, Cuaca, Stok) terhadap penjualan: ${monthName} ${year}`,
    7
  );

  // Group records by tag categories
  const categories = [
    'VIP Customer',
    'Event',
    'Promo',
    'Weather',
    'Stockout',
    'Staffing',
    'Complaint',
    'Lainnya',
    'Normal / Tanpa Catatan Khusus',
  ];

  const catMap = new Map<string, { days: number; netSales: number; qty: number; notes: string[] }>();
  categories.forEach((c) => catMap.set(c, { days: 0, netSales: 0, qty: 0, notes: [] }));

  records.forEach((r) => {
    if (!r.hasNote || !r.tags || r.tags.length === 0) {
      const entry = catMap.get('Normal / Tanpa Catatan Khusus')!;
      entry.days += 1;
      entry.netSales += r.netSales;
      entry.qty += r.qty;
      return;
    }

    r.tags.forEach((tag) => {
      let key = tag;
      if (!catMap.has(key)) {
        key = 'Lainnya';
      }
      const entry = catMap.get(key)!;
      entry.days += 1;
      entry.netSales += r.netSales;
      entry.qty += r.qty;
      if (r.note && entry.notes.length < 3) {
        entry.notes.push(`[Tgl ${r.day}] ${r.note}`);
      }
    });
  });

  // Table Headers
  const headers = [
    'Kategori Faktor Operasional',
    'Frekuensi (Hari)',
    'Total Net Sales',
    'Rata-rata Net Sales / Hari',
    'Qty (pcs)',
    'Kontribusi Omset (%)',
    'Contoh Catatan Lapangan & Narasi',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF' + C.navyText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderAll();
  });

  headerRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  headerRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
  headerRow.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };

  const startDataRow = headerRow.number + 1;

  categories.forEach((cat, idx) => {
    const data = catMap.get(cat)!;
    if (data.days === 0 && cat !== 'Normal / Tanpa Catatan Khusus' && cat !== 'VIP Customer' && cat !== 'Event') {
      return; // skip empty categories except standard ones
    }

    const avgNet = data.days > 0 ? data.netSales / data.days : 0;
    const share = totalNet > 0 ? data.netSales / totalNet : 0;

    const row = ws.addRow([
      cat,
      data.days,
      data.netSales,
      avgNet,
      data.qty,
      share,
      data.notes.join(' | ') || '-',
    ]);

    row.height = data.notes.length > 0 ? 28 : 20;

    const isZebra = idx % 2 === 1;

    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 8.5 };
      cell.border = borderAll(C.softBorder);
      cell.alignment = { vertical: 'middle' };

      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.zebraBg } };
      }

      if (colNum === 1) {
        cell.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF' + C.navyBg } };
      }
      if (colNum === 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = intFmt;
      }
      if (colNum === 3) {
        cell.numFmt = numFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font = { name: 'Arial', bold: true, size: 8.5 };
      }
      if (colNum === 4) {
        cell.numFmt = numFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      if (colNum === 5) {
        cell.numFmt = intFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      if (colNum === 6) {
        cell.numFmt = pctPositiveFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FF' + C.blueText } };
      }
      if (colNum === 7) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        cell.font = { name: 'Arial', size: 8, color: { argb: 'FF334155' } };
      }
    });
  });

  // Column Widths
  ws.columns = [
    { width: 30 }, // Kategori Driver
    { width: 16 }, // Frekuensi
    { width: 22 }, // Total Net
    { width: 22 }, // Avg Net
    { width: 14 }, // Qty
    { width: 20 }, // Kontribusi
    { width: 60 }, // Catatan
  ];
}

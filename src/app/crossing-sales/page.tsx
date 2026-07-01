"use client";

import { useState, useEffect, useMemo } from 'react';
import { Repeat, Calendar as CalendarIcon, Filter, RefreshCw, ArrowRight, TrendingUp, TrendingDown, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { dashboardService, CrossingSalesData } from '@/services/dashboardService';
import BvlgariLoader from '@/components/BvlgariLoader';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STORE_CONFIG: Record<string, { abbr: string; color: string; bg: string; text: string }> = {
  'Plaza Indonesia': { abbr: 'PI', color: '#2563EB', bg: 'bg-blue-50',    text: 'text-blue-600'   },
  'Plaza Senayan':   { abbr: 'PS', color: '#D97706', bg: 'bg-amber-50',   text: 'text-amber-600'  },
  'Bali':            { abbr: 'BL', color: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

const fmtPct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

export default function CrossingSalesPage() {
  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear]   = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData]   = useState<CrossingSalesData | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingAnnual, setExportingAnnual] = useState(false);

  const handleDownloadExcel = async () => {
    if (!data) return;
    setExportingExcel(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'MRA Retail BI Dashboard';
      wb.created = new Date();

      const C = {
        navyBg:     '1E3A5F',
        navyText:   'FFFFFF',
        slateBg:    '475569',
        slateText:  'FFFFFF',
        lightBg:    'F8FAFC',
        accentBg:   'F1F5F9',
        border:     'E2E8F0',
        greenText:  '059669',
        amberText:  'D97706',
        redText:    'DC2626',
      };

      const thinBorder = (color: string) => ({ style: 'thin' as const, color: { argb: 'FF' + color } });
      const borderAll = (color = C.border) => ({
        top: thinBorder(color), bottom: thinBorder(color),
        left: thinBorder(color), right: thinBorder(color)
      });
      const numFmt = 'Rp #,##0;[Red](Rp #,##0);"-"';
      const pctFmt = '+0.0%;-0.0%;0.0%';

      const ws = wb.addWorksheet('Crossing Sales', {
        views: [{ showGridLines: true }]
      });

      ws.columns = [
        { width: 28 },
        { width: 20 },
        { width: 8  },
        { width: 20 },
        { width: 22 },
        { width: 12 }
      ];

      ws.mergeCells('A1:F1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'BVLGARI - CROSSING SALES & MOBILITY';
      titleCell.font = { name: 'Georgia', bold: true, size: 15, color: { argb: 'FF' + C.navyBg } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 36;

      ws.mergeCells('A2:F2');
      const dateCell = ws.getCell('A2');
      dateCell.value = `Analysis of Inter-Boutique Operations — ${month} ${year}`;
      dateCell.font = { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 18;

      ws.addRow([]);

      const secRow1 = ws.addRow(['SUMMARY KEY PERFORMANCE INDICATORS']);
      secRow1.getCell(1).font = { name: 'Arial', bold: true, size: 10.5, color: { argb: 'FF' + C.navyBg } };
      ws.mergeCells('A4:F4');
      ws.getRow(4).height = 24;

      const kpiHdr = ['KPI Item', 'Total Generated Value', 'Crossing Value', 'Excluded HO Value', '', ''];
      const kpiHdrRow = ws.addRow(kpiHdr);
      kpiHdrRow.height = 22;
      ws.mergeCells('D5:F5');
      kpiHdrRow.eachCell((cell, colIdx) => {
        if (colIdx <= 4) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
          cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.navyText }, size: 9 };
          cell.border = borderAll(C.navyBg);
          cell.alignment = { vertical: 'middle', horizontal: colIdx === 1 ? 'left' : 'right' };
        }
      });

      const rSales = ws.addRow([
        'Total Net Sales Generated', 
        data.totalNetSalesGenerated, 
        data.totalNet, 
        data.hoExcludedNet || 0,
        '', ''
      ]);
      rSales.height = 20;
      ws.mergeCells('D6:F6');
      rSales.eachCell((cell, colIdx) => {
        if (colIdx <= 4) {
          cell.border = borderAll();
          cell.font = { name: 'Arial', size: 9.5 };
          if (colIdx === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.numFmt = numFmt;
            if (colIdx === 2) cell.font = { name: 'Arial', bold: true, size: 9.5 };
          }
        }
      });

      const rQty = ws.addRow([
        'Total Net Qty Generated', 
        data.totalQtyGenerated, 
        data.totalQty, 
        data.hoExcludedQty || 0,
        '', ''
      ]);
      rQty.height = 20;
      ws.mergeCells('D7:F7');
      rQty.eachCell((cell, colIdx) => {
        if (colIdx <= 4) {
          cell.border = borderAll();
          cell.font = { name: 'Arial', size: 9.5 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
          if (colIdx === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.numFmt = '#,##0';
            if (colIdx === 2) cell.font = { name: 'Arial', bold: true, size: 9.5 };
          }
        }
      });

      ws.addRow([]);
      ws.addRow([]);

      const adjStartRow = ws.rowCount + 1;
      const secRow2 = ws.addRow(['BOUTIQUE PERFORMANCE ADJUSTMENT SUMMARY']);
      secRow2.getCell(1).font = { name: 'Arial', bold: true, size: 10.5, color: { argb: 'FF' + C.navyBg } };
      ws.mergeCells(`A${adjStartRow}:F${adjStartRow}`);
      ws.getRow(adjStartRow).height = 24;

      const adjHeaders = ['Boutique Location', 'Physical Sales', 'Adjusted Sales', 'Net Impact', 'Variance %', ''];
      const adjHdrRow = ws.addRow(adjHeaders);
      adjHdrRow.height = 22;
      ws.mergeCells(`E${adjStartRow+1}:F${adjStartRow+1}`);
      adjHdrRow.eachCell((cell, colIdx) => {
        if (colIdx <= 5) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.slateBg } };
          cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.slateText }, size: 9 };
          cell.border = borderAll(C.slateBg);
          cell.alignment = { vertical: 'middle', horizontal: colIdx === 1 ? 'left' : colIdx === 5 ? 'center' : 'right' };
        }
      });

      storeCards.forEach((sc, idx) => {
        const rowIdx = ws.rowCount + 1;
        const row = ws.addRow([
          sc.store,
          sc.physical,
          sc.adjusted,
          sc.impact,
          sc.varPct / 100,
          ''
        ]);
        row.height = 20;
        ws.mergeCells(`E${rowIdx}:F${rowIdx}`);
        row.eachCell((cell, colIdx) => {
          if (colIdx <= 5) {
            cell.border = borderAll();
            cell.font = { name: 'Arial', size: 9.5 };
            if (idx % 2 === 1) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
            }

            if (colIdx === 1) {
              cell.alignment = { vertical: 'middle', horizontal: 'left' };
              cell.font = { name: 'Arial', bold: true, size: 9.5 };
            } else if (colIdx === 2 || colIdx === 3 || colIdx === 4) {
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
              cell.numFmt = numFmt;
              if (colIdx === 4) {
                cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + (sc.impact >= 0 ? C.greenText : C.redText) } };
              }
            } else if (colIdx === 5) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              cell.numFmt = pctFmt;
              cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + (sc.impact >= 0 ? C.greenText : C.redText) } };
            }
          }
        });
      });

      ws.addRow([]);
      ws.addRow([]);

      const actStartRow = ws.rowCount + 1;
      const secRow3 = ws.addRow(['CROSSING ACTIVITY DETAILS']);
      secRow3.getCell(1).font = { name: 'Arial', bold: true, size: 10.5, color: { argb: 'FF' + C.navyBg } };
      ws.mergeCells(`A${actStartRow}:F${actStartRow}`);
      ws.getRow(actStartRow).height = 24;

      const actHeaders = ['Sales Advisor', 'Base Location', '', 'Crossing Destination', 'Net Sales Generated', 'Qty (pcs)'];
      const actHdrRow = ws.addRow(actHeaders);
      actHdrRow.height = 22;
      actHdrRow.eachCell((cell, colIdx) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.slateBg } };
        cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.slateText }, size: 9 };
        cell.border = borderAll(C.slateBg);
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 1 || colIdx === 2 || colIdx === 4 ? 'left' : colIdx === 3 || colIdx === 6 ? 'center' : 'right' };
      });

      if (data.records.length === 0) {
        const row = ws.addRow(['No crossing sales recorded for this period', '', '', '', '', '']);
        row.height = 24;
        ws.mergeCells(`A${ws.rowCount}:F${ws.rowCount}`);
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(1).font = { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } };
        row.getCell(1).border = borderAll();
      } else {
        data.records.forEach((rec, idx) => {
          const row = ws.addRow([
            rec.salesman,
            rec.baseLoc,
            '→',
            rec.crossingLoc,
            rec.net,
            rec.qty
          ]);
          row.height = 20;
          row.eachCell((cell, colIdx) => {
            cell.border = borderAll();
            cell.font = { name: 'Arial', size: 9 };
            if (idx % 2 === 1) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
            }

            if (colIdx === 1) {
              cell.alignment = { vertical: 'middle', horizontal: 'left' };
              cell.font = { name: 'Arial', bold: true, size: 9 };
            } else if (colIdx === 2 || colIdx === 4) {
              cell.alignment = { vertical: 'middle', horizontal: 'left' };
            } else if (colIdx === 3) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              cell.font = { name: 'Arial', color: { argb: 'FF94A3B8' }, size: 9 };
            } else if (colIdx === 5) {
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
              cell.numFmt = numFmt;
            } else if (colIdx === 6) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              cell.numFmt = '#,##0';
            }
          });
        });

        const totRowIdx = ws.rowCount + 1;
        const totRow = ws.addRow([
          'Total Crossing Sales',
          '', '', '',
          data.totalNet,
          data.totalQty
        ]);
        totRow.height = 22;
        ws.mergeCells(`A${totRowIdx}:D${totRowIdx}`);
        totRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
          cell.border = borderAll(C.slateBg);
          cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF' + C.navyBg } };
          if (colIdx === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if (colIdx === 5) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.numFmt = numFmt;
          } else if (colIdx === 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.numFmt = '#,##0';
          }
        });
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Crossing_Sales_Report_${month}_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('Error exporting Excel: ' + err.message);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleDownloadAnnualExcel = async () => {
    setExportingAnnual(true);
    try {
      const yr = parseInt(year);
      const allMonthData = await Promise.all(MONTHS.map(m => dashboardService.getCrossingSalesData(m, yr)));

      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'MRA Retail BI Dashboard';
      wb.created = new Date();

      const C = {
        navyBg:  '1E3A5F', navyText: 'FFFFFF',
        slateBg: '475569', lightBg: 'F8FAFC',
        accentBg:'EFF6FF', border:  'E2E8F0',
      };
      const thinBorder = (color: string) => ({ style: 'thin' as const, color: { argb: 'FF' + color } });
      const borderAll  = (color = C.border) => ({ top: thinBorder(color), bottom: thinBorder(color), left: thinBorder(color), right: thinBorder(color) });
      const numFmt     = '#,##0;[Red](#,##0);"-"';
      const STORES     = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

      // ── Sheet 1: Annual Summary ──────────────────────────────────────────
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

      const addSectionHeader = (ws: any, text: string, rowIdx: number, cols: string) => {
        ws.mergeCells(`A${rowIdx}:${cols}${rowIdx}`);
        const cell = ws.getCell(`A${rowIdx}`);
        cell.value = text;
        cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        ws.getRow(rowIdx).height = 22;
      };

      const addMatrixSection = (
        ws: any,
        sectionLabel: string,
        hdrColor: string,
        extractFn: (md: typeof allMonthData[0]) => Record<string, number>
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
          const byLoc = extractFn(md);
          const rowTotal = Object.values(byLoc).reduce((s, v) => s + v, 0);
          const row = ws.addRow([MONTHS[idx].substring(0, 3), byLoc['Plaza Indonesia'] || 0, byLoc['Plaza Senayan'] || 0, byLoc['Bali'] || 0, rowTotal]);
          row.height = 18;
          row.eachCell((cell: any, col: number) => {
            cell.border = borderAll();
            cell.font = { name: 'Arial', size: 9 };
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
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
          cell.border = borderAll(C.slateBg);
          cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyBg } };
          if (col === 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
          else { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
        });

        ws.addRow([]);
        ws.addRow([]);
      };

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

      // ── Sheet 2: Flow Matrix ────────────────────────────────────────────
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
          cell.font = { name: 'Arial', size: 9.5 };
          if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
          if (col === 1) { cell.font = { name: 'Arial', bold: true, size: 9.5 }; cell.alignment = { vertical: 'middle', horizontal: 'left' }; }
          else if (col === 2) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF94A3B8' } }; }
          else if (col === 3) { cell.alignment = { vertical: 'middle', horizontal: 'left' }; }
          else if (col === 4) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
          else { cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.numFmt = '#,##0'; }
        });
        grandNet += f.net; grandQty += f.qty;
      });

      const gRow = ws2.addRow(['TOTAL', '', '', grandNet, grandQty]);
      gRow.height = 22;
      ws2.mergeCells(`A${ws2.rowCount}:C${ws2.rowCount}`);
      gRow.eachCell({ includeEmpty: true }, (cell: any, col: number) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
        cell.border = borderAll(C.slateBg);
        cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyBg } };
        if (col === 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
        else if (col === 4) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
        else if (col === 5) { cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.numFmt = '#,##0'; }
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Crossing_Sales_Annual_Summary_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('Error exporting Annual Excel: ' + err.message);
    } finally {
      setExportingAnnual(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dashboardService.getCrossingSalesData(month, parseInt(year));
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [month, year]);

  const storeCards = useMemo(() => {
    if (!data) return [];
    const incomingMap: Record<string, number> = {};
    const outgoingMap: Record<string, number> = {};
    data.records.forEach(r => {
      incomingMap[r.crossingLoc] = (incomingMap[r.crossingLoc] || 0) + r.net;
      outgoingMap[r.baseLoc]     = (outgoingMap[r.baseLoc]     || 0) + r.net;
    });
    return Object.entries(data.storeStats).map(([store, stats]) => {
      const incomingNet = incomingMap[store] || 0;
      const outgoingNet = outgoingMap[store] || 0;
      const impact  = stats.adjusted - stats.physical; // = outgoing - incoming
      const varPct  = stats.physical > 0 ? (impact / stats.physical) * 100 : 0;
      return { store, ...stats, impact, varPct, incomingNet, outgoingNet };
    });
  }, [data]);

  if (loading || !data) return <BvlgariLoader message="Loading Crossing Sales..." />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Repeat className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Crossing Sales & Mobility</h1>
          </div>
          <p className="text-slate-500 text-sm">Monthly Analysis of Inter-Boutique Operations — {month} {year}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select aria-label="Select month" value={month} onChange={e => setMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <button
            onClick={handleDownloadExcel}
            disabled={exportingExcel}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold h-10"
          >
            {exportingExcel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Excel
          </button>
          <button
            onClick={handleDownloadAnnualExcel}
            disabled={exportingAnnual}
            className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold h-10"
          >
            {exportingAnnual ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Annual Summary
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Net Sales Generated</p>
            <h3 className="text-3xl font-black text-emerald-600"><Amt value={data.totalNetSalesGenerated} /></h3>
            <p className="text-xs text-slate-400 mt-1">Crossing: <span className="font-bold text-slate-600"><Amt value={data.totalNet} /></span></p>
            {data.hoExcludedNet > 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5">+ Excluded HO: <Amt value={data.hoExcludedNet} /></p>
            )}
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Net Qty Generated</p>
            <h3 className="text-3xl font-black text-blue-600">
              {data.totalQtyGenerated} <span className="text-base text-slate-400 font-medium">pcs</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Crossing: <span className="font-bold text-slate-600">{data.totalQty} pcs</span></p>
            {data.hoExcludedQty > 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5">+ Excluded HO: {data.hoExcludedQty} pcs</p>
            )}
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
            <Repeat className="w-6 h-6 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Store Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {storeCards.map(({ store, physical, adjusted, impact, varPct, incomingNet, outgoingNet }) => {
          const cfg    = STORE_CONFIG[store];
          const isGain = impact >= 0;
          return (
            <div key={store} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-10 -mt-10 pointer-events-none", cfg.bg)} />

              {/* Store header + variance badge */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] tracking-wider", cfg.bg, cfg.text)}>
                    {cfg.abbr}
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{store}</p>
                </div>
                <span className={cn(
                  "flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full",
                  isGain ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                )}>
                  {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {fmtPct(varPct)}
                </span>
              </div>

              {/* Net Team Performance (adjusted) */}
              <div className="mb-4">
                <p className="text-[11px] font-medium text-slate-400 mb-1">Net Team Performance</p>
                <h4 className="text-2xl font-bold text-slate-900 font-mono tracking-tight"><Amt value={adjusted} /></h4>
              </div>

              {/* Breakdown: Physical → ± Crossing → Adjusted */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-medium">Physical (at store)</span>
                  <span className="font-mono font-bold text-slate-600"><Amt value={physical} /></span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-emerald-600 font-semibold">↑ Outgoing (team away)</span>
                  <span className="font-mono font-bold text-emerald-600">+<Amt value={outgoingNet} /></span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-rose-500 font-semibold">↓ Incoming (others here)</span>
                  <span className="font-mono font-bold text-rose-500">−<Amt value={incomingNet} /></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Store Performance Summary Table */}
      {storeCards.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full" />
            <h3 className="text-sm font-bold text-slate-900">Store Performance Summary</h3>
            <span className="ml-auto text-[10px] text-slate-400 font-medium">Physical ± Crossing = Net Team Performance</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Store</th>
                  <th className="py-3 px-5 text-right">Physical Sales</th>
                  <th className="py-3 px-5 text-right text-emerald-600">+ Outgoing</th>
                  <th className="py-3 px-5 text-right text-rose-500">− Incoming</th>
                  <th className="py-3 px-5 text-right text-blue-700">Net Team Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {storeCards.map(({ store, physical, adjusted, outgoingNet, incomingNet }) => {
                  const cfg = STORE_CONFIG[store];
                  return (
                    <tr key={store} className="text-xs hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5">
                        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold", cfg.bg, cfg.text)}>
                          {cfg.abbr} {store}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right font-mono text-slate-600"><Amt value={physical} /></td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-emerald-600">
                        {outgoingNet > 0 ? <><span className="text-emerald-400 mr-0.5">+</span><Amt value={outgoingNet} /></> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-rose-500">
                        {incomingNet > 0 ? <><span className="mr-0.5">−</span><Amt value={incomingNet} /></> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3 px-5 text-right font-mono font-black text-blue-700 text-sm"><Amt value={adjusted} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr className="text-xs font-bold text-slate-700">
                  <td className="py-3 px-5">Total All Stores</td>
                  <td className="py-3 px-5 text-right font-mono">
                    <Amt value={storeCards.reduce((s, c) => s + c.physical, 0)} />
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-emerald-600">
                    +<Amt value={storeCards.reduce((s, c) => s + c.outgoingNet, 0)} />
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-rose-500">
                    −<Amt value={storeCards.reduce((s, c) => s + c.incomingNet, 0)} />
                  </td>
                  <td className="py-3 px-5 text-right font-mono font-black text-blue-700">
                    <Amt value={storeCards.reduce((s, c) => s + c.adjusted, 0)} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Crossing Activity Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full" />
          <h3 className="text-sm font-bold text-slate-900">Crossing Activity Details</h3>
          <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {data.records.length} advisors
          </span>
        </div>

        {data.records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Repeat className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No crossing sales recorded for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Sales Advisor</th>
                  <th className="py-3 px-5">Base Location</th>
                  <th className="py-3 px-3 text-center"></th>
                  <th className="py-3 px-5 text-amber-600">Crossing Destination</th>
                  <th className="py-3 px-5 text-right w-44">Net Sales Generated</th>
                  <th className="py-3 px-5 text-center w-24">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.records.map((rec, i) => {
                  const baseCfg  = STORE_CONFIG[rec.baseLoc];
                  const destCfg  = STORE_CONFIG[rec.crossingLoc];
                  return (
                    <tr key={i} className="text-xs hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5 font-bold text-slate-800">{rec.salesman}</td>
                      <td className="py-3 px-5">
                        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold", baseCfg?.bg, baseCfg?.text)}>
                          {baseCfg?.abbr} {rec.baseLoc}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                      </td>
                      <td className="py-3 px-5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600">
                          {destCfg?.abbr} {rec.crossingLoc}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-slate-800"><Amt value={rec.net} /></td>
                      <td className="py-3 px-5 text-center font-mono text-slate-500">{rec.qty}</td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer total */}
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr className="text-xs font-bold text-slate-700">
                  <td className="py-3 px-5" colSpan={4}>Total Crossing Sales</td>
                  <td className="py-3 px-5 text-right font-mono"><Amt value={data.totalNet} /></td>
                  <td className="py-3 px-5 text-center font-mono">{data.totalQty}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

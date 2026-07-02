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

const generateLineGraphCanvas = (allMonthData: any[], year: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];
  const STORE_COLORS: Record<string, string> = {
    'Plaza Indonesia': '#8B5CF6',
    'Plaza Senayan':   '#D97706',
    'Bali':            '#2563EB',
  };

  const dataPoints: Record<string, number[]> = {
    'Plaza Indonesia': [],
    'Plaza Senayan':   [],
    'Bali':            [],
  };

  allMonthData.forEach(md => {
    STORES.forEach(store => {
      const val = md.storeStats[store]?.adjusted || 0;
      dataPoints[store].push(val);
    });
  });

  const top = 60;
  const bottom = 60;
  const left = 120;
  const right = 50;
  const graphWidth = canvas.width - left - right;
  const graphHeight = canvas.height - top - bottom;

  let maxVal = 0;
  STORES.forEach(store => {
    dataPoints[store].forEach(val => {
      if (val > maxVal) maxVal = val;
    });
  });

  const roundToNiceNumber = (val: number): number => {
    if (val <= 0) return 1000000;
    const exponent = Math.floor(Math.log10(val));
    const fraction = val / Math.pow(10, exponent);
    let niceFraction = 10;
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    return niceFraction * Math.pow(10, exponent);
  };
  const yAxisMax = roundToNiceNumber(maxVal * 1.15);

  ctx.strokeStyle = '#F1F5F9';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748B';
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const ratio = i / yTicks;
    const yVal = yAxisMax * ratio;
    const yPos = canvas.height - bottom - ratio * graphHeight;

    ctx.beginPath();
    ctx.moveTo(left, yPos);
    ctx.lineTo(canvas.width - right, yPos);
    ctx.stroke();

    let label = '';
    if (yVal >= 1000000000) {
      label = `Rp ${(yVal / 1000000000).toFixed(1)} M`;
    } else if (yVal >= 1000000) {
      label = `Rp ${(yVal / 1000000).toFixed(0)} jt`;
    } else {
      label = `Rp ${yVal.toLocaleString('id-ID')}`;
    }
    ctx.fillText(label, left - 15, yPos);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#64748B';
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const xSpacing = graphWidth / 11;
  
  monthLabels.forEach((label, idx) => {
    const xPos = left + idx * xSpacing;
    ctx.fillText(label, xPos, canvas.height - bottom + 15);
    
    ctx.strokeStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(xPos, canvas.height - bottom);
    ctx.lineTo(xPos, canvas.height - bottom + 5);
    ctx.stroke();
  });

  STORES.forEach(store => {
    const color = STORE_COLORS[store];
    const points = dataPoints[store];

    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    points.forEach((val, idx) => {
      const xPos = left + idx * xSpacing;
      const ratio = val / yAxisMax;
      const yPos = canvas.height - bottom - ratio * graphHeight;

      if (idx === 0) {
        ctx.moveTo(xPos, yPos);
      } else {
        ctx.lineTo(xPos, yPos);
      }
    });
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    points.forEach((val, idx) => {
      const xPos = left + idx * xSpacing;
      const ratio = val / yAxisMax;
      const yPos = canvas.height - bottom - ratio * graphHeight;

      ctx.beginPath();
      ctx.arc(xPos, yPos, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  });

  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let legendX = left;
  STORES.forEach(store => {
    const color = STORE_COLORS[store];
    ctx.fillStyle = color;
    ctx.fillRect(legendX, 20, 20, 10);
    
    ctx.fillStyle = '#1E293B';
    ctx.fillText(store, legendX + 28, 25);
    
    legendX += ctx.measureText(store).width + 70;
  });

  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'right';
  ctx.fillText(`Store Performance — Year ${year}`, canvas.width - right, 25);

  return canvas;
};

const generateComparisonGraphCanvas = (
  data2023: any[],
  data2024: any[],
  data2025: any[],
  data2026: any[]
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

  const getMonthlyTotals = (dataset: any[]) => {
    const list: number[] = [];
    dataset.forEach(md => {
      let mTotal = 0;
      STORES.forEach(store => {
        mTotal += md.storeStats[store]?.adjusted || 0;
      });
      list.push(mTotal);
    });
    return list;
  };

  const totals2023 = getMonthlyTotals(data2023);
  const totals2024 = getMonthlyTotals(data2024);
  const totals2025 = getMonthlyTotals(data2025);
  const totals2026 = getMonthlyTotals(data2026);

  const top = 70;
  const bottom = 60;
  const left = 120;
  const right = 50;
  const graphWidth = canvas.width - left - right;
  const graphHeight = canvas.height - top - bottom;

  let maxVal = 0;
  [totals2023, totals2024, totals2025, totals2026].forEach(arr => {
    arr.forEach(val => { if (val > maxVal) maxVal = val; });
  });

  const roundToNiceNumber = (val: number): number => {
    if (val <= 0) return 1000000;
    const exponent = Math.floor(Math.log10(val));
    const fraction = val / Math.pow(10, exponent);
    let niceFraction = 10;
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    return niceFraction * Math.pow(10, exponent);
  };
  const yAxisMax = roundToNiceNumber(maxVal * 1.15);

  ctx.strokeStyle = '#F1F5F9';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748B';
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const ratio = i / yTicks;
    const yVal = yAxisMax * ratio;
    const yPos = canvas.height - bottom - ratio * graphHeight;

    ctx.beginPath();
    ctx.moveTo(left, yPos);
    ctx.lineTo(canvas.width - right, yPos);
    ctx.stroke();

    let label = '';
    if (yVal >= 1000000000) {
      label = `Rp ${(yVal / 1000000000).toFixed(1)} M`;
    } else if (yVal >= 1000000) {
      label = `Rp ${(yVal / 1000000).toFixed(0)} jt`;
    } else {
      label = `Rp ${yVal.toLocaleString('id-ID')}`;
    }
    ctx.fillText(label, left - 15, yPos);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#64748B';
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const xSpacing = graphWidth / 5;

  monthLabels.forEach((label, idx) => {
    const xPos = left + idx * xSpacing;
    ctx.fillText(label, xPos, canvas.height - bottom + 15);
    
    ctx.strokeStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(xPos, canvas.height - bottom);
    ctx.lineTo(xPos, canvas.height - bottom + 5);
    ctx.stroke();
  });

  const plotYearLine = (points: number[], color: string, isDashed: boolean, thickness: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    if (isDashed) {
      ctx.setLineDash([6, 6]);
    } else {
      ctx.setLineDash([]);
    }
    
    ctx.beginPath();
    points.forEach((val, idx) => {
      const xPos = left + idx * xSpacing;
      const ratio = val / yAxisMax;
      const yPos = canvas.height - bottom - ratio * graphHeight;
      if (idx === 0) ctx.moveTo(xPos, yPos);
      else ctx.lineTo(xPos, yPos);
    });
    ctx.stroke();

    ctx.fillStyle = isDashed ? '#FFFFFF' : color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    points.forEach((val, idx) => {
      const xPos = left + idx * xSpacing;
      const ratio = val / yAxisMax;
      const yPos = canvas.height - bottom - ratio * graphHeight;
      ctx.beginPath();
      ctx.arc(xPos, yPos, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  };

  plotYearLine(totals2023, '#94A3B8', true, 2.5);
  plotYearLine(totals2024, '#F59E0B', true, 2.5);
  plotYearLine(totals2025, '#3B82F6', false, 3.5);
  plotYearLine(totals2026, '#8B5CF6', false, 4.5);

  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let legendX = left;

  const yearsConfig = [
    { label: '2023 Total', color: '#94A3B8', isDashed: true },
    { label: '2024 Total', color: '#F59E0B', isDashed: true },
    { label: '2025 Total', color: '#3B82F6', isDashed: false },
    { label: '2026 Total', color: '#8B5CF6', isDashed: false },
  ];

  yearsConfig.forEach(cfg => {
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = cfg.isDashed ? 2.5 : 3.5;
    if (cfg.isDashed) ctx.setLineDash([4, 4]);
    else ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.moveTo(legendX, 30);
    ctx.lineTo(legendX + 25, 30);
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.fillText(cfg.label, legendX + 30, 30);

    legendX += ctx.measureText(cfg.label).width + 75;
  });

  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'right';
  ctx.fillText('Jan-Jun Store Performance Comparison (2023 - 2026)', canvas.width - right, 30);

  return canvas;
};

export default function CrossingSalesPage() {
  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear]   = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData]   = useState<CrossingSalesData | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingAnnual, setExportingAnnual] = useState(false);
  const [exportingAdjusted, setExportingAdjusted] = useState(false);
  const [exportingCompare, setExportingCompare] = useState(false);

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

  const handleDownloadAdjustedExcel = async () => {
    setExportingAdjusted(true);
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
          byAdj['Plaza Senayan'] || 0, 
          byAdj['Bali'] || 0, 
          rowTotal
        ]);
        row.height = 19;
        row.eachCell((cell: any, col: number) => {
          cell.border = borderAll();
          cell.font = { name: 'Arial', size: 9.5 };
          if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
          if (col === 1) { 
            cell.font = { name: 'Arial', bold: true, size: 9.5 }; 
            cell.alignment = { vertical: 'middle', horizontal: 'left' }; 
          } else { 
            cell.alignment = { vertical: 'middle', horizontal: 'right' }; 
            cell.numFmt = numFmt; 
          }
        });
        STORES.forEach(s => { grandTotals[s] = (grandTotals[s] || 0) + (byAdj[s] || 0); });
        grandTotals.total += rowTotal;
      });

      const totRow = ws.addRow([
        'TOTAL', 
        grandTotals['Plaza Indonesia'], 
        grandTotals['Plaza Senayan'], 
        grandTotals['Bali'], 
        grandTotals.total
      ]);
      totRow.height = 22;
      totRow.eachCell((cell: any, col: number) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
        cell.border = borderAll(C.slateBg);
        cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
        if (col === 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
        else { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = numFmt; }
      });

      const canvas = generateLineGraphCanvas(allMonthData, yr);
      const imgBase64 = canvas.toDataURL('image/png');

      const imageId = wb.addImage({
        base64: imgBase64,
        extension: 'png',
      });

      ws.addImage(imageId, {
        tl: { col: 0, row: 19 },
        ext: { width: 680, height: 340 }
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Store_Performance_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('Error exporting Adjusted Excel: ' + err.message);
    } finally {
      setExportingAdjusted(false);
    }
  };

  const handleDownloadComparisonExcel = async () => {
    setExportingCompare(true);
    try {
      const res2023 = await Promise.all(MONTHS.slice(0, 6).map(m => dashboardService.getCrossingSalesData(m, 2023)));
      const res2024 = await Promise.all(MONTHS.slice(0, 6).map(m => dashboardService.getCrossingSalesData(m, 2024)));
      const res2025 = await Promise.all(MONTHS.slice(0, 6).map(m => dashboardService.getCrossingSalesData(m, 2025)));
      const res2026 = await Promise.all(MONTHS.slice(0, 6).map(m => dashboardService.getCrossingSalesData(m, 2026)));

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
      const numFmt     = 'Rp #,##0;[Red](Rp #,##0);"-"';
      const STORES     = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

      const ws = wb.addWorksheet('Jan-Jun Comparison', { views: [{ showGridLines: true }] });
      ws.columns = [
        { width: 14 }, // A: Month
        { width: 15 }, // B: PI 2023
        { width: 15 }, // C: PI 2024
        { width: 15 }, // D: PI 2025
        { width: 15 }, // E: PI 2026
        { width: 15 }, // F: PS 2023
        { width: 15 }, // G: PS 2024
        { width: 15 }, // H: PS 2025
        { width: 15 }, // I: PS 2026
        { width: 15 }, // J: Bali 2023
        { width: 15 }, // K: Bali 2024
        { width: 15 }, // L: Bali 2025
        { width: 15 }, // M: Bali 2026
        { width: 17 }, // N: Total 2023
        { width: 17 }, // O: Total 2024
        { width: 17 }, // P: Total 2025
        { width: 17 }  // Q: Total 2026
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
      r4.getCell(1).value = 'MONTH';

      ws.mergeCells('B4:E4'); r4.getCell(2).value = 'PLAZA INDONESIA';
      ws.mergeCells('F4:I4'); r4.getCell(6).value = 'PLAZA SENAYAN';
      ws.mergeCells('J4:M4'); r4.getCell(10).value = 'BALI';
      ws.mergeCells('N4:Q4'); r4.getCell(14).value = 'TOTAL';

      const r5 = ws.getRow(5);
      r5.height = 20;
      [2, 6, 10, 14].forEach(colIdx => {
        r5.getCell(colIdx).value = '2023';
        r5.getCell(colIdx + 1).value = '2024';
        r5.getCell(colIdx + 2).value = '2025';
        r5.getCell(colIdx + 3).value = '2026';
      });

      [4, 5].forEach(rowNum => {
        const row = ws.getRow(rowNum);
        row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (colIdx <= 1 || colIdx > 13 ? C.navyBg : C.slateBg) } };
          cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = borderAll(C.border);
        });
      });

      const storeTotals: Record<string, { s2023: number; s2024: number; s2025: number; s2026: number }> = {
        'Plaza Indonesia': { s2023: 0, s2024: 0, s2025: 0, s2026: 0 },
        'Plaza Senayan':   { s2023: 0, s2024: 0, s2025: 0, s2026: 0 },
        'Bali':            { s2023: 0, s2024: 0, s2025: 0, s2026: 0 }
      };

      for (let idx = 0; idx < 6; idx++) {
        const md2023 = res2023[idx];
        const md2024 = res2024[idx];
        const md2025 = res2025[idx];
        const md2026 = res2026[idx];

        const pi23 = md2023.storeStats['Plaza Indonesia']?.adjusted || 0;
        const pi24 = md2024.storeStats['Plaza Indonesia']?.adjusted || 0;
        const pi25 = md2025.storeStats['Plaza Indonesia']?.adjusted || 0;
        const pi26 = md2026.storeStats['Plaza Indonesia']?.adjusted || 0;

        const ps23 = md2023.storeStats['Plaza Senayan']?.adjusted || 0;
        const ps24 = md2024.storeStats['Plaza Senayan']?.adjusted || 0;
        const ps25 = md2025.storeStats['Plaza Senayan']?.adjusted || 0;
        const ps26 = md2026.storeStats['Plaza Senayan']?.adjusted || 0;

        const bl23 = md2023.storeStats['Bali']?.adjusted || 0;
        const bl24 = md2024.storeStats['Bali']?.adjusted || 0;
        const bl25 = md2025.storeStats['Bali']?.adjusted || 0;
        const bl26 = md2026.storeStats['Bali']?.adjusted || 0;

        const tot23 = pi23 + ps23 + bl23;
        const tot24 = pi24 + ps24 + bl24;
        const tot25 = pi25 + ps25 + bl25;
        const tot26 = pi26 + ps26 + bl26;

        const row = ws.addRow([
          MONTHS[idx].toUpperCase(),
          pi23, pi24, pi25, pi26,
          ps23, ps24, ps25, ps26,
          bl23, bl24, bl25, bl26,
          tot23, tot24, tot25, tot26
        ]);
        row.height = 20;

        row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.border = borderAll();
          cell.font = { name: 'Arial', size: 9 };
          if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
          }

          if (colIdx === 1) {
            cell.font = { name: 'Arial', bold: true, size: 9 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.numFmt = numFmt;
          }
        });

        storeTotals['Plaza Indonesia'].s2023 += pi23;
        storeTotals['Plaza Indonesia'].s2024 += pi24;
        storeTotals['Plaza Indonesia'].s2025 += pi25;
        storeTotals['Plaza Indonesia'].s2026 += pi26;

        storeTotals['Plaza Senayan'].s2023 += ps23;
        storeTotals['Plaza Senayan'].s2024 += ps24;
        storeTotals['Plaza Senayan'].s2025 += ps25;
        storeTotals['Plaza Senayan'].s2026 += ps26;

        storeTotals['Bali'].s2023 += bl23;
        storeTotals['Bali'].s2024 += bl24;
        storeTotals['Bali'].s2025 += bl25;
        storeTotals['Bali'].s2026 += bl26;
      }

      const gpi23 = storeTotals['Plaza Indonesia'].s2023;
      const gpi24 = storeTotals['Plaza Indonesia'].s2024;
      const gpi25 = storeTotals['Plaza Indonesia'].s2025;
      const gpi26 = storeTotals['Plaza Indonesia'].s2026;

      const gps23 = storeTotals['Plaza Senayan'].s2023;
      const gps24 = storeTotals['Plaza Senayan'].s2024;
      const gps25 = storeTotals['Plaza Senayan'].s2025;
      const gps26 = storeTotals['Plaza Senayan'].s2026;

      const gbl23 = storeTotals['Bali'].s2025;
      const gbl24 = storeTotals['Bali'].s2024;
      const gbl25 = storeTotals['Bali'].s2025;
      const gbl26 = storeTotals['Bali'].s2026;

      const gtot23 = gpi23 + gps23 + gbl23;
      const gtot24 = gpi24 + gps24 + gbl24;
      const gtot25 = gpi25 + gps25 + gbl25;
      const gtot26 = gpi26 + gps26 + gbl26;

      const totRow = ws.addRow([
        'TOTAL',
        gpi23, gpi24, gpi25, gpi26,
        gps23, gps24, gps25, gps26,
        gbl23, gbl24, gbl25, gbl26,
        gtot23, gtot24, gtot25, gtot26
      ]);
      totRow.height = 24;

      totRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
        cell.border = borderAll(C.slateBg);
        cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyBg } };

        if (colIdx === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = numFmt;
        }
      });

      const canvas = generateComparisonGraphCanvas(res2023, res2024, res2025, res2026);
      const imgBase64 = canvas.toDataURL('image/png');

      const imageId = wb.addImage({
        base64: imgBase64,
        extension: 'png',
      });

      ws.addImage(imageId, {
        tl: { col: 0, row: 15 },
        ext: { width: 780, height: 390 }
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Sales_Comparison_Jan_Jun_2023_2026.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('Error exporting Comparison Excel: ' + err.message);
    } finally {
      setExportingCompare(false);
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
              <option value="2023">2023</option>
            </select>
          </div>

          <button
            onClick={handleDownloadExcel}
            disabled={exportingExcel}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold h-10 cursor-pointer"
          >
            {exportingExcel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Excel
          </button>
          <button
            onClick={handleDownloadAnnualExcel}
            disabled={exportingAnnual}
            className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold h-10 cursor-pointer"
          >
            {exportingAnnual ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Annual Summary
          </button>
          <button
            onClick={handleDownloadAdjustedExcel}
            disabled={exportingAdjusted}
            className="flex items-center gap-2 bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold h-10 cursor-pointer"
          >
            {exportingAdjusted ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Store Performance
          </button>
          <button
            onClick={handleDownloadComparisonExcel}
            disabled={exportingCompare}
            className="flex items-center gap-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold h-10 cursor-pointer"
          >
            {exportingCompare ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Compare 2023-2026
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

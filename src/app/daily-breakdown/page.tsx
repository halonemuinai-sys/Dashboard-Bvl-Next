"use client";

import { useState, useEffect, useMemo, Fragment } from 'react';
import { 
  Calendar as CalendarIcon, 
  Filter, 
  RefreshCw, 
  Download, 
  FileSpreadsheet, 
  Table,
  Info,
  Trophy,
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
  TrendingUp,
  Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { dashboardService } from '@/services/dashboardService';
import BvlgariLoader from '@/components/BvlgariLoader';
import { getDayType, getHolidayName } from '@/lib/holidays';
import { supabase } from '@/lib/supabase';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STORE_THEME: Record<string, { color: string; border: string; text: string; bg: string; fill: string }> = {
  'Bali':            { color: '#2563EB', border: 'border-blue-200',   text: 'text-blue-600',   bg: 'bg-blue-50/50',    fill: 'bg-blue-600' },
  'Head Office':     { color: '#64748B', border: 'border-slate-200',  text: 'text-slate-500',  bg: 'bg-slate-50/50',   fill: 'bg-slate-500' },
  'Plaza Indonesia': { color: '#8B5CF6', border: 'border-purple-200', text: 'text-purple-600', bg: 'bg-purple-50/40',  fill: 'bg-purple-600' },
  'Plaza Senayan':   { color: '#D97706', border: 'border-amber-200',  text: 'text-amber-600',  bg: 'bg-amber-50/40',   fill: 'bg-amber-500' }
};

export default function DailyBreakdownPage() {
  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear] = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(0);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Column Toggles
  const [visibleStores, setVisibleStores] = useState<Record<string, boolean>>({
    'Bali': true,
    'Head Office': true,
    'Plaza Indonesia': true,
    'Plaza Senayan': true
  });

  // Crosshair hover state
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const monthIdx = MONTHS.indexOf(month);
        
        // Fetch Daily breakdown
        const res = await dashboardService.getDailyBreakdown(month, parseInt(year));
        setData(res);

        // Fetch Monthly Target from targets table
        const { data: targetRows } = await supabase
          .from('targets')
          .select('target_value, store_name')
          .eq('year', parseInt(year))
          .eq('month_number', monthIdx + 1);
        
        let totalT = 0;
        targetRows?.forEach((t: any) => {
          if (!t.store_name.toLowerCase().includes('head office') && t.store_name.toLowerCase() !== 'ho') {
            totalT += (t.target_value || 0);
          }
        });
        setMonthlyTarget(totalT);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [month, year]);

  const monthIndex = useMemo(() => MONTHS.indexOf(month), [month]);
  const yearNum = useMemo(() => parseInt(year), [year]);

  // Calculate totals
  const totals = useMemo(() => {
    const t = {
      totalSales: 0,
      totalQty: 0,
      baliSales: 0,
      baliQty: 0,
      hoSales: 0,
      hoQty: 0,
      piSales: 0,
      piQty: 0,
      psSales: 0,
      psQty: 0
    };

    data.forEach(d => {
      t.totalSales += d.totalSales;
      t.totalQty += d.totalQty;
      t.baliSales += d.stores['Bali'].netSales;
      t.baliQty += d.stores['Bali'].qty;
      t.hoSales += d.stores['Head Office'].netSales;
      t.hoQty += d.stores['Head Office'].qty;
      t.piSales += d.stores['Plaza Indonesia'].netSales;
      t.piQty += d.stores['Plaza Indonesia'].qty;
      t.psSales += d.stores['Plaza Senayan'].netSales;
      t.psQty += d.stores['Plaza Senayan'].qty;
    });

    return t;
  }, [data]);

  // Exclude HO for store-only metrics
  const storeOnlySales = useMemo(() => {
    return totals.totalSales - totals.hoSales;
  }, [totals]);

  // Find best sales day
  const bestDayIdx = useMemo(() => {
    let bestIdx = -1;
    let maxSales = -Infinity;
    data.forEach((d, i) => {
      if (d.totalSales > 0 && d.totalSales > maxSales) {
        maxSales = d.totalSales;
        bestIdx = i;
      }
    });
    return bestIdx;
  }, [data]);

  // Find worst sales day (exclude zero days)
  const worstDayIdx = useMemo(() => {
    let worstIdx = -1;
    let minSales = Infinity;
    data.forEach((d, i) => {
      if (d.totalSales > 0 && d.totalSales < minSales) {
        minSales = d.totalSales;
        worstIdx = i;
      }
    });
    return worstIdx;
  }, [data]);

  // Active days count & average sales
  const activeDaysStats = useMemo(() => {
    const activeDays = data.filter(d => d.totalSales > 0).length;
    const avgSales = activeDays > 0 ? storeOnlySales / activeDays : 0;
    return { activeDays, avgSales };
  }, [data, storeOnlySales]);

  // Targets circle tracker progress
  const targetProgressPercent = useMemo(() => {
    if (monthlyTarget <= 0) return 0;
    return (storeOnlySales / monthlyTarget) * 100;
  }, [storeOnlySales, monthlyTarget]);

  // Dynamic store segments percentages
  const storeContributionShares = useMemo(() => {
    const baseSales = storeOnlySales || 1;
    return [
      { name: 'Plaza Indonesia', val: totals.piSales, pct: (totals.piSales / baseSales) * 100 },
      { name: 'Plaza Senayan',   val: totals.psSales, pct: (totals.psSales / baseSales) * 100 },
      { name: 'Bali',            val: totals.baliSales, pct: (totals.baliSales / baseSales) * 100 }
    ].sort((a, b) => b.val - a.val);
  }, [totals, storeOnlySales]);

  const toggleStoreVisibility = (store: string) => {
    setVisibleStores(prev => ({
      ...prev,
      [store]: !prev[store]
    }));
  };

  const visibleColumnsCount = useMemo(() => {
    return Object.values(visibleStores).filter(Boolean).length;
  }, [visibleStores]);

  const handleDownloadExcel = async () => {
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
        redText:    'DC2626',
        redBg:      'FEF2F2',
        goldBg:     'FEFCE8'
      };

      const thinBorder = (color: string) => ({ style: 'thin' as const, color: { argb: 'FF' + color } });
      const borderAll = (color = C.border) => ({
        top: thinBorder(color), bottom: thinBorder(color),
        left: thinBorder(color), right: thinBorder(color)
      });
      const numFmt = 'Rp #,##0;[Red](Rp #,##0);"-"';

      const ws = wb.addWorksheet('Daily Breakdown', {
        views: [{ showGridLines: true }]
      });

      // Define standard columns structure
      const excelCols = [
        { width: 14 }, // Date
        { width: 12 }, // Day
        { width: 18 }, // Total Sales
        { width: 10 }  // Total Qty
      ];

      // Dynamically add store columns depending on check status
      const activeStoresList = Object.keys(visibleStores).filter(s => visibleStores[s]);
      activeStoresList.forEach(() => {
        excelCols.push({ width: 16 }); // Net Sales
        excelCols.push({ width: 8  }); // Qty
      });

      ws.columns = excelCols;

      // Title Section
      const totalHeaderWidth = 4 + (activeStoresList.length * 2);
      const endColLetter = String.fromCharCode(64 + totalHeaderWidth);

      ws.mergeCells(`A1:${endColLetter}1`);
      const titleCell = ws.getCell('A1');
      titleCell.value = 'BVLGARI - DAILY BREAKDOWN (ALL STORES)';
      titleCell.font = { name: 'Georgia', bold: true, size: 15, color: { argb: 'FF' + C.navyBg } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 36;

      ws.mergeCells(`A2:${endColLetter}2`);
      const dateCell = ws.getCell('A2');
      dateCell.value = `Analysis Period: ${month} ${year}`;
      dateCell.font = { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 18;

      ws.addRow([]); // Blank Row 3

      // Row 4: Stores (Merged Headers)
      const r4 = ws.getRow(4);
      r4.height = 24;
      
      ws.mergeCells('A4:A5');
      ws.mergeCells('B4:B5');
      ws.mergeCells('C4:C5');
      ws.mergeCells('D4:D5');

      r4.getCell(1).value = 'DATE';
      r4.getCell(2).value = 'DAY';
      r4.getCell(3).value = 'TOTAL SALES';
      r4.getCell(4).value = 'TOTAL QTY';

      activeStoresList.forEach((storeName, i) => {
        const colIdxStart = 5 + (i * 2);
        const colLetterStart = String.fromCharCode(64 + colIdxStart);
        const colLetterEnd = String.fromCharCode(65 + colIdxStart);
        
        ws.mergeCells(`${colLetterStart}4:${colLetterEnd}4`);
        r4.getCell(colIdxStart).value = storeName.toUpperCase();
      });

      // Row 5: Sub-headers
      const r5 = ws.getRow(5);
      r5.height = 20;
      activeStoresList.forEach((_, i) => {
        const colIdxStart = 5 + (i * 2);
        r5.getCell(colIdxStart).value = 'NET SALES';
        r5.getCell(colIdxStart + 1).value = 'QTY';
      });

      // Style Headers
      [4, 5].forEach(rowNum => {
        const row = ws.getRow(rowNum);
        row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (colIdx <= 4 ? C.navyBg : C.slateBg) } };
          cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = borderAll(C.border);
        });
      });

      // Data Rows
      data.forEach((d, idx) => {
        const dayNum = d.dayNum;
        const dayType = getDayType(yearNum, monthIndex, dayNum);
        const holidayName = getHolidayName(yearNum, monthIndex, dayNum);
        const isRedDay = dayType === 'weekend' || dayType === 'holiday';
        const isBestDay = idx === bestDayIdx;
        const isWorstDay = idx === worstDayIdx;

        const rowData = [
          holidayName ? `${d.dateStr} *` : d.dateStr,
          isBestDay ? `${d.dayOfWeek} (Peak)` : d.dayOfWeek,
          d.totalSales,
          d.totalQty
        ];

        activeStoresList.forEach(storeName => {
          rowData.push(d.stores[storeName].netSales);
          rowData.push(d.stores[storeName].qty);
        });

        const row = ws.addRow(rowData);
        row.height = 20;

        row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.border = borderAll();
          cell.font = { name: 'Arial', size: 9 };

          // Default alternating background
          if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
          }

          // Best day gold highlight
          if (isBestDay) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.goldBg } };
            if (colIdx <= 2) {
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFC27807' } };
            }
          }

          // Red highlights for weekends & holidays
          if (isRedDay && !isBestDay) {
            if (colIdx === 1 || colIdx === 2) {
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF' + C.redText } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.redBg } };
            }
          }

          // Alignments & formats
          if (colIdx === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if (colIdx === 2) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if (colIdx === 3 || (colIdx >= 5 && colIdx % 2 === 1)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.numFmt = numFmt;
            if (colIdx === 3) cell.font = { name: 'Arial', bold: true, size: 9 };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.numFmt = '#,##0';
            if (colIdx === 4) cell.font = { name: 'Arial', bold: true, size: 9 };
          }
        });
      });

      // Total Row
      const totRowIdx = ws.rowCount + 1;
      const totalRowData = [
        'TOTAL',
        '',
        totals.totalSales,
        totals.totalQty
      ];

      activeStoresList.forEach(storeName => {
        if (storeName === 'Bali') {
          totalRowData.push(totals.baliSales); totalRowData.push(totals.baliQty);
        } else if (storeName === 'Head Office') {
          totalRowData.push(totals.hoSales); totalRowData.push(totals.hoQty);
        } else if (storeName === 'Plaza Indonesia') {
          totalRowData.push(totals.piSales); totalRowData.push(totals.piQty);
        } else if (storeName === 'Plaza Senayan') {
          totalRowData.push(totals.psSales); totalRowData.push(totals.psQty);
        }
      });

      const totRow = ws.addRow(totalRowData);
      totRow.height = 24;
      ws.mergeCells(`A${totRowIdx}:B${totRowIdx}`);

      totRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
        cell.border = borderAll(C.slateBg);
        cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyBg } };

        if (colIdx === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colIdx === 3 || (colIdx >= 5 && colIdx % 2 === 1)) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = numFmt;
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.numFmt = '#,##0';
        }
      });

      // Write to buffer
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Daily_Breakdown_${month}_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('Error exporting Excel: ' + err.message);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleDownloadPDF = async () => {
    setExportingPDF(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const element = document.getElementById('pdf-document');
      if (!element) return;

      element.style.left = '0';
      element.style.top = '0';
      element.style.position = 'absolute';
      element.style.zIndex = '-100';

      const canvas = await html2canvas(element, {
        scale: 2.0,
        useCORS: true,
        windowWidth: 1123 // A4 landscape width in pixels
      });

      element.style.left = '-9999px';

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      let drawWidth = pdfWidth;
      let drawHeight = (canvas.height * pdfWidth) / canvas.width;

      if (drawHeight > pdfHeight) {
        drawHeight = pdfHeight;
        drawWidth = (canvas.width * pdfHeight) / canvas.height;
      }

      const xPos = (pdfWidth - drawWidth) / 2;
      pdf.addImage(imgData, 'JPEG', xPos, 0, drawWidth, drawHeight);

      pdf.save(`Daily_Breakdown_${month}_${year}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert('Error generating PDF: ' + err.message);
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) return <BvlgariLoader message="Loading Daily Breakdown..." />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shadow-sm shadow-blue-100">
              <Table className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daily Breakdown (All Stores)</h1>
          </div>
          <p className="text-slate-500 text-sm">Monthly daily sales tracking for all boutiques — {month} {year}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select aria-label="Select month" value={month} onChange={e => setMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm mr-2">
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
            Export Excel
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={exportingPDF}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold h-10 cursor-pointer"
          >
            {exportingPDF ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export PDF
          </button>
        </div>
      </div>

      {/* ── PREMIUM INTERACTIVE KPI CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Target Tracker (SVG Progress Ring) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50"/>
              <circle className="text-emerald-500 transition-all duration-1000" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * Math.min(100, targetProgressPercent)) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50"/>
            </svg>
            <span className="absolute text-[11px] font-black text-slate-800 leading-none">
              {targetProgressPercent.toFixed(0)}%
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 block">MTD TARGET ACHIEVED</span>
            <h4 className="text-lg font-black text-slate-900 leading-none mb-1"><Amt value={storeOnlySales} /></h4>
            <p className="text-[10px] text-slate-400 font-medium">Target: <Amt value={monthlyTarget} /> <span className="text-slate-300 font-normal">(Exc HO)</span></p>
          </div>
        </div>

        {/* Card 2: Boutique Segment Share Contribution */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5 block">BOUTIQUE SHARE SHARE</span>
            {/* Stacked Segment Bar */}
            <div className="w-full h-3 bg-slate-150 rounded-full overflow-hidden flex mb-2 border border-slate-200/50">
              {storeContributionShares.map((sc, i) => {
                const cfg = STORE_THEME[sc.name];
                if (sc.pct <= 0) return null;
                return (
                  <div 
                    key={sc.name}
                    className={cn("h-full transition-all duration-500", cfg?.fill)}
                    style={{ width: `${sc.pct}%` }}
                    title={`${sc.name}: ${sc.pct.toFixed(1)}%`}
                  />
                );
              })}
            </div>
          </div>
          <div className="flex justify-between items-center text-[9px] font-black text-slate-500 pt-1">
            {storeContributionShares.map(sc => {
              const cfg = STORE_THEME[sc.name];
              const label = sc.name === 'Plaza Indonesia' ? 'PI' : sc.name === 'Plaza Senayan' ? 'PS' : 'BL';
              return (
                <span key={sc.name} className="flex items-center gap-1">
                  <span className={cn("w-1.5 h-1.5 rounded-full", cfg?.fill)} />
                  {label} {sc.pct.toFixed(0)}%
                </span>
              );
            })}
          </div>
        </div>

        {/* Card 3: Peak Sales Day (Trophy card with Gold Glow) */}
        {bestDayIdx >= 0 && data[bestDayIdx] ? (
          <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/30 border border-amber-100 rounded-3xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-5 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
              <Trophy className="w-24 h-24 text-amber-600" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest leading-none mb-1 block">MONTH'S PEAK SALES DAY</span>
              <h4 className="text-lg font-black text-slate-900 leading-none mb-1"><Amt value={data[bestDayIdx].totalSales} /></h4>
              <p className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                {data[bestDayIdx].dateStr} ({data[bestDayIdx].dayOfWeek})
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner shrink-0 relative">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm" />
        )}

        {/* Card 4: Daily Performance Benchmark */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 block">DAILY AVG BENCHMARK</span>
            <h4 className="text-lg font-black text-slate-900 leading-none mb-1"><Amt value={activeDaysStats.avgSales} /></h4>
            <p className="text-[10px] text-slate-400 font-medium">Over {activeDaysStats.activeDays} days with active sales</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50/50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* ── INTERACTIVE COLUMN TOGGLES ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-500">Toggle columns to focus comparison:</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {Object.keys(visibleStores).map(storeName => {
            const visible = visibleStores[storeName];
            const cfg = STORE_THEME[storeName];
            return (
              <button
                key={storeName}
                onClick={() => toggleStoreVisibility(storeName)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                  visible 
                    ? cn(cfg?.bg, cfg?.border, cfg?.text, "shadow-sm") 
                    : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                )}
              >
                {visible ? <Check className="w-3 h-3" /> : <EyeOff className="w-3.5 h-3.5" />}
                {storeName}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN INTERACTIVE TABLE ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              {/* Row 1: Stores */}
              <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 border-r border-slate-200/60" rowSpan={2}>Date</th>
                <th className="py-3 px-4 border-r border-slate-200/60" rowSpan={2}>Day</th>
                <th className="py-3 px-4 border-r border-slate-200/60 text-right" rowSpan={2}>Total Sales</th>
                <th className="py-3 px-4 border-r border-slate-200/60 text-center" rowSpan={2}>Total Qty</th>

                {/* Dynamic Store Headers */}
                {Object.keys(visibleStores).map(storeName => {
                  if (!visibleStores[storeName]) return null;
                  const theme = STORE_THEME[storeName];
                  return (
                    <th 
                      key={storeName} 
                      onMouseEnter={() => setHoveredCol(storeName)}
                      onMouseLeave={() => setHoveredCol(null)}
                      className={cn(
                        "py-2 px-4 border-r border-slate-200/60 text-center transition-colors duration-150", 
                        theme?.bg,
                        hoveredCol === storeName && "bg-slate-200/40"
                      )} 
                      colSpan={2}
                    >
                      {storeName}
                    </th>
                  );
                })}
              </tr>
              {/* Row 2: Sub-headers */}
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                {Object.keys(visibleStores).map(storeName => {
                  if (!visibleStores[storeName]) return null;
                  const theme = STORE_THEME[storeName];
                  return (
                    <Fragment key={storeName}>
                      <th 
                        onMouseEnter={() => setHoveredCol(storeName)}
                        onMouseLeave={() => setHoveredCol(null)}
                        className={cn(
                          "py-2 px-4 border-r border-slate-200/60 text-right transition-colors duration-150",
                          theme?.bg,
                          hoveredCol === storeName && "bg-slate-200/60"
                        )}
                      >
                        Net Sales
                      </th>
                      <th 
                        onMouseEnter={() => setHoveredCol(storeName)}
                        onMouseLeave={() => setHoveredCol(null)}
                        className={cn(
                          "py-2 px-3 border-r border-slate-200/60 text-center transition-colors duration-150",
                          theme?.bg,
                          hoveredCol === storeName && "bg-slate-200/60"
                        )}
                      >
                        Qty
                      </th>
                    </Fragment>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((d, idx) => {
                const dayNum = d.dayNum;
                const dayType = getDayType(yearNum, monthIndex, dayNum);
                const holidayName = getHolidayName(yearNum, monthIndex, dayNum);
                const isRedDay = dayType === 'weekend' || dayType === 'holiday';
                const isBestDay = idx === bestDayIdx;
                const isWorstDay = idx === worstDayIdx;

                return (
                  <tr 
                    key={d.dayNum} 
                    onMouseEnter={() => setHoveredRow(idx)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={cn(
                      "transition-colors duration-150 group/row hover:bg-slate-50",
                      isBestDay && "bg-amber-50/20 hover:bg-amber-50/40",
                      isWorstDay && "bg-rose-50/10 hover:bg-rose-50/30",
                      hoveredRow === idx && "bg-slate-50/90"
                    )}
                    style={{
                      animation: 'slideIn 0.3s ease-out forwards',
                      animationDelay: `${idx * 15}ms`,
                      opacity: 0,
                      transform: 'translateY(8px)'
                    }}
                  >
                    {/* Date */}
                    <td className={cn(
                      "py-2.5 px-4 font-mono font-bold border-r border-slate-100 text-center transition-colors duration-150",
                      isBestDay ? "text-amber-700 bg-amber-50/30" : "text-slate-600",
                      isWorstDay && "text-rose-700 bg-rose-50/20",
                      hoveredRow === idx && "bg-slate-100/50"
                    )}>
                      <span className="flex items-center justify-center gap-1.5">
                        {isBestDay && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        {isWorstDay && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                        {d.dateStr}
                        {holidayName && (
                          <span className="text-rose-500 font-black animate-pulse" title={holidayName}>*</span>
                        )}
                      </span>
                    </td>
                    
                    {/* Day */}
                    <td className={cn(
                      "py-2.5 px-4 border-r border-slate-100 font-bold transition-colors duration-150",
                      isBestDay && "text-amber-700 bg-amber-50/20",
                      isWorstDay && "text-rose-700 bg-rose-50/10",
                      !isBestDay && !isWorstDay && isRedDay ? "text-rose-500 bg-rose-50/30" : "text-slate-700",
                      hoveredRow === idx && "bg-slate-100/50"
                    )} title={holidayName || undefined}>
                      {d.dayOfWeek}
                    </td>
                    
                    {/* Total Sales */}
                    <td className={cn(
                      "py-2.5 px-4 border-r border-slate-100 text-right font-black font-mono text-slate-800 transition-colors duration-150",
                      isBestDay && "text-amber-700 bg-amber-50/10",
                      hoveredRow === idx && "bg-slate-100/50"
                    )}>
                      <Amt value={d.totalSales} />
                    </td>
                    
                    {/* Total Qty */}
                    <td className={cn(
                      "py-2.5 px-4 border-r border-slate-100 text-center font-black font-mono text-slate-700 transition-colors duration-150",
                      isBestDay && "text-amber-700 bg-amber-50/10",
                      hoveredRow === idx && "bg-slate-100/50"
                    )}>
                      {d.totalQty}
                    </td>

                    {/* Stores Columns */}
                    {Object.keys(visibleStores).map(storeName => {
                      if (!visibleStores[storeName]) return null;
                      const sData = d.stores[storeName];
                      const theme = STORE_THEME[storeName];
                      const colActive = hoveredCol === storeName;

                      return (
                        <Fragment key={storeName}>
                          <td 
                            onMouseEnter={() => setHoveredCol(storeName)}
                            onMouseLeave={() => setHoveredCol(null)}
                            className={cn(
                              "py-2.5 px-4 border-r border-slate-100 text-right font-mono text-slate-600 transition-colors duration-150",
                              colActive && "bg-slate-100",
                              sData.netSales > 0 && "font-semibold text-slate-800"
                            )}
                          >
                            <Amt value={sData.netSales} />
                          </td>
                          <td 
                            onMouseEnter={() => setHoveredCol(storeName)}
                            onMouseLeave={() => setHoveredCol(null)}
                            className={cn(
                              "py-2.5 px-3 border-r border-slate-100 text-center font-mono text-slate-400 transition-colors duration-150",
                              colActive && "bg-slate-100",
                              sData.qty > 0 && "font-bold text-slate-700"
                            )}
                          >
                            {sData.qty}
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Footer */}
            <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800 relative z-10 shadow-lg">
              <tr>
                <td className="py-3 px-4 text-center border-r border-slate-200/60" colSpan={2}>TOTAL</td>
                <td className="py-3 px-4 border-r border-slate-200/60 text-right font-black font-mono text-slate-900"><Amt value={totals.totalSales} /></td>
                <td className="py-3 px-4 border-r border-slate-200/60 text-center font-black font-mono text-slate-900">{totals.totalQty}</td>
                
                {/* Dynamic Store Totals */}
                {Object.keys(visibleStores).map(storeName => {
                  if (!visibleStores[storeName]) return null;
                  let storeSalesTotal = 0;
                  let storeQtyTotal = 0;
                  if (storeName === 'Bali') {
                    storeSalesTotal = totals.baliSales; storeQtyTotal = totals.baliQty;
                  } else if (storeName === 'Head Office') {
                    storeSalesTotal = totals.hoSales; storeQtyTotal = totals.hoQty;
                  } else if (storeName === 'Plaza Indonesia') {
                    storeSalesTotal = totals.piSales; storeQtyTotal = totals.piQty;
                  } else if (storeName === 'Plaza Senayan') {
                    storeSalesTotal = totals.psSales; storeQtyTotal = totals.psQty;
                  }

                  return (
                    <Fragment key={storeName}>
                      <td className="py-3 px-4 border-r border-slate-200/60 text-right font-black font-mono text-slate-800"><Amt value={storeSalesTotal} /></td>
                      <td className="py-3 px-3 border-r border-slate-200/60 text-center font-black font-mono text-slate-800">{storeQtyTotal}</td>
                    </Fragment>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Load Animations Inject CSS */}
      <style jsx global>{`
        @keyframes slideIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* --- PROFESSIONAL LANDSCAPE PDF DOCUMENT (OFF-SCREEN) --- */}
      <div 
        id="pdf-document" 
        className="absolute -left-[9999px] top-0 w-[1123px] bg-white text-black font-sans p-8 box-border"
        style={{ minHeight: '794px' }}
      >
        {/* PDF Header */}
        <div className="bg-slate-900 text-white py-4 px-6 mb-4 -mx-8 -mt-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-serif uppercase tracking-[0.25em] text-white">Bvlgari</h1>
            <h2 className="text-xs mt-0.5 font-medium text-slate-300 tracking-wider uppercase">Daily Sales Breakdown (All Stores)</h2>
          </div>
          <p className="text-xs font-mono text-slate-300 text-right">
            Period: {month} {year}<br />
            <span className="text-[10px] text-slate-400">Generated: {new Date().toLocaleDateString('en-US')}</span>
          </p>
        </div>

        {/* Mini Overview Row */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="border border-slate-200 p-2.5 rounded-lg">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Sales (All Stores)</span>
            <div className="text-base font-black text-slate-800"><Amt value={totals.totalSales} /></div>
          </div>
          <div className="border border-slate-200 p-2.5 rounded-lg">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Qty Sold</span>
            <div className="text-base font-black text-slate-800">{totals.totalQty} pcs</div>
          </div>
          <div className="border border-slate-200 p-2.5 rounded-lg">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Boutique Sales (Excl. HO)</span>
            <div className="text-base font-black text-emerald-600"><Amt value={storeOnlySales} /></div>
          </div>
          <div className="border border-slate-200 p-2.5 rounded-lg bg-slate-50">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Head Office (HO) Sales</span>
            <div className="text-base font-black text-slate-600"><Amt value={totals.hoSales} /></div>
          </div>
        </div>

        {/* Printable Table */}
        <table className="w-full text-left border-collapse text-[10px] border border-slate-200">
          <thead>
            {/* PDF Row 1 */}
            <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[9px]">
              <th className="py-1 px-2 border border-slate-700 text-center" rowSpan={2}>Date</th>
              <th className="py-1 px-2 border border-slate-700" rowSpan={2}>Day</th>
              <th className="py-1 px-2 border border-slate-700 text-right" rowSpan={2}>Total Sales</th>
              <th className="py-1 px-2 border border-slate-700 text-center" rowSpan={2}>Qty</th>
              <th className="py-1 px-2 border border-slate-700 text-center bg-slate-700/40" colSpan={2}>Bali</th>
              <th className="py-1 px-2 border border-slate-700 text-center bg-slate-700/60" colSpan={2}>Head Office</th>
              <th className="py-1 px-2 border border-slate-700 text-center bg-slate-700/40" colSpan={2}>Plaza Indonesia</th>
              <th className="py-1 px-2 border border-slate-700 text-center bg-slate-700/60" colSpan={2}>Plaza Senayan</th>
            </tr>
            {/* PDF Row 2 */}
            <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[8px]">
              <th className="py-1 px-2 border border-slate-700 text-right bg-slate-700/30">Net Sales</th>
              <th className="py-1 px-1 border border-slate-700 text-center bg-slate-700/30">Qty</th>
              <th className="py-1 px-2 border border-slate-700 text-right bg-slate-700/50">Net Sales</th>
              <th className="py-1 px-1 border border-slate-700 text-center bg-slate-700/50">Qty</th>
              <th className="py-1 px-2 border border-slate-700 text-right bg-slate-700/30">Net Sales</th>
              <th className="py-1 px-1 border border-slate-700 text-center bg-slate-700/30">Qty</th>
              <th className="py-1 px-2 border border-slate-700 text-right bg-slate-700/50">Net Sales</th>
              <th className="py-1 px-1 border border-slate-700 text-center bg-slate-700/50">Qty</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, idx) => {
              const dayNum = d.dayNum;
              const dayType = getDayType(yearNum, monthIndex, dayNum);
              const holidayName = getHolidayName(yearNum, monthIndex, dayNum);
              const isRedDay = dayType === 'weekend' || dayType === 'holiday';

              return (
                <tr key={d.dayNum} className="border-b border-gray-150">
                  <td className="py-1 px-2 border border-gray-100 font-mono text-center">
                    {d.dateStr}{holidayName ? ' *' : ''}
                  </td>
                  <td className={cn(
                    "py-1 px-2 border border-gray-100 font-bold",
                    isRedDay ? "text-rose-600 bg-rose-50/40" : "text-gray-700"
                  )}>
                    {d.dayOfWeek}
                  </td>
                  <td className="py-1 px-2 border border-gray-100 text-right font-bold font-mono">
                    <Amt value={d.totalSales} />
                  </td>
                  <td className="py-1 px-2 border border-gray-100 text-center font-bold font-mono">
                    {d.totalQty}
                  </td>

                  {/* Bali */}
                  <td className="py-1 px-2 border border-gray-100 text-right font-mono text-gray-500">
                    <Amt value={d.stores['Bali'].netSales} />
                  </td>
                  <td className="py-1 px-1 border border-gray-100 text-center font-mono text-gray-400">
                    {d.stores['Bali'].qty}
                  </td>

                  {/* Head Office */}
                  <td className="py-1 px-2 border border-gray-100 text-right font-mono text-gray-400">
                    <Amt value={d.stores['Head Office'].netSales} />
                  </td>
                  <td className="py-1 px-1 border border-gray-100 text-center font-mono text-gray-300">
                    {d.stores['Head Office'].qty}
                  </td>

                  {/* Plaza Indonesia */}
                  <td className="py-1 px-2 border border-gray-100 text-right font-mono text-gray-500">
                    <Amt value={d.stores['Plaza Indonesia'].netSales} />
                  </td>
                  <td className="py-1 px-1 border border-gray-100 text-center font-mono text-gray-400">
                    {d.stores['Plaza Indonesia'].qty}
                  </td>

                  {/* Plaza Senayan */}
                  <td className="py-1 px-2 border border-gray-100 text-right font-mono text-gray-500">
                    <Amt value={d.stores['Plaza Senayan'].netSales} />
                  </td>
                  <td className="py-1 px-1 border border-gray-100 text-center font-mono text-gray-400">
                    {d.stores['Plaza Senayan'].qty}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* PDF Totals */}
          <tfoot className="bg-slate-100 font-bold text-slate-800">
            <tr>
              <td className="py-1.5 px-2 text-center border border-slate-300" colSpan={2}>TOTAL</td>
              <td className="py-1.5 px-2 border border-slate-300 text-right font-mono"><Amt value={totals.totalSales} /></td>
              <td className="py-1.5 px-2 border border-slate-300 text-center font-mono">{totals.totalQty}</td>

              {/* Bali */}
              <td className="py-1.5 px-2 border border-slate-300 text-right font-mono"><Amt value={totals.baliSales} /></td>
              <td className="py-1.5 px-1 border border-slate-300 text-center font-mono">{totals.baliQty}</td>

              {/* Head Office */}
              <td className="py-1.5 px-2 border border-slate-300 text-right font-mono"><Amt value={totals.hoSales} /></td>
              <td className="py-1.5 px-1 border border-slate-300 text-center font-mono">{totals.hoQty}</td>

              {/* Plaza Indonesia */}
              <td className="py-1.5 px-2 border border-slate-300 text-right font-mono"><Amt value={totals.piSales} /></td>
              <td className="py-1.5 px-1 border border-slate-300 text-center font-mono">{totals.piQty}</td>

              {/* Plaza Senayan */}
              <td className="py-1.5 px-2 border border-slate-300 text-right font-mono"><Amt value={totals.psSales} /></td>
              <td className="py-1.5 px-1 border border-slate-300 text-center font-mono">{totals.psQty}</td>
            </tr>
          </tfoot>
        </table>

        {/* PDF Footer */}
        <div className="mt-4 pt-1.5 border-t border-slate-200 text-[8px] text-slate-400 flex justify-between items-center">
          <div>
            <p className="font-bold text-slate-600 tracking-wider uppercase">Confidential — Internal Use Only</p>
            <p>Bvlgari Indonesia &middot; MRA Retail</p>
          </div>
          <p className="text-right">Generated from Bvlgari Intelligence Portal</p>
        </div>
      </div>
    </div>
  );
}

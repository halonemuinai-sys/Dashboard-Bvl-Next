"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Filter, 
  RefreshCw, 
  Download, 
  FileSpreadsheet, 
  Table,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { dashboardService } from '@/services/dashboardService';
import BvlgariLoader from '@/components/BvlgariLoader';
import { getDayType, getHolidayName } from '@/lib/holidays';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DailyBreakdownPage() {
  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear] = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dashboardService.getDailyBreakdown(month, parseInt(year));
        setData(res);
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
        redBg:      'FEF2F2'
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

      // Set columns (12 columns total: A to L)
      ws.columns = [
        { width: 14 }, // A: Date
        { width: 12 }, // B: Day
        { width: 18 }, // C: Total Sales
        { width: 10 }, // D: Total Qty
        { width: 16 }, // E: Bali Sales
        { width: 8  }, // F: Bali Qty
        { width: 16 }, // G: HO Sales
        { width: 8  }, // H: HO Qty
        { width: 16 }, // I: PI Sales
        { width: 8  }, // J: PI Qty
        { width: 16 }, // K: PS Sales
        { width: 8  }  // L: PS Qty
      ];

      // Title Section
      ws.mergeCells('A1:L1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'DAILY BREAKDOWN (ALL STORES)';
      titleCell.font = { name: 'Georgia', bold: true, size: 15, color: { argb: 'FF' + C.navyBg } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 36;

      ws.mergeCells('A2:L2');
      const dateCell = ws.getCell('A2');
      dateCell.value = `Analysis Period: ${month} ${year}`;
      dateCell.font = { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 18;

      ws.addRow([]); // Blank Row 3

      // Row 4: Stores (Merged Headers)
      const r4 = ws.getRow(4);
      r4.height = 24;
      
      // Merge headers
      ws.mergeCells('A4:A5');
      ws.mergeCells('B4:B5');
      ws.mergeCells('C4:C5');
      ws.mergeCells('D4:D5');
      ws.mergeCells('E4:F4');
      ws.mergeCells('G4:H4');
      ws.mergeCells('I4:J4');
      ws.mergeCells('K4:L4');

      r4.getCell(1).value = 'DATE';
      r4.getCell(2).value = 'DAY';
      r4.getCell(3).value = 'TOTAL SALES';
      r4.getCell(4).value = 'TOTAL QTY';
      r4.getCell(5).value = 'BALI';
      r4.getCell(7).value = 'HEAD OFFICE';
      r4.getCell(9).value = 'PLAZA INDONESIA';
      r4.getCell(11).value = 'PLAZA SENAYAN';

      // Row 5: Sub-headers
      const r5 = ws.getRow(5);
      r5.height = 20;
      r5.getCell(5).value = 'NET SALES'; r5.getCell(6).value = 'QTY';
      r5.getCell(7).value = 'NET SALES'; r5.getCell(8).value = 'QTY';
      r5.getCell(9).value = 'NET SALES'; r5.getCell(10).value = 'QTY';
      r5.getCell(11).value = 'NET SALES'; r5.getCell(12).value = 'QTY';

      // Style Headers
      [4, 5].forEach(rowNum => {
        const row = ws.getRow(rowNum);
        row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (colIdx <= 4 ? C.navyBg : C.slateBg) } };
          cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.navyText }, size: 9 };
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

        const row = ws.addRow([
          holidayName ? `${d.dateStr} *` : d.dateStr,
          d.dayOfWeek,
          d.totalSales,
          d.totalQty,
          d.stores['Bali'].netSales,
          d.stores['Bali'].qty,
          d.stores['Head Office'].netSales,
          d.stores['Head Office'].qty,
          d.stores['Plaza Indonesia'].netSales,
          d.stores['Plaza Indonesia'].qty,
          d.stores['Plaza Senayan'].netSales,
          d.stores['Plaza Senayan'].qty
        ]);
        row.height = 20;

        row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.border = borderAll();
          cell.font = { name: 'Arial', size: 9 };

          // Default backgrounds
          if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
          }

          // Red highlights for weekends & holidays
          if (isRedDay) {
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
          } else if (colIdx === 3 || colIdx === 5 || colIdx === 7 || colIdx === 9 || colIdx === 11) {
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
      const totRow = ws.addRow([
        'TOTAL',
        '',
        totals.totalSales,
        totals.totalQty,
        totals.baliSales,
        totals.baliQty,
        totals.hoSales,
        totals.hoQty,
        totals.piSales,
        totals.piQty,
        totals.psSales,
        totals.psQty
      ]);
      totRow.height = 24;
      ws.mergeCells(`A${totRowIdx}:B${totRowIdx}`);

      totRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
        cell.border = borderAll(C.slateBg);
        cell.font = { name: 'Arial', bold: true, size: 9.5, color: { argb: 'FF' + C.navyBg } };

        if (colIdx === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colIdx === 3 || colIdx === 5 || colIdx === 7 || colIdx === 9 || colIdx === 11) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = numFmt;
        } else if (colIdx === 4 || colIdx === 6 || colIdx === 8 || colIdx === 10 || colIdx === 12) {
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Table className="w-5 h-5 text-blue-600" />
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

      {/* Main Table Screen View */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {/* Row 1: Stores */}
              <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 border-r border-slate-200/60" rowSpan={2}>Date</th>
                <th className="py-3 px-4 border-r border-slate-200/60" rowSpan={2}>Day</th>
                <th className="py-3 px-4 border-r border-slate-200/60 text-right" rowSpan={2}>Total Sales</th>
                <th className="py-3 px-4 border-r border-slate-200/60 text-center" rowSpan={2}>Total Qty</th>
                <th className="py-2 px-4 border-r border-slate-200/60 text-center bg-blue-50/30" colSpan={2}>Bali</th>
                <th className="py-2 px-4 border-r border-slate-200/60 text-center bg-slate-100/30" colSpan={2}>Head Office</th>
                <th className="py-2 px-4 border-r border-slate-200/60 text-center bg-indigo-50/20" colSpan={2}>Plaza Indonesia</th>
                <th className="py-2 px-4 text-center bg-amber-50/20" colSpan={2}>Plaza Senayan</th>
              </tr>
              {/* Row 2: Sub-headers */}
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="py-2 px-4 border-r border-slate-200/60 text-right bg-blue-50/20">Net Sales</th>
                <th className="py-2 px-3 border-r border-slate-200/60 text-center bg-blue-50/20">Qty</th>
                <th className="py-2 px-4 border-r border-slate-200/60 text-right bg-slate-100/20">Net Sales</th>
                <th className="py-2 px-3 border-r border-slate-200/60 text-center bg-slate-100/20">Qty</th>
                <th className="py-2 px-4 border-r border-slate-200/60 text-right bg-indigo-50/10">Net Sales</th>
                <th className="py-2 px-3 border-r border-slate-200/60 text-center bg-indigo-50/10">Qty</th>
                <th className="py-2 px-4 border-r border-slate-200/60 text-right bg-amber-50/10">Net Sales</th>
                <th className="py-2 px-3 text-center bg-amber-50/10">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((d) => {
                const dayNum = d.dayNum;
                const dayType = getDayType(yearNum, monthIndex, dayNum);
                const holidayName = getHolidayName(yearNum, monthIndex, dayNum);
                const isRedDay = dayType === 'weekend' || dayType === 'holiday';

                return (
                  <tr key={d.dayNum} className="hover:bg-indigo-50/10 transition-colors">
                    {/* Date */}
                    <td className="py-2.5 px-4 font-mono font-medium border-r border-slate-100 text-slate-600 text-center">
                      <span className="flex items-center justify-center gap-1">
                        {d.dateStr}
                        {holidayName && (
                          <span className="text-rose-500 font-bold animate-pulse" title={holidayName}>*</span>
                        )}
                      </span>
                    </td>
                    {/* Day */}
                    <td className={cn(
                      "py-2.5 px-4 border-r border-slate-100 font-bold",
                      isRedDay ? "text-rose-500" : "text-slate-700"
                    )} title={holidayName || undefined}>
                      {d.dayOfWeek}
                    </td>
                    {/* Total Sales */}
                    <td className="py-2.5 px-4 border-r border-slate-100 text-right font-bold font-mono text-slate-800">
                      <Amt value={d.totalSales} />
                    </td>
                    {/* Total Qty */}
                    <td className="py-2.5 px-4 border-r border-slate-100 text-center font-bold font-mono text-slate-700">
                      {d.totalQty}
                    </td>

                    {/* Bali */}
                    <td className="py-2.5 px-4 border-r border-slate-100 text-right font-mono text-slate-500">
                      <Amt value={d.stores['Bali'].netSales} />
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-center font-mono text-slate-400">
                      {d.stores['Bali'].qty}
                    </td>

                    {/* Head Office */}
                    <td className="py-2.5 px-4 border-r border-slate-100 text-right font-mono text-slate-400">
                      <Amt value={d.stores['Head Office'].netSales} />
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-center font-mono text-slate-300">
                      {d.stores['Head Office'].qty}
                    </td>

                    {/* Plaza Indonesia */}
                    <td className="py-2.5 px-4 border-r border-slate-100 text-right font-mono text-slate-500">
                      <Amt value={d.stores['Plaza Indonesia'].netSales} />
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-center font-mono text-slate-400">
                      {d.stores['Plaza Indonesia'].qty}
                    </td>

                    {/* Plaza Senayan */}
                    <td className="py-2.5 px-4 border-r border-slate-100 text-right font-mono text-slate-500">
                      <Amt value={d.stores['Plaza Senayan'].netSales} />
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                      {d.stores['Plaza Senayan'].qty}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Footer */}
            <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800">
              <tr>
                <td className="py-3 px-4 text-center border-r border-slate-200/60" colSpan={2}>TOTAL</td>
                <td className="py-3 px-4 border-r border-slate-200/60 text-right font-mono text-slate-900"><Amt value={totals.totalSales} /></td>
                <td className="py-3 px-4 border-r border-slate-200/60 text-center font-mono text-slate-900">{totals.totalQty}</td>
                
                {/* Bali */}
                <td className="py-3 px-4 border-r border-slate-200/60 text-right font-mono text-slate-700"><Amt value={totals.baliSales} /></td>
                <td className="py-3 px-3 border-r border-slate-200/60 text-center font-mono text-slate-600">{totals.baliQty}</td>

                {/* Head Office */}
                <td className="py-3 px-4 border-r border-slate-200/60 text-right font-mono text-slate-500"><Amt value={totals.hoSales} /></td>
                <td className="py-3 px-3 border-r border-slate-200/60 text-center font-mono text-slate-400">{totals.hoQty}</td>

                {/* Plaza Indonesia */}
                <td className="py-3 px-4 border-r border-slate-200/60 text-right font-mono text-slate-700"><Amt value={totals.piSales} /></td>
                <td className="py-3 px-3 border-r border-slate-200/60 text-center font-mono text-slate-600">{totals.piQty}</td>

                {/* Plaza Senayan */}
                <td className="py-3 px-4 border-r border-slate-200/60 text-right font-mono text-slate-700"><Amt value={totals.psSales} /></td>
                <td className="py-3 px-3 text-center font-mono text-slate-600">{totals.psQty}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

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
            <div className="text-base font-black text-emerald-600"><Amt value={totals.totalSales - totals.hoSales} /></div>
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

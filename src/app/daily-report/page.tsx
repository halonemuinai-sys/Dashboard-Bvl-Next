"use client";

import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Store, 
  ChevronRight,
  Info,
  Send,
  Mail,
  CreditCard,
  Download,
  TrendingUp,
  Clock,
  RefreshCw,
  MessageCircle,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService } from '@/services/dashboardService';
import Amt from '@/components/Amt';
import CustomCalendar from '@/components/CustomCalendar';
import BvlgariLoader from '@/components/BvlgariLoader';

const fmtPct = (n: number) => (typeof n === 'number' && !isNaN(n) ? n.toFixed(1) + '%' : '0.0%');
const getLocalDateString = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export default function DailyReportPage() {
  const [date, setDate] = useState(getLocalDateString(new Date()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const handleSendEmail = async () => {
    if (!confirm(`Are you sure you want to send the Daily Report for ${date}?`)) return;
    
    setSending(true);
    try {
      const res = await fetch('/api/reports/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      
      const result = await res.json();
      if (result.success) {
        alert("Email sent successfully!");
      } else {
        alert("Failed to send email: " + (result.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error sending email: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPDF = async () => {
    // Dynamically import to avoid SSR issues
    const html2canvas = (await import('html2canvas-pro')).default;
    const { jsPDF } = await import('jspdf');
    
    // Target the professional off-screen document
    const element = document.getElementById('pdf-document');
    if (!element) return;
    
    // Briefly make it visible but absolute to avoid layout shift, so html2canvas can capture it properly
    element.style.left = '0';
    element.style.top = '0';
    element.style.position = 'absolute';
    element.style.zIndex = '-100';

    // Capture the element
    const canvas = await html2canvas(element, {
      scale: 2.0,
      useCORS: true,
      windowWidth: 794 // A4 width
    });

    // Re-hide the element
    element.style.left = '-9999px';
    
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate dimensions to maintain aspect ratio
    let drawWidth = pdfWidth;
    let drawHeight = (canvas.height * pdfWidth) / canvas.width;

    // Force fit onto 1 single page if it's too tall
    if (drawHeight > pdfHeight) {
      drawHeight = pdfHeight;
      drawWidth = (canvas.width * pdfHeight) / canvas.height;
    }

    // Center horizontally if scaled down
    const xPos = (pdfWidth - drawWidth) / 2;

    pdf.addImage(imgData, 'JPEG', xPos, 0, drawWidth, drawHeight);
    
    pdf.save(`Daily Sales Report - ${date}.pdf`);
  };

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
        greenText:  '059669',
        amberText:  'D97706',
        redText:    'DC2626',
        summaryBg:  'F0FDF4',
      };

      const thinBorder = (color: string) => ({ style: 'thin' as const, color: { argb: 'FF' + color } });
      const borderAll = (color = C.border) => ({
        top: thinBorder(color), bottom: thinBorder(color),
        left: thinBorder(color), right: thinBorder(color)
      });
      const numFmt = 'Rp #,##0;[Red](Rp #,##0);"-"';
      const pctFmt = '0.0%';

      const formattedDate = new Date(date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // SHEET 1: Overview
      const wsOverview = wb.addWorksheet('Overview', {
        views: [{ showGridLines: true }]
      });

      wsOverview.columns = [
        { width: 26 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 14 },
        { width: 18 },
        { width: 14 },
        { width: 14 },
        { width: 14 }
      ];

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

      const gHeaders = ['Metric Name', 'MTD Value', 'Target / Status', 'Achievement %', 'Cost % (MTD)', 'Average Discount'];
      const gHdrRow = wsOverview.addRow(gHeaders);
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
        ['Store Sales (Excl. HO)', kpis.storeSales, `Growth: ${kpis.storeSalesGrowth >= 0 ? '+' : ''}${kpis.storeSalesGrowth.toFixed(1)}%`, '-', '-', '-']
      ];

      kpiRows.forEach((kRowData, idx) => {
        const row = wsOverview.addRow(kRowData);
        row.height = 22;
        row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.border = borderAll();
          cell.font = { name: 'Arial', size: 10 };
          if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
          }
          if (colIdx === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if (colIdx === 2) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.numFmt = numFmt;
          } else if (colIdx === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            if (typeof cell.value === 'number') {
              cell.numFmt = numFmt;
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              cell.font = { name: 'Arial', size: 10, bold: true };
            }
          } else if (colIdx === 4) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            if (typeof cell.value === 'number') {
              cell.numFmt = pctFmt;
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF' + (cell.value >= 1.0 ? C.greenText : C.amberText) } };
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
          } else if (colIdx === 5 || colIdx === 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            if (typeof cell.value === 'number') {
              cell.numFmt = pctFmt;
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
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

      const bHeaders = [
        'Boutique Name', 
        "Today's Sales", 
        'MTD Sales', 
        'MTD Target', 
        'Achv %', 
        'Rem. to Target', 
        'MTD Cost %', 
        'MTD MDR %', 
        'Avg Disc MTD'
      ];
      const bHdrRow = wsOverview.addRow(bHeaders);
      bHdrRow.height = 26;
      bHdrRow.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.slateBg } };
        cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.slateText }, size: 9.5 };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'right' };
        cell.border = borderAll(C.slateBg);
      });

      data.stores.forEach((store: any, idx: number) => {
        const row = wsOverview.addRow([
          store.storeName,
          store.metrics.todaySales,
          store.metrics.mtdSales,
          store.metrics.target,
          store.metrics.achievement / 100,
          store.metrics.remaining,
          store.metrics.mtdCostPct / 100,
          store.metrics.mtdMdrPct / 100,
          store.metrics.avgDiscMtd / 100
        ]);
        row.height = 22;
        row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.border = borderAll();
          cell.font = { name: 'Arial', size: 9.5 };
          
          if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
          }

          if (colIdx === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
            cell.font = { name: 'Arial', bold: true, size: 9.5 };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            if (colIdx === 2 || colIdx === 3 || colIdx === 4 || colIdx === 6) {
              cell.numFmt = numFmt;
            } else if (colIdx === 5) {
              cell.numFmt = pctFmt;
              const val = cell.value as number;
              cell.font = { 
                name: 'Arial', 
                bold: true, 
                size: 9.5, 
                color: { argb: 'FF' + (val >= 1.0 ? C.greenText : val >= 0.8 ? C.amberText : C.redText) } 
              };
            } else {
              cell.numFmt = pctFmt;
            }
          }
        });
      });

      const storeTotalSalesToday = data.stores.reduce((acc: number, s: any) => acc + s.metrics.todaySales, 0);
      const storeTotalSalesMtd = data.stores.reduce((acc: number, s: any) => acc + s.metrics.todaySales ? s.metrics.mtdSales : 0, 0);
      const storeTotalTarget = data.stores.reduce((acc: number, s: any) => acc + s.metrics.target, 0);
      const storeTotalRemaining = data.stores.reduce((acc: number, s: any) => acc + s.metrics.remaining, 0);
      const overallAchv = storeTotalTarget > 0 ? (storeTotalSalesMtd / storeTotalTarget) : 0;
      
      const totRow = wsOverview.addRow([
        'Total Boutiques',
        storeTotalSalesToday,
        storeTotalSalesMtd,
        storeTotalTarget,
        overallAchv,
        storeTotalRemaining,
        '-',
        '-',
        '-'
      ]);
      totRow.height = 24;
      totRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
        cell.border = borderAll(C.slateBg);
        cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF' + C.navyBg } };
        if (colIdx === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          if (colIdx === 2 || colIdx === 3 || colIdx === 4 || colIdx === 6) {
            cell.numFmt = numFmt;
          } else if (colIdx === 5) {
            cell.numFmt = pctFmt;
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        }
      });

      // SHEET 2: Boutique Category Details
      const wsDetails = wb.addWorksheet('Boutique Category Details', {
        views: [{ showGridLines: true }]
      });

      wsDetails.columns = [
        { width: 22 },
        { width: 14 },
        { width: 20 },
        { width: 20 },
        { width: 16 },
        { width: 16 }
      ];

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

      data.stores.forEach((store: any) => {
        const sHeaderRowIdx = wsDetails.rowCount + 1;
        const storeBanner = wsDetails.addRow([store.storeName.toUpperCase()]);
        storeBanner.height = 24;
        wsDetails.mergeCells(`A${sHeaderRowIdx}:F${sHeaderRowIdx}`);
        storeBanner.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.navyBg } };
        storeBanner.getCell(1).font = { name: 'Arial', bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } };
        storeBanner.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        
        const miniSummaryRow = wsDetails.addRow([
          `Today Sales: Rp ${store.metrics.todaySales.toLocaleString('id-ID')} | Qty: ${store.metrics.todayQty} pcs`,
          '',
          `MTD: Rp ${store.metrics.mtdSales.toLocaleString('id-ID')} / Rp ${store.metrics.target.toLocaleString('id-ID')}`,
          '',
          `Achv: ${store.metrics.achievement.toFixed(1)}% | MTD Cost: ${store.metrics.mtdCostPct.toFixed(1)}%`,
          ''
        ]);
        miniSummaryRow.height = 20;
        wsDetails.mergeCells(`A${sHeaderRowIdx+1}:B${sHeaderRowIdx+1}`);
        wsDetails.mergeCells(`C${sHeaderRowIdx+1}:D${sHeaderRowIdx+1}`);
        wsDetails.mergeCells(`E${sHeaderRowIdx+1}:F${sHeaderRowIdx+1}`);
        
        miniSummaryRow.eachCell({ includeEmpty: false }, cell => {
          cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF475569' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.border = borderAll();
        });

        const tHeaders = ['Category', 'Qty (Sold)', 'Reg Sales', 'SMI Sales', 'Disc %', 'Rem. Stock'];
        const tHdrRow = wsDetails.addRow(tHeaders);
        tHdrRow.height = 22;
        tHdrRow.eachCell((cell, colNumber) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.slateBg } };
          cell.font = { name: 'Arial', bold: true, color: { argb: 'FF' + C.slateText }, size: 9 };
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : colNumber === 2 || colNumber === 5 || colNumber === 6 ? 'center' : 'right' };
          cell.border = borderAll(C.slateBg);
        });

        const catData = Object.entries(store.tableData);
        catData.forEach(([cat, vals]: any, catIdx) => {
          const discPct = vals.gross > 0 ? (vals.valDisc / vals.gross) : 0;
          const row = wsDetails.addRow([
            cat,
            vals.qty,
            vals.netNonSMI,
            vals.netSMI,
            discPct,
            vals.stock
          ]);
          row.height = 20;
          row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
            cell.border = borderAll();
            cell.font = { name: 'Arial', size: 9 };
            if (catIdx % 2 === 1) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.lightBg } };
            }

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
              if (discPct > 0) {
                cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF' + C.amberText } };
              }
            } else if (colIdx === 6) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              cell.numFmt = '#,##0';
              cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF' + C.redText } };
            }
          });
        });

        const storeTotalQty = catData.reduce((acc: number, [_, v]: any) => acc + v.qty, 0);
        const storeTotalReg = catData.reduce((acc: number, [_, v]: any) => acc + v.netNonSMI, 0);
        const storeTotalSmi = catData.reduce((acc: number, [_, v]: any) => acc + v.netSMI, 0);
        const storeTotalGross = catData.reduce((acc: number, [_, v]: any) => acc + v.gross, 0);
        const storeTotalDiscVal = catData.reduce((acc: number, [_, v]: any) => acc + v.valDisc, 0);
        const storeTotalStock = catData.reduce((acc: number, [_, v]: any) => acc + v.stock, 0);
        const storeOverallDisc = storeTotalGross > 0 ? (storeTotalDiscVal / storeTotalGross) : 0;

        const totalRow = wsDetails.addRow([
          'Total',
          storeTotalQty,
          storeTotalReg,
          storeTotalSmi,
          storeOverallDisc,
          storeTotalStock
        ]);
        totalRow.height = 22;
        totalRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.accentBg } };
          cell.border = borderAll(C.slateBg);
          cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF' + C.navyBg } };
          
          if (colIdx === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if (colIdx === 2) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.numFmt = '#,##0';
          } else if (colIdx === 3 || colIdx === 4) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.numFmt = numFmt;
          } else if (colIdx === 5) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.numFmt = pctFmt;
          } else if (colIdx === 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.numFmt = '#,##0';
          }
        });

        wsDetails.addRow([]);
        wsDetails.addRow([]);
        wsDetails.addRow([]);
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Daily_Sales_Report_${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('Error exporting Excel: ' + err.message);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!data) return;
    
    const formattedDate = new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const msg = `*🏢 BVLGARI DAILY SALES REPORT*\n` +
                `📅 ${formattedDate}\n\n` +
                `📊 *GLOBAL OVERVIEW*\n` +
                `• Total Sales: Rp ${data.globalKPIs.totalSales.toLocaleString('id-ID')}\n` +
                `• Achievement: *${data.globalKPIs.globalAchievement.toFixed(1)}%*\n` +
                `• MTD Cost %: ${data.globalKPIs.mtdCostPct.toFixed(1)}%\n\n` +
                `🏪 *STORE PERFORMANCE*\n` +
                data.stores.map((s: any) => `• *${s.storeName}*: ${s.metrics.achievement.toFixed(1)}% Ach.`).join('\n') +
                `\n\n_Generated via Bvlgari Dashboard - MRA Retail_\n` +
                `🔗 View Online: ${window.location.origin}/daily-report?date=${date}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dashboardService.getDailyReport(date);
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  if (loading || !data) return <BvlgariLoader message="Loading Daily Report..." />;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Daily Sales Report</h1>
          <p className="text-slate-400 text-sm mt-0.5">Real-time store performance for {data.monthName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Select Buttons */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => {
                setDate(getLocalDateString(new Date()));
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                date === getLocalDateString(new Date())
                  ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              Today
            </button>
            <button 
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                setDate(getLocalDateString(d));
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                date === getLocalDateString(new Date(new Date().setDate(new Date().getDate() - 1)))
                  ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              Yesterday
            </button>
          </div>

          <div className="relative">
            <div 
              onClick={() => setShowCalendar(!showCalendar)}
              className="group flex items-center gap-3 bg-white border border-slate-200 p-1.5 pr-6 rounded-2xl shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors duration-500">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pick Date</span>
                <span className="text-sm font-black text-slate-700">
                  {new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {showCalendar && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowCalendar(false)} 
                />
                <div className="absolute top-full left-0 mt-3 z-50">
                  <CustomCalendar 
                    selectedDate={date} 
                    onSelect={(d) => {
                      setDate(d);
                      setShowCalendar(false);
                    }} 
                  />
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={exportingExcel}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold"
          >
            {exportingExcel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Excel
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>

          <button
            onClick={handleSendEmail}
            disabled={sending}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-md shadow-slate-200 transition-all text-sm font-bold"
          >
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Report'}
          </button>
        </div>
      </div>

      <div id="pdf-report-container" className="space-y-6">
        {/* Global KPI Overview */}
        {data.globalKPIs && (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-slate-900" />
              Global Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 rounded-2xl border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Sales (Inc HO)</p>
                <p className="text-lg font-black text-slate-800"><Amt value={data.globalKPIs.totalSales} /></p>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 rounded-2xl border border-slate-200/60 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Store Sales (Exc HO)</p>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-lg",
                    data.globalKPIs.storeSalesGrowth >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                  )}>
                    {data.globalKPIs.storeSalesGrowth >= 0 ? '+' : ''}{data.globalKPIs.storeSalesGrowth.toFixed(1)}%
                  </span>
                </div>
                <p className="text-lg font-black text-slate-800 mt-2"><Amt value={data.globalKPIs.storeSales} /></p>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 rounded-2xl border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Global Target MTD</p>
                <p className="text-lg font-black text-slate-800"><Amt value={data.globalKPIs.globalTarget} /></p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-100/60">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Achievement</p>
                <p className={cn("text-lg font-black", data.globalKPIs.globalAchievement >= 100 ? "text-emerald-600" : "text-amber-600")}>
                  {fmtPct(data.globalKPIs.globalAchievement)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-4 rounded-2xl border border-rose-100/60">
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">MTD Cost %</p>
                <p className={cn("text-lg font-black", data.globalKPIs.mtdCostPct > 15 ? "text-rose-600" : "text-slate-800")}>
                  {fmtPct(data.globalKPIs.mtdCostPct)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-100/60">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">AVG Disc MTD</p>
                <p className="text-lg font-black text-amber-600">{fmtPct(data.globalKPIs.avgDiscMtd)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Store Cards Loop */}
        <div className="grid grid-cols-1 gap-8">
        {data.stores.map((store: any) => (
          <div key={store.storeName} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
            {/* Store Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-slate-100/30 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">{store.storeName}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MTD Achievement</span>
                    <span className={cn(
                      "text-xs font-black px-2 py-0.5 rounded-full",
                      store.metrics.achievement >= 100 ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
                    )}>
                      {fmtPct(store.metrics.achievement)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Today's Sales</p>
                  <p className="text-xl font-black text-slate-800"><Amt value={store.metrics.todaySales} /></p>
                </div>
                <div className="text-right border-l border-slate-200 pl-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">MTD Sales</p>
                  <p className="text-xl font-black text-slate-900"><Amt value={store.metrics.mtdSales} /></p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
              {/* Target & Progress */}
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Monthly Target</p>
                    <p className="text-lg font-black text-slate-900 leading-none">
                      <Amt value={store.metrics.target} />
                    </p>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-0.5">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        store.metrics.achievement >= 100 ? "bg-emerald-500" : "bg-slate-900"
                      )}
                      style={{ width: `${Math.max(5, Math.min(store.metrics.achievement, 100))}%` as any }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-[10px] font-bold text-slate-400">0%</p>
                    <p className={cn(
                      "text-[10px] font-black px-1.5 py-0.5 rounded",
                      store.metrics.achievement >= 100 ? "text-emerald-600 bg-emerald-50" : "text-slate-600 bg-slate-100"
                    )}>
                      {fmtPct(store.metrics.achievement)}
                    </p>
                  </div>
                </div>
                <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                  <p className="text-[10px] font-black text-rose-600 uppercase mb-1 tracking-widest">Remaining to Target</p>
                  <p className="text-base font-black text-rose-700 leading-none"><Amt value={store.metrics.remaining} /></p>
                </div>
              </div>

              {/* Today's Metrics */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">Today's Cost %</span>
                  </div>
                  <span className={cn("text-sm font-black", store.metrics.sellingCostTodayPct > 15 ? "text-rose-500" : "text-slate-800")}>
                    {fmtPct(store.metrics.sellingCostTodayPct)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">MDR Cost %</span>
                  </div>
                  <span className={cn("text-sm font-black", store.metrics.mdrCostTodayPct > 2 ? "text-rose-500" : "text-slate-800")}>
                    {fmtPct(store.metrics.mdrCostTodayPct)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">Sales Qty</span>
                  </div>
                  <span className="text-sm font-black text-slate-800">{store.metrics.todayQty} pcs</span>
                </div>
              </div>

              {/* MTD Metrics */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-rose-50/50 to-pink-50/50 rounded-xl border border-rose-100/40">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-rose-600">MTD Cost %</span>
                  </div>
                  <span className={cn("text-sm font-black", store.metrics.mtdCostPct > 15 ? "text-rose-600" : "text-rose-500")}>
                    {fmtPct(store.metrics.mtdCostPct)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-50/50 to-slate-100/50 rounded-xl border border-slate-200/40">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">MTD MDR %</span>
                  </div>
                  <span className="text-sm font-black text-slate-600">
                    {fmtPct(store.metrics.mtdMdrPct)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-amber-50/50 to-orange-50/50 rounded-xl border border-amber-100/40">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-600">AVG Disc MTD</span>
                  </div>
                  <span className="text-sm font-black text-amber-600">{fmtPct(store.metrics.avgDiscMtd)}</span>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div className="lg:col-span-2">
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-slate-100/30 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2 text-center text-slate-900">Qty (Sold)</th>
                        <th className="px-4 py-2 text-right">Reg Sales</th>
                        <th className="px-4 py-2 text-right text-slate-900 bg-slate-50/50">SMI Sales</th>
                        <th className="px-4 py-2 text-center text-amber-500 bg-amber-50/30">Disc %</th>
                        <th className="px-4 py-2 text-center text-rose-500 bg-rose-50/30">Rem. Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {Object.entries(store.tableData).map(([cat, vals]: any) => (
                        <tr key={cat} className="text-xs hover:bg-indigo-50/20 transition-colors">
                          <td className="px-4 py-2 font-bold text-slate-700">{cat}</td>
                          <td className="px-4 py-2 text-center font-mono text-slate-500">{vals.qty}</td>
                          <td className="px-4 py-2 text-right font-mono"><Amt value={vals.netNonSMI} /></td>
                          <td className="px-4 py-2 text-right font-mono text-slate-900 bg-slate-50/20"><Amt value={vals.netSMI} /></td>
                          <td className="px-4 py-2 text-center font-bold text-amber-600 bg-amber-50/20">
                            {vals.gross > 0 ? ((vals.valDisc / vals.gross) * 100).toFixed(1) : '0.0'}%
                          </td>
                          <td className="px-4 py-2 text-center font-black text-rose-500 bg-rose-50/20">{vals.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* --- PROFESSIONAL PDF DOCUMENT (OFF-SCREEN) --- */}
      <div 
        id="pdf-document" 
        className="absolute -left-[9999px] top-0 w-[794px] bg-white text-black font-sans p-8 box-border"
        style={{ minHeight: '1123px' }}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white py-4 px-6 mb-4 -mx-8 -mt-8">
          <h1 className="text-2xl font-serif uppercase tracking-[0.25em] text-white text-center">Bvlgari</h1>
          <h2 className="text-sm mt-1 font-medium text-slate-300 tracking-widest uppercase text-center">Daily Sales Performance Report</h2>
          <p className="text-[10px] text-slate-400 mt-1 text-center">
            {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Executive Summary */}
        {data.globalKPIs && (
        <div className="mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1 mb-2">Executive Summary</h3>
          <div className="grid grid-cols-2 gap-6">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Total Sales (Incl. HO)</td>
                  <td className="py-1 text-right font-mono font-bold"><Amt value={data.globalKPIs.totalSales}/></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Store Sales (Excl. HO)</td>
                  <td className="py-1 text-right font-mono font-bold"><Amt value={data.globalKPIs.storeSales}/></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Global Target MTD</td>
                  <td className="py-1 text-right font-mono font-bold"><Amt value={data.globalKPIs.globalTarget}/></td>
                </tr>
              </tbody>
            </table>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Global Achievement</td>
                  <td className="py-1 text-right font-mono font-bold">
                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded-sm">
                      {fmtPct(data.globalKPIs.globalAchievement)}
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">MTD Cost % (MDR + Disc)</td>
                  <td className="py-1 text-right font-mono font-bold text-rose-600">{fmtPct(data.globalKPIs.mtdCostPct)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Average Discount MTD</td>
                  <td className="py-1 text-right font-mono font-bold text-amber-600">{fmtPct(data.globalKPIs.avgDiscMtd)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Store Breakdown */}
        <div className="mb-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1 mb-3">Boutique Performance Breakdown</h3>
          
          {data.stores.map((store: any) => (
            <div key={store.storeName} className="mb-4">
              {/* Store Header */}
              <div className="bg-slate-800 text-white py-1.5 px-3 mb-2 flex justify-between items-center">
                <h4 className="font-bold text-sm">{store.storeName}</h4>
                <div className="text-right text-[10px]">
                  <span className="text-slate-300 mr-2 uppercase tracking-tighter">MTD Achievement:</span>
                  <span className="font-black bg-white text-slate-900 px-2 py-0.5 rounded-sm shadow-sm">
                    {fmtPct(store.metrics.achievement)}
                  </span>
                </div>
              </div>

              {/* Store Metrics */}
              <div className="grid grid-cols-7 gap-1.5 mb-2 text-[10px]">
                <div className="border border-gray-100 p-1.5">
                  <div className="text-gray-500 mb-0.5 text-[9px] leading-tight">MTD Sales</div>
                  <div className="font-bold font-mono"><Amt value={store.metrics.mtdSales} /></div>
                </div>
                <div className="border border-gray-100 p-1.5">
                  <div className="text-gray-500 mb-0.5 text-[9px] leading-tight">Target</div>
                  <div className="font-bold font-mono"><Amt value={store.metrics.target} /></div>
                </div>
                <div className="border border-gray-100 p-1.5 bg-rose-50/30">
                  <div className="text-rose-500 mb-0.5 text-[9px] leading-tight">Rem. to Target</div>
                  <div className="font-bold font-mono text-rose-600"><Amt value={store.metrics.remaining} /></div>
                </div>
                <div className="border border-gray-100 p-1.5">
                  <div className="text-gray-500 mb-0.5 text-[9px] leading-tight">Today's Sales</div>
                  <div className="font-bold font-mono"><Amt value={store.metrics.todaySales} /></div>
                </div>
                <div className="border border-gray-100 p-1.5">
                  <div className="text-gray-500 mb-0.5 text-[9px] leading-tight">MTD Cost %</div>
                  <div className="font-bold font-mono text-rose-600">{fmtPct(store.metrics.mtdCostPct)}</div>
                </div>
                <div className="border border-gray-100 p-1.5">
                  <div className="text-gray-500 mb-0.5 text-[9px] leading-tight">MTD MDR %</div>
                  <div className="font-bold font-mono">{fmtPct(store.metrics.mtdMdrPct)}</div>
                </div>
                <div className="border border-gray-100 p-1.5">
                  <div className="text-gray-500 mb-0.5 text-[9px] leading-tight">AVG Disc MTD</div>
                  <div className="font-bold font-mono text-amber-600">{fmtPct(store.metrics.avgDiscMtd)}</div>
                </div>
              </div>

              {/* Store Table */}
              <table className="w-full text-[10px] text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-800 text-white text-[9px] uppercase tracking-wider">
                    <th className="border border-slate-700 py-1 px-2">Category</th>
                    <th className="border border-slate-700 py-1 px-2 text-center">Qty (Sold)</th>
                    <th className="border border-slate-700 py-1 px-2 text-right">Reg Sales</th>
                    <th className="border border-slate-700 py-1 px-2 text-right">SMI Sales</th>
                    <th className="border border-slate-700 py-1 px-2 text-center">Disc %</th>
                    <th className="border border-slate-700 py-1 px-2 text-center">Rem. Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(store.tableData).map(([cat, vals]: any) => (
                    <tr key={cat}>
                      <td className="border border-gray-200 py-1 px-2 font-medium">{cat}</td>
                      <td className="border border-gray-200 py-1 px-2 text-center font-mono">{vals.qty}</td>
                      <td className="border border-gray-200 py-1 px-2 text-right font-mono"><Amt value={vals.netNonSMI} /></td>
                      <td className="border border-gray-200 py-1 px-2 text-right font-mono"><Amt value={vals.netSMI} /></td>
                      <td className="border border-gray-200 py-1 px-2 text-center font-mono">
                        {vals.gross > 0 ? ((vals.valDisc / vals.gross) * 100).toFixed(1) : '0.0'}%
                      </td>
                      <td className="border border-gray-200 py-1 px-2 text-center font-mono font-bold text-red-600">{vals.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-8 right-8 pt-2 border-t border-slate-200 text-[9px] text-slate-400 flex justify-between items-center">
          <div>
            <p className="font-bold text-slate-600 tracking-widest uppercase">Confidential</p>
            <p>Internal Use Only — Bvlgari Indonesia</p>
          </div>
          <div className="text-right">
            <p>Generated via Bvlgari Dashboard</p>
            <p className="font-bold text-slate-500">MRA Retail</p>
            <p className="text-[7px] mt-0.5">{new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}</p>
          </div>
        </div>
      </div>

    </div>
  );
}

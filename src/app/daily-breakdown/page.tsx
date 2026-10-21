"use client";

import { useState, useMemo, useCallback, useRef, Fragment } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Table,
  Info,
  Trophy,
  AlertTriangle,
  AlertCircle,
  EyeOff,
  Check,
  TrendingUp,
  Database,
  Store,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import InfoTip from '@/components/InfoTip';
import MonthYearPicker, { type MonthPeriod } from '@/components/MonthYearPicker';
import { dashboardService } from '@/services/dashboardService';
import { BREAKDOWN_STORES, type BreakdownDay, type BreakdownStore } from '@/services/dashboard/dailyService';
import { getDayType, getHolidayName } from '@/lib/holidays';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STORE_THEME: Record<BreakdownStore, { border: string; text: string; bg: string; fill: string; short: string }> = {
  'Bali':            { border: 'border-blue-200',  text: 'text-blue-600',  bg: 'bg-blue-50/50',  fill: 'bg-blue-600',  short: 'BL' },
  'Head Office':     { border: 'border-slate-200', text: 'text-slate-500', bg: 'bg-slate-50/50', fill: 'bg-slate-500', short: 'HO' },
  'Plaza Indonesia': { border: 'border-teal-200',  text: 'text-teal-600',  bg: 'bg-teal-50/40',  fill: 'bg-teal-600',  short: 'PI' },
  'Plaza Senayan':   { border: 'border-amber-200', text: 'text-amber-600', bg: 'bg-amber-50/40', fill: 'bg-amber-500', short: 'PS' }
};

const card = 'min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30';
const cardLabel = 'flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500';
const boutiqueSales = (d: BreakdownDay) => d.totalSales - d.stores['Head Office'].netSales;

export default function DailyBreakdownPage() {
  const [period, setPeriod] = useState<MonthPeriod>(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });
  const month = MONTHS[period.month];
  const year = String(period.year);

  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [data, setData] = useState<BreakdownDay[]>([]);
  const [loadedPeriod, setLoadedPeriod] = useState<MonthPeriod>(period);
  const dataLabel = `${MONTHS[loadedPeriod.month]} ${loadedPeriod.year}`;
  const [monthlyTarget, setMonthlyTarget] = useState<number>(0);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const requestId = useRef(0);

  // Column Toggles
  const [visibleStores, setVisibleStores] = useState<Record<BreakdownStore, boolean>>({
    'Bali': true,
    'Head Office': true,
    'Plaza Indonesia': true,
    'Plaza Senayan': true
  });

  // Crosshair hover state
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);

  const loadData = useCallback(async (target: MonthPeriod) => {
    const id = ++requestId.current;
    const targetMonth = MONTHS[target.month];
    setLoaded(true);
    setLoading(true);
    setError(null);
    try {
      const [days, boutiqueTarget] = await Promise.all([
        dashboardService.getDailyBreakdown(targetMonth, target.year),
        dashboardService.getBoutiqueMonthlyTarget(targetMonth, target.year)
      ]);
      if (id !== requestId.current) return;
      setData(days);
      setMonthlyTarget(boutiqueTarget);
      setLoadedPeriod(target);
      setLoadedAt(new Date());
    } catch (e) {
      console.error(e);
      if (id === requestId.current) setError({ message: 'Daily sales could not be loaded. Check your connection and try again.', retry: true });
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  // After the first load, changing the period reloads automatically.
  const changePeriod = (next: MonthPeriod) => {
    setPeriod(next);
    if (loaded) void loadData(next);
  };

  const activeStoresList = useMemo(() => BREAKDOWN_STORES.filter(s => visibleStores[s]), [visibleStores]);

  // Calculate totals
  const totals = useMemo(() => {
    const stores = Object.fromEntries(BREAKDOWN_STORES.map(s => [s, { netSales: 0, qty: 0 }])) as Record<BreakdownStore, { netSales: number; qty: number }>;
    let totalSales = 0;
    let totalQty = 0;
    data.forEach(d => {
      totalSales += d.totalSales;
      totalQty += d.totalQty;
      BREAKDOWN_STORES.forEach(s => {
        stores[s].netSales += d.stores[s].netSales;
        stores[s].qty += d.stores[s].qty;
      });
    });
    return { totalSales, totalQty, stores };
  }, [data]);

  // Exclude HO for store-only metrics
  const storeOnlySales = totals.totalSales - totals.stores['Head Office'].netSales;

  // Best / worst day and averages use boutique sales (Head Office excluded), consistent with the target.
  const { bestDayIdx, worstDayIdx, activeDays } = useMemo(() => {
    let best = -1, worst = -1, max = -Infinity, min = Infinity, active = 0;
    data.forEach((d, i) => {
      const sales = boutiqueSales(d);
      if (sales <= 0) return;
      active++;
      if (sales > max) { max = sales; best = i; }
      if (sales < min) { min = sales; worst = i; }
    });
    // A single active day is the best day, not also the worst.
    return { bestDayIdx: best, worstDayIdx: active > 1 ? worst : -1, activeDays: active };
  }, [data]);
  const avgSales = activeDays > 0 ? storeOnlySales / activeDays : 0;

  // Targets circle tracker progress
  const targetProgressPercent = monthlyTarget > 0 ? (storeOnlySales / monthlyTarget) * 100 : 0;

  // Dynamic store segments percentages
  const storeContributionShares = useMemo(() => {
    const baseSales = storeOnlySales > 0 ? storeOnlySales : 1;
    return (['Plaza Indonesia', 'Plaza Senayan', 'Bali'] as const)
      .map(name => ({ name, val: totals.stores[name].netSales, pct: (totals.stores[name].netSales / baseSales) * 100 }))
      .sort((a, b) => b.val - a.val);
  }, [totals, storeOnlySales]);

  const toggleStoreVisibility = (store: BreakdownStore) => {
    setVisibleStores(prev => ({ ...prev, [store]: !prev[store] }));
  };

  const dayMeta = (d: BreakdownDay, idx: number) => {
    const dayType = getDayType(loadedPeriod.year, loadedPeriod.month, d.dayNum);
    return {
      holidayName: getHolidayName(loadedPeriod.year, loadedPeriod.month, d.dayNum),
      isRedDay: dayType === 'weekend' || dayType === 'holiday',
      isBestDay: idx === bestDayIdx,
      isWorstDay: idx === worstDayIdx
    };
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
        slateBg:    '475569',
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
      const numFmt = '#,##0;[Red](#,##0);"-"';

      const ws = wb.addWorksheet('Daily Breakdown', {
        views: [{ showGridLines: true }]
      });

      // Date, Day, Total Sales, Total Qty, then Net Sales + Qty per visible store
      const excelCols = [{ width: 14 }, { width: 14 }, { width: 18 }, { width: 10 }];
      activeStoresList.forEach(() => {
        excelCols.push({ width: 16 });
        excelCols.push({ width: 8 });
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
      dateCell.value = `Analysis Period: ${dataLabel} · Amounts in IDR · * public holiday`;
      dateCell.font = { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 18;

      ws.addRow([]); // Blank Row 3

      // Row 4: Stores (Merged Headers)
      const r4 = ws.getRow(4);
      r4.height = 24;
      ['A', 'B', 'C', 'D'].forEach(col => ws.mergeCells(`${col}4:${col}5`));
      r4.getCell(1).value = 'DATE';
      r4.getCell(2).value = 'DAY';
      r4.getCell(3).value = 'TOTAL SALES';
      r4.getCell(4).value = 'TOTAL QTY';

      activeStoresList.forEach((storeName, i) => {
        const colIdxStart = 5 + (i * 2);
        ws.mergeCells(`${String.fromCharCode(64 + colIdxStart)}4:${String.fromCharCode(65 + colIdxStart)}4`);
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
        ws.getRow(rowNum).eachCell({ includeEmpty: true }, (cell, colIdx) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (colIdx <= 4 ? C.navyBg : C.slateBg) } };
          cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = borderAll(C.border);
        });
      });

      const isAmountCol = (colIdx: number) => colIdx === 3 || (colIdx >= 5 && colIdx % 2 === 1);

      // Data Rows
      data.forEach((d, idx) => {
        const { holidayName, isRedDay, isBestDay } = dayMeta(d, idx);
        const rowData: (string | number)[] = [
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
          if (isRedDay && !isBestDay && colIdx <= 2) {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF' + C.redText } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.redBg } };
          }

          // Alignments & formats
          if (colIdx === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if (colIdx === 2) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if (isAmountCol(colIdx)) {
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
      const totalRowData: (string | number)[] = ['TOTAL', '', totals.totalSales, totals.totalQty];
      activeStoresList.forEach(storeName => {
        totalRowData.push(totals.stores[storeName].netSales);
        totalRowData.push(totals.stores[storeName].qty);
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
        } else if (isAmountCol(colIdx)) {
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
      a.download = `Daily_Breakdown_${dataLabel.replace(' ', '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError({ message: 'Excel export failed: ' + (err instanceof Error ? err.message : String(err)), retry: false });
    } finally {
      setExportingExcel(false);
    }
  };

  const handleDownloadPDF = async () => {
    setExportingPDF(true);
    const element = document.getElementById('pdf-document');
    try {
      if (!element) return;
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      element.style.left = '0';
      element.style.top = '0';
      element.style.position = 'absolute';
      element.style.zIndex = '-100';

      const canvas = await html2canvas(element, {
        scale: 2.0,
        useCORS: true,
        windowWidth: 1123 // A4 landscape width in pixels
      });

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

      pdf.save(`Daily_Breakdown_${dataLabel.replace(' ', '_')}.pdf`);
    } catch (err) {
      console.error(err);
      setError({ message: 'PDF export failed: ' + (err instanceof Error ? err.message : String(err)), retry: false });
    } finally {
      if (element) element.style.left = '-9999px';
      setExportingPDF(false);
    }
  };

  const hasData = loaded && data.length > 0;
  const exportDisabled = !hasData || loading;

  return (
    <div className="space-y-5 pb-10">

      {/* ── HERO ── */}
      <motion.section initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white">
        <motion.div aria-hidden animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-dashed border-white/10" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><Table className="h-5 w-5 text-blue-200" /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Sales</p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Daily Breakdown (All Stores)</h1>
              <p className="mt-1 text-sm text-slate-300">Day-by-day net sales and units for every boutique and Head Office.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MonthYearPicker value={period} onChange={changePeriod} />
            <button type="button" onClick={() => void loadData(period)} disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50">
              {loaded ? <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> : <Database className="h-3.5 w-3.5" />}
              {loaded ? 'Reload' : 'Load data'}
            </button>
            <button type="button" onClick={handleDownloadExcel} disabled={exportDisabled || exportingExcel}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-40">
              {exportingExcel ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-300" />}
              Excel
            </button>
            <button type="button" onClick={handleDownloadPDF} disabled={exportDisabled || exportingPDF}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-40">
              {exportingPDF ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-blue-200" />}
              PDF
            </button>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{month} {year}</span>
          <span className="inline-flex items-center gap-1.5"><Store className="h-3.5 w-3.5" />{activeStoresList.length} of {BREAKDOWN_STORES.length} columns shown</span>
          <span className="rounded-md border border-white/15 px-2 py-0.5 text-[9px] font-semibold tracking-wider">AMOUNTS IN IDR</span>
          {loadedAt && <span className="ml-auto text-slate-400">Loaded {dataLabel} at {loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      </motion.section>

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span className="flex-1">{error.message}</span>
          {error.retry
            ? <button type="button" onClick={() => void loadData(period)} className="rounded-lg border border-rose-200 bg-white px-3 py-1 font-semibold hover:bg-rose-100">Try again</button>
            : <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="rounded p-1 hover:bg-rose-100"><X className="h-3.5 w-3.5" /></button>}
        </div>
      )}

      {!loaded ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Database className="h-5 w-5" /></span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{month} {year}</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">Choose a month, then load the daily sales. After loading, switching the month reloads automatically.</p>
          </div>
          <button type="button" onClick={() => void loadData(period)}
            className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700">
            <Database className="h-3.5 w-3.5" />Load data
          </button>
        </div>
      ) : !data.length ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-sm text-slate-500">
          {loading ? <><RefreshCw className="h-4 w-4 animate-spin text-blue-600" />Loading daily sales for {month} {year}…</> : 'No data to show.'}
        </div>
      ) : (
      <div className={cn('space-y-5 transition-opacity', loading && 'pointer-events-none opacity-60')} aria-busy={loading}>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

        {/* Card 1: Target Tracker (SVG Progress Ring) */}
        <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn(card, 'flex items-center gap-4')}>
          <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50"/>
              <circle className={cn('transition-all duration-1000', targetProgressPercent >= 100 ? 'text-emerald-500' : 'text-blue-600')} strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * Math.max(0, Math.min(100, targetProgressPercent))) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50"/>
            </svg>
            <span className="absolute text-[11px] font-bold text-slate-800 leading-none tabular-nums">
              {monthlyTarget > 0 ? `${targetProgressPercent.toFixed(0)}%` : '—'}
            </span>
          </div>
          <div className="min-w-0">
            <p className={cardLabel}>Target achieved<InfoTip label="About Target achieved" text="Boutique net sales this month divided by the boutiques' monthly target. Head Office is excluded from both." /></p>
            <p className="mt-1.5 text-lg font-semibold tracking-tight tabular-nums text-slate-900"><Amt value={storeOnlySales} /></p>
            <p className="mt-0.5 text-[10px] text-slate-500">Target {monthlyTarget > 0 ? <Amt value={monthlyTarget} /> : 'not set'} <span className="text-slate-400">· excl. HO</span></p>
          </div>
        </motion.article>

        {/* Card 2: Boutique Share Contribution */}
        <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className={cn(card, 'flex flex-col justify-between')}>
          <div>
            <p className={cardLabel}>Boutique share<InfoTip label="About Boutique share" text="Each boutique's share of total boutique net sales this month. Head Office is excluded." /></p>
            <div className="mt-3 mb-2 flex h-3 w-full overflow-hidden rounded-full border border-slate-200/50 bg-slate-100">
              {storeContributionShares.map(sc => sc.pct > 0 && (
                <div
                  key={sc.name}
                  className={cn("h-full transition-all duration-500", STORE_THEME[sc.name].fill)}
                  style={{ width: `${sc.pct}%` }}
                  title={`${sc.name}: ${sc.pct.toFixed(1)}%`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600 pt-1">
            {storeContributionShares.map(sc => (
              <span key={sc.name} className="flex items-center gap-1" title={sc.name}>
                <span className={cn("w-1.5 h-1.5 rounded-full", STORE_THEME[sc.name].fill)} />
                {STORE_THEME[sc.name].short} {sc.pct.toFixed(0)}%
              </span>
            ))}
          </div>
        </motion.article>

        {/* Card 3: Peak Sales Day */}
        <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="group relative min-w-0 overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-orange-50/30 p-5 shadow-sm flex items-center justify-between">
          <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-5 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
            <Trophy className="w-24 h-24 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className={cn(cardLabel, 'text-amber-700')}>Peak sales day<InfoTip label="About Peak sales day" text="The day with the highest boutique net sales this month (Head Office excluded). It is highlighted in gold in the table." /></p>
            {bestDayIdx >= 0 ? <>
              <p className="mt-1.5 text-lg font-semibold tracking-tight tabular-nums text-slate-900"><Amt value={boutiqueSales(data[bestDayIdx])} /></p>
              <p className="mt-0.5 text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                {data[bestDayIdx].dateStr} ({data[bestDayIdx].dayOfWeek})
              </p>
            </> : <p className="mt-1.5 text-sm text-slate-500">No boutique sales yet</p>}
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 relative">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
        </motion.article>

        {/* Card 4: Daily Performance Benchmark */}
        <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={cn(card, 'flex items-center justify-between')}>
          <div className="min-w-0">
            <p className={cardLabel}>Daily average<InfoTip label="About Daily average" text="Boutique net sales divided by the number of days with boutique sales. Days without sales are not counted. Head Office is excluded." /></p>
            <p className="mt-1.5 text-lg font-semibold tracking-tight tabular-nums text-slate-900"><Amt value={avgSales} /></p>
            <p className="mt-0.5 text-[10px] text-slate-500">Over {activeDays} day{activeDays === 1 ? '' : 's'} with boutique sales</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </motion.article>

      </div>

      {/* ── COLUMN TOGGLES ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-500">Show or hide store columns to focus the comparison. The Excel export follows this selection.</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {BREAKDOWN_STORES.map(storeName => {
            const visible = visibleStores[storeName];
            const cfg = STORE_THEME[storeName];
            return (
              <button
                key={storeName}
                type="button"
                aria-pressed={visible}
                onClick={() => toggleStoreVisibility(storeName)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                  visible
                    ? cn(cfg.bg, cfg.border, cfg.text, "shadow-sm")
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

      {/* ── MAIN TABLE ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-800">Daily sales · {dataLabel}</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Total columns include Head Office. Dates follow Jakarta time.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1"><Trophy className="h-3 w-3 text-amber-500" />Peak day</span>
            {worstDayIdx >= 0 && <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-rose-400" />Lowest day</span>}
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-200" />Weekend / holiday</span>
            <span className="inline-flex items-center gap-1"><span className="font-bold text-rose-500">*</span>Public holiday</span>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead className="sticky top-0 z-20">
              {/* Row 1: Stores */}
              <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="sticky left-0 z-10 bg-slate-50 py-3 px-4 border-r border-slate-200/60 text-center" rowSpan={2}>Date</th>
                <th className="bg-slate-50 py-3 px-4 border-r border-slate-200/60" rowSpan={2}>Day</th>
                <th className="bg-slate-50 py-3 px-4 border-r border-slate-200/60 text-right" rowSpan={2}>Total Sales</th>
                <th className="bg-slate-50 py-3 px-4 border-r border-slate-200/60 text-center" rowSpan={2}>Total Qty</th>

                {activeStoresList.map(storeName => (
                  <th
                    key={storeName}
                    onMouseEnter={() => setHoveredCol(storeName)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={cn(
                      "py-2 px-4 border-r border-slate-200/60 text-center transition-colors duration-150 bg-slate-50",
                      STORE_THEME[storeName].text,
                      hoveredCol === storeName && "bg-slate-200/60"
                    )}
                    colSpan={2}
                  >
                    {storeName}
                  </th>
                ))}
              </tr>
              {/* Row 2: Sub-headers */}
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                {activeStoresList.map(storeName => (
                  <Fragment key={storeName}>
                    <th
                      onMouseEnter={() => setHoveredCol(storeName)}
                      onMouseLeave={() => setHoveredCol(null)}
                      className={cn("py-2 px-4 border-r border-slate-200/60 text-right transition-colors duration-150 bg-slate-50", hoveredCol === storeName && "bg-slate-200/60")}
                    >
                      Net Sales
                    </th>
                    <th
                      onMouseEnter={() => setHoveredCol(storeName)}
                      onMouseLeave={() => setHoveredCol(null)}
                      className={cn("py-2 px-3 border-r border-slate-200/60 text-center transition-colors duration-150 bg-slate-50", hoveredCol === storeName && "bg-slate-200/60")}
                    >
                      Qty
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((d, idx) => {
                const { holidayName, isRedDay, isBestDay, isWorstDay } = dayMeta(d, idx);
                const rowHover = hoveredRow === idx;

                return (
                  <tr
                    key={d.dayNum}
                    onMouseEnter={() => setHoveredRow(idx)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={cn(
                      "transition-colors duration-150",
                      isBestDay && "bg-amber-50/30",
                      isWorstDay && "bg-rose-50/20",
                      rowHover && "bg-slate-50"
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
                      "sticky left-0 z-10 py-2.5 px-4 font-mono font-semibold border-r border-slate-100 text-center whitespace-nowrap transition-colors duration-150",
                      isBestDay ? "text-amber-700 bg-amber-50" : isWorstDay ? "text-rose-700 bg-rose-50" : "text-slate-600 bg-white",
                      rowHover && "bg-slate-100"
                    )}>
                      <span className="flex items-center justify-center gap-1.5">
                        {isBestDay && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        {isWorstDay && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                        {d.dateStr}
                        {holidayName && (
                          <span className="text-rose-500 font-black" title={holidayName}>*</span>
                        )}
                      </span>
                    </td>

                    {/* Day */}
                    <td className={cn(
                      "py-2.5 px-4 border-r border-slate-100 font-semibold transition-colors duration-150",
                      isBestDay ? "text-amber-700" : isWorstDay ? "text-rose-700" : isRedDay ? "text-rose-500 bg-rose-50/40" : "text-slate-700",
                      rowHover && "bg-slate-100/50"
                    )} title={holidayName || undefined}>
                      {d.dayOfWeek}
                    </td>

                    {/* Total Sales */}
                    <td className={cn(
                      "py-2.5 px-4 border-r border-slate-100 text-right font-bold font-mono tabular-nums transition-colors duration-150",
                      isBestDay ? "text-amber-700" : "text-slate-800",
                      rowHover && "bg-slate-100/50"
                    )}>
                      <Amt value={d.totalSales} />
                    </td>

                    {/* Total Qty */}
                    <td className={cn(
                      "py-2.5 px-4 border-r border-slate-100 text-center font-bold font-mono tabular-nums transition-colors duration-150",
                      isBestDay ? "text-amber-700" : "text-slate-700",
                      rowHover && "bg-slate-100/50"
                    )}>
                      {d.totalQty}
                    </td>

                    {/* Stores Columns */}
                    {activeStoresList.map(storeName => {
                      const sData = d.stores[storeName];
                      const colActive = hoveredCol === storeName;

                      return (
                        <Fragment key={storeName}>
                          <td
                            onMouseEnter={() => setHoveredCol(storeName)}
                            onMouseLeave={() => setHoveredCol(null)}
                            className={cn(
                              "py-2.5 px-4 border-r border-slate-100 text-right font-mono tabular-nums transition-colors duration-150",
                              sData.netSales !== 0 ? "font-semibold text-slate-800" : "text-slate-400",
                              colActive && "bg-slate-100"
                            )}
                          >
                            <Amt value={sData.netSales} />
                          </td>
                          <td
                            onMouseEnter={() => setHoveredCol(storeName)}
                            onMouseLeave={() => setHoveredCol(null)}
                            className={cn(
                              "py-2.5 px-3 border-r border-slate-100 text-center font-mono tabular-nums transition-colors duration-150",
                              sData.qty !== 0 ? "font-bold text-slate-700" : "text-slate-400",
                              colActive && "bg-slate-100"
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
            <tfoot className="sticky bottom-0 z-20 bg-slate-50 border-t border-slate-200 font-bold text-slate-800 shadow-[0_-4px_8px_-4px_rgba(16,24,40,0.08)]">
              <tr>
                <td className="sticky left-0 z-10 bg-slate-50 py-3 px-4 text-center border-r border-slate-200/60" colSpan={2}>TOTAL</td>
                <td className="py-3 px-4 border-r border-slate-200/60 text-right font-mono tabular-nums text-slate-900"><Amt value={totals.totalSales} /></td>
                <td className="py-3 px-4 border-r border-slate-200/60 text-center font-mono tabular-nums text-slate-900">{totals.totalQty}</td>
                {activeStoresList.map(storeName => (
                  <Fragment key={storeName}>
                    <td className="py-3 px-4 border-r border-slate-200/60 text-right font-mono tabular-nums text-slate-800"><Amt value={totals.stores[storeName].netSales} /></td>
                    <td className="py-3 px-3 border-r border-slate-200/60 text-center font-mono tabular-nums text-slate-800">{totals.stores[storeName].qty}</td>
                  </Fragment>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      </div>
      )}

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
      {hasData && (
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
            Period: {dataLabel}<br />
            <span className="text-[10px] text-slate-400">Generated: {new Date().toLocaleDateString('en-GB')} · Amounts in IDR</span>
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
            <div className="text-base font-black text-slate-600"><Amt value={totals.stores['Head Office'].netSales} /></div>
          </div>
        </div>

        {/* Printable Table */}
        <table className="w-full text-left border-collapse text-[10px] border border-slate-200">
          <thead>
            <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[9px]">
              <th className="py-1 px-2 border border-slate-700 text-center" rowSpan={2}>Date</th>
              <th className="py-1 px-2 border border-slate-700" rowSpan={2}>Day</th>
              <th className="py-1 px-2 border border-slate-700 text-right" rowSpan={2}>Total Sales</th>
              <th className="py-1 px-2 border border-slate-700 text-center" rowSpan={2}>Qty</th>
              {BREAKDOWN_STORES.map((s, i) => (
                <th key={s} className={cn("py-1 px-2 border border-slate-700 text-center", i % 2 ? "bg-slate-700/60" : "bg-slate-700/40")} colSpan={2}>{s}</th>
              ))}
            </tr>
            <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[8px]">
              {BREAKDOWN_STORES.map((s, i) => (
                <Fragment key={s}>
                  <th className={cn("py-1 px-2 border border-slate-700 text-right", i % 2 ? "bg-slate-700/50" : "bg-slate-700/30")}>Net Sales</th>
                  <th className={cn("py-1 px-1 border border-slate-700 text-center", i % 2 ? "bg-slate-700/50" : "bg-slate-700/30")}>Qty</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d, idx) => {
              const { holidayName, isRedDay } = dayMeta(d, idx);
              return (
                <tr key={d.dayNum} className="border-b border-slate-100">
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
                  {BREAKDOWN_STORES.map(s => (
                    <Fragment key={s}>
                      <td className="py-1 px-2 border border-gray-100 text-right font-mono text-gray-500"><Amt value={d.stores[s].netSales} /></td>
                      <td className="py-1 px-1 border border-gray-100 text-center font-mono text-gray-400">{d.stores[s].qty}</td>
                    </Fragment>
                  ))}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold text-slate-800">
            <tr>
              <td className="py-1.5 px-2 text-center border border-slate-300" colSpan={2}>TOTAL</td>
              <td className="py-1.5 px-2 border border-slate-300 text-right font-mono"><Amt value={totals.totalSales} /></td>
              <td className="py-1.5 px-2 border border-slate-300 text-center font-mono">{totals.totalQty}</td>
              {BREAKDOWN_STORES.map(s => (
                <Fragment key={s}>
                  <td className="py-1.5 px-2 border border-slate-300 text-right font-mono"><Amt value={totals.stores[s].netSales} /></td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-mono">{totals.stores[s].qty}</td>
                </Fragment>
              ))}
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
      )}
    </div>
  );
}

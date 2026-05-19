"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Trophy, Target, DollarSign, TrendingUp, Calendar as CalendarIcon,
  Search, FileSpreadsheet, User, ArrowUpRight, Medal, RefreshCw, BarChart2, Mail, CheckCircle, AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';
import { dashboardService, AdvisorPerformanceData, AdvisorRecord } from '@/services/dashboardService';
import Amt from '@/components/Amt';
import BvlgariLoader from '@/components/BvlgariLoader';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAT_COLORS: Record<string,string> = { Jewelry:'#F59E0B', Watches:'#3B82F6', Accessories:'#EC4899', Perfume:'#10B981', Other:'#8B5CF6' };

const fmtPct = (n: number) => n.toFixed(1) + '%';
const fmtTooltip = (v: any) => formatCurrency(Number(v));

const TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#0f172a', fontSize: 12 };

const achvColor = (a: number) => a >= 100 ? 'text-emerald-600' : a >= 80 ? 'text-amber-500' : 'text-rose-500';
const achvBg   = (a: number) => a >= 100 ? 'bg-emerald-500' : a >= 80 ? 'bg-amber-500' : 'bg-rose-500';

export default function AdvisorPerformancePage() {
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdvisorPerformanceData | null>(null);
  const [search, setSearch] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState<AdvisorRecord | null>(null);

  // YTD annual state
  type YtdData = Awaited<ReturnType<typeof dashboardService.getAnnualAdvisorPerformance>>;
  const [ytdData, setYtdData]     = useState<YtdData | null>(null);
  const [ytdLoading, setYtdLoading] = useState(true);
  const [ytdSearch, setYtdSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await dashboardService.getAdvisorPerformance(month, parseInt(year));
        setData(r);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [month, year]);

  // Load YTD data whenever year changes
  useEffect(() => {
    setYtdLoading(true);
    dashboardService.getAnnualAdvisorPerformance(parseInt(year))
      .then(setYtdData).catch(console.error).finally(() => setYtdLoading(false));
  }, [year]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.advisors.filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const locations = useMemo(() => {
    return Array.from(new Set(filtered.map(a => a.location))).sort();
  }, [filtered]);

  const summary = useMemo(() => {
    if (!data || data.advisors.length === 0) return { totalSales: 0, totalTarget: 0, avgAchv: 0, topName: '-' };
    const advisors = data.advisors;
    const totalSales = advisors.reduce((s,a) => s + a.netSales, 0);
    const totalTarget = advisors.reduce((s,a) => s + a.target, 0);
    const withTarget = advisors.filter(a => a.target > 0);
    const avgAchv = withTarget.length > 0 ? withTarget.reduce((s,a) => s + a.achievement, 0) / withTarget.length : 0;
    return { totalSales, totalTarget, avgAchv, topName: advisors[0]?.name || '-' };
  }, [data]);

  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle'|'ok'|'err'>('idle');

  const sendEmail = async () => {
    setSendingEmail(true);
    setEmailStatus('idle');
    try {
      const res = await fetch('/api/send-advisor-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const json = await res.json();
      setEmailStatus(json.success ? 'ok' : 'err');
    } catch {
      setEmailStatus('err');
    } finally {
      setSendingEmail(false);
      setTimeout(() => setEmailStatus('idle'), 4000);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;

      const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const curMonthIdx = MONTH_NAMES.indexOf(month);
      const curYear     = parseInt(year);

      const monthList: { m: string; y: number }[] = [];
      for (let i = 0; i < 5; i++) {
        let idx = curMonthIdx - i;
        let yr  = curYear;
        if (idx < 0) { idx += 12; yr -= 1; }
        monthList.push({ m: MONTH_NAMES[idx], y: yr });
      }

      const monthDataArr = await Promise.all(
        monthList.map(({ m, y }) => dashboardService.getAdvisorPerformance(m, y))
      );

      const wb = new ExcelJS.Workbook();
      wb.creator = 'MRA Retail BI Dashboard';
      wb.created = new Date();

      // ── Color palette ─────────────────────────────────────────
      const C = {
        headerBg:   '1E3A5F',  // navy
        headerFont: 'FFFFFF',
        subBg:      '2563EB',  // blue (store group header)
        subFont:    'FFFFFF',
        rankBg:     'EFF6FF',  // light blue for rank col
        altRow:     'F8FAFC',
        green:      '059669',
        amber:      'D97706',
        red:        'DC2626',
        totalBg:    'E8F0FE',
        totalFont:  '1E3A5F',
        border:     'CBD5E1',
      };

      const thinBorder = (color: string) => ({ style: 'thin' as const, color: { argb: 'FF' + color } });
      const allBorders = (color = C.border) => ({
        top: thinBorder(color), bottom: thinBorder(color),
        left: thinBorder(color), right: thinBorder(color),
      });
      const numFmt = '#,##0';
      const pctFmt = '0.00"%"';

      const achvColor = (pct: number) => pct >= 100 ? C.green : pct >= 80 ? C.amber : C.red;

      // ── Helper: apply header row style ────────────────────────
      const styleHeader = (row: any, bgHex: string, fontHex: string) => {
        row.eachCell((cell: any) => {
          cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgHex } };
          cell.font   = { bold: true, color: { argb: 'FF' + fontHex }, size: 10 };
          cell.border = allBorders(bgHex === C.headerBg ? '1E3A5F' : C.border);
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        row.height = 28;
      };

      // ── Helper: style a data row ──────────────────────────────
      const styleDataRow = (row: any, isAlt: boolean) => {
        row.eachCell({ includeEmpty: true }, (cell: any) => {
          if (isAlt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.altRow } };
          cell.border = allBorders();
          cell.font   = { size: 10 };
          cell.alignment = { vertical: 'middle' };
        });
        row.height = 20;
      };

      // ══════════════════════════════════════════════════════════
      // SHEET 1: YTD Summary
      // ══════════════════════════════════════════════════════════
      const wsYtd = wb.addWorksheet(`Summary ${year}`, { views: [{ state: 'frozen', ySplit: 2 }] });
      wsYtd.columns = [
        { width: 6  }, { width: 30 }, { width: 22 },
        { width: 18 }, { width: 18 }, { width: 14 },
        { width: 14 }, { width: 16 }, { width: 12 },
      ];

      // Title row
      wsYtd.mergeCells('A1:I1');
      const titleCell = wsYtd.getCell('A1');
      titleCell.value = `Advisor Performance — Year-to-Date ${year}`;
      titleCell.font  = { bold: true, size: 13, color: { argb: 'FF' + C.headerBg } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      wsYtd.getRow(1).height = 32;

      // Header row
      const ytdHeaders = ['No','Advisor Name','Location','YTD Sales','YTD Target','Achv %','Contrib %','Active Months','Trx'];
      const ytdHdrRow = wsYtd.addRow(ytdHeaders);
      styleHeader(ytdHdrRow, C.headerBg, C.headerFont);

      // Data
      const ytdAdvisors = ytdData?.advisors ?? [];
      ytdAdvisors.forEach((a, i) => {
        const row = wsYtd.addRow([
          i + 1, a.name, a.location,
          a.netSales, a.target,
          a.achievement / 100,
          (a.contribution ?? 0) / 100,
          a.productiveMonths ?? 0,
          a.transCount,
        ]);
        styleDataRow(row, i % 2 === 1);

        // Number formats
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(4).numFmt = numFmt;
        row.getCell(5).numFmt = numFmt;
        row.getCell(6).numFmt = pctFmt;
        row.getCell(7).numFmt = pctFmt;
        row.getCell(9).alignment = { horizontal: 'center' };

        // Achievement color
        const achv = a.achievement;
        row.getCell(6).font = { bold: true, size: 10, color: { argb: 'FF' + achvColor(achv) } };

        // Rank cell bg
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.rankBg } };
      });

      // Totals row
      if (ytdAdvisors.length > 0) {
        const totalSales  = ytdAdvisors.reduce((s, a) => s + a.netSales, 0);
        const totalTarget = ytdAdvisors.reduce((s, a) => s + a.target, 0);
        const totalRow = wsYtd.addRow(['', 'TOTAL', '', totalSales, totalTarget, totalTarget > 0 ? totalSales / totalTarget : 0, '', '', '']);
        totalRow.eachCell({ includeEmpty: true }, cell => {
          cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.totalBg } };
          cell.font   = { bold: true, size: 10, color: { argb: 'FF' + C.totalFont } };
          cell.border = allBorders(C.totalFont);
          cell.alignment = { vertical: 'middle' };
        });
        totalRow.getCell(4).numFmt = numFmt;
        totalRow.getCell(5).numFmt = numFmt;
        totalRow.getCell(6).numFmt = pctFmt;
        totalRow.height = 22;
      }

      // ══════════════════════════════════════════════════════════
      // SHEETS 2–6: Monthly (current + 4 prev)
      // ══════════════════════════════════════════════════════════
      const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];
      const STORE_COLORS: Record<string, string> = {
        'Plaza Indonesia': '1D4ED8',
        'Plaza Senayan':   'B45309',
        'Bali':            '065F46',
      };

      monthDataArr.forEach((mData, mi) => {
        const { m, y } = monthList[mi];
        const ws = wb.addWorksheet(`${m.slice(0,3)} ${y}`, { views: [{ state: 'frozen', ySplit: 2 }] });
        ws.columns = [
          { width: 6  }, { width: 30 }, { width: 22 }, { width: 16 },
          { width: 16 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 10 },
        ];

        // Title
        ws.mergeCells('A1:I1');
        const tc = ws.getCell('A1');
        tc.value = `Advisor Performance — ${m} ${y}`;
        tc.font  = { bold: true, size: 13, color: { argb: 'FF' + C.headerBg } };
        tc.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).height = 32;

        // Header
        const hdrRow = ws.addRow(['No','Advisor Name','Location','Net Sales','Crossing Sales','Target','Achv %','Contrib %','Trx']);
        styleHeader(hdrRow, C.headerBg, C.headerFont);

        // Group by store
        const grouped: Record<string, typeof mData.advisors> = {};
        mData.advisors.forEach(a => {
          const loc = a.location || 'Other';
          if (!grouped[loc]) grouped[loc] = [];
          grouped[loc].push(a);
        });

        const storeOrder = [
          ...STORES.filter(s => grouped[s]),
          ...Object.keys(grouped).filter(s => !STORES.includes(s)),
        ];

        storeOrder.forEach(store => {
          const advisors = grouped[store];
          if (!advisors?.length) return;

          const storeColor = STORE_COLORS[store] || C.subBg;

          // Store group header
          ws.mergeCells(`A${ws.rowCount + 1}:I${ws.rowCount + 1}`);
          const storeRow = ws.addRow([`▸ ${store}  (${advisors.length} advisors)`]);
          storeRow.getCell(1).value = `▸ ${store}  (${advisors.length} advisors)`;
          storeRow.eachCell({ includeEmpty: true }, cell => {
            cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + storeColor } };
            cell.font   = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
            cell.border = allBorders(storeColor);
            cell.alignment = { vertical: 'middle', indent: 1 };
          });
          storeRow.height = 22;

          const storeTotalSales  = advisors.reduce((s, a) => s + a.netSales, 0);
          const storeTotalTarget = advisors.reduce((s, a) => s + a.target, 0);

          // Advisor rows
          advisors.forEach((a, i) => {
            const row = ws.addRow([
              i + 1, a.name, a.location,
              a.netSales, a.crossingNet ?? 0, a.target,
              a.achievement / 100,
              (a.contribution ?? 0) / 100,
              a.transCount,
            ]);
            styleDataRow(row, i % 2 === 1);
            row.getCell(1).alignment  = { horizontal: 'center' };
            row.getCell(4).numFmt = numFmt;
            row.getCell(5).numFmt = numFmt;
            row.getCell(6).numFmt = numFmt;
            row.getCell(7).numFmt = pctFmt;
            row.getCell(8).numFmt = pctFmt;
            row.getCell(9).alignment  = { horizontal: 'center' };
            row.getCell(6).font = { bold: true, size: 10, color: { argb: 'FF' + achvColor(a.achievement) } };
            row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.rankBg } };
          });

          // Store subtotal
          const subRow = ws.addRow(['', `Total ${store}`, '', storeTotalSales, '', storeTotalTarget,
            storeTotalTarget > 0 ? storeTotalSales / storeTotalTarget : 0, '', '']);
          subRow.eachCell({ includeEmpty: true }, cell => {
            cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.totalBg } };
            cell.font   = { bold: true, size: 10, color: { argb: 'FF' + C.totalFont } };
            cell.border = allBorders(C.totalFont);
          });
          subRow.getCell(4).numFmt = numFmt;
          subRow.getCell(6).numFmt = numFmt;
          subRow.getCell(7).numFmt = pctFmt;
          subRow.height = 20;
        });

        // Grand total
        const allAdvisors = mData.advisors;
        if (allAdvisors.length > 0) {
          const grandSales  = allAdvisors.reduce((s, a) => s + a.netSales, 0);
          const grandTarget = allAdvisors.reduce((s, a) => s + a.target, 0);
          const gtRow = ws.addRow(['', 'GRAND TOTAL', '', grandSales, '', grandTarget,
            grandTarget > 0 ? grandSales / grandTarget : 0, '', '']);
          gtRow.eachCell({ includeEmpty: true }, cell => {
            cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.headerBg } };
            cell.font   = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            cell.border = allBorders(C.headerBg);
          });
          gtRow.getCell(4).numFmt = numFmt;
          gtRow.getCell(6).numFmt = numFmt;
          gtRow.getCell(7).numFmt = pctFmt;
          gtRow.height = 24;
        }
      });

      // ── Download ──────────────────────────────────────────────
      const buffer = await wb.xlsx.writeBuffer();
      const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement('a');
      a.href       = url;
      a.download   = `Advisor_Performance_${month}_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading || !data) return <BvlgariLoader message="Analyzing Advisor Performance..." />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Trophy className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Advisor Performance</h1>
          </div>
          <p className="text-slate-500 text-sm">Detailed performance metrics per advisor & store — {month} {year}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search advisor..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm py-2 pl-10 pr-4 rounded-xl outline-none focus:border-blue-400 transition-colors w-full md:w-64 shadow-sm" />
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <select aria-label="Select month" value={month} onChange={e => setMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select aria-label="Select year" value={year} onChange={e => setYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer border-l border-slate-200 pl-2 ml-2">
              <option value="2026">2026</option><option value="2025">2025</option>
            </select>
          </div>
          <button type="button" onClick={exportExcel} disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed">
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>
          <button type="button" onClick={sendEmail} disabled={sendingEmail}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              emailStatus === 'ok'  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
              emailStatus === 'err' ? 'bg-rose-50 border-rose-200 text-rose-700' :
              'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            }`}>
            {sendingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> :
             emailStatus === 'ok'  ? <CheckCircle className="w-4 h-4" /> :
             emailStatus === 'err' ? <AlertCircle className="w-4 h-4" /> :
             <Mail className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {sendingEmail ? 'Sending...' : emailStatus === 'ok' ? 'Sent!' : emailStatus === 'err' ? 'Failed' : 'Send Email'}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Summary - Compact Modern Version */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net Sales Card */}
        <div className="group relative bg-[#0F172A] p-4 rounded-[24px] text-white shadow-xl shadow-blue-900/30 overflow-hidden transition-all duration-500 hover:shadow-2xl ring-1 ring-white/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                <DollarSign className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-blue-300/60 uppercase tracking-widest mb-0.5">Net Revenue</p>
              <h3 className="text-xl font-black text-white tracking-tight">
                <Amt value={summary.totalSales} compact />
              </h3>
            </div>
          </div>
        </div>

        {/* Total Target Card */}
        <div className="group relative bg-white p-4 rounded-[24px] shadow-lg shadow-slate-200/40 overflow-hidden transition-all duration-500 border border-slate-100">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase">Goal</span>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Goal</p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                <Amt value={summary.totalTarget} compact />
              </h3>
            </div>
          </div>
        </div>

        {/* Avg Achievement Card */}
        <div className="group relative bg-white p-4 rounded-[24px] shadow-lg shadow-slate-200/40 overflow-hidden transition-all duration-500 border border-slate-100">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="text-emerald-600 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 bg-emerald-50 rounded">
                Active
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Avg. Success</p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {fmtPct(summary.avgAchv)}
              </h3>
              <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <style>{`.bar-avg { width: ${Math.min(summary.avgAchv, 100)}%; }`}</style>
                <div className="h-full bg-emerald-500 transition-all duration-1000 bar-avg" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Performer Card */}
        <div className="group relative bg-[#0F172A] p-4 rounded-[24px] text-white shadow-xl shadow-amber-900/20 overflow-hidden transition-all duration-500 ring-1 ring-amber-500/20">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
                <Medal className="w-4 h-4 text-white" />
              </div>
              <Trophy className="w-3.5 h-3.5 text-amber-500/50" />
            </div>
            <div>
              <p className="text-[9px] font-black text-amber-300/60 uppercase tracking-widest mb-0.5">MVP Month</p>
              <h3 className="text-lg font-black text-white tracking-tight truncate leading-tight">
                {summary.topName}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Advisor Detail Modal */}
      {selectedAdvisor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedAdvisor(null)}>
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedAdvisor.name}</h2>
                <p className="text-sm text-slate-500">{selectedAdvisor.location}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setSelectedAdvisor(null)} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Net Sales</p>
                <p className="text-lg font-bold text-slate-900"><Amt value={selectedAdvisor.netSales} /></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Achievement</p>
                <p className={cn("text-lg font-black", achvColor(selectedAdvisor.achievement))}>{fmtPct(selectedAdvisor.achievement)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Transactions</p>
                <p className="text-lg font-bold text-slate-900">{selectedAdvisor.transCount}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Store Contrib.</p>
                <p className="text-lg font-bold text-blue-600">{fmtPct(selectedAdvisor.storeData.advisorContrib)}</p>
              </div>
            </div>
            {selectedAdvisor.categoryMix.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Category Mix</p>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={selectedAdvisor.categoryMix.map(c => ({name:c.category, value:c.amount}))} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {selectedAdvisor.categoryMix.map((c,i) => <Cell key={i} fill={CAT_COLORS[c.category]||'#8B5CF6'} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtTooltip} />
                      <Legend verticalAlign="bottom" formatter={v => <span className="text-[10px] font-bold text-slate-500">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── YTD Annual Performance Table ──────────────────────────── */}
      <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-black text-amber-900">YTD Annual Performance — {year}</h2>
              <p className="text-[10px] text-amber-600 mt-0.5">Akumulasi semua bulan Jan–Des · diurutkan berdasarkan Achievement %</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400" />
              <input type="text" placeholder="Cari advisor..." value={ytdSearch}
                onChange={e => setYtdSearch(e.target.value)}
                className="bg-white border border-amber-200 text-slate-700 text-xs py-1.5 pl-8 pr-3 rounded-xl outline-none focus:border-amber-400 transition-colors w-44 shadow-sm placeholder:text-amber-300" />
            </div>
            {ytdLoading && <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-amber-50 text-[9px] font-bold text-amber-700 uppercase tracking-widest border-b border-amber-100">
              <tr>
                <th className="py-3 px-4 text-center w-10">#</th>
                <th className="py-3 px-4">Advisor</th>
                <th className="py-3 px-4">Lokasi</th>
                <th className="py-3 px-4 text-center">Bln Aktif</th>
                <th className="py-3 px-4 text-center">Trans</th>
                <th className="py-3 px-4 text-right">YTD Sales</th>
                <th className="py-3 px-4 text-right">YTD Target</th>
                <th className="py-3 px-4 text-center w-48">Achievement</th>
                <th className="py-3 px-4 text-right">Contrib %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {ytdLoading ? (
                <tr><td colSpan={9} className="py-12 text-center text-slate-400 italic">Memuat data YTD...</td></tr>
              ) : (ytdData?.advisors ?? [])
                .filter(a => !ytdSearch || a.name.toLowerCase().includes(ytdSearch.toLowerCase()) || a.location.toLowerCase().includes(ytdSearch.toLowerCase()))
                .map((adv, i) => (
                <tr key={adv.name} className="hover:bg-amber-50/50 transition-colors">
                  <td className="py-2.5 px-4 text-center">
                    {i < 3
                      ? <span className="text-base">{['🥇','🥈','🥉'][i]}</span>
                      : <span className="text-slate-300 font-bold">{i + 1}</span>}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <span className="font-bold text-slate-800">{adv.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">{adv.location}</td>
                  <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                    {adv.productiveMonths}<span className="text-slate-300">/12</span>
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono text-slate-600">{adv.transCount}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900"><Amt value={adv.netSales} short /></td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">
                    {adv.target > 0 ? <Amt value={adv.target} short /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between px-0.5">
                        <span className={cn('text-[10px] font-black', achvColor(adv.achievement))}>
                          {adv.target > 0 ? fmtPct(adv.achievement) : '—'}
                        </span>
                      </div>
                      {adv.target > 0 && (
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <style>{`.bar-ytd-${i} { width: ${Math.min(adv.achievement, 100)}%; }`}</style>
                          <div className={cn(`h-full rounded-full transition-all duration-1000 bar-ytd-${i}`, achvBg(adv.achievement))} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">{fmtPct(adv.contribution)}</td>
                </tr>
              ))}
              {!ytdLoading && (ytdData?.advisors ?? []).length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-slate-400 italic text-sm">Tidak ada data YTD untuk {year}</td></tr>
              )}
            </tbody>
            {!ytdLoading && ytdData && ytdData.advisors.length > 0 && (
              <tfoot className="border-t-2 border-amber-200 bg-amber-50 text-xs font-bold text-amber-800">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-amber-600">{ytdData.advisors.length} advisors</td>
                  <td className="py-3 px-4 text-right font-mono"><Amt value={ytdData.totalNet} short /></td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Tables grouped by location */}
      <div className="space-y-8">
        {locations.map(loc => {
          const locAdvisors = filtered.filter(a => a.location === loc).sort((a,b) => b.netSales - a.netSales);
          return (
            <div key={loc} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-blue-600 rounded-full" />
                  <h2 className="text-base font-bold text-slate-900">{loc}</h2>
                  <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold">{locAdvisors.length} STAFF</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-3 text-center w-12">#</th>
                      <th className="px-6 py-3">Advisor Name</th>
                      <th className="px-6 py-3 text-right w-40">Net Sales</th>
                      <th className="px-6 py-3 text-right text-blue-600 bg-blue-50 w-40">Crossing Sales</th>
                      <th className="px-6 py-3 text-right w-40">Target</th>
                      <th className="px-6 py-3 text-center w-48">Achievement</th>
                      <th className="px-6 py-3 text-center w-24">Trans</th>
                      <th className="px-6 py-3 text-center w-16">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {locAdvisors.map((adv, idx) => (
                      <tr key={adv.name} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 text-center">
                          {idx === 0 ? <span className="text-lg">🥇</span> :
                           idx === 1 ? <span className="text-lg">🥈</span> :
                           idx === 2 ? <span className="text-lg">🥉</span> :
                           <span className="text-xs font-bold text-slate-400">{idx+1}</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                              <User className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{adv.name}</p>
                              <p className="text-[10px] text-slate-400">Contrib: {fmtPct(adv.contribution)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs font-bold text-slate-700"><Amt value={adv.netSales} /></td>
                        <td className="px-6 py-4 text-right font-mono text-xs font-bold text-blue-600 bg-blue-50">
                          {adv.crossingNet > 0 ? <Amt value={adv.crossingNet} /> : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs text-slate-400"><Amt value={adv.target} /></td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center px-1">
                              <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded",
                                achvColor(adv.achievement),
                                adv.achievement >= 100 ? 'bg-emerald-50' : adv.achievement >= 80 ? 'bg-amber-50' : 'bg-rose-50'
                              )}>{fmtPct(adv.achievement)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <style>{`.bar-loc-${adv.name.replace(/\\W/g, '')} { width: ${Math.min(adv.achievement, 100)}%; }`}</style>
                              <div className={cn(`h-full rounded-full transition-all duration-1000 bar-loc-${adv.name.replace(/\\W/g, '')}`, achvBg(adv.achievement))} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">{adv.transCount}</td>
                        <td className="px-6 py-4 text-center">
                          <button type="button" aria-label={`View details for ${adv.name}`} onClick={() => setSelectedAdvisor(adv)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-blue-600">
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

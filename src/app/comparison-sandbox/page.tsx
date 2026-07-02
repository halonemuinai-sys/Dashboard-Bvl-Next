"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Sliders, RefreshCw, FileSpreadsheet, RotateCcw, LineChart, Store,
  Info, TrendingUp, HelpCircle
} from 'lucide-react';
import {
  LineChart as ReChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend as ReLegend
} from 'recharts';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import BvlgariLoader from '@/components/BvlgariLoader';
import { dashboardService } from '@/services/dashboardService';

type SandboxDataMap = Record<string, Record<string, number[]>>;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June'];
const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];
const YEARS = ['2023', '2024', '2025', '2026'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xl text-xs min-w-[200px]">
      <p className="text-slate-800 font-extrabold mb-2 text-center border-b border-slate-100 pb-1.5">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.stroke || p.color }} />
              <span className="text-slate-500 font-bold">{p.name}:</span>
            </div>
            <span className="text-slate-900 font-black font-mono">
              <Amt value={p.value} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Custom YAxis Tick Formatter
const formatYAxis = (val: number) => {
  if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)} M`;
  if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(0)} jt`;
  return `Rp ${val.toLocaleString('id-ID')}`;
};

interface SandboxInputProps {
  value: number;
  onChange: (val: number) => void;
}

function SandboxInput({ value, onChange }: SandboxInputProps) {
  const [displayVal, setDisplayVal] = useState('');

  useEffect(() => {
    setDisplayVal(Math.round(value).toLocaleString('id-ID'));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    const num = parseInt(digitsOnly, 10) || 0;
    setDisplayVal(num.toLocaleString('id-ID'));
    onChange(num);
  };

  const handleBlur = () => {
    setDisplayVal(Math.round(value).toLocaleString('id-ID'));
  };

  return (
    <input
      type="text"
      value={displayVal}
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 focus:bg-white text-right font-mono text-xs p-1.5 rounded-lg outline-none transition-all"
      placeholder="0"
    />
  );
}

export default function ComparisonSandboxPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SandboxDataMap>({});
  const [dbData, setDbData] = useState<SandboxDataMap>({});
  const [activeView, setActiveView] = useState<'Total' | 'Plaza Indonesia' | 'Plaza Senayan' | 'Bali'>('Total');
  const [exportingExcel, setExportingExcel] = useState(false);

  // Load initial data from database
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const fetched: SandboxDataMap = {
          '2023': { 'Plaza Indonesia': [0,0,0,0,0,0], 'Plaza Senayan': [0,0,0,0,0,0], 'Bali': [0,0,0,0,0,0] },
          '2024': { 'Plaza Indonesia': [0,0,0,0,0,0], 'Plaza Senayan': [0,0,0,0,0,0], 'Bali': [0,0,0,0,0,0] },
          '2025': { 'Plaza Indonesia': [0,0,0,0,0,0], 'Plaza Senayan': [0,0,0,0,0,0], 'Bali': [0,0,0,0,0,0] },
          '2026': { 'Plaza Indonesia': [0,0,0,0,0,0], 'Plaza Senayan': [0,0,0,0,0,0], 'Bali': [0,0,0,0,0,0] }
        };

        // Fetch each year's data (Jan-Jun)
        await Promise.all(YEARS.map(async (yrStr) => {
          const yrNum = parseInt(yrStr);
          const results = await Promise.all(MONTHS.map(m => dashboardService.getCrossingSalesData(m, yrNum)));
          
          results.forEach((res, mIdx) => {
            STORES.forEach(store => {
              const val = res.storeStats[store]?.adjusted || 0;
              fetched[yrStr][store][mIdx] = val;
            });
          });
        }));

        setData(fetched);
        setDbData(JSON.parse(JSON.stringify(fetched))); // clone
      } catch (e) {
        console.error('Error loading sandbox baseline data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Update specific store value in sandbox state
  const handleValueChange = (year: string, store: string, monthIdx: number, rawVal: string) => {
    const val = parseFloat(rawVal) || 0;
    setData(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[year]) copy[year] = {};
      if (!copy[year][store]) copy[year][store] = [0,0,0,0,0,0];
      copy[year][store][monthIdx] = val;
      return copy;
    });
  };

  // Reset local adjustments to database baseline
  const handleReset = () => {
    if (confirm('Revert all values back to database originals? Any unsaved edits will be lost.')) {
      setData(JSON.parse(JSON.stringify(dbData)));
    }
  };

  // Recharts line graph data processing
  const chartData = useMemo(() => {
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return monthsShort.map((m, idx) => {
      const item: any = { name: m };
      YEARS.forEach(yr => {
        if (activeView === 'Total') {
          let sum = 0;
          STORES.forEach(store => {
            sum += data[yr]?.[store]?.[idx] || 0;
          });
          item[yr] = sum;
        } else {
          item[yr] = data[yr]?.[activeView]?.[idx] || 0;
        }
      });
      return item;
    });
  }, [data, activeView]);

  // Aggregate totals
  const aggregates = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    YEARS.forEach(yr => {
      out[yr] = { 'Plaza Indonesia': 0, 'Plaza Senayan': 0, 'Bali': 0, total: 0 };
      STORES.forEach(store => {
        const sum = (data[yr]?.[store] || []).reduce((a, b) => a + b, 0);
        out[yr][store] = sum;
        out[yr].total += sum;
      });
    });
    return out;
  }, [data]);

  // Generate Canvas Graph for Excel
  const generateCanvasGraph = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const getMonthlyTotals = (yr: string) => {
      const list: number[] = [];
      for (let idx = 0; idx < 6; idx++) {
        let mTotal = 0;
        STORES.forEach(store => {
          mTotal += data[yr]?.[store]?.[idx] || 0;
        });
        list.push(mTotal);
      }
      return list;
    };

    const totals2023 = getMonthlyTotals('2023');
    const totals2024 = getMonthlyTotals('2024');
    const totals2025 = getMonthlyTotals('2025');
    const totals2026 = getMonthlyTotals('2026');

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
    ctx.fillText('Jan-Jun Simulated Store Performance Comparison', canvas.width - right, 30);

    return canvas;
  };

  // Export to Excel with custom graph
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
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

      const ws = wb.addWorksheet('Jan-Jun Simulator', { views: [{ showGridLines: true }] });
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
        value: 'BVLGARI — SALES PERFORMANCE COMPARISON & SIMULATION',
        font: { name: 'Georgia', bold: true, size: 14, color: { argb: 'FF' + C.navyBg } },
        alignment: { horizontal: 'center', vertical: 'middle' },
      });
      ws.getRow(1).height = 34;

      ws.mergeCells('A2:Q2');
      Object.assign(ws.getCell('A2'), {
        value: 'Simulated Net Sales Comparison (Physical + Incoming − Outgoing) — Years 2023 - 2026',
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

      for (let idx = 0; idx < 6; idx++) {
        const pi23 = data['2023']?.['Plaza Indonesia']?.[idx] || 0;
        const pi24 = data['2024']?.['Plaza Indonesia']?.[idx] || 0;
        const pi25 = data['2025']?.['Plaza Indonesia']?.[idx] || 0;
        const pi26 = data['2026']?.['Plaza Indonesia']?.[idx] || 0;

        const ps23 = data['2023']?.['Plaza Senayan']?.[idx] || 0;
        const ps24 = data['2024']?.['Plaza Senayan']?.[idx] || 0;
        const ps25 = data['2025']?.['Plaza Senayan']?.[idx] || 0;
        const ps26 = data['2026']?.['Plaza Senayan']?.[idx] || 0;

        const bl23 = data['2023']?.['Bali']?.[idx] || 0;
        const bl24 = data['2024']?.['Bali']?.[idx] || 0;
        const bl25 = data['2025']?.['Bali']?.[idx] || 0;
        const bl26 = data['2026']?.['Bali']?.[idx] || 0;

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
      }

      // Add Total Row
      const totRow = ws.addRow([
        'TOTAL',
        aggregates['2023']['Plaza Indonesia'], aggregates['2024']['Plaza Indonesia'], aggregates['2025']['Plaza Indonesia'], aggregates['2026']['Plaza Indonesia'],
        aggregates['2023']['Plaza Senayan'], aggregates['2024']['Plaza Senayan'], aggregates['2025']['Plaza Senayan'], aggregates['2026']['Plaza Senayan'],
        aggregates['2023']['Bali'], aggregates['2024']['Bali'], aggregates['2025']['Bali'], aggregates['2026']['Bali'],
        aggregates['2023'].total, aggregates['2024'].total, aggregates['2025'].total, aggregates['2026'].total
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

      // Canvas graph render & insert
      const canvas = generateCanvasGraph();
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
      a.download = 'Simulated_Sales_Comparison_Jan_Jun_2023_2026.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('Error exporting Simulation Excel: ' + err.message);
    } finally {
      setExportingExcel(false);
    }
  };

  if (loading) {
    return <BvlgariLoader message="Preparing Simulation Sandbox..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Sliders className="w-6 h-6 text-violet-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Comparison Sandbox</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Interactive sandbox to simulate monthly performance and view dynamic YoY trend charts (Jan - Jun)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-sm font-bold h-10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Data
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex items-center gap-2 bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow-sm transition-colors text-sm font-bold h-10 cursor-pointer"
          >
            {exportingExcel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export Excel
          </button>
        </div>
      </div>

      {/* Info Warning */}
      <div className="bg-amber-50/80 border border-amber-200/60 rounded-2xl p-4 flex gap-3 text-amber-800 text-xs">
        <Info className="w-4 h-4 shrink-0 text-amber-600" />
        <div>
          <span className="font-bold">Sandbox Mode:</span> Data edits below are kept in temporary memory and used to update the visualization chart and Excel export dynamically. Your main database figures will <span className="font-bold">NOT</span> be overwritten.
        </div>
      </div>

      {/* Grid: Table + Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Input Table */}
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-400" />
              Store Adjusted Performance Simulator (Rp)
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase">Jan - Jun</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs min-w-[800px]">
              <thead>
                <tr className="bg-slate-100/50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <th className="p-3 border-r border-slate-200">Store / Year</th>
                  <th className="p-3 text-center">2023</th>
                  <th className="p-3 text-center">2024</th>
                  <th className="p-3 text-center">2025</th>
                  <th className="p-3 text-center border-r border-slate-200">2026</th>
                  <th className="p-3 text-right bg-slate-50/80 font-bold">Total YTD</th>
                </tr>
              </thead>
              <tbody>
                {STORES.map((store, sIdx) => {
                  return (
                    <tr key={store} className={cn("border-b border-slate-100 hover:bg-slate-50/20", sIdx % 2 === 1 && "bg-slate-50/10")}>
                      <td className="p-3 font-bold text-slate-700 border-r border-slate-200 bg-slate-50/30">
                        {store}
                      </td>
                      
                      {/* Months loop per store */}
                      <td colSpan={4} className="p-0 border-r border-slate-200">
                        <table className="w-full table-fixed">
                          <tbody>
                            {MONTHS.map((m, mIdx) => {
                              return (
                                <tr key={m} className={cn("border-b border-slate-100/60 last:border-0")}>
                                  <td className="p-2 text-[10px] text-slate-400 font-bold w-12 border-r border-slate-100">
                                    {m.substring(0, 3)}
                                  </td>
                                  {YEARS.map(yr => {
                                    const val = data[yr]?.[store]?.[mIdx] || 0;
                                    return (
                                      <td key={yr} className="p-1">
                                        <SandboxInput
                                          value={val}
                                          onChange={newVal => handleValueChange(yr, store, mIdx, String(newVal))}
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>

                      {/* Store Total */}
                      <td className="p-3 text-right bg-slate-50/50 font-black font-mono text-slate-900 align-middle">
                        <table className="w-full">
                          <tbody>
                            {YEARS.map(yr => (
                              <tr key={yr} className="border-b border-slate-100/40 last:border-0 text-[11px]">
                                <td className="text-slate-400 font-bold text-left">{yr}:</td>
                                <td className="text-right pl-2"><Amt value={aggregates[yr]?.[store] || 0} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  );
                })}

                {/* Grand Total Row */}
                <tr className="bg-violet-50/50 border-t-2 border-slate-200 font-bold">
                  <td className="p-4 text-slate-800 border-r border-slate-200">
                    GRAND TOTAL
                  </td>
                  <td colSpan={4} className="p-2 border-r border-slate-200 align-middle">
                    <div className="grid grid-cols-4 text-center font-mono text-[11px] font-black text-slate-800">
                      {YEARS.map(yr => (
                        <div key={yr} className="border-r border-slate-200/50 last:border-0 py-1">
                          <span className="text-[10px] text-slate-400 block font-bold mb-0.5">{yr}</span>
                          <Amt value={aggregates[yr]?.total || 0} />
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right bg-violet-100/50 font-black font-mono text-[13px] text-violet-900 align-middle">
                    <span className="text-[9px] text-violet-500 block font-bold mb-0.5">2026 CUMULATIVE</span>
                    <Amt value={aggregates['2026']?.total || 0} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Dynamic Recharts Line Graph */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center gap-2">
                <LineChart className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Live Sandbox Chart</h3>
              </div>
              
              {/* Segmented Controls for Active View */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
                <button
                  onClick={() => setActiveView('Total')}
                  className={cn("py-1.5 rounded-lg transition-colors cursor-pointer text-center", activeView === 'Total' ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900")}
                >
                  Combined Total
                </button>
                <button
                  onClick={() => setActiveView('Plaza Indonesia')}
                  className={cn("py-1.5 rounded-lg transition-colors cursor-pointer text-center", activeView === 'Plaza Indonesia' ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900")}
                >
                  Plaza Indonesia
                </button>
                <button
                  onClick={() => setActiveView('Plaza Senayan')}
                  className={cn("py-1.5 rounded-lg transition-colors cursor-pointer text-center", activeView === 'Plaza Senayan' ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900")}
                >
                  Plaza Senayan
                </button>
                <button
                  onClick={() => setActiveView('Bali')}
                  className={cn("py-1.5 rounded-lg transition-colors cursor-pointer text-center", activeView === 'Bali' ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900")}
                >
                  Bali
                </button>
              </div>
            </div>

            {/* Recharts Render */}
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} stroke="#E2E8F0" />
                  <YAxis
                    tickFormatter={formatYAxis}
                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                    stroke="#E2E8F0"
                  />
                  <ReTooltip content={<CustomTooltip />} />
                  <ReLegend wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 10 }} />
                  
                  <Line type="monotone" dataKey="2023" name="2023 Sales" stroke="#94A3B8" strokeWidth={2.5} strokeDasharray="5 5" activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="2024" name="2024 Sales" stroke="#F59E0B" strokeWidth={2.5} strokeDasharray="5 5" activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="2025" name="2025 Sales" stroke="#3B82F6" strokeWidth={3} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="2026" name="2026 Sales" stroke="#8B5CF6" strokeWidth={4} activeDot={{ r: 8 }} />
                </ReChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Guidelines info card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-md">
            <h4 className="font-extrabold text-sm mb-2 text-violet-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              YoY Performance Insights
            </h4>
            <p className="text-slate-300 text-xs leading-relaxed">
              Use this sandbox page to evaluate growth models and run hypothetical sales planning. Type in modified target or forecast sales, watch the curve update automatically, and export the simulation results directly as a fully-formatted Excel document including the customized trend chart.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

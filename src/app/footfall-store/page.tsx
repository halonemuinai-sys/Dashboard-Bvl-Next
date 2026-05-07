"use client";

import { useState, useEffect, useMemo, Fragment } from 'react';
import { RefreshCw, Download, FileText, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, FootfallStoreRow } from '@/services/dashboardService';
import BvlgariLoader from '@/components/BvlgariLoader';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import * as XLSX from 'xlsx';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function FootfallStorePage() {
  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear] = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FootfallStoreRow[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getFootfallStore(month, parseInt(year));
      setData(res);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month, year]);

  const daysInMonth = useMemo(() => {
    const monthIdx = MONTHS.indexOf(month);
    return new Date(parseInt(year), monthIdx + 1, 0).getDate();
  }, [month, year]);

  const dataMap = useMemo(() => {
    const map: Record<string, Record<string, FootfallStoreRow>> = {};
    data.forEach(d => {
      const day = new Date(d.transaction_date).getDate();
      if (!map[day]) map[day] = {};
      map[day][d.location] = d;
    });
    return map;
  }, [data]);

  const handleExportExcel = () => {
    const monthIdx = MONTHS.indexOf(month);
    const fileName = `Bvlgari_Footfall_${month}_${year}.xlsx`;
    
    // Prepare data for Excel
    const excelRows = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const piRow = dataMap[day]?.['Plaza Indonesia'];
      const psRow = dataMap[day]?.['Plaza Senayan'];
      const blRow = dataMap[day]?.['Bali'];
      
      const piIn = piRow?.traffic_in || 0;
      const piOut = piRow?.traffic_out || 0;
      const psIn = psRow?.traffic_in || 0;
      const psOut = psRow?.traffic_out || 0;
      const blIn = blRow?.traffic_in || 0;
      const blOut = blRow?.traffic_out || 0;
      
      return {
        'Date': `${day} ${month} ${year}`,
        'PI (IN)': piIn,
        'PI (OUT)': piOut,
        'PS (IN)': psIn,
        'PS (OUT)': psOut,
        'Bali (IN)': blIn,
        'Bali (OUT)': blOut,
        'Total Combined IN': piIn + psIn + blIn
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Footfall');
    
    // Auto-size columns
    const max_width = excelRows.reduce((w, r) => Math.max(w, r.Date.length), 10);
    worksheet['!cols'] = [{ wch: max_width }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];

    XLSX.writeFile(workbook, fileName);
  };

  // Summaries
  const piData = data.filter(d => d.location === 'Plaza Indonesia');
  const psData = data.filter(d => d.location === 'Plaza Senayan');
  const baliData = data.filter(d => d.location === 'Bali');

  const sumIn = (arr: FootfallStoreRow[]) => arr.reduce((acc, d) => acc + (d.traffic_in || 0), 0);
  const piTotal = sumIn(piData);
  const psTotal = sumIn(psData);
  const baliTotal = sumIn(baliData);
  const combinedTotal = piTotal + psTotal + baliTotal;

  // Demographics (Averages across populated days)
  const calcAvgGender = (arr: FootfallStoreRow[]) => {
    const valid = arr.filter(d => (d.men_pct || 0) > 0 || (d.women_pct || 0) > 0);
    if (valid.length === 0) return { men: 0, women: 0 };
    const avgM = valid.reduce((acc, d) => acc + (d.men_pct || 0), 0) / valid.length;
    const avgW = valid.reduce((acc, d) => acc + (d.women_pct || 0), 0) / valid.length;
    // Normalize to exactly 100%
    const total = avgM + avgW;
    return {
      men: Math.round((avgM / total) * 100),
      women: Math.round((avgW / total) * 100)
    };
  };

  const piGender = calcAvgGender(piData);
  const baliGender = calcAvgGender(baliData);

  // Chart Data
  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return {
      day: String(day),
      PI: dataMap[day]?.['Plaza Indonesia']?.traffic_in || 0,
      PS: dataMap[day]?.['Plaza Senayan']?.traffic_in || 0,
      Bali: dataMap[day]?.['Bali']?.traffic_in || 0,
    };
  });

  if (loading) return <BvlgariLoader message="Loading Footfall Data..." />;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Store Footfall</h1>
          <p className="text-slate-500 text-sm mt-1">Door Counter Traffic & Demographic Data</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm">
            <select aria-label="Select Month" title="Select Month" value={month} onChange={e => setMonth(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select aria-label="Select Year" title="Select Year" value={year} onChange={e => setYear(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer border-l border-slate-200 pl-2 ml-2">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Sync Data
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold shadow-sm hover:bg-rose-100 transition-all">
            <FileText className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-100 transition-all">
            <Download className="w-3.5 h-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full -z-0"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">Total Footfall PI</p>
          <p className="text-3xl font-black text-slate-800 mt-2 relative z-10">{piTotal.toLocaleString('id-ID')}</p>
          <div className="h-1.5 w-full bg-blue-600 rounded-full mt-4 absolute bottom-0 left-0"></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-bl-full -z-0"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">Total Footfall PS</p>
          <p className="text-3xl font-black text-emerald-600 mt-2 relative z-10">{psTotal.toLocaleString('id-ID')}</p>
          <div className="h-1.5 w-full bg-emerald-500 rounded-full mt-4 absolute bottom-0 left-0"></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50/50 rounded-bl-full -z-0"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">Total Footfall Bali</p>
          <p className="text-3xl font-black text-cyan-600 mt-2 relative z-10">{baliTotal.toLocaleString('id-ID')}</p>
          <div className="h-1.5 w-full bg-cyan-500 rounded-full mt-4 absolute bottom-0 left-0"></div>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">Combined Footfall</p>
          <p className="text-4xl font-black text-white mt-1 relative z-10">{combinedTotal.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Middle Row: Chart & Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-lg">Daily Footfall Trend</h3>
          <p className="text-xs text-slate-500 mb-6">Visits mapped throughout the selected month</p>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }} />
                <Line type="monotone" name="PI Traffic (In)" dataKey="PI" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                <Line type="monotone" name="PS Traffic (In)" dataKey="PS" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                <Line type="monotone" name="Bali Traffic (In)" dataKey="Bali" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographics PI */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">PI Demographics</h3>
            <p className="text-xs text-slate-500">Estimated Gender Distribution</p>
          </div>
          <div className="mt-8 mb-6">
            <div className="flex justify-between items-end mb-3">
              <div className="text-center">
                <p className="text-4xl font-black text-blue-600">{piGender.men}%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Men</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-rose-500">{piGender.women}%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Women</p>
              </div>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div style={{ width: `${piGender.men}%` }} className="bg-blue-600 h-full transition-all duration-1000" />
              <div style={{ width: `${piGender.women}%` }} className="bg-rose-500 h-full transition-all duration-1000" />
            </div>
          </div>
          <p className="text-[9px] text-slate-400 italic text-center">Percentage is averaged across all populated days within the selected month.</p>
        </div>

        {/* Demographics Bali */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50/50 rounded-bl-full -z-0"></div>
          <div className="relative z-10">
            <h3 className="font-bold text-slate-900 text-lg">Bali Demographics</h3>
            <p className="text-xs text-slate-500">Estimated Gender Distribution</p>
          </div>
          <div className="mt-8 mb-6 relative z-10">
            <div className="flex justify-between items-end mb-3">
              <div className="text-center">
                <p className="text-4xl font-black text-cyan-600">{baliGender.men}%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Men</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-rose-500">{baliGender.women}%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Women</p>
              </div>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div style={{ width: `${baliGender.men}%` }} className="bg-cyan-500 h-full transition-all duration-1000" />
              <div style={{ width: `${baliGender.women}%` }} className="bg-rose-500 h-full transition-all duration-1000" />
            </div>
          </div>
          <p className="text-[9px] text-slate-400 italic text-center relative z-10">Percentage is averaged across all populated days within the selected month.</p>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            Daily Footfall Breakdown
          </h3>
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-blue-600 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 transition-all">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="py-4 px-6 border-b border-r border-slate-100 w-24">Date</th>
                <th colSpan={2} className="py-4 px-6 text-center border-b border-r border-slate-100">Plaza Indonesia</th>
                <th colSpan={2} className="py-4 px-6 text-center border-b border-r border-slate-100">Plaza Senayan</th>
                <th colSpan={2} className="py-4 px-6 text-center border-b border-r border-slate-100">Bali Boutique</th>
                <th className="py-4 px-6 text-center border-b border-slate-100 w-32">Total Combined In</th>
              </tr>
              <tr className="bg-white text-[9px] text-slate-400 border-b border-slate-200">
                <th className="py-2 px-6 border-r border-slate-100">Day</th>
                <th className="py-2 px-4 text-center border-r border-slate-100 text-blue-600">IN</th>
                <th className="py-2 px-4 text-center border-r border-slate-100">OUT</th>
                <th className="py-2 px-4 text-center border-r border-slate-100 text-emerald-600">IN</th>
                <th className="py-2 px-4 text-center border-r border-slate-100">OUT</th>
                <th className="py-2 px-4 text-center border-r border-slate-100 text-cyan-600">IN</th>
                <th className="py-2 px-4 text-center border-r border-slate-100">OUT</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const piRow = dataMap[day]?.[`Plaza Indonesia`];
                const psRow = dataMap[day]?.[`Plaza Senayan`];
                const blRow = dataMap[day]?.[`Bali`];
                
                const piIn = piRow?.traffic_in;
                const piOut = piRow?.traffic_out;
                const psIn = psRow?.traffic_in;
                const psOut = psRow?.traffic_out;
                const blIn = blRow?.traffic_in;
                const blOut = blRow?.traffic_out;

                const hasData = (piIn !== undefined || psIn !== undefined || blIn !== undefined);
                const combinedIn = (piIn || 0) + (psIn || 0) + (blIn || 0);

                return (
                  <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-6 font-medium text-slate-700 border-r border-slate-100">{day}</td>
                    
                    <td className="py-3 px-4 text-center font-bold text-slate-800">{piIn !== undefined ? piIn.toLocaleString() : '-'}</td>
                    <td className="py-3 px-4 text-center text-slate-500 border-r border-slate-100">{piOut !== undefined ? piOut.toLocaleString() : '-'}</td>
                    
                    <td className="py-3 px-4 text-center font-bold text-slate-800">{psIn !== undefined ? psIn.toLocaleString() : '-'}</td>
                    <td className="py-3 px-4 text-center text-slate-500 border-r border-slate-100">{psOut !== undefined ? psOut.toLocaleString() : '-'}</td>
                    
                    <td className="py-3 px-4 text-center font-bold text-slate-800">{blIn !== undefined ? blIn.toLocaleString() : '-'}</td>
                    <td className="py-3 px-4 text-center text-slate-500 border-r border-slate-100">{blOut !== undefined ? blOut.toLocaleString() : '-'}</td>
                    
                    <td className="py-3 px-6 text-center font-black text-slate-900 bg-slate-50/30">
                      {hasData ? combinedIn.toLocaleString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

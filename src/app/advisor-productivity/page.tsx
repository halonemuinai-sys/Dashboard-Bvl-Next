"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, Calendar as CalendarIcon, Download,
  TrendingUp, Award, UserCheck, UserPlus, Building2,
  RefreshCw, Filter, Layers, BarChart3
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { getAdvisorProductivity, type AdvisorMetrics, type DetailTransaction } from '@/services/dashboard/productivityService';
import Amt from '@/components/Amt';
import { useUserAccess } from '@/lib/user-access-context';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AdvisorProductivityPage() {
  const { assignedStore } = useUserAccess();
  const isStoreScoped = Boolean(assignedStore && assignedStore !== 'ALL');

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedStore, setSelectedStore] = useState('ALL');

  useEffect(() => {
    if (isStoreScoped && assignedStore) {
      setSelectedStore(assignedStore);
    }
  }, [assignedStore, isStoreScoped]);
  const [loading, setLoading] = useState(true);

  const [advisorData, setAdvisorData] = useState<AdvisorMetrics[]>([]);
  const [detailTransactions, setDetailTransactions] = useState<DetailTransaction[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const report = await getAdvisorProductivity(month, year);
      setDetailTransactions(report.details);
      setAdvisorData(report.metrics);

    } catch (err: any) {
      console.error('Error fetching productivity report:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unique stores for filter
  const stores = useMemo(() => {
    const s = new Set(advisorData.map(a => a.store));
    return Array.from(s).sort();
  }, [advisorData]);

  // Filtered by selected store
  const filteredData = useMemo(() => {
    if (selectedStore === 'ALL') return advisorData;
    return advisorData.filter(a => a.store === selectedStore);
  }, [advisorData, selectedStore]);

  // Grouped by store for rendering
  const storeGroups = useMemo(() => {
    const map = new Map<string, AdvisorMetrics[]>();
    filteredData.forEach(d => {
      if (!map.has(d.store)) map.set(d.store, []);
      map.get(d.store)!.push(d);
    });
    return map;
  }, [filteredData]);

  // Overall KPIs
  const overallKPI = useMemo(() => {
    const totalNet = filteredData.reduce((s, r) => s + r.totalNetSales, 0);
    const totalInvoices = filteredData.reduce((s, r) => s + r.totalInvoices, 0);
    const totalQty = filteredData.reduce((s, r) => s + r.totalQty, 0);
    const newSales = filteredData.reduce((s, r) => s + r.newCustomerSales, 0);
    const existSales = filteredData.reduce((s, r) => s + r.existingCustomerSales, 0);
    const newCount = filteredData.reduce((s, r) => s + r.newCustomerCount, 0);
    const existCount = filteredData.reduce((s, r) => s + r.existingCustomerCount, 0);

    const pctNew = totalNet > 0 ? (newSales / totalNet) * 100 : 0;
    const pctExist = totalNet > 0 ? (existSales / totalNet) * 100 : 0;

    return { totalNet, totalInvoices, totalQty, newSales, existSales, newCount, existCount, pctNew, pctExist };
  }, [filteredData]);

  // Export to Excel with Detail Raw Transactions
  const exportToCSV = () => {
    const q = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines: string[] = [];

    // Header Meta
    lines.push(`SALES PERSON PRODUCTIVITY REPORT - BVLGARI`);
    lines.push(`Periode: ${MONTHS[month - 1]} ${year}`);
    lines.push(`Filter Store: ${selectedStore}`);
    lines.push(`Tanggal Export: ${new Date().toLocaleString('id-ID')}`);
    lines.push(``);

    // SECTION 1: SUMMARY TABLE
    lines.push(`=== 1. SUMMARY PRODUCTIVITY PER ADVISOR ===`);
    lines.push([
      'Store', 'Sales Person (Advisor)', 'Total Net Sales (IDR)',
      'Total Invoices', 'Total Qty (Pcs)',
      'New Customer Count', 'New Customer Sales (IDR)', '% New Sales',
      'Existing Customer Count', 'Existing Customer Sales (IDR)', '% Existing Sales',
      'ATV (Avg Ticket Value)', 'UPT (Units Per Trans)'
    ].map(q).join(','));

    filteredData.forEach(r => {
      lines.push([
        r.store, r.advisor, r.totalNetSales,
        r.totalInvoices, r.totalQty,
        r.newCustomerCount, r.newCustomerSales, `${r.pctNewSales.toFixed(1)}%`,
        r.existingCustomerCount, r.existingCustomerSales, `${r.pctExistingSales.toFixed(1)}%`,
        Math.round(r.atv), r.upt.toFixed(2)
      ].map(q).join(','));
    });

    lines.push(``);
    lines.push(`=== 2. DETAIL TRANSAKSI LENGKAP (RAW TRANSACTIONS) ===`);
    lines.push([
      'Tanggal', 'No Transaksi', 'Store', 'Sales Person',
      'Nama Customer', 'No Telepon', 'Tipe Customer (Status)',
      'Main Category', 'Collection', 'Qty', 'Net Sales (IDR)'
    ].map(q).join(','));

    const filteredDetails = selectedStore === 'ALL'
      ? detailTransactions
      : detailTransactions.filter(d => d.store === selectedStore);

    filteredDetails.forEach(d => {
      lines.push([
        d.date, d.transNo, d.store, d.advisor,
        d.customer, d.phone, d.customerType,
        d.category, d.collection, d.qty, d.netSales
      ].map(q).join(','));
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Productivity_Report_${MONTHS[month - 1]}_${year}_${selectedStore}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Award className="w-7 h-7 text-indigo-600" />
            Sales Person Productivity Report
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Analisis produktivitas Customer Advisor, kontribusi New vs Existing Customer, dan ATV/UPT
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer border-l border-slate-200 pl-2"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          {/* Store Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              disabled={isStoreScoped}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {!isStoreScoped && <option value="ALL">Semua Store</option>}
              {stores.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Export Excel Button */}
          <button
            onClick={exportToCSV}
            disabled={loading || filteredData.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-xs disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel (Detail)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Net Sales</span>
          <p className="text-xl font-black text-slate-900 mt-1">
            <Amt value={overallKPI.totalNet} />
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{overallKPI.totalInvoices} Invoices · {overallKPI.totalQty} Pcs</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/70 to-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">🟢 New Customer Sales</span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{overallKPI.pctNew.toFixed(1)}%</span>
          </div>
          <p className="text-xl font-black text-emerald-950 mt-1">
            <Amt value={overallKPI.newSales} />
          </p>
          <p className="text-[11px] text-emerald-700 mt-1">{overallKPI.newCount} Customer Baru</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50/70 to-white p-4 rounded-2xl border border-blue-200 shadow-2xs">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">🔵 Existing Customer Sales</span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{overallKPI.pctExist.toFixed(1)}%</span>
          </div>
          <p className="text-xl font-black text-blue-950 mt-1">
            <Amt value={overallKPI.existSales} />
          </p>
          <p className="text-[11px] text-blue-700 mt-1">{overallKPI.existCount} Customer Repeat</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Rata-Rata ATV & UPT</span>
          <p className="text-xl font-black text-indigo-900 mt-1">
            <Amt value={overallKPI.totalInvoices > 0 ? overallKPI.totalNet / overallKPI.totalInvoices : 0} />
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            UPT: {overallKPI.totalInvoices > 0 ? (overallKPI.totalQty / overallKPI.totalInvoices).toFixed(2) : '0'} pcs/trx
          </p>
        </div>
      </div>

      {/* Main Tables Grouped per Store */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Mengkalkulasi produktivitas sales person & tipe customer...</p>
        </div>
      ) : storeGroups.size === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 text-xs font-bold text-slate-400 shadow-xs">
          Tidak ada transaksi yang ditemukan untuk periode {MONTHS[month - 1]} {year}
        </div>
      ) : (
        Array.from(storeGroups.entries()).map(([storeName, advisors]) => {
          const subNet = advisors.reduce((s, r) => s + r.totalNetSales, 0);
          const subInvoices = advisors.reduce((s, r) => s + r.totalInvoices, 0);
          const subQty = advisors.reduce((s, r) => s + r.totalQty, 0);
          const subNew = advisors.reduce((s, r) => s + r.newCustomerSales, 0);
          const subNewCount = advisors.reduce((s, r) => s + r.newCustomerCount, 0);
          const subExist = advisors.reduce((s, r) => s + r.existingCustomerSales, 0);
          const subExistCount = advisors.reduce((s, r) => s + r.existingCustomerCount, 0);
          const subPctNew = subNet > 0 ? (subNew / subNet) * 100 : 0;
          const subPctExist = subNet > 0 ? (subExist / subNet) * 100 : 0;
          const subAtv = subInvoices > 0 ? subNet / subInvoices : 0;
          const subUpt = subInvoices > 0 ? subQty / subInvoices : 0;
          const subWalkIn = advisors.reduce((s, r) => s + r.walkIn, 0);
          const subFollowUp = advisors.reduce((s, r) => s + r.followUp, 0);

          return (
            <div key={storeName} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Store Title Bar */}
              <div className="bg-slate-50/90 px-5 py-3.5 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{storeName}</h3>
                </div>
                <span className="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                  Total Store: <Amt value={subNet} />
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap text-xs">
                  <thead className="bg-slate-100/60 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Sales Person (Advisor)</th>
                      <th className="py-3 px-4 text-right">Total Net Sales</th>
                      <th className="py-3 px-3 text-center">Trx</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-3 text-center bg-blue-50/40 text-blue-900">Walk In</th>
                      <th className="py-3 px-3 text-center bg-violet-50/40 text-violet-900">Follow Up</th>
                      <th className="py-3 px-4 text-right bg-emerald-50/40 text-emerald-900">🟢 New Cust Sales</th>
                      <th className="py-3 px-3 text-center bg-emerald-50/40 text-emerald-900">% New</th>
                      <th className="py-3 px-4 text-right bg-blue-50/40 text-blue-900">🔵 Exist Cust Sales</th>
                      <th className="py-3 px-3 text-center bg-blue-50/40 text-blue-900">% Exist</th>
                      <th className="py-3 px-4 text-right">ATV (Avg Ticket)</th>
                      <th className="py-3 px-3 text-center">UPT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {advisors.map((adv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-extrabold text-[10px] flex items-center justify-center border border-slate-200">
                            {idx + 1}
                          </span>
                          {adv.advisor}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                          <Amt value={adv.totalNetSales} />
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-700">{adv.totalInvoices}</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-700">{adv.totalQty}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-700 bg-blue-50/20">
                          {adv.walkIn > 0 ? adv.walkIn : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-violet-700 bg-violet-50/20">
                          {adv.followUp > 0 ? adv.followUp : <span className="text-slate-300">—</span>}
                        </td>

                        {/* New Customer */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20">
                          <Amt value={adv.newCustomerSales} />
                          <span className="text-[10px] block font-normal text-emerald-600">({adv.newCustomerCount} cust)</span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-800 bg-emerald-50/20">
                          {adv.pctNewSales.toFixed(1)}%
                        </td>

                        {/* Existing Customer */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-700 bg-blue-50/20">
                          <Amt value={adv.existingCustomerSales} />
                          <span className="text-[10px] block font-normal text-blue-600">({adv.existingCustomerCount} cust)</span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-blue-800 bg-blue-50/20">
                          {adv.pctExistingSales.toFixed(1)}%
                        </td>

                        {/* ATV & UPT */}
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          <Amt value={adv.atv} />
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                          {adv.upt.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Subtotal Store Footer */}
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-xs font-black text-slate-900">
                    <tr>
                      <td className="py-3 px-4 uppercase text-slate-600">SUBTOTAL {storeName}</td>
                      <td className="py-3 px-4 text-right font-mono text-indigo-900">
                        <Amt value={subNet} />
                      </td>
                      <td className="py-3 px-3 text-center font-mono">{subInvoices}</td>
                      <td className="py-3 px-3 text-center font-mono">{subQty}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-blue-800 bg-blue-50/30">{subWalkIn || '—'}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-violet-800 bg-violet-50/30">{subFollowUp || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-800 bg-emerald-50/30">
                        <Amt value={subNew} />
                        <span className="text-[10px] block font-normal text-emerald-700">({subNewCount} cust)</span>
                      </td>
                      <td className="py-3 px-3 text-center text-emerald-900 bg-emerald-50/30">
                        {subPctNew.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-blue-800 bg-blue-50/30">
                        <Amt value={subExist} />
                        <span className="text-[10px] block font-normal text-blue-700">({subExistCount} cust)</span>
                      </td>
                      <td className="py-3 px-3 text-center text-blue-900 bg-blue-50/30">
                        {subPctExist.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <Amt value={subAtv} />
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        {subUpt.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

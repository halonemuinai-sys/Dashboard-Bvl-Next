"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Download,
  TrendingUp, Award, UserCheck, UserPlus, Building2,
  RefreshCw, ArrowUpRight, Package, ReceiptText
} from 'lucide-react';
import { getAdvisorProductivity, type AdvisorMetrics, type DetailTransaction } from '@/services/dashboard/productivityService';
import Amt from '@/components/Amt';
import { useUserAccess } from '@/lib/user-access-context';
import styles from './productivity.module.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AdvisorProductivityPage() {
  const { assignedStore, loading: accessLoading } = useUserAccess();
  const isStoreScoped = Boolean(assignedStore && assignedStore !== 'ALL');

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedStore, setSelectedStore] = useState('ALL');
  const effectiveStore = isStoreScoped && assignedStore ? assignedStore : selectedStore;

  const [loading, setLoading] = useState(true);
  const reportLoading = loading || accessLoading;
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  const [advisorData, setAdvisorData] = useState<AdvisorMetrics[]>([]);
  const [detailTransactions, setDetailTransactions] = useState<DetailTransaction[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const report = await getAdvisorProductivity(month, year);
        if (active) { setDetailTransactions(report.details); setAdvisorData(report.metrics); }
      } catch (err) {
        console.error('Error fetching productivity report:', err);
        if (active) { setAdvisorData([]); setDetailTransactions([]); setError('The productivity report could not be loaded. Please try again.'); }
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [month, year, reload]);

  // Unique stores for filter
  const stores = useMemo(() => {
    const s = new Set(advisorData.map(a => a.store));
    return Array.from(s).sort();
  }, [advisorData]);

  // Filtered by selected store
  const filteredData = useMemo(() => {
    if (effectiveStore === 'ALL') return advisorData;
    return advisorData.filter(a => a.store === effectiveStore);
  }, [advisorData, effectiveStore]);

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

  // Export summary and transaction details as CSV.
  const exportToCSV = () => {
    const q = (v: unknown) => {
      const text = String(v ?? '');
      const safe = typeof v === 'number' ? text : /^\s*[=+@-]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const lines: string[] = [];

    // Header Meta
    lines.push(`SALES PERSON PRODUCTIVITY REPORT - BVLGARI`);
    lines.push(`Period: ${MONTHS[month - 1]} ${year}`);
    lines.push(`Store: ${effectiveStore}`);
    lines.push(`Exported: ${new Date().toLocaleString('en-GB')}`);
    lines.push(``);

    // SECTION 1: SUMMARY TABLE
    lines.push(`=== 1. ADVISOR PRODUCTIVITY SUMMARY ===`);
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
    lines.push(`=== 2. TRANSACTION DETAILS ===`);
    lines.push([
      'Date', 'Transaction No', 'Store', 'Sales Person',
      'Customer Name', 'Phone No', 'Customer Type',
      'Main Category', 'Collection', 'Qty', 'Net Sales (IDR)'
    ].map(q).join(','));

    const filteredDetails = effectiveStore === 'ALL'
      ? detailTransactions
      : detailTransactions.filter(d => d.store === effectiveStore);

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
    link.download = `Productivity_Report_${MONTHS[month - 1]}_${year}_${effectiveStore}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><Award size={15} /> SALES PERFORMANCE / ADVISORS</span>
          <h1>Sales Person Productivity Report</h1>
          <p>Compare advisor sales, customer mix, visits and transaction quality across boutiques.</p>
        </div>

        {/* Filter Toolbar */}
        <div className={styles.controls}>
          {/* Month Selector */}
          <div className={styles.control}>
            <CalendarIcon size={16} />
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              aria-label="Report month"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              aria-label="Report year"
            >
              {Array.from({ length: Math.max(1, new Date().getFullYear() - 2023 + 1) }, (_, index) => new Date().getFullYear() - index).map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          {/* Store Filter */}
          <div className={styles.control}>
            <Building2 size={16} />
            <select
              value={effectiveStore}
              onChange={e => setSelectedStore(e.target.value)}
              disabled={isStoreScoped}
              aria-label="Store"
            >
              {!isStoreScoped && <option value="ALL">All stores</option>}
              {isStoreScoped && !stores.includes(effectiveStore) && <option value={effectiveStore}>{effectiveStore}</option>}
              {stores.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* CSV export */}
          <button
            onClick={exportToCSV}
            disabled={reportLoading || !!error || filteredData.length === 0}
            className={styles.export}
          >
            <Download size={16} />
            Download CSV <ArrowUpRight size={15} />
          </button>
          <button type="button" onClick={() => setReload(value => value + 1)} disabled={reportLoading} className={styles.refresh} aria-label="Refresh productivity report" title="Refresh report"><RefreshCw size={16} /></button>
        </div>
        <div className={styles.heroFoot}><span>{MONTHS[month - 1]} {year}</span><span>{effectiveStore === 'ALL' ? 'All stores' : effectiveStore} · {filteredData.length} advisors</span></div>
      </div>

      {/* KPI Cards */}
      {!reportLoading && !error && <>
      <div className={styles.kpis}>
        <div className={`${styles.kpi} ${styles.kpiPrimary}`}>
          <span className={styles.kpiLabel}><TrendingUp size={17} /> Net sales</span>
          <p className={styles.kpiValue}>
            <Amt value={overallKPI.totalNet} />
          </p>
          <p className={styles.kpiNote}>{overallKPI.totalInvoices} invoices · {overallKPI.totalQty} pieces</p>
        </div>

        <div className={`${styles.kpi} ${styles.kpiNew}`}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}><UserPlus size={17} /> New customer sales</span>
            <span className={styles.kpiRate}>{overallKPI.pctNew.toFixed(1)}%</span>
          </div>
          <p className={styles.kpiValue}>
            <Amt value={overallKPI.newSales} />
          </p>
          <p className={styles.kpiNote}>{overallKPI.newCount} new customers</p>
        </div>

        <div className={`${styles.kpi} ${styles.kpiExisting}`}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}><UserCheck size={17} /> Existing customer sales</span>
            <span className={styles.kpiRate}>{overallKPI.pctExist.toFixed(1)}%</span>
          </div>
          <p className={styles.kpiValue}>
            <Amt value={overallKPI.existSales} />
          </p>
          <p className={styles.kpiNote}>{overallKPI.existCount} existing customers</p>
        </div>

        <div className={`${styles.kpi} ${styles.kpiTicket}`}>
          <span className={styles.kpiLabel}><ReceiptText size={17} /> Avg. ticket value</span>
          <p className={styles.kpiValue}>
            <Amt value={overallKPI.totalInvoices > 0 ? overallKPI.totalNet / overallKPI.totalInvoices : 0} />
          </p>
          <p className={styles.kpiNote}>
            <Package size={13} /> UPT {overallKPI.totalInvoices > 0 ? (overallKPI.totalQty / overallKPI.totalInvoices).toFixed(2) : '0.00'} pieces / invoice
          </p>
        </div>
      </div>
      <div className={styles.mixPanel}>
        <div><span className={styles.mixLabel}>Sales mix</span><strong>New &amp; existing customers</strong><small>Share of net sales in the selected scope</small></div>
        <div className={styles.mixViz}><div className={styles.mixLegend}><span><i className={styles.newDot} /> New {overallKPI.pctNew.toFixed(1)}%</span><span><i className={styles.existingDot} /> Existing {overallKPI.pctExist.toFixed(1)}%</span></div><div className={styles.mixTrack}><span style={{ width: `${Math.max(0, Math.min(100, overallKPI.pctNew))}%` }} /><span style={{ width: `${Math.max(0, Math.min(100 - Math.max(0, Math.min(100, overallKPI.pctNew)), overallKPI.pctExist))}%` }} /></div></div>
      </div>
      </>}

      {/* Main Tables Grouped per Store */}
      {reportLoading ? (
        <div className={styles.message} role="status">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p>Calculating advisor productivity and customer mix...</p>
        </div>
      ) : error ? (
        <div className={styles.message} role="alert"><p>{error}</p><button type="button" onClick={() => setReload(value => value + 1)}>Try again</button></div>
      ) : storeGroups.size === 0 ? (
        <div className={styles.message}>
          No transactions found for {MONTHS[month - 1]} {year}.
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
            <section key={storeName} className={styles.storeCard}>
              {/* Store Title Bar */}
              <div className={styles.storeHeader}>
                <div className={styles.storeIdentity}>
                  <span className={styles.storeIcon}><Building2 size={18} /></span>
                  <div><span className={styles.storeEyebrow}>BOUTIQUE PERFORMANCE</span><h3>{storeName}</h3><p>{advisors.length} advisors · {subInvoices} invoices · {subQty} pieces</p></div>
                </div>
                <span className={styles.storeTotal}>
                  <small>STORE NET SALES</small><strong><Amt value={subNet} /></strong>
                </span>
              </div>

              {/* Table */}
              <p className={styles.scrollHint}>Scroll horizontally to view all productivity metrics →</p>
              <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={`${storeName} advisor productivity table`}>
                <table className={styles.dataTable}>
                  <thead className="bg-slate-100/60 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Sales Person (Advisor)</th>
                      <th className="py-3 px-4 text-right">Total Net Sales</th>
                      <th className="py-3 px-3 text-center">Trx</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-3 text-center bg-blue-50/40 text-blue-900">Walk In</th>
                      <th className="py-3 px-3 text-center bg-violet-50/40 text-violet-900">Follow Up</th>
                      <th className="py-3 px-4 text-right bg-emerald-50/40 text-emerald-900">New customer sales</th>
                      <th className="py-3 px-3 text-center bg-emerald-50/40 text-emerald-900">% New</th>
                      <th className="py-3 px-4 text-right bg-blue-50/40 text-blue-900">Existing customer sales</th>
                      <th className="py-3 px-3 text-center bg-blue-50/40 text-blue-900">% Exist</th>
                      <th className="py-3 px-4 text-right">ATV (Avg Ticket)</th>
                      <th className="py-3 px-3 text-center">UPT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {advisors.map((adv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <span className={styles.advisorCell}><span className={styles.advisorRank}>{idx + 1}</span><span>{adv.advisor}</span></span>
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
            </section>
          );
        })
      )}
    </div>
  );
}

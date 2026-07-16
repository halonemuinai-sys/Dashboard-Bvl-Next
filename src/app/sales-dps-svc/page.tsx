"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Download, Calendar as CalendarIcon, Database,
  CheckCircle2, AlertCircle, Loader2, ArrowRightLeft
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { syncService } from '@/services/syncService';
import { supabase } from '@/lib/supabase';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface TransactionRow {
  id?: number;
  transaction_date: string;
  trans_no: string;
  salesman: string;
  customer: string;
  location: string;
  main_category: string;
  qty: number;
  gross_sales: number;
  net_sales: number;
  val_disc: number;
  card_comm: number;
  cost: number;
  phone_no: string;
}

export default function SalesDpsSvcManagerPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  // Fetch existing bvlgari_sales data for DPS & SVC
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data, error, count } = await supabase
        .from('bvlgari_sales')
        .select('*', { count: 'exact' })
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .in('collection', ['DPS', 'SVC'])
        .order('transaction_date', { ascending: false })
        .limit(500);

      if (error) throw error;

      const mapped = (data || []).map(r => {
        const gross = (r.qty || 1) * (r.price || 0);
        return {
          id: r.id,
          transaction_date: r.transaction_date,
          trans_no: r.transaction_no || '',
          salesman: r.salesman || '',
          customer: r.customer_name || '',
          location: r.location || '',
          main_category: r.collection || '',
          qty: r.qty || 0,
          gross_sales: gross,
          net_sales: r.net_sales || 0,
          val_disc: r.sub_total_discount || 0,
          card_comm: r.card_comm || 0,
          cost: (r.sub_total_discount || 0) + (r.card_comm || 0),
          phone_no: r.phone_no || '',
        };
      });

      setRows(mapped as TransactionRow[]);
      setTotalRows(count || 0);
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handle Sync button click
  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      const result = await syncService.syncSalesData(month, year);

      if (result.success) {
        setSyncResult(
          `Sync selesai! ${result.rawInserted} baris baru ditambahkan. ` +
          `${result.skippedDuplicates} duplikat dilewati.`
        );
        // Refresh data table
        await fetchData();
      } else {
        setSyncError(result.error || 'Sync gagal.');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Terjadi kesalahan.');
    } finally {
      setSyncing(false);
    }
  };

  const monthName = MONTHS[month - 1];

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-violet-600" />
            DP & SVC Sales Manager
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Sync & kelola data mentah Down Payment (DPS) dan Service (SVC) dari API
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month/Year Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-violet-600" />
            <select
              aria-label="Select month"
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select
              aria-label="Select year"
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer border-l border-slate-200 pl-2 ml-2"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
            </select>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all",
              syncing
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-violet-600 text-white hover:bg-violet-700 active:scale-95"
            )}
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-4 h-4" />
            )}
            {syncing ? 'Syncing...' : 'Sync from API'}
          </button>
        </div>
      </div>

      {/* Sync Status Messages */}
      {syncResult && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          {syncResult}
        </div>
      )}
      {syncError && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium animate-in slide-in-from-top duration-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {syncError}
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Rows</p>
          <h3 className="text-2xl font-bold text-slate-900">{totalRows.toLocaleString('id-ID')}</h3>
          <p className="text-[10px] text-slate-400 mt-1">{monthName} {year}</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Net Sales</p>
          <h3 className="text-2xl font-bold text-violet-600">{formatCurrency(rows.reduce((s, r) => s + (r.net_sales || 0), 0))}</h3>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Cost</p>
          <h3 className="text-2xl font-bold text-rose-500">{formatCurrency(rows.reduce((s, r) => s + (r.cost || 0), 0))}</h3>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unmapped Comm</p>
          <h3 className={cn(
            "text-2xl font-bold",
            rows.filter(r => (r.card_comm || 0) === 0).length > 0 ? "text-amber-500" : "text-emerald-600"
          )}>
            {rows.filter(r => (r.card_comm || 0) === 0).length}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">rows need card_comm</p>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-violet-600 rounded-sm" />
            <h3 className="text-sm font-bold text-slate-900">
              DP & SVC Raw Transactions — {monthName} {year}
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold ml-2">
              bvlgari_sales
            </span>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-violet-600 transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Database className="w-10 h-10 mb-3 text-slate-300" />
            <p className="text-sm font-medium">Tidak ada data DP / SVC untuk {monthName} {year}</p>
            <p className="text-xs mt-1">Klik &quot;Sync from API&quot; untuk menarik data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Trans No</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Salesman</th>
                  <th className="px-4 py-3">Collection</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3 text-right">Net Sales</th>
                  <th className="px-4 py-3 text-right text-amber-600">Card Comm</th>
                  <th className="px-4 py-3 text-right text-rose-600">Cost</th>
                  <th className="px-4 py-3">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50 transition-colors text-xs">
                    <td className="px-4 py-2.5 font-medium text-slate-600">
                      {r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{r.trans_no || '-'}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-700">{r.location || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.salesman || '-'}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        r.main_category === 'DPS' ? "bg-violet-50 text-violet-600" :
                        r.main_category === 'SVC' ? "bg-blue-50 text-blue-600" :
                        "bg-slate-100 text-slate-500"
                      )}>
                        {r.main_category || 'Other'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono text-slate-600">{r.qty}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-500">{formatCurrency(r.gross_sales || 0)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-500">{formatCurrency(r.val_disc || 0)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800">{formatCurrency(r.net_sales || 0)}</td>
                    <td className={cn(
                      "px-4 py-2.5 text-right font-mono font-bold",
                      (r.card_comm || 0) === 0 ? "text-amber-400" : "text-amber-600"
                    )}>
                      {formatCurrency(r.card_comm || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-500">{formatCurrency(r.cost || 0)}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">
                      {r.phone_no || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {rows.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <p className="text-[10px] text-slate-400 font-medium">
              Menampilkan {rows.length} dari {totalRows.toLocaleString('id-ID')} transaksi
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              Source: bvlgari_sales → Supabase
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

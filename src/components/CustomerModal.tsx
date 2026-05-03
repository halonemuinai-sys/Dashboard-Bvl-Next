"use client";

import { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, ShoppingBag, Calendar, Package, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { customerService, SEGMENT_CFG, type Segment } from '@/services/customerService';

type Detail = Awaited<ReturnType<typeof customerService.getCustomerDetail>>;

interface Props {
  name: string | null;
  segment: Segment | null;
  onClose: () => void;
}

const fmtDate = (d: string) => {
  if (!d || d === '—') return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function CustomerModal({ name, segment, onClose }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (n: string) => {
    setLoading(true);
    setDetail(null);
    try {
      const res = await customerService.getCustomerDetail(n);
      setDetail(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (name) load(name);
  }, [name, load]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!name) return null;

  const cfg = segment ? SEGMENT_CFG[segment] : SEGMENT_CFG['Potential'];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">{name}</h2>
              {segment && (
                <span className={cn(
                  "inline-block text-[9px] font-black px-2 py-0.5 rounded-full mt-0.5",
                  cfg.bg, cfg.text
                )}>
                  {segment.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
            <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium animate-pulse">Loading customer data...</p>
          </div>
        )}

        {/* Content */}
        {!loading && detail && (
          <div className="flex-1 overflow-y-auto">

            {/* KPI Mini Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 pb-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Lifetime Spend</p>
                </div>
                <p className="text-base font-black text-blue-700">
                  <Amt value={detail.kpi.totalSpend} short />
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Pieces</p>
                </div>
                <p className="text-base font-black text-slate-700">{detail.kpi.totalQty.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">First Visit</p>
                </div>
                <p className="text-sm font-black text-slate-700">{fmtDate(detail.kpi.firstVisit)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Last Visit</p>
                </div>
                <p className="text-sm font-black text-slate-700">{fmtDate(detail.kpi.lastVisit)}</p>
              </div>
            </div>

            {/* Body: Collections + History */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pb-6">

              {/* Top Collections */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-800">Top 5 Collections</h4>
                </div>
                <div className="divide-y divide-slate-50">
                  {detail.topCollections.length === 0 && (
                    <p className="px-4 py-6 text-xs text-slate-400 text-center">No collection data</p>
                  )}
                  {detail.topCollections.map((col, i) => (
                    <div key={i} className="px-4 py-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{col.name}</p>
                        <p className="text-[10px] text-slate-400">{col.qty} pcs</p>
                      </div>
                      <p className="text-xs font-black text-blue-700 shrink-0">
                        <Amt value={col.value} short />
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction History */}
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800">Transaction History</h4>
                  <span className="text-[10px] font-bold text-slate-400">{detail.transactions.length} records</span>
                </div>
                <div className="overflow-auto max-h-[340px]">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4 text-center">Qty</th>
                        <th className="py-2.5 px-4">Collection / Category / Store</th>
                        <th className="py-2.5 px-4 text-right">Net Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detail.transactions.map((tx, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-slate-600">{fmtDate(tx.date)}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-slate-700">{tx.qty}</td>
                          <td className="py-2.5 px-4">
                            <p className="font-bold text-slate-800 truncate max-w-[200px]">{tx.collection}</p>
                            <p className="text-[10px] text-slate-400">{tx.category} · {tx.location}</p>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-black text-slate-800">
                            <Amt value={tx.netSales} short />
                          </td>
                        </tr>
                      ))}
                      {detail.transactions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-slate-400">No transactions found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Percent, RefreshCw, Loader2, TrendingUp, TrendingDown, Info, X, Receipt,
} from 'lucide-react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { useUserAccess } from '@/lib/user-access-context';
import {
  getCostDiscBreakdown, getMonthlyDiscountDetail, CostDiscBreakdown, InvoiceDiscRow,
} from '@/services/dashboard/costDiscService';

const STORES = ['ALL', 'Plaza Indonesia', 'Plaza Senayan', 'Bali'];
const YEARS = ['2026', '2025', '2024', '2023'];
const MONTHS_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function fmtPct(n: number) { return n.toFixed(2) + '%'; }

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}
function InfoTip({ text }: { text: string }) {
  return (
    <div className="group/info relative flex justify-center">
      <Info className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 cursor-help transition-colors" />
      <div className="absolute bottom-full right-0 mb-2 w-56 bg-slate-800 text-white text-[10px] px-3 py-2.5 rounded-lg shadow-2xl invisible opacity-0 group-hover/info:visible group-hover/info:opacity-100 transition-all duration-300 z-[100] leading-relaxed pointer-events-none">
        {text}
        <div className="absolute top-full right-2 border-[5px] border-transparent border-t-slate-800" />
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 min-w-[180px]">
      <p className="text-xs font-black text-slate-800 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between items-center gap-4">
          <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Cost %
          </span>
          <span className="text-xs font-black text-rose-600">{fmtPct(row.costPct)}</span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Disc %
          </span>
          <span className="text-xs font-black text-amber-600">{fmtPct(row.discPct)}</span>
        </div>
        <div className="pt-1.5 mt-1 border-t border-slate-100 flex justify-between items-center gap-4">
          <span className="text-[10px] text-slate-400">Gross Sales</span>
          <span className="text-[11px] font-bold text-slate-700"><Amt value={row.grossSales} compact /></span>
        </div>
      </div>
    </div>
  );
}

export default function CostDiscAnalysisPage() {
  const { assignedStore } = useUserAccess();
  const isStoreScoped = Boolean(assignedStore && assignedStore !== 'ALL');

  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [store, setStore] = useState(isStoreScoped ? assignedStore : 'ALL');
  const [data, setData] = useState<CostDiscBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  const [detailMonth, setDetailMonth] = useState<number | null>(null);
  const [detailRows, setDetailRows] = useState<InvoiceDiscRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const openMonthDetail = (monthIndex: number) => {
    setDetailMonth(monthIndex);
    setDetailLoading(true);
    getMonthlyDiscountDetail(Number(year), monthIndex, store)
      .then(setDetailRows)
      .catch(console.error)
      .finally(() => setDetailLoading(false));
  };

  useEffect(() => {
    if (isStoreScoped && assignedStore) setStore(assignedStore);
  }, [assignedStore, isStoreScoped]);

  const fetchData = () => {
    setLoading(true);
    getCostDiscBreakdown(Number(year), store)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [year, store]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.monthly
      .filter(m => m.grossSales > 0)
      .map(m => ({
        name: m.monthLabel,
        costPct: Number(m.costPct.toFixed(2)),
        discPct: Number(m.discPct.toFixed(2)),
        grossSales: m.grossSales,
      }));
  }, [data]);

  const { highestDiscMonth, lowestDiscMonth } = useMemo(() => {
    const withData = data?.monthly.filter(m => m.grossSales > 0) ?? [];
    if (withData.length === 0) return { highestDiscMonth: null, lowestDiscMonth: null };
    const highest = withData.reduce((a, b) => (b.discPct > a.discPct ? b : a));
    const lowest = withData.reduce((a, b) => (b.discPct < a.discPct ? b : a));
    return { highestDiscMonth: highest, lowestDiscMonth: lowest };
  }, [data]);

  return (
    <div className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
              <Percent className="w-4 h-4 text-rose-600" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Margin Intelligence</h1>
          </div>
          <p className="text-slate-500 text-sm">Analisis tren margin bulanan untuk memantau kesehatan biaya dan diskon di seluruh toko, exc. Head Office.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select aria-label="year" value={year} onChange={e => setYear(e.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer">
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
          <select aria-label="store" value={store} disabled={isStoreScoped}
            onChange={e => setStore(e.target.value)}
            className={cn(
              "bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none cursor-pointer",
              isStoreScoped && "opacity-60 cursor-not-allowed"
            )}>
            {STORES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Stores' : s}</option>)}
          </select>
          <button type="button" onClick={fetchData}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm cursor-pointer"
            title="Muat ulang">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gross Sales ({year})</p>
          <p className="text-lg font-black text-slate-900"><Amt value={data?.annual.grossSales ?? 0} compact /></p>
        </div>
        <div className="bg-white border-l-4 border-l-rose-500 border-y border-r border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Cost % (Tahun)</p>
            <InfoTip text="Cost % = (Cost + Komisi) / Gross Sales. Gross (harga sebelum potongan) dipakai sebagai pembagi karena Net Sales = Gross − Diskon — Net sudah 'susut' duluan jadi bukan basis netral. Data raw DSR, belum divalidasi Finance." />
          </div>
          <p className="text-lg font-black text-rose-600">{fmtPct(data?.annual.costPct ?? 0)}</p>
          <p className="text-[10px] text-slate-400"><Amt value={data?.annual.totalCost ?? 0} compact /></p>
        </div>
        <div className="bg-white border-l-4 border-l-amber-500 border-y border-r border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Avg Disc % (Tahun)</p>
            <InfoTip text="Avg Disc % = Total Diskon / Gross Sales. Sama seperti Cost %, pembaginya Gross (harga list) supaya stabil — kalau dibagi Net, angkanya jadi lebih besar dari kenyataan (circular). Data raw DSR, belum divalidasi Finance." />
          </div>
          <p className="text-lg font-black text-amber-600">{fmtPct(data?.annual.discPct ?? 0)}</p>
          <p className="text-[10px] text-slate-400"><Amt value={data?.annual.totalDisc ?? 0} compact /></p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bulan Tertinggi/Rendah (Disc%)</p>
          {highestDiscMonth && lowestDiscMonth ? (
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs font-bold text-rose-600">
                <TrendingUp className="w-3.5 h-3.5" /> {highestDiscMonth.monthLabel} {fmtPct(highestDiscMonth.discPct)}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                <TrendingDown className="w-3.5 h-3.5" /> {lowestDiscMonth.monthLabel} {fmtPct(lowestDiscMonth.discPct)}
              </span>
            </div>
          ) : <p className="text-xs text-slate-300">—</p>}
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 bg-rose-500 rounded-sm" />
          <h3 className="text-sm font-bold text-slate-900">Tren Bulanan — Cost % vs Avg Disc %</h3>
        </div>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => v + '%'} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => <span className="text-xs font-bold text-slate-600">{value}</span>}
                  iconType="circle" iconSize={8}
                />
                <Line type="monotone" dataKey="costPct" name="Cost %" stroke="#e11d48" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#e11d48' }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="discPct" name="Avg Disc %" stroke="#f59e0b" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Monthly Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Rincian Per Bulan</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{store === 'ALL' ? 'Semua Toko' : store} · {year} · Exc Head Office · klik baris untuk lihat daftar invoice &amp; diskon</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="p-3">Bulan</th>
                <th className="p-3 text-right">Gross Sales</th>
                <th className="p-3 text-right">Total Cost</th>
                <th className="p-3 text-right">Cost %</th>
                <th className="p-3 text-right">Total Disc</th>
                <th className="p-3 text-right">Disc %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">Memuat...</td></tr>
              ) : data && data.monthly.filter(m => m.grossSales > 0).length > 0 ? (
                data.monthly.filter(m => m.grossSales > 0).map(m => (
                  <tr key={m.monthIndex} onClick={() => openMonthDetail(m.monthIndex)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="p-3 font-bold text-slate-800 flex items-center gap-1.5">
                      <Receipt className="w-3 h-3 text-slate-300" /> {m.monthLabel}
                    </td>
                    <td className="p-3 text-right text-slate-600"><Amt value={m.grossSales} compact /></td>
                    <td className="p-3 text-right text-slate-600"><Amt value={m.totalCost} compact /></td>
                    <td className="p-3 text-right font-bold text-rose-600">{fmtPct(m.costPct)}</td>
                    <td className="p-3 text-right text-slate-600"><Amt value={m.totalDisc} compact /></td>
                    <td className="p-3 text-right font-bold text-amber-600">{fmtPct(m.discPct)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">Tidak ada data untuk periode ini.</td></tr>
              )}
            </tbody>
            {data && (
              <tfoot className="bg-slate-50 font-black">
                <tr>
                  <td className="p-3 text-slate-900">TOTAL</td>
                  <td className="p-3 text-right text-slate-900"><Amt value={data.annual.grossSales} compact /></td>
                  <td className="p-3 text-right text-slate-900"><Amt value={data.annual.totalCost} compact /></td>
                  <td className="p-3 text-right text-rose-700">{fmtPct(data.annual.costPct)}</td>
                  <td className="p-3 text-right text-slate-900"><Amt value={data.annual.totalDisc} compact /></td>
                  <td className="p-3 text-right text-amber-700">{fmtPct(data.annual.discPct)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Month Discount Detail Modal */}
      {detailMonth !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setDetailMonth(null); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Daftar Invoice Berdiskon</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {MONTHS_FULL[detailMonth]} {year} · {store === 'ALL' ? 'Semua Toko' : store} · diurutkan Disc % terbesar ke terkecil
                </p>
              </div>
              <button type="button" onClick={() => setDetailMonth(null)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {detailLoading ? (
                <div className="p-10 flex items-center justify-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Memuat invoice...
                </div>
              ) : detailRows.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">Tidak ada invoice berdiskon untuk bulan ini.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">No Invoice</th>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Sales Advisor</th>
                      {store === 'ALL' && <th className="p-3">Lokasi</th>}
                      <th className="p-3 text-right">Gross Sales</th>
                      <th className="p-3 text-right">Diskon</th>
                      <th className="p-3 text-right">Disc %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailRows.map((r, idx) => (
                      <tr key={r.transNo} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-700">{r.transNo}</td>
                        <td className="p-3 text-slate-500">{r.transactionDate ? new Date(r.transactionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}</td>
                        <td className="p-3 text-slate-700">{r.customer}</td>
                        <td className="p-3 text-slate-500">{r.salesman}</td>
                        {store === 'ALL' && <td className="p-3 text-slate-500">{r.location}</td>}
                        <td className="p-3 text-right text-slate-600"><Amt value={r.grossSales} compact /></td>
                        <td className="p-3 text-right font-bold text-amber-600"><Amt value={r.totalDisc} compact /></td>
                        <td className="p-3 text-right font-bold text-slate-700">{fmtPct(r.discPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {!detailLoading && detailRows.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{detailRows.length} invoice berdiskon</span>
                <span>Total Diskon: <Amt value={detailRows.reduce((s, r) => s + r.totalDisc, 0)} compact /></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

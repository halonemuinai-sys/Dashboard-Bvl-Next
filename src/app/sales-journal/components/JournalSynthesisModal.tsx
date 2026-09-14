'use client';

import {
  X,
  FileSpreadsheet,
  Printer,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Diamond,
  Calendar,
  AlertCircle,
  Tag,
  Store,
  CheckCircle2,
} from 'lucide-react';
import Amt from '@/components/Amt';
import { JournalReportPayload } from '../reports/types';

interface JournalSynthesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: JournalReportPayload;
  onExportExcel: () => void;
}

export default function JournalSynthesisModal({
  isOpen,
  onClose,
  payload,
  onExportExcel,
}: JournalSynthesisModalProps) {
  if (!isOpen) return null;

  const {
    monthName,
    year,
    store,
    records,
    totalNet,
    totalQty,
    totalTrans,
    totalTraffic,
    avgConversionRate,
    daysNoted,
    totalDays,
  } = payload;

  const activeDays = records.filter((r) => r.netSales > 0);
  const peakDays = [...activeDays].sort((a, b) => b.netSales - a.netSales).slice(0, 3);
  const dipDays = [...activeDays].sort((a, b) => a.netSales - b.netSales).slice(0, 3);

  // Coverage percentage
  const coveragePct = Math.round((daysNoted / totalDays) * 100);

  // Tag frequency
  const tagCounts: Record<string, number> = {};
  records.forEach((r) => {
    (r.tags || []).forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Executive Synthesis &amp; Operational Report
              </h2>
              <p className="text-xs text-slate-500">
                Ringkasan Analisa Naratif, Traffic CRM &amp; Faktor Penunjang Sales &bull; {monthName} {year} ({store})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Executive KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Sales</span>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                <Amt value={totalNet} />
              </div>
              <span className="text-[10px] text-slate-500">{totalQty} pcs &bull; {totalTrans} trx</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Traffic Komersial</span>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                {totalTraffic.toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-slate-500">
                Konversi:{' '}
                <strong className="text-slate-800">
                  {avgConversionRate !== null ? `${avgConversionRate.toFixed(1)}%` : '-'}
                </strong>
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Journal Coverage</span>
              <div className="text-lg font-black text-blue-600 mt-0.5">
                {coveragePct}%
              </div>
              <span className="text-[10px] text-slate-500">{daysNoted} dari {totalDays} hari</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Faktor Dominan</span>
              <div className="text-xs font-bold text-slate-800 mt-1 flex flex-wrap gap-1">
                {Object.entries(tagCounts).slice(0, 2).map(([tag, count]) => (
                  <span key={tag} className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px]">
                    {tag} ({count}x)
                  </span>
                ))}
                {Object.keys(tagCounts).length === 0 && (
                  <span className="text-slate-400 text-[10px] italic">Belum ada tag</span>
                )}
              </div>
            </div>
          </div>

          {/* Peak Days vs Dip Days Highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Peak Days */}
            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-xs">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Top 3 Hari Penjualan Tertinggi (Peak Days)</span>
              </div>
              <div className="space-y-2">
                {peakDays.map((r, i) => (
                  <div key={r.dateStr} className="bg-white p-2.5 rounded-lg border border-emerald-100 text-xs shadow-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-800">#{i + 1} {r.dateStr} ({r.dayName})</span>
                      <div className="text-right">
                        <span className="text-emerald-700 block"><Amt value={r.netSales} /></span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {r.transCount} trx &bull; {r.crmTraffic} customer
                          {r.conversionRate ? ` (${(r.conversionRate * 100).toFixed(1)}%)` : ''}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {r.note ? `"${r.note}"` : <span className="italic text-slate-400">Belum ada catatan khusus</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Dip Days */}
            <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200/80 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-rose-800 text-xs">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span>3 Hari Penjualan Terendah (Dip Days)</span>
              </div>
              <div className="space-y-2">
                {dipDays.map((r, i) => (
                  <div key={r.dateStr} className="bg-white p-2.5 rounded-lg border border-rose-100 text-xs shadow-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-800">#{i + 1} {r.dateStr} ({r.dayName})</span>
                      <div className="text-right">
                        <span className="text-rose-700 block"><Amt value={r.netSales} /></span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {r.transCount} trx &bull; {r.crmTraffic} customer
                          {r.conversionRate ? ` (${(r.conversionRate * 100).toFixed(1)}%)` : ''}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {r.note ? `"${r.note}"` : <span className="italic text-slate-400">Footfall sepi / hari kerja normal</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Report Sheets Summary Box */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Sistem Pelaporan Excel Modular (4 Sheets)
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Laporan Excel dihasilkan secara otomatis menggunakan format baku eksekutif (angka tanpa simbol Rp,
              pemetaan warna Bvlgari Navy/Gold, dan total formula dinamis):
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
              <div>&bull; <strong>Sheet 1:</strong> Daily Journal Register</div>
              <div>&bull; <strong>Sheet 2:</strong> Operational Drivers &amp; Attribution</div>
              <div>&bull; <strong>Sheet 3:</strong> Store Comparative Matrix</div>
              <div>&bull; <strong>Sheet 4:</strong> Peak vs Low Days Analysis</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Dihasilkan langsung dari data transaksi Bvlgari &amp; Supabase.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 border border-slate-300 hover:bg-white rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Cetak / Print
            </button>
            <button
              type="button"
              onClick={() => {
                onExportExcel();
                onClose();
              }}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              Unduh Excel (4 Sheets)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

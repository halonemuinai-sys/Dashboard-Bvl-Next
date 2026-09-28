'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Edit3,
  PlusCircle,
  ShieldCheck,
  Clock,
  Building2,
  Percent,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { InvoiceHeader } from '@/services/dashboard/invoiceService';
import { PaymentSplitRow } from '@/services/dashboard/paymentEngine';

interface Props {
  invoice: InvoiceHeader;
  splits: PaymentSplitRow[] | null;
  onOpenPosPayment: () => void;
}

export default function InvoicePaymentSection({
  invoice,
  splits,
  onOpenPosPayment,
}: Props) {
  const [showInternalComm, setShowInternalComm] = useState(true);

  const hasSplits = Boolean(splits && splits.length > 0);
  const totalPaid = hasSplits ? splits!.reduce((acc, r) => acc + (r.amount || 0), 0) : 0;
  const totalComm = hasSplits ? splits!.reduce((acc, r) => acc + (r.cardComm || 0), 0) : Math.round(invoice.total_comm || 0);
  const netSettlement = totalPaid > 0 ? totalPaid - totalComm : (invoice.total_net || 0) - totalComm;
  const effectiveMdr = totalPaid > 0 ? (totalComm / totalPaid) * 100 : 0;

  return (
    <div className="space-y-3 pt-2">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Informasi & Metode Pembayaran</span>
              {hasSplits ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Terverifikasi POS</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Pending Input POS</span>
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500">
              Rincian instrumen pembayaran, terminal EDC, skema cicilan & komisi bank (MDR)
            </div>
          </div>
        </div>

        {/* Action Controls (Screen Only) */}
        <div className="no-print-area flex items-center gap-2">
          {hasSplits && (
            <button
              type="button"
              onClick={() => setShowInternalComm(!showInternalComm)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Tampilkan / Sembunyikan Rincian Card Comm"
            >
              {showInternalComm ? <EyeOff className="w-3 h-3 text-slate-500" /> : <Eye className="w-3 h-3 text-slate-500" />}
              <span>{showInternalComm ? 'Sembunyikan MDR' : 'Lihat MDR'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenPosPayment}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer",
              hasSplits
                ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
            )}
            title={hasSplits ? "Edit Rincian Split Pembayaran POS" : "Input Rincian Split Pembayaran POS"}
          >
            {hasSplits ? <Edit3 className="w-3.5 h-3.5 text-slate-600" /> : <PlusCircle className="w-3.5 h-3.5" />}
            <span>{hasSplits ? 'Edit Rincian POS' : '+ Input Pembayaran POS'}</span>
          </button>
        </div>
      </div>

      {/* Content Body */}
      {hasSplits && splits ? (
        <div className="space-y-3">
          {/* Split Rows Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">Metode & EDC</th>
                  <th className="py-2.5 px-3">Bank & Jenis Kartu</th>
                  <th className="py-2.5 px-3">Skema / Tenor</th>
                  <th className="py-2.5 px-3 text-right">Nominal Terbayar</th>
                  {showInternalComm && (
                    <>
                      <th className="py-2.5 px-3 text-center bg-emerald-50/70 text-emerald-950 border-l border-emerald-200">
                        MDR %
                      </th>
                      <th className="py-2.5 px-3 text-right">Card Comm</th>
                      <th className="py-2.5 px-3 text-right">Kas Bersih (Net)</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {splits.map((split, idx) => {
                  const amt = Math.round(split.amount || 0);
                  const comm = Math.round(split.cardComm || 0);
                  const net = amt - comm;
                  const isInstallment = split.installment && split.installment !== '--';

                  return (
                    <tr key={split.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{split.paymentType}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {split.edc !== '--' ? `EDC ${split.edc}` : 'Non-EDC'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">
                          {split.bank !== '--' ? split.bank : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {split.cardType !== '--' ? split.cardType : 'Reguler'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {isInstallment ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Cicilan 0% ({split.installment})
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Full Payment</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        Rp {formatCurrency(amt)}
                      </td>
                      {showInternalComm && (
                        <>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-950 bg-emerald-50/70 border-l border-emerald-200">
                            {(split.mdrPct * 100).toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                            Rp {formatCurrency(comm)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                            Rp {formatCurrency(net)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Payment Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Pelunasan Nota
              </span>
              <div className="font-mono font-bold text-slate-900 text-sm">
                Rp {formatCurrency(totalPaid)}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Status: LUNAS ({splits.length} split)</span>
              </div>
            </div>

            {showInternalComm ? (
              <>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Card Comm (MDR Bank)
                  </span>
                  <div className="font-mono font-bold text-slate-800 text-sm">
                    Rp {formatCurrency(totalComm)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Rata-rata MDR: {effectiveMdr.toFixed(2)}%
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Kas Masuk Bersih (Net Settlement)
                  </span>
                  <div className="font-mono font-black text-emerald-700 text-sm">
                    Rp {formatCurrency(netSettlement)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Inflow rekening butik
                  </div>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2 flex items-center justify-end text-[11px] text-slate-400 italic">
                Rincian Card Comm internal disembunyikan untuk tampilan cetak customer.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State (Unprocessed / Pending Split) */
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">
                Rincian Metode Pembayaran Belum Di-split
              </div>
              <div className="text-[11px] text-slate-500">
                Faktur ini belum memiliki rincian EDC, bank, atau skema cicilan 0%. Komisi bank tercatat saat ini:{' '}
                <strong className="font-mono text-slate-700">Rp {formatCurrency(invoice.total_comm || 0)}</strong>.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenPosPayment}
            className="no-print-area px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Input Pembayaran POS</span>
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info,
  Building2,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { InvoiceHeader } from '@/services/dashboard/invoiceService';
import {
  PAYMENT_TYPES,
  EDC_OPTIONS,
  CARD_TYPES,
  INSTALLMENT_OPTIONS,
  BANK_OPTIONS,
  PaymentType,
  EdcOption,
  CardTypeOption,
  InstallmentOption,
  BankOption,
  PaymentSplitRow,
  computePaymentMdr,
  saveInvoicePaymentSplits,
  BankMdrRule,
  getMergedBankMdrRules,
  DebitConfig,
} from '@/services/dashboard/paymentEngine';

interface Props {
  invoice: InvoiceHeader | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedInvoiceNo: string, newTotalComm: number) => void;
  userEmail?: string;
}

export default function PosPaymentModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
  userEmail,
}: Props) {
  const [rows, setRows] = useState<PaymentSplitRow[]>([]);
  const [activeRules, setActiveRules] = useState<Record<string, BankMdrRule> | undefined>();
  const [debitConfig, setDebitConfig] = useState<DebitConfig | undefined>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize or pre-populate splits when modal opens
  useEffect(() => {
    if (!invoice || !isOpen) return;

    setSaveError(null);

    getMergedBankMdrRules().then(ruleRes => {
      setActiveRules(ruleRes.rules);
      setDebitConfig(ruleRes.debitConfig);

      // Check if there are already saved payment splits in other_remarks or meta
      let existingSplits: PaymentSplitRow[] | null = null;
      const remarks = invoice.meta?.other_remarks || '';
      if (remarks.startsWith('[PAYMENT_SPLITS]:')) {
        try {
          const jsonStr = remarks.replace('[PAYMENT_SPLITS]:', '').trim();
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            existingSplits = parsed;
          }
        } catch {}
      }

      // Target Gross Bill (Nominal transaksi riil yang digesek pada EDC / dibayar pelanggan di POS)
      const grossTarget = Math.round(
        (invoice.total_gross || 0) > 0
          ? (invoice.total_gross - (invoice.total_disc || 0))
          : (invoice.total_net || 0)
      );
      const netTarget = Math.round(invoice.total_net || 0);

      if (existingSplits && existingSplits.length > 0) {
        // If single row and amount equals netTarget while gross is available and different, auto-adjust to gross
        let adjustedSplits = existingSplits;
        if (existingSplits.length === 1 && existingSplits[0].amount === netTarget && grossTarget !== netTarget) {
          adjustedSplits = [{
            ...existingSplits[0],
            amount: grossTarget,
          }];
        }

        // Recompute MDRs in case rules updated
        const recomputed = adjustedSplits.map(s => {
          const res = computePaymentMdr(s, ruleRes.rules, ruleRes.debitConfig);
          return {
            ...s,
            mdrPct: res.mdrPct,
            cardComm: res.cardComm,
            processMethod: res.processMethod,
            warningNote: res.warningNote,
          };
        });
        setRows(recomputed);
      } else {
        // Default initial row matching invoice gross sales (nominal gesek EDC riil)
        const initialRow: PaymentSplitRow = {
          id: String(Date.now()),
          paymentType: 'Cash',
          edc: '--',
          installment: '--',
          bank: '--',
          cardType: '--',
          amount: grossTarget,
          mdrPct: 0.0,
          cardComm: 0,
          processMethod: 'EDC',
        };
        setRows([initialRow]);
      }
    });
  }, [invoice, isOpen]);

  // Calculations (Based on Gross Retail Bill)
  const targetInvoiceAmount = Math.round(
    (invoice?.total_gross || 0) > 0
      ? (invoice!.total_gross - (invoice!.total_disc || 0))
      : (invoice?.total_net || 0)
  );
  const totalPaid = useMemo(() => rows.reduce((s, r) => s + (r.amount || 0), 0), [rows]);
  const totalComm = useMemo(() => rows.reduce((s, r) => s + (r.cardComm || 0), 0), [rows]);
  const diff = totalPaid - targetInvoiceAmount;
  const isBalanced = diff === 0 && totalPaid > 0;
  const effectiveMdr = totalPaid > 0 ? (totalComm / totalPaid) * 100 : 0;

  if (!isOpen || !invoice) return null;

  const handleRowChange = (index: number, field: keyof PaymentSplitRow, value: any) => {
    setRows(prev => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: value };

      // Smart auto-clearing for non-card methods
      if (field === 'paymentType') {
        if (['Cash', 'Transfer', 'Deposit', 'Voucher', 'Rounding', '--'].includes(value)) {
          row.edc = '--';
          row.installment = '--';
          row.bank = '--';
          row.cardType = '--';
        } else if (value === 'Credit Card') {
          if (row.edc === '--') row.edc = 'BCA';
          if (row.bank === '--') row.bank = 'BCA';
          if (row.cardType === '--') row.cardType = 'VISA';
        } else if (value === 'Debit Card') {
          if (row.edc === '--') row.edc = 'BCA';
          row.installment = '--';
          if (row.bank === '--') row.bank = 'BCA';
        } else if (value === 'Link Payment') {
          row.edc = 'BCA';
          row.bank = 'BCA';
        } else if (value === 'QRIS') {
          if (row.edc === '--') row.edc = 'BCA';
          row.installment = '--';
          row.cardType = '--';
          if (row.bank === '--') row.bank = row.edc !== 'Other' ? (row.edc as BankOption) : 'BCA';
        }
      }

      if (field === 'edc' && row.paymentType === 'QRIS') {
        if (value !== '--' && value !== 'Other') {
          row.bank = value as BankOption;
        }
      }

      // Recompute MDR and Comm
      const res = computePaymentMdr(row, activeRules, debitConfig);
      row.mdrPct = res.mdrPct;
      row.cardComm = res.cardComm;
      row.processMethod = res.processMethod;
      row.warningNote = res.warningNote;

      copy[index] = row;
      return copy;
    });
  };

  const handleAddRow = () => {
    if (rows.length >= 10) return;
    const remaining = Math.max(0, targetInvoiceAmount - totalPaid);
    const newRow: PaymentSplitRow = {
      id: String(Date.now() + Math.random()),
      paymentType: 'Credit Card',
      edc: 'BCA',
      installment: '--',
      bank: 'BCA',
      cardType: 'VISA',
      amount: remaining,
      mdrPct: 0.017,
      cardComm: Math.round(remaining * 0.017),
      processMethod: 'EDC',
    };
    setRows(prev => [...prev, newRow]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    if (!isBalanced) return;
    setSaving(true);
    setSaveError(null);

    try {
      await saveInvoicePaymentSplits({
        transNo: invoice.trans_no,
        items: invoice.items,
        splits: rows,
        totalCardComm: totalComm,
        userEmail,
      });

      onSuccess(invoice.trans_no, totalComm);
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan rincian pembayaran.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl 2xl:max-w-7xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                <span>Rincian Pembayaran POS & Card Comm</span>
                <span className="font-mono text-emerald-400 font-extrabold">{invoice.trans_no}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                SOP Point of Sale (POS) & Smart MDR Rule Engine — Butik {invoice.location || 'Bvlgari'}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Context Banner */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <div>Customer: <strong className="text-slate-900">{invoice.customer || 'Walk-in Guest'}</strong></div>
            <div>Advisor: <strong className="text-slate-900">{invoice.salesman || '—'}</strong></div>
            <div>Jumlah Barang: <strong className="text-slate-900">{invoice.items.length} item ({invoice.total_qty} pcs)</strong></div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Tagihan (Gross): </span>
            <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
              Rp {formatCurrency(targetInvoiceAmount)}
            </span>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Net DPP: Rp {formatCurrency(Math.round(invoice.total_net || 0))} · PPN 11%: Rp {formatCurrency(Math.round(targetInvoiceAmount - (invoice.total_net || 0)))}
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Tabel Opsi Pembayaran (POS Split Payment)
              </h3>
              <p className="text-[11px] text-slate-500">
                Pilih kombinasi metode pembayaran sesuai struk fisik EDC. Sistem otomatis menentukan persentase MDR dan menghitung Card Comm.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddRow}
              disabled={rows.length >= 10 || saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris ({rows.length}/10)</span>
            </button>
          </div>

          {/* POS Style Table */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100/90 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Payment Type</th>
                  <th className="py-2.5 px-3 min-w-[100px]">EDC</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Installment</th>
                  <th className="py-2.5 px-3 min-w-[120px]">Bank</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Card Type</th>
                  <th className="py-2.5 px-3 text-right min-w-[150px]">Amount (IDR)</th>
                  <th className="py-2.5 px-3 text-center bg-emerald-50/70 text-emerald-950 border-l border-emerald-200 whitespace-nowrap min-w-[100px]">Auto MDR</th>
                  <th className="py-2.5 px-4 text-right bg-emerald-50/70 text-emerald-950 whitespace-nowrap min-w-[160px]">Card Comm (IDR)</th>
                  <th className="py-2.5 px-2 text-center w-8"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => {
                  const isNonCard = ['Cash', 'Transfer', 'Deposit', 'Voucher', 'Rounding', '--'].includes(row.paymentType);
                  const isDebit = row.paymentType === 'Debit Card';
                  const isQris = row.paymentType === 'QRIS';

                  return (
                    <React.Fragment key={row.id || idx}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        {/* Row Number */}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Payment Type */}
                        <td className="py-2.5 px-3">
                          <select
                            aria-label={`Payment Type row ${idx + 1}`}
                            value={row.paymentType}
                            onChange={e => handleRowChange(idx, 'paymentType', e.target.value as PaymentType)}
                            className="w-full min-w-[130px] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                          >
                            {PAYMENT_TYPES.map(pt => (
                              <option key={pt} value={pt}>{pt}</option>
                            ))}
                          </select>
                        </td>

                        {/* EDC */}
                        <td className="py-2.5 px-3">
                          <select
                            aria-label={`EDC row ${idx + 1}`}
                            disabled={isNonCard}
                            value={row.edc}
                            onChange={e => handleRowChange(idx, 'edc', e.target.value as EdcOption)}
                            className={cn(
                              "w-full min-w-[100px] text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer",
                              isNonCard && "opacity-40 bg-slate-100 cursor-not-allowed"
                            )}
                          >
                            {EDC_OPTIONS.map(edc => (
                              <option key={edc} value={edc}>{edc}</option>
                            ))}
                          </select>
                        </td>

                        {/* Installment */}
                        <td className="py-2.5 px-3">
                          <select
                            aria-label={`Installment row ${idx + 1}`}
                            disabled={isNonCard || isDebit || isQris}
                            value={isDebit || isQris ? '--' : row.installment}
                            onChange={e => handleRowChange(idx, 'installment', e.target.value as InstallmentOption)}
                            className={cn(
                              "w-full min-w-[110px] text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer",
                              (isNonCard || isDebit || isQris) && "opacity-40 bg-slate-100 cursor-not-allowed"
                            )}
                          >
                            {INSTALLMENT_OPTIONS.map(inst => (
                              <option key={inst} value={inst}>{inst}</option>
                            ))}
                          </select>
                        </td>

                        {/* Bank */}
                        <td className="py-2.5 px-3">
                          <select
                            aria-label={`Bank row ${idx + 1}`}
                            disabled={isNonCard}
                            value={row.bank}
                            onChange={e => handleRowChange(idx, 'bank', e.target.value as BankOption)}
                            className={cn(
                              "w-full min-w-[120px] text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer",
                              isNonCard && "opacity-40 bg-slate-100 cursor-not-allowed"
                            )}
                          >
                            {BANK_OPTIONS.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </td>

                        {/* Card Type */}
                        <td className="py-2.5 px-3">
                          <select
                            aria-label={`Card Type row ${idx + 1}`}
                            disabled={isNonCard || isQris}
                            value={isQris ? '--' : row.cardType}
                            onChange={e => handleRowChange(idx, 'cardType', e.target.value as CardTypeOption)}
                            className={cn(
                              "w-full min-w-[110px] text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer",
                              (isNonCard || isQris) && "opacity-40 bg-slate-100 cursor-not-allowed"
                            )}
                          >
                            {CARD_TYPES.map(ct => (
                              <option key={ct} value={ct}>{ct}</option>
                            ))}
                          </select>
                        </td>

                        {/* Amount IDR */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={row.amount || ''}
                            onChange={e => handleRowChange(idx, 'amount', Number(e.target.value || 0))}
                            placeholder="0"
                            className="w-full min-w-[150px] text-right font-mono font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                          />
                        </td>

                        {/* Auto MDR % */}
                        <td className="py-2.5 px-3 text-center font-mono font-extrabold text-emerald-950 bg-emerald-50/70 border-l border-emerald-200 min-w-[100px]">
                          {(row.mdrPct * 100).toFixed(2)}%
                        </td>

                        {/* Calculated Card Comm (IDR) */}
                        <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900 bg-emerald-50/70 min-w-[160px]">
                          Rp {formatCurrency(row.cardComm)}
                        </td>

                        {/* Remove Action */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            disabled={rows.length <= 1}
                            className="text-slate-300 hover:text-rose-600 disabled:opacity-20 disabled:hover:text-slate-300 transition-colors cursor-pointer"
                            title="Hapus baris pembayaran ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Warning & Instructions Row (if any) */}
                      {(row.warningNote || row.processMethod === 'MANUAL_FORM') && (
                        <tr className="bg-slate-50 text-[10px]">
                          <td colSpan={10} className="py-1 px-4 text-slate-600">
                            <div className="flex flex-wrap items-center gap-3">
                              {row.processMethod === 'MANUAL_FORM' && (
                                <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 border border-slate-300">
                                  <Info className="w-2.5 h-2.5" /> Butuh Form Manual ke Bank (Bukan EDC)
                                </span>
                              )}
                              {row.warningNote && (
                                <span className="inline-flex items-center gap-1 text-slate-600">
                                  <AlertTriangle className="w-3 h-3 text-slate-400" />
                                  {row.warningNote}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Balance & Financial Aggregation Box */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs w-full md:w-auto">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Total Tagihan (Gross)
                </div>
                <div className="text-sm font-mono font-extrabold text-slate-900 mt-0.5">
                  Rp {formatCurrency(targetInvoiceAmount)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Net DPP: Rp {formatCurrency(Math.round(invoice.total_net || 0))}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Total Terbayar (Payment)
                </div>
                <div className="text-sm font-mono font-extrabold text-slate-900 mt-0.5">
                  Rp {formatCurrency(totalPaid)}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Status Keseimbangan
                </div>
                <div className="mt-0.5">
                  {diff === 0 && totalPaid > 0 ? (
                    <span className="inline-flex items-center gap-1 font-bold text-xs text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Lunas & Seimbang</span>
                    </span>
                  ) : diff < 0 ? (
                    <span className="inline-flex items-center gap-1 font-bold text-xs text-rose-600">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <span>Kurang Rp {formatCurrency(Math.abs(diff))}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-xs text-slate-600">
                      <AlertTriangle className="w-4 h-4 text-slate-400" />
                      <span>Lebih Rp {formatCurrency(diff)}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Total Comm Output */}
            <div className="flex items-center gap-5 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0">
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Total Card Comm Terhitung
                </div>
                <div className="text-lg font-mono font-black text-emerald-800">
                  Rp {formatCurrency(totalComm)}
                </div>
                <div className="text-[10px] text-slate-500">
                  MDR Efektif: {effectiveMdr.toFixed(2)}%
                </div>
              </div>

              <button
                type="button"
                disabled={!isBalanced || saving}
                onClick={handleSubmit}
                className={cn(
                  "px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer",
                  isBalanced && !saving
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                )}
                title={!isBalanced ? "Jumlah pembayaran harus seimbang dengan total tagihan invoice" : "Simpan dan terapkan komisi ke item invoice"}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                <span>Set Payment & Simpan</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {saveError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <div>
            * Nilai komisi akan dibagikan secara proporsional ke {invoice.items.length} item pada nota ini.
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}

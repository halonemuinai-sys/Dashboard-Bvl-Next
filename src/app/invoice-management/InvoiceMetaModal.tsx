'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Save,
  Loader2,
  Check,
  Receipt,
  Tag,
  Wrench,
  ShieldCheck,
  FileEdit,
  Clock,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InvoiceHeader, InvoiceMeta, saveInvoiceMeta } from '@/services/dashboard/invoiceService';

interface Props {
  invoice: InvoiceHeader | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (transNo: string, updatedMeta: InvoiceMeta) => void;
  userEmail?: string;
}

const DISCOUNT_PRESETS = [
  'VIP Client Privilege',
  'Mall / Bank Partner Promo',
  'GM Special Approval',
  'Management Courtesy',
  'Minor Flaw / Display Defect',
  'Bundle Set Offer',
];

const AFTER_SALES_PRESETS = [
  'Free Ring Resizing',
  'Complimentary Polishing & Cleaning',
  'Custom Engraving Service',
  'Certificate Replacement',
  'Leather / Strap Care',
  'Free Maintenance Service',
];

export default function InvoiceMetaModal({
  invoice,
  isOpen,
  onClose,
  onSave,
  userEmail,
}: Props) {
  const [cashBillNo, setCashBillNo] = useState('');
  const [dwaNo, setDwaNo] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [afterSales, setAfterSales] = useState('');
  const [otherRemarks, setOtherRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (invoice && isOpen) {
      setCashBillNo(invoice.meta.cash_bill_no || '');
      setDwaNo(invoice.meta.dwa_no || '');
      setDiscountReason(invoice.meta.discount_given_reason || '');
      setAfterSales(invoice.meta.after_sales_support || '');
      setOtherRemarks(invoice.meta.other_remarks || '');
      setSavedSuccess(false);
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const handlePresetDiscount = (preset: string) => {
    if (!discountReason) {
      setDiscountReason(preset);
    } else if (!discountReason.includes(preset)) {
      setDiscountReason(prev => `${prev}; ${preset}`);
    }
  };

  const handlePresetAfterSales = (preset: string) => {
    if (!afterSales) {
      setAfterSales(preset);
    } else if (!afterSales.includes(preset)) {
      setAfterSales(prev => `${prev}; ${preset}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await saveInvoiceMeta(
        invoice.trans_no,
        {
          cash_bill_no: cashBillNo.trim(),
          dwa_no: dwaNo.trim(),
          discount_given_reason: discountReason.trim(),
          after_sales_support: afterSales.trim(),
          other_remarks: otherRemarks.trim(),
        },
        userEmail
      );
      onSave(invoice.trans_no, updated);
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save invoice meta:', err);
      alert('Gagal menyimpan data penunjang faktur.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 transition-all"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:px-7 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Kelola Data Penunjang Faktur</h3>
                <span className="text-[11px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {invoice.trans_no}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {invoice.customer} · {invoice.salesman} · {invoice.location}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          
          {/* Section 1: Kasir & Referensi Dokumen */}
          <div className="bg-slate-50/60 border border-slate-200/70 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              Dokumen Kasir & Referensi
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  No Cash Bill (CB)
                </label>
                <input
                  type="text"
                  value={cashBillNo}
                  onChange={e => setCashBillNo(e.target.value)}
                  placeholder="Contoh: CB-2609-081"
                  className="w-full text-xs font-mono font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  DWA Ref / No.
                </label>
                <input
                  type="text"
                  value={dwaNo}
                  onChange={e => setDwaNo(e.target.value)}
                  placeholder="Contoh: DWA-042/2026 atau No Approval"
                  className="w-full text-xs font-mono font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Alasan Diskon (Discount Given Reason) */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              Discount Given Reason (Alasan Pemberian Diskon)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {DISCOUNT_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetDiscount(preset)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={discountReason}
              onChange={e => setDiscountReason(e.target.value)}
              placeholder="Tulis alasan diskon atau klik tombol preset di atas..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
            />
          </div>

          {/* Section 3: After Sales Support */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              After Sales Support (Layanan Purna Jual)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {AFTER_SALES_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetAfterSales(preset)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={afterSales}
              onChange={e => setAfterSales(e.target.value)}
              placeholder="Contoh: Free resizing cincin ukuran 52, polishing gratis..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-none"
            />
          </div>

          {/* Section 4: Other Remarks */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <FileEdit className="w-3.5 h-3.5 text-slate-500" />
              Other Remarks / Catatan Khusus
            </label>
            <textarea
              rows={2}
              value={otherRemarks}
              onChange={e => setOtherRemarks(e.target.value)}
              placeholder="Catatan tambahan internal transaksi ini..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
            />
          </div>

          {/* Audit Stamping Info */}
          {invoice.meta.updated_at && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-3">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                Diperbarui oleh: {invoice.meta.updated_by || 'system'}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                {new Date(invoice.meta.updated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
              </span>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || savedSuccess}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm",
                savedSuccess
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Tersimpan!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Simpan Data Penunjang
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

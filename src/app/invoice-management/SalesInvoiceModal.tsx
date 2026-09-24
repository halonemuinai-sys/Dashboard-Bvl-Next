'use client';

import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Copy,
  Check,
  Building2,
  Calendar,
  User,
  Receipt,
  Sparkles,
  ShieldCheck,
  Tag,
  Phone
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { InvoiceHeader } from '@/services/dashboard/invoiceService';

interface Props {
  invoice: InvoiceHeader | null;
  isOpen: boolean;
  onClose: () => void;
}

const STORE_INFO: Record<string, { title: string; subtitle: string; address: string[]; phone: string }> = {
  'Plaza Indonesia': {
    title: 'BVLGARI BOUTIQUE',
    subtitle: 'Plaza Indonesia',
    address: [
      'Plaza Indonesia Shopping Center, Level 1 #144-147',
      'Jl. M.H. Thamrin Kav. 28-30, Menteng',
      'Jakarta Pusat 10350, Indonesia',
    ],
    phone: '+62 21 310 7770',
  },
  'Plaza Senayan': {
    title: 'BVLGARI BOUTIQUE',
    subtitle: 'Plaza Senayan',
    address: [
      'Plaza Senayan, Level 1 #127-129',
      'Jl. Asia Afrika No. 8, Gelora, Tanah Abang',
      'Jakarta Pusat 10270, Indonesia',
    ],
    phone: '+62 21 572 5288',
  },
  'Bali': {
    title: 'BVLGARI BOUTIQUE',
    subtitle: 'Bali Boutique',
    address: [
      'BVLGARI Resort Bali',
      'Jl. Goa Lempeh, Banjar Dinas Kangin, Uluwatu',
      'Kabupaten Badung, Bali 80364, Indonesia',
    ],
    phone: '+62 361 847 1000',
  },
  'Head Office': {
    title: 'BVLGARI INDONESIA',
    subtitle: 'Head Office',
    address: [
      'PT Mogems Putri Mandiri / MRA Group',
      'Wisma 46 Kota BNI, Jl. Jend. Sudirman Kav. 1',
      'Jakarta 10220, Indonesia',
    ],
    phone: '+62 21 574 5888',
  },
};

const formatDateLong = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export default function SalesInvoiceModal({ invoice, isOpen, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !invoice) return null;

  const store = STORE_INFO[invoice.location] || STORE_INFO['Plaza Indonesia'];

  // Look for any customer phone in items
  const clientPhone = invoice.items.find(i => i.phone_no)?.phone_no || '';

  // Calculation for Tax (PPN 11% inclusive standard in Indonesian luxury retail)
  const dpp = Math.round(invoice.total_net / 1.11);
  const ppn = invoice.total_net - dpp;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyNo = () => {
    navigator.clipboard.writeText(invoice.trans_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Print-specific style */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #bvlgari-sales-invoice-modal,
          #bvlgari-sales-invoice-modal * {
            visibility: visible;
          }
          #bvlgari-sales-invoice-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .no-print-area {
            display: none !important;
          }
        }
      `}</style>

      <div
        id="bvlgari-sales-invoice-modal"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]"
      >
        {/* Top Control Bar (Screen Only) */}
        <div className="no-print-area px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold tracking-wide flex items-center gap-2">
                <span>Preview Faktur Penjualan</span>
                <span className="font-mono text-amber-400 font-extrabold">{invoice.trans_no}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Official BVLGARI Luxury Sales Invoice
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyNo}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Salin Nomor Transaksi"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin No'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="overflow-y-auto p-6 sm:p-10 space-y-6 bg-white text-slate-800 text-xs">
          
          {/* Header Brand */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-[0.3em] text-slate-950 uppercase">
                  BVLGARI
                </h1>
                <div className="text-[11px] tracking-[0.4em] font-serif text-slate-600 mt-0.5 uppercase">
                  ROMA
                </div>
                <div className="mt-2 text-[11px] text-slate-600 space-y-0.5">
                  <div className="font-bold text-slate-900">{store.title} — {store.subtitle}</div>
                  {store.address.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                  <div>Tel: {store.phone}</div>
                </div>
              </div>

              <div className="text-left sm:text-right flex flex-col sm:items-end justify-between">
                <div className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono text-[11px] tracking-widest font-bold uppercase mb-2">
                  SALES INVOICE
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div>Status: <span className="font-bold text-emerald-700 uppercase">Paid / Completed</span></div>
                  <div>Dokumen Resmi Penjualan Butik</div>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
            {/* Invoice Info */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Informasi Faktur
              </div>
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="py-1 text-slate-500 w-32 font-medium">No. Invoice:</td>
                    <td className="py-1 font-mono font-bold text-slate-900">{invoice.trans_no}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500 font-medium">No. Cash Bill (CB):</td>
                    <td className="py-1 font-mono font-bold text-emerald-800">
                      {invoice.meta.cash_bill_no || '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500 font-medium">Tanggal Transaksi:</td>
                    <td className="py-1 font-semibold text-slate-800">{formatDateLong(invoice.transaction_date)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500 font-medium">Lokasi Boutique:</td>
                    <td className="py-1 font-bold text-slate-900">{invoice.location || '—'}</td>
                  </tr>
                  {invoice.meta.dwa_no && (
                    <tr>
                      <td className="py-1 text-slate-500 font-medium">No. Approval DWA:</td>
                      <td className="py-1 font-mono font-bold text-purple-700">{invoice.meta.dwa_no}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Customer & Advisor Info */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Informasi Pelanggan & Advisor
              </div>
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="py-1 text-slate-500 w-32 font-medium">Nama Customer:</td>
                    <td className="py-1 font-bold text-slate-900">{invoice.customer || 'Walk-in Guest'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500 font-medium">No. Kontak / Phone:</td>
                    <td className="py-1 font-mono text-slate-700">{clientPhone || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500 font-medium">Sales Advisor:</td>
                    <td className="py-1 font-bold text-slate-900">{invoice.salesman || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500 font-medium">Mata Uang:</td>
                    <td className="py-1 font-semibold text-slate-800">IDR (Indonesian Rupiah)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Rincian Barang / Purchased Items</span>
              <span>{invoice.items.length} Barang ({invoice.total_qty} pcs)</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3">Kode SAP / Catalogue</th>
                    <th className="py-2.5 px-3">Kategori & Koleksi</th>
                    <th className="py-2.5 px-2 text-center w-12">Qty</th>
                    <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                    <th className="py-2.5 px-3 text-right">Diskon</th>
                    <th className="py-2.5 px-3 text-right">Subtotal Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => {
                    const unitPrice = item.qty > 0 ? Math.round(item.gross_sales / item.qty) : item.gross_sales;
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-900">{item.sap_code}</div>
                          {item.catalogue_code && item.catalogue_code !== item.sap_code && (
                            <div className="text-[10px] text-slate-500 font-mono">{item.catalogue_code}</div>
                          )}
                          {item.type && (
                            <span className={cn(
                              "inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded border",
                              item.type === 'SMI' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-600 border-slate-200"
                            )}>
                              {item.type}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{item.main_category || '—'}</div>
                          <div className="text-[10px] text-slate-500">{item.collection || '—'}</div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-800">
                          {item.qty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          Rp {formatCurrency(unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {item.val_disc > 0 ? (
                            <div>
                              <div className="text-rose-600 font-bold">-Rp {formatCurrency(item.val_disc)}</div>
                              {item.disc_pct > 0 && (
                                <div className="text-[10px] text-rose-500">({item.disc_pct}%)</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          Rp {formatCurrency(item.net_sales)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary & Remarks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Supporting Remarks / Notes */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Catatan Penjualan & Layanan
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-600">Alasan Diskon: </span>
                  <span className="text-slate-800">
                    {invoice.meta.discount_given_reason || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Layanan After Sales: </span>
                  <span className="text-slate-800">
                    {invoice.meta.after_sales_support || 'Standar Garansi Resmi Bvlgari'}
                  </span>
                </div>
                {invoice.meta.other_remarks && (
                  <div>
                    <span className="font-semibold text-slate-600">Catatan Lain: </span>
                    <span className="text-slate-800">{invoice.meta.other_remarks}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Calculations Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Subtotal Bruto (Gross):</span>
                <span className="font-mono">Rp {formatCurrency(invoice.total_gross)}</span>
              </div>
              {invoice.total_disc > 0 && (
                <div className="flex justify-between py-1 text-rose-600 font-medium">
                  <span>Total Potongan Diskon:</span>
                  <span className="font-mono">-Rp {formatCurrency(invoice.total_disc)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-t border-slate-200 text-slate-600">
                <span>Dasar Pengenaan Pajak (DPP):</span>
                <span className="font-mono">Rp {formatCurrency(dpp)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>PPN 11% (Termasuk):</span>
                <span className="font-mono">Rp {formatCurrency(ppn)}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-slate-900 text-slate-900 font-extrabold text-sm sm:text-base">
                <span>GRAND TOTAL:</span>
                <span className="font-mono text-blue-900">Rp {formatCurrency(invoice.total_net)}</span>
              </div>
            </div>
          </div>

          {/* Footer Terms & Signatures */}
          <div className="border-t border-slate-200 pt-6 space-y-8">
            <div className="text-[10px] text-slate-500 leading-relaxed italic text-center sm:text-left">
              * Terima kasih atas kunjungan dan kepercayaan Anda berbelanja di BVLGARI.
              Barang yang sudah dibeli telah melalui proses inspeksi kualitas tertinggi dan disertai sertifikat keaslian resmi BVLGARI.
            </div>

            {/* Signature Columns */}
            <div className="grid grid-cols-3 gap-4 text-center pt-2">
              <div>
                <div className="text-[11px] font-bold text-slate-600 mb-14">Customer / Pelanggan</div>
                <div className="border-t border-dashed border-slate-400 mx-auto w-3/4 pt-1 text-[10px] text-slate-500 font-medium">
                  ({invoice.customer || 'Tanda Tangan Pelanggan'})
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-600 mb-14">Sales Advisor</div>
                <div className="border-t border-dashed border-slate-400 mx-auto w-3/4 pt-1 text-[10px] text-slate-500 font-medium">
                  ({invoice.salesman || 'Sales Advisor'})
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-600 mb-14">Store Manager / Kasir</div>
                <div className="border-t border-dashed border-slate-400 mx-auto w-3/4 pt-1 text-[10px] text-slate-500 font-medium">
                  (Official Store Verification)
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer (Screen Only) */}
        <div className="no-print-area px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Tekan <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] font-bold">Esc</kbd> untuk menutup
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Faktur Penjualan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, FileText, Copy, Check, Building2, UserRound, CreditCard, FileEdit, Package, Link2, ArrowUpRight } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { InvoiceHeader, InvoiceMeta } from '@/services/dashboard/invoiceService';
import { extractPaymentAndVerification } from '@/services/dashboard/paymentEngine';
import { supabase } from '@/lib/supabase';
import { useUserAccess } from '@/lib/user-access-context';
import InvoicePaymentSection from './components/InvoicePaymentSection';
import PosPaymentModal from './PosPaymentModal';
import InvoiceMetaModal from './InvoiceMetaModal';

interface Props {
  invoice: InvoiceHeader | null;
  isOpen: boolean;
  onClose: () => void;
  onInvoiceUpdated?: (updatedTransNo: string, newTotalComm: number) => void;
  onMetaSaved?: (transNo: string, updatedMeta: InvoiceMeta) => void;
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
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export default function SalesInvoiceModal({ invoice, isOpen, onClose, onInvoiceUpdated, onMetaSaved }: Props) {
  const [copied, setCopied] = useState(false);
  const [invoiceOverride, setInvoiceOverride] = useState<{ source: InvoiceHeader | null; value: InvoiceHeader } | null>(null);
  const activeInvoice = invoiceOverride?.source === invoice ? invoiceOverride.value : invoice;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copyError, setCopyError] = useState(false);
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const { userEmail } = useUserAccess();

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previousFocus?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isPosModalOpen || isMetaModalOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Tab') {
        const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
        ) || []).filter(element => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!dialogRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isPosModalOpen, isMetaModalOpen, onClose]);

  if (!isOpen || !activeInvoice) return null;

  const store = STORE_INFO[activeInvoice.location] || STORE_INFO['Plaza Indonesia'];

  // Look for any customer phone in items
  const clientPhone = activeInvoice.items.find(i => i.phone_no)?.phone_no || '';

  // Calculation for Tax (PPN 11% inclusive standard in Indonesian luxury retail)
  const dpp = Math.round(activeInvoice.total_net / 1.11);
  const ppn = activeInvoice.total_net - dpp;

  // Extract payment splits and clean user notes
  const rawRemarks = activeInvoice.meta?.other_remarks || '';
  const { splits } = extractPaymentAndVerification(rawRemarks);
  const userNote = rawRemarks
    ? rawRemarks.split('[PAYMENT_SPLITS]:')[0].split('[FINANCE_VERIFY]:')[0].trim()
    : '';

  const handlePrint = () => {
    window.print();
  };

  const handleCopyNo = async () => {
    try {
      await navigator.clipboard.writeText(activeInvoice.trans_no);
      setCopyError(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };

  const handlePosSuccess = async (transNo: string, newTotalComm: number) => {
    try {
      const { data: metaRow } = await supabase
        .from('transaction_records_meta')
        .select('*')
        .eq('trans_no', transNo)
        .maybeSingle();

      if (metaRow && activeInvoice) {
        setInvoiceOverride({ source: invoice, value: {
          ...activeInvoice,
          total_comm: newTotalComm,
          meta: {
            ...activeInvoice.meta,
            other_remarks: metaRow.other_remarks,
          },
        } });
      }
    } catch {}

    if (onInvoiceUpdated) {
      onInvoiceUpdated(transNo, newTotalComm);
    }
  };

  const handleMetaSaved = (transNo: string, updatedMeta: InvoiceMeta) => {
    setInvoiceOverride({ source: invoice, value: { ...activeInvoice, meta: updatedMeta } });
    onMetaSaved?.(transNo, updatedMeta);
  };

  const hasPayments = Boolean(splits?.length);
  const actionClass = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer';
  const detailClass = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-4 py-2.5';
  const labelClass = 'text-slate-500';
  const valueClass = 'min-w-0 break-words text-right font-semibold text-slate-800';

  return (
    <div id="invoice-preview-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-md sm:p-5"
      onClick={event => { if (event.target === event.currentTarget && !isPosModalOpen && !isMetaModalOpen) onClose(); }}>
      <style jsx global>{`
        #bvlgari-sales-invoice-modal button:focus-visible { outline: 2px solid #0d9488; outline-offset: 3px; }
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden; }
          #bvlgari-sales-invoice-modal, #bvlgari-sales-invoice-modal * { visibility: visible; }
          #invoice-preview-overlay {
            position: absolute !important; inset: 0 auto auto 0 !important; display: block !important;
            width: 100% !important; height: auto !important; padding: 0 !important;
            background: white !important; backdrop-filter: none !important; overflow: visible !important;
          }
          #bvlgari-sales-invoice-modal {
            display: block !important; width: 100% !important; max-width: none !important;
            height: auto !important; max-height: none !important; overflow: visible !important;
            margin: 0 !important; border: 0 !important; border-radius: 0 !important;
            box-shadow: none !important; background: white !important;
          }
          #bvlgari-sales-invoice-modal .invoice-scroll, #bvlgari-sales-invoice-modal .invoice-paper {
            display: block !important; overflow: visible !important; padding: 0 !important;
            margin: 0 !important; border: 0 !important; border-radius: 0 !important;
            box-shadow: none !important; background: white !important;
          }
          #bvlgari-sales-invoice-modal .invoice-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          #bvlgari-sales-invoice-modal .invoice-brand { flex-direction: row; }
          #bvlgari-sales-invoice-modal .invoice-table-scroll { overflow: visible !important; }
          #bvlgari-sales-invoice-modal table { min-width: 0 !important; font-size: 9px; }
          #bvlgari-sales-invoice-modal th, #bvlgari-sales-invoice-modal td { padding: 7px 5px; }
          #bvlgari-sales-invoice-modal thead { display: table-header-group; }
          #bvlgari-sales-invoice-modal tr, #bvlgari-sales-invoice-modal .invoice-keep { break-inside: avoid; }
          #bvlgari-sales-invoice-modal .invoice-total { background: #f0fdfa !important; color: #0f172a !important; }
          #bvlgari-sales-invoice-modal .invoice-total * { color: #0f172a !important; }
          #bvlgari-sales-invoice-modal .no-print-area { display: none !important; }
        }
      `}</style>

      <div ref={dialogRef} id="bvlgari-sales-invoice-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-preview-title"
        className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-slate-100 shadow-2xl">
        <header className="no-print-area shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-700"><FileText className="h-5 w-5" /></span>
              <div className="min-w-0"><h2 id="invoice-preview-title" className="text-base font-bold tracking-tight text-slate-900">Sales invoice</h2><p className="mt-0.5 break-all font-mono text-xs text-slate-500">{activeInvoice.trans_no}</p></div>
            </div>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close invoice preview" className="cursor-pointer rounded-xl border border-slate-200 p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setIsMetaModalOpen(true)} className={cn(actionClass, 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}><FileEdit className="h-4 w-4 text-indigo-500" /> Invoice details</button>
            <button type="button" onClick={() => setIsPosModalOpen(true)} className={cn(actionClass, 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100')}><CreditCard className="h-4 w-4" /> {hasPayments ? 'Edit POS payments' : 'Add POS payment'}</button>
            <button type="button" onClick={handleCopyNo} className={cn(actionClass, 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
              {copied ? <Check className="h-4 w-4 text-teal-600" /> : <Copy className="h-4 w-4" />}<span aria-live="polite">{copied ? 'Copied' : 'Copy number'}</span>
            </button>
            <button type="button" onClick={handlePrint} className={cn(actionClass, 'border-slate-900 bg-slate-900 text-white hover:border-teal-800 hover:bg-teal-800 sm:ml-auto')}><Printer className="h-4 w-4" /> Print invoice <ArrowUpRight className="h-3.5 w-3.5 text-teal-300" /></button>
          </div>
          {copyError && <p role="status" className="mt-2 text-xs text-amber-700">Unable to copy. Select the invoice number above to copy it manually.</p>}
        </header>

        <div className="invoice-scroll min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6">
          <article className="invoice-paper space-y-7 rounded-2xl border border-slate-200/80 bg-white p-5 text-xs text-slate-700 shadow-sm sm:p-8">
            <div className="invoice-brand invoice-keep flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 sm:flex-row">
              <div>
                <h1 className="font-serif text-3xl font-semibold tracking-[0.24em] text-slate-950 sm:text-4xl">BVLGARI</h1>
                <div className="mt-1 font-serif text-[10px] tracking-[0.5em] text-slate-500">ROMA</div>
                <div className="mt-5 space-y-1 text-[11px] leading-relaxed text-slate-500">
                  <div className="mb-2 font-semibold text-slate-800">{store.title} / {store.subtitle}</div>
                  {store.address.map(line => <div key={line}>{line}</div>)}<div>Tel. {store.phone}</div>
                </div>
              </div>
              <div className="sm:text-right">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600"><FileText className="h-3.5 w-3.5" /> Sales invoice</span>
                <p className="mt-4 break-all font-mono text-base font-bold text-slate-900">{activeInvoice.trans_no}</p>
                <p className="mt-1.5 text-slate-500">{formatDateLong(activeInvoice.transaction_date)}</p>
                <span className={cn('mt-4 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold', hasPayments ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-amber-200 bg-amber-50 text-amber-800')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', hasPayments ? 'bg-teal-500' : 'bg-amber-500')} />{hasPayments ? 'POS payments recorded' : 'POS details pending'}
                </span>
              </div>
            </div>

            <div className="invoice-grid grid gap-4 md:grid-cols-2">
              <section className="invoice-keep rounded-2xl border border-slate-200 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-800"><Building2 className="h-4 w-4 text-blue-600" /> Invoice information</h3>
                <dl className="divide-y divide-slate-100">
                  <div className={detailClass}>
                    <dt className={labelClass}>Cash bill number</dt>
                    <dd className={valueClass}>
                      <button
                        type="button"
                        onClick={() => setIsMetaModalOpen(true)}
                        title="Update cash bill number"
                        aria-label={activeInvoice.meta.cash_bill_no ? 'Edit cash bill ' + activeInvoice.meta.cash_bill_no : 'Add cash bill number'}
                        className="no-print-area inline-flex max-w-full cursor-pointer items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-teal-800 transition-colors hover:border-teal-400 hover:bg-teal-100"
                      >
                        <span className="break-all font-mono">{activeInvoice.meta.cash_bill_no || 'Add cash bill'}</span>
                        <FileEdit className="h-3.5 w-3.5 shrink-0" />
                      </button>
                      <span className="hidden font-mono print:inline">{activeInvoice.meta.cash_bill_no || '\u2014'}</span>
                    </dd>
                  </div>
                  <div className={detailClass}><dt className={labelClass}>Transaction date</dt><dd className={valueClass}>{formatDateLong(activeInvoice.transaction_date)}</dd></div>
                  <div className={detailClass}><dt className={labelClass}>Boutique</dt><dd className={valueClass}>{activeInvoice.location || '\u2014'}</dd></div>
                  <div className={detailClass}><dt className={labelClass}>Currency</dt><dd className={valueClass}>IDR <span className="font-normal text-slate-500">&middot; Indonesian Rupiah</span></dd></div>
                </dl>
              </section>
              <section className="invoice-keep rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-800"><UserRound className="h-4 w-4 text-indigo-500" /> Customer & advisor</h3>
                <dl className="divide-y divide-indigo-100/60">
                  <div className={detailClass}><dt className={labelClass}>Customer</dt><dd className={valueClass}>{activeInvoice.customer || 'Walk-in Guest'}</dd></div>
                  <div className={detailClass}><dt className={labelClass}>Phone number</dt><dd className={valueClass}>{clientPhone || '\u2014'}</dd></div>
                  <div className={detailClass}><dt className={labelClass}>Customer advisor</dt><dd className={valueClass}>{activeInvoice.salesman || '\u2014'}</dd></div>
                  <div className={detailClass}><dt className={labelClass}>Served by</dt><dd className={valueClass}>{activeInvoice.meta.served_by || '\u2014'}<button type="button" onClick={() => setIsMetaModalOpen(true)} className="no-print-area ml-2 cursor-pointer rounded text-[10px] font-semibold text-indigo-600 hover:underline">{activeInvoice.meta.served_by ? 'Edit' : 'Add'}</button></dd></div>
                </dl>
              </section>
            </div>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-800"><Package className="h-4 w-4 text-blue-600" /> Purchased items</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{activeInvoice.items.length} items &middot; {activeInvoice.total_qty} pcs</span>
              </div>
              <div className="invoice-table-scroll overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr><th className="px-3 py-3 text-center">#</th><th className="px-3 py-3">SAP / Catalogue</th><th className="px-3 py-3">Category / Collection</th><th className="px-3 py-3 text-center">Qty</th><th className="px-3 py-3 text-right">Unit price</th><th className="px-3 py-3 text-right">Discount</th><th className="bg-teal-50/60 px-3 py-3 text-right text-teal-800">Net subtotal</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeInvoice.items.map((item, index) => {
                      const unitPrice = item.qty > 0 ? Math.round(item.gross_sales / item.qty) : item.gross_sales;
                      return (
                        <tr key={item.id || index} className="hover:bg-slate-50/50">
                          <td className="px-3 py-4 text-center text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                          <td className="px-3 py-4">
                            <div className="font-mono font-semibold text-slate-900">{item.sap_code}</div>
                            {item.catalogue_code && item.catalogue_code !== item.sap_code && <div className="mt-1 font-mono text-[10px] text-slate-500">{item.catalogue_code}</div>}
                            {item.type && <span className={cn('mt-2 inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-semibold', item.type === 'SMI' ? 'border-violet-100 bg-violet-50 text-violet-700' : 'border-teal-100 bg-teal-50 text-teal-700')}>{item.type}</span>}
                          </td>
                          <td className="px-3 py-4"><div className="font-medium text-slate-800">{item.main_category || '\u2014'}</div><div className="mt-1 text-[10px] text-slate-500">{item.collection || '\u2014'}</div></td>
                          <td className="px-3 py-4 text-center font-semibold tabular-nums">{item.qty}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-right tabular-nums">Rp {formatCurrency(unitPrice)}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-right tabular-nums">
                            {item.val_disc > 0 ? <><div className="font-medium text-rose-600">-Rp {formatCurrency(item.val_disc)}</div>{item.disc_pct > 0 && <div className="mt-1 text-[10px] text-rose-500">{item.disc_pct}%</div>}</> : <span className="text-slate-400">&mdash;</span>}
                          </td>
                          <td className="whitespace-nowrap bg-teal-50/30 px-3 py-4 text-right font-bold tabular-nums text-slate-900">Rp {formatCurrency(item.net_sales)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="invoice-grid grid items-start gap-5 md:grid-cols-2">
              <section className="invoice-keep rounded-2xl border border-slate-200 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-800"><FileEdit className="h-4 w-4 text-indigo-500" /> Supporting details</h3>
                  <button type="button" onClick={() => setIsMetaModalOpen(true)} className="no-print-area cursor-pointer rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100">Edit details</button>
                </div>
                <dl className="divide-y divide-slate-100">
                  <div className={detailClass}><dt className={labelClass}>Entitled advisor</dt><dd className={valueClass}>{activeInvoice.meta.entitle || '\u2014'}</dd></div>
                  <div className={detailClass}><dt className={labelClass}>DWA approval no.</dt><dd className={cn(valueClass, 'font-mono')}>{activeInvoice.meta.dwa_no || '\u2014'}</dd></div>
                  <div className={detailClass}><dt className={labelClass}>Discount reason</dt><dd className={valueClass}>{activeInvoice.meta.discount_given_reason || '\u2014'}</dd></div>
                  <div className={detailClass}><dt className={labelClass}>After-sales support</dt><dd className={valueClass}>{activeInvoice.meta.after_sales_support || 'Standard Bvlgari warranty'}</dd></div>
                  <div className={detailClass}><dt className={labelClass}>Notes</dt><dd className={cn(valueClass, 'whitespace-pre-line font-normal')}>{userNote || '\u2014'}</dd></div>
                </dl>
                {activeInvoice.meta.updated_by && <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] leading-relaxed text-slate-400">Updated by {activeInvoice.meta.updated_by}{activeInvoice.meta.updated_at && <> &middot; {new Date(activeInvoice.meta.updated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</>}</p>}
              </section>
              <section className="invoice-keep overflow-hidden rounded-2xl border border-slate-200">
                <div className="space-y-4 p-5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Invoice summary</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">Gross subtotal</dt><dd className="whitespace-nowrap font-medium tabular-nums">Rp {formatCurrency(activeInvoice.total_gross)}</dd></div>
                    {activeInvoice.total_disc > 0 && <div className="flex justify-between gap-4 text-rose-600"><dt>Discount</dt><dd className="whitespace-nowrap font-medium tabular-nums">-Rp {formatCurrency(activeInvoice.total_disc)}</dd></div>}
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-3"><dt className="text-slate-500">Tax base (DPP)</dt><dd className="whitespace-nowrap font-medium tabular-nums">Rp {formatCurrency(dpp)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-500">VAT 11% (included)</dt><dd className="whitespace-nowrap font-medium tabular-nums">Rp {formatCurrency(ppn)}</dd></div>
                  </dl>
                </div>
                <div className="invoice-total border-t border-teal-800 bg-linear-to-br from-slate-900 to-teal-950 p-5 text-white">
                  <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-200">Grand total</span><span className="rounded border border-white/20 px-1.5 py-0.5 text-[9px] text-teal-100">IDR</span></div>
                  <p className="mt-2 break-words text-2xl font-bold tracking-tight tabular-nums">Rp {formatCurrency(activeInvoice.total_net)}</p>
                  <p className="mt-2 text-[10px] text-slate-300">Including VAT &middot; Indonesian Rupiah</p>
                </div>
              </section>
            </div>

            {Boolean(activeInvoice.depositLinks?.length) && (
              <section className="invoice-keep rounded-2xl border border-teal-200 bg-teal-50/50 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-teal-900"><Link2 className="h-4 w-4" /> Applied down payments</h3>
                {activeInvoice.depositLinks?.map(dp => <div key={dp.transNo} className="flex flex-wrap justify-between gap-2 py-1.5"><span className="break-all font-mono text-teal-900">{dp.transNo}</span><span className="font-semibold tabular-nums">Rp {formatCurrency(dp.amount)}</span></div>)}
                <p className="mt-3 text-[10px] text-slate-500">DP settlement references. Payment totals are shown in the breakdown below.</p>
              </section>
            )}
            <InvoicePaymentSection invoice={activeInvoice} splits={splits} onOpenPosPayment={() => setIsPosModalOpen(true)} />
            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4 text-[9px] uppercase tracking-wider text-slate-400"><span>BVLGARI &middot; {store.subtitle}</span><span>Sales invoice &middot; IDR</span></div>
          </article>
        </div>

        <footer className="no-print-area flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <p className="text-[10px] text-slate-400">BVLGARI Intelligence <span className="mx-1 text-slate-300">/</span> Aris Setiyono</p>
          <div className="flex items-center gap-4">
            <span className="hidden text-[10px] text-slate-400 sm:inline">Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono">Esc</kbd> to close</span>
            <button type="button" onClick={onClose} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Close preview</button>
          </div>
        </footer>
      </div>
      {isPosModalOpen && <PosPaymentModal invoice={activeInvoice} isOpen={isPosModalOpen} onClose={() => setIsPosModalOpen(false)} onSuccess={handlePosSuccess} userEmail={userEmail} />}
      <InvoiceMetaModal invoice={activeInvoice} isOpen={isMetaModalOpen} onClose={() => setIsMetaModalOpen(false)} onSave={handleMetaSaved} userEmail={userEmail} />
    </div>
  );
}

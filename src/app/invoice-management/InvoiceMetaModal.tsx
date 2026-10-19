'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Save, Loader2, Tag, Wrench, FileEdit, Clock, Users, Building2, AlertCircle, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  InvoiceHeader, InvoiceMeta, EntitleAdvisor, saveInvoiceMeta, getEntitleAdvisors,
} from '@/services/dashboard/invoiceService';

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

export default function InvoiceMetaModal({ invoice, isOpen, ...props }: Props) {
  if (!isOpen || !invoice) return null;
  return <InvoiceDetailsEditor key={invoice.trans_no} invoice={invoice} {...props} />;
}

function InvoiceDetailsEditor({
  invoice, onClose, onSave, userEmail,
}: Omit<Props, 'invoice' | 'isOpen'> & { invoice: InvoiceHeader }) {
  // Keep payment and finance blocks separate from the editable note.
  const raw = invoice.meta.other_remarks || '';
  const markerIndex = [raw.indexOf('[PAYMENT_SPLITS]:'), raw.indexOf('[FINANCE_VERIFY]:')]
    .filter(index => index >= 0)
    .reduce((min, index) => Math.min(min, index), raw.length);
  const [systemSuffix] = useState(() => raw.slice(markerIndex).trim());
  const [cashBillNo, setCashBillNo] = useState(invoice.meta.cash_bill_no || '');
  const [dwaNo, setDwaNo] = useState(invoice.meta.dwa_no || '');
  const [discountReason, setDiscountReason] = useState(invoice.meta.discount_given_reason || '');
  const [afterSales, setAfterSales] = useState(invoice.meta.after_sales_support || '');
  const [otherRemarks, setOtherRemarks] = useState(() => raw.slice(0, markerIndex).trim());
  const [entitle, setEntitle] = useState(invoice.meta.entitle || '');
  const [servedBy, setServedBy] = useState(invoice.meta.served_by || '');
  const [advisors, setAdvisors] = useState<EntitleAdvisor[]>([]);
  const [advisorsLoading, setAdvisorsLoading] = useState(true);
  const [advisorsError, setAdvisorsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const savingRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cashBillRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getEntitleAdvisors()
      .then(data => { if (!cancelled) setAdvisors(data); })
      .catch(() => { if (!cancelled) setAdvisorsError(true); })
      .finally(() => { if (!cancelled) setAdvisorsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    cashBillRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!savingRef.current) onClose();
      }
      if (event.key === 'Tab') {
        const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'
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
  }, [onClose]);

  const advisorGroups = advisors.reduce<Record<string, string[]>>((groups, advisor) => {
    (groups[advisor.home_location || 'Other'] ||= []).push(advisor.name);
    return groups;
  }, {});

  const addPreset = (value: string, preset: string, set: React.Dispatch<React.SetStateAction<string>>) => {
    if (!value.includes(preset)) set(value ? value + '; ' + preset : preset);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await saveInvoiceMeta(invoice.trans_no, {
        cash_bill_no: cashBillNo.trim(),
        dwa_no: dwaNo.trim(),
        discount_given_reason: discountReason.trim(),
        after_sales_support: afterSales.trim(),
        other_remarks: [otherRemarks.trim(), systemSuffix].filter(Boolean).join('\n'),
        entitle,
        served_by: servedBy,
      }, userEmail);
      onSave(invoice.trans_no, updated);
      onClose();
    } catch {
      setSaveError('Unable to save invoice details. Your changes are still here. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';
  const labelClass = 'mb-2 block text-xs font-semibold text-slate-700';
  const sectionClass = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
  const headingClass = 'mb-4 flex items-center gap-2 text-xs font-bold text-slate-800';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-md sm:p-5"
      onClick={event => { if (event.target === event.currentTarget && !savingRef.current) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-details-title"
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-slate-50 shadow-2xl"
      >
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-700"><FileEdit className="h-5 w-5" /></span>
              <div>
                <h2 id="invoice-details-title" className="text-lg font-bold tracking-tight text-slate-900">Invoice details</h2>
                <p className="mt-0.5 text-xs text-slate-500">Update references, advisor details and customer care.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={saving} aria-label="Close invoice details" className="cursor-pointer rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-40"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="break-all rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono font-semibold text-slate-700">{invoice.trans_no}</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 font-medium text-blue-700"><Building2 className="h-3.5 w-3.5" />{invoice.location || 'No boutique assigned'}</span>
            <span className="break-words text-slate-500">{invoice.customer || 'Walk-in Guest'}</span>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" aria-busy={saving}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <fieldset disabled={saving} className="min-w-0 space-y-4">
              <legend className="sr-only">Edit invoice supporting details</legend>
              <section className={cn(sectionClass, 'border-teal-200')}>
                <h3 className={headingClass}><FileText className="h-4 w-4 text-teal-600" />Document references</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="invoice-details-cash-bill" className={labelClass}>Cash bill number <span className="font-normal text-slate-400">(CB)</span></label>
                    <input ref={cashBillRef} id="invoice-details-cash-bill" value={cashBillNo} onChange={event => setCashBillNo(event.target.value)} placeholder="e.g. CB-2610-081" className={cn(inputClass, 'font-mono')} />
                  </div>
                  <div>
                    <label htmlFor="invoice-details-dwa" className={labelClass}>DWA approval reference</label>
                    <input id="invoice-details-dwa" value={dwaNo} onChange={event => setDwaNo(event.target.value)} placeholder="e.g. DWA-042/2026" className={cn(inputClass, 'font-mono')} />
                  </div>
                </div>
              </section>

              <section className={sectionClass}>
                <h3 className={headingClass}><Users className="h-4 w-4 text-indigo-500" />Advisor assignment</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {([
                    { id: 'invoice-details-served', label: 'Served by', value: servedBy, set: setServedBy },
                    { id: 'invoice-details-entitle', label: 'Entitled advisor', value: entitle, set: setEntitle },
                  ] as const).map(field => (
                    <div key={field.id}>
                      <label htmlFor={field.id} className={labelClass}>{field.label}</label>
                      <select id={field.id} value={field.value} onChange={event => field.set(event.target.value)} disabled={advisorsLoading || advisorsError} className={cn(inputClass, 'cursor-pointer')}>
                        <option value="">{advisorsLoading ? 'Loading advisors...' : 'Select an advisor'}</option>
                        {Object.entries(advisorGroups).map(([store, names]) => (
                          <optgroup key={store} label={store}>{names.map(name => <option key={name} value={name}>{name}</option>)}</optgroup>
                        ))}
                        {field.value && !advisors.some(advisor => advisor.name === field.value) && <option value={field.value}>{field.value} (current)</option>}
                      </select>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-slate-500">Transaction advisor: <span className="font-semibold text-slate-700">{invoice.salesman || '\u2014'}</span></p>
                {advisorsError && <p role="status" className="mt-2 text-xs text-amber-700">Advisor options could not be loaded. Reopen this editor to try again.</p>}
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  { id: 'invoice-details-discount', title: 'Discount reason', icon: Tag, value: discountReason, set: setDiscountReason, presets: DISCOUNT_PRESETS, placeholder: 'Describe the discount approval or select a suggestion.', tone: 'indigo' },
                  { id: 'invoice-details-after-sales', title: 'After-sales support', icon: Wrench, value: afterSales, set: setAfterSales, presets: AFTER_SALES_PRESETS, placeholder: 'Add any agreed services or customer care.', tone: 'teal' },
                ] as const).map(field => (
                  <section key={field.id} className={sectionClass}>
                    <label htmlFor={field.id} className={headingClass}><field.icon className={cn('h-4 w-4', field.tone === 'indigo' ? 'text-indigo-500' : 'text-teal-600')} />{field.title}</label>
                    <textarea id={field.id} rows={3} value={field.value} onChange={event => field.set(event.target.value)} placeholder={field.placeholder} className={cn(inputClass, 'resize-y')} />
                    <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Quick suggestions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {field.presets.map(preset => {
                        const selected = field.value.includes(preset);
                        return (
                          <button key={preset} type="button" disabled={selected} onClick={() => addPreset(field.value, preset, field.set)}
                            className={cn('inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-600', selected ? 'border-teal-200 bg-teal-50 text-teal-800' : 'cursor-pointer border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700')}>
                            {selected ? <Check className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}{preset}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <section className={sectionClass}>
                <label htmlFor="invoice-details-notes" className={headingClass}><FileEdit className="h-4 w-4 text-slate-500" />Additional notes</label>
                <textarea id="invoice-details-notes" rows={2} value={otherRemarks} onChange={event => setOtherRemarks(event.target.value)} placeholder="Add any other transaction details..." className={cn(inputClass, 'resize-y')} />
              </section>
              {invoice.meta.updated_at && (
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[10px] text-slate-400">
                  <Clock className="h-3 w-3" />Last updated by {invoice.meta.updated_by || 'system'} &middot; {new Date(invoice.meta.updated_at).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB
                </p>
              )}
            </fieldset>
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            {saveError && <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{saveError}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[10px] text-slate-400">BVLGARI Intelligence / Aris Setiyono</span>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} disabled={saving} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-40">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-600 disabled:cursor-wait disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-teal-300" />}{saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

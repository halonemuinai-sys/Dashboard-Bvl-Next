'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CreditCard, Search, Phone, FileText, Layers } from 'lucide-react';
import Amt from '@/components/Amt';
import { formatMdrRate, GUIDE_TENORS } from '@/lib/installment-guide';
import { cn } from '@/lib/utils';
import {
  getInstallmentMinimum,
  type BankMdrRule
} from '@/services/dashboard/paymentEngine';

export interface BankContact {
  bank: string;
  pic: string;
  email: string;
  phone: string;
}

export const BANK_CONTACTS: BankContact[] = [
  { bank: 'BCA', pic: 'Stephanie / Irene Nathania', email: 'Phoa_Stephani@bca.co.id', phone: '0818-0833-8505' },
  { bank: 'AMEX', pic: 'Stephanie / Irene Nathania', email: 'Phoa_Stephani@bca.co.id', phone: '0818-0833-8505' },
  { bank: 'BNI', pic: 'Samuel William', email: 'samuel.william@bni.co.id', phone: '0896-5548-5886' },
  { bank: 'BRI', pic: 'Erieny Kristianty / Alvatiar Alam', email: 'erieny.kristianty@corp.bri.co.id', phone: '0813-7582-3334' },
  { bank: 'CIMB Niaga', pic: 'Anly / Ms. Ingky (Top-Up)', email: 'anly.anly@cimbniaga.co.id', phone: '0819-0505-6755' },
  { bank: 'Danamon', pic: 'Indah Ayuni / Anne Ardiane', email: 'indah.ayuni@danamon.co.id', phone: '0812-9238-252' },
  { bank: 'DBS', pic: 'Ella Tjandrawinata / Jenniver', email: 'ellat@dbs.com', phone: '0818-0612-3232' },
  { bank: 'HSBC', pic: 'Rhomal Hadiyana / Dinno', email: 'installment.support@hsbc.co.id', phone: '0818-223-466' },
  { bank: 'Mandiri', pic: 'Tanty Hartono / Andrew', email: 'tanty.hartono@bankmandiri.co.id', phone: '0821-2077-7047' },
  { bank: 'OCBC', pic: 'Rigi Dara Negritta', email: 'cicilanocbc@ocbcnisp.com', phone: '0813-8901-6060' },
  { bank: 'Permata', pic: 'Sandy Febryanto', email: 'Permata.Installment.SPA@permatabank.co.id', phone: '0811-2937-593' },
];

const BANK_EXCLUSIONS: Record<string, string[]> = {
  BCA: ['BCA Smartcash', 'BCA Corporate Card', 'BCA debit cards'],
  AMEX: ['AMEX cards issued outside BCA'],
  Mandiri: ['Mandiri Corporate Card', 'Mandiri Commercial Card', 'Mandiri Syariah'],
  BNI: ['BNI Hasanah (Sharia)', 'BNI Corporate Card'],
  BRI: ['BRI Corporate Card', 'BRI Syariah'],
  'CIMB Niaga': ['CIMB Niaga Syariah', 'CIMB Corporate Card'],
  Permata: ['Permata Syariah', 'Corporate Card'],
  Danamon: ['Danamon Syariah', 'Corporate Card'],
  DBS: ['DBS cards issued overseas', 'DBS Corporate Card'],
  OCBC: ['OCBC Syariah', 'OCBC Corporate Card'],
  HSBC: ['HSBC Corporate Card', 'Cards issued overseas'],
};
function bankDetails(key: string, rule: BankMdrRule) {
  const manual = rule.processMethod === 'MANUAL_FORM';
  return {
    logoText: key, badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
    sopSteps: manual ? [
      'Process the regular card transaction on the settlement EDC and retain the receipt.',
      'Complete the bank installment conversion form using an enabled term shown above.',
      'Submit the form and receipt through the bank contact channel and confirm acceptance.',
      'The customer admin fee is separate from the merchant commission. Use the current configured fee shown below.',
    ] : [
      key === 'AMEX' ? 'Use the AMEX installment menu on the BCA EDC.' : 'Use the installment menu on the issuing bank EDC.',
      'Choose an enabled term and verify its current minimum amount in the table above.',
      'Check card and store eligibility, complete the terminal transaction and retain the installment receipt.',
    ],
    exclusions: BANK_EXCLUSIONS[key] || [],
  };
}
const ALL_TENORS = GUIDE_TENORS;

interface BankDirectorySectionProps {
  onSimulateBank: (bankKey: string, minAmount: number) => void;
  customRules: Record<string, BankMdrRule>;
}

export default function BankDirectorySection({ onSimulateBank, customRules }: BankDirectorySectionProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'matrix' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<'ALL' | 'EDC' | 'MANUAL' | 'FREE_MDR'>('ALL');
  const [selectedBankModal, setSelectedBankModal] = useState<string | null>(null);

  const reducedMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!selectedBankModal) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedBankModal(null);
      if (event.key === 'Tab') {
        const dialog = closeRef.current?.closest('[role="dialog"]');
        const controls = dialog?.querySelectorAll<HTMLElement>('button, a[href]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [selectedBankModal]);

  // Clean phone for WA
  const cleanPhoneForWa = (phone: string) => {
    const raw = phone.split('/')[0].trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) return '62' + digits.slice(1);
    return digits;
  };

  // Processed banks
  const processedBanks = useMemo(() => {
    const activeRules = customRules;
    let entries = Object.entries(activeRules);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      entries = entries.filter(([key, rule]) => {
        const contact = BANK_CONTACTS.find(c => c.bank.includes(key) || key.includes(c.bank));
        return (
          key.toLowerCase().includes(q) ||
          rule.bank.toLowerCase().includes(q) ||
          (contact && contact.pic.toLowerCase().includes(q)) ||
          (rule.notes && rule.notes.toLowerCase().includes(q))
        );
      });
    }

    if (filterTag === 'EDC') {
      entries = entries.filter(([, rule]) => rule.processMethod === 'EDC');
    } else if (filterTag === 'MANUAL') {
      entries = entries.filter(([, rule]) => rule.processMethod === 'MANUAL_FORM');
    } else if (filterTag === 'FREE_MDR') {
      entries = entries.filter(([, rule]) => ALL_TENORS.some(t => rule.rates[t] === 0));
    }

    // Default sort by Bank Name
    return entries.sort(([, a], [, b]) => a.bank.localeCompare(b.bank));
  }, [searchQuery, filterTag, customRules]);

  // Modal active bank
  const activeModalData = useMemo(() => {
    if (!selectedBankModal) return null;
    const activeRules = customRules;
    const rule = activeRules[selectedBankModal];
    const contact = BANK_CONTACTS.find(c => c.bank.includes(selectedBankModal) || selectedBankModal.includes(c.bank));
    const meta = rule ? bankDetails(selectedBankModal, rule) : null;
    return rule ? { key: selectedBankModal, rule, contact, meta } : null;
  }, [selectedBankModal, customRules]);

  return (
    <div className="space-y-4">

      {/* Compact Top Bar: Search, Quick Filters & View Switcher */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Search & Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              aria-label="Search bank or contact" placeholder="Find a bank or contact..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
            />
            {searchQuery && (
              <button aria-label="Clear bank search" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs">
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              onClick={() => setFilterTag('ALL')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-[11px]",
                filterTag === 'ALL' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              All ({Object.keys(customRules).length})
            </button>
            <button
              onClick={() => setFilterTag('EDC')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-[11px]",
                filterTag === 'EDC' ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              )}
            >
              EDC terminal ({Object.values(customRules).filter(r => r.processMethod === 'EDC').length})
            </button>
            <button
              onClick={() => setFilterTag('MANUAL')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-[11px]",
                filterTag === 'MANUAL' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Manual form ({Object.values(customRules).filter(r => r.processMethod === 'MANUAL_FORM').length})
            </button>
            <button
              onClick={() => setFilterTag('FREE_MDR')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-[11px]",
                filterTag === 'FREE_MDR' ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              )}
            >
              0% MDR ({Object.values(customRules).filter(r => ALL_TENORS.some(t => r.rates[t] === 0)).length})
            </button>
          </div>
        </div>

        {/* Right: View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setViewMode('cards')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              viewMode === 'cards' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              viewMode === 'matrix' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>MDR matrix</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              viewMode === 'table' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>

      </div>

      <p className="text-xs text-slate-500">Rates, enabled terms, fees and processing methods follow the loaded MDR Setup configuration. BCA 3-month installments use the shared engine minimum of IDR 10M; other terms use the configured bank minimum. Unavailable terms are shown as a dash.</p>
      {processedBanks.length === 0 && <p role="status" className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">No banks match these filters.</p>}
      {/* VIEW 1: COMPACT CLEAN CARDS */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {processedBanks.map(([key, rule]) => {
            const contact = BANK_CONTACTS.find(c => c.bank.includes(key) || key.includes(c.bank));
            const meta = bankDetails(key, rule);
            const isZeroMdr = ALL_TENORS.some(t => rule.rates[t] === 0);
            const waClean = contact ? cleanPhoneForWa(contact.phone) : '';
            const waMessage = encodeURIComponent(
              `Hello ${rule.bank} team, I am a BVLGARI Store Manager. Please confirm the available 0% installment program for our customer.`
            );

            return (
              <div
                key={key}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
              >
                {/* Top Row: Bank Identity & Method */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-black border font-mono tracking-wider",
                        meta?.badgeStyle || "bg-slate-100 text-slate-800 border-slate-200"
                      )}>
                        {meta?.logoText || key}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                        {rule.bank}
                      </h4>
                    </div>

                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold shrink-0 border",
                      rule.processMethod === 'EDC'
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    )}>
                      {rule.processMethod === 'EDC' ? 'EDC' : 'Manual'}
                    </span>
                  </div>

                  {/* Minimum and admin fee */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                    <span>Min: <strong className="text-slate-800 font-mono">Rp <Amt value={rule.minAmount} short /></strong></span>
                    <span>•</span>
                    <span>Admin: <strong className="text-slate-700 font-mono">
                      {rule.adminFee ? <Amt value={rule.adminFee} /> : <span className="text-emerald-700 font-bold">None</span>}
                    </strong></span>
                    {isZeroMdr && (
                      <span className="ml-auto text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        MDR 0%
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Tenor Rates Pills */}
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Enabled terms & MDR:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ALL_TENORS.filter(t => rule.rates[t] !== undefined).map(t => [t, rule.rates[t]!] as const).map(([t, r]) => {
                      const isFree = r === 0;
                      return (
                        <span
                          key={t}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[11px] font-mono border",
                            isFree
                              ? "bg-emerald-50 text-emerald-900 font-bold border-emerald-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          )}
                        >
                          <span className="font-semibold text-slate-500 mr-1">{t.replace(' mth', 'm')}:</span>
                          <strong className={isFree ? "text-emerald-700 font-black" : "text-slate-800 font-bold"}>
                            {isFree ? '0%' : `${formatMdrRate(r || 0)}`}
                          </strong>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Row: PIC Contact & Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  {contact ? (
                    <div className="truncate max-w-[130px]">
                      <div className="text-[9px] text-slate-400 uppercase font-bold">Bank contact:</div>
                      <div className="font-semibold text-slate-800 text-[11px] truncate" title={contact.pic}>
                        {contact.pic.split('/')[0]}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-[11px]">—</div>
                  )}

                  <div className="flex items-center gap-1.5 shrink-0">
                    {contact && (
                      <a
                        href={`https://wa.me/${waClean}?text=${waMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open WhatsApp contact"
                        className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedBankModal(key)}
                      className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-colors"
                    >
                      SOP
                    </button>

                    <button
                      type="button"
                      onClick={() => onSimulateBank(key, rule.minAmount)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Calculate
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: COMPACT MDR HEATMAP MATRIX */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h3 className="font-bold text-slate-900">Bank MDR comparison</h3>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span> 0.0% (No merchant fee)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-300 inline-block"></span> Merchant fee applies</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3 sticky left-0 bg-slate-900 z-10">Bank name</th>
                  <th className="py-2 px-2 text-center">Processing</th>
                  <th className="py-2 px-2 text-right">Min. TXN</th>
                  {ALL_TENORS.map(t => (
                    <th key={t} className="py-2 px-2 text-center">{t.replace(' mth', 'm')}</th>
                  ))}
                  <th className="py-2 px-2 text-center">Admin</th>
                  <th className="py-2 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedBanks.map(([key, rule]) => (
                  <tr key={key} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-bold text-slate-900 sticky left-0 bg-white z-10 shadow-2xs">
                      {rule.bank}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold",
                        rule.processMethod === 'EDC' ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"
                      )}>
                        {rule.processMethod === 'EDC' ? 'EDC' : 'Manual'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-[11px] text-slate-800">
                      <Amt value={rule.minAmount} short />
                    </td>
                    {ALL_TENORS.map(t => {
                      const rate = rule.rates[t];
                      if (rate === undefined) {
                        return <td key={t} className="py-2 px-2 text-center text-slate-300 font-mono">—</td>;
                      }
                      const isFree = rate === 0;
                      return (
                        <td key={t} className="py-1 px-1.5 text-center">
                          <span className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[11px] font-mono",
                            isFree
                              ? "bg-emerald-500 text-white font-black"
                              : "bg-slate-100 text-slate-800 font-semibold"
                          )}>
                            {isFree ? '0%' : `${formatMdrRate(rate)}`}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center font-mono text-[10px]">
                      {rule.adminFee ? <Amt value={rule.adminFee} /> : <span className="text-emerald-700 font-bold">None</span>}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedBankModal(key)}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px]"
                      >
                        SOP
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: COMPACT DATA TABLE */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Bank name</th>
                  <th className="py-2.5 px-3">Processing</th>
                  <th className="py-2.5 px-3">Min. TXN</th>
                  <th className="py-2.5 px-3">Term & MDR</th>
                  <th className="py-2.5 px-3">Admin</th>
                  <th className="py-2.5 px-3">Contact details</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedBanks.map(([key, rule]) => {
                  const contact = BANK_CONTACTS.find(c => c.bank.includes(key) || key.includes(c.bank));
                  const waClean = contact ? cleanPhoneForWa(contact.phone) : '';
                  const tenorsStr = ALL_TENORS.filter(t => rule.rates[t] !== undefined).map(t => [t, rule.rates[t]!] as const)
                    .map(([t, r]) => `${t.replace(' mth', 'm')}: ${formatMdrRate(r!)}`)
                    .join(', ');

                  return (
                    <tr key={key} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{rule.bank}</td>
                      <td className="py-2.5 px-3">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold",
                          rule.processMethod === 'EDC' ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"
                        )}>
                          {rule.processMethod === 'EDC' ? 'EDC' : 'Manual'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">Rp <Amt value={rule.minAmount} /></td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 max-w-xs truncate" title={tenorsStr}>
                        {tenorsStr}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {rule.adminFee ? <Amt value={rule.adminFee} /> : <span className="text-emerald-700 font-bold">None</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {contact ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{contact.pic.split('/')[0]}</span>
                            <span className="text-slate-400 font-mono text-[10px]">{contact.phone}</span>
                            <a href={`https://wa.me/${waClean}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold ml-1">
                              [WA]
                            </a>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedBankModal(key)}
                            className="px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px]"
                          >
                            SOP
                          </button>
                          <button
                            type="button"
                            onClick={() => onSimulateBank(key, rule.minAmount)}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Calculate
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPACT SOP MODAL DIALOG */}
      <AnimatePresence>
        {activeModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.95 }}
              role="dialog" aria-modal="true" aria-label="Bank installment procedures" className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <span>{activeModalData.rule.bank}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-mono">
                      {activeModalData.rule.processMethod === 'EDC' ? 'EDC' : 'Manual form'}
                    </span>
                  </h3>
                  <div className="text-[10px] text-slate-400 mt-0.5">Operating procedures & installment terms</div>
                </div>
                <button
                  type="button"
                  ref={closeRef} aria-label="Close bank procedures" onClick={() => setSelectedBankModal(null)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Rates */}
                <div>
                  <div className="font-bold text-slate-800 mb-1.5 uppercase text-[10px] tracking-wider">
                    MDR by term:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_TENORS.filter(t => activeModalData.rule.rates[t] !== undefined).map(t => [t, activeModalData.rule.rates[t]!] as const).map(([t, r]) => (
                      <span key={t} className="px-2.5 py-1 rounded-lg border bg-slate-50 font-mono text-xs">
                        {t} / min. <Amt value={getInstallmentMinimum(activeModalData.key, t, activeModalData.rule)} />: <strong className={r === 0 ? "text-emerald-700" : "text-slate-900"}>{r === 0 ? '0% (FREE)' : `${formatMdrRate(r!)}`}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 text-slate-600"><p>Customer admin fee: <Amt value={activeModalData.rule.adminFee || 0} /></p><p>Store scope: {activeModalData.rule.validStores || 'All stores'}</p>{activeModalData.rule.notes && <p className="mt-2">Finance notes (as saved): {activeModalData.rule.notes}</p>}</div>
                {/* SOP Steps */}
                <div>
                  <div className="font-bold text-slate-800 mb-1.5 uppercase text-[10px] tracking-wider">
                    Cashier operating steps:
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px] text-slate-700">
                    {(activeModalData.meta?.sopSteps || []).map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="font-bold text-blue-600 shrink-0">{idx + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exclusions */}
                {activeModalData.meta?.exclusions && (
                  <div>
                    <div className="font-bold text-rose-800 mb-1 uppercase text-[10px] tracking-wider">
                      Excluded cards (internal reference):
                    </div>
                    <div className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      {activeModalData.meta.exclusions.join(' • ')}
                    </div>
                  </div>
                )}

                {/* PIC Info */}
                {activeModalData.contact && (
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center justify-between text-[11px]">
                    <div>
                      <div className="font-bold text-emerald-950">{activeModalData.contact.pic}</div>
                      <div className="text-slate-600 font-mono">{activeModalData.contact.phone} • {activeModalData.contact.email}</div>
                    </div>
                    <a
                      href={`https://wa.me/${cleanPhoneForWa(activeModalData.contact.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[10px] shrink-0 hover:bg-emerald-700"
                    >
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBankModal(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const k = activeModalData.key;
                    const min = activeModalData.rule.minAmount;
                    setSelectedBankModal(null);
                    onSimulateBank(k, min);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs"
                >
                  Open calculator
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

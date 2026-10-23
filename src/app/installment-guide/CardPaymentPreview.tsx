'use client';
import { useState } from 'react';
import { Calculator, Info } from 'lucide-react';
import Amt from '@/components/Amt';
import { computePaymentMdr, BANK_OPTIONS, EDC_OPTIONS, CARD_TYPES, INSTALLMENT_OPTIONS, type BankOption, type EdcOption, type CardTypeOption, type InstallmentOption } from '@/services/dashboard/paymentEngine';
import type { MdrConfiguration } from '@/lib/mdr-config';
import { formatMdrRate } from '@/lib/installment-guide';

export default function CardPaymentPreview({ config }: { config: MdrConfiguration }) {
  const [type, setType] = useState<'Credit Card' | 'Debit Card'>('Credit Card');
  const [bank, setBank] = useState<BankOption>('BCA');
  const [edc, setEdc] = useState<EdcOption>('BCA');
  const [card, setCard] = useState<CardTypeOption>('VISA');
  const [tenor, setTenor] = useState<InstallmentOption>('--');
  const [amount, setAmount] = useState(10000000);
  const result = Number.isFinite(amount) && amount > 0 ? computePaymentMdr({ paymentType: type, bank, edc, cardType: card, installment: type === 'Debit Card' ? '--' : tenor, amount }, config.rules, config.debitConfig, config.creditConfig) : null;
  const rule = config.rules[card === 'AMEX' ? 'AMEX' : bank];
  const installment = type === 'Credit Card' && tenor !== '--';
  const supported = !installment || rule?.rates[tenor] !== undefined;
  const selectClass = 'mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800';
  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div><h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Calculator size={18} className="text-emerald-600" />Card payment preview</h2><p className="mt-1 text-xs leading-5 text-slate-500">Uses the same payment engine and saved configuration as MDR Setup. Credit rates follow the settlement EDC; debit rates follow the issuing bank. Special card networks override regular credit rates.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-xs font-semibold text-slate-500">Payment type<select className={selectClass} value={type} onChange={e => setType(e.target.value as typeof type)}><option>Credit Card</option><option>Debit Card</option></select></label>
      <label className="text-xs font-semibold text-slate-500">Issuing bank<select className={selectClass} value={bank} onChange={e => setBank(e.target.value as BankOption)}>{BANK_OPTIONS.map(b => <option key={b}>{b}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-500">Settlement EDC<select className={selectClass} value={edc} onChange={e => setEdc(e.target.value as EdcOption)}>{EDC_OPTIONS.map(b => <option key={b}>{b}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-500">Card network<select className={selectClass} value={card} onChange={e => setCard(e.target.value as CardTypeOption)}>{CARD_TYPES.map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-500">Installment term<select className={selectClass} disabled={type === 'Debit Card'} value={type === 'Debit Card' ? '--' : tenor} onChange={e => setTenor(e.target.value as InstallmentOption)}>{INSTALLMENT_OPTIONS.map(t => <option key={t} value={t}>{t === '--' ? 'Full payment' : t}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-500">Payment amount (IDR)<input className={selectClass} type="number" min="1" value={Number.isFinite(amount) ? amount || '' : ''} onChange={e => setAmount(Number(e.target.value))} /></label>
    </div>
    {!result ? <p role="alert" className="text-sm text-rose-600">Enter a payment amount greater than zero.</p> : <>
      {!supported && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">This installment term is unavailable. The amount below is the regular payment fallback, not an installment offer.</p>}
      <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Merchant MDR</p><strong className="mt-2 block text-xl">{formatMdrRate(result.mdrPct)}</strong></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Card commission</p><strong className="mt-2 block text-xl text-emerald-900"><Amt value={result.cardComm} /></strong></div><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs text-blue-700">Payment less MDR</p><strong className="mt-2 block text-xl text-blue-900"><Amt value={amount - result.cardComm} /></strong></div></div>
      {result.warningNote && <p className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><Info size={16} className="mt-0.5 shrink-0" />{result.warningNote}</p>}
      {installment && supported && rule && <p className="text-xs leading-5 text-slate-500">Processing: {result.processMethod === 'EDC' ? 'EDC terminal' : 'Manual form'} / Store scope: {rule.validStores || 'All stores'} / Customer admin fee: <Amt value={rule.adminFee || 0} /> (separate from MDR).</p>}
    </>}
  </section>;
}

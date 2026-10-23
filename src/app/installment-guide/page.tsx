'use client';
import { useState, useEffect, useMemo } from 'react';
import { CreditCard, Calculator, Search, CheckCircle2, AlertTriangle, Building2, Clock, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { getMergedBankMdrRules, PAYMENT_LINK_RATES, EDC_OPTIONS, type EdcOption } from '@/services/dashboard/paymentEngine';
import { buildInstallmentComparisons, GUIDE_TENORS as TENORS, formatMdrRate } from '@/lib/installment-guide';
import BankDirectorySection from './BankDirectorySection';
import CardPaymentPreview from './CardPaymentPreview';

export default function InstallmentGuidePage() {
  const [amount, setAmount] = useState<number>(50000000);
  const [selectedTenor, setSelectedTenor] = useState<string>('all');
  const [searchBank, setSearchBank] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'simulator' | 'directory' | 'topup' | 'mall' | 'payments'>('simulator');
  const [config, setConfig] = useState<Awaited<ReturnType<typeof getMergedBankMdrRules>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [edc, setEdc] = useState<EdcOption>('BCA');
  useEffect(() => {
    let active = true;
    getMergedBankMdrRules({ strict: true }).then(result => {
      if (active) { setConfig(result); setError(''); }
    }).catch(() => { if (active) setError('Unable to load the saved MDR configuration. Reload to try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  const reload = () => { setLoading(true); setError(''); setConfig(null); setRevision(n => n + 1); };
  const activeRules = config?.rules || {};
  const handleSimulateBank = (bankKey: string, minAmount: number) => {
    setSearchBank(bankKey);
    setSelectedTenor('all');
    if (amount < minAmount) {
      setAmount(minAmount);
    }
    setActiveTab('simulator');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  };

  const simulationResults = useMemo(() => config ? buildInstallmentComparisons(config, amount, edc, selectedTenor, searchBank) : [], [config, amount, edc, selectedTenor, searchBank]);
  const rates = Object.values(activeRules).flatMap(rule => TENORS.flatMap(t => rule.rates[t] === undefined ? [] : [rule.rates[t]!]));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Banner Header - Clean & Minimalist 3-Color Palette */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
              STORE OPERATIONS
            </span>
            <span className="text-xs text-slate-400 font-medium">Connected to MDR Setup</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            0% Installment & Bank MDR Guide
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Compare configured installment programs, estimate merchant fees and review bank operating procedures. Rates and calculations use the same configuration as MDR Setup.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-left">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Partner banks</div>
            <div className="text-base font-bold text-slate-900">{config ? Object.keys(activeRules).length : '--'}</div>
          </div>
          <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-left">
            <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Lowest configured MDR</div>
            <div className="text-base font-bold text-emerald-800">{rates.length ? formatMdrRate(Math.min(...rates)) : '--'}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"><span>{loading ? 'Loading saved configuration...' : error ? 'Configuration unavailable' : config?.isCustom ? 'Saved MDR Setup configuration' : 'Application baseline'}{config?.updatedAt && ' / Saved ' + new Date(config.updatedAt).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' })}</span><div className="flex items-center gap-3"><Link href="/finance-mdr-setup" className="font-semibold text-blue-600">Open MDR Setup</Link><button disabled={loading} onClick={reload} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Reload rates</button></div></div>
      {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 gap-2 pb-2">
        <button
          onClick={() => setActiveTab('simulator')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === 'simulator'
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Calculator className="w-4 h-4" />
          <span>Installment calculator</span>
        </button>

        <button
          onClick={() => setActiveTab('directory')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === 'directory'
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Building2 className="w-4 h-4" />
          <span>Bank directory & terms</span>
        </button>

        <button
          onClick={() => setActiveTab('topup')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === 'topup'
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Clock className="w-4 h-4" />
          <span>Temporary limit increase</span>
        </button>

        <button
          onClick={() => setActiveTab('mall')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === 'mall'
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>Mall privileges & Payment Link</span>
        </button>
        <button onClick={() => setActiveTab('payments')} className={cn('px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap', activeTab === 'payments' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100')}>Card payment preview</button>
      </div>
      {!loading && config && activeTab === 'payments' && <CardPaymentPreview config={config} />}

      {/* TAB 1: SIMULATOR & CALCULATOR */}
      {!loading && config && activeTab === 'simulator' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Amount Input */}
            <div className="flex-1 max-w-md">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Purchase amount (IDR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-mono font-bold text-xs text-slate-400">Rp</span>
                <input
                  type="number"
                  min="1"
                  step="5000000"
                  aria-label="Purchase amount in IDR" value={Number.isFinite(amount) ? amount || '' : ''}
                  onChange={e => setAmount(Number(e.target.value || 0))}
                  placeholder="50,000,000"
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            <label className="text-xs font-semibold text-slate-600">Settlement EDC<select aria-label="Settlement EDC" value={edc} onChange={e => setEdc(e.target.value as EdcOption)} className="mt-1 block rounded-xl border border-slate-200 p-2">{EDC_OPTIONS.filter(e => e !== '--').map(e => <option key={e}>{e}</option>)}</select></label>
            {/* Tenor Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Installment term
              </label>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedTenor('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    selectedTenor === 'all' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  All terms
                </button>
                {TENORS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTenor(t)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      selectedTenor === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Bank Search */}
            <div className="w-full md:w-56">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Find a bank
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="BCA, CIMB, Mandiri..."
                  value={searchBank}
                  onChange={e => setSearchBank(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

          </div>

          <p className="text-xs leading-5 text-slate-500">Customer interest is 0%; merchant MDR may still apply. Monthly amounts are rounded estimates of principal only; customer admin fees are separate. Meeting the minimum amount does not confirm card, terminal or store eligibility.</p>
          {(!Number.isFinite(amount) || amount <= 0) && <p role="alert" className="text-sm text-rose-600">Enter a purchase amount greater than zero.</p>}
          {/* Results Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {simulationResults.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
                No enabled installment programs match these filters.
              </div>
            ) : (
              simulationResults.map((item, idx) => (
                <div
                  key={`${item.bankKey}-${item.tenor}-${idx}`}
                  className={cn(
                    "bg-white rounded-2xl border p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3",
                    item.meetsMinimum ? "border-slate-200" : "border-rose-200 bg-rose-50/20"
                  )}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{item.bankName}</div>
                      <div className="text-[11px] font-bold text-slate-600 font-mono">
                        Term: {item.tenor} ({item.months} months)
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                      item.processMethod === 'EDC'
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    )}>
                      {item.processMethod === 'EDC' ? 'EDC terminal' : 'Manual form'}
                    </span>
                  </div>

                  {/* Calculations Body */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Customer installment:</span>
                      <span className="font-mono font-extrabold text-slate-900">
                        Rp <Amt value={item.monthlyInstallment} /> / month
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>Merchant MDR:</span>
                      <span className={cn(
                        "font-mono font-black text-sm",
                        item.mdrPct === 0 ? "text-emerald-700" : "text-slate-900"
                      )}>
                        {formatMdrRate(item.mdrPct)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>Card commission:</span>
                      <span className="font-mono font-bold text-slate-900">
                        Rp <Amt value={item.commAmount} />
                      </span>
                    </div>

                    {item.adminFee > 0 && (
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>Customer admin fee:</span>
                        <span className="font-mono font-semibold">Rp <Amt value={item.adminFee} /></span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] leading-5 text-slate-500"><p>Store scope: {item.validStores}</p>{item.warningNote && <p className="mt-2 text-amber-700">{item.warningNote}</p>}</div>
                  {/* Threshold & Eligibility Status */}
                  <div className="pt-2 border-t border-slate-100 text-[11px]">
                    {item.meetsMinimum ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Minimum IDR <Amt value={item.minRequired} /> met</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-rose-600 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Min. Rp <Amt value={item.minRequired} /> (Shortfall IDR <Amt value={item.minRequired - amount} />)</span>
                      </div>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DIRECTORY OF 11 BANKS */}
      {!loading && config && activeTab === 'directory' && (
        <BankDirectorySection customRules={activeRules} onSimulateBank={handleSimulateBank} />
      )}

      {/* TAB 3: TEMPORARY TOP-UP LIMIT SOP */}
      {activeTab === 'topup' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Temporary limit increase procedure</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Internal operating reference for requesting a temporary credit limit increase during a sale. Indicative processing time in the reference: 30-60 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* BCA Protocol */}
            <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-slate-200 text-slate-800 font-bold font-mono text-xs flex items-center justify-center">
                  BCA
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">BCA temporary limit increase</h3>
                  <div className="text-[10px] text-slate-400">During and outside office hours</div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-800">1. Office hours (Monday-Friday, 08:00-17:00 WIB)</div>
                  <div className="text-slate-600 mt-1">Send to UPK Jakarta:</div>
                  <div className="font-mono text-emerald-700 font-bold mt-0.5">pemrosesan_kredit@bca.co.id</div>
                  <div className="text-[11px] text-slate-500">cc: bertasia_simanjuntak@bca.co.id</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-800">2. Outside office hours and weekends (17:01-07:59 WIB; Saturday/Sunday)</div>
                  <div className="text-slate-600 mt-1">Send to the National Authorization team:</div>
                  <div className="font-mono text-emerald-700 font-bold mt-0.5">Otorisasi@bca.co.id</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px] space-y-1">
                  <div className="font-bold text-slate-900">Cardholder tax ID (NPWP) requirements:</div>
                  <div>• If the cardholder has no NPWP, the limit increase request <strong>CANNOT BE PROCESSED</strong>.</div>
                  <div>• If the cardholder has an NPWP but does not have it available, the reference requires an update to HALO BCA within five days. After that deadline, the temporary limit may be reversed and an over-limit block may apply.</div>
                </div>
              </div>
            </div>

            {/* CIMB Niaga Protocol */}
            <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-slate-200 text-slate-800 font-bold font-mono text-xs flex items-center justify-center">
                  CIMB
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">CIMB Niaga temporary limit increase</h3>
                  <div className="text-[10px] text-slate-400">Monday-Saturday, 10:00-22:00 WIB</div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800">Bank contact:</div>
                  <div className="text-slate-700">Contact name: <strong>Ms. Ingky</strong></div>
                  <div className="text-slate-700">Mobile: <strong className="font-mono text-emerald-700">0819-0505-6755</strong></div>
                  <div className="text-slate-700">Office: <span className="font-mono">+62 21 2997 2400 ext. 87008</span></div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                  <div className="font-bold">Store staff preparation:</div>
                  <div>Prepare the cardholder name, card details, expiry date and estimated purchase amount for the bank-approved authorization process.</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: MALL PRIVILEGE & PAYMENT LINK */}
      {activeTab === 'mall' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Mall privileges & BCA Payment Link</h2>
            <p className="text-xs text-slate-500 mt-1">Mall loyalty programs and remote payments via Payment Link.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Mall Privilege */}
            <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Mall membership programs</span>
              </h3>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900">Plaza Indonesia:</div>
                  <div className="text-slate-500 mt-0.5">The internal reference lists 3X Privilege Card points for selected marketing events, such as holiday and anniversary campaigns.</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900">Plaza Senayan:</div>
                  <div className="text-slate-500 mt-0.5">Shopping voucher and dining privileges during participating events.</div>
                </div>
              </div>
            </div>

            {/* Payment Link BCA */}
            <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>BCA Payment Link (remote payments)</span>
              </h3>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">Payment Link MDR schedule:</div>
                  {Object.entries(PAYMENT_LINK_RATES).map(([tenor, rate]) => <div key={tenor} className="flex justify-between py-0.5"><span>{tenor === '--' ? 'Full payment' : tenor + ' installments'}:</span><strong className="font-mono">{formatMdrRate(rate!)}</strong></div>)}
                  <div className="text-[10px] text-slate-500 pt-2 border-t">Payment Link uses a separate rate schedule in the shared payment engine; the credit EDC matrix does not override these rates. BCA credit card installments require a minimum of IDR 10,000,000. Unlisted tenors are unavailable.</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      <footer className="flex justify-between border-t border-slate-200 pt-4 text-xs text-slate-400"><span>BVLGARI / Payment guide</span><span>Aris Setiyono</span></footer>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Calculator,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  Clock,
  Sparkles,
  ShieldCheck,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Percent,
  HelpCircle,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  BANK_MDR_RULES,
  BankMdrRule,
  getMergedBankMdrRules,
  InstallmentOption,
  PAYMENT_LINK_RATES,
  REGULAR_EDC_SWIPE_RATES
} from '@/services/dashboard/paymentEngine';
import BankDirectorySection from './BankDirectorySection';

interface BankContact {
  bank: string;
  pic: string;
  email: string;
  phone: string;
}

const BANK_CONTACTS: BankContact[] = [
  { bank: 'BCA & AMEX BCA', pic: 'Stephanie / Irene Nathania', email: 'Phoa_Stephani@bca.co.id / irene_nathania@bca.co.id', phone: '0818-0833-8505 / 0812-9722-9363' },
  { bank: 'BNI', pic: 'Samuel William', email: 'samuel.william@bni.co.id', phone: '0896-5548-5886' },
  { bank: 'BRI', pic: 'Erieny Kristianty / Alvatiar Alam', email: 'erieny.kristianty@corp.bri.co.id', phone: '0813-7582-3334 / 0811-9991-019' },
  { bank: 'CIMB Niaga', pic: 'Anly', email: 'anly.anly@cimbniaga.co.id', phone: '0819-0505-6755' },
  { bank: 'Danamon', pic: 'Indah Ayuni / Anne Ardiane', email: 'indah.ayuni@danamon.co.id', phone: '0812-9238-252' },
  { bank: 'DBS (Digibank)', pic: 'Ella Tjandrawinata / Jenniver Victory', email: 'ellat@dbs.com / jennivervictory@dbs.com', phone: '0818-0612-3232 / 0812-8223-8899' },
  { bank: 'HSBC', pic: 'Rhomal Hadiyana / Dinno Marcelo', email: 'installment.support@hsbc.co.id', phone: '0818-223-466 / 0878-8501-6969' },
  { bank: 'Mandiri', pic: 'Tanty Hartono / Andrew Christian', email: 'tanty.hartono@bankmandiri.co.id', phone: '0821-2077-7047' },
  { bank: 'OCBC (NISP)', pic: 'Rigi Dara Negritta', email: 'cicilanocbc@ocbcnisp.com', phone: '0813-8901-6060' },
  { bank: 'Permata Bank', pic: 'Sandy Febryanto', email: 'Permata.Installment.SPA@permatabank.co.id', phone: '0811-2937-593 / 1500111' },
  { bank: 'Marketing Bvlgari', pic: 'Dimas Andriyanto', email: 'marketing@mogems.co.id', phone: '0858-9310-5509' },
];

const TENORS: InstallmentOption[] = ['3 mth', '6 mth', '12 mth', '18 mth', '24 mth', '36 mth'];

export default function InstallmentGuidePage() {
  const [amount, setAmount] = useState<number>(50000000);
  const [selectedTenor, setSelectedTenor] = useState<string>('all');
  const [searchBank, setSearchBank] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'simulator' | 'directory' | 'topup' | 'mall'>('simulator');
  const [activeRules, setActiveRules] = useState<Record<string, BankMdrRule>>(BANK_MDR_RULES);

  useEffect(() => {
    getMergedBankMdrRules().then(res => {
      setActiveRules(res.rules);
    });
  }, []);

  const handleSimulateBank = (bankKey: string, minAmount: number) => {
    setSearchBank(bankKey);
    if (amount < minAmount) {
      setAmount(minAmount);
    }
    setActiveTab('simulator');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Simulator comparisons
  const simulationResults = useMemo(() => {
    const list: Array<{
      bankKey: string;
      bankName: string;
      tenor: InstallmentOption;
      months: number;
      mdrPct: number;
      commAmount: number;
      monthlyInstallment: number;
      processMethod: 'EDC' | 'MANUAL_FORM';
      minRequired: number;
      isEligible: boolean;
      adminFee?: number;
      notes?: string;
    }> = [];

    Object.entries(activeRules).forEach(([bKey, rule]) => {
      if (searchBank && !rule.bank.toLowerCase().includes(searchBank.toLowerCase()) && !bKey.toLowerCase().includes(searchBank.toLowerCase())) {
        return;
      }

      Object.entries(rule.rates).forEach(([tenor, rate]) => {
        if (!rate && rate !== 0) return;
        if (selectedTenor !== 'all' && tenor !== selectedTenor) return;

        const months = parseInt(tenor, 10) || 12;
        const minReq = (bKey === 'BCA' && tenor === '3 mth') ? 10000000 : rule.minAmount;
        const isEligible = amount >= minReq;
        const commAmount = Math.round(amount * (rate || 0));
        const monthlyInstallment = months > 0 ? Math.round(amount / months) : amount;

        list.push({
          bankKey: bKey,
          bankName: rule.bank,
          tenor: tenor as InstallmentOption,
          months,
          mdrPct: rate || 0,
          commAmount,
          monthlyInstallment,
          processMethod: rule.processMethod,
          minRequired: minReq,
          isEligible,
          adminFee: rule.adminFee,
          notes: rule.notes,
        });
      });
    });

    // Sort by MDR percentage ascending, then bank name
    return list.sort((a, b) => a.mdrPct - b.mdrPct || a.bankName.localeCompare(b.bankName));
  }, [amount, selectedTenor, searchBank, activeRules]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Banner Header - Clean & Minimalist 3-Color Palette */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
              OPERASIONAL TOKO
            </span>
            <span className="text-xs text-slate-400 font-medium">Master Data 2024 - 2026</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Panduan Cicilan 0% & MDR Perbankan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Katalog resmi 11 bank mitra kerjasama BVLGARI, kalkulator simulasi cicilan, acuan beban MDR (*Merchant Discount Rate*), dan SOP otorisasi kenaikan limit instan (*Temporary Top-Up Limit*).
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-left">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bank Mitra</div>
            <div className="text-base font-bold text-slate-900">11 Bank</div>
          </div>
          <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-left">
            <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">MDR Terendah</div>
            <div className="text-base font-bold text-emerald-800">0.0% Bebas</div>
          </div>
        </div>
      </div>

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
          <span>Kalkulator Simulasi Cicilan</span>
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
          <span>Direktori 11 Bank & Syarat</span>
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
          <span>SOP Kenaikan Limit Sementara</span>
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
          <span>Kerjasama Mall & Payment Link</span>
        </button>
      </div>

      {/* TAB 1: SIMULATOR & CALCULATOR */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Amount Input */}
            <div className="flex-1 max-w-md">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Nominal Transaksi Pembelian (IDR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-mono font-bold text-xs text-slate-400">Rp</span>
                <input
                  type="number"
                  min="1000000"
                  step="5000000"
                  value={amount || ''}
                  onChange={e => setAmount(Number(e.target.value || 0))}
                  placeholder="50,000,000"
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Tenor Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Filter Tenor Cicilan
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
                  Semua Tenor
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
                Cari Bank
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

          {/* Results Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {simulationResults.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
                Tidak ada program cicilan yang sesuai dengan filter.
              </div>
            ) : (
              simulationResults.map((item, idx) => (
                <div
                  key={`${item.bankKey}-${item.tenor}-${idx}`}
                  className={cn(
                    "bg-white rounded-2xl border p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3",
                    item.isEligible ? "border-slate-200" : "border-rose-200 bg-rose-50/20"
                  )}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{item.bankName}</div>
                      <div className="text-[11px] font-bold text-slate-600 font-mono">
                        Tenor: {item.tenor} ({item.months} Bulan)
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                      item.processMethod === 'EDC'
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    )}>
                      {item.processMethod === 'EDC' ? 'EDC Langsung' : 'Form Manual'}
                    </span>
                  </div>

                  {/* Calculations Body */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Cicilan Nasabah:</span>
                      <span className="font-mono font-extrabold text-slate-900">
                        Rp {formatCurrency(item.monthlyInstallment)} / bln
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>Rate MDR (Beban Butik):</span>
                      <span className={cn(
                        "font-mono font-black text-sm",
                        item.mdrPct === 0 ? "text-emerald-700" : "text-slate-900"
                      )}>
                        {(item.mdrPct * 100).toFixed(2)}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>Nominal Card Comm:</span>
                      <span className="font-mono font-bold text-slate-900">
                        Rp {formatCurrency(item.commAmount)}
                      </span>
                    </div>

                    {item.adminFee && (
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>Admin Billing Nasabah:</span>
                        <span className="font-mono font-semibold">Rp {formatCurrency(item.adminFee)}</span>
                      </div>
                    )}
                  </div>

                  {/* Threshold & Eligibility Status */}
                  <div className="pt-2 border-t border-slate-100 text-[11px]">
                    {item.isEligible ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Syarat min. Rp {formatCurrency(item.minRequired)} terpenuhi</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-rose-600 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Min. Rp {formatCurrency(item.minRequired)} (Kurang Rp {formatCurrency(item.minRequired - amount)})</span>
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
      {activeTab === 'directory' && (
        <BankDirectorySection customRules={activeRules} onSimulateBank={handleSimulateBank} />
      )}

      {/* TAB 3: TEMPORARY TOP-UP LIMIT SOP */}
      {activeTab === 'topup' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>SOP Kenaikan Limit Sementara (Temporary Top-Up Limit)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Prosedur darurat untuk menaikkan limit kartu kredit customer di tempat saat closing transaksi (estimasi waktu proses: 30 - 60 menit).
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
                  <h3 className="text-xs font-bold text-slate-900">Prosedur Top-Up Limit Bank BCA</h3>
                  <div className="text-[10px] text-slate-400">Jam Kerja & After Office Hour</div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-800">1. Office Hour (Senin - Jumat 08.00 - 17.00 WIB)</div>
                  <div className="text-slate-600 mt-1">Ditujukan ke UPK Jakarta:</div>
                  <div className="font-mono text-emerald-700 font-bold mt-0.5">pemrosesan_kredit@bca.co.id</div>
                  <div className="text-[11px] text-slate-500">cc: bertasia_simanjuntak@bca.co.id</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-800">2. After Office Hour & Weekend (17.01 - 07.59 WIB & Sabtu/Minggu)</div>
                  <div className="text-slate-600 mt-1">Ditujukan ke Tim Otorisasi Nasional:</div>
                  <div className="font-mono text-emerald-700 font-bold mt-0.5">Otorisasi@bca.co.id</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px] space-y-1">
                  <div className="font-bold text-slate-900">Persyaratan Mutlak NPWP Cardholder:</div>
                  <div>• Jika Cardholder tidak memiliki NPWP, permohonan kenaikan limit <strong>TIDAK DAPAT DIPROSES</strong>.</div>
                  <div>• Jika memiliki NPWP tapi lupa membawa, dapat diproses dengan syarat wajib update maks H+5 ke HALO BCA (jika lewat H+5, limit diturunkan kembali dan kartu terblokir overlimit).</div>
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
                  <h3 className="text-xs font-bold text-slate-900">Prosedur Top-Up Limit CIMB Niaga</h3>
                  <div className="text-[10px] text-slate-400">Senin - Sabtu 10.00 - 22.00 WIB</div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800">Kontak Langsung PIC:</div>
                  <div className="text-slate-700">Nama PIC: <strong>Ibu Ingky</strong></div>
                  <div className="text-slate-700">Telepon HP: <strong className="font-mono text-emerald-700">0819-0505-6755</strong></div>
                  <div className="text-slate-700">Kantor: <span className="font-mono">+62 21 2997 2400 ext. 87008</span></div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                  <div className="font-bold">Tips Staf Toko:</div>
                  <div>Pastikan staf kasir menyiapkan Nama Cardholder, 16 digit No. Kartu, Tanggal Expire, dan perkiraan nominal pembelanjaan barang sebelum menghubungi PIC.</div>
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
            <h2 className="text-base font-bold text-slate-900">Kerjasama Mall Privilege & BCA Payment Link</h2>
            <p className="text-xs text-slate-500 mt-1">Program poin mall dan transaksi jarak jauh via Payment Link.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Mall Privilege */}
            <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Kerjasama Membership Mall</span>
              </h3>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900">Plaza Indonesia:</div>
                  <div className="text-slate-500 mt-0.5">Program 3X Point Privilege Card selama periode event Markom tertentu (cth: Holiday & Anniversary Privilege).</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900">Plaza Senayan:</div>
                  <div className="text-slate-500 mt-0.5">Special promo shopping voucher & privilege dining selama periode event.</div>
                </div>
              </div>
            </div>

            {/* Payment Link BCA */}
            <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>BCA Payment Link (Transaksi Jarak Jauh)</span>
              </h3>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">Ketentuan MDR Cicilan:</div>
                  <div className="flex justify-between py-0.5"><span>Full Payment (Reguler):</span> <strong className="font-mono">1.7%</strong></div>
                  <div className="flex justify-between py-0.5"><span>Cicilan 3 Bulan:</span> <strong className="font-mono">3.0%</strong></div>
                  <div className="flex justify-between py-0.5"><span>Cicilan 6 Bulan:</span> <strong className="font-mono">6.0%</strong></div>
                  <div className="flex justify-between py-0.5"><span>Cicilan 12 Bulan:</span> <strong className="font-mono">9.0%</strong></div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t">* Min. transaksi cicilan Rp 10.000.000. Cicilan hanya berlaku untuk kartu kredit BCA.</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

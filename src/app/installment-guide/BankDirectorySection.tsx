'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  FileText,
  Copy,
  Calculator,
  Printer,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  BANK_MDR_RULES,
  InstallmentOption,
  BankMdrRule
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
  { bank: 'CIMB Niaga', pic: 'Anly / Ibu Ingky (Top-Up)', email: 'anly.anly@cimbniaga.co.id', phone: '0819-0505-6755' },
  { bank: 'Danamon', pic: 'Indah Ayuni / Anne Ardiane', email: 'indah.ayuni@danamon.co.id', phone: '0812-9238-252' },
  { bank: 'DBS', pic: 'Ella Tjandrawinata / Jenniver', email: 'ellat@dbs.com', phone: '0818-0612-3232' },
  { bank: 'HSBC', pic: 'Rhomal Hadiyana / Dinno', email: 'installment.support@hsbc.co.id', phone: '0818-223-466' },
  { bank: 'Mandiri', pic: 'Tanty Hartono / Andrew', email: 'tanty.hartono@bankmandiri.co.id', phone: '0821-2077-7047' },
  { bank: 'OCBC', pic: 'Rigi Dara Negritta', email: 'cicilanocbc@ocbcnisp.com', phone: '0813-8901-6060' },
  { bank: 'Permata', pic: 'Sandy Febryanto', email: 'Permata.Installment.SPA@permatabank.co.id', phone: '0811-2937-593' },
];

export interface BankBrandDetail {
  code: string;
  shortName: string;
  logoText: string;
  badgeStyle: string;
  gradient?: string;
  tagline: string;
  sopSteps: string[];
  exclusions: string[];
}

export const BANK_BRAND_DETAILS: Record<string, BankBrandDetail> = {
  'BCA': {
    code: 'BCA',
    shortName: 'BCA',
    logoText: 'BCA',
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
    tagline: 'EDC Utama Butik & Kenaikan Limit Instan UPK',
    sopSteps: [
      'Pilih menu Cicilan 0% pada mesin EDC BCA.',
      'Geser kartu BCA (Visa, Mastercard, BCA Card).',
      'Pilih tenor yang disepakati (3, 6, 12, 24, atau 36 bulan).',
      'Nominal: min. Rp 10 Jt untuk 3 bln, min. Rp 30 Jt untuk 6-36 bln.',
      'Struk cicilan otomatis tercetak langsung dari mesin EDC.'
    ],
    exclusions: ['BCA Smartcash', 'BCA Corporate Card', 'Kartu Debit BCA']
  },
  'AMEX': {
    code: 'AMEX',
    shortName: 'AMEX BCA',
    logoText: 'AMEX',
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
    tagline: 'Fasilitas Cicilan Kartu American Express via EDC BCA',
    sopSteps: [
      'Pilih menu AMEX Installment pada mesin EDC BCA.',
      'Geser kartu American Express terbitan BCA.',
      'Pilih tenor 3, 6, atau 12 bulan (MDR flat 5.0%).',
      'Min. transaksi Rp 30.000.000.'
    ],
    exclusions: ['Kartu AMEX terbitan luar negeri (Non-BCA)']
  },
  'Mandiri': {
    code: 'Mandiri',
    shortName: 'Mandiri',
    logoText: 'MANDIRI',
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
    tagline: 'EDC Mandiri Power Installment 0%',
    sopSteps: [
      'Gunakan EDC Mandiri, buka menu Power Installment / Cicilan 0%.',
      'Masukkan nominal transaksi (min. Rp 30.000.000).',
      'Pilih tenor 6, 12, atau 18 bulan.'
    ],
    exclusions: ['Mandiri Corporate Card', 'Mandiri Commercial Card', 'Mandiri Syariah']
  },
  'BNI': {
    code: 'BNI',
    shortName: 'BNI',
    logoText: 'BNI',
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
    tagline: 'EDC BNI Cicilan 0% Tenor hingga 24 Bulan',
    sopSteps: [
      'Buka mesin EDC BNI, pilih menu BNI Cicilan 0%.',
      'Masukkan nominal transaksi (min. Rp 30.000.000).',
      'Pilih tenor yang diinginkan (6, 12, 18, atau 24 bulan).'
    ],
    exclusions: ['BNI Hasanah (Syariah)', 'BNI Corporate Card']
  },
  'BRI': {
    code: 'BRI',
    shortName: 'BRI',
    logoText: 'BRI',
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
    tagline: 'MDR 2% - 3% & Promo Diskon Payday tgl 25-30',
    sopSteps: [
      'Pilih menu Cicilan 0% pada mesin EDC BRI.',
      'Masukkan nominal transaksi (min. Rp 30.000.000).',
      'Pilih tenor 3, 6, 12, 18, atau 24 bulan.'
    ],
    exclusions: ['BRI Corporate Card', 'BRI Syariah']
  },
  'CIMB Niaga': {
    code: 'CIMB Niaga',
    shortName: 'CIMB Niaga',
    logoText: 'CIMB',
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
    tagline: 'MDR Flat 1.75% Termurah & Redeem Poin Xtra',
    sopSteps: [
      'Gunakan EDC CIMB Niaga, pilih menu Cicilan 0%.',
      'Masukkan nominal transaksi (min. Rp 50.000.000).',
      'Tenor tersedia: 6, 12, atau 24 bulan (flat rate 1.75%).',
      'Kenaikan limit darurat: hubungi PIC CIMB Ibu Ingky (0819-0505-6755).'
    ],
    exclusions: ['CIMB Niaga Syariah', 'CIMB Corporate Card']
  },
  'Permata': {
    code: 'Permata',
    shortName: 'Permata Bank',
    logoText: 'PERMATA',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    tagline: 'Bebas MDR (0%) Tenor 3 & 6 Bulan via Form Manual',
    sopSteps: [
      'Lakukan transaksi REGULER di EDC Permata atau EDC BCA.',
      'Simpan struk asli hasil gesek EDC.',
      'Isi Formulir Permohonan Cicilan 0% Permata Bank.',
      'Email struk + form ke: Permata.Installment.SPA@permatabank.co.id.',
      'Admin Rp 25.000 ditagihkan ke billing nasabah.'
    ],
    exclusions: ['Permata Syariah', 'Corporate Card']
  },
  'Danamon': {
    code: 'Danamon',
    shortName: 'Danamon',
    logoText: 'DANAMON',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    tagline: 'MDR 0% Tenor 3 & 6 Bulan, Tenor 12 Bulan 1.8%',
    sopSteps: [
      'Gesek transaksi REGULER di mesin EDC (Full Payment).',
      'Lengkapi Formulir Aplikasi Cicilan 0% Danamon.',
      'Email formulir & struk ke PIC: indah.ayuni@danamon.co.id.',
      'Admin Rp 15.000 ditagihkan ke billing nasabah.'
    ],
    exclusions: ['Danamon Syariah', 'Corporate Card']
  },
  'DBS': {
    code: 'DBS',
    shortName: 'DBS Digibank',
    logoText: 'DBS',
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
    tagline: 'Program Cicilan Khusus Butik Plaza Indonesia & Plaza Senayan',
    sopSteps: [
      'Khusus butik Plaza Indonesia & Plaza Senayan (Min. Rp 30 Jt).',
      'Gesek reguler pada EDC, lalu kirim form permohonan ke bank.',
      'Email: ellat@dbs.com / jennivervictory@dbs.com (Admin Rp 15.000).'
    ],
    exclusions: ['Kartu DBS terbitan luar negeri', 'DBS Corporate Card']
  },
  'OCBC': {
    code: 'OCBC',
    shortName: 'OCBC NISP',
    logoText: 'OCBC',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    tagline: 'MDR 0% Bebas Biaya Komisi dari 3 s/d 24 Bulan Penuh',
    sopSteps: [
      'PILIHAN TERBAIK BUTIK: MDR 0.0% (Gratis) untuk semua tenor (3, 6, 12, 18, 24 bln).',
      'Swipe REGULER di EDC lalu isi Formulir Konversi Cicilan 0% OCBC.',
      'Email form + struk ke: cicilanocbc@ocbcnisp.com (cc PIC Rigi Dara Negritta).',
      'Admin fee Rp 15.000 ditagihkan ke billing nasabah.'
    ],
    exclusions: ['OCBC Syariah', 'OCBC Corporate Card']
  },
  'HSBC': {
    code: 'HSBC',
    shortName: 'HSBC',
    logoText: 'HSBC',
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
    tagline: 'Fasilitas Cicilan Nasabah Kartu Kredit Premier & Platinum',
    sopSteps: [
      'Swipe transaksi REGULER di EDC (Min. Rp 30.000.000).',
      'Isi Formulir Permohonan Cicilan 0% HSBC.',
      'Email ke: installment.support@hsbc.co.id (Tenor 6m: 3.5%, 12m: 5.0%).'
    ],
    exclusions: ['HSBC Corporate Card', 'Kartu luar negeri']
  }
};

const ALL_TENORS: InstallmentOption[] = ['3 mth', '6 mth', '12 mth', '18 mth', '24 mth', '36 mth'];

interface BankDirectorySectionProps {
  onSimulateBank: (bankKey: string, minAmount: number) => void;
  customRules?: Record<string, BankMdrRule>;
}

export default function BankDirectorySection({ onSimulateBank, customRules }: BankDirectorySectionProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'matrix' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<'ALL' | 'EDC' | 'MANUAL' | 'FREE_MDR'>('ALL');
  const [selectedBankModal, setSelectedBankModal] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage(`${label} disalin!`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Clean phone for WA
  const cleanPhoneForWa = (phone: string) => {
    const raw = phone.split('/')[0].trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) return '62' + digits.slice(1);
    return digits;
  };

  // Processed banks
  const processedBanks = useMemo(() => {
    const activeRules = customRules ?? BANK_MDR_RULES;
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
      entries = entries.filter(([, rule]) => Object.values(rule.rates).some(r => r === 0));
    }

    // Default sort by Bank Name
    return entries.sort(([, a], [, b]) => a.bank.localeCompare(b.bank));
  }, [searchQuery, filterTag, customRules]);

  // Modal active bank
  const activeModalData = useMemo(() => {
    if (!selectedBankModal) return null;
    const activeRules = customRules ?? BANK_MDR_RULES;
    const rule = activeRules[selectedBankModal];
    const contact = BANK_CONTACTS.find(c => c.bank.includes(selectedBankModal) || selectedBankModal.includes(c.bank));
    const meta = BANK_BRAND_DETAILS[selectedBankModal];
    return { key: selectedBankModal, rule, contact, meta };
  }, [selectedBankModal, customRules]);

  return (
    <div className="space-y-4">

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-[100] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Top Bar: Search, Quick Filters & View Switcher */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Search & Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari bank / PIC..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs">
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
              Semua ({Object.keys(customRules ?? BANK_MDR_RULES).length})
            </button>
            <button
              onClick={() => setFilterTag('EDC')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-[11px]",
                filterTag === 'EDC' ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              )}
            >
              Mesin EDC (6)
            </button>
            <button
              onClick={() => setFilterTag('MANUAL')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-[11px]",
                filterTag === 'MANUAL' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Form Manual (5)
            </button>
            <button
              onClick={() => setFilterTag('FREE_MDR')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-[11px]",
                filterTag === 'FREE_MDR' ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              )}
            >
              MDR 0% (3)
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
            <span>Kartu</span>
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              viewMode === 'matrix' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Matriks MDR</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              viewMode === 'table' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tabel</span>
          </button>
        </div>

      </div>

      {/* VIEW 1: COMPACT CLEAN CARDS */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {processedBanks.map(([key, rule]) => {
            const contact = BANK_CONTACTS.find(c => c.bank.includes(key) || key.includes(c.bank));
            const meta = BANK_BRAND_DETAILS[key];
            const isZeroMdr = Object.values(rule.rates).some(r => r === 0);
            const waClean = contact ? cleanPhoneForWa(contact.phone) : '';
            const waMessage = encodeURIComponent(
              `Halo PIC ${rule.bank}, saya Store Manager BVLGARI Store. Mohon info/konfirmasi program cicilan 0% nasabah kami.`
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

                  {/* Min Amount & Admin Fee Row */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                    <span>Min: <strong className="text-slate-800 font-mono">Rp {formatCurrency(rule.minAmount / 1000000)} Jt</strong></span>
                    <span>•</span>
                    <span>Admin: <strong className="text-slate-700 font-mono">
                      {rule.adminFee ? `Rp ${formatCurrency(rule.adminFee)}` : <span className="text-emerald-700 font-bold">Bebas</span>}
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
                    Pilihan Tenor & Rate MDR:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(rule.rates).map(([t, r]) => {
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
                            {isFree ? '0%' : `${((r || 0) * 100).toFixed(1)}%`}
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
                      <div className="text-[9px] text-slate-400 uppercase font-bold">PIC Bank:</div>
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
                        title="Chat WA PIC"
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
                      Hitung
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
            <h3 className="font-bold text-slate-900">Matriks Komparasi MDR 11 Bank</h3>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span> 0.0% (Gratis)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-300 inline-block"></span> MDR Berbayar</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3 sticky left-0 bg-slate-900 z-10">Nama Bank</th>
                  <th className="py-2 px-2 text-center">Jalur</th>
                  <th className="py-2 px-2 text-right">Min. TXN</th>
                  {ALL_TENORS.map(t => (
                    <th key={t} className="py-2 px-2 text-center">{t.replace(' mth', 'm')}</th>
                  ))}
                  <th className="py-2 px-2 text-center">Admin</th>
                  <th className="py-2 px-2 text-center">Aksi</th>
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
                      {formatCurrency(rule.minAmount / 1000000)} Jt
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
                            {isFree ? '0%' : `${(rate * 100).toFixed(1)}%`}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center font-mono text-[10px]">
                      {rule.adminFee ? `Rp ${formatCurrency(rule.adminFee)}` : <span className="text-emerald-700 font-bold">Bebas</span>}
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
                  <th className="py-2.5 px-3">Nama Bank</th>
                  <th className="py-2.5 px-3">Jalur</th>
                  <th className="py-2.5 px-3">Min. TXN</th>
                  <th className="py-2.5 px-3">Tenor & MDR</th>
                  <th className="py-2.5 px-3">Admin</th>
                  <th className="py-2.5 px-3">PIC & Kontak</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedBanks.map(([key, rule]) => {
                  const contact = BANK_CONTACTS.find(c => c.bank.includes(key) || key.includes(c.bank));
                  const waClean = contact ? cleanPhoneForWa(contact.phone) : '';
                  const tenorsStr = Object.entries(rule.rates)
                    .map(([t, r]) => `${t.replace(' mth', 'm')}: ${(r! * 100).toFixed(1)}%`)
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
                      <td className="py-2.5 px-3 font-mono font-bold">Rp {formatCurrency(rule.minAmount)}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 max-w-xs truncate" title={tenorsStr}>
                        {tenorsStr}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {rule.adminFee ? `Rp ${formatCurrency(rule.adminFee)}` : <span className="text-emerald-700 font-bold">Bebas</span>}
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
                            Hitung
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <span>{activeModalData.rule.bank}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-mono">
                      {activeModalData.rule.processMethod === 'EDC' ? 'EDC' : 'Form Manual'}
                    </span>
                  </h3>
                  <div className="text-[10px] text-slate-400 mt-0.5">SOP Operasional & Ketentuan Cicilan 0%</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBankModal(null)}
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
                    Rate MDR per Tenor:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(activeModalData.rule.rates).map(([t, r]) => (
                      <span key={t} className="px-2.5 py-1 rounded-lg border bg-slate-50 font-mono text-xs">
                        {t}: <strong className={r === 0 ? "text-emerald-700" : "text-slate-900"}>{r === 0 ? '0% (FREE)' : `${(r! * 100).toFixed(1)}%`}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* SOP Steps */}
                <div>
                  <div className="font-bold text-slate-800 mb-1.5 uppercase text-[10px] tracking-wider">
                    Langkah Operasional Kasir (SOP):
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
                      Kartu Tidak Memenuhi Syarat:
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
                  Tutup
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
                  Hitung di Simulasi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

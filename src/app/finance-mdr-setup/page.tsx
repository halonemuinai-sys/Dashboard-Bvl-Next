'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Percent,
  Sliders,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  Search,
  Check,
  Info,
  Sparkles,
  HelpCircle,
  Clock,
  ArrowRight,
  Calculator,
  Lock,
  Unlock,
  KeyRound,
  X
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useUserAccess } from '@/lib/user-access-context';
import {
  BANK_MDR_RULES,
  BankMdrRule,
  InstallmentOption,
  INSTALLMENT_OPTIONS,
  getMergedBankMdrRules,
  saveCustomBankMdrRules,
  resetCustomBankMdrRules,
  DebitConfig,
  DEFAULT_DEBIT_CONFIG,
  BANK_OPTIONS,
  BankDebitRate,
  DEBIT_SUPPORTED_BANKS,
  DEFAULT_DEBIT_BANK_RATES,
  CreditConfig,
  DEFAULT_CREDIT_CONFIG,
  EdcCreditRate,
  DEFAULT_CREDIT_EDC_RATES,
  DEFAULT_CARD_TYPE_RATES,
  CARD_TYPES,
} from '@/services/dashboard/paymentEngine';
import { BANK_BRAND_DETAILS } from '../installment-guide/BankDirectorySection';

const CARD_TYPE_DISPLAY_INFO: Record<string, { fullName: string; description: string; badge: string; badgeColor: string }> = {
  'AMEX': {
    fullName: 'American Express (AMEX)',
    description: 'Tarif khusus transaksi AMEX kartu BCA / Internasional. Standar perbankan ritel 5.00%.',
    badge: '⭐ AMEX Special Rate',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  'ALIPAY': {
    fullName: 'Alipay (Alipay+ / Ant Financial)',
    description: 'Dompet digital valas & cross-border turis via EDC BCA / Acquirer.',
    badge: 'Cross-Border E-Wallet',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
  },
  'WECHAT': {
    fullName: 'WeChat Pay (Tenpay)',
    description: 'Dompet digital valas & cross-border turis via EDC BCA / Acquirer.',
    badge: 'Cross-Border E-Wallet',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  'UNIONPAY': {
    fullName: 'China UnionPay (CUP)',
    description: 'Jaringan kartu debit & kredit China UnionPay internasional & domestik.',
    badge: 'Jaringan Kartu',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
  },
  'JCB': {
    fullName: 'Japan Credit Bureau (JCB)',
    description: 'Jaringan kartu kredit JCB Precious & Ultimate internasional.',
    badge: 'Jaringan Kartu',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  'BCA CARD': {
    fullName: 'BCA Card (Everyday / Platinum)',
    description: 'Kartu kredit proprietary domestik terbitan BCA.',
    badge: 'Proprietary BCA',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  'VISA': {
    fullName: 'Visa International',
    description: 'Kartu kredit jaringan Visa (jika tidak dioverride, mengikuti tarif On-Us/Off-Us EDC).',
    badge: 'Jaringan Utama',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  'MASTER': {
    fullName: 'Mastercard International',
    description: 'Kartu kredit jaringan Mastercard (jika tidak dioverride, mengikuti tarif On-Us/Off-Us EDC).',
    badge: 'Jaringan Utama',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  'Other': {
    fullName: 'Kartu Lainnya / Fallback',
    description: 'Tarif fallback default jika tipe kartu tidak teridentifikasi.',
    badge: 'Fallback',
    badgeColor: 'bg-slate-100 text-slate-600 border-slate-300',
  },
};

const DEBIT_BANK_DISPLAY_INFO: Record<string, { fullName: string; tag: string }> = {
  'BCA': { fullName: 'Bank Central Asia (BCA)', tag: 'EDC Utama Butik' },
  'Mandiri': { fullName: 'Bank Mandiri', tag: 'EDC Partner Ritel' },
  'CIMB Niaga': { fullName: 'CIMB Niaga', tag: 'EDC Partner Ritel' },
  'BNI': { fullName: 'Bank Negara Indonesia (BNI)', tag: 'EDC Partner Ritel' },
  'BRI': { fullName: 'Bank Rakyat Indonesia (BRI)', tag: 'EDC Partner Ritel' },
  'Danamon': { fullName: 'Bank Danamon', tag: 'EDC Partner Ritel' },
  'Permata': { fullName: 'Permata Bank', tag: 'EDC Partner Ritel' },
  'MayBank': { fullName: 'Maybank Indonesia', tag: 'EDC Partner Ritel' },
  'OCBC': { fullName: 'OCBC NISP', tag: 'EDC Partner Ritel' },
  'HSBC': { fullName: 'HSBC Indonesia', tag: 'EDC Partner Ritel' },
  'DBS': { fullName: 'DBS Digibank', tag: 'EDC Partner Ritel' },
  'Other': { fullName: 'Bank Lainnya (GPN / Maestro / Visa Debit)', tag: 'Fallback Default' },
};

const EDITABLE_TENORS: InstallmentOption[] = ['3 mth', '6 mth', '12 mth', '18 mth', '24 mth', '36 mth'];

const COMMON_BOUTIQUE_EDCS = [
  'BCA',
  'Mandiri',
  'CIMB Niaga',
  'BNI',
  'BRI',
  'MayBank',
  'Danamon',
  'Permata',
  'Other',
];

export default function FinanceMdrSetupPage() {
  const { userEmail, isAdmin } = useUserAccess();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isCustomConfig, setIsCustomConfig] = useState(false);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | undefined>();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | undefined>();

  // Category Selector: 'CREDIT' | 'DEBIT'
  const [activeCategory, setActiveCategory] = useState<'CREDIT' | 'DEBIT'>('CREDIT');

  // Lock & Security Verification state (Locked by default as rates change rarely)
  const [isLocked, setIsLocked] = useState(true);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Credit Card rules state
  const [rulesState, setRulesState] = useState<Record<string, BankMdrRule>>({});
  const [originalState, setOriginalState] = useState<Record<string, BankMdrRule>>({});
  const [selectedBankKey, setSelectedBankKey] = useState<string>('BCA');
  const [searchBank, setSearchBank] = useState('');

  // Credit Card EDC On-Us vs Off-Us setup state (BCA On-Us: 1.70%, Off-Us: 2.00%, AMEX: 5.00%)
  const [creditEdcRates, setCreditEdcRates] = useState<Record<string, EdcCreditRate>>({ ...DEFAULT_CREDIT_EDC_RATES });
  const [originalCreditEdcRates, setOriginalCreditEdcRates] = useState<Record<string, EdcCreditRate>>({ ...DEFAULT_CREDIT_EDC_RATES });
  const [defaultCreditOnUs, setDefaultCreditOnUs] = useState<number>(0.017); // 1.70%
  const [defaultCreditOffUs, setDefaultCreditOffUs] = useState<number>(0.020); // 2.00%
  const [originalCreditConfig, setOriginalCreditConfig] = useState<CreditConfig>(DEFAULT_CREDIT_CONFIG);
  const [batchCreditOnUsInput, setBatchCreditOnUsInput] = useState<string>('1.70');
  const [batchCreditOffUsInput, setBatchCreditOffUsInput] = useState<string>('2.00');

  // Card Type specific rates (AMEX: 5.0%, Alipay: 2.0%, WeChat: 2.0%, UnionPay: 2.0%, JCB: 2.0%, dll)
  const [cardTypeRates, setCardTypeRates] = useState<Record<string, number>>({ ...DEFAULT_CARD_TYPE_RATES });
  const [originalCardTypeRates, setOriginalCardTypeRates] = useState<Record<string, number>>({ ...DEFAULT_CARD_TYPE_RATES });

  // Debit Card setup state (BCA On-Us: 0.50%, BCA Off-Us: 1.00%, plus per-bank rates)
  const [bcaOnUsRate, setBcaOnUsRate] = useState<number>(0.005); // 0.50%
  const [bcaOffUsRate, setBcaOffUsRate] = useState<number>(0.010); // 1.00%
  const [onUsRate, setOnUsRate] = useState<number>(0.005); // 0.50%
  const [offUsRate, setOffUsRate] = useState<number>(0.010); // 1.00%
  const [debitBankRates, setDebitBankRates] = useState<Record<string, BankDebitRate>>({ ...DEFAULT_DEBIT_BANK_RATES });
  const [originalDebitBankRates, setOriginalDebitBankRates] = useState<Record<string, BankDebitRate>>({ ...DEFAULT_DEBIT_BANK_RATES });
  const [originalDebitConfig, setOriginalDebitConfig] = useState<DebitConfig>(DEFAULT_DEBIT_CONFIG);

  const [searchDebitBank, setSearchDebitBank] = useState('');
  const [batchOnUsInput, setBatchOnUsInput] = useState<string>('0.50');
  const [batchOffUsInput, setBatchOffUsInput] = useState<string>('1.00');

  const [simBank, setSimBank] = useState<string>('BCA');
  const [simEdc, setSimEdc] = useState<string>('BCA');
  const [simDebitAmount, setSimDebitAmount] = useState<number>(20800000);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load rules on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getMergedBankMdrRules();
      setRulesState(JSON.parse(JSON.stringify(res.rules)));
      setOriginalState(JSON.parse(JSON.stringify(res.rules)));
      if (res.creditConfig) {
        setDefaultCreditOnUs(res.creditConfig.defaultOnUsRate ?? DEFAULT_CREDIT_CONFIG.defaultOnUsRate);
        setDefaultCreditOffUs(res.creditConfig.defaultOffUsRate ?? DEFAULT_CREDIT_CONFIG.defaultOffUsRate);
        const cRates = res.creditConfig.edcRates || DEFAULT_CREDIT_EDC_RATES;
        setCreditEdcRates(JSON.parse(JSON.stringify(cRates)));
        setOriginalCreditEdcRates(JSON.parse(JSON.stringify(cRates)));
        const ctRates = res.creditConfig.cardTypeRates || DEFAULT_CARD_TYPE_RATES;
        setCardTypeRates(JSON.parse(JSON.stringify(ctRates)));
        setOriginalCardTypeRates(JSON.parse(JSON.stringify(ctRates)));
        setOriginalCreditConfig(JSON.parse(JSON.stringify(res.creditConfig)));
      }
      if (res.debitConfig) {
        setBcaOnUsRate(res.debitConfig.bcaOnUsRate ?? DEFAULT_DEBIT_CONFIG.bcaOnUsRate);
        setBcaOffUsRate(res.debitConfig.bcaOffUsRate ?? DEFAULT_DEBIT_CONFIG.bcaOffUsRate);
        setOnUsRate(res.debitConfig.onUsRate ?? DEFAULT_DEBIT_CONFIG.onUsRate);
        setOffUsRate(res.debitConfig.offUsRate ?? DEFAULT_DEBIT_CONFIG.offUsRate);
        const bRates = res.debitConfig.bankRates || DEFAULT_DEBIT_BANK_RATES;
        setDebitBankRates(JSON.parse(JSON.stringify(bRates)));
        setOriginalDebitBankRates(JSON.parse(JSON.stringify(bRates)));
        setOriginalDebitConfig(JSON.parse(JSON.stringify(res.debitConfig)));
      }
      setIsCustomConfig(res.isCustom);
      setLastUpdatedBy(res.updatedBy);
      setLastUpdatedAt(res.updatedAt);
      setLoading(false);
    }
    load();
  }, []);

  // Show toast helper
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Change detection
  const hasCreditChanges = useMemo(() => {
    const rulesDiff = JSON.stringify(rulesState) !== JSON.stringify(originalState);
    const onUsDiff = defaultCreditOnUs !== (originalCreditConfig.defaultOnUsRate ?? DEFAULT_CREDIT_CONFIG.defaultOnUsRate);
    const offUsDiff = defaultCreditOffUs !== (originalCreditConfig.defaultOffUsRate ?? DEFAULT_CREDIT_CONFIG.defaultOffUsRate);
    const edcRatesDiff = JSON.stringify(creditEdcRates) !== JSON.stringify(originalCreditEdcRates);
    const cardTypesDiff = JSON.stringify(cardTypeRates) !== JSON.stringify(originalCardTypeRates);
    return rulesDiff || onUsDiff || offUsDiff || edcRatesDiff || cardTypesDiff;
  }, [rulesState, originalState, defaultCreditOnUs, defaultCreditOffUs, creditEdcRates, originalCreditEdcRates, cardTypeRates, originalCardTypeRates, originalCreditConfig]);

  const hasDebitChanges = useMemo(() => {
    const bcaOnUsDiff = bcaOnUsRate !== (originalDebitConfig.bcaOnUsRate ?? DEFAULT_DEBIT_CONFIG.bcaOnUsRate);
    const bcaOffUsDiff = bcaOffUsRate !== (originalDebitConfig.bcaOffUsRate ?? DEFAULT_DEBIT_CONFIG.bcaOffUsRate);
    const onUsDiff = onUsRate !== (originalDebitConfig.onUsRate ?? DEFAULT_DEBIT_CONFIG.onUsRate);
    const offUsDiff = offUsRate !== (originalDebitConfig.offUsRate ?? DEFAULT_DEBIT_CONFIG.offUsRate);
    const bankRatesDiff = JSON.stringify(debitBankRates) !== JSON.stringify(originalDebitBankRates);
    return bcaOnUsDiff || bcaOffUsDiff || onUsDiff || offUsDiff || bankRatesDiff;
  }, [bcaOnUsRate, bcaOffUsRate, onUsRate, offUsRate, debitBankRates, originalDebitBankRates, originalDebitConfig]);

  const hasChanges = hasCreditChanges || hasDebitChanges;

  // Specific bank change detection
  const bankHasChanges = (bankKey: string) => {
    if (!rulesState[bankKey] || !originalState[bankKey]) return false;
    return JSON.stringify(rulesState[bankKey]) !== JSON.stringify(originalState[bankKey]);
  };

  // Handler update credit rate
  const handleRateChange = (bankKey: string, tenor: InstallmentOption, valueStr: string) => {
    setRulesState(prev => {
      const copy = { ...prev };
      const bankCopy = { ...copy[bankKey], rates: { ...copy[bankKey]?.rates } };
      if (valueStr === '') {
        delete bankCopy.rates[tenor];
      } else {
        const numVal = parseFloat(valueStr);
        bankCopy.rates[tenor] = isNaN(numVal) ? undefined : numVal / 100;
      }
      copy[bankKey] = bankCopy;
      return copy;
    });
  };

  // Handler toggle tenor active / inactive
  const handleToggleTenor = (bankKey: string, tenor: InstallmentOption) => {
    setRulesState(prev => {
      const copy = { ...prev };
      const bankCopy = { ...copy[bankKey], rates: { ...copy[bankKey]?.rates } };
      if (bankCopy.rates[tenor] !== undefined) {
        delete bankCopy.rates[tenor];
      } else {
        bankCopy.rates[tenor] = 0.05; // Default 5.0%
      }
      copy[bankKey] = bankCopy;
      return copy;
    });
  };

  // Handler update other fields
  const handleFieldChange = (bankKey: string, field: keyof BankMdrRule, value: any) => {
    if (isLocked) return;
    setRulesState(prev => {
      const copy = { ...prev };
      copy[bankKey] = {
        ...copy[bankKey],
        [field]: value
      };
      return copy;
    });
  };

  // Handler update individual debit bank rate
  const handleDebitBankRateChange = (bankKey: string, field: 'onUs' | 'offUs', valStr: string) => {
    if (isLocked) return;
    const num = parseFloat(valStr);
    const rateVal = isNaN(num) ? 0 : Math.max(0, num) / 100;
    setDebitBankRates(prev => {
      const copy = { ...prev };
      const current = copy[bankKey] || { onUs: 0.005, offUs: 0.010 };
      copy[bankKey] = {
        ...current,
        [field]: rateVal,
      };
      return copy;
    });

    if (bankKey === 'BCA') {
      if (field === 'onUs') setBcaOnUsRate(rateVal);
      if (field === 'offUs') setBcaOffUsRate(rateVal);
    }
  };

  // Handler reset a single bank's debit rate
  const handleResetDebitBank = (bankKey: string) => {
    if (isLocked) return;
    const def = DEFAULT_DEBIT_BANK_RATES[bankKey] || { onUs: 0.005, offUs: 0.010 };
    setDebitBankRates(prev => ({
      ...prev,
      [bankKey]: { ...def },
    }));
    if (bankKey === 'BCA') {
      setBcaOnUsRate(def.onUs);
      setBcaOffUsRate(def.offUs);
    }
    showToast(`Tarif debit ${bankKey} dikembalikan ke default.`);
  };

  // Batch apply On-Us to all banks
  const handleApplyBatchOnUs = () => {
    if (isLocked) return;
    const num = parseFloat(batchOnUsInput);
    if (isNaN(num)) return;
    const rateVal = Math.max(0, num) / 100;
    setDebitBankRates(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(k => {
        copy[k] = { ...copy[k], onUs: rateVal };
      });
      return copy;
    });
    setBcaOnUsRate(rateVal);
    setOnUsRate(rateVal);
    showToast(`Tarif On-Us seluruh bank debit diset ke ${batchOnUsInput}%`);
  };

  // Batch apply Off-Us to all banks
  const handleApplyBatchOffUs = () => {
    if (isLocked) return;
    const num = parseFloat(batchOffUsInput);
    if (isNaN(num)) return;
    const rateVal = Math.max(0, num) / 100;
    setDebitBankRates(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(k => {
        copy[k] = { ...copy[k], offUs: rateVal };
      });
      return copy;
    });
    setBcaOffUsRate(rateVal);
    setOffUsRate(rateVal);
    showToast(`Tarif Off-Us seluruh bank debit diset ke ${batchOffUsInput}%`);
  };

  // Handler update individual credit EDC rate
  const handleCreditEdcRateChange = (edcKey: string, field: 'onUs' | 'offUs', valStr: string) => {
    if (isLocked) return;
    const num = parseFloat(valStr);
    const rateVal = isNaN(num) ? 0 : Math.max(0, num) / 100;
    setCreditEdcRates(prev => {
      const copy = { ...prev };
      const current = copy[edcKey] || { onUs: 0.017, offUs: 0.020 };
      copy[edcKey] = {
        ...current,
        [field]: rateVal,
      };
      return copy;
    });
  };

  // Handler reset a single EDC's credit rate
  const handleResetCreditEdc = (edcKey: string) => {
    if (isLocked) return;
    const def = DEFAULT_CREDIT_EDC_RATES[edcKey] || { onUs: 0.017, offUs: 0.020 };
    setCreditEdcRates(prev => ({
      ...prev,
      [edcKey]: { ...def },
    }));
    showToast(`Tarif gesek EDC ${edcKey} dikembalikan ke default.`);
  };

  // Batch apply Credit On-Us to all EDCs
  const handleApplyBatchCreditOnUs = () => {
    if (isLocked) return;
    const num = parseFloat(batchCreditOnUsInput);
    if (isNaN(num)) return;
    const rateVal = Math.max(0, num) / 100;
    setCreditEdcRates(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(k => {
        copy[k] = { ...copy[k], onUs: rateVal };
      });
      return copy;
    });
    setDefaultCreditOnUs(rateVal);
    showToast(`Tarif On-Us seluruh mesin EDC diset ke ${batchCreditOnUsInput}%`);
  };

  // Batch apply Credit Off-Us to all EDCs
  const handleApplyBatchCreditOffUs = () => {
    if (isLocked) return;
    const num = parseFloat(batchCreditOffUsInput);
    if (isNaN(num)) return;
    const rateVal = Math.max(0, num) / 100;
    setCreditEdcRates(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(k => {
        copy[k] = { ...copy[k], offUs: rateVal };
      });
      return copy;
    });
    setDefaultCreditOffUs(rateVal);
    showToast(`Tarif Off-Us seluruh mesin EDC diset ke ${batchCreditOffUsInput}%`);
  };

  // Handler update individual card type rate
  const handleCardTypeRateChange = (cardKey: string, valStr: string) => {
    if (isLocked) return;
    const num = parseFloat(valStr);
    const rateVal = isNaN(num) ? 0 : Math.max(0, num) / 100;
    setCardTypeRates(prev => ({
      ...prev,
      [cardKey]: rateVal,
    }));
  };

  // Handler reset a single card type's rate
  const handleResetCardType = (cardKey: string) => {
    if (isLocked) return;
    const def = DEFAULT_CARD_TYPE_RATES[cardKey] ?? 0.017;
    setCardTypeRates(prev => ({
      ...prev,
      [cardKey]: def,
    }));
    showToast(`Tarif Card Type ${cardKey} dikembalikan ke default.`);
  };

  // Verification PIN unlock handler
  const handleVerifyUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = pinInput.trim().toLowerCase();
    const validPins = ['1234', 'bvlgari', 'admin', '8888'];
    if (validPins.includes(cleanPin)) {
      setIsLocked(false);
      setUnlockModalOpen(false);
      setPinInput('');
      setPinError('');
      showToast('Otorisasi berhasil. Mode edit konfigurasi MDR telah dibuka.');
    } else {
      setPinError('PIN otorisasi tidak valid. Masukkan PIN standar: 1234');
    }
  };

  // Direct unlock for authorized admin / finance account
  const handleAdminDirectUnlock = () => {
    setIsLocked(false);
    setUnlockModalOpen(false);
    setPinInput('');
    setPinError('');
    showToast(`Otorisasi akun ${userEmail || 'Finance'} berhasil. Mode edit aktif.`);
  };

  // Save changes
  const handleSave = async () => {
    if (isLocked) {
      showToast('Konfigurasi masih terkunci. Silakan buka kunci terlebih dahulu.', 'error');
      return;
    }
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Finance & Management IT yang dapat menyimpan.', 'error');
      return;
    }
    setSaving(true);
    const email = userEmail || 'finance@mogems.co.id';
    const creditConfigToSave: CreditConfig = {
      defaultOnUsRate: defaultCreditOnUs,
      defaultOffUsRate: defaultCreditOffUs,
      edcRates: creditEdcRates,
      cardTypeRates,
    };
    const res = await saveCustomBankMdrRules(
      rulesState,
      email,
      {
        defaultRate: offUsRate,
        bcaOnUsRate: debitBankRates['BCA']?.onUs ?? bcaOnUsRate,
        bcaOffUsRate: debitBankRates['BCA']?.offUs ?? bcaOffUsRate,
        onUsRate,
        offUsRate,
        bankRates: debitBankRates,
        edcRates: {},
      },
      creditConfigToSave
    );
    setSaving(false);

    if (res.success) {
      setOriginalState(JSON.parse(JSON.stringify(rulesState)));
      setOriginalCreditEdcRates(JSON.parse(JSON.stringify(creditEdcRates)));
      setOriginalCardTypeRates(JSON.parse(JSON.stringify(cardTypeRates)));
      setOriginalCreditConfig(JSON.parse(JSON.stringify(creditConfigToSave)));
      setOriginalDebitBankRates(JSON.parse(JSON.stringify(debitBankRates)));
      setOriginalDebitConfig({
        defaultRate: offUsRate,
        bcaOnUsRate: debitBankRates['BCA']?.onUs ?? bcaOnUsRate,
        bcaOffUsRate: debitBankRates['BCA']?.offUs ?? bcaOffUsRate,
        onUsRate,
        offUsRate,
        bankRates: JSON.parse(JSON.stringify(debitBankRates)),
        edcRates: {},
      });
      setIsCustomConfig(true);
      setLastUpdatedBy(email);
      setLastUpdatedAt(new Date().toISOString());
      setIsLocked(true); // Auto re-lock upon saving!
      showToast('Perubahan konfigurasi MDR berhasil disimpan dan proteksi dikunci kembali!');
    } else {
      showToast(`Gagal menyimpan: ${res.error || 'Terjadi kesalahan sistem'}`, 'error');
    }
  };

  // Reset to default baseline
  const handleResetToBaseline = async () => {
    if (isLocked) {
      showToast('Konfigurasi masih terkunci. Silakan buka kunci terlebih dahulu.', 'error');
      return;
    }
    if (!isAdmin) {
      showToast('Hanya Finance & Management IT yang dapat melakukan reset.', 'error');
      return;
    }
    if (!confirm('Apakah Anda yakin ingin mereset seluruh persentase MDR kembali ke master data standar Excel 2024-2026?')) {
      return;
    }

    setResetting(true);
    const email = userEmail || 'finance@mogems.co.id';
    const res = await resetCustomBankMdrRules(email);
    setResetting(false);

    if (res.success) {
      setRulesState(JSON.parse(JSON.stringify(BANK_MDR_RULES)));
      setOriginalState(JSON.parse(JSON.stringify(BANK_MDR_RULES)));
      setDefaultCreditOnUs(DEFAULT_CREDIT_CONFIG.defaultOnUsRate);
      setDefaultCreditOffUs(DEFAULT_CREDIT_CONFIG.defaultOffUsRate);
      setCreditEdcRates({ ...DEFAULT_CREDIT_EDC_RATES });
      setOriginalCreditEdcRates({ ...DEFAULT_CREDIT_EDC_RATES });
      setCardTypeRates({ ...DEFAULT_CARD_TYPE_RATES });
      setOriginalCardTypeRates({ ...DEFAULT_CARD_TYPE_RATES });
      setOriginalCreditConfig(JSON.parse(JSON.stringify(DEFAULT_CREDIT_CONFIG)));
      setBcaOnUsRate(DEFAULT_DEBIT_CONFIG.bcaOnUsRate);
      setBcaOffUsRate(DEFAULT_DEBIT_CONFIG.bcaOffUsRate);
      setOnUsRate(DEFAULT_DEBIT_CONFIG.onUsRate);
      setOffUsRate(DEFAULT_DEBIT_CONFIG.offUsRate);
      setDebitBankRates({ ...DEFAULT_DEBIT_BANK_RATES });
      setOriginalDebitBankRates({ ...DEFAULT_DEBIT_BANK_RATES });
      setOriginalDebitConfig(JSON.parse(JSON.stringify(DEFAULT_DEBIT_CONFIG)));
      setIsCustomConfig(false);
      setLastUpdatedBy(undefined);
      setLastUpdatedAt(undefined);
      setIsLocked(true); // Auto re-lock upon reset!
      showToast('Konfigurasi MDR telah dikembalikan ke standar awal dan proteksi dikunci kembali!');
    } else {
      showToast(`Gagal reset: ${res.error}`, 'error');
    }
  };

  // Filtered bank list (Credit)
  const bankList = useMemo(() => {
    const list = Object.keys(rulesState);
    if (!searchBank.trim()) return list;
    const q = searchBank.toLowerCase();
    return list.filter(k => k.toLowerCase().includes(q) || rulesState[k]?.bank?.toLowerCase().includes(q));
  }, [rulesState, searchBank]);

  // Filtered bank list (Debit)
  const debitBankList = useMemo(() => {
    const list = Object.keys(debitBankRates);
    if (!searchDebitBank.trim()) return list;
    const q = searchDebitBank.toLowerCase();
    return list.filter(k => {
      const info = DEBIT_BANK_DISPLAY_INFO[k]?.fullName || '';
      return k.toLowerCase().includes(q) || info.toLowerCase().includes(q);
    });
  }, [debitBankRates, searchDebitBank]);

  const activeBankRule = rulesState[selectedBankKey];
  const activeBankMeta = BANK_BRAND_DETAILS[selectedBankKey];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-semibold text-white",
              toastMessage.type === 'success'
                ? "bg-slate-900 border-slate-700"
                : "bg-rose-900 border-rose-700"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs",
              toastMessage.type === 'success' ? "bg-emerald-500/20 text-emerald-400" : "bg-white/20 text-white"
            )}>
              {toastMessage.type === 'success' ? '✓' : '⚠️'}
            </div>
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header - Clean & Minimalist 3-Color Palette */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
              FINANCE CONTROL
            </span>
            <span className="text-xs text-slate-400 font-medium">MDR Smart Rule Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Setup & Konfigurasi MDR Bank
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Pusat konfigurasi persentase MDR cicilan 0% 11 bank mitra, batas minimum transaksi, dan biaya admin. Sinkronisasi otomatis ke kasir POS dan panduan cicilan.
          </p>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {isLocked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Mode Terkunci</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mode Edit Terbuka</span>
              </span>
            )}

            {isCustomConfig ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Custom Config</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Standar Baseline</span>
              </span>
            )}
          </div>

          {lastUpdatedAt && (
            <div className="text-[11px] text-slate-400 font-mono text-left md:text-right">
              Terakhir diubah: {new Date(lastUpdatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              {lastUpdatedBy && <span className="block text-[10px] text-slate-500">oleh {lastUpdatedBy}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Global Actions Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className={cn("w-2.5 h-2.5 rounded-full", isLocked ? "bg-slate-400" : "bg-emerald-500 animate-pulse")}></span>
            <span className="text-xs font-semibold text-slate-800">
              {isLocked
                ? 'Konfigurasi terproteksi (Read-Only) — Buka kunci untuk mengedit'
                : hasChanges
                  ? 'Ada perubahan persentase belum disimpan'
                  : 'Mode edit aktif — siap mengubah persentase'}
            </span>
          </div>
          {isLocked && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              Terkunci
            </span>
          )}
          {!isLocked && hasChanges && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Unsaved
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/installment-guide"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lihat Simulasi Toko</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          {/* Lock / Unlock Toggle Button */}
          {isLocked ? (
            <button
              type="button"
              onClick={() => {
                setPinError('');
                setPinInput('');
                setUnlockModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Buka Kunci Pengaturan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (hasChanges && !confirm('Masih ada perubahan yang belum disimpan. Yakin ingin mengunci kembali?')) {
                  return;
                }
                setIsLocked(true);
                showToast('Pengaturan telah dikunci kembali.');
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              <span>Kunci Sekarang</span>
            </button>
          )}

          {isCustomConfig && (
            <button
              type="button"
              onClick={handleResetToBaseline}
              disabled={resetting || saving || isLocked}
              title={isLocked ? 'Buka kunci terlebih dahulu untuk mereset' : undefined}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>{resetting ? 'Mereset...' : 'Reset ke Baseline'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges || isLocked}
            className={cn(
              "px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-2xs",
              isLocked
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : hasChanges
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 cursor-pointer"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
            )}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isLocked ? 'Terkunci' : saving ? 'Menyimpan...' : 'Simpan Perubahan MDR'}</span>
          </button>
        </div>
      </div>

      {/* Category Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveCategory('CREDIT')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeCategory === 'CREDIT'
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>Kartu Kredit & Cicilan 0% (11 Bank)</span>
          {hasCreditChanges && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('DEBIT')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeCategory === 'DEBIT'
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <Percent className="w-4 h-4 text-emerald-400" />
          <span>Kartu Debit (Debit Card)</span>
          {hasDebitChanges && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>
      </div>

      {/* Main Dual-Column Setup Cockpit for Credit Cards */}
      {activeCategory === 'CREDIT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Bank Navigation List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Daftar 11 Bank Mitra</span>
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              {bankList.length} Bank
            </span>
          </div>

          {/* Quick Filter Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama bank..."
              value={searchBank}
              onChange={e => setSearchBank(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
            />
          </div>

          {/* Bank Items */}
          <div className="space-y-1.5 max-h-[580px] overflow-y-auto custom-scrollbar pr-1">
            {bankList.map(bankKey => {
              const rule = rulesState[bankKey];
              const isSelected = selectedBankKey === bankKey;
              const hasBankChanges = bankHasChanges(bankKey);

              return (
                <button
                  key={bankKey}
                  type="button"
                  onClick={() => setSelectedBankKey(bankKey)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer group",
                    isSelected
                      ? "bg-emerald-50/90 text-slate-900 border-emerald-400 shadow-2xs font-semibold"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-black font-mono tracking-wider shrink-0 border uppercase",
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    )}>
                      {bankKey === 'CIMB Niaga' ? 'CIMB' : bankKey}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs flex items-center gap-1.5 truncate">
                        <span className="truncate">{rule.bank}</span>
                        {hasBankChanges && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Ada perubahan belum disimpan"></span>
                        )}
                      </div>
                      <div className={cn("text-[10px] mt-0.5 truncate font-medium", isSelected ? "text-emerald-800" : "text-slate-400")}>
                        {rule.processMethod === 'EDC' ? 'EDC' : 'Form Manual'} • Min {formatCurrency(rule.minAmount / 1000000)} Jt
                      </div>
                    </div>
                  </div>

                  <ArrowRight className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-transform",
                    isSelected ? "text-emerald-600 translate-x-0.5" : "text-slate-300 opacity-0 group-hover:opacity-100"
                  )} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Bank Configuration Form (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeBankRule ? (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-5">

              {/* Protection / Lock Status Banner */}
              {isLocked ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="block text-slate-900 font-semibold">Mode Proteksi Aktif (Read-Only)</strong>
                      <span className="text-[11px] text-slate-500">Nilai MDR diproteksi dari pengubahan tanpa sengaja. Buka kunci untuk memperbarui rate.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPinError('');
                      setPinInput('');
                      setUnlockModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-colors shrink-0 shadow-2xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Buka Kunci</span>
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-emerald-900 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Unlock className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <strong className="block text-emerald-900 font-semibold">Mode Edit Terbuka (Akses Diberikan)</strong>
                      <span className="text-[11px] text-emerald-700">Anda dapat mengubah rate tenor, syarat minimal, dan biaya admin.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasChanges && !confirm('Masih ada perubahan belum disimpan. Kunci kembali sekarang?')) return;
                      setIsLocked(true);
                      showToast('Pengaturan telah dikunci kembali.');
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shrink-0 shadow-2xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                    <span>Kunci Kembali</span>
                  </button>
                </div>
              )}

              {/* Bank Header Card - Clean with Light Green Accent */}
              <div className="bg-slate-900 rounded-xl p-4 text-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase shrink-0">
                    {selectedBankKey === 'CIMB Niaga' ? 'CIMB' : selectedBankKey}
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase font-mono tracking-wider block">
                      EDIT ATURAN BANK MITRA
                    </span>
                    <h2 className="text-base sm:text-lg font-bold leading-tight truncate">{activeBankRule.bank}</h2>
                    <p className="text-xs text-slate-400 truncate">{activeBankMeta?.tagline}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isLocked ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Terkunci</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <Unlock className="w-3 h-3 text-emerald-400" />
                      <span>Edit Aktif</span>
                    </span>
                  )}

                  {bankHasChanges(selectedBankKey) && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs">
                      Telah Dimodifikasi
                    </span>
                  )}
                </div>
              </div>

              {/* Tenor Rates Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Persentase MDR Cicilan per Tenor:</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {isLocked ? 'Mode proteksi aktif (buka kunci untuk mengubah)' : 'Input nilai persen (0 untuk bebas MDR)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {EDITABLE_TENORS.map(tenor => {
                    const currentRate = activeBankRule.rates[tenor];
                    const isTenorActive = currentRate !== undefined;
                    const percentVal = isTenorActive ? (currentRate * 100).toFixed(2).replace(/\.00$/, '') : '';

                    return (
                      <div
                        key={tenor}
                        className={cn(
                          "p-3 rounded-xl border transition-all space-y-2",
                          isTenorActive
                            ? "bg-slate-50/70 border-slate-200"
                            : "bg-slate-50/30 border-slate-200/50 opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            Tenor {tenor}
                          </span>
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleToggleTenor(selectedBankKey, tenor)}
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors",
                              isLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                              isTenorActive
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                            )}
                          >
                            {isTenorActive ? 'Aktif' : 'Non-Aktif'}
                          </button>
                        </div>

                        {isTenorActive ? (
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="30"
                              disabled={isLocked}
                              readOnly={isLocked}
                              value={percentVal}
                              onChange={e => handleRateChange(selectedBankKey, tenor, e.target.value)}
                              placeholder="0.0"
                              className={cn(
                                "w-full pl-3 pr-8 py-1.5 rounded-lg border font-mono font-bold text-sm focus:outline-none transition-colors",
                                isLocked
                                  ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                                  : "bg-white text-slate-900 border-slate-200 focus:ring-1 focus:ring-emerald-500"
                              )}
                            />
                            <span className="absolute right-3 top-2 font-mono font-bold text-xs text-slate-400">%</span>
                          </div>
                        ) : (
                          <div className="py-1.5 text-center text-xs text-slate-400 font-mono italic">
                            Tidak Tersedia
                          </div>
                        )}

                        {isTenorActive && (
                          <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-200/60 font-mono">
                            <span>Beban Rp 50 Jt:</span>
                            <strong className={currentRate === 0 ? "text-emerald-700" : "text-slate-800"}>
                              Rp {formatCurrency(Math.round(50000000 * (currentRate || 0)))}
                            </strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* General Rules Config */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                {/* Min Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Syarat Minimum Transaksi (IDR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 font-mono font-bold text-xs text-slate-400">Rp</span>
                    <input
                      type="number"
                      step="5000000"
                      disabled={isLocked}
                      readOnly={isLocked}
                      value={activeBankRule.minAmount || ''}
                      onChange={e => handleFieldChange(selectedBankKey, 'minAmount', Number(e.target.value || 0))}
                      className={cn(
                        "w-full pl-9 pr-4 py-1.5 rounded-xl border font-mono font-bold text-xs focus:outline-none transition-colors",
                        isLocked
                          ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                          : "bg-white text-slate-900 border-slate-200 focus:ring-1 focus:ring-emerald-500"
                      )}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Cth: 10000000, 30000000, atau 50000000.</p>
                </div>

                {/* Admin Fee */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Biaya Admin Billing Nasabah (IDR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 font-mono font-bold text-xs text-slate-400">Rp</span>
                    <input
                      type="number"
                      step="5000"
                      disabled={isLocked}
                      readOnly={isLocked}
                      value={activeBankRule.adminFee || 0}
                      onChange={e => handleFieldChange(selectedBankKey, 'adminFee', Number(e.target.value || 0))}
                      className={cn(
                        "w-full pl-9 pr-4 py-1.5 rounded-xl border font-mono font-bold text-xs focus:outline-none transition-colors",
                        isLocked
                          ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                          : "bg-white text-slate-900 border-slate-200 focus:ring-1 focus:ring-emerald-500"
                      )}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Isi 0 jika bebas biaya admin nasabah.</p>
                </div>

                {/* Process Method */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Metode Pemrosesan Kasir
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleFieldChange(selectedBankKey, 'processMethod', 'EDC')}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-xl border text-xs font-bold transition-all",
                        isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer",
                        activeBankRule.processMethod === 'EDC'
                          ? "bg-emerald-50 text-emerald-900 border-emerald-400 shadow-2xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      Mesin EDC Langsung
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleFieldChange(selectedBankKey, 'processMethod', 'MANUAL_FORM')}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-xl border text-xs font-bold transition-all",
                        isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer",
                        activeBankRule.processMethod === 'MANUAL_FORM'
                          ? "bg-emerald-50 text-emerald-900 border-emerald-400 shadow-2xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      Formulir Manual Bank
                    </button>
                  </div>
                </div>

                {/* Valid Stores */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cakupan Butik Berlaku
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    readOnly={isLocked}
                    value={activeBankRule.validStores || 'Semua Butik BVLGARI'}
                    onChange={e => handleFieldChange(selectedBankKey, 'validStores', e.target.value)}
                    placeholder="Semua Butik BVLGARI"
                    className={cn(
                      "w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none transition-colors",
                      isLocked
                        ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                        : "bg-white text-slate-900 border-slate-200 focus:ring-1 focus:ring-emerald-500"
                    )}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Cth: Plaza Indonesia & Plaza Senayan (DBS).</p>
                </div>
              </div>

              {/* Notes & Memo */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan Memo Kasir & Promo Spesial
                </label>
                <textarea
                  rows={2}
                  disabled={isLocked}
                  readOnly={isLocked}
                  value={activeBankRule.notes || ''}
                  onChange={e => handleFieldChange(selectedBankKey, 'notes', e.target.value)}
                  placeholder="Catatan ketentuan kartu, tanggal promo diskon, atau instruksi khusus..."
                  className={cn(
                    "w-full px-3 py-2 rounded-xl border text-xs focus:outline-none resize-none transition-colors",
                    isLocked
                      ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                      : "bg-white text-slate-900 border-slate-200 focus:ring-1 focus:ring-emerald-500"
                  )}
                />
              </div>

              {/* Bottom Quick Save */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {isLocked
                    ? 'Konfigurasi sedang terkunci. Buka kunci untuk menyimpan perubahan.'
                    : 'Perubahan akan disimpan untuk semua bank saat menekan tombol Simpan Perubahan MDR.'}
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges || isLocked}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs",
                    isLocked
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      : hasChanges
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 cursor-pointer"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  )}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isLocked ? 'Terkunci' : saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
              Pilih bank dari daftar di sebelah kiri untuk melihat dan mengedit konfigurasinya.
            </div>
          )}
        </div>
      </div>

      {/* Section: Tarif MDR per Card Type / Jaringan Kartu (Terutama AMEX, Alipay, WeChat, UnionPay, JCB) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-5 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-amber-50 text-amber-900 border border-amber-200 uppercase">
                CARD TYPE MDR SETUP
              </span>
              <span className="text-xs text-slate-400 font-medium">Khusus AMEX, Cross-Border E-Wallets & Jaringan Kartu</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-1">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <span>Tarif MDR per Card Type (Terutama AMEX, Alipay, WeChat Pay)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Konfigurasi persentase komisi MDR untuk masing-masing jenis kartu. AMEX memiliki tarif jaringan mandiri (standar 5.00%), serta dompet digital Alipay dan WeChat Pay (cross-border) yang dapat diatur secara dinamis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges || isLocked}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs",
                isLocked
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : hasChanges
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 cursor-pointer"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              )}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isLocked ? 'Terkunci' : saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </div>

        {/* Priority Callout for AMEX, Alipay & WeChat */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-950 font-bold">Ketentuan Khusus Kartu AMEX (BCA / Global)</strong>
              <span className="text-amber-800 text-[11px] leading-relaxed">
                Kartu American Express (AMEX) wajib diproses pada mesin EDC BCA. Persentase komisi standar adalah <strong>{((cardTypeRates['AMEX'] ?? 0.05) * 100).toFixed(2)}%</strong> (berlaku untuk transaksi reguler maupun cicilan).
              </span>
            </div>
          </div>

          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5 flex items-start gap-3 text-xs">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sky-950 font-bold">Transaksi Alipay & WeChat Pay (Cross-Border)</strong>
              <span className="text-sky-800 text-[11px] leading-relaxed">
                Dompet digital turis mancanegara (Alipay & WeChat) diproses melalui terminal EDC BCA dengan settlement valas ke IDR. Persentase MDR standar saat ini adalah <strong>{((cardTypeRates['ALIPAY'] ?? 0.02) * 100).toFixed(2)}%</strong>.
              </span>
            </div>
          </div>
        </div>

        {/* Card Type Rates Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[220px]">Card Type / Jaringan</th>
                <th className="py-3 px-4 min-w-[150px]">Kategori & Tag</th>
                <th className="py-3 px-4 min-w-[160px]">
                  <div className="flex items-center gap-1">
                    <span>Tarif MDR (%)</span>
                    <span className="text-[10px] text-emerald-700 font-bold lowercase">(komisi)</span>
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[180px]">Simulasi per Rp 50 Jt</th>
                <th className="py-3 px-4 min-w-[110px]">Status</th>
                <th className="py-3 px-4 text-right min-w-[90px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.keys(cardTypeRates).map(cardKey => {
                const rate = cardTypeRates[cardKey] ?? DEFAULT_CARD_TYPE_RATES[cardKey] ?? 0.017;
                const defaultRate = DEFAULT_CARD_TYPE_RATES[cardKey] ?? 0.017;
                const isCustom = rate !== defaultRate;
                const info = CARD_TYPE_DISPLAY_INFO[cardKey] || {
                  fullName: `Kartu ${cardKey}`,
                  description: 'Tarif komisi kartu.',
                  badge: 'Jaringan',
                  badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
                };
                const isAmex = cardKey === 'AMEX';
                const isAlipay = cardKey === 'ALIPAY';
                const isWechat = cardKey === 'WECHAT';

                const feeSim = Math.round(50000000 * rate);

                return (
                  <tr
                    key={cardKey}
                    className={cn(
                      "transition-colors",
                      isAmex
                        ? "bg-amber-50/40 hover:bg-amber-50/70"
                        : isAlipay
                          ? "bg-sky-50/20 hover:bg-sky-50/40"
                          : isWechat
                            ? "bg-emerald-50/20 hover:bg-emerald-50/40"
                            : "hover:bg-slate-50/70"
                    )}
                  >
                    {/* Card Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border",
                          isAmex
                            ? "bg-amber-100 text-amber-900 border-amber-300"
                            : isAlipay
                              ? "bg-sky-100 text-sky-800 border-sky-300"
                              : isWechat
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-slate-100 text-slate-800 border-slate-200"
                        )}>
                          {cardKey.slice(0, 3).toUpperCase()}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{cardKey}</span>
                            {isAmex && <span className="text-[10px] text-amber-600 font-bold">★ Prioritas</span>}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {info.fullName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tag & Description */}
                    <td className="py-3.5 px-4">
                      <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-bold border", info.badgeColor)}>
                        {info.badge}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1 max-w-xs truncate" title={info.description}>
                        {info.description}
                      </div>
                    </td>

                    {/* MDR % Input */}
                    <td className="py-3.5 px-4">
                      <div className="relative w-32">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          disabled={isLocked}
                          value={(rate * 100).toFixed(2)}
                          onChange={e => handleCardTypeRateChange(cardKey, e.target.value)}
                          className={cn(
                            "w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-xs text-right pr-6 focus:outline-none transition-colors",
                            isLocked
                              ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                              : isAmex
                                ? "bg-white text-amber-950 border-amber-300 focus:ring-1 focus:ring-amber-500"
                                : "bg-white text-slate-900 border-slate-300 focus:ring-1 focus:ring-emerald-500"
                          )}
                        />
                        <span className="absolute right-2 top-1.5 font-mono text-xs text-slate-400">%</span>
                      </div>
                    </td>

                    {/* Simulation Column */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-bold text-slate-800">
                        {formatCurrency(feeSim)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        per Rp 50.000.000
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border",
                        isCustom
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      )}>
                        {isCustom ? 'Kustom' : 'Standar'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleResetCardType(cardKey)}
                        disabled={isLocked || !isCustom}
                        className="px-2 py-1 rounded text-[10px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Reset
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Tarif Gesek Reguler Mesin EDC Kartu Kredit (On-Us vs Off-Us) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-5 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                SMART RULE ENGINE
              </span>
              <span className="text-xs text-slate-400 font-medium">Full Payment & Cross-EDC Settlement</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-1">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>Tarif Gesek Reguler Mesin EDC Kartu Kredit (On-Us vs Off-Us)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              SOP Perbankan Ritel: Kartu kredit reguler yang digesek pada EDC bank yang sama dikenakan rate On-Us (misal: BCA di EDC BCA = 1.70%). Jika digesek pada EDC bank berbeda (cross-EDC, misal: Kartu HSBC di EDC BCA), otomatis berlaku rate Off-Us (2.00%).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges || isLocked}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs",
                isLocked
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : hasChanges
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 cursor-pointer"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              )}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isLocked ? 'Terkunci' : saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </div>

        {/* Informative Callout: Contoh Kasus HSBC di EDC BCA */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Aturan Transaksi Kartu Beda EDC (Contoh: Kartu HSBC di EDC BCA)</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed pl-6">
              • <strong>Full Payment / Reguler:</strong> Kartu HSBC yang digesek di EDC BCA terdeteksi sebagai <strong>Off-Us</strong> dengan komisi <strong>{((creditEdcRates['BCA']?.offUs ?? 0.02) * 100).toFixed(2)}%</strong> (bukan tarif On-Us BCA 1.70%).<br/>
              • <strong>Cicilan 0% HSBC:</strong> Tetap menggunakan rate program cicilan HSBC (6 bln = 3.5%, 12 bln = 5.0%) dan form manual penagihan ke HSBC.<br/>
              • <strong>Cicilan 0% Bank EDC (Mandiri/CIMB/BRI/BNI):</strong> Kasir akan diperingatkan untuk menggunakan EDC bank penerbit terkait.
            </p>
          </div>
        </div>

        {/* Batch Controls for EDC Credit Rates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
          {/* Batch On-Us */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800">Setel On-Us Semua EDC</div>
              <div className="text-[11px] text-slate-500">Tarif saat kartu kredit digesek di mesin EDC bank yang sama</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-24">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  disabled={isLocked}
                  value={batchCreditOnUsInput}
                  onChange={e => setBatchCreditOnUsInput(e.target.value)}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-xs text-slate-900 text-right pr-6 focus:outline-none",
                    isLocked ? "bg-slate-100 cursor-not-allowed border-slate-200" : "bg-white border-slate-300 focus:ring-1 focus:ring-emerald-500"
                  )}
                />
                <span className="absolute right-2 top-1.5 font-mono text-xs text-slate-400">%</span>
              </div>
              <button
                type="button"
                disabled={isLocked}
                onClick={handleApplyBatchCreditOnUs}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs",
                  isLocked
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                )}
              >
                Terapkan
              </button>
            </div>
          </div>

          {/* Batch Off-Us */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800">Setel Off-Us Semua EDC</div>
              <div className="text-[11px] text-slate-500">Tarif saat kartu bank lain digesek di EDC ini (misal HSBC di EDC BCA)</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-24">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  disabled={isLocked}
                  value={batchCreditOffUsInput}
                  onChange={e => setBatchCreditOffUsInput(e.target.value)}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-xs text-slate-900 text-right pr-6 focus:outline-none",
                    isLocked ? "bg-slate-100 cursor-not-allowed border-slate-200" : "bg-white border-slate-300 focus:ring-1 focus:ring-emerald-500"
                  )}
                />
                <span className="absolute right-2 top-1.5 font-mono text-xs text-slate-400">%</span>
              </div>
              <button
                type="button"
                disabled={isLocked}
                onClick={handleApplyBatchCreditOffUs}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs",
                  isLocked
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                )}
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>

        {/* EDC Rates Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[200px]">Mesin EDC (Acquirer Bank)</th>
                <th className="py-3 px-4 min-w-[170px]">
                  <div className="flex items-center gap-1">
                    <span>Tarif On-Us (Kartu Sama)</span>
                    <span className="text-[10px] text-emerald-700 font-bold lowercase">(kartu = edc)</span>
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[170px]">
                  <div className="flex items-center gap-1">
                    <span>Tarif Off-Us (Cross-EDC)</span>
                    <span className="text-[10px] text-slate-500 font-bold lowercase">(kartu ≠ edc)</span>
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[180px]">Simulasi Komisi per Rp 50 Jt</th>
                <th className="py-3 px-4 min-w-[110px]">Status</th>
                <th className="py-3 px-4 text-right min-w-[90px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.keys(creditEdcRates).map(edcKey => {
                const rule = creditEdcRates[edcKey] || { onUs: 0.017, offUs: 0.020 };
                const defaultRule = DEFAULT_CREDIT_EDC_RATES[edcKey] || { onUs: 0.017, offUs: 0.020 };
                const isCustom = rule.onUs !== defaultRule.onUs || rule.offUs !== defaultRule.offUs;
                const isBca = edcKey === 'BCA';
                const isAmex = edcKey === 'AMEX';

                const feeOnUs = Math.round(50000000 * rule.onUs);
                const feeOffUs = Math.round(50000000 * rule.offUs);

                return (
                  <tr key={edcKey} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border",
                          isBca
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : isAmex
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-slate-100 text-slate-800 border-slate-200"
                        )}>
                          {edcKey.slice(0, 3).toUpperCase()}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{isAmex ? 'Kartu AMEX' : `EDC ${edcKey}`}</span>
                            {isBca && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                Utama
                              </span>
                            )}
                            {isAmex && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                Flat 5.0%
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {isBca
                              ? 'Boutique Primary EDC Terminal'
                              : isAmex
                                ? 'American Express Card Special Rate'
                                : 'EDC Terminal Partner'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* On-Us Rate */}
                    <td className="py-3.5 px-4">
                      <div className="relative w-32">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          disabled={isLocked}
                          value={(rule.onUs * 100).toFixed(2)}
                          onChange={e => handleCreditEdcRateChange(edcKey, 'onUs', e.target.value)}
                          className={cn(
                            "w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-xs text-right pr-6 focus:outline-none transition-colors",
                            isLocked
                              ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                              : "bg-white text-emerald-950 border-emerald-300 focus:ring-1 focus:ring-emerald-500"
                          )}
                        />
                        <span className="absolute right-2 top-1.5 font-mono text-xs text-slate-400">%</span>
                      </div>
                    </td>

                    {/* Off-Us Rate */}
                    <td className="py-3.5 px-4">
                      <div className="relative w-32">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          disabled={isLocked}
                          value={(rule.offUs * 100).toFixed(2)}
                          onChange={e => handleCreditEdcRateChange(edcKey, 'offUs', e.target.value)}
                          className={cn(
                            "w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-xs text-right pr-6 focus:outline-none transition-colors",
                            isLocked
                              ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                              : "bg-white text-slate-900 border-slate-300 focus:ring-1 focus:ring-emerald-500"
                          )}
                        />
                        <span className="absolute right-2 top-1.5 font-mono text-xs text-slate-400">%</span>
                      </div>
                    </td>

                    {/* Simulation Column */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5 text-emerald-800">
                          <span className="text-[10px] text-slate-400 font-sans">On-Us:</span>
                          <strong>{formatCurrency(feeOnUs)}</strong>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="text-[10px] text-slate-400 font-sans">Off-Us:</span>
                          <span>{formatCurrency(feeOffUs)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border",
                        isCustom
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      )}>
                        {isCustom ? 'Kustom' : 'Standar'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleResetCreditEdc(edcKey)}
                        disabled={isLocked || !isCustom}
                        className="px-2 py-1 rounded text-[10px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Reset
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

      {/* Debit Card Setup Cockpit */}
      {activeCategory === 'DEBIT' && (
        <div className="space-y-6">

          {/* 1. Header & Summary KPI Tiles */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-emerald-600" />
                  <span>Konfigurasi MDR Kartu Debit per Bank (11 Bank & EDC Settlement)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pengaturan komisi MDR untuk setiap bank penerbit kartu debit saat digesek pada EDC bank yang sama (On-Us) maupun EDC bank lain (Off-Us).
                </p>
              </div>

              {isLocked ? (
                <button
                  type="button"
                  onClick={() => setUnlockModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Terkunci — Klik untuk Buka Edit</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 self-start sm:self-auto">
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mode Edit Aktif</span>
                </span>
              )}
            </div>

            {/* 4 Summary KPI Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tile 1: Kartu BCA SOP Ritel */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
                    Kartu Utama Butik
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-emerald-800 border border-emerald-200">
                    BCA Priority
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900">
                  Debit BCA: On-Us / Off-Us
                </div>
                <div className="font-mono font-black text-lg text-emerald-950">
                  {((debitBankRates['BCA']?.onUs ?? 0.005) * 100).toFixed(2)}% / {((debitBankRates['BCA']?.offUs ?? 0.010) * 100).toFixed(2)}%
                </div>
                <p className="text-[11px] text-slate-500">
                  On-Us di EDC BCA {( (debitBankRates['BCA']?.onUs ?? 0.005) * 100 ).toFixed(2)}%, Off-Us Non-BCA {( (debitBankRates['BCA']?.offUs ?? 0.010) * 100 ).toFixed(2)}%.
                </p>
              </div>

              {/* Tile 2: Total Bank Terkonfigurasi */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                    Cakupan Mitra Bank
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-slate-700 border border-slate-200">
                    11 Bank + Other
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900">
                  Total Bank Terdaftar
                </div>
                <div className="font-mono font-black text-lg text-slate-900">
                  {Object.keys(debitBankRates).length} Bank Debit
                </div>
                <p className="text-[11px] text-slate-500">
                  Setiap bank memiliki pengaturan On-Us dan Off-Us independen.
                </p>
              </div>

              {/* Tile 3: Standar Acuan Global */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                    Standar Acuan BI / GPN
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-slate-700 border border-slate-200">
                    SOP Ritel
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900">
                  Acuan Ritel Nasional
                </div>
                <div className="font-mono font-black text-lg text-slate-900">
                  0.50% / 1.00%
                </div>
                <p className="text-[11px] text-slate-500">
                  Tarif standar umum: On-Us 0.50%, Off-Us antar bank 1.00%.
                </p>
              </div>

              {/* Tile 4: Status Konfigurasi */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                    Status Konfigurasi
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold border",
                    isCustomConfig
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-white text-slate-600 border-slate-200"
                  )}>
                    {isCustomConfig ? 'Kustom Finance' : 'Excel Baseline'}
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900">
                  Penyimpanan Sistem
                </div>
                <div className="font-mono font-black text-lg text-slate-900">
                  {hasDebitChanges ? 'Ada Perubahan' : isCustomConfig ? 'Tersimpan Aktif' : 'Standar Awal'}
                </div>
                <p className="text-[11px] text-slate-500">
                  {lastUpdatedAt ? `Terakhir: ${new Date(lastUpdatedAt).toLocaleDateString('id-ID')}` : 'Mengikuti master standar Excel.'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Global Batch Setter & Quick Search Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span>Alat Pengaturan Cepat (Batch Update ke Semua Bank)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ubah persentase tarif On-Us atau Off-Us untuk seluruh bank sekaligus dalam satu kali klik.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari bank debit... (Mandiri, CIMB, BRI, dll)"
                  value={searchDebitBank}
                  onChange={e => setSearchDebitBank(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            {/* Batch Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              {/* Batch On-Us */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-800">Setel On-Us Semua Bank</div>
                  <div className="text-[11px] text-slate-500">Terapkan tarif saat kartu di-settle di EDC bank yang sama</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-24">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      disabled={isLocked}
                      value={batchOnUsInput}
                      onChange={e => setBatchOnUsInput(e.target.value)}
                      className={cn(
                        "w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-xs text-slate-900 text-right pr-6 focus:outline-none",
                        isLocked ? "bg-slate-100 cursor-not-allowed border-slate-200" : "bg-white border-slate-300 focus:ring-1 focus:ring-emerald-500"
                      )}
                    />
                    <span className="absolute right-2 top-1.5 font-mono text-xs text-slate-400">%</span>
                  </div>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={handleApplyBatchOnUs}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs",
                      isLocked
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    )}
                  >
                    Terapkan Semua
                  </button>
                </div>
              </div>

              {/* Batch Off-Us */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-800">Setel Off-Us Semua Bank</div>
                  <div className="text-[11px] text-slate-500">Terapkan tarif saat kartu di-settle di EDC bank yang berbeda</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-24">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      disabled={isLocked}
                      value={batchOffUsInput}
                      onChange={e => setBatchOffUsInput(e.target.value)}
                      className={cn(
                        "w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold text-xs text-slate-900 text-right pr-6 focus:outline-none",
                        isLocked ? "bg-slate-100 cursor-not-allowed border-slate-200" : "bg-white border-slate-300 focus:ring-1 focus:ring-emerald-500"
                      )}
                    />
                    <span className="absolute right-2 top-1.5 font-mono text-xs text-slate-400">%</span>
                  </div>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={handleApplyBatchOffUs}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs",
                      isLocked
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                    )}
                  >
                    Terapkan Semua
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Granular Per-Bank Debit Rates Configuration Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Matriks Konfigurasi MDR Debit per Bank ({debitBankList.length} Bank)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ubah persentase On-Us dan Off-Us untuk setiap bank secara individual. Otomatis berlaku ke POS kasir dan rekonsiliasi finance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges || isLocked}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs",
                    isLocked
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      : hasChanges
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 cursor-pointer"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  )}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isLocked ? 'Terkunci' : saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 min-w-[200px]">Bank Penerbit Kartu</th>
                    <th className="py-3 px-4 min-w-[170px]">
                      <div className="flex items-center gap-1">
                        <span>Tarif On-Us (EDC Sama)</span>
                        <span className="text-[10px] text-emerald-700 font-bold lowercase">(edc sama)</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 min-w-[170px]">
                      <div className="flex items-center gap-1">
                        <span>Tarif Off-Us (EDC Lain)</span>
                        <span className="text-[10px] text-slate-500 font-bold lowercase">(cross-edc)</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 min-w-[180px]">Simulasi Fee per Rp 10 Jt</th>
                    <th className="py-3 px-4 min-w-[110px]">Status</th>
                    <th className="py-3 px-4 text-right min-w-[100px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {debitBankList.map(bankKey => {
                    const rule = debitBankRates[bankKey] || { onUs: 0.005, offUs: 0.010 };
                    const defaultRule = DEFAULT_DEBIT_BANK_RATES[bankKey] || { onUs: 0.005, offUs: 0.010 };
                    const isCustom = rule.onUs !== defaultRule.onUs || rule.offUs !== defaultRule.offUs;
                    const info = DEBIT_BANK_DISPLAY_INFO[bankKey] || { fullName: `Bank ${bankKey}`, tag: 'Mitra Ritel' };
                    const isBca = bankKey === 'BCA';

                    const feeOnUs = Math.round(10000000 * rule.onUs);
                    const feeOffUs = Math.round(10000000 * rule.offUs);

                    return (
                      <tr key={bankKey} className="hover:bg-slate-50/70 transition-colors">
                        {/* Bank Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border",
                              isBca
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-slate-100 text-slate-800 border-slate-200"
                            )}>
                              {bankKey.slice(0, 3).toUpperCase()}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{bankKey}</span>
                                {isBca && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                    Utama
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {info.fullName}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* On-Us Rate Input */}
                        <td className="py-3.5 px-4">
                          <div className="relative w-32">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              disabled={isLocked}
                              value={(rule.onUs * 100).toFixed(2).replace(/\.00$/, '')}
                              onChange={e => handleDebitBankRateChange(bankKey, 'onUs', e.target.value)}
                              className={cn(
                                "w-full pl-2.5 pr-7 py-1.5 rounded-lg border font-mono font-bold text-xs text-slate-900 transition-colors focus:outline-none",
                                isLocked
                                  ? "bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed select-none"
                                  : "bg-white border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                              )}
                            />
                            <span className="absolute right-2.5 top-1.5 font-mono text-xs font-bold text-slate-400">%</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Kartu {bankKey} → EDC {bankKey}
                          </p>
                        </td>

                        {/* Off-Us Rate Input */}
                        <td className="py-3.5 px-4">
                          <div className="relative w-32">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              disabled={isLocked}
                              value={(rule.offUs * 100).toFixed(2).replace(/\.00$/, '')}
                              onChange={e => handleDebitBankRateChange(bankKey, 'offUs', e.target.value)}
                              className={cn(
                                "w-full pl-2.5 pr-7 py-1.5 rounded-lg border font-mono font-bold text-xs text-slate-900 transition-colors focus:outline-none",
                                isLocked
                                  ? "bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed select-none"
                                  : "bg-white border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                              )}
                            />
                            <span className="absolute right-2.5 top-1.5 font-mono text-xs font-bold text-slate-400">%</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Kartu {bankKey} → EDC Lain
                          </p>
                        </td>

                        {/* Fee per Rp 10 Jt Simulation */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 text-[11px] font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-sans text-[10px]">On-Us:</span>
                              <span className="font-bold text-emerald-800">Rp {formatCurrency(feeOnUs)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-sans text-[10px]">Off-Us:</span>
                              <span className="font-bold text-slate-800">Rp {formatCurrency(feeOffUs)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          {isCustom ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Kustom</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Standar SOP
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            disabled={isLocked || !isCustom}
                            onClick={() => handleResetDebitBank(bankKey)}
                            title="Reset bank ini ke tarif standar"
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors inline-flex items-center gap-1",
                              isLocked || !isCustom
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            )}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {debitBankList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Tidak ada bank yang sesuai dengan kata kunci &quot;{searchDebitBank}&quot;.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Menampilkan <strong>{debitBankList.length}</strong> dari <strong>{Object.keys(debitBankRates).length}</strong> bank penerbit kartu debit terdaftar.
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isLocked || !hasDebitChanges}
                  onClick={() => {
                    if (confirm('Batalkan perubahan kartu debit yang belum disimpan?')) {
                      setDebitBankRates(JSON.parse(JSON.stringify(originalDebitBankRates)));
                      showToast('Perubahan debit dibatalkan.');
                    }
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors",
                    isLocked || !hasDebitChanges
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 cursor-pointer"
                  )}
                >
                  Batal Ubah
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges || isLocked}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs",
                    isLocked
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      : hasChanges
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 cursor-pointer"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  )}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isLocked ? 'Terkunci' : saving ? 'Menyimpan...' : 'Simpan Perubahan MDR'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Live Debit Calculator Simulator */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>Simulasi Perhitungan Live Kartu Debit per Bank</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Uji coba akurasi nominal potongan komisi kartu debit sebelum menyimpan ke database
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Nominal Transaksi (Rp)
                </label>
                <input
                  type="number"
                  value={simDebitAmount}
                  onChange={e => setSimDebitAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Bank Kartu Nasabah
                </label>
                <select
                  value={simBank}
                  onChange={e => setSimBank(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-semibold text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer bg-white"
                >
                  {Object.keys(debitBankRates).map(b => (
                    <option key={b} value={b}>
                      {b} {DEBIT_BANK_DISPLAY_INFO[b]?.fullName ? `(${DEBIT_BANK_DISPLAY_INFO[b].fullName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Mesin EDC Settle
                </label>
                <select
                  value={simEdc}
                  onChange={e => setSimEdc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-semibold text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer bg-white"
                >
                  {COMMON_BOUTIQUE_EDCS.map(edc => (
                    <option key={edc} value={edc}>EDC {edc}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-center">
                <div className="text-[11px] text-slate-500 font-medium">MDR Terhitung:</div>
                <div className="font-mono font-extrabold text-sm text-slate-900">
                  {(() => {
                    const isSame = simBank !== '--' && simEdc !== '--' && simBank.toLowerCase() === simEdc.toLowerCase();
                    const bankRule = debitBankRates[simBank] || debitBankRates['Other'] || { onUs: onUsRate, offUs: offUsRate };
                    const rate = isSame ? bankRule.onUs : bankRule.offUs;
                    return `${(rate * 100).toFixed(2)}%`;
                  })()}
                </div>
              </div>
            </div>

            {/* Result Cockpit Card */}
            {(() => {
              const isSame = simBank !== '--' && simEdc !== '--' && simBank.toLowerCase() === simEdc.toLowerCase();
              const bankRule = debitBankRates[simBank] || debitBankRates['Other'] || { onUs: onUsRate, offUs: offUsRate };
              const rate = isSame ? bankRule.onUs : bankRule.offUs;
              const scenario = isSame
                ? `Kartu ${simBank} di-settle ke EDC ${simEdc} (On-Us EDC Sama)`
                : `Kartu ${simBank} di-settle ke EDC ${simEdc} (Off-Us Cross-EDC)`;

              const comm = Math.round(simDebitAmount * rate);
              const net = simDebitAmount - comm;

              return (
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] text-emerald-800 font-semibold uppercase tracking-wider mb-0.5">
                      Kondisi: {scenario}
                    </div>
                    <div className="text-xs text-slate-600 font-semibold">Potongan Komisi Bank (Card Comm):</div>
                    <div className="font-mono font-black text-lg text-emerald-950">
                      Rp {formatCurrency(comm)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-600 font-semibold">Estimasi Bersih Masuk Rekening Butik:</div>
                    <div className="font-mono font-black text-lg text-slate-900">
                      Rp {formatCurrency(net)}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Unlock Verification Modal */}
      <AnimatePresence>
        {unlockModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUnlockModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-10 space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Verifikasi Otorisasi Finance
                    </h3>
                    <p className="text-xs text-slate-500">
                      Buka proteksi untuk mengubah persentase MDR bank
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUnlockModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Proteksi Perubahan Konfigurasi</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Pengaturan MDR diproteksi karena jarang diubah dan berdampak langsung ke perhitungan komisi kasir POS di seluruh butik BVLGARI.
                </p>
              </div>

              <form onSubmit={handleVerifyUnlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    PIN Keamanan / Otorisasi
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      autoFocus
                      maxLength={20}
                      placeholder="Masukkan PIN otorisasi..."
                      value={pinInput}
                      onChange={e => {
                        setPinInput(e.target.value);
                        setPinError('');
                      }}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono tracking-widest text-slate-900 focus:outline-none transition-colors",
                        pinError
                          ? "border-slate-800 ring-1 ring-slate-800 bg-slate-50"
                          : "border-slate-200 focus:ring-1 focus:ring-emerald-500 bg-white"
                      )}
                    />
                  </div>
                  {pinError ? (
                    <p className="text-[11px] font-semibold text-slate-900 mt-1.5 flex items-center gap-1">
                      ⚠️ {pinError}
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-800 font-medium mt-1.5 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>PIN default otoritas: <strong>1234</strong></span>
                    </p>
                  )}
                </div>

                {/* Quick Account Authorization for logged in admin/finance */}
                {isAdmin && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleAdminDirectUnlock}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-900 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Otorisasi Cepat sebagai Akun {userEmail ? userEmail.split('@')[0] : 'Finance Admin'}</span>
                    </button>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setUnlockModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Verifikasi & Buka Kunci</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

import { supabase } from '@/lib/supabase';
import { InvoiceItem } from './invoiceService';

export const PAYMENT_TYPES = [
  '--',
  'Cash',
  'Credit Card',
  'Debit Card',
  'Deposit',
  'Link Payment',
  'QRIS',
  'Rounding',
  'Transfer',
  'Voucher',
] as const;

export type PaymentType = typeof PAYMENT_TYPES[number];

export const EDC_OPTIONS = [
  '--',
  'AMEX',
  'BCA',
  'BNI',
  'BRI',
  'CIMB Niaga',
  'CitiBank',
  'Danamon',
  'HSBC',
  'Mandiri',
  'MayBank',
  'OCBC',
  'Permata',
  'UOB',
  'Other',
] as const;

export type EdcOption = typeof EDC_OPTIONS[number];

export const CARD_TYPES = [
  '--',
  'AMEX',
  'BCA CARD',
  'JCB',
  'MASTER',
  'UNIONPAY',
  'VISA',
  'Other',
] as const;

export type CardTypeOption = typeof CARD_TYPES[number];

export const INSTALLMENT_OPTIONS = [
  '--',
  '3 mth',
  '6 mth',
  '12 mth',
  '18 mth',
  '24 mth',
  '36 mth',
] as const;

export type InstallmentOption = typeof INSTALLMENT_OPTIONS[number];

export const BANK_OPTIONS = [
  '--',
  'BCA',
  'BNI',
  'BRI',
  'CIMB Niaga',
  'Danamon',
  'DBS',
  'HSBC',
  'Mandiri',
  'OCBC',
  'Permata',
  'AMEX',
  'MayBank',
  'CitiBank',
  'UOB',
  'Other',
] as const;

export type BankOption = typeof BANK_OPTIONS[number];

export interface PaymentSplitRow {
  id: string;
  paymentType: PaymentType;
  edc: EdcOption;
  installment: InstallmentOption;
  bank: BankOption;
  cardType: CardTypeOption;
  amount: number;
  mdrPct: number;
  cardComm: number;
  processMethod?: 'EDC' | 'MANUAL_FORM';
  warningNote?: string;
}

// Master MDR Rules from "Cicilan 0% Bvlgari & Kerjasama Mall.xlsx"
export interface BankMdrRule {
  bank: string;
  minAmount: number;
  rates: Partial<Record<InstallmentOption, number>>;
  processMethod: 'EDC' | 'MANUAL_FORM';
  adminFee?: number;
  notes?: string;
  validStores?: string;
}

export const BANK_MDR_RULES: Record<string, BankMdrRule> = {
  'AMEX': {
    bank: 'AMEX BCA',
    minAmount: 30000000,
    rates: { '3 mth': 0.05, '6 mth': 0.05, '12 mth': 0.05 },
    processMethod: 'EDC',
    notes: 'Min. Rp 30 Jt. Tenor 24/36m dibukakan khusus tactical event.',
  },
  'BCA': {
    bank: 'BCA (Visa & Mastercard)',
    minAmount: 30000000,
    rates: {
      '3 mth': 0.03, // Min 10jt khusus 3 bln
      '6 mth': 0.04,
      '12 mth': 0.05,
      '24 mth': 0.08,
      '36 mth': 0.15,
    },
    processMethod: 'EDC',
    notes: 'Min. Rp 10 Jt untuk 3 bln, Rp 30 Jt untuk 6 & 12 bln.',
  },
  'BNI': {
    bank: 'BNI',
    minAmount: 30000000,
    rates: {
      '6 mth': 0.05,
      '12 mth': 0.07,
      '18 mth': 0.08,
      '24 mth': 0.09,
    },
    processMethod: 'EDC',
    notes: 'Min. Rp 30 Jt. Exclude Hasanah Card & Corporate Card.',
  },
  'BRI': {
    bank: 'BRI',
    minAmount: 30000000,
    rates: {
      '3 mth': 0.02,
      '6 mth': 0.02,
      '12 mth': 0.03,
      '18 mth': 0.03,
      '24 mth': 0.03,
    },
    processMethod: 'EDC',
    notes: 'Min. Rp 30 Jt. Promo khusus diskon 10% tgl 25-30 setiap bulan.',
  },
  'CIMB Niaga': {
    bank: 'CIMB Niaga',
    minAmount: 50000000,
    rates: {
      '6 mth': 0.0175,
      '12 mth': 0.0175,
      '24 mth': 0.0175,
    },
    processMethod: 'EDC',
    notes: 'Min. Rp 50 Jt. MDR Flat 1.75%. Save up to 100% with Poin Xtra.',
  },
  'Danamon': {
    bank: 'Danamon',
    minAmount: 30000000,
    rates: {
      '3 mth': 0.0,
      '6 mth': 0.0,
      '12 mth': 0.018,
    },
    processMethod: 'MANUAL_FORM',
    adminFee: 15000,
    notes: 'Min. Rp 30 Jt. Biaya admin nasabah Rp 15.000. Butuh Form Manual.',
  },
  'DBS': {
    bank: 'DBS (Digibank)',
    minAmount: 30000000,
    rates: {
      '3 mth': 0.02,
      '6 mth': 0.03,
      '12 mth': 0.04,
    },
    processMethod: 'MANUAL_FORM',
    adminFee: 15000,
    validStores: 'Plaza Indonesia & Plaza Senayan',
    notes: 'Min. Rp 30 Jt. Admin nasabah Rp 15.000. Khusus Butik PI & PS.',
  },
  'HSBC': {
    bank: 'HSBC',
    minAmount: 30000000,
    rates: {
      '6 mth': 0.035,
      '12 mth': 0.05,
    },
    processMethod: 'MANUAL_FORM',
    notes: 'Min. Rp 30 Jt. Butuh Form Manual ke Bank.',
  },
  'Mandiri': {
    bank: 'Mandiri',
    minAmount: 30000000,
    rates: {
      '6 mth': 0.04,
      '12 mth': 0.05,
      '18 mth': 0.08,
    },
    processMethod: 'EDC',
    notes: 'Min. Rp 30 Jt. Mesin EDC Mandiri.',
  },
  'OCBC': {
    bank: 'OCBC (NISP)',
    minAmount: 30000000,
    rates: {
      '3 mth': 0.0,
      '6 mth': 0.0,
      '12 mth': 0.0,
      '18 mth': 0.0,
      '24 mth': 0.0,
    },
    processMethod: 'MANUAL_FORM',
    adminFee: 15000,
    notes: 'Min. Rp 30 Jt. Bebas MDR (0%) hingga 24 bln. Form Manual.',
  },
  'Permata': {
    bank: 'Permata Bank',
    minAmount: 30000000,
    rates: {
      '3 mth': 0.0,
      '6 mth': 0.0,
      '12 mth': 0.05,
    },
    processMethod: 'MANUAL_FORM',
    adminFee: 25000,
    notes: 'Min. Rp 30 Jt. Bebas MDR (0%) tenor 3 & 6 bln. Form Manual.',
  },
};

// Payment Link BCA Rates
export const PAYMENT_LINK_RATES: Partial<Record<InstallmentOption, number>> = {
  '--': 0.017,
  '3 mth': 0.03,
  '6 mth': 0.06,
  '12 mth': 0.09,
};

// Regular EDC Swipe Rates (when Installment is '--')
export const REGULAR_EDC_SWIPE_RATES: Record<string, number> = {
  'BCA': 0.017,     // 1.7%
  'MayBank': 0.015, // 1.5%
  'Mandiri': 0.015, // 1.5%
  'CIMB Niaga': 0.015, // 1.5%
  'BNI': 0.015,     // 1.5%
  'BRI': 0.015,     // 1.5%
  'AMEX': 0.05,     // 5.0%
  'default': 0.017, // 1.7%
};

export interface BankDebitRate {
  onUs: number; // e.g. 0.005 = 0.50% (settled on same bank's EDC)
  offUs: number; // e.g. 0.010 = 1.00% (settled on different bank's EDC)
}

export const DEBIT_SUPPORTED_BANKS = [
  'BCA',
  'Mandiri',
  'CIMB Niaga',
  'BNI',
  'BRI',
  'Danamon',
  'Permata',
  'MayBank',
  'OCBC',
  'HSBC',
  'DBS',
  'Other',
] as const;

export type DebitSupportedBank = typeof DEBIT_SUPPORTED_BANKS[number];

export const DEFAULT_DEBIT_BANK_RATES: Record<string, BankDebitRate> = {
  'BCA': { onUs: 0.005, offUs: 0.010 },
  'Mandiri': { onUs: 0.005, offUs: 0.010 },
  'CIMB Niaga': { onUs: 0.005, offUs: 0.010 },
  'BNI': { onUs: 0.005, offUs: 0.010 },
  'BRI': { onUs: 0.005, offUs: 0.010 },
  'Danamon': { onUs: 0.005, offUs: 0.010 },
  'Permata': { onUs: 0.005, offUs: 0.010 },
  'MayBank': { onUs: 0.005, offUs: 0.010 },
  'OCBC': { onUs: 0.005, offUs: 0.010 },
  'HSBC': { onUs: 0.005, offUs: 0.010 },
  'DBS': { onUs: 0.005, offUs: 0.010 },
  'Other': { onUs: 0.005, offUs: 0.010 },
};

export interface DebitConfig {
  defaultRate: number; // e.g. 0.010 = 1.00% (fallback default)
  bcaOnUsRate: number; // 0.005 = 0.50% (Kartu BCA di EDC BCA)
  bcaOffUsRate: number; // 0.010 = 1.00% (Kartu BCA di EDC Non-BCA)
  onUsRate: number; // 0.005 = 0.50% (Default On-Us)
  offUsRate: number; // 0.010 = 1.00% (Default Off-Us)
  bankRates: Record<string, BankDebitRate>; // Configurable On-Us and Off-Us per bank
  edcRates?: Record<string, number>;
}

export const DEFAULT_DEBIT_CONFIG: DebitConfig = {
  defaultRate: 0.010, // 1.00%
  bcaOnUsRate: 0.005, // 0.50%
  bcaOffUsRate: 0.010, // 1.00%
  onUsRate: 0.005, // 0.50%
  offUsRate: 0.010, // 1.00%
  bankRates: { ...DEFAULT_DEBIT_BANK_RATES },
  edcRates: {},
};

/**
 * Smart Rule Engine to compute MDR rate (%) and Card Commission (IDR)
 */
export function computePaymentMdr(
  split: {
    paymentType: PaymentType;
    edc: EdcOption;
    installment: InstallmentOption;
    bank: BankOption;
    cardType: CardTypeOption;
    amount: number;
  },
  customRules?: Record<string, BankMdrRule>,
  debitConfig?: DebitConfig
): {
  mdrPct: number;
  cardComm: number;
  processMethod: 'EDC' | 'MANUAL_FORM';
  warningNote?: string;
} {
  const { paymentType, edc, installment, bank, amount } = split;

  // 1. Non-Card Zero MDR
  if (['Cash', 'Transfer', 'Deposit', 'Voucher', 'Rounding', '--'].includes(paymentType)) {
    return {
      mdrPct: 0.0,
      cardComm: 0,
      processMethod: 'EDC',
    };
  }

  // 2. Link Payment (BCA Payment Link)
  if (paymentType === 'Link Payment') {
    if (installment === '24 mth' || installment === '36 mth') {
      return {
        mdrPct: 0.0,
        cardComm: 0,
        processMethod: 'EDC',
        warningNote: 'Tenor 24/36 bulan tidak diaktifkan pada Payment Link BCA.',
      };
    }
    const rate = PAYMENT_LINK_RATES[installment] ?? 0.017;
    let warning: string | undefined;
    if (installment !== '--' && amount > 0 && amount < 10000000) {
      warning = 'Min. transaksi cicilan Payment Link BCA adalah Rp 10.000.000.';
    }
    return {
      mdrPct: rate,
      cardComm: Math.round(amount * rate),
      processMethod: 'EDC',
      warningNote: warning,
    };
  }

  // 3. QRIS (Dynamic QRIS EDC / Static QRIS)
  // Regulasi Bank Indonesia (PADG No. 24/1/PADG/2022): MDR 0.70% untuk Kategori Usaha Menengah & Besar (UMB / Retail Mewah).
  // Limit transaksi standar QRIS BI: Rp 10.000.000 per scan.
  if (paymentType === 'QRIS') {
    const qrisRate = 0.007; // 0.70%
    let warning: string | undefined;

    if (amount > 10000000) {
      warning = 'Regulasi BI: Limit standar transaksi QRIS adalah maks. Rp 10.000.000 per scan. Untuk nominal di atas limit, lakukan split scan QRIS atau pastikan limit harian nasabah mencukupi.';
    }

    return {
      mdrPct: qrisRate,
      cardComm: Math.round(amount * qrisRate),
      processMethod: 'EDC',
      warningNote: warning,
    };
  }

  // 4. Debit Card (Aturan On-Us vs Off-Us granular per-bank penerbit)
  if (paymentType === 'Debit Card') {
    const cardBank = bank !== '--' ? bank : (edc !== '--' ? edc : 'BCA');
    const settleEdc = edc !== '--' ? edc : 'BCA';
    const isSameBank = cardBank.toLowerCase() === settleEdc.toLowerCase();

    // Check bankRates map from custom debitConfig or fallback to DEFAULT_DEBIT_CONFIG
    const activeBankRates = debitConfig?.bankRates || DEFAULT_DEBIT_CONFIG.bankRates;
    const fallbackOnUs = debitConfig?.onUsRate ?? DEFAULT_DEBIT_CONFIG.onUsRate;
    const fallbackOffUs = debitConfig?.offUsRate ?? DEFAULT_DEBIT_CONFIG.offUsRate;

    // Look up specific bank configuration
    let bankRule: BankDebitRate | undefined = activeBankRates[cardBank];
    if (!bankRule) {
      const matchKey = Object.keys(activeBankRates).find(k => k.toLowerCase() === cardBank.toLowerCase());
      if (matchKey) bankRule = activeBankRates[matchKey];
    }
    if (!bankRule) {
      bankRule = activeBankRates['Other'] || { onUs: fallbackOnUs, offUs: fallbackOffUs };
    }

    // Special backward compatibility: if BCA legacy properties were specifically set
    if (cardBank === 'BCA' && typeof debitConfig?.bcaOnUsRate === 'number' && !activeBankRates['BCA']) {
      bankRule = {
        onUs: debitConfig.bcaOnUsRate,
        offUs: typeof debitConfig.bcaOffUsRate === 'number' ? debitConfig.bcaOffUsRate : fallbackOffUs,
      };
    }

    let debitRate = isSameBank ? bankRule.onUs : bankRule.offUs;
    let warning: string | undefined;

    if (!isSameBank) {
      warning = `Kartu Debit ${cardBank} di-settle di EDC ${settleEdc} (Off-Us) dikenakan tarif ${(debitRate * 100).toFixed(2)}%.`;
    }

    return {
      mdrPct: debitRate,
      cardComm: Math.round(amount * debitRate),
      processMethod: 'EDC',
      warningNote: warning,
    };
  }

  // 4. Credit Card
  if (paymentType === 'Credit Card') {
    // If Full Payment / Reguler swipe (non-installment)
    if (installment === '--') {
      const edcKey = edc !== '--' ? edc : 'default';
      const rate = REGULAR_EDC_SWIPE_RATES[edcKey] ?? REGULAR_EDC_SWIPE_RATES['default'];
      return {
        mdrPct: rate,
        cardComm: Math.round(amount * rate),
        processMethod: 'EDC',
      };
    }

    // Installment 0% on Credit Card
    const targetBank = bank !== '--' ? bank : (edc !== '--' ? edc : '');
    const activeRules = customRules ?? BANK_MDR_RULES;
    const bankRule = activeRules[targetBank];

    if (bankRule) {
      const rate = bankRule.rates[installment];
      let warning: string | undefined;

      // Minimum amount validation
      const minRequired = (targetBank === 'BCA' && installment === '3 mth') ? 10000000 : bankRule.minAmount;
      if (amount > 0 && amount < minRequired) {
        warning = `Min. transaksi cicilan ${bankRule.bank} (${installment}) adalah Rp ${minRequired.toLocaleString('id-ID')}.`;
      }

      if (rate !== undefined) {
        return {
          mdrPct: rate,
          cardComm: Math.round(amount * rate),
          processMethod: bankRule.processMethod,
          warningNote: warning,
        };
      } else {
        return {
          mdrPct: 0.017,
          cardComm: Math.round(amount * 0.017),
          processMethod: bankRule.processMethod,
          warningNote: `Tenor ${installment} tidak terdaftar pada program cicilan 0% ${bankRule.bank}. Menggunakan rate standar reguler 1.7%.`,
        };
      }
    }

    // Fallback if bank is not in standard installment list
    const fallbackRate = 0.017;
    return {
      mdrPct: fallbackRate,
      cardComm: Math.round(amount * fallbackRate),
      processMethod: 'EDC',
      warningNote: 'Bank belum terdaftar pada program cicilan khusus. Menggunakan standar EDC 1.7%.',
    };
  }

  return {
    mdrPct: 0.0,
    cardComm: 0,
    processMethod: 'EDC',
  };
}

/**
 * Distribute total card commission proportionally across invoice items.
 * Uses exact remainder allocation to prevent 1-rupiah rounding drift.
 */
export function distributeCommToItems(
  items: InvoiceItem[],
  totalComm: number
): { itemId: number; comm: number }[] {
  if (!items || items.length === 0) return [];
  if (items.length === 1) {
    return [{ itemId: items[0].id, comm: totalComm }];
  }

  const totalNet = items.reduce((sum, item) => sum + (item.net_sales || 0), 0);
  if (totalNet <= 0) {
    // If total net is 0, distribute equally
    const share = Math.round(totalComm / items.length);
    let assigned = 0;
    return items.map((item, idx) => {
      const isLast = idx === items.length - 1;
      const c = isLast ? (totalComm - assigned) : share;
      assigned += c;
      return { itemId: item.id, comm: c };
    });
  }

  let allocated = 0;
  const result: { itemId: number; comm: number }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isLast = i === items.length - 1;

    if (isLast) {
      const remainder = totalComm - allocated;
      result.push({ itemId: item.id, comm: remainder });
    } else {
      const itemRatio = (item.net_sales || 0) / totalNet;
      const itemComm = Math.round(totalComm * itemRatio);
      allocated += itemComm;
      result.push({ itemId: item.id, comm: itemComm });
    }
  }

  return result;
}

/**
 * Save payment splits and update clean_master.comm in Supabase
 */
export async function saveInvoicePaymentSplits(params: {
  transNo: string;
  items: InvoiceItem[];
  splits: PaymentSplitRow[];
  totalCardComm: number;
  userEmail?: string;
}): Promise<void> {
  const { transNo, items, splits, totalCardComm, userEmail } = params;

  // 1. Distribute comm to items
  const itemCommAllocations = distributeCommToItems(items, totalCardComm);

  // 2. Update clean_master.comm in parallel
  const itemUpdates = itemCommAllocations.map(alloc =>
    supabase
      .from('clean_master')
      .update({ comm: alloc.comm })
      .eq('id', alloc.itemId)
  );

  // Also update bvlgari_sales.card_comm if exists
  const bvlgariUpdate = supabase
    .from('bvlgari_sales')
    .update({ card_comm: totalCardComm })
    .eq('transaction_no', transNo);

  // 3. Save splits payload into transaction_records_meta (with graceful fallback if payment_splits column does not exist yet)
  const metaPayload: any = {
    trans_no: transNo,
    updated_at: new Date().toISOString(),
  };
  if (userEmail) {
    metaPayload.updated_by = userEmail.toLowerCase();
  }

  // Try saving with payment_splits column
  const { error: splitColErr } = await supabase
    .from('transaction_records_meta')
    .upsert({
      ...metaPayload,
      payment_splits: splits,
    }, { onConflict: 'trans_no' });

  if (splitColErr) {
    // Graceful fallback: serialize into other_remarks
    const serializedSplits = `[PAYMENT_SPLITS]: ${JSON.stringify(splits)}`;
    await supabase
      .from('transaction_records_meta')
      .upsert({
        ...metaPayload,
        other_remarks: serializedSplits,
      }, { onConflict: 'trans_no' });
  }

  await Promise.all([...itemUpdates, bvlgariUpdate]);
}

/**
 * Loads merged custom MDR rules from Supabase (or fallback to default BANK_MDR_RULES)
 */
export async function getMergedBankMdrRules(): Promise<{
  rules: Record<string, BankMdrRule>;
  debitConfig: DebitConfig;
  isCustom: boolean;
  updatedBy?: string;
  updatedAt?: string;
}> {
  let debitConfig: DebitConfig = { ...DEFAULT_DEBIT_CONFIG };

  try {
    const { data, error } = await supabase
      .from('transaction_records_meta')
      .select('other_remarks, updated_by, updated_at')
      .eq('trans_no', '__CONFIG_MDR_RULES__')
      .maybeSingle();

    if (!error && data?.other_remarks) {
      const parsed = JSON.parse(data.other_remarks);
      if (parsed) {
        if (parsed.debitConfig) {
          const rawBankRates = parsed.debitConfig.bankRates || {};
          const mergedBankRates: Record<string, BankDebitRate> = {};

          // Initialize with default rates for all supported banks
          Object.entries(DEFAULT_DEBIT_BANK_RATES).forEach(([bKey, defRate]) => {
            mergedBankRates[bKey] = { ...defRate };
          });

          // Overlay saved bank rates
          Object.entries(rawBankRates).forEach(([bKey, val]: [string, any]) => {
            if (val && typeof val === 'object') {
              mergedBankRates[bKey] = {
                onUs: typeof val.onUs === 'number' ? val.onUs : (DEFAULT_DEBIT_BANK_RATES[bKey]?.onUs ?? 0.005),
                offUs: typeof val.offUs === 'number' ? val.offUs : (DEFAULT_DEBIT_BANK_RATES[bKey]?.offUs ?? 0.010),
              };
            }
          });

          // Backward compatibility: If BCA onUs/offUs was saved in top-level but not in bankRates
          if (typeof parsed.debitConfig.bcaOnUsRate === 'number' && (!rawBankRates['BCA'] || typeof rawBankRates['BCA'].onUs !== 'number')) {
            mergedBankRates['BCA'] = {
              onUs: parsed.debitConfig.bcaOnUsRate,
              offUs: typeof parsed.debitConfig.bcaOffUsRate === 'number' ? parsed.debitConfig.bcaOffUsRate : 0.010,
            };
          }

          debitConfig = {
            defaultRate: typeof parsed.debitConfig.defaultRate === 'number' ? parsed.debitConfig.defaultRate : DEFAULT_DEBIT_CONFIG.defaultRate,
            bcaOnUsRate: mergedBankRates['BCA']?.onUs ?? DEFAULT_DEBIT_CONFIG.bcaOnUsRate,
            bcaOffUsRate: mergedBankRates['BCA']?.offUs ?? DEFAULT_DEBIT_CONFIG.bcaOffUsRate,
            onUsRate: typeof parsed.debitConfig.onUsRate === 'number' ? parsed.debitConfig.onUsRate : DEFAULT_DEBIT_CONFIG.onUsRate,
            offUsRate: typeof parsed.debitConfig.offUsRate === 'number' ? parsed.debitConfig.offUsRate : DEFAULT_DEBIT_CONFIG.offUsRate,
            bankRates: mergedBankRates,
            edcRates: {},
          };
        }

        if (parsed.rules) {
          const merged: Record<string, BankMdrRule> = { ...BANK_MDR_RULES };
          Object.entries(parsed.rules).forEach(([bKey, customRule]: [string, any]) => {
            if (merged[bKey]) {
              merged[bKey] = {
                ...merged[bKey],
                ...customRule,
                rates: { ...merged[bKey].rates, ...customRule.rates },
              };
            } else {
              merged[bKey] = customRule;
            }
          });
          return {
            rules: merged,
            debitConfig,
            isCustom: true,
            updatedBy: data.updated_by || parsed.updatedBy,
            updatedAt: data.updated_at || parsed.updatedAt,
          };
        }
      }
    }
  } catch (err) {
    console.error('Failed to load custom MDR rules, using baseline:', err);
  }

  return { rules: BANK_MDR_RULES, debitConfig, isCustom: false };
}

/**
 * Saves finance-updated MDR rules to Supabase
 */
export async function saveCustomBankMdrRules(
  rules: Record<string, BankMdrRule>,
  userEmail: string,
  debitConfig?: DebitConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      rules,
      debitConfig: debitConfig || DEFAULT_DEBIT_CONFIG,
      updatedBy: userEmail,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('transaction_records_meta')
      .upsert({
        trans_no: '__CONFIG_MDR_RULES__',
        other_remarks: JSON.stringify(payload),
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'trans_no' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Resets custom MDR rules back to Excel baseline
 */
export async function resetCustomBankMdrRules(userEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('transaction_records_meta')
      .delete()
      .eq('trans_no', '__CONFIG_MDR_RULES__');

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export interface FinanceVerificationInfo {
  status: 'PENDING_INPUT' | 'SUBMITTED' | 'VERIFIED' | 'OVERRIDDEN';
  verifiedBy?: string;
  verifiedAt?: string;
  realComm?: number;
  note?: string;
}

/**
 * Extracts payment splits and finance verification metadata from other_remarks
 */
export function extractPaymentAndVerification(otherRemarks?: string): {
  splits: PaymentSplitRow[] | null;
  verification: FinanceVerificationInfo;
} {
  const remarks = otherRemarks || '';
  let splits: PaymentSplitRow[] | null = null;
  let verification: FinanceVerificationInfo = { status: 'PENDING_INPUT' };

  // 1. Parse splits
  if (remarks.includes('[PAYMENT_SPLITS]:')) {
    try {
      const parts = remarks.split('[PAYMENT_SPLITS]:')[1];
      const splitsRaw = parts.split('[FINANCE_VERIFY]:')[0]?.trim();
      if (splitsRaw) {
        splits = JSON.parse(splitsRaw);
      }
    } catch {}
  }

  // 2. Parse finance verification
  if (remarks.includes('[FINANCE_VERIFY]:')) {
    try {
      const vMatch = remarks.split('[FINANCE_VERIFY]:')[1]?.trim();
      if (vMatch) {
        const parsedV = JSON.parse(vMatch);
        verification = {
          status: parsedV.status || 'VERIFIED',
          verifiedBy: parsedV.verifiedBy,
          verifiedAt: parsedV.verifiedAt,
          realComm: parsedV.realComm,
          note: parsedV.note,
        };
      }
    } catch {}
  } else if (splits && splits.length > 0) {
    verification = { status: 'SUBMITTED' };
  }

  return { splits, verification };
}

/**
 * Verifies or overrides invoice card commission from Finance Cockpit
 */
export async function verifyOrOverrideInvoiceFinance(params: {
  transNo: string;
  items: InvoiceItem[];
  status: 'VERIFIED' | 'OVERRIDDEN';
  verifiedBy: string;
  realComm?: number;
  note?: string;
  currentRemarks?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { transNo, items, status, verifiedBy, realComm, note, currentRemarks } = params;

    // If overridden with realComm, update clean_master and bvlgari_sales items
    if (status === 'OVERRIDDEN' && typeof realComm === 'number') {
      const itemAllocations = distributeCommToItems(items, realComm);
      await Promise.all(
        itemAllocations.map(alloc =>
          supabase.from('clean_master').update({ comm: alloc.comm }).eq('id', alloc.itemId)
        )
      );
      await supabase.from('bvlgari_sales').update({ card_comm: realComm }).eq('transaction_no', transNo);
    }

    // Build new other_remarks payload preserving [PAYMENT_SPLITS]
    const current = currentRemarks || '';
    const baseSplitsPart = current.includes('[PAYMENT_SPLITS]:')
      ? current.split('[FINANCE_VERIFY]:')[0].trim()
      : current;

    const verifyPayload = {
      status,
      verifiedBy,
      verifiedAt: new Date().toISOString(),
      realComm,
      note,
    };

    const newRemarks = `${baseSplitsPart}\n[FINANCE_VERIFY]: ${JSON.stringify(verifyPayload)}`.trim();

    const { error } = await supabase
      .from('transaction_records_meta')
      .upsert({
        trans_no: transNo,
        other_remarks: newRemarks,
        updated_by: verifiedBy.toLowerCase(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'trans_no' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}


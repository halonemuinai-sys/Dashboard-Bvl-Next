import { computePaymentMdr, getInstallmentMinimum, INSTALLMENT_OPTIONS, type EdcOption, type BankOption, type InstallmentOption } from '@/services/dashboard/paymentEngine';
import type { MdrConfiguration } from '@/lib/mdr-config';

export const GUIDE_TENORS = INSTALLMENT_OPTIONS.filter(t => t !== '--');
export const formatMdrRate = (rate: number) => `${Number((rate * 100).toFixed(4))}%`;

/** Only configured installment programs are offered; a regular-rate fallback is not an offer. */
export function buildInstallmentComparisons(config: MdrConfiguration, amount: number, edc: EdcOption, tenor: string = 'all', search = '') {
  if (!Number.isFinite(amount) || amount <= 0) return [];
  const query = search.trim().toLowerCase();
  return Object.entries(config.rules).filter(([key, rule]) => `${key} ${rule.bank}`.toLowerCase().includes(query)).flatMap(([bankKey, rule]) =>
    GUIDE_TENORS.filter(t => rule.rates[t] !== undefined && (tenor === 'all' || tenor === t)).map(t => {
      const result = computePaymentMdr({ paymentType: 'Credit Card', bank: (bankKey === 'AMEX' ? 'BCA' : bankKey) as BankOption, cardType: bankKey === 'AMEX' ? 'AMEX' : 'VISA', edc, installment: t, amount }, config.rules, config.debitConfig, config.creditConfig);
      const months = Number.parseInt(t, 10);
      const minRequired = getInstallmentMinimum(bankKey, t as InstallmentOption, rule);
      return { bankKey, bankName: rule.bank, tenor: t, months, ...result, commAmount: result.cardComm,
        monthlyInstallment: Math.round(amount / months), minRequired, meetsMinimum: amount >= minRequired,
        adminFee: rule.adminFee || 0, validStores: rule.validStores || 'All stores', notes: rule.notes };
    })
  ).sort((a, b) => a.mdrPct - b.mdrPct || a.bankName.localeCompare(b.bankName) || a.months - b.months);
}

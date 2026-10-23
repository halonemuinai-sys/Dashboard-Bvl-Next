import type { BankMdrRule, CreditConfig, DebitConfig } from '@/services/dashboard/paymentEngine';

export interface MdrConfiguration {
  rules: Record<string, BankMdrRule>;
  creditConfig: CreditConfig;
  debitConfig: DebitConfig;
}
export const ACTIVE_CARD_OVERRIDES = ['AMEX', 'ALIPAY', 'WECHAT', 'UNIONPAY', 'JCB'];
export function canManageMdr(role: string | null) {
  return role === 'super_admin' || role === 'management_it' || role === 'finance';
}
export function parseMdrPercent(input: string): number | null {
  const value = input.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(value)) return null;
  const percent = Number(value);
  return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? Math.round(percent * 10000) / 1000000 : null;
}

export function validateMdrConfiguration(input: unknown): asserts input is MdrConfiguration {
  const object = (value: unknown, label: string): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
    return value as Record<string, unknown>;
  };
  const rate = (value: unknown, label: string) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label}: enter an MDR between 0% and 100%.`);
  };
  const amount = (value: unknown, label: string) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative amount.`);
  };
  const config = object(input, 'Configuration');
  const rules = object(config.rules, 'Installment rules');
  if (!Object.keys(rules).length) throw new Error('Installment rules cannot be empty.');
  for (const [bank, value] of Object.entries(rules)) {
    const rule = object(value, bank);
    if (typeof rule.bank !== 'string' || !rule.bank.trim()) throw new Error(`${bank}: bank name is required.`);
    amount(rule.minAmount, `${bank} minimum`);
    if (rule.adminFee !== undefined) amount(rule.adminFee, `${bank} admin fee`);
    if (!['EDC', 'MANUAL_FORM'].includes(String(rule.processMethod))) throw new Error(`${bank}: select a processing method.`);
    for (const field of ['notes', 'validStores']) if (rule[field] !== undefined && typeof rule[field] !== 'string') throw new Error(`${bank}: invalid ${field}.`);
    for (const [tenor, value] of Object.entries(object(rule.rates, `${bank} rates`))) {
      if (!['--', '3 mth', '6 mth', '12 mth', '18 mth', '24 mth', '36 mth'].includes(tenor)) throw new Error(`${bank}: unsupported tenor ${tenor}.`);
      rate(value, `${bank} ${tenor}`);
    }
  }
  const credit = object(config.creditConfig, 'Credit settings');
  const debit = object(config.debitConfig, 'Debit settings');
  for (const key of ['defaultOnUsRate', 'defaultOffUsRate']) rate(credit[key], `Credit ${key}`);
  for (const key of ['defaultRate', 'onUsRate', 'offUsRate', 'bcaOnUsRate', 'bcaOffUsRate']) rate(debit[key], `Debit ${key}`);
  for (const [label, value] of [['Credit EDC', credit.edcRates], ['Debit bank', debit.bankRates]] as const) {
    for (const [key, entry] of Object.entries(object(value, label))) {
      const pair = object(entry, key); rate(pair.onUs, `${key} On-Us`); rate(pair.offUs, `${key} Off-Us`);
    }
  }
  for (const [key, value] of Object.entries(object(credit.cardTypeRates || {}, 'Card type rates'))) rate(value, key);
  for (const [key, value] of Object.entries(object(debit.edcRates || {}, 'Legacy debit EDC rates'))) rate(value, key);
}

import { normalizeReportStore, serviceCenterStore } from './report-attribution';
export const TRANSACTION_SECTIONS = [
  { slug: 'down-payment', kind: 'DPS', label: 'Down Payment' },
  { slug: 'service', kind: 'SVC', label: 'Service' },
  { slug: 'packaging', kind: 'PACK', label: 'Packaging' },
] as const;
export type SupplementaryKind = typeof TRANSACTION_SECTIONS[number]['kind'];
export function supplementaryKind(value: string) {
  const key = (value || '').trim().toUpperCase();
  return key.startsWith('PACK') ? 'PACK' : key === 'DPS' || key === 'SVC' ? key : null;
}
export function supplementaryStoreScope(role: string, assignedStore: string) {
  const store = normalizeReportStore(assignedStore || 'ALL');
  if (role === 'operations_sales' && (!store || store === 'ALL')) throw new Error('Ask an administrator to assign your boutique before opening these transactions.');
  return store && store !== 'ALL' ? store : null;
}
export function supplementaryStoreMatches(location: string, store: string | null) {
  return !store || serviceCenterStore(location) === store;
}

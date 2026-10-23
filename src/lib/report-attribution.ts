export const normalizeReportStore = (value: string) => {
  const store = (value || '').trim();
  const key = store.toLowerCase();
  if (key === 'plaza indonesia') return 'Plaza Indonesia';
  if (key === 'plaza senayan') return 'Plaza Senayan';
  if (key === 'bali' || key === 'bali boutique') return 'Bali';
  return store;
};
/** Service (SVC) is booked at each boutique's RB service counter; report it under that boutique. */
export const serviceCenterStore = (value: string) => normalizeReportStore((value || '').trim().replace(/^RB\s*/i, ''));
export const reportSalesType = (type: string) => type?.trim().toUpperCase() === 'SMI' ? 'SMI' : 'Regular';
export interface AdvisorHome { name: string; home_location: string }
export interface AdvisorRotation { advisor_name: string; assigned_location: string }
export function advisorHomeResolver(advisors: AdvisorHome[], rotations: AdvisorRotation[]) {
  const key = (name: string) => (name || '').trim().toLowerCase();
  const homes = new Map(advisors.map(row => [key(row.name), row.home_location]));
  const assignments = new Map(rotations.map(row => [key(row.advisor_name), row.assigned_location]));
  return (advisor: string, location: string) => normalizeReportStore(assignments.get(key(advisor)) || homes.get(key(advisor)) || location);
}
export function isReportCrossing(home: string, location: string) {
  const stores = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];
  return stores.includes(home) && stores.includes(location) && home !== location;
}

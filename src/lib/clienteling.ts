export interface ClientelingRow {
  customer: string | null;
  customer_code?: string | null;
  transaction_date: string | null;
  net_sales: number | string | null;
  trans_no: string | null;
  location: string | null;
}

const TIERS = ['Top', 'Elite', 'High Potential', 'Potential', 'Prospect', 'Inactive'];
export const JOURNEY_STAGES = ['early', 'returning', 'highValue', 'reconnect', 'dormant'] as const;
export type JourneyStage = typeof JOURNEY_STAGES[number];
const DAY = 86_400_000;
const tierFor = (spend: number, days = 0) => days > 730 ? 'Inactive' : spend >= 1_350_000_000 ? 'Top' : spend >= 200_000_000 ? 'Elite' : spend >= 50_000_000 ? 'High Potential' : spend > 0 ? 'Potential' : 'Prospect';

export function clientelingSnapshot(year: number, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  if (!Number.isInteger(year) || year < 1900 || year > Number(today.slice(0, 4))) throw new Error('Select a valid reporting year.');
  return `${year}-12-31` < today ? `${year}-12-31` : today;
}

export function buildClientelingData(rows: ClientelingRow[], year: number, now = new Date()) {
  const asOf = clientelingSnapshot(year, now);
  const cutoff = Date.parse(asOf + 'T00:00:00Z');
  const monthCount = Number(asOf.slice(5, 7));
  const priorDay = Math.min(Number(asOf.slice(8)), new Date(Date.UTC(year - 1, monthCount, 0)).getUTCDate());
  const priorCutoff = `${year - 1}-${asOf.slice(5, 7)}-${String(priorDay).padStart(2, '0')}`;
  type Profile = { id: string; name: string; spend: number; first: string; last: string; invoices: Set<string>; months: Set<number>; locations: Map<string, number>; prevSpend: number; currSpend: number };
  const profiles = new Map<string, Profile>();
  let excludedRows = 0;
  for (const r of rows) {
    const name = (r.customer || '').trim();
    const date = (r.transaction_date || '').slice(0, 10);
    const parsed = Date.parse(date + 'T00:00:00Z');
    const spend = Number(r.net_sales ?? 0);
    if (!name || ['customer', 'n/a', '-', 'walk in', 'walkin', 'tamu', 'guest'].includes(name.toLowerCase()) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date || !Number.isFinite(spend)) { excludedRows++; continue; }
    if (date > asOf) continue;
    // Customer codes keep distinct clients with identical names separate.
    // Uncoded records retain exact-name grouping; no fuzzy identity merge.
    const code = String(r.customer_code || '').trim();
    const id = code ? `code:${code}` : `name:${name}`;
    const p = profiles.get(id) || { id, name, spend: 0, first: date, last: date, invoices: new Set<string>(), months: new Set<number>(), locations: new Map<string, number>(), prevSpend: 0, currSpend: 0 };
    p.spend += spend;
    if (date < p.first) p.first = date;
    if (date >= p.last) { p.last = date; p.name = name; }
    if (r.trans_no?.trim()) p.invoices.add(r.trans_no.trim());
    const location = r.location?.trim() || 'Unknown';
    p.locations.set(location, (p.locations.get(location) || 0) + spend);
    if (date.startsWith(`${year}-`)) { p.currSpend += spend; p.months.add(Number(date.slice(5, 7)) - 1); }
    if (date.startsWith(`${year - 1}-`) && date <= priorCutoff) p.prevSpend += spend;
    profiles.set(id, p);
  }
  const clients = [...profiles.values()].map(p => {
    const recency = Math.floor((cutoff - Date.parse(p.last + 'T00:00:00Z')) / DAY);
    return { ...p, recency, visits: p.invoices.size, tier: tierFor(p.spend, recency), location: [...p.locations].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown', firstVisit: p.first, lastVisit: p.last };
  });
  const active = clients.filter(c => c.recency <= 730);
  const repeat = active.filter(c => c.visits > 1);
  const single = active.filter(c => c.visits === 1);
  const sum = (list: typeof clients) => list.reduce((s, c) => s + c.spend, 0);
  const lapsed = active.filter(c => c.recency >= 180 && c.spend >= 50_000_000).sort((a, b) => b.spend - a.spend);
  // Assign each client to one current stage, with re-engagement taking priority
  // over value and frequency. This is a snapshot, not a conversion funnel.
  const journeyGroups: Record<JourneyStage, typeof clients> = {
    early: [], returning: [], highValue: [], reconnect: [], dormant: [],
  };
  clients.forEach(c => {
    const stage: JourneyStage = c.recency > 730 ? 'dormant'
      : c.recency >= 180 && c.spend >= 50_000_000 ? 'reconnect'
      : c.spend >= 200_000_000 ? 'highValue'
      : c.visits >= 2 ? 'returning' : 'early';
    journeyGroups[stage].push(c);
  });
  const journey = JOURNEY_STAGES.map(stage => ({
    stage,
    count: journeyGroups[stage].length,
    clients: journeyGroups[stage].sort((a, b) => b.spend - a.spend).slice(0, 12).map(c => ({
      id: c.id, name: c.name, spend: c.spend, invoices: c.visits,
      daysSince: c.recency, location: c.location, lastPurchase: c.lastVisit,
    })),
  }));
  const tierCounts: Record<string, number> = Object.fromEntries(TIERS.map(t => [t, 0]));
  const tierRevenue: Record<string, number> = { ...tierCounts };
  clients.forEach(c => { tierCounts[c.tier]++; tierRevenue[c.tier] += c.spend; });
  const recencyBuckets = { '0-30': 0, '31-90': 0, '91-180': 0, '181-365': 0, '366-730': 0 };
  const freqBuckets = { 'Unknown': 0, '1x': 0, '2-3x': 0, '4-6x': 0, '7-10x': 0, '11+x': 0 };
  const locations = new Map<string, { active: number; spend: number }>();
  active.forEach(c => {
    recencyBuckets[c.recency <= 30 ? '0-30' : c.recency <= 90 ? '31-90' : c.recency <= 180 ? '91-180' : c.recency <= 365 ? '181-365' : '366-730']++;
    freqBuckets[c.visits === 0 ? 'Unknown' : c.visits === 1 ? '1x' : c.visits <= 3 ? '2-3x' : c.visits <= 6 ? '4-6x' : c.visits <= 10 ? '7-10x' : '11+x']++;
    const loc = locations.get(c.location) || { active: 0, spend: 0 };
    loc.active++; loc.spend += c.spend; locations.set(c.location, loc);
  });
  const retention = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].slice(0, monthCount).map(month => ({ month, newCust: 0, returning: 0 }));
  clients.forEach(c => c.months.forEach(m => {
    const firstMonth = `${year}-${String(m + 1).padStart(2, '0')}`;
    if (c.first.startsWith(firstMonth)) retention[m].newCust++;
    else retention[m].returning++;
  }));
  const tierMigration = clients.filter(c => c.prevSpend > 0 && c.currSpend > 0 && tierFor(c.prevSpend) !== tierFor(c.currSpend))
    .sort((a, b) => b.currSpend - a.currSpend).slice(0, 20).map(c => ({ id: c.id, name: c.name, from: tierFor(c.prevSpend), to: tierFor(c.currSpend), prevSpend: c.prevSpend, currSpend: c.currSpend, direction: TIERS.indexOf(tierFor(c.currSpend)) < TIERS.indexOf(tierFor(c.prevSpend)) ? 'up' : 'down' }));
  const pct = (n: number) => active.length ? n / active.length * 100 : 0;
  return {
    year, asOf, priorCutoff, excludedRows,
    kpi: { totalActive: active.length, retentionRate: pct(repeat.length), avgLtv: active.length ? sum(active) / active.length : 0, lapsedCount: lapsed.length, repeatRevenue: sum(repeat), newRevenue: sum(single), repeatPct: pct(repeat.length), newPct: pct(single.length) },
    tierCounts, tierRevenue,
    journey,
    topClients: [...clients].sort((a, b) => b.spend - a.spend).slice(0, 50).map(c => ({ id: c.id, name: c.name, spend: c.spend, visits: c.visits, recency: c.recency, tier: c.tier, location: c.location, firstVisit: c.firstVisit, lastVisit: c.lastVisit })),
    lapsedAlerts: lapsed.slice(0, 30).map(c => ({ id: c.id, name: c.name, spend: c.spend, daysSince: c.recency, lastVisit: c.lastVisit, tier: c.tier, location: c.location })),
    recencyBuckets, freqBuckets,
    locationSummary: [...locations].map(([name, loc]) => ({ name, ...loc, avgSpend: loc.spend / loc.active })).sort((a, b) => b.spend - a.spend),
    tierMigration, retention,
  };
}

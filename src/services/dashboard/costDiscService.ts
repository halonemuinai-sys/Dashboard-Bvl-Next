import { supabase } from '@/lib/supabase';

export interface MonthlyCostDiscRow {
  monthIndex: number;   // 0-11
  monthLabel: string;   // "Jan", "Feb", ...
  grossSales: number;
  totalCost: number;    // cost + comm
  costPct: number;
  totalDisc: number;
  discPct: number;
}

export interface CostDiscBreakdown {
  year: number;
  monthly: MonthlyCostDiscRow[];
  annual: {
    grossSales: number;
    totalCost: number;
    costPct: number;
    totalDisc: number;
    discPct: number;
  };
}

export interface InvoiceDiscRow {
  transNo: string;
  transactionDate: string;
  customer: string;
  salesman: string;
  location: string;
  grossSales: number;
  totalDisc: number;
  discPct: number;
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

/**
 * Monthly breakdown of Cost % and Avg Disc % for one year, excluding Head Office —
 * same methodology as the Cost %/Avg Disc % KPI cards on Monthly Overview, so the
 * annual total here always reconciles with the "Tahun Ini" toggle on that page.
 */
export async function getCostDiscBreakdown(year: number, store = 'ALL'): Promise<CostDiscBreakdown> {
  const from = `${year}-01-01T00:00:00`;
  const to = `${year}-12-31T23:59:59`;

  let q = supabase
    .from('clean_master')
    .select('transaction_date, location, gross_sales, val_disc, cost, comm')
    .gte('transaction_date', from)
    .lte('transaction_date', to);
  if (store !== 'ALL') q = q.eq('location', store);

  const { data, error } = await q;
  if (error) throw error;

  const buckets = Array.from({ length: 12 }, () => ({ gross: 0, cost: 0, disc: 0 }));

  (data || []).forEach((r: any) => {
    const loc = (r.location || '').toLowerCase();
    if (loc.includes('head office')) return;
    const m = new Date(r.transaction_date).getMonth();
    buckets[m].gross += r.gross_sales || 0;
    buckets[m].cost += (r.cost || 0) + (r.comm || 0);
    buckets[m].disc += r.val_disc || 0;
  });

  const monthly: MonthlyCostDiscRow[] = buckets.map((b, i) => ({
    monthIndex: i,
    monthLabel: MONTH_LABELS[i],
    grossSales: b.gross,
    totalCost: b.cost,
    costPct: b.gross > 0 ? (b.cost / b.gross) * 100 : 0,
    totalDisc: b.disc,
    discPct: b.gross > 0 ? (b.disc / b.gross) * 100 : 0,
  }));

  const annualGross = buckets.reduce((s, b) => s + b.gross, 0);
  const annualCost = buckets.reduce((s, b) => s + b.cost, 0);
  const annualDisc = buckets.reduce((s, b) => s + b.disc, 0);

  return {
    year,
    monthly,
    annual: {
      grossSales: annualGross,
      totalCost: annualCost,
      costPct: annualGross > 0 ? (annualCost / annualGross) * 100 : 0,
      totalDisc: annualDisc,
      discPct: annualGross > 0 ? (annualDisc / annualGross) * 100 : 0,
    },
  };
}

/**
 * Per-invoice discount breakdown for one month, sorted by discount amount
 * descending (largest first) — drill-down behind a monthly row in Margin
 * Intelligence. Excludes Head Office, same as the aggregate figures.
 */
export async function getMonthlyDiscountDetail(
  year: number,
  monthIndex: number,
  store = 'ALL'
): Promise<InvoiceDiscRow[]> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const from = `${year}-${pad(monthIndex + 1)}-01T00:00:00`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const to = `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}T23:59:59`;

  let q = supabase
    .from('clean_master')
    .select('trans_no, transaction_date, customer, salesman, location, gross_sales, val_disc')
    .gte('transaction_date', from)
    .lte('transaction_date', to);
  if (store !== 'ALL') q = q.eq('location', store);

  const { data, error } = await q;
  if (error) throw error;

  const map = new Map<string, InvoiceDiscRow>();
  (data || []).forEach((r: any) => {
    const loc = (r.location || '').toLowerCase();
    if (loc.includes('head office')) return;
    if (!r.trans_no) return;

    const existing = map.get(r.trans_no);
    if (existing) {
      existing.grossSales += r.gross_sales || 0;
      existing.totalDisc += r.val_disc || 0;
    } else {
      map.set(r.trans_no, {
        transNo: r.trans_no,
        transactionDate: r.transaction_date,
        customer: r.customer || '-',
        salesman: r.salesman || '-',
        location: r.location || '-',
        grossSales: r.gross_sales || 0,
        totalDisc: r.val_disc || 0,
        discPct: 0,
      });
    }
  });

  return Array.from(map.values())
    .filter(r => r.totalDisc > 0)
    .map(r => ({ ...r, discPct: r.grossSales > 0 ? (r.totalDisc / r.grossSales) * 100 : 0 }))
    .sort((a, b) => b.discPct - a.discPct);
}

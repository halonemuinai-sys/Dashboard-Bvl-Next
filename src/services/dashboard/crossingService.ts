import { supabase } from '@/lib/supabase';
import type { CrossingSalesData, CrossingRecord } from './types';
import { MONTH_NAMES } from './constants';
import { advisorHomeResolver, normalizeReportStore } from '@/lib/report-attribution';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { monthBounds } from '@/lib/invoice-report-filters';

/**
 * Crossing Sales — Replicates getCrossingSalesData() from GAS (5-API_Reports.gs)
 * Detects advisors selling outside their home boutique for the selected month.
 * Uses advisor_rotations override first, then advisors.home_location as fallback.
 */
export async function getCrossingSalesData(month: string, year: number): Promise<CrossingSalesData> {
  const monthIndex = MONTH_NAMES.indexOf(month);
  if (monthIndex === -1) throw new Error(`Invalid month: ${month}`);

  const { start, end } = monthBounds(monthIndex + 1, year);
  const [rows, advisorProfiles, rotationRows] = await Promise.all([
    fetchAllRows((from, to) => supabase.from('clean_master').select('id,salesman,location,net_sales,qty,collection,main_category')
      .gte('transaction_date', start).lt('transaction_date', end).order('id').range(from, to)),
    fetchAllRows((from, to) => supabase.from('advisors').select('name,home_location').order('name').range(from, to)),
    fetchAllRows((from, to) => supabase.from('advisor_rotations').select('advisor_name,assigned_location')
      .eq('year', year).eq('month_number', monthIndex + 1).order('advisor_name').range(from, to))
  ]);
  const resolveHome = advisorHomeResolver(advisorProfiles || [], rotationRows || []);

  const validStores = ['plaza indonesia', 'plaza senayan', 'bali', 'bali boutique'];
  const normalize = (l: string) => {
    const ll = l.toLowerCase();
    if (ll === 'plaza indonesia') return 'Plaza Indonesia';
    if (ll === 'plaza senayan')   return 'Plaza Senayan';
    if (ll === 'bali' || ll === 'bali boutique') return 'Bali';
    return l;
  };

  const storeStats: Record<string, { physical: number; adjusted: number }> = {
    'Plaza Indonesia': { physical: 0, adjusted: 0 },
    'Plaza Senayan':   { physical: 0, adjusted: 0 },
    'Bali':            { physical: 0, adjusted: 0 },
  };

  let totalNet = 0, totalQty = 0, totalNetSalesGenerated = 0, totalQtyGenerated = 0;
  let hoExcludedNet = 0, hoExcludedQty = 0;
  const recordMap = new Map<string, CrossingRecord>();
  const isHO = (l: string) => l === 'head office' || l === 'ho';

  (rows || []).forEach(row => {
    if (['DPS', 'SVC', 'PACK'].includes((row.collection || '').trim().toUpperCase()) || ['DPS', 'SVC', 'PACK', 'PACKAGING'].includes((row.main_category || '').trim().toUpperCase())) return;
    const tLoc = (row.location || '').trim();
    const salesman = (row.salesman || '').trim();

    // GAS fallback: if advisor not in master, use transaction location as home (no crossing detected)
    const hLoc = resolveHome(salesman, tLoc);
    const net = row.net_sales || 0;
    const qty = row.qty || 0;

    const tLocLower = tLoc.toLowerCase();
    const hLocLower = hLoc.toLowerCase();

    // Track HO crossings separately BEFORE whitelist filter (mirrors GAS)
    if (tLocLower !== hLocLower && (isHO(tLocLower) || isHO(hLocLower))) {
      hoExcludedNet += net;
      hoExcludedQty += qty;
    }

    const isValidT = validStores.includes(tLocLower);
    const isValidH = validStores.includes(hLocLower);
    if (!isValidT || !isValidH) return;

    totalNetSalesGenerated += net;
    totalQtyGenerated += qty;

    const normT = normalize(tLoc);
    const normH = normalize(hLoc);

    if (storeStats[normT]) storeStats[normT].physical += net;
    if (storeStats[normH]) storeStats[normH].adjusted += net;

    if (normalizeReportStore(tLoc) !== normalizeReportStore(hLoc)) {
      totalNet += net;
      totalQty += qty;
      const key = `${salesman}||${normH}||${normT}`;
      if (recordMap.has(key)) {
        const r = recordMap.get(key)!;
        r.net += net;
        r.qty += qty;
      } else {
        recordMap.set(key, { salesman, baseLoc: normH, crossingLoc: normT, net, qty });
      }
    }
  });

  const records = Array.from(recordMap.values()).sort((a, b) => b.net - a.net);

  return { records, totalNet, totalQty, totalNetSalesGenerated, totalQtyGenerated, hoExcludedNet, hoExcludedQty, storeStats, month, year };
}

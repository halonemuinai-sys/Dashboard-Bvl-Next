import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetch-all-rows';

// ==========================================
// --- SYNC SERVICE ---
// Porting dari 4-API_Sales.gs (GAS Legacy)
// Flow: API Bvlgari -> bvlgari_sales (raw) -> clean_master (normalized)
// ==========================================

// API Config — panggil langsung dari server (tidak perlu proxy, CORS hanya berlaku di browser)
const BVLGARI_API_BASE = process.env.BVLGARI_API_BASE || 'http://139.99.102.231:8089/demo';
const BVLGARI_API_TOKEN = process.env.BVLGARI_API_TOKEN || '';

// --- TYPES ---
interface ApiSalesItem {
  transactionDate: string;
  transactionTime: string;
  salesman: string;
  customerName: string;
  phoneNo: string;
  transactionNo: string;
  location: string;
  sapCode: string;
  caseNo: string;
  catalogueCode: string;
  description: string;
  collectionCode: string;
  qty: number | string;
  price: number | string;
  discount: string;
  subTotalDiscount: number | string;
  tax: number | string;
  subTotaltax?: number | string;
  subTotalTax?: number | string;
  // Provided by the POS but still empty (null) as of Oct 2026; stored as soon as it is filled.
  customerCode?: string | null;
  inCharge?: string | null;
  // Added by the POS in Oct 2026 and filled: servedBy replaces inCharge, crmId replaces customerCode.
  servedBy?: string | null;
  crmId?: string | null;
}

interface SyncResult {
  success: boolean;
  rawInserted: number;     // Baris baru di bvlgari_sales
  normalizedInserted: number; // Baris baru di clean_master
  skippedDuplicates: number;
  backfilledRows?: number;  // Existing rows that received in_charge / customer_code from the POS
  error?: string;
}

// ==========================================
// --- CORE SYNC FUNCTION ---
// ==========================================

/**
 * Tarik data dari API Bvlgari, simpan ke bvlgari_sales (raw),
 * lalu normalize ke clean_master (dengan card_comm = 0 default).
 * 
 * Porting dari: fetchDailySales() di 4-API_Sales.gs
 */
export async function syncSalesData(month: number, year: number): Promise<SyncResult> {
  // If running in browser (client-side), delegate to Next.js API route to avoid CORS & hide token
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/sync-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          rawInserted: 0,
          normalizedInserted: 0,
          skippedDuplicates: 0,
          error: errJson.error || `Server Error (${res.status})`,
        };
      }
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        rawInserted: 0,
        normalizedInserted: 0,
        skippedDuplicates: 0,
        error: err.message || 'Gagal menghubungi server API sync.',
      };
    }
  }

  try {
    // 1. Hitung range tanggal
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 2. Fetch Master Data (Categories & Collections) - Porting dari loadMasters() GAS
    const [
      { data: masterCats },
      { data: masterColls }
    ] = await Promise.all([
      supabase.from('master_main_category').select('*'),
      supabase.from('master_collection').select('*')
    ]);

    const catMap = new Map<string, string>();
    (masterCats || []).forEach((r: any) => catMap.set(String(r.code).trim().toUpperCase(), r.description));
    
    const collMap = new Map<string, string>();
    (masterColls || []).forEach((r: any) => collMap.set(String(r.code).trim().toUpperCase(), r.description));

    // 3. Fetch langsung dari server ke Bvlgari API (no CORS server-side)
    const apiUrl = `${BVLGARI_API_BASE}/dailysalestransaction?startdate=${encodeURIComponent(startDate)}&enddate=${encodeURIComponent(endDate)}`;

    const response = await fetch(apiUrl, {
      headers: BVLGARI_API_TOKEN ? { 'Authorization': BVLGARI_API_TOKEN } : {},
    });

    if (!response.ok) {
      let errMsg = `API Error: HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.error) {
          errMsg = `${errJson.error} (Detail: ${errJson.detail || 'None'})`;
        }
      } catch (_) {
        try {
          const errText = await response.text();
          if (errText) errMsg += ` - ${errText}`;
        } catch (_) {}
      }
      return { success: false, rawInserted: 0, normalizedInserted: 0, skippedDuplicates: 0, error: errMsg };
    }

    const apiData: ApiSalesItem[] = await response.json();

    if (!Array.isArray(apiData) || apiData.length === 0) {
      return { success: true, rawInserted: 0, normalizedInserted: 0, skippedDuplicates: 0 };
    }

    // 4. Cek transaksi yang sudah ada di bvlgari_sales (deduplikasi)
    // Paginated: a month above the 1,000-row API page must not look "new" and be inserted twice.
    const existingRaw = await fetchAllRows<{ transaction_no: string }>((from, to) => supabase
      .from('bvlgari_sales')
      .select('transaction_no')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('id')
      .range(from, to));

    const existingTxSet = new Set(existingRaw.map(r => r.transaction_no));
    const backfilledRows = await backfillPosFields(apiData, existingTxSet);

    // 5. Process & Calculate Net Sales (porting dari GAS line 52-97)
    const rawRows: any[] = [];
    let skipped = 0;

    for (const itm of apiData) {
      if (existingTxSet.has(itm.transactionNo)) {
        skipped++;
        continue;
      }

      const qtyRaw = parseInt(String(itm.qty));
      const qtyForCalc = (isNaN(qtyRaw) || qtyRaw === 0) ? 1 : qtyRaw;
      // Packaging (PACK) lines are usually sent with qty 0; keep that instead of the 1 used for pricing.
      const isPackaging = (itm.collectionCode || '').trim().toUpperCase().startsWith('PACK');
      const storedQty = isPackaging ? (isNaN(qtyRaw) ? 0 : qtyRaw) : qtyForCalc;
      const unitPrice = parseFloat(String(itm.price)) || 0;
      const gross = qtyForCalc * unitPrice;
      const discount = parseFloat(String(itm.subTotalDiscount)) || 0;
      let taxAmount = parseFloat(String(itm.subTotaltax || itm.subTotalTax)) || 0;
      const taxRate = parseFloat(String(itm.tax)) || 0;
      const collCode = (itm.collectionCode || '').toUpperCase();
      const grossAfterDiscount = gross - discount;

      // Logic PFM Tax (porting dari GAS line 67-73)
      if (taxAmount === 0 && (collCode === 'PFM' || taxRate > 1)) {
        const divisor = taxRate > 1 ? taxRate : 1.11;
        const calculatedNet = grossAfterDiscount / divisor;
        taxAmount = grossAfterDiscount - calculatedNet;
      }

      const netSales = grossAfterDiscount - taxAmount;

      const normalizedSalesman = (() => {
        const sm = (itm.salesman || '').trim();
        if (/imelda/i.test(sm)) {
          const loc = (itm.location || '').toUpperCase();
          if (loc.includes('BALI') || loc.includes('DPS')) return 'Imelda Bali';
          if (loc.includes('PLAZA INDONESIA') || loc.includes('PI')) return 'Imelda PI';
        }
        return sm || null;
      })();

      // Mapping kolom sesuai server.js (baris 104-121) yang sudah berfungsi
      rawRows.push({
        transaction_date: itm.transactionDate || null,
        transaction_time: itm.transactionTime || null,
        salesman: normalizedSalesman,
        customer_name: itm.customerName || null,
        phone_no: itm.phoneNo || null,
        transaction_no: itm.transactionNo || null,
        location: itm.location || null,
        sap_code: itm.sapCode || null,
        catalogue_code: itm.catalogueCode || null,
        description: itm.description || null,
        collection: itm.collectionCode || null,
        qty: storedQty,
        price: unitPrice,
        sub_total_discount: discount,
        sub_total_tax: taxAmount,
        net_sales: netSales,
        customer_code: posCrmId(itm),
        in_charge: posServedBy(itm)
      });
    }

    if (rawRows.length === 0) {
      return { success: true, rawInserted: 0, normalizedInserted: 0, skippedDuplicates: skipped, backfilledRows };
    }

    // 5. Insert ke bvlgari_sales (raw data)
    let rawInserted = 0;
    for (let i = 0; i < rawRows.length; i += 500) {
      const batch = rawRows.slice(i, i + 500);
      const { error: rawErr } = await supabase.from('bvlgari_sales').insert(batch);
      if (rawErr) {
        console.error('bvlgari_sales insert error:', rawErr);
        return { success: false, rawInserted, normalizedInserted: 0, skippedDuplicates: skipped, error: rawErr.message };
      }
      rawInserted += batch.length;
    }

    // 6. Normalize ke clean_master (Porting Logic mapping dari buildCleanMaster GAS)
    // Filter: Kecualikan lokasi RB dan koleksi DPS, SVC, PACK
    const EXCLUDED_COLLECTIONS = ['DPS', 'SVC', 'PACK'];

    const normalizedRows = rawRows
      .filter(row => {
        // Exclude lokasi RB
        const loc = (row.location || '').toUpperCase();
        if (loc.includes('RB')) return false;

        // Exclude koleksi DPS, SVC, PACK
        const collCode = (row.collection || '').toUpperCase();
        if (EXCLUDED_COLLECTIONS.some(ex => collCode.includes(ex))) return false;

        return true;
      })
      .map(row => {
        // Logic Comma-Split (GAS Helper line 482-484)
        const codes = String(row.collection || "").split(',').map(s => s.trim().toUpperCase());
        const mainCat = catMap.get(codes[0]) || "Other";
        const collName = collMap.get(codes[codes.length - 1]) || "Unknown";

        // Kalkulasi sesuai GAS buildCleanMaster (line 477-520)
        const grossSales = row.qty * row.price;
        const valDisc = row.sub_total_discount;
        const discPct = grossSales > 0 ? valDisc / grossSales : 0;
        const netPrice = grossSales - valDisc;
        const comm = 0; // Default: akan diisi manual
        const cost = valDisc + comm; // GAS line 520: cost = valDisc + comm

        return {
          transaction_date: row.transaction_date,
          location: row.location,
          salesman: row.salesman,
          customer: row.customer_name,
          trans_no: row.transaction_no,
          sap_code: row.sap_code,
          main_category: mainCat,
          collection: collName,
          qty: row.qty,
          gross_sales: grossSales,
          disc_pct: discPct,
          val_disc: valDisc,
          net_price: netPrice,
          comm: comm,
          cost: cost,
          net_sales: row.net_sales,
          type: 'Regular',
          catalogue_code: row.catalogue_code,
          customer_code: row.customer_code,
          in_charge: row.in_charge
        };
      });

    // clean_master can already hold an invoice that bvlgari_sales does not (legacy imports stored
    // at 17:00 UTC). Never insert those again; only fill their empty POS fields.
    const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    const existingClean = await fetchAllRows<{ trans_no: string }>((from, to) => supabase
      .from('clean_master')
      .select('trans_no')
      .gte('transaction_date', `${startDate}T00:00:00+07:00`)
      .lt('transaction_date', `${nextMonth}T00:00:00+07:00`)
      .order('id')
      .range(from, to));
    const existingCleanSet = new Set(existingClean.map(r => r.trans_no));
    const freshRows = normalizedRows.filter(row => !existingCleanSet.has(row.trans_no));
    const alreadyClean = new Set(normalizedRows.filter(row => existingCleanSet.has(row.trans_no)).map(row => row.trans_no));
    const cleanBackfilled = alreadyClean.size ? await backfillPosFields(apiData, alreadyClean) : 0;

    let normalizedInserted = 0;
    for (let i = 0; i < freshRows.length; i += 500) {
      const batch = freshRows.slice(i, i + 500);
      const { error: normErr } = await supabase.from('clean_master').insert(batch);
      if (normErr) {
        console.error('clean_master insert error:', normErr);
        return { success: false, rawInserted, normalizedInserted, skippedDuplicates: skipped, error: normErr.message };
      }
      normalizedInserted += batch.length;
    }

    return { success: true, rawInserted, normalizedInserted, skippedDuplicates: skipped, backfilledRows: backfilledRows + cleanBackfilled };

  } catch (err: any) {
    return { success: false, rawInserted: 0, normalizedInserted: 0, skippedDuplicates: 0, error: err.message || 'Unknown error' };
  }
}

// ==========================================
// --- EXPORT ---
// ==========================================

export const syncService = {
  syncSalesData
};

/** Served By from the POS: servedBy, falling back to the older inCharge field. */
export const posServedBy = (item: ApiSalesItem) => item.servedBy?.trim() || item.inCharge?.trim() || null;
/** CRM Cosmo ID from the POS: crmId (sent as "" when unknown), falling back to customerCode. */
export const posCrmId = (item: ApiSalesItem) => item.crmId?.trim() || item.customerCode?.trim() || null;

/**
 * Fills in_charge / customer_code on invoices that were synced before the POS started sending them.
 * Only empty (NULL) columns are written, so a re-sync never overwrites a value already stored.
 */
export async function backfillPosFields(apiData: ApiSalesItem[], existingTxSet: Set<string>): Promise<number> {
  const fields = [
    { read: posServedBy, column: 'in_charge' },
    { read: posCrmId, column: 'customer_code' },
  ] as const;
  let updated = 0;
  for (const field of fields) {
    // value -> invoice numbers, so one UPDATE covers every invoice with the same value
    const byValue = new Map<string, Set<string>>();
    for (const item of apiData) {
      const value = field.read(item);
      if (!value || !item.transactionNo || !existingTxSet.has(item.transactionNo)) continue;
      (byValue.get(value) || byValue.set(value, new Set()).get(value)!).add(item.transactionNo);
    }
    for (const [value, numbers] of byValue) {
      const list = [...numbers];
      for (let i = 0; i < list.length; i += 200) {
        const batch = list.slice(i, i + 200);
        const [raw, clean] = await Promise.all([
          supabase.from('bvlgari_sales').update({ [field.column]: value }).in('transaction_no', batch).is(field.column, null).select('id'),
          supabase.from('clean_master').update({ [field.column]: value }).in('trans_no', batch).is(field.column, null).select('id'),
        ]);
        if (raw.error) throw new Error(`bvlgari_sales ${field.column} backfill: ${raw.error.message}`);
        if (clean.error) throw new Error(`clean_master ${field.column} backfill: ${clean.error.message}`);
        updated += (raw.data?.length || 0) + (clean.data?.length || 0);
      }
    }
  }
  return updated;
}

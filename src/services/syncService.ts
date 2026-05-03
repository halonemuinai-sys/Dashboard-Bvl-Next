import { supabase } from '@/lib/supabase';

// ==========================================
// --- SYNC SERVICE ---
// Porting dari 4-API_Sales.gs (GAS Legacy)
// Flow: API Bvlgari -> bvlgari_sales (raw) -> clean_master (normalized)
// ==========================================

// API Config — kita panggil via proxy Next.js API Route untuk menghindari CORS
// Proxy route: /api/sync-sales (lihat src/app/api/sync-sales/route.ts)

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
}

interface SyncResult {
  success: boolean;
  rawInserted: number;     // Baris baru di bvlgari_sales
  normalizedInserted: number; // Baris baru di clean_master
  skippedDuplicates: number;
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

    // 3. Fetch via Next.js API proxy (menghindari CORS)
    const proxyUrl = `/api/sync-sales?startdate=${encodeURIComponent(startDate)}&enddate=${encodeURIComponent(endDate)}`;
    
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      return { success: false, rawInserted: 0, normalizedInserted: 0, skippedDuplicates: 0, error: `API Error: HTTP ${response.status}` };
    }

    const apiData: ApiSalesItem[] = await response.json();

    if (!Array.isArray(apiData) || apiData.length === 0) {
      return { success: true, rawInserted: 0, normalizedInserted: 0, skippedDuplicates: 0 };
    }

    // 4. Cek transaksi yang sudah ada di bvlgari_sales (deduplikasi)
    const { data: existingRaw } = await supabase
      .from('bvlgari_sales')
      .select('transaction_no')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    const existingTxSet = new Set((existingRaw || []).map(r => r.transaction_no));

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

      // Mapping kolom sesuai server.js (baris 104-121) yang sudah berfungsi
      rawRows.push({
        transaction_date: itm.transactionDate || null,
        transaction_time: itm.transactionTime || null,
        salesman: itm.salesman || null,
        customer_name: itm.customerName || null,
        phone_no: itm.phoneNo || null,
        transaction_no: itm.transactionNo || null,
        location: itm.location || null,
        sap_code: itm.sapCode || null,
        catalogue_code: itm.catalogueCode || null,
        description: itm.description || null,
        collection: itm.collectionCode || null,
        qty: qtyForCalc,
        price: unitPrice,
        sub_total_discount: discount,
        sub_total_tax: taxAmount,
        net_sales: netSales
      });
    }

    if (rawRows.length === 0) {
      return { success: true, rawInserted: 0, normalizedInserted: 0, skippedDuplicates: skipped };
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
          catalogue_code: row.catalogue_code
        };
      });

    let normalizedInserted = 0;
    for (let i = 0; i < normalizedRows.length; i += 500) {
      const batch = normalizedRows.slice(i, i + 500);
      const { error: normErr } = await supabase.from('clean_master').insert(batch);
      if (normErr) {
        console.error('clean_master insert error:', normErr);
        return { success: false, rawInserted, normalizedInserted, skippedDuplicates: skipped, error: normErr.message };
      }
      normalizedInserted += batch.length;
    }

    return { success: true, rawInserted, normalizedInserted, skippedDuplicates: skipped };

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

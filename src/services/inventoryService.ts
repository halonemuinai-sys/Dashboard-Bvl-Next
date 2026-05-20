import { supabase } from '@/lib/supabase';

export const LOCATION_MAPPING: Record<string, string> = {
  PI: 'Plaza Indonesia',
  PS: 'Plaza Senayan',
  PP: 'Pacific Place',
  SY: 'Senayan City',
  BL: 'Bali',
  HO: 'Head Office',
  DIST: 'Distribution',
  MKT: 'MARKETING',
  TR: 'TRANSIT',
  SC: 'SERVICE CENTER',
  DPPI: 'Deposit Plaza Indonesia',
  DPPS: 'Deposit Plaza Senayan',
  DPBL: 'Deposit Bali',
  RBPI: 'RBPlaza Indonesia',
  RBPS: 'RBPlaza Senayan',
  RBBL: 'RBBali',
};

export interface ApiInventoryItem {
  locationName: string;
  itemCode: string;       // Serial Number
  itemSku: string;        // SAP SKU
  itemName: string;
  description: string;
  itemPrice: number;
  itemCost: number;
  collectionCode: string;
  qoh: number;
  amount: number;
}

export interface SyncInventoryResult {
  success: boolean;
  inserted: number;
  deleted: number;
  error?: string;
}

export interface InventorySummary {
  totalItems: number;       // Sum of QOH
  totalRetailValue: number;  // Sum of price * qoh
  totalCostValue: number;    // Sum of cost * qoh
  estGrossMargin: number;    // Retail - Cost
  marginPct: number;        // (Retail - Cost) / Retail * 100
}

/**
 * Tarik data inventory dari API dan simpan sebagai snapshot bulanan di Supabase
 */
export async function syncInventory(
  locationCode: string,
  snapshotDate: string // YYYY-MM-DD (e.g. 2026-05-01)
): Promise<SyncInventoryResult> {
  try {
    const locationName = LOCATION_MAPPING[locationCode] || locationCode;

    // 1. Fetch data dari proxy API dan Master data dari Supabase
    const proxyUrl = `/api/sync-inventory?location=${encodeURIComponent(locationCode)}`;
    
    const [
      response,
      { data: masterCats },
      { data: masterColls }
    ] = await Promise.all([
      fetch(proxyUrl),
      supabase.from('master_main_category').select('*'),
      supabase.from('master_collection').select('*')
    ]);

    if (!response.ok) {
      return { 
        success: false, 
        inserted: 0, 
        deleted: 0, 
        error: `Gagal fetch data dari API: HTTP ${response.status}` 
      };
    }

    const apiData: ApiInventoryItem[] = await response.json();

    if (!Array.isArray(apiData)) {
      return { 
        success: false, 
        inserted: 0, 
        deleted: 0, 
        error: 'Data API tidak berformat array' 
      };
    }

    // 2. Buat map master data
    const catMap = new Map<string, string>();
    (masterCats || []).forEach((r: any) => catMap.set(String(r.code).trim().toUpperCase(), r.description));
    
    const collMap = new Map<string, string>();
    (masterColls || []).forEach((r: any) => collMap.set(String(r.code).trim().toUpperCase(), r.description));

    // Helper untuk normalisasi & deskripsi kategori
    const getResolvedCategory = (code: string) => {
      const cu = (code || '').toUpperCase();
      if (catMap.has(cu)) return catMap.get(cu)!;
      if (cu === 'JWL' || cu === 'JEWELRY') return 'Jewelry';
      if (cu === 'WTH' || cu === 'WATCHES') return 'Watches';
      if (cu === 'ACCS' || cu === 'ACCESSORIES') return 'Accessories';
      if (cu === 'PFM' || cu === 'PERFUME') return 'Perfume';
      return cu || 'Other';
    };

    const getResolvedCollectionName = (code: string) => {
      const cu = (code || '').toUpperCase();
      if (collMap.has(cu)) return collMap.get(cu)!;
      return cu || 'Unknown';
    };

    // 3. Bersihkan snapshot lama untuk lokasi & tanggal yang sama (agar tidak duplikat)
    const { error: deleteErr, count: deletedCount } = await supabase
      .from('inventory_valuation')
      .delete({ count: 'exact' })
      .eq('location_code', locationCode)
      .eq('snapshot_date', snapshotDate);

    if (deleteErr) {
      console.error('Gagal menghapus snapshot lama:', deleteErr);
      return { 
        success: false, 
        inserted: 0, 
        deleted: 0, 
        error: `Gagal menghapus data lama: ${deleteErr.message}` 
      };
    }

    if (apiData.length === 0) {
      return { 
        success: true, 
        inserted: 0, 
        deleted: deletedCount || 0 
      };
    }

    // 4. Siapkan rows untuk di-insert
    const rowsToInsert = apiData.map(item => {
      const codes = String(item.collectionCode || '').split(',').map(s => s.trim().toUpperCase());
      const mainCatCode = codes[0] || '';
      const collNameCode = codes[codes.length - 1] || '';

      const resolvedMainCat = getResolvedCategory(mainCatCode);
      const resolvedCollName = getResolvedCollectionName(collNameCode);

      return {
        snapshot_date: snapshotDate,
        location_code: locationCode,
        location_name: locationName,
        item_code: item.itemCode,
        item_sku: item.itemSku,
        item_name: item.itemName,
        description: item.description,
        item_price: parseFloat(String(item.itemPrice)) || 0,
        item_cost: parseFloat(String(item.itemCost)) || 0,
        collection_code: item.collectionCode,
        main_category: resolvedMainCat,
        collection_name: resolvedCollName,
        qoh: parseInt(String(item.qoh)) || 0,
        amount: parseFloat(String(item.amount)) || 0,
      };
    });

    // 5. Insert dalam batch 500 baris
    let inserted = 0;
    for (let i = 0; i < rowsToInsert.length; i += 500) {
      const batch = rowsToInsert.slice(i, i + 500);
      const { error: insertErr } = await supabase
        .from('inventory_valuation')
        .insert(batch);

      if (insertErr) {
        console.error('Gagal insert data inventory:', insertErr);
        return { 
          success: false, 
          inserted, 
          deleted: deletedCount || 0, 
          error: `Gagal menyimpan data baru: ${insertErr.message}` 
        };
      }
      inserted += batch.length;
    }

    return { 
      success: true, 
      inserted, 
      deleted: deletedCount || 0 
    };

  } catch (err: any) {
    return { 
      success: false, 
      inserted: 0, 
      deleted: 0, 
      error: err.message || 'Terjadi kesalahan tidak dikenal' 
    };
  }
}

/**
 * Mengambil data inventory dari database berdasarkan lokasi dan tanggal snapshot
 */
export async function getInventoryValuation(
  locationCode: string,
  snapshotDate: string
) {
  try {
    const { data, error } = await supabase
      .from('inventory_valuation')
      .select('*')
      .eq('location_code', locationCode)
      .eq('snapshot_date', snapshotDate)
      .order('id', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Mengambil daftar tanggal snapshot yang tersedia untuk filter dropdown
 */
export async function getAvailableSnapshots(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_valuation')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false });

    if (error) throw error;
    
    // Ambil nilai unik tanggal snapshot
    const dates = Array.from(new Set((data || []).map(r => r.snapshot_date)));
    return dates;
  } catch (err) {
    console.error('Gagal mengambil tanggal snapshot:', err);
    return [];
  }
}

export const inventoryService = {
  syncInventory,
  getInventoryValuation,
  getAvailableSnapshots,
  LOCATION_MAPPING
};

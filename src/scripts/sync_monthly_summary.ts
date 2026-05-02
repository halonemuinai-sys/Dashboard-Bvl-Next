import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function syncMonthlySummary() {
  console.log("🚀 Memulai agregasi data sales...");

  // 1. Ambil semua data penjualan
  const { data: sales, error: salesErr } = await supabase
    .from('clean_master')
    .select('transaction_date, net_sales, qty, trans_no');

  if (salesErr) {
    console.error("Gagal mengambil data clean_master:", salesErr);
    return;
  }

  // 2. Kelompokkan per Bulan & Tahun
  const summaryMap: Record<string, any> = {};

  sales.forEach(row => {
    const d = new Date(row.transaction_date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${month}`;

    if (!summaryMap[key]) {
      summaryMap[key] = {
        year,
        month_number: month,
        total_net_sales: 0,
        total_qty: 0,
        transSet: new Set()
      };
    }

    summaryMap[key].total_net_sales += (row.net_sales || 0);
    summaryMap[key].total_qty += (row.qty || 0);
    if (row.trans_no) summaryMap[key].transSet.add(row.trans_no);
  });

  const finalPayload = Object.values(summaryMap).map(item => ({
    year: item.year,
    month_number: item.month_number,
    total_net_sales: item.total_net_sales,
    total_qty: item.total_qty,
    total_transactions: item.transSet.size,
    updated_at: new Date().toISOString()
  }));

  // 3. Upsert ke tabel sales_monthly_summary
  console.log(`📦 Mengirim ${finalPayload.length} baris data ke sales_monthly_summary...`);
  
  const { error: upsertErr } = await supabase
    .from('sales_monthly_summary')
    .upsert(finalPayload, { onConflict: 'year,month_number' });

  if (upsertErr) {
    console.error("Gagal melakukan upsert summary:", upsertErr);
  } else {
    console.log("✅ Berhasil! Tabel sales_monthly_summary sekarang sudah terisi.");
  }
}

syncMonthlySummary();

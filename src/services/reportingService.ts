import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from './whatsappService';

export const reportingService = {
  /**
   * Mengambil ringkasan sales hari ini per toko
   */
  async getTodaySalesSummary() {
    // Ambil tanggal hari ini (format YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    const startRange = `${today}T00:00:00`;
    const endRange = `${today}T23:59:59`;

    const { data: rows, error } = await supabase
      .from('clean_master')
      .select('location, net_sales, qty')
      .gte('transaction_date', startRange)
      .lte('transaction_date', endRange);

    if (error) throw error;

    if (!rows || rows.length === 0) {
      return { success: false, message: "Belum ada transaksi untuk hari ini." };
    }

    // Grouping data per toko
    const summary: Record<string, { net: number; qty: number }> = {};
    let totalNet = 0;

    rows.forEach(row => {
      const loc = (row.location || 'Unknown').trim();
      // Abaikan Head Office untuk laporan butik
      if (loc.toLowerCase().includes('head office')) return;

      if (!summary[loc]) {
        summary[loc] = { net: 0, qty: 0 };
      }
      summary[loc].net += (row.net_sales || 0);
      summary[loc].qty += (row.qty || 0);
      totalNet += (row.net_sales || 0);
    });

    return { success: true, summary, totalNet, date: today };
  },

  /**
   * Memformat data sales menjadi pesan WhatsApp yang cantik
   */
  formatSalesMessage(data: any) {
    const { summary, totalNet, date } = data;
    
    // Format mata uang Rupiah
    const formatter = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    });

    let message = `*📊 LAPORAN SALES HARIAN BVLGARI*\n`;
    message += `📅 Tanggal: ${date}\n`;
    message += `------------------------------------------\n\n`;

    Object.entries(summary).forEach(([store, stats]: [string, any]) => {
      message += `🏬 *${store}*\n`;
      message += `💰 Sales: ${formatter.format(stats.net)}\n`;
      message += `📦 Qty: ${stats.qty} pcs\n\n`;
    });

    message += `------------------------------------------\n`;
    message += `*TOTAL RETAIL SALES: ${formatter.format(totalNet)}*\n\n`;
    message += `_Laporan ini dikirim otomatis oleh Bvlgari Intelligence System._`;

    return message;
  }
};

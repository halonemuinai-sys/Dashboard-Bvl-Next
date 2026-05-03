import { supabase } from '@/lib/supabase';
import { dashboardService } from './dashboardService';
import nodemailer from 'nodemailer';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ID_MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export const reportService = {
  /**
   * Generates and sends the daily sales report email exactly matching the GAS format.
   */
  async sendDailyReport(dateStr: string, emailTo?: string) {
    const formatCurrency = (val: number) => 
      new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

    const selectedDate = new Date(dateStr);
    const year = selectedDate.getFullYear();
    const monthIndex = selectedDate.getMonth();
    const day = selectedDate.getDate();
    const monthNameEN = MONTH_NAMES[monthIndex];
    const monthNameID = ID_MONTH_NAMES[monthIndex];
    
    const displayDate = `${day} ${monthNameID} ${year}`;

    // 1. Fetch MTD Sales up to the selected date
    const mStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01T00:00:00`;
    const mEnd = new Date(year, monthIndex, day, 23, 59, 59).toISOString();

    const [{ data: rows }, { data: targets }, crossingData] = await Promise.all([
      supabase
        .from('clean_master')
        .select('transaction_date, location, net_sales, comm, gross_sales')
        .gte('transaction_date', mStart)
        .lte('transaction_date', mEnd),
      supabase
        .from('targets')
        .select('store_name, target_value')
        .eq('year', year)
        .eq('month_number', monthIndex + 1),
      dashboardService.getCrossingSalesData(monthNameEN, year)
    ]);

    let totalStoreSales = 0;
    let totalHOSales = 0;
    let totalTargetStore = 0;
    let totalStoreComm = 0;
    let totalStoreGross = 0;

    const dailyTransactions: Record<string, Record<string, number>> = {};
    const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

    // Initialize daily array
    for (let i = 1; i <= day; i++) {
      const dKey = `${i} ${monthNameEN.substring(0, 3)} ${year}`;
      dailyTransactions[dKey] = { 'Plaza Indonesia': 0, 'Plaza Senayan': 0, 'Bali': 0 };
    }

    (rows || []).forEach(row => {
      const loc = (row.location || '').trim();
      const net = row.net_sales || 0;
      const isHO = loc.toLowerCase().includes('head office') || loc.toLowerCase() === 'ho';

      if (isHO) {
        totalHOSales += net;
      } else {
        totalStoreSales += net;
        totalStoreComm += (row.comm || 0);
        totalStoreGross += (row.gross_sales || 0);
        
        // Group by Date for Daily Transaction Table
        const tDate = new Date(row.transaction_date);
        const dKey = `${tDate.getDate()} ${monthNameEN.substring(0, 3)} ${year}`;
        
        let normLoc = loc;
        if (loc.toLowerCase().includes('indonesia')) normLoc = 'Plaza Indonesia';
        else if (loc.toLowerCase().includes('senayan')) normLoc = 'Plaza Senayan';
        else if (loc.toLowerCase().includes('bali')) normLoc = 'Bali';

        if (dailyTransactions[dKey] && dailyTransactions[dKey][normLoc] !== undefined) {
          dailyTransactions[dKey][normLoc] += net;
        }
      }
    });

    targets?.forEach(t => {
      if (!t.store_name.toLowerCase().includes('head office')) {
        totalTargetStore += t.target_value || 0;
      }
    });

    const totalSalesAll = totalStoreSales + totalHOSales;
    const storeAchievement = totalTargetStore > 0 ? (totalStoreSales / totalTargetStore) * 100 : 0;

    // Build the Crossing Sales Logic
    // We can calculate crossing performance based on crossingData
    // We need to map the target to each store for crossing performance
    const targetMap: Record<string, number> = {};
    targets?.forEach(t => {
      if (t.store_name.toLowerCase().includes('indonesia')) targetMap['Plaza Indonesia'] = t.target_value;
      if (t.store_name.toLowerCase().includes('senayan')) targetMap['Plaza Senayan'] = t.target_value;
      if (t.store_name.toLowerCase().includes('bali')) targetMap['Bali'] = t.target_value;
    });

    const crossingRows = STORES.map(store => {
      // Get adjusted sales (physical + crossed-in - crossed-out)
      // Actually, dashboardService.getCrossingSalesData returns storeStats.adjusted which is what we need.
      const adjustedSales = crossingData.storeStats[store]?.adjusted || 0;
      const target = targetMap[store] || 0;
      const performance = target > 0 ? (adjustedSales / target) * 100 : 0;
      return {
        location: store,
        sales: adjustedSales,
        performance: performance
      };
    });

    // Helper for color logic
    const getPerfColor = (perf: number) => {
      if (perf >= 100) return '#2563eb'; // Blue
      if (perf >= 80) return '#059669';  // Green
      return '#dc2626';                  // Red
    };

    const dashboardUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://script.google.com/macros/s/AKfycbze-dmRcWkRsbBx9qdnWe1c6DatoawhFS2cvrgG0el7AOy4BTfxLaVw91PcD4C9NrMS_w/exec';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            font-size: 14px; 
            color: #374151; 
            line-height: 1.6; 
            background-color: #f9fafb; 
            margin: 0; 
            padding: 20px 0; 
          }
          a { color: #2563eb; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .right { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .highlight { background-color: #fef3c7 !important; color: #92400e; }
        </style>
      </head>
      <body>
        <!-- Outlook safe container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
          <tr>
            <td align="center">
              <table width="700" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px auto;">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 30px 40px 20px 40px; border-bottom: 1px solid #f3f4f6;">
                    <h1 style="color: #111827; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.5px;">Laporan Penjualan Harian</h1>
                    <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">${displayDate}</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 30px 40px;">
                    <!-- Intro -->
                    <p style="font-size: 15px; color: #374151; margin: 0 0 15px 0;">Dear Pak Aldi,</p>
                    <p style="font-size: 15px; color: #374151; margin: 0 0 30px 0;">Berikut saya sampaikan ringkasan performa penjualan harian per tanggal <b>${displayDate}</b>. Data di bawah ini mencakup pencapaian <i>Month-to-Date</i> (MTD) seluruh butik beserta detail transaksi harian dan <i>crossing sales</i>.</p>

                    <!-- Summary -->
                    <table width="100%" border="0" cellpadding="12" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 30px;">
                      <tr>
                        <td style="border-bottom: 1px solid #e2e8f0; font-size: 14px;">Penjualan Store</td>
                        <td align="right" style="border-bottom: 1px solid #e2e8f0; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><b>${formatCurrency(totalStoreSales)}</b></td>
                      </tr>
                      <tr>
                        <td style="border-bottom: 1px solid #e2e8f0; font-size: 14px;">MTD Achievement (Exc. HO)</td>
                        <td align="right" style="border-bottom: 1px solid #e2e8f0; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: ${getPerfColor(storeAchievement)};"><b>${storeAchievement.toFixed(1)}%</b></td>
                      </tr>
                      <tr>
                        <td style="border-bottom: 1px solid #e2e8f0; font-size: 14px;">MDR Cost (MTD)</td>
                        <td align="right" style="border-bottom: 1px solid #e2e8f0; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: ${totalStoreComm / totalStoreGross * 100 > 2 ? '#ef4444' : '#111827'};"><b>${(totalStoreGross > 0 ? (totalStoreComm / totalStoreGross * 100) : 0).toFixed(2)}%</b></td>
                      </tr>
                      <tr>
                        <td style="border-bottom: 1px solid #e2e8f0; font-size: 14px;">Penjualan Head Office</td>
                        <td align="right" style="border-bottom: 1px solid #e2e8f0; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><b>${formatCurrency(totalHOSales)}</b></td>
                      </tr>
                      <tr>
                        <td style="padding-top: 15px; font-size: 16px; color: #0f172a; font-weight: 600;">Total Penjualan All</td>
                        <td align="right" style="padding-top: 15px; font-size: 16px; color: #0f172a; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">${formatCurrency(totalSalesAll)}</td>
                      </tr>
                    </table>

                    <p style="margin-bottom: 30px;">
                      <b><a href="${dashboardUrl}" style="font-size: 14px; color: #2563eb; text-decoration: none;">&rarr; Lihat Detail di BI Dashboard</a></b>
                    </p>

                    <!-- Crossing Sales -->
                    <h3 style="font-size: 16px; color: #111827; margin: 30px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Crossing Sales</h3>
                    <table width="100%" border="0" cellpadding="12" cellspacing="0" style="font-size: 13px; margin-bottom: 30px;">
                      <tr>
                        <th align="left" style="background-color: #f9fafb; font-weight: 600; color: #4b5563; border-bottom: 2px solid #d1d5db;">Location</th>
                        <th align="right" style="background-color: #f9fafb; font-weight: 600; color: #4b5563; border-bottom: 2px solid #d1d5db;">Total Crossing Sales</th>
                        <th align="right" style="background-color: #f9fafb; font-weight: 600; color: #4b5563; border-bottom: 2px solid #d1d5db;">Performance</th>
                      </tr>
                      ${crossingRows.map(r => `
                        <tr>
                          <td style="border-bottom: 1px solid #f3f4f6;">${r.location}</td>
                          <td align="right" style="border-bottom: 1px solid #f3f4f6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">${formatCurrency(r.sales)}</td>
                          <td align="right" style="border-bottom: 1px solid #f3f4f6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: ${getPerfColor(r.performance)}; font-weight: 600;">
                            ${r.performance.toFixed(1)}%
                          </td>
                        </tr>
                      `).join('')}
                    </table>

                    <!-- Daily Transaction -->
                    <h3 style="font-size: 16px; color: #111827; margin: 30px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Daily Transaction Breakdown</h3>
                    <table width="100%" border="0" cellpadding="12" cellspacing="0" style="font-size: 13px;">
                      <tr>
                        <th align="left" style="background-color: #f9fafb; font-weight: 600; color: #4b5563; border-bottom: 2px solid #d1d5db;">Date</th>
                        <th align="right" style="background-color: #f9fafb; font-weight: 600; color: #4b5563; border-bottom: 2px solid #d1d5db;">Plaza Indonesia</th>
                        <th align="right" style="background-color: #f9fafb; font-weight: 600; color: #4b5563; border-bottom: 2px solid #d1d5db;">Plaza Senayan</th>
                        <th align="right" style="background-color: #f9fafb; font-weight: 600; color: #4b5563; border-bottom: 2px solid #d1d5db;">Bali</th>
                      </tr>
                      <tr>
                        <td style="background-color: #f3f4f6; font-weight: 600; color: #111827; border-bottom: 1px solid #e5e7eb;">TOTAL MTD</td>
                        <td align="right" style="background-color: #f3f4f6; font-weight: 600; color: #111827; border-bottom: 1px solid #e5e7eb; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">${formatCurrency(crossingData.storeStats['Plaza Indonesia']?.physical || 0)}</td>
                        <td align="right" style="background-color: #f3f4f6; font-weight: 600; color: #111827; border-bottom: 1px solid #e5e7eb; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">${formatCurrency(crossingData.storeStats['Plaza Senayan']?.physical || 0)}</td>
                        <td align="right" style="background-color: #f3f4f6; font-weight: 600; color: #111827; border-bottom: 1px solid #e5e7eb; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">${formatCurrency(crossingData.storeStats['Bali']?.physical || 0)}</td>
                      </tr>
                      ${Object.entries(dailyTransactions).map(([d, stores]) => `
                        <tr>
                          <td style="color: #6b7280; font-size: 12px; border-bottom: 1px solid #f3f4f6;">${d}</td>
                          <td align="right" class="${stores['Plaza Indonesia'] === 0 ? 'highlight' : ''}" style="border-bottom: 1px solid #f3f4f6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">${stores['Plaza Indonesia'] === 0 ? '0' : formatCurrency(stores['Plaza Indonesia'])}</td>
                          <td align="right" class="${stores['Plaza Senayan'] === 0 ? 'highlight' : ''}" style="border-bottom: 1px solid #f3f4f6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">${stores['Plaza Senayan'] === 0 ? '0' : formatCurrency(stores['Plaza Senayan'])}</td>
                          <td align="right" class="${stores['Bali'] === 0 ? 'highlight' : ''}" style="border-bottom: 1px solid #f3f4f6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">${stores['Bali'] === 0 ? '0' : formatCurrency(stores['Bali'])}</td>
                        </tr>
                      `).join('')}
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 30px 40px; font-size: 13px; color: #4b5563; border-top: 1px solid #f3f4f6; background-color: #ffffff; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0;">Regards,</p>
                    <p style="margin: 4px 0 0 0;"><b>Aris Setiyono</b><br>IT Business Partner</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #111827;"><b>MRA Retail</b></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send Email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const targetEmail = emailTo || process.env.SMTP_USER;

    const mailOptions = {
      from: `"Bvlgari Dashboard" <${process.env.SMTP_USER}>`,
      to: targetEmail,
      subject: `Laporan Penjualan Harian Bulgari Indonesia : ${displayDate}`,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  }
};

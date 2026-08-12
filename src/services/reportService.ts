import { supabase } from '@/lib/supabase';
import { dashboardService } from './dashboardService';
import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';

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

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://202.6.239.245';
    const publicOverviewUrl = `${baseUrl}/public/overview`;
    const dashboardUrl = `${baseUrl}/`;

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
                    <table width="100%" border="0" cellpadding="12" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 25px;">
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
                        <td align="right" style="border-bottom: 1px solid #e2e8f0; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: ${totalStoreGross > 0 && (totalStoreComm / totalStoreGross * 100) > 2 ? '#ef4444' : '#111827'};"><b>${(totalStoreGross > 0 ? (totalStoreComm / totalStoreGross * 100) : 0).toFixed(2)}%</b></td>
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

                    <!-- Modern Executive BI Dashboard CTA Card -->
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0; background: #0f172a; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                      <tr>
                        <td style="padding: 24px 24px; text-align: center; background: #0f172a;">
                          <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; color: #f59e0b; text-transform: uppercase; letter-spacing: 1.5px;">LIVE EXECUTIVE BI DASHBOARD</p>
                          <h2 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">Monthly Overview Interactive Report</h2>
                          <p style="margin: 0 0 18px 0; font-size: 12px; color: #94a3b8;">Akses cepat &amp; langsung tanpa perlu login (Live Multi-Year, Daily Trend &amp; Crossing Sales)</p>
                          
                          <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                            <tr>
                              <td align="center" style="background-color: #d97706; border-radius: 8px; padding: 12px 28px;">
                                <a href="${publicOverviewUrl}" target="_blank" style="font-size: 13px; font-weight: 800; color: #ffffff; text-decoration: none; display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                  Buka Live Overview Dashboard &nbsp;&rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

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
  },

  /**
   * Sends Advisor Performance email matching GAS triggerAdvisorEmailManual logic.
   */
  async sendAdvisorReport(month: string, year: number, emailTo?: string) {
    const fmt = (val: number) =>
      Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    const getColor = (pct: number) =>
      pct >= 100 ? '#059669' : pct >= 80 ? '#2563eb' : pct >= 50 ? '#d97706' : '#dc2626';

    // Fetch monthly + YTD data
    const [monthly, ytd] = await Promise.all([
      dashboardService.getAdvisorPerformance(month, year),
      dashboardService.getAnnualAdvisorPerformance(year),
    ]);

    // Filter: exclude advisors with target = 0
    const advisors = (monthly.advisors || []).filter(a => a.target > 0);
    const ytdAdvisors = (ytd.advisors || []).filter((a: any) => a.target > 0);

    // Group monthly by store
    const PRIORITY = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];
    const grouped: Record<string, typeof advisors> = {};
    advisors.forEach(adv => {
      const loc = (adv.location || 'Unknown').trim();
      if (!grouped[loc]) grouped[loc] = [];
      grouped[loc].push(adv);
    });
    Object.keys(grouped).forEach(loc => grouped[loc].sort((a, b) => b.achievement - a.achievement));
    const storeOrder = Object.keys(grouped).sort((a, b) => {
      const ia = PRIORITY.indexOf(a), ib = PRIORITY.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

    const thBg = '#e8f0fe', thColor = '#1a3a5c', border = '#d6e4f0', zebra = '#f5f8fc';
    const thS = `padding:8px 12px;border:1px solid ${border};color:${thColor};background:${thBg};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;`;
    const cellS = `padding:8px 12px;border:1px solid ${border};font-size:12px;`;
    const cellR = `${cellS}text-align:right;`;
    const cellB = `${cellR}font-weight:600;`;

    let storeHtml = '';
    if (storeOrder.length === 0) {
      storeHtml = `<p style="color:#9ca3af;font-style:italic;font-size:13px;">No advisor data available for this period.</p>`;
    } else {
      storeOrder.forEach(store => {
        const list = grouped[store];
        const storeTotalSales = list.reduce((s, a) => s + a.netSales, 0);
        const storeTotalTarget = list.reduce((s, a) => s + a.target, 0);
        const storeAchv = storeTotalTarget > 0 ? (storeTotalSales / storeTotalTarget) * 100 : 0;

        storeHtml += `
        <p style="font-size:13px;font-weight:600;color:#374151;margin:18px 0 6px 0;">
          ${store} <span style="color:#9ca3af;font-weight:400;">(${list.length} advisors)</span>
          <span style="font-size:11px;color:${getColor(storeAchv)};font-weight:700;margin-left:8px;">${storeAchv.toFixed(1)}% achievement</span>
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;table-layout:fixed;">
          <tr>
            <th style="${thS}text-align:center;width:6%;">No</th>
            <th style="${thS}text-align:left;width:26%;">Advisor</th>
            <th style="${thS}text-align:right;width:8%;">Trx</th>
            <th style="${thS}text-align:right;width:20%;">Net Sales</th>
            <th style="${thS}text-align:right;width:18%;">Target</th>
            <th style="${thS}text-align:right;width:11%;">Achv %</th>
            <th style="${thS}text-align:right;width:11%;">Contrib %</th>
          </tr>`;

        list.forEach((adv, idx) => {
          const bg = idx % 2 !== 0 ? `background:${zebra};` : '';
          storeHtml += `
          <tr style="${bg}">
            <td style="${cellS}text-align:center;font-weight:600;">${idx + 1}</td>
            <td style="${cellS}">${adv.name}</td>
            <td style="${cellR}">${adv.transCount || 0}</td>
            <td style="${cellB}">${fmt(adv.netSales)}</td>
            <td style="${cellR}">${fmt(adv.target)}</td>
            <td style="${cellR}font-weight:600;color:${getColor(adv.achievement)};">${adv.achievement.toFixed(1)}%</td>
            <td style="${cellR}">${(adv.contribution || 0).toFixed(1)}%</td>
          </tr>`;
        });

        storeHtml += `</table>`;
      });
    }

    let ytdHtml = '';
    if (ytdAdvisors.length > 0) {
      ytdHtml = `
      <p style="font-size:14px;font-weight:600;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.5px;margin:28px 0 12px 0;">Year-To-Date (YTD) Performance ${year}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;table-layout:fixed;">
        <tr>
          <th style="${thS}text-align:center;width:6%;">No</th>
          <th style="${thS}text-align:left;width:34%;">Advisor</th>
          <th style="${thS}text-align:right;width:20%;">YTD Sales</th>
          <th style="${thS}text-align:right;width:20%;">YTD Target</th>
          <th style="${thS}text-align:right;width:20%;">Achv %</th>
        </tr>`;

      ytdAdvisors.forEach((adv: any, idx: number) => {
        const bg = idx % 2 !== 0 ? `background:${zebra};` : '';
        ytdHtml += `
        <tr style="${bg}">
          <td style="${cellS}text-align:center;font-weight:600;">${idx + 1}</td>
          <td style="${cellS}"><span style="font-weight:500;">${adv.name}</span><br><span style="font-size:10px;color:#9ca3af;">${adv.location || '-'}</span></td>
          <td style="${cellB}">${fmt(adv.netSales)}</td>
          <td style="${cellR}">${fmt(adv.target)}</td>
          <td style="${cellR}font-weight:600;color:${getColor(adv.achievement)};">${adv.achievement.toFixed(1)}%</td>
        </tr>`;
      });

      ytdHtml += `</table>`;
    }

    const dashboardUrl = process.env.NEXT_PUBLIC_SITE_URL || '#';

    const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#333333;max-width:700px;margin:0 auto;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f5fb;border-bottom:3px solid #4a90d9;">
        <tr><td style="padding:24px 28px;">
          <p style="color:#1a3a5c;font-size:18px;font-weight:700;margin:0 0 2px 0;">Advisor Performance Report</p>
          <p style="color:#6b8db5;font-size:12px;margin:0;">Period: ${month} ${year} &mdash; Bvlgari Indonesia</p>
        </td></tr>
      </table>
      <div style="padding:24px 28px;">
        <p style="font-size:13px;color:#374151;line-height:1.6;margin:0 0 24px 0;">
          Dear All,<br><br>
          Berikut ringkasan performa Advisor untuk periode <b>${month} ${year}</b>.
          Total <b>${advisors.length}</b> advisors tercatat aktif pada periode ini (exclude non-target).
        </p>
        <p style="font-size:14px;font-weight:600;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px 0;">Monthly Advisor Performance</p>
        ${storeHtml}
        ${ytdHtml}
        <p style="margin:28px 0 8px 0;font-size:13px;color:#374151;">For detailed analysis, please access the full dashboard:</p>
        <p style="margin:0 0 24px 0;"><a href="${dashboardUrl}" style="color:#2563EB;font-size:13px;font-weight:600;text-decoration:underline;">Open Bvlgari BI Dashboard</a></p>
        <div style="border-top:1px solid #e5e7eb;padding-top:14px;margin-top:8px;">
          <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.5;">
            This report was automatically generated by the Bvlgari Intelligence Dashboard<br>
            ${new Date().toLocaleString('id-ID')} &mdash; MRA Retail Indonesia
          </p>
        </div>
      </div>
    </div>`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const info = await transporter.sendMail({
      from: `"Bvlgari Dashboard" <${process.env.SMTP_USER}>`,
      to: emailTo || process.env.SMTP_USER,
      subject: `Advisor Performance Report - ${month} ${year} | Bvlgari Indonesia`,
      html,
    });

    return { success: true, messageId: info.messageId };
  },

  /**
   * Generates formatted Excel file for selected month, year, and location filter, and sends via email.
   */
  async sendMonthlyExcelReport(month: string, year: number, location: string = 'ALL', emailTo?: string, ccEmail?: string) {
    const isLocMatch = (rowLoc: string, targetLoc: string) => {
      if (!targetLoc || targetLoc.toUpperCase() === 'ALL' || targetLoc.toUpperCase() === 'ALL STORES' || targetLoc.toUpperCase() === 'SEMUA LOKASI') {
        return true;
      }
      const r = (rowLoc || '').toUpperCase();
      const t = targetLoc.toUpperCase();
      if (t.includes('INDONESIA') || t.includes('PI')) {
        return r.includes('INDONESIA') || r.includes('PI');
      }
      if (t.includes('SENAYAN') || t.includes('PS')) {
        return r.includes('SENAYAN') || r.includes('PS');
      }
      if (t.includes('BALI')) {
        return r.includes('BALI');
      }
      return r.includes(t);
    };

    const getEmailConfig = (targetLoc: string) => {
      const defaultCc = 'aris@mraretail.co.id, jessica@mogems.co.id';
      const t = (targetLoc || '').toUpperCase();
      if (t.includes('INDONESIA') || t.includes('PI')) {
        return { to: 'pi@mogems.co.id', cc: defaultCc, storeTitle: 'Plaza Indonesia' };
      }
      if (t.includes('SENAYAN') || t.includes('PS')) {
        return { to: 'ps@mogems.co.id', cc: defaultCc, storeTitle: 'Plaza Senayan' };
      }
      if (t.includes('BALI')) {
        return { to: 'bali@mogems.co.id', cc: defaultCc, storeTitle: 'Bali' };
      }
      return { to: 'aris@mraretail.co.id', cc: defaultCc, storeTitle: 'Semua Lokasi' };
    };

    const defaultConfig = getEmailConfig(location);
    const targetEmail = emailTo || defaultConfig.to;
    let targetCc = ccEmail !== undefined ? ccEmail : defaultConfig.cc;
    if (targetCc && !targetCc.includes('jessica@mogems.co.id')) {
      targetCc = `${targetCc}, jessica@mogems.co.id`;
    }
    const storeTitle = defaultConfig.storeTitle;

    // 1. Fetch raw data
    const [allSalesRows, allDpsSvcRows] = await Promise.all([
      dashboardService.getTransactions(month, year),
      dashboardService.getDpsSvcTransactions(month, year),
    ]);

    // 2. Filter data by store location
    const salesRows = (allSalesRows || []).filter(r => isLocMatch(r.location, location));
    const dpsSvcRows = (allDpsSvcRows || []).filter(r => isLocMatch(r.location, location));

    // 3. Create ExcelJS Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bvlgari Intelligence System';
    workbook.created = new Date();

    const fmtNum = (v: number) => Math.round(v || 0);

    // --- SHEET 1: Monthly Sales Transactions (Regular) ---
    const sheet1 = workbook.addWorksheet(`Sales ${month} ${year}`);
    sheet1.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Tanggal', key: 'transaction_date', width: 14 },
      { header: 'No. Invoice', key: 'trans_no', width: 24 },
      { header: 'Salesman (CA)', key: 'salesman', width: 22 },
      { header: 'Customer', key: 'customer', width: 24 },
      { header: 'Lokasi Butik', key: 'location', width: 18 },
      { header: 'Kategori Utama', key: 'main_category', width: 18 },
      { header: 'Koleksi', key: 'collection', width: 18 },
      { header: 'Kode SAP', key: 'sap_code', width: 14 },
      { header: 'Kode Katalog', key: 'catalogue_code', width: 16 },
      { header: 'Qty (Pcs)', key: 'qty', width: 10 },
      { header: 'Gross Sales (IDR)', key: 'gross_sales', width: 20 },
      { header: 'Diskon (IDR)', key: 'val_disc', width: 18 },
      { header: 'Net Sales (IDR)', key: 'net_sales', width: 20 },
      { header: 'Card Comm / MDR (IDR)', key: 'comm', width: 22 },
      { header: 'Tipe Transaksi', key: 'type', width: 14 },
    ];

    const headerRow1 = sheet1.getRow(1);
    headerRow1.height = 26;
    headerRow1.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    (salesRows || []).forEach((r: any, idx: number) => {
      const row = sheet1.addRow({
        no: idx + 1,
        transaction_date: r.transaction_date ? String(r.transaction_date).substring(0, 10) : '',
        trans_no: r.trans_no || '',
        salesman: r.salesman || '',
        customer: r.customer || '',
        location: r.location || '',
        main_category: r.main_category || '',
        collection: r.collection || '',
        sap_code: r.sap_code || '',
        catalogue_code: r.catalogue_code || '',
        qty: r.qty || 1,
        gross_sales: fmtNum(r.gross_sales),
        val_disc: fmtNum(r.val_disc),
        net_sales: fmtNum(r.net_sales),
        comm: fmtNum(r.comm),
        type: r.type || 'Regular',
      });

      row.getCell('gross_sales').numFmt = '#,##0';
      row.getCell('val_disc').numFmt = '#,##0';
      row.getCell('net_sales').numFmt = '#,##0';
      row.getCell('comm').numFmt = '#,##0';
    });

    const lastRowIdx1 = salesRows.length + 1;
    if (salesRows.length > 0) {
      const sumRow1 = sheet1.addRow({
        no: 'TOTAL',
        qty: { formula: `SUM(K2:K${lastRowIdx1})` },
        gross_sales: { formula: `SUM(L2:L${lastRowIdx1})` },
        val_disc: { formula: `SUM(M2:M${lastRowIdx1})` },
        net_sales: { formula: `SUM(N2:N${lastRowIdx1})` },
        comm: { formula: `SUM(O2:O${lastRowIdx1})` },
      });
      sumRow1.height = 24;
      sumRow1.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '78350F' } };
      });
    }

    // --- SHEET 2: DP & SVC Transactions ---
    const sheet2 = workbook.addWorksheet(`DP & SVC ${month} ${year}`);
    sheet2.columns = sheet1.columns;

    const headerRow2 = sheet2.getRow(1);
    headerRow2.height = 26;
    headerRow2.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    (dpsSvcRows || []).forEach((r: any, idx: number) => {
      const row = sheet2.addRow({
        no: idx + 1,
        transaction_date: r.transaction_date ? String(r.transaction_date).substring(0, 10) : '',
        trans_no: r.trans_no || '',
        salesman: r.salesman || '',
        customer: r.customer || '',
        location: r.location || '',
        main_category: r.collection || '',
        collection: r.collection || '',
        sap_code: r.sap_code || '',
        catalogue_code: r.catalogue_code || '',
        qty: r.qty || 1,
        gross_sales: fmtNum(r.gross_sales),
        val_disc: fmtNum(r.val_disc),
        net_sales: fmtNum(r.net_sales),
        comm: fmtNum(r.comm),
        type: r.collection || 'DPS',
      });

      row.getCell('gross_sales').numFmt = '#,##0';
      row.getCell('val_disc').numFmt = '#,##0';
      row.getCell('net_sales').numFmt = '#,##0';
      row.getCell('comm').numFmt = '#,##0';
    });

    const lastRowIdx2 = dpsSvcRows.length + 1;
    if (dpsSvcRows.length > 0) {
      const sumRow2 = sheet2.addRow({
        no: 'TOTAL',
        qty: { formula: `SUM(K2:K${lastRowIdx2})` },
        gross_sales: { formula: `SUM(L2:L${lastRowIdx2})` },
        val_disc: { formula: `SUM(M2:M${lastRowIdx2})` },
        net_sales: { formula: `SUM(N2:N${lastRowIdx2})` },
        comm: { formula: `SUM(O2:O${lastRowIdx2})` },
      });
      sumRow2.height = 24;
      sumRow2.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '78350F' } };
      });
    }

    // 4. Calculate Summary Metrics & Breakdown Tables for HTML Email Body
    const fmtIDR = (v: number) => 'Rp ' + Math.round(v || 0).toLocaleString('id-ID');

    // Group by Daily Date (Daily Sales Breakdown - EXCLUDES DP & SVC)
    const dailyMap: Record<string, { dateStr: string; txCount: number; qty: number; net: number; comm: number }> = {};
    salesRows.forEach(r => {
      const rawDate = r.transaction_date || (r as any).trans_date || (r as any).date || '';
      const dateKey = String(rawDate).substring(0, 10);
      if (!dateKey) return;

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { dateStr: dateKey, txCount: 0, qty: 0, net: 0, comm: 0 };
      }
      dailyMap[dateKey].txCount += 1;
      dailyMap[dateKey].qty += (r.qty || 1);
      dailyMap[dateKey].net += (r.net_sales || 0);
      dailyMap[dateKey].comm += (r.comm || 0);
    });

    const dailyList = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0]));
    const dailyRowsHtml = dailyList.map(([dKey, stats]) => {
      let formattedDate = dKey;
      try {
        const dObj = new Date(dKey);
        if (!isNaN(dObj.getTime())) {
          formattedDate = dObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        }
      } catch (e) {}

      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${formattedDate}</td>
          <td align="right" style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${stats.txCount} Trx</td>
          <td align="right" style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${stats.qty} Pcs</td>
          <td align="right" style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-weight: bold; color: #0F172A;">${fmtIDR(stats.net)}</td>
          <td align="right" style="padding: 10px; border-bottom: 1px solid #E2E8F0; color: #15803D;">${fmtIDR(stats.comm)}</td>
        </tr>
      `;
    }).join('');

    // Group by Category (Product Sales)
    const catMap: Record<string, { qty: number; net: number; comm: number }> = {};
    salesRows.forEach(r => {
      const cat = r.main_category || 'Others';
      if (!catMap[cat]) catMap[cat] = { qty: 0, net: 0, comm: 0 };
      catMap[cat].qty += (r.qty || 1);
      catMap[cat].net += (r.net_sales || 0);
      catMap[cat].comm += (r.comm || 0);
    });

    const regularNetSales = salesRows.reduce((s, r) => s + (r.net_sales || 0), 0);
    const dpsSvcNetSales = dpsSvcRows.reduce((s, r) => s + (r.net_sales || 0), 0);
    
    const totalGrossSales = salesRows.reduce((s, r) => s + (r.gross_sales || 0), 0) + dpsSvcRows.reduce((s, r) => s + (r.gross_sales || 0), 0);
    const totalComm = salesRows.reduce((s, r) => s + (r.comm || 0), 0) + dpsSvcRows.reduce((s, r) => s + (r.comm || 0), 0);
    const mdrPct = totalGrossSales > 0 ? (totalComm / totalGrossSales) * 100 : 0;

    const catList = Object.entries(catMap).sort((a, b) => b[1].net - a[1].net);
    const catRowsHtml = catList.map(([catName, stats]) => {
      const pct = regularNetSales > 0 ? (stats.net / regularNetSales) * 100 : 0;
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${catName}</td>
          <td align="right" style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${stats.qty} Pcs</td>
          <td align="right" style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-weight: bold; color: #0F172A;">${fmtIDR(stats.net)}</td>
          <td align="right" style="padding: 10px; border-bottom: 1px solid #E2E8F0; color: #15803D;">${fmtIDR(stats.comm)}</td>
          <td align="right" style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #2563EB;">${pct.toFixed(1)}%</td>
        </tr>
      `;
    }).join('');

    // Group by Advisor (EXCLUDES DP & SVC)
    const advMap: Record<string, { tx: number; net: number; comm: number }> = {};
    salesRows.forEach(r => {
      const advName = r.salesman || 'Unknown';
      if (!advMap[advName]) advMap[advName] = { tx: 0, net: 0, comm: 0 };
      advMap[advName].tx += 1;
      advMap[advName].net += (r.net_sales || 0);
      advMap[advName].comm += (r.comm || 0);
    });

    const advList = Object.entries(advMap).sort((a, b) => b[1].net - a[1].net);
    const advRowsHtml = advList.map(([advName, stats]) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${advName}</td>
        <td align="right" style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${stats.tx} Trx</td>
        <td align="right" style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-weight: bold; color: #0F172A;">${fmtIDR(stats.net)}</td>
        <td align="right" style="padding: 10px; border-bottom: 1px solid #E2E8F0; color: #15803D;">${fmtIDR(stats.comm)}</td>
      </tr>
    `).join('');

    // Convert workbook to Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Send Email via Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const mailOptions: any = {
      from: `"Bvlgari Intelligence" <${process.env.SMTP_USER}>`,
      to: targetEmail,
      subject: `Laporan Penjualan Bulanan Bvlgari - ${storeTitle} (${month} ${year})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 20px 0; }
            .table-custom { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            .table-custom th { background-color: #0F172A; color: #FFFFFF; font-weight: 600; padding: 10px; text-align: left; }
            .table-custom td { padding: 10px; border-bottom: 1px solid #E2E8F0; }
            .table-custom tr:nth-child(even) { background-color: #F8FAFC; }
          </style>
        </head>
        <body>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC;">
            <tr>
              <td align="center">
                <table width="680" border="0" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; margin: 20px auto; text-align: left;">
                  <!-- Header Banner -->
                  <tr>
                    <td style="background: #0F172A; padding: 24px 30px; border-radius: 12px 12px 0 0; color: #FFFFFF;">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <p style="color: #94A3B8; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; margin: 0;">BVLGARI INDONESIA • EXECUTIVE SALES REPORT</p>
                            <h1 style="color: #FFFFFF; font-size: 22px; margin: 4px 0 0 0; font-weight: bold;">Laporan Penjualan Bulanan</h1>
                          </td>
                          <td align="right">
                            <span style="background: #FEF3C7; color: #B45309; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 12px;">${storeTitle}</span>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #CBD5E1; font-size: 13px; margin: 12px 0 0 0;">Periode Laporan: <b>${month} ${year}</b></p>
                    </td>
                  </tr>

                  <!-- Content Body -->
                  <tr>
                    <td style="padding: 24px 30px;">
                      <p style="font-size: 14px; color: #334155; margin-top: 0;">Dear Team <b>${storeTitle}</b>,</p>
                      <p style="font-size: 14px; color: #334155; line-height: 1.6;">Berikut adalah rangkuman eksekutif performa penjualan dan biaya komisi kartu kredit (MDR Fee) untuk <b>${storeTitle}</b> periode <b>${month} ${year}</b>. Berkas rekapitulasi data lengkap dalam format <b>Microsoft Excel (.xlsx)</b> telah dilampirkan pada email ini.</p>

                      <!-- KPI Cards Grid (3 Cards) -->
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                        <tr>
                          <td width="31%" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px;" valign="top">
                            <p style="font-size: 9px; font-weight: 800; color: #64748B; margin: 0; letter-spacing: 0.5px;">NET SALES (PRODUK)</p>
                            <p style="font-size: 16px; font-weight: bold; color: #0F172A; margin: 4px 0 0 0;">${fmtIDR(regularNetSales)}</p>
                            <p style="font-size: 10px; color: #64748B; margin: 4px 0 0 0;"><b>${salesRows.length}</b> Trx Sales</p>
                          </td>
                          <td width="3.5%"></td>
                          <td width="31%" style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 14px;" valign="top">
                            <p style="font-size: 9px; font-weight: 800; color: #1E40AF; margin: 0; letter-spacing: 0.5px;">DOWN PAYMENT & SVC</p>
                            <p style="font-size: 16px; font-weight: bold; color: #1D4ED8; margin: 4px 0 0 0;">${fmtIDR(dpsSvcNetSales)}</p>
                            <p style="font-size: 10px; color: #1E40AF; margin: 4px 0 0 0;"><b>${dpsSvcRows.length}</b> Trx DP/SVC</p>
                          </td>
                          <td width="3.5%"></td>
                          <td width="31%" style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px;" valign="top">
                            <p style="font-size: 9px; font-weight: 800; color: #166534; margin: 0; letter-spacing: 0.5px;">CARD COMM (MDR FEE)</p>
                            <p style="font-size: 16px; font-weight: bold; color: #15803D; margin: 4px 0 0 0;">${fmtIDR(totalComm)}</p>
                            <p style="font-size: 10px; color: #166534; margin: 4px 0 0 0;">MDR Ratio: <b>${mdrPct.toFixed(2)}%</b></p>
                          </td>
                        </tr>
                      </table>

                      <!-- Daily Sales Breakdown Table -->
                      ${dailyRowsHtml ? `
                      <h3 style="font-size: 15px; color: #0F172A; margin: 24px 0 10px 0; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px;">
                        Rincian Penjualan Harian (Daily Sales)
                      </h3>
                      <table width="100%" border="0" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
                        <thead>
                          <tr style="background-color: #0F172A; color: #FFFFFF;">
                            <th align="left" style="padding: 10px; border-radius: 6px 0 0 0;">Tanggal Transaksi</th>
                            <th align="right" style="padding: 10px;">Trx</th>
                            <th align="right" style="padding: 10px;">Qty</th>
                            <th align="right" style="padding: 10px;">Net Sales (IDR)</th>
                            <th align="right" style="padding: 10px; border-radius: 0 6px 0 0;">Card Comm (IDR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${dailyRowsHtml}
                        </tbody>
                      </table>
                      ` : ''}

                      <!-- Category Breakdown Table -->
                      <h3 style="font-size: 15px; color: #0F172A; margin: 24px 0 10px 0; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px;">
                        Perincian Penjualan Per Kategori
                      </h3>
                      <table width="100%" border="0" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
                        <thead>
                          <tr style="background-color: #0F172A; color: #FFFFFF;">
                            <th align="left" style="padding: 10px; border-radius: 6px 0 0 0;">Kategori / Tipe</th>
                            <th align="right" style="padding: 10px;">Qty</th>
                            <th align="right" style="padding: 10px;">Net Sales (IDR)</th>
                            <th align="right" style="padding: 10px;">Card Comm (IDR)</th>
                            <th align="right" style="padding: 10px; border-radius: 0 6px 0 0;">Kontribusi</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${catRowsHtml}
                        </tbody>
                      </table>

                      <!-- Advisor Breakdown Table -->
                      ${advRowsHtml ? `
                      <h3 style="font-size: 15px; color: #0F172A; margin: 24px 0 10px 0; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px;">
                        Performa Customer Advisor (${storeTitle})
                      </h3>
                      <table width="100%" border="0" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-size: 13px;">
                        <thead>
                          <tr style="background-color: #0F172A; color: #FFFFFF;">
                            <th align="left" style="padding: 10px; border-radius: 6px 0 0 0;">Salesman / Advisor</th>
                            <th align="right" style="padding: 10px;">Trx</th>
                            <th align="right" style="padding: 10px;">Net Sales (IDR)</th>
                            <th align="right" style="padding: 10px; border-radius: 0 6px 0 0;">Komisi Kartu (IDR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${advRowsHtml}
                        </tbody>
                      </table>
                      ` : ''}

                      <!-- Excel Attachment Notice -->
                      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin-top: 24px;">
                        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #0F172A;">Lampiran Berkas Excel (.xlsx):</p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                          <b>Laporan_Transaksi_Bvlgari_${storeTitle.replace(/\s+/g, '_')}_${month}_${year}.xlsx</b><br>
                          • <b>Sheet 1 (Sales ${month} ${year})</b>: Detail ${salesRows.length} baris transaksi Sales.<br>
                          • <b>Sheet 2 (DP & SVC ${month} ${year})</b>: Detail ${dpsSvcRows.length} baris transaksi Down Payment & Service.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 30px; background: #F8FAFC; border-top: 1px solid #E2E8F0; border-radius: 0 0 12px 12px; font-size: 12px; color: #64748B;">
                      <p style="margin: 0;">Salam hangat,</p>
                      <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: bold; color: #0F172A;">Bvlgari Intelligence System</p>
                      <p style="margin: 2px 0 0 0; color: #94A3B8;">MRA Retail Indonesia</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `Laporan_Transaksi_Bvlgari_${storeTitle.replace(/\s+/g, '_')}_${month}_${year}.xlsx`,
          content: Buffer.from(buffer),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    };

    if (targetCc) {
      mailOptions.cc = targetCc;
    }

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      emailTo: targetEmail,
      emailCc: targetCc,
      location: storeTitle,
      salesCount: salesRows.length,
      dpsSvcCount: dpsSvcRows.length,
    };
  },
};

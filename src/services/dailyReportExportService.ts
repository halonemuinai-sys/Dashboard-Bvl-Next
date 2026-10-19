import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';
import { getInvoices } from '@/services/dashboard/invoiceService';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { monthBounds, type InvoiceReportFilters } from '@/lib/invoice-report-filters';
import type { CrmReportProfile } from './dailyReportWorkbook';
import { buildStoreDailyWorkbook } from './storeDailyWorkbook';
import { buildStoreReportData, type DpServiceRow } from './storeDailyReport';
import { getAdvisorProductivity } from './dashboard/productivityService';
import { normalizeReportStore, type AdvisorHome, type AdvisorRotation } from '@/lib/report-attribution';
import { DEPOSIT_LINK_PREFIX, readDepositLink } from '@/lib/deposit-links';
export { getSaInitial, SA_INITIALS } from './dailyReportWorkbook';

export interface ExportReportOptions extends InvoiceReportFilters { month: number; year: number }
export async function generateDailySalesReportExcel(options: ExportReportOptions, db: SupabaseClient = createAdminClient()) {
  const { start, end } = monthBounds(options.month, options.year);
  const selectedStore = normalizeReportStore(options.store || 'ALL');
  const monthName = new Date(Date.UTC(options.year, options.month - 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const templatePath = [path.join(process.cwd(), 'public', 'templates', 'daily_sales_template.xlsx'), path.join(process.cwd(), 'templates', 'daily_sales_template.xlsx')].find(candidate => fs.existsSync(candidate));
  if (!templatePath) throw new Error('Daily Sales Report template is unavailable.');
  const [invoices, profiles, advisors, rotations, dpService, depositRows, productivity] = await Promise.all([
    getInvoices(monthName, options.year, db),
    fetchAllRows((from, to) => db.from('crm_profiling').select('id,nama_lengkap,no_hp,kewarganegaraan,status_pelanggan').order('id').range(from, to)),
    fetchAllRows((from, to) => db.from('advisors').select('name,home_location').order('name').range(from, to)),
    fetchAllRows((from, to) => db.from('advisor_rotations').select('advisor_name,assigned_location').eq('year', options.year).eq('month_number', options.month).order('advisor_name').range(from, to)),
    fetchAllRows((from, to) => db.from('bvlgari_sales').select('id,transaction_no,transaction_date,customer_name,salesman,location,collection,sap_code,catalogue_code,price,qty,sub_total_discount,net_sales,card_comm,type').gte('transaction_date', start).lt('transaction_date', end).in('collection', ['DPS', 'SVC']).order('id').range(from, to)),
    fetchAllRows((from, to) => db.from('transaction_records_meta').select('trans_no,other_remarks').like('trans_no', `${DEPOSIT_LINK_PREFIX.replaceAll('_', '\\_')}%`).order('trans_no').range(from, to)),
    getAdvisorProductivity(options.month, options.year, db, selectedStore),
  ]);
  const report = buildStoreReportData(invoices, advisors as AdvisorHome[], rotations as AdvisorRotation[], selectedStore);
  const links = depositRows.map(row => {
    const link = readDepositLink(row);
    if (!link) throw new Error('A saved DP reference could not be read.');
    return link;
  });
  const scopedRaw = (dpService as DpServiceRow[]).filter(row => selectedStore === 'ALL' || normalizeReportStore(row.location) === selectedStore);
  const template = new ExcelJS.Workbook();
  await template.xlsx.readFile(templatePath);
  const result = buildStoreDailyWorkbook(template, report, profiles as CrmReportProfile[], scopedRaw, links, productivity, { month: options.month, year: options.year, store: selectedStore });
  const buffer = await result.workbook.xlsx.writeBuffer();
  const store = options.store && options.store !== 'ALL' ? options.store : 'ALL STORES';
  return { buffer: Buffer.from(buffer), filename: `DAILY SALES REPORT BVLGARI ${store.toUpperCase()} ${monthName.toUpperCase()} ${options.year}.xlsx`, totalRows: result.totalRows, totalGross: result.totalGross, totalNet: result.totalNet };
}

import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Mapping Sales Advisor Name to 2-letter Initial for sheet DS
export const SA_INITIALS: Record<string, string> = {
  'AJENG': 'AJ',
  'SYANDY': 'SD',
  'SISKA': 'SK',
  'HERDY': 'HS',
  'DIAN': 'DP',
  'IRMA': 'IR',
  'JOJO': 'JJ',
  'ARI': 'AK',
  'ALVIN': 'AL',
  'MONIQ': 'MM',
  'MONICA': 'MM',
  'ARIF': 'AR',
  'ARIF PS': 'AR',
};

export function getSaInitial(name: string | null | undefined): string {
  if (!name) return '';
  const upper = name.trim().toUpperCase();
  for (const [k, v] of Object.entries(SA_INITIALS)) {
    if (upper.includes(k)) return v;
  }
  const parts = upper.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return upper.slice(0, 2);
}

export interface ExportReportOptions {
  month?: number; // 1 - 12
  year?: number;  // e.g. 2026
  store?: string; // 'Plaza Indonesia', 'Plaza Senayan', 'Bali'
}

/**
 * Generates an Excel buffer by taking the master template and injecting live Supabase sales data.
 * Does NOT alter the original file on disk.
 */
export async function generateDailySalesReportExcel(options: ExportReportOptions = {}): Promise<{
  buffer: Buffer;
  filename: string;
  totalRows: number;
  totalGross: number;
  totalNet: number;
}> {
  const now = new Date();
  const month = options.month || (now.getMonth() + 1);
  const year = options.year || now.getFullYear();
  const store = options.store || 'Plaza Indonesia';

  // Format month names
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const monthName = monthNames[month - 1];
  const filename = `DAILY SALES REPORT BVLGARI ${store.toUpperCase()} ${monthName} ${year}.xlsx`;

  // Path to the template (supports standalone runner image where public is copied)
  const candidatePaths = [
    path.join(process.cwd(), 'public', 'templates', 'daily_sales_template.xlsx'),
    path.join(process.cwd(), 'templates', 'daily_sales_template.xlsx'),
    path.join(process.cwd(), 'DAILY SALES REPORT BVLGARI PLAZA INDONESIA SEPTEMBER 2026.xlsx'),
  ];
  const templatePath = candidatePaths.find(p => fs.existsSync(p));
  if (!templatePath) {
    throw new Error(`Master template not found in: ${candidatePaths.join(', ')}`);
  }

  // Calculate start & end date of the month
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // 1. Fetch live sales from Supabase bvlgari_sales
  let query = supabase
    .from('bvlgari_sales')
    .select('*')
    .gte('transaction_date', startDateStr)
    .lte('transaction_date', endDateStr)
    .order('transaction_date', { ascending: true })
    .order('transaction_time', { ascending: true });

  if (store && store !== 'ALL') {
    query = query.ilike('location', `%${store}%`);
  }

  const { data: salesRows, error: salesErr } = await query;
  if (salesErr) {
    throw new Error(`Failed to fetch sales from Supabase: ${salesErr.message}`);
  }

  // 2. Fetch CRM Profiles for customer enrichment (nationality, CRM ID, new/old)
  const { data: crmProfiles } = await supabase
    .from('crm_profiling')
    .select('id, nama_lengkap, no_hp, kewarganegaraan, status_pelanggan');

  const crmMapByName = new Map<string, any>();
  const crmMapByPhone = new Map<string, any>();
  if (crmProfiles) {
    for (const p of crmProfiles) {
      if (p.nama_lengkap) crmMapByName.set(p.nama_lengkap.trim().toLowerCase(), p);
      if (p.no_hp) {
        const cleanPhone = p.no_hp.replace(/[^0-9]/g, '');
        if (cleanPhone) crmMapByPhone.set(cleanPhone, p);
      }
    }
  }

  // 3. Load master template with ExcelJS
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const ws = workbook.getWorksheet('DS');
  if (!ws) {
    throw new Error("Sheet 'DS' not found in master template.");
  }

  // Update Header Periode (Row 3, Col B)
  ws.getCell('B3').value = new Date(year, month - 1, 1);
  ws.getCell('A1').value = `BVLGARI – ${store}`;

  // Clear data rows from Row 7 to Row 319 (preserving styles/borders where possible)
  for (let r = 7; r <= 319; r++) {
    for (let c = 1; c <= 36; c++) {
      const cell = ws.getCell(r, c);
      cell.value = null;
    }
  }

  let totalGross = 0;
  let totalNet = 0;
  let currentRow = 7;

  if (!salesRows || salesRows.length === 0) {
    // If no sales in period, set row 7 as NO SALE
    ws.getCell('A7').value = new Date(year, month - 1, 1);
    ws.getCell('B7').value = 'NO SALE';
  } else {
    let lastDate: string | null = null;
    let dateStartRow = 7;

    for (let i = 0; i < salesRows.length; i++) {
      const item = salesRows[i];
      const r = 7 + i;
      if (r > 319) break; // Maximum rows allocated before summary

      const txDateStr = item.transaction_date ? String(item.transaction_date).slice(0, 10) : '';
      const isNewDate = txDateStr !== lastDate;

      // Group totals if date changes
      if (isNewDate && i > 0) {
        const prevEndRow = r - 1;
        ws.getCell(`AD${prevEndRow}`).value = { formula: `SUM(AC${dateStartRow}:AC${prevEndRow})` };
        dateStartRow = r;
      }
      lastDate = txDateStr;

      // Date in Col A (only on first transaction of that date)
      if (isNewDate && txDateStr) {
        ws.getCell(`A${r}`).value = new Date(txDateStr);
      }

      // CB No in Col B
      ws.getCell(`B${r}`).value = item.case_no || '';

      // Sales Invoice No in Col C
      ws.getCell(`C${r}`).value = item.transaction_no || '';

      // Customer Name in Col D
      const custName = item.customer_name || '';
      ws.getCell(`D${r}`).value = custName;

      // Look up CRM Profile
      let matchedProfile = null;
      if (custName) {
        matchedProfile = crmMapByName.get(custName.trim().toLowerCase());
      }
      if (!matchedProfile && item.phone_no) {
        const cleanP = String(item.phone_no).replace(/[^0-9]/g, '');
        if (cleanP) matchedProfile = crmMapByPhone.get(cleanP);
      }

      // Cosmo CRM ID in Col E
      if (matchedProfile?.id) {
        ws.getCell(`E${r}`).value = matchedProfile.id;
      }

      // Nationality in Col F
      ws.getCell(`F${r}`).value = matchedProfile?.kewarganegaraan || 'Indonesia';

      // New vs Old in Col G & H
      const isNew = matchedProfile?.status_pelanggan === 'New';
      if (isNew) {
        ws.getCell(`G${r}`).value = 1;
      } else {
        ws.getCell(`H${r}`).value = 1;
      }

      // Walk-in (W) vs Follow-up (F) in Col I & J
      ws.getCell(`I${r}`).value = 1; // Default walk-in

      // Category in Col K
      const cat = (item.collection || item.main_category || 'JEWELRY').toUpperCase();
      let normCat = 'JEWELRY';
      if (cat.includes('WATCH')) normCat = 'WATCHES';
      else if (cat.includes('PERF')) normCat = 'PERFUME';
      else if (cat.includes('LEATH') || cat.includes('LLGA') || cat.includes('BAG')) normCat = 'LLGA';
      ws.getCell(`K${r}`).value = normCat;

      // SAP Code in Col L
      ws.getCell(`L${r}`).value = item.sap_code ? String(item.sap_code) : '';

      // Item Name / Catalogue Code in Col M
      ws.getCell(`M${r}`).value = item.catalogue_code || '';

      // Serial No in Col N
      ws.getCell(`N${r}`).value = item.case_no || '';

      // Description in Col O
      ws.getCell(`O${r}`).value = item.description || '';

      // Qty in Col P
      const qty = Number(item.qty) || 1;
      ws.getCell(`P${r}`).value = qty;

      // Gross Sales in Col Q
      const gross = Number(item.price) || 0;
      ws.getCell(`Q${r}`).value = gross;
      totalGross += gross;

      // Disc % in Col R (formula)
      ws.getCell(`R${r}`).value = { formula: `(Q${r}-S${r})/Q${r}*100` };

      // Net Sales in Col S
      const discount = Number(item.sub_total_discount) || 0;
      const net = Number(item.net_sales) || (gross - discount);
      ws.getCell(`S${r}`).value = net;
      totalNet += net;

      // Card Commission formula in Col AB (approx 1.3%)
      ws.getCell(`AB${r}`).value = { formula: `W${r}*1.3%` };

      // Net Sales DPP (excluding 11% PPN) in Col AC
      ws.getCell(`AC${r}`).value = { formula: `(S${r}/1.11)` };

      // Served By in Col AE
      const salesman = item.salesman || '';
      ws.getCell(`AE${r}`).value = salesman;

      // Entitle / Initial in Col AG
      ws.getCell(`AG${r}`).value = getSaInitial(salesman);

      currentRow = r;
    }

    // Final date group total achievement in Col AD
    if (salesRows.length > 0) {
      ws.getCell(`AD${currentRow}`).value = { formula: `SUM(AC${dateStartRow}:AC${currentRow})` };
    }
  }

  // Write workbook to buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(buffer),
    filename,
    totalRows: salesRows?.length || 0,
    totalGross,
    totalNet,
  };
}

import ExcelJS from 'exceljs';
import type { InvoiceHeader } from '@/services/dashboard/invoiceService';
import { crmCosmoId } from '@/lib/crm-cosmo';
import type { InvoiceReportFilters } from '@/lib/invoice-report-filters';

export interface CrmReportProfile { nama_lengkap: string | null; no_hp: string | null; kewarganegaraan: string | null; status_pelanggan: string | null }
export interface ReportPayment { paymentType: string; amount: number; bank?: string; edc?: string; cardType?: string; installment?: string; mdrPct?: number; cardComm?: number }
const CARD_PAYMENT_TYPES = new Set(['Credit Card', 'Debit Card', 'Link Payment']);
const NON_CARD_PAYMENT_TYPES = new Set(['Cash', 'Transfer', 'Deposit', 'Voucher', 'Rounding', 'QRIS']);
const paymentLabel = (value: string | undefined) => value && value !== '--' ? value : '';

export function summarizeReportPayments(payments: ReportPayment[]) {
  for (const payment of payments) {
    if (!CARD_PAYMENT_TYPES.has(payment.paymentType) && !NON_CARD_PAYMENT_TYPES.has(payment.paymentType)) {
      throw new Error('Select a valid payment type in POS Split Payment before exporting.');
    }
  }
  const cardPayments = payments.filter(payment => CARD_PAYMENT_TYPES.has(payment.paymentType));
  // A DP applied to the invoice is shown only as its reference number (column U), never as an amount.
  const nonCardPayments = payments.filter(payment => NON_CARD_PAYMENT_TYPES.has(payment.paymentType) && payment.paymentType !== 'Deposit');
  const unique = (values: (string | undefined)[]) => [...new Set(values.map(paymentLabel).filter(Boolean))].join(', ');
  return {
    nonCard: nonCardPayments.reduce((sum, payment) => sum + payment.amount, 0),
    card: cardPayments.reduce((sum, payment) => sum + payment.amount, 0),
    transferBank: unique(payments.filter(payment => payment.paymentType === 'Transfer').map(payment => payment.bank)),
    edc: unique(payments.filter(payment => CARD_PAYMENT_TYPES.has(payment.paymentType) || payment.paymentType === 'QRIS').map(payment => payment.edc)),
    cardType: unique(cardPayments.map(payment => payment.cardType)),
  };
}
// The template's After Sales Support (AH) and DWA (AI) columns are not exported; every template
// column after them moves two places left, so Other Remarks lands in AH.
const TEMPLATE_COLUMNS = 36;
const DROPPED_TEMPLATE_COLUMNS = new Set([34, 35]);
export const DS_LAST_COLUMN = 'AH';
const outputColumn = (templateCol: number) => (templateCol < 34 ? templateCol : templateCol - DROPPED_TEMPLATE_COLUMNS.size);
const columnNumber = (letters: string) => letters.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const columnLetters = (n: number): string => (n > 26 ? columnLetters(Math.floor((n - 1) / 26)) : '') + String.fromCharCode(65 + ((n - 1) % 26));
const keptTemplateColumns = Array.from({ length: TEMPLATE_COLUMNS }, (_, i) => i + 1).filter(col => !DROPPED_TEMPLATE_COLUMNS.has(col));

/** Font colour for values typed in Invoice Management (blue-600). */
export const MANUAL_INPUT_COLOR = 'FF2563EB';

export const SA_INITIALS: Record<string, string> = { AJENG: 'AJ', SYANDY: 'SD', SISKA: 'SK', HERDY: 'HS', DIAN: 'DP', IRMA: 'IR', JOJO: 'JJ', ARIF: 'AR', ARI: 'AK', ALVIN: 'AL', MONIQ: 'MM', MONICA: 'MM' };
export function getSaInitial(name: string | null | undefined): string {
  const words = (name || '').trim().toUpperCase().split(/\s+/).filter(Boolean);
  // Match full name tokens: ARIF must never accidentally match ARI.
  for (const word of words) if (SA_INITIALS[word]) return SA_INITIALS[word];
  return words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '').slice(0, 2);
}
function amount(value: unknown): number { const number = Number(value ?? 0); if (!Number.isFinite(number)) throw new Error('The report contains an invalid numeric value. Correct the invoice before exporting.'); return number; }
const phoneKey = (value: string | null | undefined) => (value || '').replace(/\D/g, '').replace(/^0/, '62');
const nameKey = (value: string | null | undefined) => (value || '').trim().toLowerCase();
export function getReportPayments(invoice: InvoiceHeader): ReportPayment[] {
  let raw = invoice.meta.payment_splits;
  if (!Array.isArray(raw)) {
    const remarks = invoice.meta.other_remarks || '';
    const encoded = remarks.split('[PAYMENT_SPLITS]:')[1]?.split('[FINANCE_VERIFY]:')[0]?.trim();
    if (!encoded) return [];
    try { raw = JSON.parse(encoded); } catch { throw new Error(`Invalid saved payment details for invoice ${invoice.trans_no}.`); }
  }
  if (!Array.isArray(raw)) throw new Error(`Invalid saved payment details for invoice ${invoice.trans_no}.`);
  return raw.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error(`Invalid payment entry for invoice ${invoice.trans_no}.`);
    const row = value as Record<string, unknown>;
    if (typeof row.paymentType !== 'string' || row.amount === undefined || row.amount === null || row.amount === '') throw new Error(`Incomplete payment entry for invoice ${invoice.trans_no}.`);
    return { paymentType: row.paymentType, amount: amount(row.amount), bank: String(row.bank || ''), edc: String(row.edc || ''), cardType: String(row.cardType || ''), installment: String(row.installment || ''), mdrPct: row.mdrPct == null ? undefined : amount(row.mdrPct), cardComm: row.cardComm == null ? undefined : amount(row.cardComm) };
  });
}

export function buildDailySalesWorkbook(template: ExcelJS.Workbook, invoices: InvoiceHeader[], profiles: CrmReportProfile[], options: { month: number; year: number; headerOffset?: number } & InvoiceReportFilters, workbook = new ExcelJS.Workbook()) {
  const original = template.getWorksheet('DS');
  if (!original) throw new Error('The Daily Sales template is missing its DS worksheet.');
  // Copy the template layout, not its historical transactions, targets or cached totals.
  workbook.creator = 'MRA Retail';
  workbook.calcProperties.fullCalcOnLoad = true;
  const ws = workbook.addWorksheet('DS');
  const offset = options.headerOffset || 0;
  const headerRow = 6 + offset;
  const dataStart = headerRow + 1;
  const layoutRow = (row: number) => row > 3 ? row + offset : row;
  for (const col of keptTemplateColumns) ws.getColumn(outputColumn(col)).width = original.getColumn(col).width || 14;
  for (let row = 1; row <= 6; row++) {
    ws.getRow(layoutRow(row)).height = original.getRow(row).height;
    for (const col of keptTemplateColumns) {
      const source = original.getCell(row, col);
      const cell = ws.getCell(layoutRow(row), outputColumn(col));
      cell.style = structuredClone(source.style);
      if (!source.isMerged || source.address === source.master.address) cell.value = source.value;
    }
  }
  for (const merge of original.model.merges || []) {
    const end = Number(merge.split(':').pop()?.replace(/[A-Z]/g, ''));
    if (end > 6) continue;
    const refs = merge.split(':');
    if (refs.some(ref => DROPPED_TEMPLATE_COLUMNS.has(columnNumber(ref.replace(/\d+/g, ''))))) continue;
    ws.mergeCells(refs.map(ref => columnLetters(outputColumn(columnNumber(ref.replace(/\d+/g, '')))) + layoutRow(Number(ref.replace(/[A-Z]+/g, '')))).join(':'));
  }
  // Served By and Entitle are now filled from the POS / Invoice Management, so the template's
  // red "HARUS DI ISI" (must fill) markers above them are removed.
  for (const col of ['AE', 'AG']) {
    const marker = ws.getCell(`${col}${layoutRow(4)}`);
    if (String(marker.value || '').toUpperCase().includes('HARUS DI ISI')) { marker.value = null; marker.fill = { type: 'pattern', pattern: 'none' }; }
  }
  ws.getCell('A1').value = `BVLGARI – ${options.store && options.store !== 'ALL' ? options.store : 'All stores'}`;
  ws.getCell('A2').value = 'Daily Sales Transaction Report';
  ws.getCell('B3').value = new Date(Date.UTC(options.year, options.month - 1, 1));
  ws.getCell('B3').numFmt = 'mmmm yyyy';
  ws.getCell('D3').value = `Filter: ${options.filterType || 'all'}${options.search ? `; Search: ${options.search}` : ''}`;
  ws.getCell('T3').value = 'Achievement = Net Sales / 1.11';
  ws.getCell('T3').note = 'User-defined report rule. Net Sales is taken directly from Invoice Management.';
  ws.getCell(`E${headerRow}`).note = 'Cosmo CRM ID is left blank until a verified Cosmo identifier is available. The internal profile ID is not used.';
  ws.getCell(`I${headerRow}`).note = 'Walk-in/follow-up is left blank until a verified transaction-level source is configured.';
  ws.getCell(`S${headerRow}`).note = 'Saved clean_master.net_sales, matching Invoice Management.';
  ws.getCell(`AB${headerRow}`).note = 'Saved clean_master.comm per item. No estimated MDR rate is applied.';
  ws.getCell(`U${headerRow}`).value = 'Deposit Reference';
  ws.getCell(`U${headerRow}`).note = 'Linked sales DP transaction references from Invoice Management. These references do not add payment amounts; amounts come from POS Split Payment.';
  ws.getCell(`V${headerRow}`).note = 'Saved non-card payments: Cash, Transfer, Voucher, Rounding and QRIS. Written once per invoice. DP (Deposit) amounts are excluded; the DP reference is in Deposit Reference.';
  ws.getCell(`W${headerRow}`).note = 'Saved Credit Card, Debit Card and Link Payment amounts, once per invoice.';
  ws.getCell(`X${headerRow}`).note = 'OR number is not collected by the current POS Split Payment form and is left blank.';
  ws.getCell(`Y${headerRow}`).note = 'Bank selected on saved Transfer splits only. Left blank when the destination bank is not recorded.';
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: headerRow }];
  ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${headerRow - 2}:${headerRow}` };

  const byPhone = new Map<string, CrmReportProfile[]>();
  const byName = new Map<string, CrmReportProfile[]>();
  for (const profile of profiles) {
    const phone = phoneKey(profile.no_hp); const name = nameKey(profile.nama_lengkap);
    if (phone) byPhone.set(phone, [...(byPhone.get(phone) || []), profile]);
    if (name) byName.set(name, [...(byName.get(name) || []), profile]);
  }
  const paymentRows: (string | number | null)[][] = [];
  const totals = new Map<string, number>();
  const addTotal = (col: string, value: number) => totals.set(col, (totals.get(col) || 0) + value);
  let row = dataStart;
  let currentDate = '';
  let dateStart = dataStart;
  let dayTotal = 0;
  const finishDate = () => {
    if (!currentDate) return;
    ws.getCell(`AD${row - 1}`).value = { formula: `SUM(AC${dateStart}:AC${row - 1})`, result: dayTotal };
    addTotal('AD', dayTotal);
  };
  const sorted = [...invoices].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date) || a.trans_no.localeCompare(b.trans_no));
  for (const invoice of sorted) {
    const payments = getReportPayments(invoice);
    const paymentSummary = summarizeReportPayments(payments);
    const phones = [...new Set(invoice.items.map(item => phoneKey(item.phone_no)).filter(Boolean))];
    const phoneMatches = [...new Set(phones.flatMap(phone => byPhone.get(phone) || []))];
    const nameMatches = byName.get(nameKey(invoice.customer)) || [];
    const profile = phoneMatches.length === 1 ? phoneMatches[0] : phoneMatches.length === 0 && nameMatches.length === 1 ? nameMatches[0] : undefined;
    for (const payment of payments) paymentRows.push([invoice.trans_no, invoice.transaction_date.slice(0, 10), invoice.location, payment.paymentType, payment.amount, payment.bank || '', payment.edc || '', payment.cardType || '', payment.installment || '', payment.mdrPct ?? null, payment.cardComm ?? null]);
    for (let index = 0; index < invoice.items.length; index++) {
      const item = invoice.items[index];
      const date = item.transaction_date.slice(0, 10);
      if (date !== currentDate) { finishDate(); currentDate = date; dateStart = row; dayTotal = 0; }
      for (const col of keptTemplateColumns) ws.getCell(row, outputColumn(col)).style = structuredClone(original.getCell(7, col).style);
      ws.getRow(row).height = 28;
      ws.getCell(`A${row}`).value = new Date(`${date}T00:00:00Z`);
      ws.getCell(`A${row}`).numFmt = 'dd mmm yyyy';
      const values: Record<string, string | number> = {
        B: invoice.meta.cash_bill_no || '', C: invoice.trans_no, D: invoice.customer,
        F: profile?.kewarganegaraan || '', K: item.main_category || '', L: item.sap_code,
        M: item.catalogue_code, N: item.serial_no || '', O: item.description || '',
        P: amount(item.qty), Q: amount(item.gross_sales), S: amount(item.net_sales), T: invoice.meta.discount_given_reason || '',
        // AE Served By and AG Entitle are manual Data Penunjang inputs; AF CA is the API salesman.
        AB: amount(item.comm), AE: invoice.meta.served_by || '', AF: invoice.salesman || '', AG: invoice.meta.entitle || '',
        // AH Other Remarks (After Sales Support and DWA are no longer exported).
        AH: [invoice.meta.other_remarks?.split('[PAYMENT_SPLITS]:')[0]?.split('[FINANCE_VERIFY]:')[0]?.trim(), !options.store || options.store === 'ALL' ? `Store: ${invoice.location}` : ''].filter(Boolean).join(' | '),
      };
      for (const [col, value] of Object.entries(values)) ws.getCell(`${col}${row}`).value = value;
      // E "Cosmo CRM ID" comes from the POS customerCode; left blank until the POS sends it.
      const cosmoId = crmCosmoId(invoice);
      if (cosmoId) ws.getCell(`E${row}`).value = cosmoId;
      // Counts and invoice-level receipts are written only on the first item.
      if (index === 0) {
        const linkedDeposits = invoice.depositLinks || [];
        if (linkedDeposits.length) {
          ws.getCell(`U${row}`).value = linkedDeposits.map(dp => dp.transNo).join('\n');
          ws.getCell(`U${row}`).alignment = { wrapText: true, vertical: 'top' };
          ws.getRow(row).height = Math.max(ws.getRow(row).height || 28, linkedDeposits.length * 15);
        }
        const status = profile?.status_pelanggan?.trim().toLowerCase();
        if (status === 'new') { ws.getCell(`G${row}`).value = 1; addTotal('G', 1); }
        if (status === 'old' || status === 'existing') { ws.getCell(`H${row}`).value = 1; addTotal('H', 1); }
        if (payments.length) {
          ws.getCell(`V${row}`).value = paymentSummary.nonCard;
          ws.getCell(`W${row}`).value = paymentSummary.card;
          addTotal('V', paymentSummary.nonCard);
          addTotal('W', paymentSummary.card);
          const paymentNote = payments.map(payment => `${payment.paymentType}${payment.paymentType === 'Deposit' ? ' (reference only, not counted)' : ''}: ${payment.amount.toLocaleString('en-US')} IDR${paymentLabel(payment.bank) ? `; bank: ${payment.bank}` : ''}${paymentLabel(payment.edc) ? `; EDC: ${payment.edc}` : ''}${paymentLabel(payment.cardType) ? `; card: ${payment.cardType}` : ''}`).join('\n');
          ws.getCell(`V${row}`).note = paymentNote;
          ws.getCell(`W${row}`).note = paymentNote;
        }
        ws.getCell(`Y${row}`).value = paymentSummary.transferBank;
        ws.getCell(`Z${row}`).value = paymentSummary.edc;
        ws.getCell(`AA${row}`).value = paymentSummary.cardType;
        for (const col of ['Y', 'Z', 'AA']) ws.getCell(`${col}${row}`).alignment = { ...ws.getCell(`${col}${row}`).alignment, wrapText: true, vertical: 'top' };
        const longestPaymentLabel = Math.max(paymentSummary.transferBank.length, paymentSummary.edc.length, paymentSummary.cardType.length);
        ws.getRow(row).height = Math.max(ws.getRow(row).height || 28, Math.ceil(longestPaymentLabel / 12) * 15);
      }
      const gross = amount(item.gross_sales); const net = amount(item.net_sales);
      ws.getCell(`R${row}`).value = { formula: `IF(Q${row}=0,0,${amount(item.val_disc)}/Q${row}*100)`, result: gross === 0 ? 0 : amount(item.val_disc) / gross * 100 };
      ws.getCell(`AC${row}`).value = { formula: `S${row}/1.11`, result: net / 1.11 };
      for (const col of ['P', 'Q', 'S', 'AB']) addTotal(col, amount(values[col]));
      addTotal('AC', net / 1.11); dayTotal += net / 1.11;
      for (const col of ['Q', 'S', 'V', 'W', 'AB', 'AC', 'AD']) ws.getCell(`${col}${row}`).numFmt = '#,##0.00;[Red](#,##0.00);–';
      ws.getCell(`R${row}`).numFmt = '0.00"%"';
      // Values typed in Invoice Management are shown in blue; POS / sync values keep the template colour.
      const manual = ['B', 'T', 'AG', 'AH', 'U', 'V', 'W', 'Y', 'Z', 'AA'];
      if (invoice.meta.crm_cosmo_id?.trim()) manual.push('E');
      if (invoice.meta.served_by_source === 'manual') manual.push('AE');
      for (const col of manual) {
        const cell = ws.getCell(`${col}${row}`);
        if (cell.value !== null && cell.value !== undefined && cell.value !== '') cell.font = { ...cell.font, color: { argb: MANUAL_INPUT_COLOR } };
      }
      row++;
    }
  }
  finishDate();
  const lastDataRow = Math.max(dataStart, row - 1);
  if (row === dataStart) { ws.getCell(`B${dataStart}`).value = 'NO MATCHING INVOICES'; row = dataStart + 1; }
  ws.getCell(`D${row}`).value = 'TOTAL';
  for (const col of ['G', 'H', 'P', 'Q', 'S', 'V', 'W', 'AB', 'AC', 'AD']) {
    ws.getCell(`${col}${row}`).value = { formula: `SUM(${col}${dataStart}:${col}${lastDataRow})`, result: totals.get(col) || 0 };
    ws.getCell(`${col}${row}`).numFmt = '#,##0.00;[Red](#,##0.00);–';
  }
  ws.getRow(row).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(row).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF183E32' } };
  ws.getRow(row).height = 30;
  ws.pageSetup.printArea = `A1:${DS_LAST_COLUMN}${row}`;
  ws.getCell(`A${row + 2}`).value = 'Blue text was entered in Invoice Management (cash bill, discount reason, DP links, POS payments and supporting details). Blank fields indicate unavailable data. Sales and POS payments are recorded once; linked DP references do not add sales or payments. Created by Aris Setiyono.';
  ws.mergeCells(`A${row + 2}:${DS_LAST_COLUMN}${row + 2}`);
  ws.getCell(`A${row + 2}`).alignment = { wrapText: true, vertical: 'middle' };
  ws.getRow(row + 2).height = 32;
  ws.pageSetup.printArea = `A1:${DS_LAST_COLUMN}${row + 2}`;

  if (paymentRows.length) {
    const sheet = workbook.addWorksheet('Payment Details');
    sheet.addRow(['Invoice', 'Date', 'Store', 'Payment type', 'Amount', 'Bank', 'EDC', 'Card type', 'Installment', 'MDR %', 'Saved card commission']);
    sheet.addRows(paymentRows);
    sheet.columns.forEach(column => { column.width = 22; });
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF183E32' } };
    sheet.getColumn(5).numFmt = '#,##0.00'; sheet.getColumn(11).numFmt = '#,##0.00';
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = `A1:K${sheet.rowCount}`;
  }
  return { workbook, totalRows: invoices.reduce((sum, invoice) => sum + invoice.items.length, 0), totalGross: totals.get('Q') || 0, totalNet: totals.get('S') || 0 };
}

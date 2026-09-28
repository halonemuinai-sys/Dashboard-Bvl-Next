import * as XLSX from 'xlsx';
import { PaymentAnalyticsData } from '@/services/dashboard/paymentAnalyticsService';

export function exportPaymentAnalyticsToExcel(data: PaymentAnalyticsData) {
  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryRows = [
    ['BVLGARI INDONESIA - EXECUTIVE PAYMENT & BANK PERFORMANCE REPORT'],
    ['Period', `${data.month} ${data.year}`],
    ['Boutique / Store', data.selectedStore],
    ['Export Date', new Date().toLocaleString('en-US')],
    [],
    ['KEY PERFORMANCE INDICATORS (IDR)', 'VALUE'],
    ['Gross Retail Sales', data.totalGross],
    ['Total Card Comm (MDR Paid)', data.totalCardComm],
    ['Net Cash Settlement', data.netSettlement],
    ['Average Effective MDR (%)', Number(data.effectiveMdrPct.toFixed(2))],
    ['Total Verified Invoices', data.totalInvoicesCount],
    ['Total Split Transactions', data.totalSplitsCount],
    ['Average Ticket (Basket Size)', data.averageTicket],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // 2. Bank Performance Sheet
  const bankHeader = [
    'Rank',
    'Bank',
    'Transaction Volume (IDR)',
    'Market Share (%)',
    'Transaction Count',
    'Card Comm / MDR (IDR)',
    'Net Settlement (IDR)',
    'Effective MDR (%)',
    'On-Us Count',
    'Off-Us Count',
  ];
  const bankRows = data.banks.map((b, idx) => [
    idx + 1,
    b.bank,
    b.volume,
    Number(b.volumeShare.toFixed(2)),
    b.txCount,
    b.cardComm,
    b.netSettlement,
    Number(b.effectiveMdr.toFixed(2)),
    b.onUsCount,
    b.offUsCount,
  ]);
  const wsBank = XLSX.utils.aoa_to_sheet([bankHeader, ...bankRows]);
  XLSX.utils.book_append_sheet(wb, wsBank, 'Bank Performance');

  // 3. Payment Method & Tenor Sheet
  const methodHeader = ['Payment Method', 'Volume (IDR)', 'Share (%)', 'Tx Count', 'Card Comm (IDR)', 'Effective MDR (%)'];
  const methodRows = data.methods.map(m => [
    m.paymentType,
    m.volume,
    Number(m.volumeShare.toFixed(2)),
    m.txCount,
    m.cardComm,
    Number(m.effectiveMdr.toFixed(2)),
  ]);

  const tenorHeader = ['0% Installment Tenor', 'Volume (IDR)', 'Share (%)', 'Tx Count', 'Card Comm (IDR)', 'Effective MDR (%)'];
  const tenorRows = data.installments.map(i => [
    i.installment,
    i.volume,
    Number(i.volumeShare.toFixed(2)),
    i.txCount,
    i.cardComm,
    Number(i.effectiveMdr.toFixed(2)),
  ]);

  const methodAndTenorSheetData = [
    ['PAYMENT METHODS'],
    methodHeader,
    ...methodRows,
    [],
    ['0% INSTALLMENT TENORS'],
    tenorHeader,
    ...tenorRows,
  ];
  const wsMethodTenor = XLSX.utils.aoa_to_sheet(methodAndTenorSheetData);
  XLSX.utils.book_append_sheet(wb, wsMethodTenor, 'Methods & Installments');

  // 4. Raw Splits Transaction Log
  const splitHeader = [
    'Invoice No',
    'Date',
    'Boutique',
    'Customer',
    'Sales Advisor',
    'Payment Method',
    'EDC',
    'Bank',
    'Tenor',
    'Card Type',
    'Amount (IDR)',
    'MDR %',
    'Card Comm (IDR)',
    'Net Settlement (IDR)',
  ];
  const splitRows = data.transactions.map(t => [
    t.transNo,
    t.transDate ? t.transDate.substring(0, 10) : '—',
    t.location,
    t.customer,
    t.salesman,
    t.paymentType,
    t.edc,
    t.bank,
    t.installment,
    t.cardType,
    t.amount,
    Number((t.mdrPct * 100).toFixed(2)),
    t.cardComm,
    t.netSettlement,
  ]);
  const wsSplits = XLSX.utils.aoa_to_sheet([splitHeader, ...splitRows]);
  XLSX.utils.book_append_sheet(wb, wsSplits, 'POS Transaction Splits');

  // Write and trigger browser download
  const fileName = `BVL_Payment_Analytics_${data.month}_${data.year}_${data.selectedStore}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

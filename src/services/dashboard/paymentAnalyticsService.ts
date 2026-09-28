import { getInvoices, InvoiceHeader } from './invoiceService';
import { PaymentSplitRow } from './paymentEngine';

export interface BankPerformanceStat {
  bank: string;
  volume: number;
  txCount: number;
  volumeShare: number;
  cardComm: number;
  netSettlement: number;
  effectiveMdr: number;
  onUsCount: number;
  offUsCount: number;
}

export interface PaymentMethodStat {
  paymentType: string;
  volume: number;
  txCount: number;
  volumeShare: number;
  cardComm: number;
  effectiveMdr: number;
}

export interface InstallmentStat {
  installment: string;
  volume: number;
  txCount: number;
  volumeShare: number;
  cardComm: number;
  effectiveMdr: number;
}

export interface EdcTerminalStat {
  edc: string;
  volume: number;
  txCount: number;
  volumeShare: number;
  cardComm: number;
  effectiveMdr: number;
}

export interface StorePerformanceStat {
  store: string;
  volume: number;
  txCount: number;
  volumeShare: number;
  cardComm: number;
  netSettlement: number;
  effectiveMdr: number;
}

export interface EnrichedSplitTransaction {
  transNo: string;
  transDate: string;
  location: string;
  customer: string;
  salesman: string;
  paymentType: string;
  edc: string;
  bank: string;
  installment: string;
  cardType: string;
  amount: number;
  mdrPct: number;
  cardComm: number;
  netSettlement: number;
  processMethod?: string;
  isVerified: boolean;
  rawInvoice: InvoiceHeader;
}

export interface PaymentAnalyticsData {
  month: string;
  year: number;
  selectedStore: string;
  totalGross: number;
  totalCardComm: number;
  netSettlement: number;
  effectiveMdrPct: number;
  totalInvoicesCount: number;
  totalSplitsCount: number;
  averageTicket: number;
  totalPeriodInvoices: number;
  pendingInvoicesCount: number;
  verificationRate: number;
  banks: BankPerformanceStat[];
  methods: PaymentMethodStat[];
  installments: InstallmentStat[];
  edcTerminals: EdcTerminalStat[];
  stores: StorePerformanceStat[];
  transactions: EnrichedSplitTransaction[];
}

export async function fetchPaymentAnalytics(
  month: string,
  year: number,
  storeFilter: string = 'ALL'
): Promise<PaymentAnalyticsData> {
  const allInvoices = await getInvoices(month, year);

  // Filter store if selected
  const invoices = storeFilter && storeFilter !== 'ALL'
    ? allInvoices.filter(inv => inv.location === storeFilter)
    : allInvoices;

  const verifiedSplits: EnrichedSplitTransaction[] = [];
  const allTransactions: EnrichedSplitTransaction[] = [];
  let verifiedInvoicesCount = 0;

  for (const inv of invoices) {
    const remarks = inv.meta?.other_remarks || '';
    const invoiceGross = Math.round(
      (inv.total_gross || 0) > 0
        ? (inv.total_gross - (inv.total_disc || 0))
        : (inv.total_net || 0)
    );

    let hasParsedSplits = false;
    if (remarks.startsWith('[PAYMENT_SPLITS]:')) {
      try {
        const jsonStr = remarks.replace('[PAYMENT_SPLITS]:', '').trim();
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          hasParsedSplits = true;
          verifiedInvoicesCount += 1;
          for (const s of parsed as PaymentSplitRow[]) {
            const amt = Math.round(s.amount || 0);
            const comm = Math.round(s.cardComm || 0);
            const enriched: EnrichedSplitTransaction = {
              transNo: inv.trans_no,
              transDate: inv.transaction_date,
              location: inv.location || 'Bvlgari',
              customer: inv.customer || 'Walk-in Guest',
              salesman: inv.salesman || '—',
              paymentType: s.paymentType || 'Credit Card',
              edc: s.edc || '--',
              bank: s.bank || '--',
              installment: s.installment || '--',
              cardType: s.cardType || '--',
              amount: amt,
              mdrPct: s.mdrPct || 0,
              cardComm: comm,
              netSettlement: amt - comm,
              processMethod: s.processMethod,
              isVerified: true,
              rawInvoice: inv,
            };
            verifiedSplits.push(enriched);
            allTransactions.push(enriched);
          }
        }
      } catch {
        hasParsedSplits = false;
      }
    }

    // If unverified, add to allTransactions but NOT to verifiedSplits
    if (!hasParsedSplits) {
      allTransactions.push({
        transNo: inv.trans_no,
        transDate: inv.transaction_date,
        location: inv.location || 'Bvlgari',
        customer: inv.customer || 'Walk-in Guest',
        salesman: inv.salesman || '—',
        paymentType: 'Unprocessed',
        edc: '--',
        bank: 'Unassigned',
        installment: '--',
        cardType: '--',
        amount: invoiceGross,
        mdrPct: 0,
        cardComm: Math.round(inv.total_comm || 0),
        netSettlement: invoiceGross - Math.round(inv.total_comm || 0),
        processMethod: 'EDC',
        isVerified: false,
        rawInvoice: inv,
      });
    }
  }

  // Aggregate Overall KPIs strictly from verified splits
  const totalGross = verifiedSplits.reduce((acc, r) => acc + r.amount, 0);
  const totalCardComm = verifiedSplits.reduce((acc, r) => acc + r.cardComm, 0);
  const netSettlement = totalGross - totalCardComm;
  const effectiveMdrPct = totalGross > 0 ? (totalCardComm / totalGross) * 100 : 0;
  const totalSplitsCount = verifiedSplits.length;
  const totalPeriodInvoices = invoices.length;
  const pendingInvoicesCount = Math.max(0, totalPeriodInvoices - verifiedInvoicesCount);
  const verificationRate = totalPeriodInvoices > 0 ? (verifiedInvoicesCount / totalPeriodInvoices) * 100 : 0;
  const averageTicket = verifiedInvoicesCount > 0 ? Math.round(totalGross / verifiedInvoicesCount) : 0;

  // 1. Group by Bank (Strictly verified)
  const bankMap = new Map<string, { volume: number; txCount: number; cardComm: number; onUsCount: number; offUsCount: number }>();
  for (const r of verifiedSplits) {
    const bName = r.bank && r.bank !== '--' ? r.bank : (r.paymentType === 'Cash / Transfer' ? 'Cash / Transfer' : 'Other Bank');
    const existing = bankMap.get(bName) || { volume: 0, txCount: 0, cardComm: 0, onUsCount: 0, offUsCount: 0 };
    existing.volume += r.amount;
    existing.txCount += 1;
    existing.cardComm += r.cardComm;
    if (r.edc && r.bank && r.edc !== '--' && r.bank !== '--') {
      if (r.edc.toUpperCase() === r.bank.toUpperCase()) existing.onUsCount += 1;
      else existing.offUsCount += 1;
    }
    bankMap.set(bName, existing);
  }

  const banks: BankPerformanceStat[] = Array.from(bankMap.entries())
    .map(([bank, st]) => ({
      bank,
      volume: st.volume,
      txCount: st.txCount,
      volumeShare: totalGross > 0 ? (st.volume / totalGross) * 100 : 0,
      cardComm: st.cardComm,
      netSettlement: st.volume - st.cardComm,
      effectiveMdr: st.volume > 0 ? (st.cardComm / st.volume) * 100 : 0,
      onUsCount: st.onUsCount,
      offUsCount: st.offUsCount,
    }))
    .sort((a, b) => b.volume - a.volume);

  // 2. Group by Payment Method (Strictly verified)
  const methodMap = new Map<string, { volume: number; txCount: number; cardComm: number }>();
  for (const r of verifiedSplits) {
    const m = r.paymentType || 'Other';
    const ex = methodMap.get(m) || { volume: 0, txCount: 0, cardComm: 0 };
    ex.volume += r.amount;
    ex.txCount += 1;
    ex.cardComm += r.cardComm;
    methodMap.set(m, ex);
  }

  const methods: PaymentMethodStat[] = Array.from(methodMap.entries())
    .map(([paymentType, st]) => ({
      paymentType,
      volume: st.volume,
      txCount: st.txCount,
      volumeShare: totalGross > 0 ? (st.volume / totalGross) * 100 : 0,
      cardComm: st.cardComm,
      effectiveMdr: st.volume > 0 ? (st.cardComm / st.volume) * 100 : 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  // 3. Group by Installment Tenor (Strictly verified)
  const instMap = new Map<string, { volume: number; txCount: number; cardComm: number }>();
  for (const r of verifiedSplits) {
    const inst = r.installment || '--';
    const ex = instMap.get(inst) || { volume: 0, txCount: 0, cardComm: 0 };
    ex.volume += r.amount;
    ex.txCount += 1;
    ex.cardComm += r.cardComm;
    instMap.set(inst, ex);
  }

  const installments: InstallmentStat[] = Array.from(instMap.entries())
    .map(([installment, st]) => ({
      installment,
      volume: st.volume,
      txCount: st.txCount,
      volumeShare: totalGross > 0 ? (st.volume / totalGross) * 100 : 0,
      cardComm: st.cardComm,
      effectiveMdr: st.volume > 0 ? (st.cardComm / st.volume) * 100 : 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  // 4. Group by EDC Terminal (Strictly verified)
  const edcMap = new Map<string, { volume: number; txCount: number; cardComm: number }>();
  for (const r of verifiedSplits) {
    const edc = r.edc || '--';
    const ex = edcMap.get(edc) || { volume: 0, txCount: 0, cardComm: 0 };
    ex.volume += r.amount;
    ex.txCount += 1;
    ex.cardComm += r.cardComm;
    edcMap.set(edc, ex);
  }

  const edcTerminals: EdcTerminalStat[] = Array.from(edcMap.entries())
    .map(([edc, st]) => ({
      edc,
      volume: st.volume,
      txCount: st.txCount,
      volumeShare: totalGross > 0 ? (st.volume / totalGross) * 100 : 0,
      cardComm: st.cardComm,
      effectiveMdr: st.volume > 0 ? (st.cardComm / st.volume) * 100 : 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  // 5. Group by Store Location (Strictly verified)
  const storeMap = new Map<string, { volume: number; txCount: number; cardComm: number }>();
  for (const r of verifiedSplits) {
    const s = r.location || 'Unknown Store';
    const ex = storeMap.get(s) || { volume: 0, txCount: 0, cardComm: 0 };
    ex.volume += r.amount;
    ex.txCount += 1;
    ex.cardComm += r.cardComm;
    storeMap.set(s, ex);
  }

  const stores: StorePerformanceStat[] = Array.from(storeMap.entries())
    .map(([store, st]) => ({
      store,
      volume: st.volume,
      txCount: st.txCount,
      volumeShare: totalGross > 0 ? (st.volume / totalGross) * 100 : 0,
      cardComm: st.cardComm,
      netSettlement: st.volume - st.cardComm,
      effectiveMdr: st.volume > 0 ? (st.cardComm / st.volume) * 100 : 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  return {
    month,
    year,
    selectedStore: storeFilter,
    totalGross,
    totalCardComm,
    netSettlement,
    effectiveMdrPct,
    totalInvoicesCount: verifiedInvoicesCount,
    totalSplitsCount,
    averageTicket,
    totalPeriodInvoices,
    pendingInvoicesCount,
    verificationRate,
    banks,
    methods,
    installments,
    edcTerminals,
    stores,
    transactions: allTransactions,
  };
}

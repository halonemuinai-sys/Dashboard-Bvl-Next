'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  Lock,
  Calendar,
  Building2,
  ExternalLink,
  ChevronDown,
  Percent,
  Check,
  X,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sliders,
  DollarSign
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useUserAccess } from '@/lib/user-access-context';
import {
  InvoiceHeader,
  getInvoices
} from '@/services/dashboard/invoiceService';
import {
  PAYMENT_TYPES,
  EDC_OPTIONS,
  CARD_TYPES,
  INSTALLMENT_OPTIONS,
  BANK_OPTIONS,
  PaymentType,
  EdcOption,
  CardTypeOption,
  InstallmentOption,
  BankOption,
  PaymentSplitRow,
  computePaymentMdr,
  saveInvoicePaymentSplits,
  BankMdrRule,
  getMergedBankMdrRules,
  DebitConfig,
  CreditConfig,
  FinanceVerificationInfo,
  extractPaymentAndVerification,
  verifyOrOverrideInvoiceFinance
} from '@/services/dashboard/paymentEngine';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function FinanceReconciliationPage() {
  const { userEmail, isAdmin } = useUserAccess();

  // Period state
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[currentDate.getMonth()]);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  // Data & loading state
  const [invoices, setInvoices] = useState<InvoiceHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRules, setActiveRules] = useState<Record<string, BankMdrRule> | undefined>();
  const [debitConfig, setDebitConfig] = useState<DebitConfig | undefined>();
  const [creditConfig, setCreditConfig] = useState<CreditConfig | undefined>();

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'VERIFIED' | 'OVERRIDDEN' | 'PENDING_INPUT'>('ALL');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Selected invoice for Verification Pop-up Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Correction Mode inside Modal: 'VIEW' | 'SPLIT_CORRECTION' | 'MANUAL_OVERRIDE'
  const [correctionMode, setCorrectionMode] = useState<'VIEW' | 'SPLIT_CORRECTION' | 'MANUAL_OVERRIDE'>('VIEW');
  const [editRows, setEditRows] = useState<PaymentSplitRow[]>([]);
  const [overrideCommAmount, setOverrideCommAmount] = useState<number>(0);
  const [overrideNote, setOverrideNote] = useState<string>('');

  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load rules on mount
  useEffect(() => {
    getMergedBankMdrRules().then(res => {
      setActiveRules(res.rules);
      setDebitConfig(res.debitConfig);
      setCreditConfig(res.creditConfig);
    });
  }, []);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, storeFilter, selectedMonth, selectedYear]);

  // Load Invoices
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getInvoices(selectedMonth, selectedYear);
      setInvoices(data);
    } catch (err: any) {
      console.error('Failed to load invoices for reconciliation:', err);
      showToast(`Gagal memuat data faktur: ${err.message || 'Error'}`, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  // Toast Helper
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Enriched invoices with parsed split payments & verification
  const enrichedInvoices = useMemo(() => {
    return invoices.map(inv => {
      const { splits, verification } = extractPaymentAndVerification(inv.meta?.other_remarks);
      return {
        ...inv,
        parsedSplits: splits,
        verification,
      };
    });
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return enrichedInvoices.filter(inv => {
      // 1. Status Filter
      if (statusFilter !== 'ALL') {
        if (inv.verification.status !== statusFilter) return false;
      }

      // 2. Store Filter
      if (storeFilter !== 'ALL') {
        if (!inv.location.toLowerCase().includes(storeFilter.toLowerCase())) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = inv.trans_no.toLowerCase().includes(q);
        const matchCust = inv.customer.toLowerCase().includes(q);
        const matchSales = inv.salesman.toLowerCase().includes(q);
        const matchStore = inv.location.toLowerCase().includes(q);
        if (!matchNo && !matchCust && !matchSales && !matchStore) return false;
      }

      return true;
    });
  }, [enrichedInvoices, statusFilter, storeFilter, searchQuery]);

  // Pagination slice
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  // KPI Statistics
  const kpiStats = useMemo(() => {
    const total = enrichedInvoices.length;
    const submittedCount = enrichedInvoices.filter(i => i.verification.status === 'SUBMITTED').length;
    const verifiedCount = enrichedInvoices.filter(i => i.verification.status === 'VERIFIED' || i.verification.status === 'OVERRIDDEN').length;
    const pendingInputCount = enrichedInvoices.filter(i => i.verification.status === 'PENDING_INPUT').length;

    const totalVerifiedComm = enrichedInvoices
      .filter(i => i.verification.status === 'VERIFIED' || i.verification.status === 'OVERRIDDEN')
      .reduce((sum, i) => sum + (i.total_comm || 0), 0);

    const totalNetSales = enrichedInvoices.reduce((sum, i) => sum + (i.total_net || 0), 0);

    return {
      total,
      submittedCount,
      verifiedCount,
      pendingInputCount,
      totalVerifiedComm,
      totalNetSales,
    };
  }, [enrichedInvoices]);

  // Open Verification Modal
  const handleOpenVerification = (inv: any) => {
    setSelectedInvoice(inv);
    setCorrectionMode('VIEW');
    setOverrideCommAmount(inv.total_comm || 0);
    setOverrideNote(inv.verification?.note || '');

    // Pre-populate split rows for editing if Finance wants to correct them
    const grossTarget = Math.round(
      (inv.total_gross || 0) > 0
        ? (inv.total_gross - (inv.total_disc || 0))
        : (inv.total_net || 0)
    );
    const netTarget = Math.round(inv.total_net || 0);

    if (inv.parsedSplits && inv.parsedSplits.length > 0) {
      let splitsCopy = JSON.parse(JSON.stringify(inv.parsedSplits));
      if (splitsCopy.length === 1 && splitsCopy[0].amount === netTarget && grossTarget !== netTarget) {
        splitsCopy[0].amount = grossTarget;
        const recomputed = computePaymentMdr(splitsCopy[0], activeRules, debitConfig, creditConfig);
        splitsCopy[0].mdrPct = recomputed.mdrPct;
        splitsCopy[0].cardComm = recomputed.cardComm;
      }
      setEditRows(splitsCopy);
    } else {
      setEditRows([{
        id: String(Date.now()),
        paymentType: 'Cash',
        edc: '--',
        installment: '--',
        bank: '--',
        cardType: '--',
        amount: grossTarget,
        mdrPct: 0.0,
        cardComm: 0,
        processMethod: 'EDC',
      }]);
    }
  };

  // Row editor handler (Exact same options as POS cashier modal)
  const handleEditRowChange = (index: number, field: keyof PaymentSplitRow, value: any) => {
    setEditRows(prev => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: value };

      if (field === 'paymentType') {
        if (['Cash', 'Transfer', 'Deposit', 'Voucher', 'Rounding', '--'].includes(value)) {
          row.edc = '--';
          row.installment = '--';
          row.bank = '--';
          row.cardType = '--';
        } else if (value === 'Credit Card') {
          if (row.edc === '--') row.edc = 'BCA';
          if (row.bank === '--') row.bank = 'BCA';
          if (row.cardType === '--') row.cardType = 'VISA';
        } else if (value === 'Debit Card') {
          if (row.edc === '--') row.edc = 'BCA';
          row.installment = '--';
          if (row.bank === '--') row.bank = 'BCA';
        } else if (value === 'Link Payment') {
          row.edc = 'BCA';
          row.bank = 'BCA';
        } else if (value === 'QRIS') {
          if (row.edc === '--') row.edc = 'BCA';
          row.installment = '--';
          row.cardType = '--';
          if (row.bank === '--') row.bank = row.edc !== 'Other' ? (row.edc as BankOption) : 'BCA';
        }
      }

      if (field === 'edc' && row.paymentType === 'QRIS') {
        if (value !== '--' && value !== 'Other') {
          row.bank = value as BankOption;
        }
      }

      // Recompute MDR and Comm with rule engine
      const res = computePaymentMdr(row, activeRules, debitConfig, creditConfig);
      row.mdrPct = res.mdrPct;
      row.cardComm = res.cardComm;
      row.processMethod = res.processMethod;
      row.warningNote = res.warningNote;

      copy[index] = row;
      return copy;
    });
  };

  // Add split row
  const handleAddSplitRow = () => {
    if (!selectedInvoice) return;
    const grossTarget = Math.round(
      (selectedInvoice.total_gross || 0) > 0
        ? (selectedInvoice.total_gross - (selectedInvoice.total_disc || 0))
        : (selectedInvoice.total_net || 0)
    );
    const currentPaid = editRows.reduce((s, r) => s + (r.amount || 0), 0);
    const remainder = Math.max(0, grossTarget - currentPaid);

    const newRow: PaymentSplitRow = {
      id: String(Date.now()),
      paymentType: 'Credit Card',
      edc: 'BCA',
      installment: '--',
      bank: 'BCA',
      cardType: 'VISA',
      amount: remainder,
      mdrPct: 0.017,
      cardComm: Math.round(remainder * 0.017),
      processMethod: 'EDC',
    };
    setEditRows(prev => [...prev, newRow]);
  };

  // Delete split row
  const handleDeleteSplitRow = (index: number) => {
    if (editRows.length <= 1) return;
    setEditRows(prev => prev.filter((_, i) => i !== index));
  };

  // Total calculations for editRows
  const selectedGrossTarget = Math.round(
    (selectedInvoice?.total_gross || 0) > 0
      ? (selectedInvoice!.total_gross - (selectedInvoice!.total_disc || 0))
      : (selectedInvoice?.total_net || 0)
  );
  const editTotalPaid = useMemo(() => editRows.reduce((s, r) => s + (r.amount || 0), 0), [editRows]);
  const editTotalComm = useMemo(() => editRows.reduce((s, r) => s + (r.cardComm || 0), 0), [editRows]);
  const editDiff = selectedGrossTarget - editTotalPaid;
  const isEditBalanced = editDiff === 0 && editTotalPaid > 0;

  // Handler: Validate & Lock Commission directly
  const handleValidateAndLock = async (inv: any) => {
    setSavingAction(inv.trans_no);
    const email = userEmail || 'finance@mogems.co.id';

    const res = await verifyOrOverrideInvoiceFinance({
      transNo: inv.trans_no,
      items: inv.items,
      status: 'VERIFIED',
      verifiedBy: email,
      currentRemarks: inv.meta?.other_remarks,
      realComm: inv.total_comm,
    });

    setSavingAction(null);

    if (res.success) {
      showToast(`Faktur ${inv.trans_no} berhasil divalidasi dan komisi dikunci!`);
      const newVerify: FinanceVerificationInfo = {
        status: 'VERIFIED',
        verifiedBy: email,
        verifiedAt: new Date().toISOString(),
        realComm: inv.total_comm,
      };
      const basePart = inv.meta?.other_remarks?.includes('[PAYMENT_SPLITS]:')
        ? inv.meta.other_remarks.split('[FINANCE_VERIFY]:')[0].trim()
        : inv.meta?.other_remarks || '';
      const newRemarks = `${basePart}\n[FINANCE_VERIFY]: ${JSON.stringify(newVerify)}`.trim();

      const updatedInv = {
        ...inv,
        meta: {
          ...inv.meta,
          other_remarks: newRemarks,
          updated_by: email,
          updated_at: new Date().toISOString(),
        },
        verification: newVerify
      };

      setInvoices(prev => prev.map(item => item.trans_no === inv.trans_no ? updatedInv : item));
      setSelectedInvoice(updatedInv);
    } else {
      showToast(`Gagal validasi: ${res.error || 'Terjadi kesalahan sistem'}`, 'error');
    }
  };

  // Handler: Save Split Correction (Option 1 - Exact same options as POS input)
  const handleSaveSplitCorrection = async (inv: any) => {
    if (!isEditBalanced) {
      showToast('Total nominal pembayaran harus sama dengan Net Sales faktur.', 'error');
      return;
    }

    setSavingAction(inv.trans_no);
    const email = userEmail || 'finance@mogems.co.id';

    try {
      // 1. Save split payload and update clean_master item comm
      await saveInvoicePaymentSplits({
        transNo: inv.trans_no,
        items: inv.items,
        splits: editRows,
        totalCardComm: editTotalComm,
        userEmail: email,
      });

      // 2. Mark as OVERRIDDEN / VERIFIED by finance
      await verifyOrOverrideInvoiceFinance({
        transNo: inv.trans_no,
        items: inv.items,
        status: 'OVERRIDDEN',
        verifiedBy: email,
        realComm: editTotalComm,
        note: `Koreksi rincian split payment oleh Finance (${editRows.length} metode bayar)`,
      });

      setSavingAction(null);
      showToast(`Rincian split payment faktur ${inv.trans_no} berhasil dikoreksi dan dikunci!`);
      setCorrectionMode('VIEW');

      // Update local state
      const newVerify: FinanceVerificationInfo = {
        status: 'OVERRIDDEN',
        verifiedBy: email,
        verifiedAt: new Date().toISOString(),
        realComm: editTotalComm,
        note: `Koreksi rincian split payment oleh Finance (${editRows.length} metode bayar)`,
      };
      const newRemarks = `[PAYMENT_SPLITS]: ${JSON.stringify(editRows)}\n[FINANCE_VERIFY]: ${JSON.stringify(newVerify)}`;

      const updatedInv = {
        ...inv,
        total_comm: editTotalComm,
        parsedSplits: editRows,
        verification: newVerify,
        meta: {
          ...inv.meta,
          other_remarks: newRemarks,
          updated_by: email,
          updated_at: new Date().toISOString(),
        }
      };

      setInvoices(prev => prev.map(item => item.trans_no === inv.trans_no ? updatedInv : item));
      setSelectedInvoice(updatedInv);
    } catch (err: any) {
      setSavingAction(null);
      showToast(`Gagal menyimpan koreksi split: ${err.message || 'Error'}`, 'error');
    }
  };

  // Handler: Save Direct Amount Override (Option 2 - Rekening koran nominal)
  const handleSaveDirectAmountOverride = async (inv: any) => {
    setSavingAction(inv.trans_no);
    const email = userEmail || 'finance@mogems.co.id';

    const res = await verifyOrOverrideInvoiceFinance({
      transNo: inv.trans_no,
      items: inv.items,
      status: 'OVERRIDDEN',
      verifiedBy: email,
      realComm: Number(overrideCommAmount || 0),
      note: overrideNote,
      currentRemarks: inv.meta?.other_remarks,
    });

    setSavingAction(null);

    if (res.success) {
      showToast(`Koreksi nominal faktur ${inv.trans_no} berhasil disimpan dan dikunci!`);
      setCorrectionMode('VIEW');

      const newVerify: FinanceVerificationInfo = {
        status: 'OVERRIDDEN',
        verifiedBy: email,
        verifiedAt: new Date().toISOString(),
        realComm: Number(overrideCommAmount || 0),
        note: overrideNote,
      };
      const basePart = inv.meta?.other_remarks?.includes('[PAYMENT_SPLITS]:')
        ? inv.meta.other_remarks.split('[FINANCE_VERIFY]:')[0].trim()
        : inv.meta?.other_remarks || '';
      const newRemarks = `${basePart}\n[FINANCE_VERIFY]: ${JSON.stringify(newVerify)}`.trim();

      const updatedInv = {
        ...inv,
        total_comm: Number(overrideCommAmount || 0),
        meta: {
          ...inv.meta,
          other_remarks: newRemarks,
          updated_by: email,
          updated_at: new Date().toISOString(),
        },
        verification: newVerify
      };

      setInvoices(prev => prev.map(item => item.trans_no === inv.trans_no ? updatedInv : item));
      setSelectedInvoice(updatedInv);
    } else {
      showToast(`Gagal menyimpan koreksi: ${res.error}`, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "fixed bottom-6 right-6 z-[120] px-4 py-2.5 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 text-white",
              toastMessage.type === 'success' ? "bg-slate-900 border-slate-700" : "bg-rose-900 border-rose-700"
            )}
          >
            <CheckCircle2 className={cn("w-4 h-4", toastMessage.type === 'success' ? "text-emerald-400" : "text-rose-400")} />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner Header - Clean 3-Color Palette */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
              FINANCE AUDIT & VERIFICATION
            </span>
            <span className="text-xs text-slate-400 font-medium">Rekonsiliasi Bank & Card Comm</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Rekonsiliasi Card Comm & Settlement Bank
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Daftar transaksi faktur untuk audit kesesuaian potongan komisi kartu kredit terhadap settlement bank. Klik baris faktur untuk membuka verifikasi atau melakukan koreksi.
          </p>
        </div>

        {/* Period Selector & Refresh */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {MONTHS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-emerald-600")} />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Faktur Periode</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{kpiStats.total} Faktur</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Rp {formatCurrency(kpiStats.totalNetSales)} Net</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Menunggu Verifikasi</div>
          <div className="text-xl font-bold font-mono text-emerald-800 mt-1">{kpiStats.submittedCount} Faktur</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Input POS telah disubmit toko</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Telah Terverifikasi</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{kpiStats.verifiedCount} Faktur</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Terkunci oleh Finance</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Komisi Terkunci</div>
          <div className="text-xl font-bold font-mono text-emerald-800 mt-1">Rp {formatCurrency(kpiStats.totalVerifiedComm)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Beban riil komisi terkonfirmasi</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari no. faktur / customer / advisor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
          />
        </div>

        {/* Filter Tabs & Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Store Filter */}
          <select
            value={storeFilter}
            onChange={e => setStoreFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Semua Butik</option>
            <option value="Plaza Indonesia">Plaza Indonesia</option>
            <option value="Plaza Senayan">Plaza Senayan</option>
            <option value="Bali">Bali</option>
          </select>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px]",
                statusFilter === 'ALL' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Semua ({enrichedInvoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('SUBMITTED')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px]",
                statusFilter === 'SUBMITTED' ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Menunggu ({kpiStats.submittedCount})
            </button>
            <button
              onClick={() => setStatusFilter('VERIFIED')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px]",
                statusFilter === 'VERIFIED' ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Terverifikasi ({kpiStats.verifiedCount})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING_INPUT')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px]",
                statusFilter === 'PENDING_INPUT' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Pending ({kpiStats.pendingInputCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table: Compact Transaction List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs">Memuat daftar transaksi faktur...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            Tidak ada faktur transaksi yang sesuai dengan filter saat ini.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">No. Faktur & Tanggal</th>
                    <th className="py-3 px-3">Butik</th>
                    <th className="py-3 px-4">Customer & Kasir</th>
                    <th className="py-3 px-4 text-right">Net Sales</th>
                    <th className="py-3 px-4 text-right">Card Comm</th>
                    <th className="py-3 px-4">Rincian POS Kasir</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedInvoices.map((inv) => {
                    const hasSplits = Boolean(inv.parsedSplits && inv.parsedSplits.length > 0);
                    const isVerified = inv.verification.status === 'VERIFIED' || inv.verification.status === 'OVERRIDDEN';
                    const isOverridden = inv.verification.status === 'OVERRIDDEN';
                    const isSubmitted = inv.verification.status === 'SUBMITTED';

                    return (
                      <tr
                        key={inv.trans_no}
                        onClick={() => handleOpenVerification(inv)}
                        className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                      >
                        {/* 1. Trans No & Date */}
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                            {inv.trans_no}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {formatDate(inv.transaction_date)}
                          </div>
                        </td>

                        {/* 2. Boutique / Store */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                            {inv.location}
                          </span>
                        </td>

                        {/* 3. Customer & Advisor */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="font-semibold text-slate-900 truncate">
                            {inv.customer || 'Walk-in Customer'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Kasir: {inv.salesman || '—'}
                          </div>
                        </td>

                        {/* 4. Net Sales */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          Rp {formatCurrency(inv.total_net || 0)}
                        </td>

                        {/* 5. Card Comm */}
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          <span className={inv.total_comm > 0 ? "text-emerald-800" : "text-slate-500"}>
                            Rp {formatCurrency(inv.total_comm || 0)}
                          </span>
                        </td>

                        {/* 6. Mini POS Split Summary */}
                        <td className="py-3 px-4">
                          {hasSplits && inv.parsedSplits && inv.parsedSplits.length > 0 ? (
                            <div className="space-y-0.5">
                              <div className="text-[11px] font-mono font-semibold text-slate-800 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                <span>{inv.parsedSplits.length} Metode: {inv.parsedSplits[0].paymentType} {inv.parsedSplits[0].bank !== '--' ? inv.parsedSplits[0].bank : ''}</span>
                              </div>
                              {inv.parsedSplits.length > 1 && (
                                <div className="text-[10px] text-slate-400 font-mono pl-3">
                                  + {inv.parsedSplits.length - 1} metode split lainnya
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Belum ada rincian split
                            </span>
                          )}
                        </td>

                        {/* 7. Status Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                              <Check className="w-3 h-3" />
                              <span>{isOverridden ? 'OVERRIDE' : 'TERKUNCI'}</span>
                            </span>
                          ) : isSubmitted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>SIAP AUDIT</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              <span>PENDING</span>
                            </span>
                          )}
                        </td>

                        {/* 8. Action Button */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenVerification(inv);
                            }}
                            className="px-3 py-1 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verifikasi</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Menampilkan <strong>{filteredInvoices.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> – <strong>{Math.min(currentPage * itemsPerPage, filteredInvoices.length)}</strong> dari <strong>{filteredInvoices.length}</strong> transaksi
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                <div className="px-3 py-1 font-mono font-bold text-slate-800">
                  {currentPage} / {totalPages}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* POP UP MODAL VERIFIKASI & KOREKSI TRANSAKSI */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInvoice(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 bg-white flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                      VERIFIKASI SETTLEMENT
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      Butik {selectedInvoice.location}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold font-mono text-slate-900">
                    {selectedInvoice.trans_no}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tanggal: <strong className="text-slate-700">{formatDate(selectedInvoice.transaction_date)}</strong> • Kasir: <strong className="text-slate-700">{selectedInvoice.salesman || '—'}</strong> • Customer: <strong className="text-slate-700">{selectedInvoice.customer || 'Walk-in'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedInvoice.verification.status === 'VERIFIED' || selectedInvoice.verification.status === 'OVERRIDDEN' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                      <Check className="w-3.5 h-3.5" />
                      <span>{selectedInvoice.verification.status === 'OVERRIDDEN' ? 'OVERRIDE FINANCE' : 'TERVERIFIKASI'}</span>
                    </span>
                  ) : selectedInvoice.verification.status === 'SUBMITTED' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>SUBMITTED STORE</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      <span>PENDING INPUT TOKO</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">

                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Tagihan Transaksi (Gross)
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      Rp {formatCurrency(selectedGrossTarget)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      Net DPP: Rp {formatCurrency(Math.round(selectedInvoice.total_net || 0))} · PPN 11%: Rp {formatCurrency(Math.round(selectedGrossTarget - (selectedInvoice.total_net || 0)))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      Total Card Comm (Beban Bank)
                    </div>
                    <div className="text-xl font-bold text-emerald-900 mt-1">
                      Rp {formatCurrency(selectedInvoice.total_comm || 0)}
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      Net ke Rekening: Rp {formatCurrency(selectedGrossTarget - (selectedInvoice.total_comm || 0))}
                    </div>
                  </div>
                </div>

                {/* MODE 1: Normal View of POS Splits & Settlement */}
                {correctionMode === 'VIEW' && (
                  <>
                    {/* Section 1: Rincian Pembayaran Dari Butik */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Rincian Pembayaran dari Butik (Input Kasir POS)</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {selectedInvoice.parsedSplits?.length || 0} Metode Split
                        </span>
                      </div>

                      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
                        {selectedInvoice.parsedSplits && selectedInvoice.parsedSplits.length > 0 ? (
                          selectedInvoice.parsedSplits.map((s: PaymentSplitRow, idx: number) => {
                            const mdrPctStr = (s.mdrPct * 100).toFixed(s.mdrPct === 0 ? 0 : 2);
                            const isCard = !['Cash', 'Transfer', 'Deposit', 'Voucher', 'Rounding', '--'].includes(s.paymentType);

                            return (
                              <div
                                key={s.id || idx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1.5 border-b border-slate-200/60 last:border-0 gap-1 font-mono"
                              >
                                <div className="text-slate-800 font-semibold flex items-center gap-2">
                                  <span className="text-slate-400 font-bold">{idx + 1}.</span>
                                  <span>
                                    {s.paymentType === 'Credit Card' || s.paymentType === 'Debit Card'
                                      ? `${s.paymentType} (${s.bank !== '--' ? s.bank : s.edc}${s.installment !== '--' ? ` ${s.installment}` : ''})`
                                      : s.paymentType === 'Cash'
                                      ? 'Cash (Tunai)'
                                      : s.paymentType}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="font-bold text-slate-900">
                                    Rp {formatCurrency(s.amount)}
                                  </span>
                                  <span className="text-[11px] text-slate-500 ml-2">
                                    (MDR {mdrPctStr}% {isCard ? `= Rp ${formatCurrency(s.cardComm)}` : ''})
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-xs text-slate-400 italic py-2">
                            Kasir butik belum memasukkan rincian split payment untuk nota ini. Nilai komisi saat ini di sistem: Rp {formatCurrency(selectedInvoice.total_comm || 0)}.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 2: Verifikasi Rekening Koran / Settlement */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Verifikasi Rekening Koran / Settlement Bank</span>
                        </span>
                        <span className="text-[10px] font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          SINKRON EDC
                        </span>
                      </div>

                      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
                        <div className="flex justify-between text-slate-700">
                          <span>Settlement Masuk Rekening Butik:</span>
                          <strong className="font-bold text-slate-900">
                            IDR {formatCurrency((selectedInvoice.total_net || 0) - (selectedInvoice.total_comm || 0))}
                          </strong>
                        </div>

                        <div className="flex justify-between text-slate-700">
                          <span>Potongan Biaya Bank Riil:</span>
                          <strong className="font-bold text-emerald-800">
                            -IDR {formatCurrency(selectedInvoice.total_comm || 0)}
                          </strong>
                        </div>

                        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 font-sans">
                          * Cocok 100% dengan hitungan sistem otomatis (Selisih: Rp 0).
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Audit Trail Information if already verified */}
                    {(selectedInvoice.verification.status === 'VERIFIED' || selectedInvoice.verification.status === 'OVERRIDDEN') && selectedInvoice.verification.verifiedBy && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Faktur ini telah diaudit dan dikunci oleh Finance</span>
                        </div>
                        <div className="text-[11px] text-emerald-800">
                          Diverifikasi oleh <strong>{selectedInvoice.verification.verifiedBy}</strong>
                          {selectedInvoice.verification.verifiedAt && ` • ${new Date(selectedInvoice.verification.verifiedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`}
                        </div>
                        {selectedInvoice.verification.note && (
                          <div className="text-[11px] text-slate-600 italic pt-1 border-t border-emerald-200/60">
                            Catatan audit: "{selectedInvoice.verification.note}"
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* MODE 2: Split Payment Correction (Exact same options as POS input) */}
                {correctionMode === 'SPLIT_CORRECTION' && (
                  <div className="p-4 rounded-xl border border-emerald-300 bg-white space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-emerald-600" />
                          <span>Koreksi Rincian Split Payment (Sama Seperti Input Kasir)</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Ubah metode bayar, mesin EDC, bank mitra, tenor cicilan, atau nominal jika kasir salah memilih.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddSplitRow}
                        className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Split</span>
                      </button>
                    </div>

                    {/* Interactive Split Table */}
                    <div className="space-y-3">
                      {editRows.map((row, idx) => {
                        const isCard = !['Cash', 'Transfer', 'Deposit', 'Voucher', 'Rounding', '--'].includes(row.paymentType);
                        const isLink = row.paymentType === 'Link Payment';
                        const isDebit = row.paymentType === 'Debit Card';
                        const isQris = row.paymentType === 'QRIS';

                        return (
                          <div
                            key={row.id || idx}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                                  {idx + 1}
                                </span>
                                <span>Split Pembayaran #{idx + 1}</span>
                              </span>

                              {editRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSplitRow(idx)}
                                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus baris ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                              {/* 1. Metode Bayar */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Metode
                                </label>
                                <select
                                  value={row.paymentType}
                                  onChange={e => handleEditRowChange(idx, 'paymentType', e.target.value as PaymentType)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                >
                                  {PAYMENT_TYPES.map(pt => (
                                    <option key={pt} value={pt}>{pt}</option>
                                  ))}
                                </select>
                              </div>

                              {/* 2. Mesin EDC */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Mesin EDC
                                </label>
                                <select
                                  disabled={!isCard && !isLink}
                                  value={row.edc}
                                  onChange={e => handleEditRowChange(idx, 'edc', e.target.value as EdcOption)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                >
                                  {EDC_OPTIONS.map(edc => (
                                    <option key={edc} value={edc}>{edc}</option>
                                  ))}
                                </select>
                              </div>

                              {/* 3. Bank Mitra */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Bank Kartu
                                </label>
                                <select
                                  disabled={!isCard && !isLink}
                                  value={row.bank}
                                  onChange={e => handleEditRowChange(idx, 'bank', e.target.value as BankOption)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                >
                                  {BANK_OPTIONS.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                  ))}
                                </select>
                              </div>

                              {/* 4. Tenor Cicilan */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Tenor
                                </label>
                                <select
                                  disabled={(!isCard && !isLink) || isDebit || isQris}
                                  value={isDebit || isQris ? '--' : row.installment}
                                  onChange={e => handleEditRowChange(idx, 'installment', e.target.value as InstallmentOption)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                >
                                  {INSTALLMENT_OPTIONS.map(inst => (
                                    <option key={inst} value={inst}>{inst}</option>
                                  ))}
                                </select>
                              </div>

                              {/* 5. Nominal Bayar */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Nominal (IDR)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={row.amount || ''}
                                  onChange={e => handleEditRowChange(idx, 'amount', Number(e.target.value || 0))}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </div>

                            {/* Auto MDR Info Row */}
                            <div className="flex flex-wrap items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 font-mono text-slate-600">
                              <div className="flex items-center gap-2">
                                <span>MDR: <strong>{(row.mdrPct * 100).toFixed(row.mdrPct === 0 ? 0 : 2)}%</strong></span>
                                {row.processMethod === 'MANUAL_FORM' && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-700 font-semibold">Form Manual Bank</span>
                                )}
                              </div>
                              <div>
                                Potongan Komisi: <strong className="text-emerald-800">Rp {formatCurrency(row.cardComm)}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Balance Check Toolbar */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5 font-mono">
                        <div>Total Split: <strong>Rp {formatCurrency(editTotalPaid)}</strong> / Target Gross: <strong>Rp {formatCurrency(selectedGrossTarget)}</strong></div>
                        <div className={cn("font-bold text-[11px]", isEditBalanced ? "text-emerald-700" : "text-slate-800")}>
                          {isEditBalanced
                            ? '✓ Total split pas 100% dengan Tagihan Transaksi (Gross)'
                            : `⚠️ Selisih: Rp ${formatCurrency(Math.abs(editDiff))} ${editDiff > 0 ? '(Kurang)' : '(Kelebihan)'}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setCorrectionMode('VIEW')}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={savingAction !== null || !isEditBalanced}
                          onClick={() => handleSaveSplitCorrection(selectedInvoice)}
                          className={cn(
                            "px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer text-white",
                            isEditBalanced
                              ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                              : "bg-slate-300 text-slate-500 cursor-not-allowed"
                          )}
                        >
                          {savingAction === selectedInvoice.trans_no ? 'Menyimpan...' : 'Simpan Koreksi Split'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE 3: Direct Amount Override (Rekening Koran) */}
                {correctionMode === 'MANUAL_OVERRIDE' && (
                  <div className="p-4 rounded-xl border border-slate-300 bg-white space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-slate-600" />
                        <span>Koreksi Nominal Riil Langsung (Sesuai Rekening Koran)</span>
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">Override Finance</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Nilai Komisi Riil Sesuai Rekening Koran (IDR)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 font-mono font-bold text-xs text-slate-400">Rp</span>
                          <input
                            type="number"
                            step="1000"
                            min="0"
                            value={overrideCommAmount || ''}
                            onChange={e => setOverrideCommAmount(Number(e.target.value || 0))}
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Alasan / Catatan Koreksi Finance
                        </label>
                        <textarea
                          rows={2}
                          value={overrideNote}
                          onChange={e => setOverrideNote(e.target.value)}
                          placeholder="Contoh: Selisih MDR EDC Maybank 1.5% vs 1.7% sesuai rekening koran tgl 26..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                        />
                      </div>

                      <div className="pt-1 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setCorrectionMode('VIEW')}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={savingAction !== null}
                          onClick={() => handleSaveDirectAmountOverride(selectedInvoice)}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer"
                        >
                          {savingAction === selectedInvoice.trans_no ? 'Menyimpan...' : 'Simpan Nominal & Kunci'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer Bar */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Left Action: Correction Mode Switches */}
                <div className="flex flex-wrap items-center gap-2">
                  {correctionMode === 'VIEW' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setCorrectionMode('SPLIT_CORRECTION')}
                        className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Koreksi Rincian Split (POS)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCorrectionMode('MANUAL_OVERRIDE')}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Override Nominal Riil</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCorrectionMode('VIEW')}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Kembali ke Tampilan Normal
                    </button>
                  )}
                </div>

                {/* Right Action: Close & Validate */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>

                  {correctionMode === 'VIEW' && (
                    <button
                      type="button"
                      disabled={savingAction === selectedInvoice.trans_no}
                      onClick={() => handleValidateAndLock(selectedInvoice)}
                      className={cn(
                        "px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs text-white",
                        selectedInvoice.verification.status === 'VERIFIED'
                          ? "bg-slate-800 hover:bg-slate-900"
                          : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {savingAction === selectedInvoice.trans_no
                          ? 'Memproses...'
                          : selectedInvoice.verification.status === 'VERIFIED'
                          ? 'Validasi Ulang & Kunci'
                          : 'Validasi & Kunci Komisi'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUserAccess } from '@/lib/user-access-context';
import {
  fetchPaymentAnalytics,
  PaymentAnalyticsData,
} from '@/services/dashboard/paymentAnalyticsService';
import PaymentAnalyticsHeader from './components/PaymentAnalyticsHeader';
import PaymentKpiCards from './components/PaymentKpiCards';
import BankPerformanceTable from './components/BankPerformanceTable';
import PaymentMethodBreakdown from './components/PaymentMethodBreakdown';
import EdcAndStoreBreakdown from './components/EdcAndStoreBreakdown';
import PaymentSplitAuditTable from './components/PaymentSplitAuditTable';
import { exportPaymentAnalyticsToExcel } from './components/paymentAnalyticsExport';
import Link from 'next/link';
import { Loader2, AlertCircle, ShieldCheck, Info, ArrowUpRight } from 'lucide-react';
import PosPaymentModal from '@/app/invoice-management/PosPaymentModal';
import { InvoiceHeader } from '@/services/dashboard/invoiceService';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = ['2024', '2025', '2026', '2027'];
const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

export default function FinancePaymentAnalyticsPage() {
  const { assignedStore, userEmail } = useUserAccess();
  const today = new Date();

  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear] = useState(String(today.getFullYear()));
  const [selectedStore, setSelectedStore] = useState(assignedStore && assignedStore !== 'ALL' ? assignedStore : 'ALL');
  const [data, setData] = useState<PaymentAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<InvoiceHeader | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPaymentAnalytics(month, Number(year), selectedStore);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payment analytics.');
    } finally {
      setLoading(false);
    }
  }, [month, year, selectedStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = () => {
    if (!data) return;
    exportPaymentAnalyticsToExcel(data);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* 1. Header & Global Filters */}
      <PaymentAnalyticsHeader
        month={month}
        year={year}
        monthsList={MONTHS}
        yearsList={YEARS}
        selectedStore={selectedStore}
        storesList={STORES}
        loading={loading}
        onMonthChange={setMonth}
        onYearChange={setYear}
        onStoreChange={setSelectedStore}
        onRefresh={loadData}
        onExport={handleExport}
      />

      {/* 2. Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Loading Indicator */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-xs font-mono">Aggregating verified bank performance & MDR...</span>
        </div>
      ) : data ? (
        <>
          {/* Verification Status Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <strong className="font-bold">Verified Data Only:</strong> Showing{' '}
                <strong className="font-mono text-emerald-700">{data.totalInvoicesCount}</strong> invoices with verified POS splits out of{' '}
                <strong className="font-mono">{data.totalPeriodInvoices}</strong> total invoices for this period ({data.verificationRate.toFixed(1)}%).
              </div>
            </div>

            {data.pendingInvoicesCount > 0 && (
              <Link
                href="/finance-reconciliation"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 transition-colors shrink-0"
              >
                <span>Audit {data.pendingInvoicesCount} pending invoices</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* If 0 verified splits in selected period */}
          {data.totalSplitsCount === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Info className="w-5 h-5" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  No Verified Transactions in Performance
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Performance metrics above require verified split payments. Please click <strong className="text-emerald-700">"Process POS"</strong> in the table below to process invoices.
                </p>
              </div>
            </div>
          )}

          {data.totalSplitsCount > 0 && (
            <>
              {/* 4. Executive KPI Metrics */}
              <PaymentKpiCards data={data} />

              {/* 5. Bank Performance Table */}
              <BankPerformanceTable banks={data.banks} totalGross={data.totalGross} />

              {/* 6. Payment Methods & Installment Tenor Breakdowns */}
              <PaymentMethodBreakdown methods={data.methods} installments={data.installments} />

              {/* 7. EDC Terminal & Store Comparisons */}
              <EdcAndStoreBreakdown edcTerminals={data.edcTerminals} stores={data.stores} />
            </>
          )}

          {/* 8. Detailed Split Transaction Audit Table with tabs and direct processing */}
          <PaymentSplitAuditTable
            transactions={data.transactions}
            onProcessInvoice={inv => setSelectedInvoiceForPayment(inv)}
          />
        </>
      ) : null}

      {/* POS Payment Modal for instant processing */}
      <PosPaymentModal
        invoice={selectedInvoiceForPayment}
        isOpen={Boolean(selectedInvoiceForPayment)}
        onClose={() => setSelectedInvoiceForPayment(null)}
        onSuccess={() => {
          setSelectedInvoiceForPayment(null);
          loadData();
        }}
        userEmail={userEmail}
      />
    </div>
  );
}

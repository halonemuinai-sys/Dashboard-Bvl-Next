'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ListFilter, CheckCircle2, Clock, Edit3, PlusCircle } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { EnrichedSplitTransaction } from '@/services/dashboard/paymentAnalyticsService';
import { InvoiceHeader } from '@/services/dashboard/invoiceService';

interface Props {
  transactions: EnrichedSplitTransaction[];
  onProcessInvoice: (invoice: InvoiceHeader) => void;
}

const PAGE_SIZE = 15;

export default function PaymentSplitAuditTable({ transactions, onProcessInvoice }: Props) {
  const [statusTab, setStatusTab] = useState<'VERIFIED' | 'UNVERIFIED' | 'ALL'>('VERIFIED');
  const [search, setSearch] = useState('');
  const [selectedBankFilter, setSelectedBankFilter] = useState('ALL');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Counts for tabs
  const verifiedCount = useMemo(() => transactions.filter(t => t.isVerified).length, [transactions]);
  const unverifiedCount = useMemo(() => transactions.filter(t => !t.isVerified).length, [transactions]);
  const totalCount = transactions.length;

  // Extract unique banks and methods for filters based on active transactions
  const bankOptions = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.bank && t.bank !== '--' && t.bank !== 'Belum Di-split' && t.bank !== 'Unassigned') set.add(t.bank);
    });
    return Array.from(set).sort();
  }, [transactions]);

  const methodOptions = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.paymentType && t.paymentType !== 'Belum Diproses' && t.paymentType !== 'Unprocessed') set.add(t.paymentType);
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      // Tab filter
      if (statusTab === 'VERIFIED' && !t.isVerified) return false;
      if (statusTab === 'UNVERIFIED' && t.isVerified) return false;

      // Search filter
      const matchSearch =
        !search ||
        t.transNo.toLowerCase().includes(search.toLowerCase()) ||
        t.customer.toLowerCase().includes(search.toLowerCase()) ||
        t.salesman.toLowerCase().includes(search.toLowerCase()) ||
        t.bank.toLowerCase().includes(search.toLowerCase()) ||
        t.edc.toLowerCase().includes(search.toLowerCase());

      const matchBank = selectedBankFilter === 'ALL' || t.bank === selectedBankFilter;
      const matchMethod = selectedMethodFilter === 'ALL' || t.paymentType === selectedMethodFilter;

      return matchSearch && matchBank && matchMethod;
    });
  }, [transactions, statusTab, search, selectedBankFilter, selectedMethodFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
      {/* Title & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Payment & Card Comm Transaction Log
          </h3>
          <p className="text-xs text-slate-500">
            Only verified transactions are calculated in performance metrics above. You can process pending invoices directly here.
          </p>
        </div>

        {/* Tab Switcher: Processed vs Pending vs All */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => {
              setStatusTab('VERIFIED');
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5",
              statusTab === 'VERIFIED'
                ? "bg-white text-emerald-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Processed ({verifiedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusTab('UNVERIFIED');
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5",
              statusTab === 'UNVERIFIED'
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Pending ({unverifiedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusTab('ALL');
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer",
              statusTab === 'ALL'
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            All ({totalCount})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice, customer, bank..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-emerald-500 w-52 sm:w-60 shadow-2xs"
            />
          </div>

          {/* Filter Bank (Only if on verified or all) */}
          {bankOptions.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <ListFilter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBankFilter}
                onChange={e => {
                  setSelectedBankFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Banks</option>
                {bankOptions.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Method */}
          {methodOptions.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <select
                value={selectedMethodFilter}
                onChange={e => {
                  setSelectedMethodFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Methods</option>
                {methodOptions.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing <strong className="text-slate-800">{filtered.length}</strong> transactions
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-3 w-8 text-center">#</th>
              <th className="py-3 px-3">Invoice No</th>
              <th className="py-3 px-3">Date & Boutique</th>
              <th className="py-3 px-3">Customer / Client</th>
              <th className="py-3 px-3">Method & EDC</th>
              <th className="py-3 px-3">Bank & Tenor</th>
              <th className="py-3 px-3 text-right">Amount (IDR)</th>
              <th className="py-3 px-3 text-center bg-emerald-50/70 text-emerald-950 border-l border-emerald-200">MDR %</th>
              <th className="py-3 px-3 text-right">Card Comm</th>
              <th className="py-3 px-3 text-right">Net Settlement</th>
              <th className="py-3 px-3 text-center">Status / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-400">
                  {statusTab === 'VERIFIED'
                    ? 'No processed transactions found for this filter.'
                    : 'No transactions found.'}
                </td>
              </tr>
            ) : (
              paginated.map((t, idx) => {
                const rowNo = (page - 1) * PAGE_SIZE + idx + 1;
                const formattedDate = t.transDate ? t.transDate.substring(0, 10) : '—';

                return (
                  <tr key={`${t.transNo}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                      {rowNo}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {t.transNo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{formattedDate}</div>
                      <div className="text-[10px] text-slate-400">{t.location}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      <div className="font-semibold">{t.customer}</div>
                      <div className="text-[10px] text-slate-400">Adv: {t.salesman}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      {t.isVerified ? (
                        <>
                          <div className="font-medium text-slate-800">{t.paymentType}</div>
                          <div className="text-[10px] text-slate-400">
                            {t.edc !== '--' ? `EDC: ${t.edc}` : 'Non-EDC'}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Pending Split</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {t.isVerified ? (
                        <>
                          <div className="font-bold text-slate-900">{t.bank}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {t.installment !== '--' ? t.installment : 'Full Payment'} · {t.cardType}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      Rp {formatCurrency(t.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-950 bg-emerald-50/70 border-l border-emerald-200">
                      {t.isVerified ? `${(t.mdrPct * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                      {t.isVerified ? `Rp ${formatCurrency(t.cardComm)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                      {t.isVerified ? `Rp ${formatCurrency(t.netSettlement)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {t.isVerified ? (
                        <button
                          type="button"
                          onClick={() => onProcessInvoice(t.rawInvoice)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Edit POS Split Payment Details"
                        >
                          <Edit3 className="w-3 h-3 text-slate-500" />
                          <span>Edit POS</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onProcessInvoice(t.rawInvoice)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                          title="Process and input split payment for this invoice"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Process POS</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
        <div>
          Showing <strong className="text-slate-800">{paginated.length}</strong> of{' '}
          <strong className="text-slate-800">{filtered.length}</strong> transactions
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-slate-700">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

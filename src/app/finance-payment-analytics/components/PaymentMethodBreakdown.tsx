'use client';

import React from 'react';
import { CreditCard, CalendarClock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PaymentMethodStat, InstallmentStat } from '@/services/dashboard/paymentAnalyticsService';

interface Props {
  methods: PaymentMethodStat[];
  installments: InstallmentStat[];
}

export default function PaymentMethodBreakdown({ methods, installments }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Payment Methods Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Payment Method Distribution
            </h3>
            <p className="text-xs text-slate-500">
              Share of Credit Card, Debit Card, Bank Transfer, and Cash.
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3 text-right">Volume (IDR)</th>
                <th className="py-2.5 px-3 text-center">Share (%)</th>
                <th className="py-2.5 px-3 text-right">Card Comm</th>
                <th className="py-2.5 px-3 text-center bg-emerald-50/70 text-emerald-950 border-l border-emerald-200">MDR %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {methods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No payment method data available.
                  </td>
                </tr>
              ) : (
                methods.map(m => (
                  <tr key={m.paymentType} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {m.paymentType}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      Rp {formatCurrency(m.volume)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {m.volumeShare.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      Rp {formatCurrency(m.cardComm)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-950 bg-emerald-50/70 border-l border-emerald-200">
                      {m.effectiveMdr.toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Installment Tenors Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
            <CalendarClock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              0% Installment Tenor Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Comparison of Full Payment vs long-term installment tenors.
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Tenor</th>
                <th className="py-2.5 px-3 text-right">Volume (IDR)</th>
                <th className="py-2.5 px-3 text-center">Share (%)</th>
                <th className="py-2.5 px-3 text-right">Card Comm</th>
                <th className="py-2.5 px-3 text-center bg-emerald-50/70 text-emerald-950 border-l border-emerald-200">MDR %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {installments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No installment tenor data available.
                  </td>
                </tr>
              ) : (
                installments.map(i => (
                  <tr key={i.installment} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {i.installment === '--' ? 'Full Payment / Regular' : i.installment}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      Rp {formatCurrency(i.volume)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {i.volumeShare.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      Rp {formatCurrency(i.cardComm)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-950 bg-emerald-50/70 border-l border-emerald-200">
                      {i.effectiveMdr.toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

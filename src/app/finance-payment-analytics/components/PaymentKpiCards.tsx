'use client';

import React from 'react';
import {
  CreditCard,
  Percent,
  Receipt,
  PiggyBank,
  TrendingUp
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PaymentAnalyticsData } from '@/services/dashboard/paymentAnalyticsService';

interface Props {
  data: PaymentAnalyticsData | null;
}

export default function PaymentKpiCards({ data }: Props) {
  if (!data) return null;

  const kpis = [
    {
      label: 'Verified Gross Sales',
      value: `Rp ${formatCurrency(data.totalGross)}`,
      sub: `${data.totalInvoicesCount} verified invoices`,
      icon: Receipt,
      accent: 'emerald',
    },
    {
      label: 'Net Cash Settlement',
      value: `Rp ${formatCurrency(data.netSettlement)}`,
      sub: 'Net inflow after MDR deduction',
      icon: PiggyBank,
      accent: 'emerald',
    },
    {
      label: 'Total Card Comm (MDR Paid)',
      value: `Rp ${formatCurrency(data.totalCardComm)}`,
      sub: `${data.totalSplitsCount} verified card swipes`,
      icon: CreditCard,
      accent: 'slate',
    },
    {
      label: 'Effective MDR Rate',
      value: `${data.effectiveMdrPct.toFixed(2)}%`,
      sub: 'Average actual commission fee',
      icon: Percent,
      accent: 'emerald',
    },
    {
      label: 'Audit Verification Rate',
      value: `${data.verificationRate.toFixed(1)}%`,
      sub: `${data.totalInvoicesCount} of ${data.totalPeriodInvoices} invoices verified`,
      icon: TrendingUp,
      accent: data.verificationRate > 50 ? 'emerald' : 'slate',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((k, idx) => {
        const Icon = k.icon;
        const isEmerald = k.accent === 'emerald';

        return (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {k.label}
              </span>
              <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isEmerald
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="text-base sm:text-lg font-mono font-black text-slate-900 tracking-tight">
                {k.value}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                {k.sub}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

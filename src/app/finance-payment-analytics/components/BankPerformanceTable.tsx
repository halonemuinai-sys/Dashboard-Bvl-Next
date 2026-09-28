'use client';

import React, { useState } from 'react';
import { Building2, ArrowUpDown, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BankPerformanceStat } from '@/services/dashboard/paymentAnalyticsService';

interface Props {
  banks: BankPerformanceStat[];
  totalGross: number;
}

export default function BankPerformanceTable({ banks, totalGross }: Props) {
  const [sortBy, setSortBy] = useState<'volume' | 'cardComm' | 'effectiveMdr' | 'txCount'>('volume');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: 'volume' | 'cardComm' | 'effectiveMdr' | 'txCount') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const sortedBanks = [...banks].sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    return sortAsc ? valA - valB : valB - valA;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
      {/* Title & Insight */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Bank Performance Ranking (Issuer Share)
            </h2>
            <p className="text-xs text-slate-500">
              Comparison of transaction volume, MDR fees, and net settlement efficiency by issuing bank.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Total Active: <strong className="text-slate-800">{banks.length} Banks</strong>
        </div>
      </div>

      {/* Table Container */}
      <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3">Issuing Bank</th>
              <th
                onClick={() => handleSort('volume')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Transaction Volume (IDR)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 w-36">Market Share (%)</th>
              <th
                onClick={() => handleSort('txCount')}
                className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Tx Count</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('cardComm')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Card Comm / MDR (IDR)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-right">Net Settlement (IDR)</th>
              <th
                onClick={() => handleSort('effectiveMdr')}
                className="py-3 px-3 text-center bg-emerald-50/70 text-emerald-950 border-l border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors select-none"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Effective MDR</span>
                  <ArrowUpDown className="w-3 h-3 text-emerald-700" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">On-Us / Off-Us Ratio</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedBanks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  No verified banking transactions for this period.
                </td>
              </tr>
            ) : (
              sortedBanks.map((b, idx) => {
                const isTop1 = idx === 0 && b.volumeShare > 0;

                return (
                  <tr key={b.bank} className="hover:bg-slate-50/60 transition-colors">
                    {/* Rank */}
                    <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Bank Name */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {b.bank}
                        </span>
                        {isTop1 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Leader
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Volume IDR */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      Rp {formatCurrency(b.volume)}
                    </td>

                    {/* Share Bar */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>{b.volumeShare.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, b.volumeShare))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Tx Count */}
                    <td className="py-3 px-3 text-center font-mono text-slate-700">
                      {b.txCount} tx
                    </td>

                    {/* Card Comm */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                      Rp {formatCurrency(b.cardComm)}
                    </td>

                    {/* Net Settlement */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      Rp {formatCurrency(b.netSettlement)}
                    </td>

                    {/* Effective MDR */}
                    <td className="py-3 px-3 text-center font-mono font-black text-emerald-950 bg-emerald-50/70 border-l border-emerald-200">
                      {b.effectiveMdr.toFixed(2)}%
                    </td>

                    {/* On-Us / Off-Us */}
                    <td className="py-3 px-3 text-center text-[10px] font-mono text-slate-500">
                      {b.onUsCount > 0 || b.offUsCount > 0 ? (
                        <span>
                          <strong className="text-emerald-700">{b.onUsCount} On-Us</strong> / {b.offUsCount} Off-Us
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Smartphone, Store } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { EdcTerminalStat, StorePerformanceStat } from '@/services/dashboard/paymentAnalyticsService';

interface Props {
  edcTerminals: EdcTerminalStat[];
  stores: StorePerformanceStat[];
}

export default function EdcAndStoreBreakdown({ edcTerminals, stores }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. EDC Terminal Utilization */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              EDC Terminal Utilization
            </h3>
            <p className="text-xs text-slate-500">
              Productivity comparison of EDC swipe terminals in boutique.
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">EDC Terminal</th>
                <th className="py-2.5 px-3 text-right">Volume (IDR)</th>
                <th className="py-2.5 px-3 text-center">Tx Count</th>
                <th className="py-2.5 px-3 text-center">Share (%)</th>
                <th className="py-2.5 px-3 text-center bg-emerald-50/70 text-emerald-950 border-l border-emerald-200">MDR %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {edcTerminals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No EDC terminal data available.
                  </td>
                </tr>
              ) : (
                edcTerminals.map(e => (
                  <tr key={e.edc} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {e.edc === '--' ? 'Non-EDC' : `EDC ${e.edc}`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      Rp {formatCurrency(e.volume)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {e.txCount} tx
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {e.volumeShare.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-950 bg-emerald-50/70 border-l border-emerald-200">
                      {e.effectiveMdr.toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Store Location Breakdown */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Store Payment Performance
            </h3>
            <p className="text-xs text-slate-500">
              Comparison of gross sales, MDR fees, and net settlement by boutique.
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Boutique</th>
                <th className="py-2.5 px-3 text-right">Gross (IDR)</th>
                <th className="py-2.5 px-3 text-right">Card Comm</th>
                <th className="py-2.5 px-3 text-right">Net Settlement</th>
                <th className="py-2.5 px-3 text-center bg-emerald-50/70 text-emerald-950 border-l border-emerald-200">MDR %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No boutique performance data available.
                  </td>
                </tr>
              ) : (
                stores.map(s => (
                  <tr key={s.store} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {s.store}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      Rp {formatCurrency(s.volume)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      Rp {formatCurrency(s.cardComm)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      Rp {formatCurrency(s.netSettlement)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-950 bg-emerald-50/70 border-l border-emerald-200">
                      {s.effectiveMdr.toFixed(2)}%
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

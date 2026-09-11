'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  Search,
  RefreshCw,
  FileDown,
  MapPin,
  Tag,
  CreditCard,
  Trash2,
  User,
  Clock,
  ArrowRight,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService } from '@/services/dashboardService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedAuditItem {
  id: number;
  createdAt: string;
  userEmail: string;
  userName: string;
  userRole: string;
  actionType: 'LOCATION_CHANGE' | 'TYPE_CHANGE' | 'COMM_CHANGE' | 'DELETE' | 'OTHER_UPDATE';
  actionLabel: string;
  transNo: string;
  customer: string;
  salesman: string;
  category: string;
  itemCode: string;
  transDate: string;
  oldValue: string;
  newValue: string;
  raw: any;
}

const ACTION_TABS = [
  { key: 'ALL', label: 'Semua Log' },
  { key: 'LOCATION_CHANGE', label: 'Ubah Lokasi' },
  { key: 'TYPE_CHANGE', label: 'Ubah Type' },
  { key: 'COMM_CHANGE', label: 'Ubah Comm' },
  { key: 'DELETE', label: 'Hapus Transaksi' },
];

export default function AuditTrailModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ParsedAuditItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [logs, uMap] = await Promise.all([
        dashboardService.getTransactionAuditLogs(300),
        dashboardService.getDashboardUsersMap(),
      ]);

      const parsed: ParsedAuditItem[] = logs.map(l => {
        const oldVal = l.old_values || {};
        const newVal = l.new_values || {};
        const isDelete = l.action_type === 'DELETE';

        let actionType: ParsedAuditItem['actionType'] = 'OTHER_UPDATE';
        let actionLabel = 'Pembaruan Data';
        let oldDisplay = '';
        let newDisplay = '';

        if (isDelete) {
          actionType = 'DELETE';
          actionLabel = 'Hapus Transaksi';
          oldDisplay = `Net Sales: Rp ${(oldVal.net_sales || 0).toLocaleString('id-ID')}`;
          newDisplay = 'Dihapus';
        } else if (oldVal.location !== newVal.location && newVal.location) {
          actionType = 'LOCATION_CHANGE';
          actionLabel = 'Ubah Lokasi';
          oldDisplay = oldVal.location || '—';
          newDisplay = newVal.location || '—';
        } else if (oldVal.comm !== newVal.comm && newVal.comm !== undefined) {
          actionType = 'COMM_CHANGE';
          actionLabel = 'Ubah Commission';
          oldDisplay = `Rp ${(oldVal.comm || 0).toLocaleString('id-ID')}`;
          newDisplay = `Rp ${(newVal.comm || 0).toLocaleString('id-ID')}`;
        } else if (oldVal.type !== newVal.type && newVal.type !== undefined) {
          actionType = 'TYPE_CHANGE';
          actionLabel = 'Ubah Type Item';
          oldDisplay = oldVal.type || '—';
          newDisplay = newVal.type || '—';
        }

        const emailLower = (l.user_email || '').toLowerCase();
        const userInfo = uMap[emailLower] || {
          full_name: emailLower === 'system' ? 'System Process' : emailLower.split('@')[0],
          role: emailLower === 'system' ? 'system' : 'user'
        };

        const targetData = isDelete ? oldVal : newVal;

        return {
          id: l.id,
          createdAt: l.created_at,
          userEmail: l.user_email || 'system',
          userName: userInfo.full_name,
          userRole: userInfo.role,
          actionType,
          actionLabel,
          transNo: targetData.trans_no || oldVal.trans_no || `ID #${l.record_id}`,
          customer: targetData.customer || oldVal.customer || '—',
          salesman: targetData.salesman || oldVal.salesman || '—',
          category: targetData.main_category || targetData.collection || '—',
          itemCode: targetData.catalogue_code || targetData.sap_code || '—',
          transDate: targetData.transaction_date || oldVal.transaction_date || '',
          oldValue: oldDisplay,
          newValue: newDisplay,
          raw: l,
        };
      });

      setItems(parsed);
    } catch (e) {
      console.error('Failed to load transaction audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(item => {
      if (activeTab !== 'ALL' && item.actionType !== activeTab) {
        return false;
      }
      if (q) {
        const matchTrans = item.transNo.toLowerCase().includes(q);
        const matchCust = item.customer.toLowerCase().includes(q);
        const matchSales = item.salesman.toLowerCase().includes(q);
        const matchUser = item.userEmail.toLowerCase().includes(q) || item.userName.toLowerCase().includes(q);
        const matchItem = item.itemCode.toLowerCase().includes(q);
        if (!matchTrans && !matchCust && !matchSales && !matchUser && !matchItem) {
          return false;
        }
      }
      return true;
    });
  }, [items, activeTab, search]);

  const exportCSV = () => {
    const headers = ['ID', 'Waktu (WIB)', 'User Name', 'User Email', 'Role', 'Aksi', 'No Transaksi', 'Customer', 'Salesman', 'Item Code', 'Nilai Lama', 'Nilai Baru'];
    const rows = filtered.map(i => {
      const d = new Date(i.createdAt);
      const timeStr = d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      return [
        i.id,
        `"${timeStr}"`,
        `"${i.userName}"`,
        `"${i.userEmail}"`,
        `"${i.userRole}"`,
        `"${i.actionLabel}"`,
        `"${i.transNo}"`,
        `"${i.customer}"`,
        `"${i.salesman}"`,
        `"${i.itemCode}"`,
        `"${i.oldValue}"`,
        `"${i.newValue}"`,
      ].join(',');
    });

    const csvContent = '﻿' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Transaction_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 transition-all"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:px-7 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Transaction Audit Trail</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {filtered.length} Aktivitas
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Riwayat perubahan lokasi, type item, commission, dan penghapusan transaksi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              title="Refresh Audit Data"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-blue-600")} />
            </button>
            <button
              type="button"
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-all disabled:opacity-40"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-600" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Tabs Toolbar */}
        <div className="p-4 sm:px-7 border-b border-slate-100 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari no transaksi, customer, salesman, atau email user..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 placeholder:text-slate-400 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>

            {/* Action Badges Legend */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {ACTION_TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                    activeTab === tab.key
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 bg-slate-100/70 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {tab.label}
                  {tab.key !== 'ALL' && (
                    <span className={cn(
                      "ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full",
                      activeTab === tab.key ? "bg-white/20 text-white" : "bg-white text-slate-500"
                    )}>
                      {items.filter(i => i.actionType === tab.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-3 bg-slate-50/40">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
              <p className="text-xs font-medium text-slate-400">Memuat riwayat audit trail...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-2 text-center bg-white rounded-2xl border border-slate-200 p-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                <Filter className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">Tidak ada log aktivitas ditemukan</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Belum ada perubahan yang sesuai dengan pencarian atau filter yang Anda pilih.
              </p>
            </div>
          ) : (
            filtered.map(item => {
              const d = new Date(item.createdAt);
              const timeStr = d.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Asia/Jakarta',
              });

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-sm transition-all space-y-3.5"
                >
                  {/* Top Bar: Action Badge + Timestamp + User */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      {item.actionType === 'LOCATION_CHANGE' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          Ubah Lokasi
                        </span>
                      )}
                      {item.actionType === 'TYPE_CHANGE' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Tag className="w-3 h-3 text-indigo-600" />
                          Ubah Type Item
                        </span>
                      )}
                      {item.actionType === 'COMM_CHANGE' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CreditCard className="w-3 h-3 text-emerald-600" />
                          Ubah Card Commission
                        </span>
                      )}
                      {item.actionType === 'DELETE' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          Hapus Transaksi
                        </span>
                      )}
                      {item.actionType === 'OTHER_UPDATE' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                          Pembaruan Transaksi
                        </span>
                      )}

                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeStr} WIB
                      </span>
                    </div>

                    {/* User Badge */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center uppercase shrink-0 border border-slate-200">
                        {item.userName[0] || 'U'}
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-800 block leading-tight">
                          {item.userName}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {item.userEmail}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Metadata & Visual Diff */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* Left: Transaction Info */}
                    <div className="md:col-span-5 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600">
                          {item.transNo}
                        </span>
                        {item.transDate && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({item.transDate.slice(0, 10)})
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 font-medium truncate">
                        <span className="text-slate-400">Customer:</span> {item.customer}
                      </p>
                      <p className="text-slate-500 text-[11px] truncate">
                        <span className="text-slate-400">Salesman:</span> {item.salesman} · <span className="text-slate-400">Item:</span> {item.itemCode}
                      </p>
                    </div>

                    {/* Right: Visual Diff Box */}
                    <div className="md:col-span-7 bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                      {item.actionType === 'DELETE' ? (
                        <div className="w-full flex items-center justify-between text-xs">
                          <span className="text-rose-600 font-bold">
                            Transaksi Dihapus Permanen
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {item.oldValue}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                              Sebelum
                            </span>
                            <span className="font-bold text-slate-500 line-through truncate block">
                              {item.oldValue || '—'}
                            </span>
                          </div>

                          <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>

                          <div className="flex-1 min-w-0 text-right">
                            <span className="text-[10px] uppercase font-bold text-blue-500 block mb-0.5">
                              Sesudah (Diubah)
                            </span>
                            <span className="font-bold text-blue-700 truncate block">
                              {item.newValue || '—'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-7 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>
            Menampilkan <strong className="text-slate-800">{filtered.length}</strong> dari total <strong className="text-slate-800">{items.length}</strong> log audit
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}

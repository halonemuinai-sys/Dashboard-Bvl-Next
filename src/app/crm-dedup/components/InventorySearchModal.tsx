"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Search, X, ShoppingBag, Package, Store,
  Loader2, Plus, Check, Tag, Sparkles, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MASTER_DATA } from '../masterData';

export interface InventoryItem {
  item_code: string;
  sap_code: string;
  deskripsi: string;
  kategori: string;
  koleksi: string;
  harga: number;
  location?: string;
  qoh?: number;
  source?: 'inventory' | 'catalog';
}

interface InventorySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStore?: string;
  onSelectItem: (item: InventoryItem) => void;
  onDirectAddItem?: (item: InventoryItem) => void;
}

const QUICK_FILTERS = ['Semua', 'Serpenti', 'B.zero1', 'Diva', 'BB', 'Octo', 'Jewelry', 'Watches', 'Accessories', 'Perfume'];

export function InventorySearchModal({
  isOpen,
  onClose,
  currentStore = 'Plaza Indonesia',
  onSelectItem,
  onDirectAddItem,
}: InventorySearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>(currentStore || 'ALL');
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>('Semua');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Sync store with prop when modal opens
  useEffect(() => {
    if (isOpen && currentStore) {
      setSelectedLocation(currentStore);
    }
  }, [isOpen, currentStore]);

  const fetchInventory = useCallback(async (queryStr: string, loc: string) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({
        action: 'search_inventory',
        q: queryStr.trim(),
        location: loc,
        limit: '40',
      });
      const res = await fetch(`/api/crm/dedup?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Failed to search inventory:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when opened or when location / quick filter changes
  useEffect(() => {
    if (!isOpen) return;
    const q = selectedQuickFilter === 'Semua' ? searchQuery : `${searchQuery} ${selectedQuickFilter}`.trim();
    const timer = setTimeout(() => {
      fetchInventory(q, selectedLocation);
    }, 250);
    return () => clearTimeout(timer);
  }, [isOpen, searchQuery, selectedLocation, selectedQuickFilter, fetchInventory]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Katalog &amp; Pencarian Inventory Bvlgari
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Cari barang dari database inventory (16.628+ item) untuk mengisi formulir secara otomatis
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Inputs & Store Filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                autoFocus
                placeholder="Cari nama barang, kode (AN85..), SAP code, atau koleksi (Serpenti, B.zero1)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all"
              >
                <option value="ALL">Semua Butik / Lokasi</option>
                {MASTER_DATA.stores.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Filter Cepat:
            </span>
            {QUICK_FILTERS.map(qf => (
              <button
                key={qf}
                type="button"
                onClick={() => setSelectedQuickFilter(qf)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all border',
                  selectedQuickFilter === qf
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                )}
              >
                {qf}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
              <p className="text-xs font-semibold text-slate-600">Mencari katalog &amp; stok inventory...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-slate-400 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700">Tidak Ada Barang Ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">
                {hasSearched
                  ? 'Coba gunakan kata kunci pencarian yang lebih umum atau ubah filter butik.'
                  : 'Ketik kata kunci untuk mulai mencari produk.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-1">
                <span>Ditemukan <strong>{items.length}</strong> produk</span>
                <span className="text-[11px] text-slate-400">Klik &quot;Pilih&quot; untuk mengisi form atau &quot;+ Tambah&quot; untuk langsung memasukkan ke tabel</span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Produk &amp; Deskripsi</th>
                      <th className="p-3">Kode / SAP</th>
                      <th className="p-3">Kategori &amp; Koleksi</th>
                      <th className="p-3">Lokasi / Stok</th>
                      <th className="p-3 text-right">Harga Retail</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const isStockAvailable = (item.qoh ?? 0) > 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 max-w-[240px]">
                            <p className="font-bold text-slate-900 leading-tight line-clamp-2" title={item.deskripsi}>
                              {item.deskripsi}
                            </p>
                            {item.source === 'inventory' && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded mt-1 border border-emerald-200">
                                Inventory Live
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono whitespace-nowrap">
                            <p className="font-bold text-slate-800">{item.item_code}</p>
                            {item.sap_code && item.sap_code !== item.item_code && (
                              <p className="text-[10px] text-slate-400">SAP: {item.sap_code}</p>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-800 block">{item.kategori}</span>
                            <span className="text-[10px] text-slate-400 block">{item.koleksi}</span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <p className="font-medium text-slate-700">{item.location || 'All Store'}</p>
                            {item.source === 'inventory' ? (
                              <span className={cn(
                                'text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5',
                                isStockAvailable
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              )}>
                                QOH: {item.qoh} unit
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Katalog Master</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-700 whitespace-nowrap">
                            Rp {item.harga.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectItem(item);
                                  onClose();
                                }}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                                title="Isi ke Formulir"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Pilih
                              </button>

                              {onDirectAddItem && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDirectAddItem(item);
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                                  title="Langsung Tambahkan ke Daftar Barang Diminati"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  + Tambah
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            Total sumber data: <strong>16.628+</strong> item dari <code>inventory_valuation</code> &amp; katalog master Bvlgari
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

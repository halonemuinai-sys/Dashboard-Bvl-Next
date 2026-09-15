"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, UserCheck, X, Database, Store, Phone, Mail, User,
  CheckCircle2, ExternalLink, Loader2, Sparkles, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DbCustomerItem } from '../masterData';

interface CustomerPickerComboboxProps {
  value: string;
  onChange: (val: string) => void;
  onSelectCustomer: (customer: DbCustomerItem) => void;
  onClearCustomer: () => void;
  selectedCustomer: DbCustomerItem | null;
  advisorsList?: string[];
}

export function CustomerPickerCombobox({
  value,
  onChange,
  onSelectCustomer,
  onClearCustomer,
  selectedCustomer,
}: CustomerPickerComboboxProps) {
  // Dropdown states
  const [isOpen, setIsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DbCustomerItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalStoreFilter, setModalStoreFilter] = useState('ALL');
  const [modalResults, setModalResults] = useState<DbCustomerItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const modalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search for inline combobox
  const executeSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/crm/dedup?action=search_customers&q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        setResults(data.customers);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Error searching customers:', err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    // If typing doesn't match selected customer name, clear selected customer flag
    if (selectedCustomer && val !== selectedCustomer.name) {
      onClearCustomer();
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(val);
      setIsOpen(true);
    }, 280);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal search execution
  const executeModalSearch = useCallback(async (query: string, store: string) => {
    setModalLoading(true);
    try {
      let url = `/api/crm/dedup?action=search_customers&q=${encodeURIComponent(query.trim())}`;
      if (store && store !== 'ALL') {
        url += `&store=${encodeURIComponent(store)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        setModalResults(data.customers);
      } else {
        setModalResults([]);
      }
    } catch (err) {
      console.error('Error in modal customer search:', err);
      setModalResults([]);
    } finally {
      setModalLoading(false);
    }
  }, []);

  // Open modal and fetch initial customers
  const openModal = () => {
    setIsModalOpen(true);
    const initialQuery = value && !selectedCustomer ? value : '';
    setModalSearch(initialQuery);
    executeModalSearch(initialQuery, modalStoreFilter);
  };

  // Handle modal search input change
  const handleModalSearchChange = (val: string) => {
    setModalSearch(val);
    if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
    modalTimeoutRef.current = setTimeout(() => {
      executeModalSearch(val, modalStoreFilter);
    }, 300);
  };

  const handleModalStoreChange = (store: string) => {
    setModalStoreFilter(store);
    executeModalSearch(modalSearch, store);
  };

  const selectFromDropdown = (cust: DbCustomerItem) => {
    onSelectCustomer(cust);
    setIsOpen(false);
  };

  const selectFromModal = (cust: DbCustomerItem) => {
    onSelectCustomer(cust);
    setIsModalOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[11px] font-bold text-slate-600 uppercase">
          Nama Pengunjung <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all shadow-xs"
          title="Cari dan pilih customer dari database CRM Profiling & Traffic"
        >
          <Database className="w-3 h-3 text-amber-600" />
          Pilih dari Database
        </button>
      </div>

      {/* Input Box */}
      <div className="relative">
        <input
          type="text"
          placeholder="Ketik nama customer atau cari database..."
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (value.trim().length >= 2 && results.length > 0) {
              setIsOpen(true);
            }
          }}
          className={cn(
            "w-full bg-slate-50 border rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-800 outline-none font-medium transition-all",
            selectedCustomer
              ? "border-emerald-400 bg-emerald-50/20 text-emerald-900 font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              : "border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          )}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          {searching ? (
            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
          ) : selectedCustomer ? (
            <UserCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              onClearCustomer();
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Selected Customer Feedback Card */}
      {selectedCustomer && (
        <div className="mt-1.5 p-2.5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-emerald-900 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-start sm:items-center gap-2 overflow-hidden">
            <span className="p-1 bg-emerald-200/80 rounded-lg text-emerald-800 shrink-0 mt-0.5 sm:mt-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </span>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-slate-900">{selectedCustomer.name}</span>
                {selectedCustomer.nickname && <span className="text-slate-500 font-medium">({selectedCustomer.nickname})</span>}
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                  Terhubung Database
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  ✓ Kolom otomatis terisi
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-600">
                {selectedCustomer.phone && <span className="font-mono font-medium">📱 {selectedCustomer.phone}</span>}
                {selectedCustomer.email && <span>✉️ {selectedCustomer.email}</span>}
                {selectedCustomer.advisor && <span>👤 SA: <strong className="text-slate-800">{selectedCustomer.advisor}</strong></span>}
                {selectedCustomer.store && <span>📍 <strong className="text-slate-800">{selectedCustomer.store}</strong></span>}
                {selectedCustomer.minatBarang && <span>💎 Minat: {selectedCustomer.minatBarang}</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearCustomer}
            className="text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shrink-0 self-end sm:self-center transition-all shadow-2xs"
            title="Lepas koneksi ke database dan edit manual"
          >
            Lepas / Edit Manual
          </button>
        </div>
      )}

      {/* Dropdown Floating Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Ditemukan {results.length} Pelanggan di Database
            </span>
            <span className="text-[10px] text-slate-400">Klik untuk auto-fill form</span>
          </div>
          {results.map((cust) => (
            <div
              key={`${cust.source}-${cust.id}`}
              onClick={() => selectFromDropdown(cust)}
              className="p-3 hover:bg-amber-50/60 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                    {cust.name}
                  </span>
                  {cust.nickname && (
                    <span className="text-[10px] text-slate-400">({cust.nickname})</span>
                  )}
                  <span
                    className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                      cust.source === 'CRM Profile'
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    )}
                  >
                    {cust.source}
                  </span>
                  {cust.status && (
                    <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                      {cust.status}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 font-medium">
                  {cust.phone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      {cust.phone}
                    </span>
                  )}
                  {cust.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5 text-slate-400" />
                      {cust.email}
                    </span>
                  )}
                  {cust.advisor && (
                    <span className="flex items-center gap-1">
                      <User className="w-2.5 h-2.5 text-slate-400" />
                      {cust.advisor}
                    </span>
                  )}
                  {cust.store && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Store className="w-2.5 h-2.5 text-slate-400" />
                      {cust.store}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 group-hover:bg-amber-600 group-hover:text-white rounded-lg transition-all"
              >
                Pilih
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Empty State when searching */}
      {isOpen && !searching && results.length === 0 && value.trim().length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 text-center animate-in fade-in duration-150">
          <p className="text-xs text-slate-700 font-semibold mb-1">
            Tidak ada customer &quot;{value}&quot; di database.
          </p>
          <p className="text-[11px] text-slate-400">
            Anda dapat terus mengetik dan menyimpan data ini sebagai pengunjung / prospect baru.
          </p>
        </div>
      )}

      {/* ── MODAL: PICK CUSTOMER FROM DATABASE ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-amber-50/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Pilih Pelanggan dari Database
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cari riwayat profil CRM atau data kunjungan traffic sebelumnya
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Filters & Search */}
            <div className="p-4 border-b border-slate-100 bg-white space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik nama customer, nomor HP, email, atau panggilan..."
                  value={modalSearch}
                  onChange={(e) => handleModalSearchChange(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-800 outline-none font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {modalSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalSearch('');
                      executeModalSearch('', modalStoreFilter);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Store Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Store:
                </span>
                {[
                  { id: 'ALL', label: 'Semua Store' },
                  { id: 'Plaza Indonesia', label: 'Plaza Indonesia' },
                  { id: 'Plaza Senayan', label: 'Plaza Senayan' },
                  { id: 'Bali', label: 'Bali' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleModalStoreChange(s.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all",
                      modalStoreFilter === s.id
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Results List */}
            <div className="overflow-y-auto p-4 space-y-2 flex-1 divide-y divide-slate-100">
              {modalLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                  <p className="text-xs font-medium">Mencari data pelanggan...</p>
                </div>
              ) : modalResults.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                  <User className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Tidak ada pelanggan yang cocok</p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Coba ubah kata kunci pencarian atau ganti filter store. Jika ini pengunjung baru, Anda dapat langsung mengetik namanya di form.
                  </p>
                </div>
              ) : (
                modalResults.map((cust) => (
                  <div
                    key={`${cust.source}-${cust.id}`}
                    className="pt-2 pb-2 first:pt-0 flex items-center justify-between gap-3 hover:bg-slate-50/80 p-2.5 rounded-xl transition-colors"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {cust.name}
                        </span>
                        {cust.nickname && (
                          <span className="text-[11px] text-slate-400 shrink-0">({cust.nickname})</span>
                        )}
                        <span
                          className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0",
                            cust.source === 'CRM Profile'
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          )}
                        >
                          {cust.source}
                        </span>
                        {cust.status && (
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md shrink-0">
                            {cust.status}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 font-medium">
                        {cust.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {cust.phone}
                          </span>
                        )}
                        {cust.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {cust.email}
                          </span>
                        )}
                        {cust.advisor && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <User className="w-3 h-3 text-slate-400" />
                            SA: <span className="font-semibold">{cust.advisor}</span>
                          </span>
                        )}
                        {cust.store && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Store className="w-3 h-3 text-slate-400" />
                            {cust.store}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectFromModal(cust)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all shadow-sm flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Pilih
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Menampilkan {modalResults.length} hasil</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

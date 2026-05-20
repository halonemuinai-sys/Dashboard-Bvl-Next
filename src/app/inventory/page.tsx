"use client";

import { useState, useEffect, useMemo } from 'react';
import { useUserAccess } from '@/lib/user-access-context';
import { inventoryService, LOCATION_MAPPING } from '@/services/inventoryService';
import { 
  Boxes, 
  Calendar as CalendarIcon, 
  RefreshCw, 
  FileDown, 
  Search, 
  ArrowLeft, 
  ShieldOff, 
  TrendingUp, 
  DollarSign, 
  Layers 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';

interface InventoryItem {
  id: number;
  snapshot_date: string;
  location_code: string;
  location_name: string;
  item_code: string;
  item_sku: string;
  item_name: string;
  description: string;
  item_price: number;
  item_cost: number;
  collection_code: string;
  main_category?: string;
  collection_name?: string;
  qoh: number;
  amount: number;
  created_at: string;
}

const PAGE_SIZE = 10;

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#6366f1'
];

const normalizeCat = (c: string) => {
  const cu = (c || '').split(',')[0].trim().toUpperCase();
  if (cu === 'JWL' || cu === 'JEWELRY') return 'Jewelry';
  if (cu === 'WTH' || cu === 'WATCHES') return 'Watches';
  if (cu === 'ACCS' || cu === 'ACCESSORIES') return 'Accessories';
  if (cu === 'PFM' || cu === 'PERFUME') return 'Perfume';
  return 'Other';
};

const formatRupiah = (v: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(v);
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 min-w-[200px]">
      <p className="text-xs font-black text-slate-800 mb-1.5 uppercase tracking-wide">
        {data.name}
      </p>
      <div className="flex justify-between items-center gap-4">
        <span className="text-[10px] text-slate-500 font-medium">Retail Value</span>
        <span className="text-xs font-black text-slate-900">{formatRupiah(data.value)}</span>
      </div>
      <div className="flex justify-between items-center gap-4 mt-1">
        <span className="text-[10px] text-slate-500 font-medium">Total Stok (QOH)</span>
        <span className="text-xs font-bold text-blue-600">{data.qoh.toLocaleString('id-ID')} Pcs</span>
      </div>
    </div>
  );
};

export default function InventoryPage() {
  const { role, canAccess, loading: accessLoading } = useUserAccess();

  // Filter & selections
  const [selectedLoc, setSelectedLoc] = useState('PI');
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [snapshotsList, setSnapshotsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [excludePerfume, setExcludePerfume] = useState(true);
  
  // Search & Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof InventoryItem>('item_sku');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Sync Modal
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncLoc, setSyncLoc] = useState('PI');
  const [syncDate, setSyncDate] = useState(() => {
    const today = new Date();
    // Default format YYYY-MM-DD
    return today.toISOString().split('T')[0];
  });
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Load available snapshot dates
  const loadSnapshots = async () => {
    const list = await inventoryService.getAvailableSnapshots();
    setSnapshotsList(list);
    if (list.length > 0 && !selectedSnapshot) {
      // Default to the latest snapshot
      setSelectedSnapshot(list[0]);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  // Fetch items when location or selected snapshot changes
  useEffect(() => {
    if (!selectedSnapshot) {
      setItems([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const res = await inventoryService.getInventoryValuation(selectedLoc, selectedSnapshot);
        if (res.success) {
          setItems(res.data as InventoryItem[]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedLoc, selectedSnapshot]);

  // Reset page on search or sort key changes
  useEffect(() => {
    setPage(1);
  }, [search, sortKey, sortDir]);

  // Derived filtered data
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = items;

    // Filter out PACK (packaging) items
    result = result.filter(item => {
      const collCode = (item.collection_code || '').split(',')[0].trim().toUpperCase();
      const mainCat = (item.main_category || '').toUpperCase();
      return collCode !== 'PACK' && mainCat !== 'PACK' && mainCat !== 'PACKAGING';
    });

    if (excludePerfume) {
      result = result.filter(item => {
        const cat = (item.main_category || normalizeCat(item.collection_code) || '').toLowerCase();
        return cat !== 'perfume' && cat !== 'pfm';
      });
    }

    if (!q) return result;
    return result.filter(item => 
      (item.item_sku && item.item_sku.toLowerCase().includes(q)) ||
      (item.item_code && item.item_code.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.collection_code && item.collection_code.toLowerCase().includes(q)) ||
      normalizeCat(item.collection_code).toLowerCase().includes(q) ||
      (item.main_category && item.main_category.toLowerCase().includes(q)) ||
      (item.collection_name && item.collection_name.toLowerCase().includes(q))
    );
  }, [items, search, excludePerfume]);

  // Sorted items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return sortDir === 'asc' 
        ? String(aVal).localeCompare(String(bVal)) 
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredItems, sortKey, sortDir]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    return sortedItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [sortedItems, page]);

  // Math aggregates
  const summaries = useMemo(() => {
    let totalItems = 0;
    let totalRetailValue = 0;
    let totalCostValue = 0;

    filteredItems.forEach(item => {
      totalItems += item.qoh;
      totalRetailValue += item.qoh * item.item_price;
      totalCostValue += item.qoh * item.item_cost;
    });

    const estGrossMargin = totalRetailValue - totalCostValue;
    const marginPct = totalRetailValue > 0 ? (estGrossMargin / totalRetailValue) * 100 : 0;

    return {
      totalItems,
      totalRetailValue,
      totalCostValue,
      estGrossMargin,
      marginPct
    };
  }, [filteredItems]);

  // Math aggregates per category
  const categorySummaries = useMemo(() => {
    let watchesQty = 0;
    let watchesVal = 0;
    let jewelryQty = 0;
    let jewelryVal = 0;
    let accsQty = 0;
    let accsVal = 0;

    filteredItems.forEach(item => {
      const cat = (item.main_category || normalizeCat(item.collection_code) || '').toLowerCase();
      const val = item.qoh * item.item_price;
      
      if (cat === 'watches') {
        watchesQty += item.qoh;
        watchesVal += val;
      } else if (cat === 'jewelry') {
        jewelryQty += item.qoh;
        jewelryVal += val;
      } else if (cat === 'accessories') {
        accsQty += item.qoh;
        accsVal += val;
      }
    });

    return {
      watches: { qty: watchesQty, value: watchesVal },
      jewelry: { qty: jewelryQty, value: jewelryVal },
      accessories: { qty: accsQty, value: accsVal }
    };
  }, [filteredItems]);

  // Recharts Collection data aggregation
  const collectionChartData = useMemo(() => {
    const collMap: Record<string, { name: string; value: number; qoh: number }> = {};
    
    filteredItems.forEach(item => {
      const categoryName = item.main_category || normalizeCat(item.collection_code);
      const retailVal = item.qoh * item.item_price;
 
      if (!collMap[categoryName]) {
        collMap[categoryName] = { name: categoryName, value: 0, qoh: 0 };
      }
      collMap[categoryName].value += retailVal;
      collMap[categoryName].qoh += item.qoh;
    });

    return Object.values(collMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Show top 10 collections
  }, [filteredItems]);

  const handleSort = (key: keyof InventoryItem) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleSyncSubmit = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);

    try {
      const result = await inventoryService.syncInventory(syncLoc, syncDate);
      if (result.success) {
        setSyncSuccess(true);
        // Refresh dropdowns and set the current active selection to the synced date
        await loadSnapshots();
        setSelectedSnapshot(syncDate);
        setSelectedLoc(syncLoc);
        setTimeout(() => {
          setShowSyncModal(false);
          setSyncSuccess(false);
        }, 1500);
      } else {
        setSyncError(result.error || 'Terjadi kesalahan saat sinkronisasi');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setSyncing(false);
    }
  };

  // Export to CSV with BOM formatting
  const handleExportExcel = () => {
    const headers = [
      'Location Name', 'Snapshot Date', 'Serial Number', 'SAP SKU Code', 
      'Description', 'Retail Price', 'QOH', 'Total Amount', 'Collection Code'
    ];

    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    const csvRows = sortedItems.map(item => [
      q(item.location_name),
      q(item.snapshot_date),
      q(item.item_code || ''),
      q(item.item_sku || ''),
      q(item.description || ''),
      item.item_price,
      item.qoh,
      item.amount,
      q(item.collection_code || '')
    ].join(','));

    const csvContent = '\ufeff' + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inventory_${selectedLoc}_${selectedSnapshot}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // formatRupiah helper moved to module level

  // Auth Protection Check
  if (accessLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Memuat izin akses...</p>
      </div>
    );
  }

  if (!canAccess('/inventory')) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 shadow-sm">
            <ShieldOff className="w-8 h-8 text-rose-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Akses Ditolak</h1>
            <p className="text-slate-500 text-sm mt-1">
              Halaman ini tidak tersedia untuk role{' '}
              <span className="font-semibold text-slate-700">{role || '-'}</span>.
            </p>
          </div>
          <Link href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
              <Boxes className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Valuation</h1>
          </div>
          <p className="text-slate-500 text-sm">Dashboard visualisasi stok bulanan per butik retail.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Location Select */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lokasi</span>
            <select 
              aria-label="Pilih lokasi butik" 
              value={selectedLoc} 
              onChange={e => setSelectedLoc(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
            >
              {Object.entries(LOCATION_MAPPING).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          {/* Snapshot Date Select */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <select 
              aria-label="Pilih tanggal snapshot" 
              value={selectedSnapshot} 
              onChange={e => setSelectedSnapshot(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
            >
              {snapshotsList.length === 0 ? (
                <option value="">(Belum ada data)</option>
              ) : (
                snapshotsList.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))
              )}
            </select>
          </div>

          {/* Exclude Perfume Toggle */}
          <label className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm cursor-pointer select-none hover:bg-slate-50 transition-colors">
            <input 
              type="checkbox" 
              checked={excludePerfume}
              onChange={e => setExcludePerfume(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">Tanpa Perfume</span>
          </label>

          {/* Sync Button */}
          <button 
            type="button" 
            onClick={() => {
              setSyncLoc(selectedLoc);
              setShowSyncModal(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Stock</span>
          </button>

          {/* Export Button */}
          <button 
            type="button" 
            onClick={handleExportExcel} 
            disabled={sortedItems.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <RefreshCw className={cn("w-5 h-5 text-blue-600", syncing && "animate-spin")} />
              <span>Sinkronisasi Stok Baru</span>
            </h3>
            <p className="text-slate-500 text-xs mb-5">
              Tarik data real-time inventory dari API Bvlgari dan simpan sebagai snapshot di database.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Lokasi</label>
                <select 
                  value={syncLoc} 
                  onChange={e => setSyncLoc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-semibold outline-none focus:border-blue-500"
                >
                  {Object.entries(LOCATION_MAPPING).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal Snapshot</label>
                <input 
                  type="date" 
                  value={syncDate} 
                  onChange={e => setSyncDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-semibold outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {syncError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium mb-4">
                {syncError}
              </div>
            )}

            {syncSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs font-medium mb-4">
                Sinkronisasi berhasil disimpan!
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button 
                type="button" 
                onClick={() => setShowSyncModal(false)}
                disabled={syncing}
                className="px-4 py-2 text-slate-500 hover:bg-slate-50 border border-transparent rounded-xl text-xs font-bold transition-all"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleSyncSubmit} 
                disabled={syncing}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
              >
                {syncing ? 'Menyinkronkan...' : 'Ya, Sync Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summaries KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Qty */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">TOTAL QTY (QOH)</span>
            <span className="text-2xl font-black text-slate-900 leading-none">
              {summaries.totalItems.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Pcs tersedia di butik</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50/50 text-blue-600">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Total Retail Value */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">TOTAL RETAIL VALUE</span>
            <span className="text-2xl font-black text-slate-900 leading-none">
              {formatRupiah(summaries.totalRetailValue)}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-1">Nilai jual teragregasi</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/50 text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Category Specific KPI Cards */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">STOK PER KATEGORI UTAMA</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Watches Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">WATCHES (JAM TANGAN)</span>
              <span className="text-2xl font-black text-slate-900 leading-none">
                {categorySummaries.watches.qty.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-400">Pcs</span>
              </span>
              <span className="text-xs text-slate-500 font-medium block mt-1">
                Value: <span className="font-bold text-slate-700">{formatRupiah(categorySummaries.watches.value)}</span>
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50/50 text-blue-600">
              <Boxes className="w-6 h-6" />
            </div>
          </div>

          {/* Jewelry Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">JEWELRY (PERHIASAN)</span>
              <span className="text-2xl font-black text-slate-900 leading-none">
                {categorySummaries.jewelry.qty.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-400">Pcs</span>
              </span>
              <span className="text-xs text-slate-500 font-medium block mt-1">
                Value: <span className="font-bold text-slate-700">{formatRupiah(categorySummaries.jewelry.value)}</span>
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/50 text-emerald-600">
              <Boxes className="w-6 h-6" />
            </div>
          </div>

          {/* Accessories Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-300 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">ACCESSORIES (AKSESORIS)</span>
              <span className="text-2xl font-black text-slate-900 leading-none">
                {categorySummaries.accessories.qty.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-400">Pcs</span>
              </span>
              <span className="text-xs text-slate-500 font-medium block mt-1">
                Value: <span className="font-bold text-slate-700">{formatRupiah(categorySummaries.accessories.value)}</span>
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/50 text-amber-600">
              <Boxes className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* Chart Section */}
      {collectionChartData.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Retail Value per Kategori Utama</h3>
            <p className="text-slate-400 text-[11px]">Komposisi nilai stock butik disaring berdasarkan Kategori Utama.</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={collectionChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickFormatter={(val) => `Rp ${(val / 1000000).toLocaleString('id-ID')}M`} 
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={30}>
                  {collectionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data Table and Search */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Search filter bar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input 
              type="text" 
              placeholder="Cari Serial No, SAP Code, atau Deskripsi..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="text-slate-400 text-xs font-medium">
            Menampilkan <span className="font-bold text-slate-700">{filteredItems.length}</span> dari <span className="font-bold text-slate-700">{items.length}</span> item.
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30 text-slate-400 text-[10px] font-bold tracking-wider uppercase select-none">
                <th className="p-4 cursor-pointer hover:bg-slate-50" onClick={() => handleSort('item_code')}>
                  Serial Number (Item Code) {sortKey === 'item_code' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-50" onClick={() => handleSort('item_sku')}>
                  SAP Code (Sku) {sortKey === 'item_sku' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-50" onClick={() => handleSort('description')}>
                  Description {sortKey === 'description' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-50 text-right" onClick={() => handleSort('item_price')}>
                  Retail Price {sortKey === 'item_price' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('qoh')}>
                  QOH {sortKey === 'qoh' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-50 text-right" onClick={() => handleSort('amount')}>
                  Total Amount {sortKey === 'amount' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                 <th className="p-4 cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('collection_code')}>
                  Category / Collection {sortKey === 'collection_code' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                    <span className="text-slate-400 font-medium animate-pulse">Memuat detail stock...</span>
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    Tidak ada data stok tersedia. Silakan klik tombol <strong>Sync Stock</strong> untuk memperbarui data bulan ini.
                  </td>
                </tr>
              ) : (
                pagedItems.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">{item.item_code}</td>
                    <td className="p-4 font-mono text-slate-500">{item.item_sku}</td>
                    <td className="p-4 font-medium text-slate-700">{item.description || item.item_name}</td>
                    <td className="p-4 text-right font-semibold text-slate-700">{formatRupiah(item.item_price)}</td>
                    <td className="p-4 text-center font-bold text-slate-900 bg-slate-50/20">{item.qoh}</td>
                    <td className="p-4 text-right font-bold text-blue-600">{formatRupiah(item.amount)}</td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 uppercase border border-blue-100">
                          {item.main_category || normalizeCat(item.collection_code)}
                        </span>
                        {(item.collection_name || (item.collection_code && item.collection_code.split(',').slice(-1)[0])) && (
                          <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-wider">
                            {item.collection_name || item.collection_code.split(',').slice(-1)[0]}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <button 
              type="button" 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Previous
            </button>
            <span className="text-xs text-slate-400 font-medium">
              Page <span className="font-bold text-slate-700">{page}</span> of <span className="font-bold text-slate-700">{totalPages}</span>
            </span>
            <button 
              type="button" 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Next
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

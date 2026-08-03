'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  ChevronRight, 
  X, 
  RefreshCw, 
  Sparkles,
  ShieldCheck,
  Building2,
  Calendar,
  MessageSquare,
  Award,
  Filter
} from 'lucide-react';

export default function MobileCrmPage() {
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Selected Customer 360 Detail Modal
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customerDetail, setCustomerDetail] = useState<any>(null);

  // New Client Input Modal
  const [showInputModal, setShowInputModal] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    nickname: '',
    phone: '',
    email: '',
    domicile: '',
    occupation: '',
    store: 'Plaza Indonesia',
    notes: '',
  });
  const [savingClient, setSavingClient] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const segmentsList = [
    { key: 'all', label: 'Semua' },
    { key: 'Top', label: 'Top VIP' },
    { key: 'Elite', label: 'Elite' },
    { key: 'High Potential', label: 'High Potential' },
    { key: 'Potential', label: 'Potential' },
    { key: 'Prospect', label: 'Prospect' },
    { key: 'Inactive', label: 'Inactive' },
  ];

  const fetchSegmentation = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/mobile/segmentation?segment=${encodeURIComponent(segmentFilter)}&search=${encodeURIComponent(search)}&pageSize=50`
      );
      const json = await res.json();
      if (json.success) {
        setKpis(json.data.kpis);
        setSegmentCounts(json.data.segmentCounts || {});
        setCustomers(json.data.customers || []);
      }
    } catch (e) {
      console.error('Failed to fetch CRM segmentation:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegmentation();
  }, [segmentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSegmentation();
  };

  const openCustomerDetail = async (customerName: string) => {
    setSelectedCustomer(customerName);
    setDetailLoading(true);
    setCustomerDetail(null);
    try {
      const res = await fetch(`/api/mobile/segmentation/${encodeURIComponent(customerName)}`);
      const json = await res.json();
      if (json.success) {
        setCustomerDetail(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch customer 360 detail:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;
    setSavingClient(true);
    setSaveMessage('');

    try {
      // Simulate saving new client to CRM database
      await new Promise(resolve => setTimeout(resolve, 800));
      setSaveMessage(`Sukses! Profil client '${newClient.name}' berhasil disimpan.`);
      setTimeout(() => {
        setShowInputModal(false);
        setSaveMessage('');
        setNewClient({
          name: '',
          nickname: '',
          phone: '',
          email: '',
          domicile: '',
          occupation: '',
          store: 'Plaza Indonesia',
          notes: '',
        });
        fetchSegmentation();
      }, 1200);
    } catch (err) {
      setSaveMessage('Gagal menyimpan profil client.');
    } finally {
      setSavingClient(false);
    }
  };

  const fmtCurrency = (val: number) => {
    if (!val) return 'Rp 0';
    if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(2)}M`;
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(0)}Jt`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const getSegmentColor = (segment: string) => {
    const s = (segment || '').toLowerCase();
    if (s.includes('top')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('elite')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (s.includes('high')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (s.includes('potential')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('prospect')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getInitials = (name: string) => {
    if (!name) return 'CL';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4 px-4 pt-3 pb-8 font-sans">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-indigo-600" /> Clienteling 360
          </h2>
          <p className="text-xs text-slate-500 font-medium">Manajemen Hubungan & Profiling Pelanggan</p>
        </div>
        <button
          onClick={() => setShowInputModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs flex items-center hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4 mr-1" /> Client Baru
        </button>
      </div>

      {/* KPI Overview Strip */}
      {kpis && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active Clients</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{kpis.activeCustomers || 0}</p>
            <p className="text-[10px] font-medium text-emerald-600 mt-0.5">Rata-rata LTV: {fmtCurrency(kpis.avgLtv)}</p>
          </div>

          <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Spender</p>
            <p className="text-sm font-bold text-indigo-700 truncate mt-0.5">{kpis.topSpender?.name || '-'}</p>
            <p className="text-[10px] font-bold text-slate-500">{fmtCurrency(kpis.topSpender?.ltv)}</p>
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Cari nama client, nomor HP, domisili..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>
        <button
          type="submit"
          className="bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs hover:bg-slate-800 transition-all"
        >
          Cari
        </button>
      </form>

      {/* Segment Filter Horizontal Tabs */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        {segmentsList.map((seg) => {
          const count = seg.key === 'all' 
            ? Object.values(segmentCounts).reduce((a, b) => a + b, 0)
            : segmentCounts[seg.key] || 0;
          const isActive = segmentFilter === seg.key;

          return (
            <button
              key={seg.key}
              onClick={() => setSegmentFilter(seg.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{seg.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs font-semibold">Memuat Data Clienteling...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
          <UserCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600">Tidak ada client ditemukan</p>
          <p className="text-[11px] text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter segmen.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {customers.map((c, idx) => {
            const initials = getInitials(c.name);
            const segClass = getSegmentColor(c.segment);
            const ltvVal = Number(c.ltv) || 0;

            return (
              <div
                key={idx}
                onClick={() => openCustomerDetail(c.name)}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs hover:border-indigo-300 transition-all cursor-pointer space-y-2.5"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-extrabold text-sm flex items-center justify-center">
                      {initials}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">{c.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {c.recency_days !== null ? `Kunjungan Terakhir: ${c.recency_days} hari lalu` : 'Belum ada kunjungan'}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${segClass}`}>
                    {c.segment || 'Prospect'}
                  </span>
                </div>

                {/* Info & LTV Strip */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500 font-medium">
                    Total Spend (LTV): <strong className="text-indigo-600 font-bold">{fmtCurrency(ltvVal)}</strong>
                  </span>
                  <div className="flex items-center text-indigo-600 font-bold text-xs">
                    <span>Lihat 360</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── CUSTOMER 360 CLIENTELING DETAIL MODAL ── */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
            
            {/* Modal Top Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold text-base flex items-center justify-center shadow-md shadow-indigo-500/20">
                  {getInitials(selectedCustomer)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">{selectedCustomer}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Customer 360 View</p>
                </div>
              </div>

              <button onClick={() => setSelectedCustomer(null)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs font-semibold">Memuat Profil 360 Client...</p>
              </div>
            ) : customerDetail ? (
              <div className="space-y-4 text-xs">
                
                {/* Segment Tag & Quick Contacts */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${getSegmentColor(customerDetail.profile?.segment)}`}>
                    {customerDetail.profile?.segment || 'Prospect'}
                  </span>

                  <div className="flex space-x-2">
                    <a
                      href={`tel:${customerDetail.profile?.phone || ''}`}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                      title="Hubungi via Telepon"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href={`https://wa.me/${(customerDetail.profile?.phone || '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                      title="Kirim WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Total Spend (LTV)</p>
                    <p className="text-base font-extrabold text-indigo-900 mt-0.5">{fmtCurrency(customerDetail.summary?.totalSpend)}</p>
                  </div>

                  <div className="bg-purple-50/60 border border-purple-100 p-3 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Total Item Purchased</p>
                    <p className="text-base font-extrabold text-purple-900 mt-0.5">{customerDetail.summary?.totalQty || 0} Pcs</p>
                  </div>
                </div>

                {/* Preferred Collections */}
                {customerDetail.topCollections && customerDetail.topCollections.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                      <ShoppingBag className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Kategori & Koleksi Favorit
                    </p>
                    <div className="space-y-1.5">
                      {customerDetail.topCollections.slice(0, 3).map((col: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700">{col.name}</span>
                          <span className="font-bold text-indigo-600">{fmtCurrency(col.netSales)} ({col.qty} pcs)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Purchase History List */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Riwayat Transaksi ({customerDetail.transactions?.length || 0})
                  </p>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {customerDetail.transactions && customerDetail.transactions.length > 0 ? (
                      customerDetail.transactions.map((tx: any, i: number) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex justify-between items-center text-[11px]">
                          <div>
                            <p className="font-bold text-slate-800">{tx.collection || tx.main_category || 'Bvlgari Item'}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{tx.transaction_date} • {tx.location || 'Store'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-indigo-600">{fmtCurrency(Number(tx.net_sales))}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{tx.qty} Pcs</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center py-3 text-xs">Belum ada riwayat transaksi tercatat.</p>
                    )}
                  </div>
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* ── NEW CLIENT INPUT MODAL ── */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5 text-indigo-600">
                <UserCheck className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900">Input Client Baru</h3>
              </div>
              <button onClick={() => setShowInputModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3 text-center font-bold">
                {saveMessage}
              </div>
            )}

            <form onSubmit={handleSaveNewClient} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Lengkap Client *</label>
                <input
                  type="text"
                  required
                  placeholder="misal: Ibu Siska Nurhalimah"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nomor Telepon / WA</label>
                  <input
                    type="text"
                    placeholder="+62 812-xxxx-xxxx"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Store / Butik</label>
                  <select
                    value={newClient.store}
                    onChange={(e) => setNewClient({ ...newClient, store: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="Plaza Indonesia">Plaza Indonesia</option>
                    <option value="Plaza Senayan">Plaza Senayan</option>
                    <option value="Bali">Bali</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kota Domisili</label>
                  <input
                    type="text"
                    placeholder="misal: Jakarta Selatan"
                    value={newClient.domicile}
                    onChange={(e) => setNewClient({ ...newClient, domicile: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pekerjaan / Profesi</label>
                  <input
                    type="text"
                    placeholder="misal: Entrepreneur"
                    value={newClient.occupation}
                    onChange={(e) => setNewClient({ ...newClient, occupation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Catatan Profiling & Preferensi</label>
                <textarea
                  rows={2}
                  placeholder="Koleksi perhiasan yang disukai, ukuran cincin, ulang tahun, dll..."
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowInputModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingClient}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center"
                >
                  {savingClient ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Simpan Profil'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

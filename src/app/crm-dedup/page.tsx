"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Trash2,
  Merge,
  ArrowRight,
  UserPlus,
  Phone,
  Mail,
  User,
  Store,
  Layers,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BvlgariLoader from '@/components/BvlgariLoader';

interface ProfileItem {
  id: number;
  nama_lengkap: string;
  no_hp: string;
  email: string;
  customer_advisor: string;
  lokasi_store: string;
  tanggal_input?: string;
  similarityScore?: number;
}

interface DuplicateGroup {
  phoneKey?: string;
  emailKey?: string;
  count: number;
  items: ProfileItem[];
}

export default function CrmDedupPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'check' | 'traffic'>('audit');
  const [loading, setLoading] = useState(true);

  // Audit State
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [duplicatePhones, setDuplicatePhones] = useState<DuplicateGroup[]>([]);
  const [duplicateEmails, setDuplicateEmails] = useState<DuplicateGroup[]>([]);
  const [trafficRows, setTrafficRows] = useState<any[]>([]);

  // Form Live Checker State
  const [inputName, setInputName] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputStore, setInputStore] = useState('Pacific Intermark');
  const [inputCA, setInputCA] = useState('');

  const [checkLoading, setCheckLoading] = useState(false);
  const [exactPhoneMatches, setExactPhoneMatches] = useState<ProfileItem[]>([]);
  const [exactEmailMatches, setExactEmailMatches] = useState<ProfileItem[]>([]);
  const [fuzzyMatches, setFuzzyMatches] = useState<ProfileItem[]>([]);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Merge State
  const [mergingId, setMergingId] = useState<number | null>(null);

  const fetchAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/dedup?action=audit');
      const data = await res.json();
      if (data.success) {
        setTotalProfiles(data.totalProfiles || 0);
        setDuplicatePhones(data.duplicatePhoneGroups || []);
        setDuplicateEmails(data.duplicateEmailGroups || []);
        setTrafficRows(data.trafficRows || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // Handle Real-time Check
  const runCheck = useCallback(async () => {
    if (!inputPhone && !inputEmail && !inputName) {
      setExactPhoneMatches([]);
      setExactEmailMatches([]);
      setFuzzyMatches([]);
      return;
    }
    setCheckLoading(true);
    try {
      const queryParams = new URLSearchParams({
        action: 'check',
        phone: inputPhone,
        email: inputEmail,
        query: inputName,
      });
      const res = await fetch(`/api/crm/dedup?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setExactPhoneMatches(data.exactPhoneMatches || []);
        setExactEmailMatches(data.exactEmailMatches || []);
        setFuzzyMatches(data.fuzzyNameMatches || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckLoading(false);
    }
  }, [inputPhone, inputEmail, inputName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runCheck();
    }, 400);
    return () => clearTimeout(timer);
  }, [inputPhone, inputEmail, inputName, runCheck]);

  // Execute Merge
  const handleMerge = async (primary: ProfileItem, secondaries: ProfileItem[]) => {
    if (!confirm(`Gabungkan data duplikat ini? Profil #${primary.id} (${primary.nama_lengkap}) akan disimpan sebagai data utama.`)) return;

    setMergingId(primary.id);
    try {
      const res = await fetch('/api/crm/dedup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'merge',
          primaryId: primary.id,
          secondaryIds: secondaries.map((s) => s.id),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchAuditData();
      } else {
        alert('Gagal mengabungkan: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setMergingId(null);
    }
  };

  // Submit Clean Profile
  const handleCreateProfile = async () => {
    if (!inputName || !inputPhone) {
      setSubmitMessage({ type: 'error', text: 'Nama Lengkap dan No. HP wajib diisi!' });
      return;
    }
    setCheckLoading(true);
    setSubmitMessage(null);
    try {
      const res = await fetch('/api/crm/dedup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          profileData: {
            nama_lengkap: inputName,
            no_hp: inputPhone,
            email: inputEmail,
            lokasi_store: inputStore,
            customer_advisor: inputCA || 'System SA',
            tanggal_input: new Date().toISOString().split('T')[0],
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitMessage({ type: 'success', text: 'Profil baru berhasil dibuat tanpa duplikasi!' });
        setInputName('');
        setInputPhone('');
        setInputEmail('');
        setInputCA('');
        fetchAuditData();
      } else {
        setSubmitMessage({ type: 'error', text: 'Gagal membuat profil: ' + data.error });
      }
    } catch (e: any) {
      setSubmitMessage({ type: 'error', text: 'Error: ' + e.message });
    } finally {
      setCheckLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <BvlgariLoader />
      </div>
    );
  }

  const isExactDuplicate = exactPhoneMatches.length > 0 || exactEmailMatches.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">CRM Deduplikasi & Traffic Matcher</h1>
          </div>
          <p className="text-xs text-slate-500">
            Sistem pintar pencegahan duplikasi data profiling pelanggan &amp; pemetaan prospek walk-in.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAuditData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          Refresh Data Audit
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 border-l-4 border-l-blue-600 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Profiling</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalProfiles.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pelanggan tersimpan di CRM</p>
        </div>

        <div className="bg-white border border-slate-200 border-l-4 border-l-amber-500 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duplikat No HP</span>
            <Phone className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{duplicatePhones.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Grup nomor HP ganda</p>
        </div>

        <div className="bg-white border border-slate-200 border-l-4 border-l-violet-500 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duplikat Email</span>
            <Mail className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-2xl font-black text-violet-600 mt-2">{duplicateEmails.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Grup email ganda</p>
        </div>

        <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prospect Traffic</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{trafficRows.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Kunjungan toko terbaru</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={cn(
            'flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all',
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Merge className="w-4 h-4" />
          Auditing &amp; Penggabungan Duplikat ({duplicatePhones.length + duplicateEmails.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('check')}
          className={cn(
            'flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all',
            activeTab === 'check'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Sparkles className="w-4 h-4" />
          Cek Real-Time &amp; Input Profil Baru
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('traffic')}
          className={cn(
            'flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all',
            activeTab === 'traffic'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <LinkIcon className="w-4 h-4" />
          Pemetaan Traffic &amp; Prospek
        </button>
      </div>

      {/* TAB 1: AUDITING & MERGING */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {duplicatePhones.length === 0 && duplicateEmails.length === 0 ? (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-emerald-900">Database Profiling Bersih dari Duplikasi Exact!</h3>
              <p className="text-xs text-emerald-600 mt-1 max-w-md mx-auto">
                Tidak ditemukan nomor HP atau Email ganda di database saat ini.
              </p>
            </div>
          ) : (
            <>
              {/* DUPLICATE PHONES SECTION */}
              {duplicatePhones.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-amber-500" />
                      Grup Duplikat Berdasarkan Nomor HP ({duplicatePhones.length})
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {duplicatePhones.map((group, gIdx) => (
                      <div key={gIdx} className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                            No. HP: {group.phoneKey} ({group.count} profil)
                          </span>
                          <span className="text-[11px] text-slate-400">Pilih 1 profil utama untuk dipertahankan</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.items.map((item, iIdx) => {
                            const secondaries = group.items.filter((s) => s.id !== item.id);
                            return (
                              <div
                                key={item.id}
                                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-blue-300 transition-all"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400">ID #{item.id}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                      {item.lokasi_store || 'No Store'}
                                    </span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-900">{item.nama_lengkap || 'Tanpa Nama'}</p>
                                  <div className="text-xs text-slate-500 space-y-1">
                                    <p className="flex items-center gap-1.5">
                                      <Phone className="w-3 h-3 text-slate-400" /> {item.no_hp || '—'}
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                      <User className="w-3 h-3 text-slate-400" /> CA: {item.customer_advisor || '—'}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={mergingId === item.id}
                                  onClick={() => handleMerge(item, secondaries)}
                                  className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                                >
                                  <Merge className="w-3.5 h-3.5" />
                                  Simpan Ini Sebagai Utama (Gabung {secondaries.length} Lainnya)
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DUPLICATE EMAILS SECTION */}
              {duplicateEmails.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-violet-500" />
                    Grup Duplikat Berdasarkan Email ({duplicateEmails.length})
                  </h3>

                  <div className="space-y-4">
                    {duplicateEmails.map((group, gIdx) => (
                      <div key={gIdx} className="bg-white border border-violet-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <span className="text-xs font-bold text-violet-800 bg-violet-50 px-3 py-1 rounded-full border border-violet-200">
                            Email: {group.emailKey} ({group.count} profil)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.items.map((item) => {
                            const secondaries = group.items.filter((s) => s.id !== item.id);
                            return (
                              <div
                                key={item.id}
                                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
                              >
                                <div className="space-y-2">
                                  <span className="text-[10px] font-black text-slate-400">ID #{item.id}</span>
                                  <p className="text-sm font-bold text-slate-900">{item.nama_lengkap}</p>
                                  <p className="text-xs text-slate-500">CA: {item.customer_advisor}</p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleMerge(item, secondaries)}
                                  className="mt-4 w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                                >
                                  <Merge className="w-3.5 h-3.5" />
                                  Simpan Ini Sebagai Utama
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: LIVE Anti-Duplicate Form Checker */}
      {activeTab === 'check' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Input */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Input Profil Baru (Deduplication Secured)
            </h3>
            <p className="text-xs text-slate-500">
              Ketikkan No HP atau Nama untuk melihat apakah profil pelanggan sudah terdaftar secara real-time.
            </p>

            {submitMessage && (
              <div
                className={cn(
                  'p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2',
                  submitMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                )}
              >
                {submitMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                {submitMessage.text}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nomor HP <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <User className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nama lengkap pelanggan..."
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Lokasi Store</label>
                  <select
                    value={inputStore}
                    onChange={(e) => setInputStore(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="Pacific Intermark">Pacific Intermark</option>
                    <option value="Pacific Superstore">Pacific Superstore</option>
                    <option value="Bali">Bali</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Advisor Name</label>
                  <input
                    type="text"
                    placeholder="Nama CA..."
                    value={inputCA}
                    onChange={(e) => setInputCA(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isExactDuplicate || checkLoading}
              onClick={handleCreateProfile}
              className={cn(
                'w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md mt-4',
                isExactDuplicate
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              <UserPlus className="w-4 h-4" />
              {isExactDuplicate ? 'Terdeteksi Duplikat — Pembuatan Terkunci' : 'Simpan Profil Bersih'}
            </button>
          </div>

          {/* Real-time Status Panel */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[380px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    Hasil Pengecekan Duplikasi Real-time
                  </h4>
                  {checkLoading && <span className="text-xs text-blue-600 animate-pulse font-bold">Mengecek database...</span>}
                </div>

                {!inputPhone && !inputName && !inputEmail ? (
                  <div className="py-16 text-center text-slate-400">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold">Ketik nomor HP atau nama di formulir sebelah kiri</p>
                    <p className="text-[11px] mt-1 text-slate-400">Sistem akan memverifikasi duplikasi secara otomatis.</p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    {/* EXACT MATCH WARNING */}
                    {isExactDuplicate && (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>DUPLIKAT PERSIS TERDETEKSI! Pelanggan ini sudah terdaftar.</span>
                        </div>

                        {[...exactPhoneMatches, ...exactEmailMatches].map((p) => (
                          <div key={p.id} className="bg-white border border-red-200 rounded-xl p-3 text-xs space-y-1">
                            <p className="font-bold text-slate-900">
                              {p.nama_lengkap} (ID #{p.id})
                            </p>
                            <p className="text-slate-500">HP: {p.no_hp} | Store: {p.lokasi_store}</p>
                            <p className="text-slate-500">Advisor Pemilik: {p.customer_advisor || '—'}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* FUZZY MATCH RECOMMENDATION */}
                    {!isExactDuplicate && fuzzyMatches.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Ditemukan {fuzzyMatches.length} nama mirip di database (Potential Duplicate):</span>
                        </div>

                        {fuzzyMatches.map((p) => (
                          <div key={p.id} className="bg-white border border-amber-200 rounded-xl p-3 text-xs flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-900">{p.nama_lengkap}</p>
                              <p className="text-slate-500">HP: {p.no_hp} | Advisor: {p.customer_advisor}</p>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                              {p.similarityScore}% Mirip
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CLEAN STATUS */}
                    {!isExactDuplicate && fuzzyMatches.length === 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-emerald-900">Data Aman &amp; Belum Pernah Terdaftar!</p>
                        <p className="text-[11px] text-emerald-600 mt-1">Anda dapat menekan tombol &quot;Simpan Profil Bersih&quot;.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRAFFIC LINKER */}
      {activeTab === 'traffic' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Integrasi Kunjungan Token &amp; Traffic (mirror_traffic)</h3>
              <p className="text-xs text-slate-500">Daftar kunjungan toko prospek walk-in dan pemetaan ke Profil CRM.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Nama Pelanggan</th>
                  <th className="p-3">Status Visit</th>
                  <th className="p-3">Served By</th>
                  <th className="p-3">Location</th>
                  <th className="p-3 text-right">Aksi Integrasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {trafficRows.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-medium text-slate-600">{r.tanggal_berkunjung || '—'}</td>
                    <td className="p-3 font-bold text-slate-900">{r.customer_name || 'Walk-in Guest'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px] border border-blue-200">
                        {r.status || 'Walk-in'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{r.served_by || '—'}</td>
                    <td className="p-3 text-slate-600">{r.location || '—'}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('check');
                          setInputName(r.customer_name || '');
                          setInputCA(r.served_by || '');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-[11px] font-bold transition-all"
                      >
                        <UserPlus className="w-3 h-3" />
                        Buat Profil CRM
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

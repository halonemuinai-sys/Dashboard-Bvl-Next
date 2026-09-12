"use client";

import { useState } from 'react';
import {
  Users, ShieldCheck, AlertTriangle, CheckCircle2, Search, RefreshCw, Merge,
  UserPlus, Phone, Mail, User, Store, Layers, Sparkles, Link as LinkIcon,
  Heart, UtensilsCrossed, AtSign, BadgeInfo, PlusCircle, Upload, Camera,
  Trash2, ShoppingBag, Plus, Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BvlgariLoader from '@/components/BvlgariLoader';
import { MASTER_DATA } from './masterData';
import { useCrmDedup } from './useCrmDedup';

export default function CrmDedupPage() {
  const [activeTab, setActiveTab] = useState<'check' | 'traffic' | 'audit'>('check');
  const crm = useCrmDedup();

  if (crm.loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <BvlgariLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">CRM &amp; Traffic</h1>
          </div>
          <p className="text-xs text-slate-500">
            Input profil pelanggan, catat kunjungan traffic, dan kelola data duplikasi.
          </p>
        </div>
        <button
          type="button"
          onClick={crm.fetchAuditData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          Refresh Data Audit
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 border-l-4 border-l-blue-600 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Profiling</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{crm.totalProfiles.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pelanggan tersimpan di CRM</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-amber-500 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duplikat No HP</span>
            <Phone className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{crm.duplicatePhones.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Grup nomor HP ganda</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-violet-500 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duplikat Email</span>
            <Mail className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-2xl font-black text-violet-600 mt-2">{crm.duplicateEmails.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Grup email ganda</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prospect Traffic</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{crm.trafficRows.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Kunjungan toko terbaru</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {([
          { key: 'check',   label: 'Form Profiling',      icon: <UserPlus className="w-4 h-4 text-blue-600" /> },
          { key: 'traffic', label: 'Traffic & Items',     icon: <PlusCircle className="w-4 h-4 text-emerald-600" /> },
          { key: 'audit',   label: 'Audit Duplikat',      icon: <Merge className="w-4 h-4 text-purple-600" />, badge: crm.duplicatePhones.length + crm.duplicateEmails.length },
        ] as const).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all',
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            )}
          >
            {tab.icon}
            {tab.label}
            {'badge' in tab && tab.badge > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 rounded-full border border-amber-200 ml-1">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: FORM PROFILING ── */}
      {activeTab === 'check' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {crm.submitMessage && (
              <div className={cn(
                'p-4 rounded-2xl text-xs font-bold flex items-center gap-2',
                crm.submitMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              )}>
                {crm.submitMessage.type === 'success'
                  ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  : <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />}
                {crm.submitMessage.text}
              </div>
            )}

            {/* 1. PRIMARY INFORMATION */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><User className="w-4 h-4" /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">1. PRIMARY INFORMATION</h3>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-20 h-20 bg-slate-200 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-300 shrink-0">
                  {crm.fotoCustomerUrl
                    ? <img src={crm.fotoCustomerUrl} alt="Foto Customer" className="w-full h-full object-cover" />
                    : <Camera className="w-8 h-8 text-slate-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Foto Customer</h4>
                  <p className="text-[11px] text-slate-500 mb-2">Upload foto profil customer</p>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    {crm.uploadingFoto ? 'Uploading...' : 'Pilih Foto'}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) crm.handleUploadImage(e.target.files[0], 'foto_customer'); }} />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Client Status</label>
                  <select value={crm.statusPelanggan} onChange={e => crm.setStatusPelanggan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold">
                    {MASTER_DATA.statusPelangganCRM.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Title</label>
                  <select value={crm.title} onChange={e => crm.setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold">
                    {MASTER_DATA.titles.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">First Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Nama depan..." value={crm.namaDepan} onChange={e => crm.setNamaDepan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Last Name</label>
                  <input type="text" placeholder="Nama belakang..." value={crm.namaBelakang} onChange={e => crm.setNamaBelakang(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Preferred Name</label>
                  <input type="text" placeholder="Nama panggilan..." value={crm.namaPanggilan} onChange={e => crm.setNamaPanggilan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
            </div>

            {/* 2. CONTACT DETAILS */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Phone className="w-4 h-4" /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">2. CONTACT DETAILS</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kewarganegaraan</label>
                  <select value={crm.kewarganegaraan} onChange={e => crm.setKewarganegaraan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {Object.keys(MASTER_DATA.phoneCodes).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nomor HP <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="081234567890" value={crm.noHp} onChange={e => crm.setNoHp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email</label>
                  <input type="email" placeholder="email@example.com" value={crm.email} onChange={e => crm.setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
            </div>

            {/* 3. IDENTITAS & DOMISILI */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-violet-50 text-violet-600 rounded-xl"><BadgeInfo className="w-4 h-4" /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">3. IDENTITAS &amp; DOMISILI</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">No. KTP / Passport</label>
                  <input type="text" placeholder="NIK / Passport..." value={crm.ktpPassport} onChange={e => crm.setKtpPassport(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tanggal Lahir</label>
                  <input type="date" value={crm.tglLahir} onChange={e => crm.setTglLahir(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kategori Umur</label>
                  <select value={crm.umur} onChange={e => crm.setUmur(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Umur...</option>
                    {MASTER_DATA.umurOptions.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-violet-50/50 border border-violet-100 rounded-2xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Pernikahan</label>
                  <select value={crm.pernikahan} onChange={e => crm.setPernikahan(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.statusPernikahan.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {crm.pernikahan === 'Kawin' && (
                  <div>
                    <label className="block text-[11px] font-bold text-violet-700 uppercase mb-1">Tanggal Pernikahan</label>
                    <input type="date" value={crm.tglPernikahan} onChange={e => crm.setTglPernikahan(e.target.value)}
                      className="w-full bg-white border border-violet-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Memiliki Anak?</label>
                  <select value={crm.memilikiAnak} onChange={e => crm.setMemilikiAnak(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.memilikiAnak.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                {crm.memilikiAnak === 'YA' && (
                  <div>
                    <label className="block text-[11px] font-bold text-violet-700 uppercase mb-1">Jumlah Anak</label>
                    <select value={crm.jumlahAnak} onChange={e => crm.setJumlahAnak(e.target.value)}
                      className="w-full bg-white border border-violet-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                      {MASTER_DATA.jumlahAnak.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Tipe Domisili</label>
                <div className="flex items-center gap-4">
                  {(['Dalam Negeri', 'Luar Negeri'] as const).map(type => (
                    <label key={type} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input type="radio" name="domType" checked={crm.domisiliType === type} onChange={() => crm.setDomisiliType(type)} />
                      {type === 'Dalam Negeri' ? 'Dalam Negeri (Indonesia)' : 'Luar Negeri (International)'}
                    </label>
                  ))}
                </div>
                {crm.domisiliType === 'Dalam Negeri' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Provinsi Domisili</label>
                    <select value={crm.domisiliProvinsi} onChange={e => crm.setDomisiliProvinsi(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                      <option value="">Pilih Provinsi...</option>
                      {MASTER_DATA.provinsi.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Negara / Kota Domisili</label>
                    <input type="text" placeholder="e.g. Singapore, London..." value={crm.domisiliLuarNegeri} onChange={e => crm.setDomisiliLuarNegeri(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Etnis</label>
                  <select value={crm.etnis} onChange={e => crm.setEtnis(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Etnis...</option>
                    {MASTER_DATA.etnis.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Agama</label>
                  <input type="text" placeholder="Agama..." value={crm.agama} onChange={e => crm.setAgama(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Pekerjaan</label>
                  <select value={crm.pekerjaan} onChange={e => crm.setPekerjaan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Pekerjaan...</option>
                    {MASTER_DATA.pekerjaan.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. LIFESTYLE & HOBBY */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-pink-50 text-pink-600 rounded-xl"><Heart className="w-4 h-4" /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">4. LIFESTYLE &amp; HOBBY</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Fashion Style</label>
                  <select value={crm.fashionStyle} onChange={e => crm.setFashionStyle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Style...</option>
                    {MASTER_DATA.fashionStyle.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kategori Hobby</label>
                  <select value={crm.hobbyKat} onChange={e => { crm.setHobbyKat(e.target.value); crm.setHobbySub(''); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Kategori...</option>
                    {Object.keys(MASTER_DATA.hobiKategori).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Sub Hobby</label>
                  <select value={crm.hobbySub} onChange={e => crm.setHobbySub(e.target.value)} disabled={!crm.hobbyKat}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium disabled:opacity-40">
                    <option value="">Pilih Sub Hobby...</option>
                    {(MASTER_DATA.hobiKategori[crm.hobbyKat] || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {(crm.hobbyKat === 'Others' || crm.hobbySub === 'Others') && (
                <div className="p-3 bg-pink-50 border border-pink-200 rounded-2xl">
                  <label className="block text-[11px] font-bold text-pink-800 uppercase mb-1">Hobby Lainnya</label>
                  <input type="text" placeholder="Tuliskan hobi khusus..." value={crm.hobbyOthers} onChange={e => crm.setHobbyOthers(e.target.value)}
                    className="w-full bg-white border border-pink-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Warna Favorit</label>
                  <select value={crm.warnaFavorit} onChange={e => crm.setWarnaFavorit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Warna...</option>
                    {MASTER_DATA.warnaFavorit.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tempat Liburan Favorit</label>
                  <input type="text" placeholder="Paris, Bali, Tokyo..." value={crm.liburanFavorit} onChange={e => crm.setLiburanFavorit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Topik Pembicaraan Favorit</label>
                  <input type="text" placeholder="Art, Watch, Business..." value={crm.topikPembicaraan} onChange={e => crm.setTopikPembicaraan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
            </div>

            {/* 5. KULINER & ALERGI */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><UtensilsCrossed className="w-4 h-4" /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">5. KULINER &amp; ALERGI</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Makanan Favorit', val: crm.makananFavorit, set: crm.setMakananFavorit, ph: 'Italian, Japanese...' },
                  { label: 'Minuman Favorit', val: crm.minumanFavorit, set: crm.setMinumanFavorit, ph: 'Wine, Champagne, Coffee...' },
                  { label: 'Cake Favorit',    val: crm.cakeFavorit,    set: crm.setCakeFavorit,    ph: 'Chocolate, Cheese Cake...' },
                  { label: 'Alergi Makanan',  val: crm.alergiMakanan,  set: crm.setAlergiMakanan,  ph: 'Nuts, Seafood...' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">{f.label}</label>
                    <input type="text" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                  </div>
                ))}
              </div>
            </div>

            {/* 6. SOCIAL MEDIA & INSIGHTS */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><AtSign className="w-4 h-4" /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">6. SOCIAL MEDIA &amp; INSIGHTS</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Instagram</label>
                  <input type="text" placeholder="@username" value={crm.instagram} onChange={e => crm.setInstagram(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">TikTok</label>
                  <input type="text" placeholder="@username" value={crm.tiktok} onChange={e => crm.setTiktok(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Faktor Pemicu Pembelian</label>
                  <select value={crm.pemicu} onChange={e => crm.setPemicu(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Pemicu...</option>
                    {MASTER_DATA.pemicuBeli.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Barang Antusias</label>
                  <select value={crm.antusias} onChange={e => crm.setAntusias(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Kategori...</option>
                    {MASTER_DATA.barangAntusias.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Karakter Pelanggan</label>
                  <select value={crm.karakter} onChange={e => crm.setKarakter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Karakter...</option>
                    {MASTER_DATA.karakter.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Lokasi Store</label>
                  <select value={crm.lokasiStore} onChange={e => crm.setLokasiStore(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold">
                    {MASTER_DATA.stores.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Customer Advisor</label>
                  <select value={crm.customerAdvisor} onChange={e => crm.setCustomerAdvisor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Customer Advisor...</option>
                    {crm.advisorsList.map(adv => <option key={adv} value={adv}>{adv}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Catatan Tambahan</label>
                <textarea rows={3} placeholder="Catatan profil pelanggan..." value={crm.notes} onChange={e => crm.setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none font-medium" />
              </div>
            </div>

            <button type="button" disabled={crm.isExactDuplicate || crm.checkLoading} onClick={crm.handleCreateProfile}
              className={cn(
                'w-full py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg',
                crm.isExactDuplicate
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}>
              <UserPlus className="w-5 h-5" />
              {crm.isExactDuplicate ? 'Terdeteksi Duplikat — Pembuatan Terkunci' : 'Simpan Profil Pelanggan Baru'}
            </button>
          </div>

          {/* Live Dedup Monitor */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Live Deduplication Monitor
                </h4>
                {crm.checkLoading && <span className="text-[10px] text-blue-600 animate-pulse font-bold">Checking...</span>}
              </div>
              <div className="text-xs space-y-2">
                <p className="text-slate-500"><span className="font-bold text-slate-700">Nama Input:</span> {crm.fullName || '—'}</p>
                <p className="text-slate-500"><span className="font-bold text-slate-700">HP Input:</span> {crm.noHp || '—'}</p>
              </div>
              {!crm.noHp && !crm.fullName && !crm.email ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl p-4">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">Mulai mengetik Nama / No. HP</p>
                  <p className="text-[11px] mt-1">Sistem akan memeriksa database secara otomatis.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {crm.isExactDuplicate && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        DUPLIKAT PERSIS TERDETEKSI!
                      </div>
                      <p className="text-[11px] text-red-600">Pelanggan dengan nomor HP / Email ini sudah ada di database.</p>
                      {[...crm.exactPhoneMatches, ...crm.exactEmailMatches].map(p => (
                        <div key={p.id} className="bg-white border border-red-200 rounded-xl p-3 text-xs space-y-1">
                          <p className="font-bold text-slate-900">{p.nama_lengkap} (ID #{p.id})</p>
                          <p className="text-slate-500">HP: {p.no_hp} | Store: {p.lokasi_store}</p>
                          <p className="text-slate-500">CA: {p.customer_advisor || '—'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {!crm.isExactDuplicate && crm.fuzzyMatches.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {crm.fuzzyMatches.length} Profil Mirip Ditemukan:
                      </div>
                      {crm.fuzzyMatches.map(p => (
                        <div key={p.id} className="bg-white border border-amber-200 rounded-xl p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900">{p.nama_lengkap}</p>
                            <span className="text-[9px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">{p.similarityScore}% Mirip</span>
                          </div>
                          <p className="text-slate-500">HP: {p.no_hp} | CA: {p.customer_advisor}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {!crm.isExactDuplicate && crm.fuzzyMatches.length === 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-emerald-900">Data Bersih &amp; Belum Ada di CRM!</p>
                      <p className="text-[11px] text-emerald-600 mt-1">Anda aman untuk menekan tombol Simpan.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: TRAFFIC & ITEMS ── */}
      {activeTab === 'traffic' && (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><PlusCircle className="w-5 h-5" /></div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Form Catat Prospect Traffic &amp; Items</h3>
                <p className="text-xs text-slate-500">Formulir kunjungan toko dengan bukti CDN &amp; tabel barang diminati multi-row.</p>
              </div>
            </div>
            {crm.trMessage && (
              <div className={cn('p-4 rounded-2xl text-xs font-bold flex items-center gap-2',
                crm.trMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200')}>
                {crm.trMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                {crm.trMessage.text}
              </div>
            )}

            {/* A. Informasi Pelanggan */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">A. INFORMASI PELANGGAN &amp; KUNJUNGAN</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tanggal Kunjungan</label>
                  <input type="date" value={crm.trTanggal} onChange={e => crm.setTrTanggal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama Pengunjung <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Nama lengkap..." value={crm.trCustomerName} onChange={e => crm.setTrCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama Panggilan</label>
                  <input type="text" placeholder="Nama panggilan..." value={crm.trNamaPanggilan} onChange={e => crm.setTrNamaPanggilan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nomor HP</label>
                  <input type="text" placeholder="081234567890" value={crm.trNoHp} onChange={e => crm.setTrNoHp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email</label>
                  <input type="email" placeholder="email@example.com" value={crm.trEmail} onChange={e => crm.setTrEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Pelanggan</label>
                  <select value={crm.trStatusPelanggan} onChange={e => crm.setTrStatusPelanggan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.statusPelangganTraffic.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Visit</label>
                  <select value={crm.trStatus} onChange={e => crm.setTrStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold">
                    {MASTER_DATA.prospekStatus.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* B. Segmentasi Prospek */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">B. DETAIL SEGMENTASI PROSPEK</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tahap Prospek</label>
                  <select value={crm.trProspectLevel} onChange={e => crm.setTrProspectLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.prospekLevel.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kategori Minat Utama</label>
                  <select value={crm.trMinatBarang} onChange={e => crm.setTrMinatBarang(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.minatBarang.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Akses Masuk (Source)</label>
                  <select value={crm.trAksesMasuk} onChange={e => crm.setTrAksesMasuk(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Akses...</option>
                    {MASTER_DATA.aksesMasuk.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kategori Pengunjung</label>
                  <select value={crm.trSiapa} onChange={e => crm.setTrSiapa(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Kategori...</option>
                    {MASTER_DATA.siapa.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Faktor Pemicu</label>
                  <select value={crm.trFaktorPemicu} onChange={e => crm.setTrFaktorPemicu(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih Pemicu...</option>
                    {MASTER_DATA.faktorPemicu.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Group Size</label>
                  <select value={crm.trGroupSize} onChange={e => crm.setTrGroupSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.groupSize.map(g => <option key={g} value={g}>{g} orang</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Served By (SA)</label>
                  <select value={crm.trServedBy} onChange={e => crm.setTrServedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Pilih SA...</option>
                    {crm.advisorsList.map(adv => <option key={adv} value={adv}>{adv}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* C. Barang Diminati */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  C. BARANG DIMINATI (MULTI-ROW)
                </h4>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Total: Rp {crm.trNetSales.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kode Item</label>
                    <input type="text" placeholder="e.g. AN855420" value={crm.newItemCode} onChange={e => crm.setNewItemCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SAP Code</label>
                    <input type="text" placeholder="e.g. 100234" value={crm.newSapCode} onChange={e => crm.setNewSapCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Deskripsi Barang</label>
                    <input type="text" placeholder="B.zero1 4-Band Ring 18kt Rose Gold..." value={crm.newDeskripsi} onChange={e => crm.setNewDeskripsi(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kategori</label>
                    <select value={crm.newKategori} onChange={e => crm.setNewKategori(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none">
                      {MASTER_DATA.minatBarang.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Koleksi</label>
                    <input type="text" placeholder="B.zero1, Serpenti..." value={crm.newKoleksi} onChange={e => crm.setNewKoleksi(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Harga (Rp)</label>
                    <input type="number" placeholder="45000000" value={crm.newHarga || ''} onChange={e => crm.setNewHarga(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none font-bold text-slate-900" />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={crm.handleAddTrafficItem}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm">
                      <Plus className="w-4 h-4" /> Tambah Item
                    </button>
                  </div>
                </div>
              </div>
              {crm.trItems.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="p-3">Kode / SAP</th>
                        <th className="p-3">Deskripsi</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3 text-right">Harga</th>
                        <th className="p-3 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {crm.trItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-700">{item.item_code} {item.sap_code && `(${item.sap_code})`}</td>
                          <td className="p-3 font-bold text-slate-900">{item.deskripsi}</td>
                          <td className="p-3 text-slate-600">{item.kategori}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">Rp {item.harga.toLocaleString('id-ID')}</td>
                          <td className="p-3 text-center">
                            <button type="button" onClick={() => crm.handleRemoveTrafficItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Diskon (%)</label>
                  <input type="number" placeholder="0" value={crm.trDiskonPct || ''} onChange={e => crm.setTrDiskonPct(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Subtotal</label>
                  <p className="text-sm font-bold text-slate-900 pt-2">Rp {crm.trSubtotal.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Net Sales</label>
                  <p className="text-base font-black text-emerald-600 pt-1">Rp {crm.trNetSales.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>

            {/* D. Bukti & Notes */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">D. BUKTI CHAT &amp; CATATAN</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-xl overflow-hidden flex items-center justify-center border border-slate-300 shrink-0">
                    {crm.trBuktiChatUrl
                      ? <img src={crm.trBuktiChatUrl} alt="Bukti Chat" className="w-full h-full object-cover" />
                      : <ImageIcon className="w-6 h-6 text-slate-400" />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Bukti Chat / Lampiran</h5>
                    <p className="text-[11px] text-slate-500 mb-2">Upload bukti ke folder bukti_chat</p>
                    <label className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all">
                      <Upload className="w-3 h-3" />
                      {crm.uploadingBukti ? 'Uploading...' : 'Upload Bukti'}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) crm.handleUploadImage(e.target.files[0], 'bukti_chat'); }} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Catatan Kunjungan</label>
                  <textarea rows={3} placeholder="Keperluan pelanggan, request khusus..." value={crm.trNotes} onChange={e => crm.setTrNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input type="checkbox" id="autoProfileCheck" checked={crm.trAutoProfile} onChange={e => crm.setTrAutoProfile(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer" />
                <label htmlFor="autoProfileCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Otomatis Buat &amp; Link Profil CRM Baru untuk Pelanggan Ini
                </label>
              </div>
            </div>

            <button type="button" onClick={crm.handleCreateTraffic}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg mt-4">
              <PlusCircle className="w-5 h-5" />
              Simpan Data Kunjungan Traffic &amp; Items
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 3: AUDIT DUPLIKAT ── */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {crm.duplicatePhones.length === 0 && crm.duplicateEmails.length === 0 ? (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-emerald-900">Database Profiling Bersih dari Duplikasi Exact!</h3>
              <p className="text-xs text-emerald-600 mt-1 max-w-md mx-auto">Tidak ditemukan nomor HP atau Email ganda di database saat ini.</p>
            </div>
          ) : (
            <>
              {crm.duplicatePhones.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-500" />
                    Grup Duplikat Berdasarkan Nomor HP ({crm.duplicatePhones.length})
                  </h3>
                  <div className="space-y-4">
                    {crm.duplicatePhones.map((group, gIdx) => (
                      <div key={gIdx} className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                            No. HP: {group.phoneKey} ({group.count} profil)
                          </span>
                          <span className="text-[11px] text-slate-400">Pilih 1 profil utama untuk dipertahankan</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.items.map(item => {
                            const secondaries = group.items.filter(s => s.id !== item.id);
                            return (
                              <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-blue-300 transition-all">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400">ID #{item.id}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{item.lokasi_store || 'No Store'}</span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-900">{item.nama_lengkap || 'Tanpa Nama'}</p>
                                  <div className="text-xs text-slate-500 space-y-1">
                                    <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /> {item.no_hp || '—'}</p>
                                    <p className="flex items-center gap-1.5"><User className="w-3 h-3 text-slate-400" /> CA: {item.customer_advisor || '—'}</p>
                                  </div>
                                </div>
                                <button type="button" disabled={crm.mergingId === item.id} onClick={() => crm.handleMerge(item, secondaries)}
                                  className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50">
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
              {crm.duplicateEmails.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-violet-500" />
                    Grup Duplikat Berdasarkan Email ({crm.duplicateEmails.length})
                  </h3>
                  <div className="space-y-4">
                    {crm.duplicateEmails.map((group, gIdx) => (
                      <div key={gIdx} className="bg-white border border-violet-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <span className="text-xs font-bold text-violet-800 bg-violet-50 px-3 py-1 rounded-full border border-violet-200">
                            Email: {group.emailKey} ({group.count} profil)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.items.map(item => {
                            const secondaries = group.items.filter(s => s.id !== item.id);
                            return (
                              <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                                <div className="space-y-2">
                                  <span className="text-[10px] font-black text-slate-400">ID #{item.id}</span>
                                  <p className="text-sm font-bold text-slate-900">{item.nama_lengkap}</p>
                                  <p className="text-xs text-slate-500">CA: {item.customer_advisor}</p>
                                </div>
                                <button type="button" onClick={() => crm.handleMerge(item, secondaries)}
                                  className="mt-4 w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
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
    </div>
  );
}

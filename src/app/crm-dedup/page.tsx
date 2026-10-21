"use client";

import { useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Search, Merge,
  UserPlus, Phone, Mail, User, Sparkles,
  Heart, UtensilsCrossed, AtSign, BadgeInfo,  Upload, Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BvlgariLoader from '@/components/BvlgariLoader';
import { MASTER_DATA, applyCountryPhoneCode, COUNTRY_REGIONS, INTERNATIONAL_CITIES, QUICK_DOMISILI_COUNTRIES } from './masterData';
import { useCrmDedup } from './useCrmDedup';
import { VisitDetailsForm } from './components/VisitDetailsForm';
import { TrafficHistoryTable } from './components/TrafficHistoryTable';
import { DatePicker } from '@/components/DatePicker';
import { CrmWorkspaceHeader } from './components/CrmWorkspaceHeader';
import styles from './crm-workspace.module.css';

export default function CrmDedupPage() {
  const [activeTab, setActiveTab] = useState<'check' | 'traffic' | 'audit' | 'history'>('check');
  const crm = useCrmDedup();

  if (crm.loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <BvlgariLoader />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <CrmWorkspaceHeader activeTab={activeTab} onTabChange={setActiveTab} onRefresh={crm.fetchAuditData}
        profiles={crm.totalProfiles} duplicatePhones={crm.duplicatePhones.length}
        duplicateEmails={crm.duplicateEmails.length} recentVisits={crm.trafficRows.length} />
      <div className={styles.workspace}>

      {/* ── TAB 1: FORM PROFILING ── */}
      {activeTab === 'check' && (
        <div className={cn(styles.panelEntry, "grid grid-cols-1 lg:grid-cols-12 gap-6")}>
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
            <div id="profile-1" className={cn(styles.formCard, "bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4")}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><User className="w-4 h-4" /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">1. PRIMARY INFORMATION</h3>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-20 h-20 bg-slate-200 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-300 shrink-0">
                  {crm.fotoCustomerUrl
                    ? <img src={crm.fotoCustomerUrl} alt="Customer photo" className="w-full h-full object-cover" />
                    : <Camera className="w-8 h-8 text-slate-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Customer photo</h4>
                  <p className="text-[11px] text-slate-500 mb-2">Add a profile photo to recognize your customer.</p>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    {crm.uploadingFoto ? 'Uploading...' : "Choose photo"}
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
                  <input type="text" placeholder="First name..." value={crm.namaDepan} onChange={e => crm.setNamaDepan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Last Name</label>
                  <input type="text" placeholder="Last name..." value={crm.namaBelakang} onChange={e => crm.setNamaBelakang(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Preferred Name</label>
                  <input type="text" placeholder="Preferred name..." value={crm.namaPanggilan} onChange={e => crm.setNamaPanggilan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
            </div>

            {/* 2. CONTACT DETAILS */}
            <div id="profile-2" className={cn(styles.formCard, "bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4")}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Phone className="w-4 h-4" /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">2. CONTACT DETAILS</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Nationality</label>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      Code: +{MASTER_DATA.phoneCodes[crm.kewarganegaraan] || '62'}
                    </span>
                  </div>
                  <select 
                    value={crm.kewarganegaraan} 
                    onChange={e => crm.handleKewarganegaraanChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    {Object.entries(COUNTRY_REGIONS).map(([region, countries]) => (
                      <optgroup key={region} label={`── ${region} ──`}>
                        {countries.map(k => (
                          <option key={k} value={k}>{k} (+{MASTER_DATA.phoneCodes[k] || ''})</option>
                        ))}
                      </optgroup>
                    ))}
                    {crm.kewarganegaraan && !MASTER_DATA.phoneCodes[crm.kewarganegaraan] && (
                      <option value={crm.kewarganegaraan}>{crm.kewarganegaraan}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Phone number <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder={`+${MASTER_DATA.phoneCodes[crm.kewarganegaraan] || '62'} 812 3456 7890`} 
                    value={crm.noHp} 
                    onChange={e => crm.setNoHp(e.target.value)}
                    onBlur={() => {
                      if (crm.noHp && !crm.noHp.startsWith('+')) {
                        crm.setNoHp(applyCountryPhoneCode(crm.noHp, crm.kewarganegaraan));
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium hover:border-slate-300 focus:border-slate-800 transition-colors" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Country calling code: <span className="font-bold text-slate-700">+{MASTER_DATA.phoneCodes[crm.kewarganegaraan] || '62'}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email</label>
                  <input type="email" placeholder="email@example.com" value={crm.email} onChange={e => crm.setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
            </div>

            {/* 3. IDENTITAS & DOMISILI */}
            <div id="profile-3" className={cn(styles.formCard, "bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4")}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><BadgeInfo className="w-4 h-4" /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">3. Identity &amp; residence</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ID / passport number</label>
                  <input type="text" placeholder="ID / passport number..." value={crm.ktpPassport} onChange={e => crm.setKtpPassport(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Date of birth</label>
                  <DatePicker
                    value={crm.tglLahir}
                    onChange={crm.setTglLahir}
                    placeholder="Select date of birth..."
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                    showShortcuts={false}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Age group</label>
                  <select value={crm.umur} onChange={e => crm.setUmur(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select age group...</option>
                    {MASTER_DATA.umurOptions.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Marital status</label>
                  <select value={crm.pernikahan} onChange={e => crm.setPernikahan(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.statusPernikahan.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {crm.pernikahan === 'Kawin' && (
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 uppercase mb-1">Wedding anniversary</label>
                    <DatePicker
                      value={crm.tglPernikahan}
                      onChange={crm.setTglPernikahan}
                      placeholder="Select anniversary..."
                      buttonClassName="bg-white border-blue-300"
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                      showShortcuts={false}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Has children?</label>
                  <select value={crm.memilikiAnak} onChange={e => crm.setMemilikiAnak(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.memilikiAnak.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                {crm.memilikiAnak === 'YA' && (
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 uppercase mb-1">Number of children</label>
                    <select value={crm.jumlahAnak} onChange={e => crm.setJumlahAnak(e.target.value)}
                      className="w-full bg-white border border-blue-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                      {MASTER_DATA.jumlahAnak.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">Residence type</label>
                  {crm.domisiliType === 'Luar Negeri' && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      International residence
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {(['Dalam Negeri', 'Luar Negeri'] as const).map(type => (
                    <label key={type} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="domType" 
                        checked={crm.domisiliType === type} 
                        onChange={() => crm.handleDomisiliTypeChange(type)} 
                      />
                      {type === 'Dalam Negeri' ? 'Dalam Negeri (Indonesia)' : 'Luar Negeri (International)'}
                    </label>
                  ))}
                </div>

                {crm.domisiliType === 'Dalam Negeri' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Province of residence</label>
                    <select 
                      value={crm.domisiliProvinsi} 
                      onChange={e => crm.setDomisiliProvinsi(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium hover:border-slate-300 transition-colors"
                    >
                      <option value="">Select province...</option>
                      {MASTER_DATA.provinsi.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {/* Quick Chips Negara Terpopuler */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Quick country selection
                        </span>
                        {crm.kewarganegaraan && crm.kewarganegaraan !== 'Indonesia' && crm.domisiliNegara !== crm.kewarganegaraan && (
                          <button
                            type="button"
                            onClick={() => crm.handleSelectDomisiliNegara(crm.kewarganegaraan)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                          >
                            Use nationality ({crm.kewarganegaraan})
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_DOMISILI_COUNTRIES.map(item => (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => crm.handleSelectDomisiliNegara(item.name)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer",
                              crm.domisiliNegara === item.name
                                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-100"
                            )}
                          >
                            <span>{item.flag}</span>
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Form Grid 2 Kolom: Negara & Kota */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Country of residence <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={crm.domisiliNegara}
                          onChange={e => crm.handleSelectDomisiliNegara(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium hover:border-slate-300 transition-colors cursor-pointer"
                        >
                          <option value="">Select country...</option>
                          {Object.entries(COUNTRY_REGIONS).map(([region, countries]) => (
                            <optgroup key={region} label={`── ${region} ──`}>
                              {countries.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          City of residence
                        </label>
                        <input
                          type="text"
                          list="international-cities-list"
                          placeholder={crm.domisiliNegara ? `Kota di ${crm.domisiliNegara} (misal: London, Paris, Sydney...)` : "Select a country or enter a city..."}
                          value={crm.domisiliKota}
                          onChange={e => crm.handleSelectDomisiliKota(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium hover:border-slate-300 focus:border-slate-800 transition-colors"
                        />
                        <datalist id="international-cities-list">
                          {(INTERNATIONAL_CITIES[crm.domisiliNegara] || []).map(city => (
                            <option key={city} value={city} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Quick City Suggestions (Pill Buttons) */}
                    {crm.domisiliNegara && INTERNATIONAL_CITIES[crm.domisiliNegara] && INTERNATIONAL_CITIES[crm.domisiliNegara].length > 1 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Suggested cities:</span>
                        {INTERNATIONAL_CITIES[crm.domisiliNegara].map(city => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => crm.handleSelectDomisiliKota(city)}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors border cursor-pointer",
                              crm.domisiliKota === city
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-700"
                            )}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Status Format Data Tersimpan di Database */}
                    <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Residence summary:</span>
                        <span className="font-bold text-slate-800">
                          {crm.domisiliLuarNegeri || <span className="text-slate-400 italic font-normal">No country selected</span>}
                        </span>
                      </div>
                      <span className="text-[10px] text-blue-500 font-medium">Standardized residence</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ethnicity</label>
                  <select value={crm.etnis} onChange={e => crm.setEtnis(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select ethnicity...</option>
                    {MASTER_DATA.etnis.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Religion</label>
                  <select value={crm.agama} onChange={e => crm.setAgama(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select religion...</option>
                    {MASTER_DATA.agama.map(a => <option key={a} value={a}>{a}</option>)}
                    {crm.agama && !MASTER_DATA.agama.includes(crm.agama) && (
                      <option value={crm.agama}>{crm.agama}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Occupation</label>
                  <select value={crm.pekerjaan} onChange={e => crm.setPekerjaan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select occupation...</option>
                    {MASTER_DATA.pekerjaan.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. LIFESTYLE & HOBBY */}
            <div id="profile-4" className={cn(styles.formCard, "bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4")}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-pink-50 text-pink-600 rounded-xl"><Heart className="w-4 h-4" /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">4. Lifestyle &amp; interests</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Fashion Style</label>
                  <select value={crm.fashionStyle} onChange={e => crm.setFashionStyle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select style...</option>
                    {MASTER_DATA.fashionStyle.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Interest category</label>
                  <select value={crm.hobbyKat} onChange={e => { crm.setHobbyKat(e.target.value); crm.setHobbySub(''); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select category...</option>
                    {Object.keys(MASTER_DATA.hobiKategori).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Specific interest</label>
                  <select value={crm.hobbySub} onChange={e => crm.setHobbySub(e.target.value)} disabled={!crm.hobbyKat}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium disabled:opacity-40">
                    <option value="">Select interest...</option>
                    {(MASTER_DATA.hobiKategori[crm.hobbyKat] || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {(crm.hobbyKat === 'Others' || crm.hobbySub === 'Others') && (
                <div className="p-3 bg-pink-50 border border-pink-200 rounded-2xl">
                  <label className="block text-[11px] font-bold text-pink-800 uppercase mb-1">Other interests</label>
                  <input type="text" placeholder="Add a specific interest..." value={crm.hobbyOthers} onChange={e => crm.setHobbyOthers(e.target.value)}
                    className="w-full bg-white border border-pink-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Favorite color</label>
                  <select value={crm.warnaFavorit} onChange={e => crm.setWarnaFavorit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select color...</option>
                    {MASTER_DATA.warnaFavorit.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Favorite destinations</label>
                  <input type="text" placeholder="Paris, Bali, Tokyo..." value={crm.liburanFavorit} onChange={e => crm.setLiburanFavorit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Favorite conversation topics</label>
                  <input type="text" placeholder="Art, Watch, Business..." value={crm.topikPembicaraan} onChange={e => crm.setTopikPembicaraan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
            </div>

            {/* 5. KULINER & ALERGI */}
            <div id="profile-5" className={cn(styles.formCard, "bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4")}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><UtensilsCrossed className="w-4 h-4" /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">5. Dining preferences &amp; allergies</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Favorite food", val: crm.makananFavorit, set: crm.setMakananFavorit, ph: 'Italian, Japanese...' },
                  { label: "Favorite drinks", val: crm.minumanFavorit, set: crm.setMinumanFavorit, ph: 'Wine, Champagne, Coffee...' },
                  { label: "Favorite cake",    val: crm.cakeFavorit,    set: crm.setCakeFavorit,    ph: 'Chocolate, Cheese Cake...' },
                  { label: "Food allergies",  val: crm.alergiMakanan,  set: crm.setAlergiMakanan,  ph: 'Nuts, Seafood...' },
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
            <div id="profile-6" className={cn(styles.formCard, "bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4")}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><AtSign className="w-4 h-4" /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">6. Social &amp; advisor details</h3>
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
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Purchase motivation</label>
                  <select value={crm.pemicu} onChange={e => crm.setPemicu(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select motivation...</option>
                    {MASTER_DATA.pemicuBeli.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Product interests</label>
                  <select value={crm.antusias} onChange={e => crm.setAntusias(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select category...</option>
                    {MASTER_DATA.barangAntusias.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Customer personality</label>
                  <select value={crm.karakter} onChange={e => crm.setKarakter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select personality...</option>
                    {MASTER_DATA.karakter.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Boutique</label>
                  <select value={crm.lokasiStore} onChange={e => crm.setLokasiStore(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold">
                    {MASTER_DATA.stores.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Customer Advisor</label>
                  <select value={crm.customerAdvisor} onChange={e => crm.setCustomerAdvisor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select customer advisor...</option>
                    {crm.advisorsList.map(adv => <option key={adv} value={adv}>{adv}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Additional notes</label>
                <textarea rows={3} placeholder="Additional customer details..." value={crm.notes} onChange={e => crm.setNotes(e.target.value)}
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
              {crm.isExactDuplicate ? 'Duplicate detected - profile creation blocked' : "Save new customer profile"}
            </button>
          </div>

          {/* Live Dedup Monitor */}
          <div className="lg:col-span-4 space-y-4">
            <aside className={styles.guide}>
              <h3>Profile essentials</h3><p>Complete the required fields first. Add personal preferences as you learn more about your customer.</p>
              <nav aria-label="Customer profile sections">{['Primary information', 'Contact details', 'Identity & residence', 'Lifestyle & interests', 'Dining preferences', 'Social & advisor details'].map((label, index) => <a key={label} href={`#profile-${index + 1}`}><span>0{index + 1}</span>{label}</a>)}</nav>
            </aside>
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Live Deduplication Monitor
                </h4>
                {crm.checkLoading && <span className="text-[10px] text-blue-600 animate-pulse font-bold">Checking...</span>}
              </div>
              <div className="text-xs space-y-2">
                <p className="text-slate-500"><span className="font-bold text-slate-700">Customer name:</span> {crm.fullName || '—'}</p>
                <p className="text-slate-500"><span className="font-bold text-slate-700">Phone number:</span> {crm.noHp || '—'}</p>
              </div>
              {!crm.noHp && !crm.fullName && !crm.email ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl p-4">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">Enter a name or phone number</p>
                  <p className="text-[11px] mt-1">Matching profiles appear here as you type.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {crm.isExactDuplicate && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Exact contact match found
                      </div>
                      <p className="text-[11px] text-red-600">A profile already uses this phone number or email address.</p>
                      {[...crm.exactPhoneMatches, ...crm.exactEmailMatches].map(p => (
                        <div key={p.id} className="bg-white border border-red-200 rounded-xl p-3 text-xs space-y-1">
                          <p className="font-bold text-slate-900">{p.nama_lengkap} (ID #{p.id})</p>
                          <p className="text-slate-500">Phone: {p.no_hp} | Store: {p.lokasi_store}</p>
                          <p className="text-slate-500">CA: {p.customer_advisor || '—'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {!crm.isExactDuplicate && crm.fuzzyMatches.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {crm.fuzzyMatches.length} similar profiles found:
                      </div>
                      {crm.fuzzyMatches.map(p => (
                        <div key={p.id} className="bg-white border border-amber-200 rounded-xl p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900">{p.nama_lengkap}</p>
                            <span className="text-[9px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">{p.similarityScore}% similarity</span>
                          </div>
                          <p className="text-slate-500">Phone: {p.no_hp} | CA: {p.customer_advisor}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {!crm.isExactDuplicate && crm.fuzzyMatches.length === 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-emerald-900">No matching profiles found</p>
                      <p className="text-[11px] text-emerald-600 mt-1">Review the details before saving a new profile.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: TRAFFIC & ITEMS ── */}
      {activeTab === 'traffic' && <VisitDetailsForm crm={crm} />}

      {/* ── TAB 3: AUDIT DUPLIKAT ── */}
      {activeTab === 'audit' && (
        <div className={cn(styles.panelEntry, "space-y-6") }>
          {crm.duplicatePhones.length === 0 && crm.duplicateEmails.length === 0 ? (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-emerald-900">No exact duplicate contacts found</h3>
              <p className="text-xs text-emerald-600 mt-1 max-w-md mx-auto">The current review found no repeated phone numbers or email addresses.</p>
            </div>
          ) : (
            <>
              {crm.duplicatePhones.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-500" />
                    Matching phone groups ({crm.duplicatePhones.length})
                  </h3>
                  <div className="space-y-4">
                    {crm.duplicatePhones.map((group, gIdx) => (
                      <div key={gIdx} className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                            Phone: {group.phoneKey} ({group.count} profiles)
                          </span>
                          <span className="text-[11px] text-slate-400">Choose the primary profile to retain</span>
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
                                  Keep this profile (merge {secondaries.length} others)
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
                    <Mail className="w-4 h-4 text-blue-500" />
                    Matching email groups ({crm.duplicateEmails.length})
                  </h3>
                  <div className="space-y-4">
                    {crm.duplicateEmails.map((group, gIdx) => (
                      <div key={gIdx} className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <span className="text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                            Email: {group.emailKey} ({group.count} profiles)
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
                                  className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                                  <Merge className="w-3.5 h-3.5" />
                                  Keep as primary profile
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

      {/* ── TAB 4: RIWAYAT TRAFFIC & PROFIL (INTEGRASI 360) ── */}
      {activeTab === 'history' && (
        <TrafficHistoryTable
          onSelectCustomerForProfiling={(name, phone, email) => {
            const parts = (name || '').trim().split(' ');
            crm.setNamaDepan(parts[0] || '');
            crm.setNamaBelakang(parts.slice(1).join(' ') || '');
            crm.setNoHp(phone || '');
            crm.setEmail(email || '');
            setActiveTab('check');
          }}
        />
      )}

      {/* ── MODAL KATALOG INVENTORY & PRODUK BVLGARI ── */}
      </div>
      <footer className={styles.footer}><span>BVLGARI / Client Experience</span><span>Designed &amp; developed by <strong>Aris Setiyono</strong></span></footer>

    </div>
  );
}

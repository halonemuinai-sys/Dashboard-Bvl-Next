"use client";
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Search, Sparkles, Upload, Trash2, ShoppingBag, Plus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import { DatePicker } from '@/components/DatePicker';
import { MASTER_DATA } from '../masterData';
import type { useCrmDedup } from '../useCrmDedup';
import { CustomerPickerCombobox } from './CustomerPickerCombobox';
import { InventorySearchModal, type InventoryItem } from './InventorySearchModal';
import styles from '../visit-details.module.css';

export function VisitDetailsForm({ crm }: { crm: ReturnType<typeof useCrmDedup> }) {
  const validDiscount = Number.isFinite(crm.trDiskonPct) && crm.trDiskonPct >= 0 && crm.trDiskonPct <= 100;
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionResult, setSuggestionResult] = useState<{ query: string; store: string; items: InventoryItem[] } | null>(null);
  const [showSuggestDropdown, setShowSuggestDropdown] = useState(false);
  const invSuggestLoading = showSuggestDropdown && (suggestionResult?.query !== suggestionQuery || suggestionResult?.store !== crm.trLocation);
  const invSuggestions = invSuggestLoading ? [] : suggestionResult?.items || [];
  const handleFetchSuggestions = (value: string) => { setSuggestionQuery(value.trim()); setShowSuggestDropdown(value.trim().length >= 2); };
  useEffect(() => {
    if (!showSuggestDropdown || suggestionQuery.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ action: 'search_inventory', q: suggestionQuery, location: crm.trLocation, limit: '5' });
        const response = await fetch('/api/crm/dedup?' + params, { signal: controller.signal });
        const data = await response.json();
        if (!controller.signal.aborted) setSuggestionResult({ query: suggestionQuery, store: crm.trLocation, items: data.success ? data.items || [] : [] });
      } catch { if (!controller.signal.aborted) setSuggestionResult({ query: suggestionQuery, store: crm.trLocation, items: [] }); }
    }, 280);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [suggestionQuery, crm.trLocation, showSuggestDropdown]);
  return (<>
        <div className={styles.visitLayout}>
          <fieldset disabled={crm.savingVisit} className={styles.visitFields}>
            <div className={styles.visitIntro}>
              <span className={styles.visitEyebrow}><Sparkles size={14} /> CLIENT EXPERIENCE</span>
              <h2>Every visit starts a conversation.</h2>
              <p>Capture the customer, their interests and the next step.</p>
              <nav aria-label="Visit sections">{[['visit-customer', '01 Customer'], ['visit-prospect', '02 Visit context'], ['visit-products', '03 Products'], ['visit-notes', '04 Notes']].map(([id, label]) => <a key={id} href={'#' + id}>{label}</a>)}</nav>
            </div>
            {crm.trMessage && (
              <div role={crm.trMessage.type === 'error' ? 'alert' : 'status'} className={cn('p-4 rounded-2xl text-xs font-bold flex items-center gap-2',
                crm.trMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200')}>
                {crm.trMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                {crm.trMessage.text}
              </div>
            )}

            {/* A. Informasi Pelanggan */}
            <section id="visit-customer" className={styles.visitCard}>
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">01 / Customer &amp; visit</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Visit date</label>
                  <DatePicker
                    value={crm.trTanggal}
                    onChange={crm.setTrTanggal}
                    placeholder="Select visit date..."
                    fromYear={2020}
                    toYear={new Date().getFullYear() + 1}
                    showShortcuts={true}
                    allowClear={false}
                  />
                </div>
                <div>
                  <CustomerPickerCombobox
                    value={crm.trCustomerName}
                    onChange={crm.setTrCustomerName}
                    onSelectCustomer={crm.selectCustomerFromDb}
                    onClearCustomer={crm.clearSelectedCustomer}
                    selectedCustomer={crm.selectedDbCustomer}
                    advisorsList={crm.advisorsList}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Preferred name</label>
                  <input type="text" placeholder="Preferred name..." value={crm.trNamaPanggilan} onChange={e => crm.setTrNamaPanggilan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Phone number</label>
                  <input type="text" placeholder="081234567890" value={crm.trNoHp} onChange={e => crm.setTrNoHp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email</label>
                  <input type="email" placeholder="email@example.com" value={crm.trEmail} onChange={e => crm.setTrEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Customer status</label>
                  <select value={crm.trStatusPelanggan} onChange={e => crm.setTrStatusPelanggan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.statusPelangganTraffic.map(s => <option key={s} value={s}>{s}</option>)}
                    {crm.trStatusPelanggan && !MASTER_DATA.statusPelangganTraffic.includes(crm.trStatusPelanggan) && (
                      <option value={crm.trStatusPelanggan}>{crm.trStatusPelanggan}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Visit status</label>
                  <select value={crm.trStatus} onChange={e => crm.setTrStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold">
                    {MASTER_DATA.prospekStatus.map(s => <option key={s} value={s}>{s}</option>)}
                    {crm.trStatus && !MASTER_DATA.prospekStatus.includes(crm.trStatus) && (
                      <option value={crm.trStatus}>{crm.trStatus}</option>
                    )}
                  </select>
                </div>
              </div>
            </section>

            {/* B. Segmentasi Prospek */}
            <section id="visit-prospect" className={styles.visitCard}>
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">02 / Prospect details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Prospect stage</label>
                  <select value={crm.trProspectLevel} onChange={e => crm.setTrProspectLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.prospekLevel.map(p => <option key={p} value={p}>{p}</option>)}
                    {crm.trProspectLevel && !MASTER_DATA.prospekLevel.includes(crm.trProspectLevel) && (
                      <option value={crm.trProspectLevel}>{crm.trProspectLevel}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Main product interest</label>
                  <select value={crm.trMinatBarang} onChange={e => crm.setTrMinatBarang(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.minatBarang.map(m => <option key={m} value={m}>{m}</option>)}
                    {crm.trMinatBarang && !MASTER_DATA.minatBarang.includes(crm.trMinatBarang) && (
                      <option value={crm.trMinatBarang}>{crm.trMinatBarang}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Visit source</label>
                  <select value={crm.trAksesMasuk} onChange={e => crm.setTrAksesMasuk(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select source...</option>
                    {MASTER_DATA.aksesMasuk.map(a => <option key={a} value={a}>{a}</option>)}
                    {crm.trAksesMasuk && !MASTER_DATA.aksesMasuk.includes(crm.trAksesMasuk) && (
                      <option value={crm.trAksesMasuk}>{crm.trAksesMasuk}</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Visitor category</label>
                  <select value={crm.trSiapa} onChange={e => crm.setTrSiapa(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select category...</option>
                    {MASTER_DATA.siapa.map(s => <option key={s} value={s}>{s}</option>)}
                    {crm.trSiapa && !MASTER_DATA.siapa.includes(crm.trSiapa) && (
                      <option value={crm.trSiapa}>{crm.trSiapa}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Purchase motivation</label>
                  <select value={crm.trFaktorPemicu} onChange={e => crm.setTrFaktorPemicu(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select motivation...</option>
                    {MASTER_DATA.faktorPemicu.map(f => <option key={f} value={f}>{f}</option>)}
                    {crm.trFaktorPemicu && !MASTER_DATA.faktorPemicu.includes(crm.trFaktorPemicu) && (
                      <option value={crm.trFaktorPemicu}>{crm.trFaktorPemicu}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Group Size</label>
                  <select value={crm.trGroupSize} onChange={e => crm.setTrGroupSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.groupSize.map(g => <option key={g} value={g}>{g} people</option>)}
                    {crm.trGroupSize && !MASTER_DATA.groupSize.includes(crm.trGroupSize) && (
                      <option value={crm.trGroupSize}>{crm.trGroupSize} people</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Boutique</label>
                  <select value={crm.trLocation} onChange={e => crm.setTrLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    {MASTER_DATA.stores.map(s => <option key={s} value={s}>{s}</option>)}
                    {crm.trLocation && !MASTER_DATA.stores.includes(crm.trLocation) && (
                      <option value={crm.trLocation}>{crm.trLocation}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Served By (SA)</label>
                  <select value={crm.trServedBy} onChange={e => crm.setTrServedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
                    <option value="">Select advisor...</option>
                    {crm.advisorsList.map(adv => <option key={adv} value={adv}>{adv}</option>)}
                    {crm.trServedBy && !crm.advisorsList.includes(crm.trServedBy) && (
                      <option value={crm.trServedBy}>{crm.trServedBy}</option>
                    )}
                  </select>
                </div>
              </div>
            </section>

            {/* C. Barang Diminati */}
            <section id="visit-products" className={styles.visitCard}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    03 / Product interests
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowInventoryModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Search className="w-3.5 h-3.5 text-emerald-600" />
                    Browse inventory
                  </button>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {crm.trItems.length} interested items
                </span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Item code</label>
                    <input
                      type="text"
                      placeholder="e.g. AN855420"
                      value={crm.newItemCode}
                      onChange={e => {
                        crm.setNewItemCode(e.target.value);
                        handleFetchSuggestions(e.target.value);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SAP Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 100234"
                      value={crm.newSapCode}
                      onChange={e => {
                        crm.setNewSapCode(e.target.value);
                        handleFetchSuggestions(e.target.value);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Item description</label>
                    <input
                      type="text"
                      placeholder="B.zero1 4-Band Ring 18kt Rose Gold..."
                      value={crm.newDeskripsi}
                      onChange={e => {
                        crm.setNewDeskripsi(e.target.value);
                        handleFetchSuggestions(e.target.value);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Autocomplete Quick Suggestions Dropdown */}
                {showSuggestDropdown && (
                  <div className="relative z-10 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>Inventory suggestions ({crm.trLocation || 'All stores'})</span>
                      <button type="button" onClick={() => setShowSuggestDropdown(false)} className="text-slate-400 hover:text-slate-600">
                        Close
                      </button>
                    </div>
                    {invSuggestLoading ? (
                      <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent animate-spin rounded-full inline-block" />
                        Searching inventory...
                      </div>
                    ) : invSuggestions.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        No matching inventory items found.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto custom-scrollbar">
                        {invSuggestions.map((sug, sIdx) => (
                          <button type="button"
                            key={sIdx}
                            onClick={() => {
                              crm.handleSelectInventoryItem(sug);
                              setShowSuggestDropdown(false);
                            }}
                            className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="min-w-0 pr-3">
                              <p className="font-bold text-slate-900 truncate">{sug.deskripsi}</p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                Code: {sug.item_code} · SAP: {sug.sap_code || '—'} · {sug.kategori} ({sug.koleksi})
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black text-emerald-700">IDR <Amt value={sug.harga} /></p>
                              {sug.qoh !== undefined && (
                                <p className="text-[10px] text-slate-400">Stock: {sug.qoh} unit</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuggestDropdown(false);
                        setShowInventoryModal(true);
                      }}
                      className="w-full mt-1.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[11px] font-bold text-center border border-slate-200 transition-colors"
                    >
                      Open inventory catalogue &rarr;
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                    <select value={crm.newKategori} onChange={e => crm.setNewKategori(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none">
                      {MASTER_DATA.minatBarang.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Collection</label>
                    <input type="text" placeholder="B.zero1, Serpenti..." value={crm.newKoleksi} onChange={e => crm.setNewKoleksi(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price (IDR)</label>
                    <input type="number" min="0" step="0.01" placeholder="45000000" value={crm.newHarga || ''} onChange={e => crm.setNewHarga(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none font-bold text-slate-900" />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={crm.handleAddTrafficItem}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm">
                      <Plus className="w-4 h-4" /> Add item
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span>Each added entry represents one item.</span><button type="button" className="font-semibold text-blue-700 hover:underline" onClick={() => { crm.setNewItemCode(''); crm.setNewSapCode(''); crm.setNewDeskripsi(''); crm.setNewHarga(0); crm.setNewKoleksi(''); setShowSuggestDropdown(false); }}>Clear item draft</button></div>
              {crm.trItems.length === 0 && <div className={styles.emptyInterests}><ShoppingBag size={24} /><strong>No products added yet</strong><span>Browse inventory or enter an item above. You can also save a visit without product interests.</span></div>}
              {crm.trItems.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="p-3">Item / SAP code</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {crm.trItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-700">{item.item_code} {item.sap_code && `(${item.sap_code})`}</td>
                          <td className="p-3 font-bold text-slate-900">{item.deskripsi}</td>
                          <td className="p-3 text-slate-600">{item.kategori}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">IDR <Amt value={item.harga} /></td>
                          <td className="p-3 text-center">
                            <button type="button" aria-label={`Remove ${item.deskripsi}`} onClick={() => crm.handleRemoveTrafficItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg">
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
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Discount (%)</label>
                  <input aria-invalid={!validDiscount} aria-describedby="visit-discount-help" type="number" min="0" max="100" step="0.01" placeholder="0" value={crm.trDiskonPct || ''} onChange={e => crm.setTrDiskonPct(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold" />
                </div>
                <p id="visit-discount-help" className="sr-only">Discount must be between zero and one hundred percent.</p>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Subtotal</label>
                  <p className="text-sm font-bold text-slate-900 pt-2">IDR <Amt value={crm.trSubtotal} /></p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Net interest value</label>
                  <p className="text-base font-black text-emerald-600 pt-1">IDR {validDiscount ? <Amt value={crm.trNetSales} /> : <span>Check discount</span>}</p>
                </div>
              </div>
            </section>

            {/* D. Bukti & Notes */}
            <section id="visit-notes" className={styles.visitCard}>
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">04 / Attachments &amp; notes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-xl overflow-hidden flex items-center justify-center border border-slate-300 shrink-0">
                    {crm.trBuktiChatUrl
                      ? <img src={crm.trBuktiChatUrl} alt="Visit attachment" className="w-full h-full object-cover" />
                      : <ImageIcon className="w-6 h-6 text-slate-400" />}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Supporting attachment</h5>
                    <p className="text-[11px] text-slate-500 mb-2">Attach an image relevant to this visit.</p>
                    <label className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all">
                      <Upload className="w-3 h-3" />
                      {crm.uploadingBukti ? 'Uploading...' : "Upload attachment"}
                      <input disabled={crm.uploadingBukti} type="file" accept="image/*" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) crm.handleUploadImage(e.target.files[0], 'bukti_chat'); }} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Visit notes</label>
                  <textarea rows={3} placeholder="Customer needs, requests and follow-up notes..." value={crm.trNotes} onChange={e => crm.setTrNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input type="checkbox" id="autoProfileCheck" disabled={!!crm.selectedDbCustomer?.crmProfileId || crm.selectedDbCustomer?.source === 'CRM Profile'} checked={crm.trAutoProfile} onChange={e => crm.setTrAutoProfile(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer" />
                <label htmlFor="autoProfileCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Create and link a new CRM profile for this customer
                </label>
              </div>
            </section>

          </fieldset>
          <aside className={styles.visitSummary}>
            <div className={styles.summaryTop}><span><ShoppingBag size={17} /> VISIT SUMMARY</span><span className={styles.draftBadge}>Draft</span></div>
            <h3>{crm.trCustomerName.trim() || 'Your next customer'}</h3>
            <p className={styles.summaryCaption}>{crm.selectedDbCustomer ? 'Customer selected from database' : 'Start by adding the customer details'}</p>
            <dl className={styles.visitMeta}>
              <div><dt>Boutique</dt><dd>{crm.trLocation || 'Select boutique'}</dd></div>
              <div><dt>Advisor</dt><dd>{crm.trServedBy || 'Not selected'}</dd></div>
              <div><dt>Visit date</dt><dd>{crm.trTanggal || 'Select date'}</dd></div>
              <div><dt>Visit status</dt><dd>{crm.trStatus}</dd></div>
            </dl>
            <div className={styles.interestTotal}><span>NET INTEREST VALUE / IDR</span><strong>{validDiscount ? <Amt value={crm.trNetSales} /> : <span>Check discount</span>}</strong><p>{crm.trItems.length} product {crm.trItems.length === 1 ? 'entry' : 'entries'} added</p></div>
            <dl className={styles.visitMeta}>
              <div><dt>Subtotal</dt><dd><Amt value={crm.trSubtotal} /></dd></div>
              <div><dt>Discount</dt><dd>{crm.trDiskonPct}%</dd></div>
              <div><dt>Attachment</dt><dd>{crm.uploadingBukti ? 'Uploading...' : crm.trBuktiChatUrl ? 'Attached' : 'None'}</dd></div>
            </dl>
            <p className={styles.summaryNote}>Product interests record potential purchases. This value is not a completed sale.</p>
            <button type="button" disabled={crm.savingVisit || crm.uploadingBukti} onClick={crm.handleCreateTraffic} className={styles.saveVisit}>
              {crm.savingVisit ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {crm.savingVisit ? 'Saving visit...' : crm.uploadingBukti ? 'Uploading attachment...' : 'Save visit & interests'}
            </button>
            {crm.trMessage && <p role="status" className={crm.trMessage.type === 'error' ? 'text-rose-600 text-xs mt-3' : 'text-emerald-700 text-xs mt-3'}>{crm.trMessage.text}</p>}
          </aside>
        </div>
      <InventorySearchModal
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        currentStore={crm.trLocation}
        onSelectItem={(item) => {
          crm.handleSelectInventoryItem(item);
        }}
        onDirectAddItem={(item) => {
          crm.handleDirectAddTrafficItem(item);
        }}
      />
  </>);
}

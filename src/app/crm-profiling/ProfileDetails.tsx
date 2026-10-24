"use client";

import { useState, useEffect, useRef, createContext, useContext, Children, isValidElement } from 'react';
import { X, Phone, Heart, Briefcase, Globe, AtSign, UtensilsCrossed, Store, Users, ShoppingBag, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mediaUrl } from '@/lib/media';
import type { CrmProfilingRow } from '@/services/dashboardService';
import Amt from '@/components/Amt';
import ProfileHeader from './ProfileHeader';
import styles from './profile-details.module.css';

// ── helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const val = (v: string | null | undefined) => (v && v.trim() ? v.trim() : '—');



// Store abbreviation for badges
const storeBadge = (s: string) => {
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower.includes('indonesia') || lower.includes('intermark') || lower === 'pi') return 'PI';
  if (lower.includes('senayan') || lower.includes('superstore') || lower === 'ps') return 'PS';
  if (lower.includes('bali')) return 'Bali';
  return s.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
};

const storeBadgeColor = (s: string) => {
  const ab = storeBadge(s);
  if (ab === 'PI')   return 'bg-blue-50 text-blue-700 border-blue-200';
  if (ab === 'PS')   return 'bg-violet-50 text-violet-700 border-violet-200';
  if (ab === 'Bali') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
};

// ── Profile Card ─────────────────────────────────────────────────────────────

const ShowEmptyContext = createContext(false);
const isFilled = (value: unknown) => typeof value === 'string' && !!value.trim() && value.trim() !== '—';

function Section({ title, icon: Icon, children, wide = false }: { title: string; icon: React.ElementType; children: React.ReactNode; wide?: boolean }) {
  const showEmpty = useContext(ShowEmptyContext);
  const fields = Children.toArray(children).filter(isValidElement<{ value?: string | null }>);
  const filled = fields.filter(field => isFilled(field.props.value)).length;
  return (
    <section className={cn(styles.section, wide && styles.wideSection)}>
      <div className={styles.sectionHeading}>
        <div className={styles.sectionIcon}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-xs font-semibold text-slate-800">{title}</h3>
        <span className="ml-auto text-[10px] text-slate-400" title="Fields completed">{filled}/{fields.length}</span>
      </div>
      <dl className={styles.fields}>
        {children}
      </dl>
      {!filled && !showEmpty && <p className="px-5 pb-5 text-xs text-slate-400">No details added yet.</p>}
    </section>
  );
}

function Field({ label, value: v }: { label: string; value: string | null | undefined }) {
  const showEmpty = useContext(ShowEmptyContext);
  const display = val(v);
  if (!showEmpty && !isFilled(v)) return null;
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd className={cn(!isFilled(v) && styles.emptyValue)}>{isFilled(v) ? display : 'Not provided'}</dd>
    </div>
  );
}

function MediaField({ label, value, onOpen }: { label: string; value: string | null | undefined; onOpen: (url: string) => void }) {
  const url = mediaUrl(value);
  if (!url) return <Field label={label} value={value} />;
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd>{/\.pdf(?:[?#]|$)/i.test(url)
        ? <a href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">Open PDF</a>
        : <button type="button" onClick={() => onOpen(url)} className="text-xs font-semibold text-blue-600 hover:underline">View image</button>}</dd>
    </div>
  );
}

interface CustomerHistoryTraffic {
  id: number | string;
  tanggal_berkunjung?: string;
  location?: string;
  served_by?: string;
  customer_advisor?: string;
  status?: string;
  prospect_item?: string;
  minat_barang?: string;
  detail_items?: string;
  gross_sales?: number;
  disc_pct?: number;
  net_sales?: number;
  notes?: string;
  bukti_chat?: string;
  siapa?: string;
  akses_masuk?: string;
}

interface CustomerHistorySales {
  id: number | string;
  doc_date?: string;
  doc_num?: string;
  store?: string;
  item_code?: string;
  item_name?: string;
  product_line?: string;
  collection?: string;
  qty?: number;
  net_sales?: number;
}

interface CustomerHistoryData {
  summary: {
    totalVisits: number;
    totalSalesTransactions: number;
    totalLifetimeSales: number;
    lastVisitDate: string | null;
    topCollections: (string | { name: string; spend: number })[];
  };
  trafficVisits: CustomerHistoryTraffic[];
  salesTransactions: CustomerHistorySales[];
}

export function ProfileModal({ row, onClose }: { row: CrmProfilingRow; onClose: () => void }) {
  const [showEmpty, setShowEmpty] = useState(false);
  const [modalTab, setModalTab] = useState<'profile' | 'traffic' | 'sales'>('profile');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyData, setHistoryData] = useState<CustomerHistoryData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [historyRevision, setHistoryRevision] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!previewImage) return;
    const dialog = dialogRef.current;
    previewRef.current?.querySelector('button')?.focus();
    return () => dialog?.focus();
  }, [previewImage]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => { document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (previewImage) setPreviewImage(null); else onClose();
      }
      if (event.key === 'Tab') {
        const scope = previewImage ? previewRef.current : dialogRef.current;
        const elements = scope?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (!scope?.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === scope)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, previewImage]);

  const fullName = row.full_name_tittle || row.nama_lengkap || `${row.nama_depan || ''} ${row.nama_belakang || ''}`.trim() || '—';

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const fetchCustomerHistory = async () => {
      setHistoryLoading(true);
      try {
        const params = new URLSearchParams({
          action: 'get_customer_history',
          name: row.nama_lengkap || `${row.nama_depan || ''} ${row.nama_belakang || ''}`.trim() || fullName,
          phone: row.no_hp || '',
          email: row.email || '',
        });
        const res = await fetch(`/api/crm/dedup?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('History unavailable');
        if (isMounted && data.success) {
          setHistoryData(data);
        }
      } catch {
        if (isMounted && !controller.signal.aborted) setHistoryError('Unable to load visit and purchase history.');
      } finally {
        if (isMounted) setHistoryLoading(false);
      }
    };

    fetchCustomerHistory();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [row, fullName, historyRevision]);

  const getTrafficStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('closing')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('prospect')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('browsing')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const visitsCount = historyData?.summary.totalVisits ?? 0;
  const salesCount = historyData?.summary.totalSalesTransactions ?? 0;
  const lifetimeSales = historyData?.summary.totalLifetimeSales ?? 0;

  return (
    <>
      <div
        className={styles.backdrop}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Client profile" tabIndex={-1} className={styles.dialog}>
          <ProfileHeader row={row} fullName={fullName} store={storeBadge(row.lokasi_store)} loading={historyLoading} error={historyError}
            visits={visitsCount} sales={salesCount} lifetimeSales={lifetimeSales} lastVisit={fmtDate(historyData?.summary.lastVisitDate ?? null)} tab={modalTab}
            onTab={tab => { setModalTab(tab); bodyRef.current?.scrollTo({ top: 0 }); }} onClose={onClose} onPhoto={() => setPreviewImage(mediaUrl(row.foto_customer))}
            onRetry={() => { setHistoryError(''); setHistoryLoading(true); setHistoryRevision(value => value + 1); }} />

          {/* Modal Body */}
          <div ref={bodyRef} className={styles.body}>
            {/* ── TAB 1: PROFIL & PREFERENSI ── */}
            {modalTab === 'profile' && (
              <ShowEmptyContext.Provider value={showEmpty}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-sm font-semibold text-slate-900">Personal details & preferences</h3><p className="mt-1 text-xs text-slate-400">A closer look at what matters to this client.</p></div>
                  <button type="button" aria-pressed={showEmpty} onClick={() => setShowEmpty(value => !value)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-blue-300">
                    <span className={cn('h-3 w-3 rounded border', showEmpty ? 'border-blue-600 bg-blue-600' : 'border-slate-300')} />Show empty fields
                  </button>
                </div>
                <div className={styles.profileGrid}>
                {/* Contact */}
                <Section title="Contact & identity" icon={Phone} wide>
                  <Field label="Phone number" value={row.no_hp} />
                  <Field label="Email" value={row.email} />
                  <MediaField label="ID / Passport" value={row.ktp_passport} onOpen={setPreviewImage} />
                  <MediaField label="Customer photo" value={row.foto_customer} onOpen={setPreviewImage} />
                  <Field label="Customer Advisor" value={row.customer_advisor} />
                  <Field label="Date of birth" value={fmtDate(row.tanggal_lahir)} />
                  <Field label="Age" value={row.umur} />
                  <Field label="Profile created" value={fmtDate(row.tanggal_input)} />
                  <Field label="Boutique" value={row.lokasi_store} />
                </Section>

                {/* Demographics */}
                <Section title="Demographics" icon={Globe}>
                  <Field label="Residence" value={row.domisili} />
                  <Field label="Overseas residence" value={row.domisili_luar_negeri} />
                  <Field label="Ethnicity" value={row.etnis} />
                  <Field label="Religion" value={row.agama} />
                  <Field label="Nationality" value={row.kewarganegaraan} />
                </Section>

                {/* Work & lifestyle */}
                <Section title="Work & lifestyle" icon={Briefcase}>
                  <Field label="Occupation" value={row.pekerjaan} />
                  <Field label="Fashion Style" value={row.fashion_style} />
                  <Field label="Body type" value={row.bentuk_tubuh} />
                  <Field label="Height" value={row.tinggi_badan} />
                  <Field label="Favorite color" value={row.warna_favorit} />
                </Section>

                {/* Food & drink */}
                <Section title="Food & drink" icon={UtensilsCrossed}>
                  <Field label="Favorite cake" value={row.cake_favorit} />
                  <Field label="Favorite food" value={row.makanan_favorit} />
                  <Field label="Favorite drink" value={row.minuman_favorit} />
                  <Field label="Food allergies" value={row.alergi_makanan} />
                </Section>

                {/* Hobby & Interests */}
                <Section title="Hobbies & interests" icon={Heart}>
                  <Field label="Hobby" value={row.hobby} />
                  <Field label="Hobby category" value={row.hobby_kategori} />
                  <Field label="Specific hobby" value={row.hobby_sub} />
                  <Field label="Other hobbies" value={row.hobby_others} />
                  <Field label="Travel destinations" value={row.tempat_liburan_favorit} />
                  <Field label="Favorite topics" value={row.topik_pembicaraan_favorit} />
                </Section>

                {/* Family */}
                <Section title="Family" icon={Users}>
                  <Field label="Marital status" value={row.status_pernikahan} />
                  <Field label="Wedding anniversary" value={fmtDate(row.tanggal_pernikahan)} />
                  <Field label="Has children" value={row.memiliki_anak} />
                  <Field label="Number of children" value={row.jumlah_anak} />
                </Section>

                {/* Social & personality */}
                <Section title="Social & personality" icon={AtSign}>
                  <Field label="Instagram" value={row.instagram} />
                  <Field label="TikTok" value={row.tiktok} />
                  <Field label="Personality" value={row.karakter} />
                  <Field label="Purchase motivation" value={row.faktor_pemicu_pembelian} />
                  <Field label="Product interests" value={row.barang_antusias} />
                </Section>
                </div>
              </ShowEmptyContext.Provider>
            )}

            {/* ── TAB 2: RIWAYAT KUNJUNGAN TOKO ── */}
            {modalTab === 'traffic' && !historyError && (
              <div>
                {historyLoading ? (
                  <div className="py-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-xs font-medium">Loading store visits...</p>
                  </div>
                ) : !historyData?.trafficVisits || historyData.trafficVisits.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Store className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No visits recorded</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No boutique visits are recorded for this client.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-700">
                        Total {historyData.trafficVisits.length} recorded visits
                      </p>
                      <span className="text-[11px] text-slate-400">Most recent visits first</span>
                    </div>

                    <div className="space-y-3">
                      {historyData.trafficVisits.map((visit, vIdx) => (
                        <div
                          key={visit.id || vIdx}
                          className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-4 shadow-sm transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                {fmtDate(visit.tanggal_berkunjung || null)}
                              </span>
                              <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', storeBadgeColor(visit.location || ''))}>
                                {visit.location || 'Store —'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {visit.status && (
                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', getTrafficStatusBadge(visit.status))}>
                                  {visit.status}
                                </span>
                              )}
                              {visit.prospect_item && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  {visit.prospect_item}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Sales Advisor</p>
                              <p className="font-semibold text-slate-800">{visit.served_by || visit.customer_advisor || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Interest / collection</p>
                              <p className="font-semibold text-slate-800">{visit.minat_barang || visit.detail_items || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Net Sales Closing</p>
                              <p className={cn(
                                'font-black',
                                (visit.net_sales || 0) > 0 ? 'text-emerald-700' : 'text-slate-400'
                              )}>
                                <Amt value={Number(visit.net_sales) || 0} />
                              </p>
                            </div>
                          </div>

                          {(visit.notes || visit.siapa || visit.bukti_chat) && (
                            <div className="pt-2 border-t border-slate-100 flex items-start justify-between gap-4 text-xs">
                              <div className="space-y-1 flex-1">
                                {visit.notes && (
                                  <p className="text-slate-600 italic">
                                    &ldquo;{visit.notes}&rdquo;
                                  </p>
                                )}
                                {visit.siapa && (
                                  <p className="text-[10px] text-slate-400">
                                    Visited with: <span className="font-medium text-slate-600">{visit.siapa}</span>
                                  </p>
                                )}
                              </div>

                              {visit.bukti_chat && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(mediaUrl(visit.bukti_chat))}
                                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shrink-0"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  Chat attachment
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 3: RIWAYAT TRANSAKSI POS ── */}
            {modalTab === 'sales' && !historyError && (
              <div>
                {historyLoading ? (
                  <div className="py-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-xs font-medium">Loading POS purchases...</p>
                  </div>
                ) : !historyData?.salesTransactions || historyData.salesTransactions.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <ShoppingBag className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No purchases found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No POS purchases were found for this client.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Top Collections Chips */}
                    {historyData.summary.topCollections && historyData.summary.topCollections.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Favorite collections:
                        </span>
                        {historyData.summary.topCollections.map((col, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-xs font-black px-2.5 py-1 bg-white border border-slate-200 text-slate-800 rounded-xl shadow-xs"
                          >
                            {typeof col === 'string' ? col : col.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sales Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="p-3">Date</th>
                              <th className="p-3">Invoice no.</th>
                              <th className="p-3">Boutique</th>
                              <th className="p-3">Collection / line</th>
                              <th className="p-3">Product description</th>
                              <th className="p-3 text-center">Qty</th>
                              <th className="p-3 text-right">Net Sales</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {historyData.salesTransactions.map((tx, tIdx) => (
                              <tr key={tx.id || tIdx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                                  {fmtDate(tx.doc_date || null)}
                                </td>
                                <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                                  {tx.doc_num || '—'}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', storeBadgeColor(tx.store || ''))}>
                                    {tx.store || '—'}
                                  </span>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className="font-bold text-slate-900">{tx.collection || '—'}</span>
                                  {tx.product_line && (
                                    <span className="text-[10px] text-slate-400 block">{tx.product_line}</span>
                                  )}
                                </td>
                                <td className="p-3 max-w-[200px] truncate" title={tx.item_name || ''}>
                                  <span className="text-slate-900 font-semibold block truncate">{tx.item_name || '—'}</span>
                                  {tx.item_code && <span className="text-[10px] font-mono text-slate-400">{tx.item_code}</span>}
                                </td>
                                <td className="p-3 text-center font-bold text-slate-800">
                                  {tx.qty ?? 1}
                                </td>
                                <td className="p-3 text-right font-black text-emerald-700 whitespace-nowrap">
                                  <Amt value={tx.net_sales || 0} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900 text-xs">
                            <tr>
                              <td colSpan={5} className="p-3 text-right uppercase tracking-wider text-[10px] font-black text-slate-500">
                                Total Lifetime Net Sales:
                              </td>
                              <td className="p-3 text-center font-black">
                                {historyData.salesTransactions.reduce((sum, item) => sum + (item.qty ?? 1), 0)}
                              </td>
                              <td className="p-3 text-right font-black text-emerald-700 text-sm">
                                <Amt value={lifetimeSales} />
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <footer className={styles.footer}>
            <div className="flex flex-wrap gap-x-4 gap-y-1"><span>Created {fmtDate(row.created_at)}</span><span>Updated {fmtDate(row.updated_at)}</span></div>
            <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Close<span className="rounded border border-slate-200 px-1 text-[9px] text-slate-400">Esc</span></button>
          </footer>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div ref={previewRef} role="dialog" aria-modal="true" aria-label="Client attachment" className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Close attachment"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-900/60 text-white flex items-center justify-center hover:bg-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {failedPreview === previewImage ? <div className="p-12 text-center"><ImageIcon className="mx-auto mb-3 h-8 w-8 text-slate-400" /><p className="text-sm text-slate-600">This image is currently unavailable.</p></div> : (
              // Authenticated media is loaded directly with session cookies.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewImage} alt="Client attachment" onError={() => setFailedPreview(previewImage)} className="w-full h-full object-contain rounded-xl max-h-[80vh]" />
            )}
          </div>
        </div>
      )}
    </>
  );
}


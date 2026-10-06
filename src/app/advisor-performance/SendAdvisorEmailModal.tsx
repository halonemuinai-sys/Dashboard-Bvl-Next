'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Users,
  Store,
  Trophy,
  ExternalLink,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SendAdvisorEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: string;
  year: string;
}

export default function SendAdvisorEmailModal({
  isOpen,
  onClose,
  month,
  year,
}: SendAdvisorEmailModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [advisorsCount, setAdvisorsCount] = useState<number>(0);
  const [ytdCount, setYtdCount] = useState<number>(0);
  const [stores, setStores] = useState<string[]>([]);

  // Email form state
  const [emailTo, setEmailTo] = useState('aris@mraretail.co.id');
  const [ccEmail, setCcEmail] = useState('jessica@mogems.co.id, aris@mraretail.co.id');

  // Sending state
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Load preview whenever modal opens or month/year changes
  const loadPreview = async () => {
    setLoadingPreview(true);
    setSendSuccess(null);
    setSendError(null);
    try {
      const res = await fetch('/api/send-advisor-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, action: 'preview' }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewHtml(data.html || '');
        setSubject(data.subject || `Advisor Performance Report - ${month} ${year} | Bvlgari Indonesia`);
        setAdvisorsCount(data.advisorsCount || 0);
        setYtdCount(data.ytdCount || 0);
        setStores(data.stores || []);
      } else {
        setSendError(data.error || 'Gagal memuat preview email.');
      }
    } catch (err: any) {
      setSendError(err.message || 'Terjadi kesalahan saat memuat preview email.');
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPreview();
    }
  }, [isOpen, month, year]);

  const handleSend = async () => {
    if (!emailTo.trim()) {
      setSendError('Alamat email penerima (To) wajib diisi.');
      return;
    }
    setSending(true);
    setSendSuccess(null);
    setSendError(null);
    try {
      const res = await fetch('/api/send-advisor-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          year,
          emailTo: emailTo.trim(),
          ccEmail: ccEmail.trim(),
          action: 'send'
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSendSuccess(`Email laporan berhasil terkirim ke ${emailTo}! (Message ID: ${json.messageId || 'OK'})`);
      } else {
        setSendError(json.error || 'Gagal mengirim email laporan.');
      }
    } catch (err: any) {
      setSendError(err.message || 'Terjadi kesalahan sistem saat mengirim email.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                <span>Laporan Email Advisor Performance</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-blue-500/20 text-blue-300 font-bold">
                  {month} {year}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Template Resmi Outlook / Webmail &bull; Bvlgari Indonesia (MRA Retail)
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={sending}
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader / Tabs & Meta pills */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                activeTab === 'preview'
                  ? "bg-blue-600 text-white shadow-2xs shadow-blue-500/30"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Tampilan Email (Live Preview)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                activeTab === 'settings'
                  ? "bg-blue-600 text-white shadow-2xs shadow-blue-500/30"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              )}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Penerima & Pengaturan</span>
            </button>
          </div>

          {/* Quick Info Badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span><strong>{advisorsCount}</strong> Advisors Aktif</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hidden sm:inline-flex">
              <Store className="w-3.5 h-3.5 text-amber-600" />
              <span><strong>{stores.length}</strong> Butik ({stores.join(', ')})</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hidden md:inline-flex">
              <Trophy className="w-3.5 h-3.5 text-emerald-600" />
              <span><strong>{ytdCount}</strong> YTD Ranked</span>
            </span>
            <button
              type="button"
              onClick={loadPreview}
              disabled={loadingPreview}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
              title="Refresh Data & Tampilan"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loadingPreview && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 min-h-[420px]">
          {loadingPreview ? (
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold">Menghasilkan tampilan laporan email...</p>
              <p className="text-xs text-slate-400">Menyusun data bulanan dan kalkulasi YTD untuk {month} {year}</p>
            </div>
          ) : activeTab === 'preview' ? (
            /* TAB 1: PREVIEW TAMPILAN EMAIL */
            <div className="space-y-4">
              {/* Email Envelope Header Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-medium">Subjek Email:</span>
                  <span className="font-bold text-slate-900 font-mono text-right">{subject}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-medium">Kepada (To):</span>
                  <span className="font-semibold text-blue-700">{emailTo}</span>
                </div>
                {ccEmail && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-400 font-medium">Tembusan (CC):</span>
                    <span className="text-slate-600 font-mono text-[11px]">{ccEmail}</span>
                  </div>
                )}
              </div>

              {/* Email HTML Container Frame */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 sm:p-6 overflow-x-auto max-w-[760px] mx-auto">
                <div
                  className="email-rendered-preview"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          ) : (
            /* TAB 2: PENGATURAN & PENERIMA */
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>Pengaturan Pengiriman Email</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan alamat email penerima laporan kinerja Advisor untuk periode <strong>{month} {year}</strong>.
                </p>
              </div>

              {/* To Recipient Field */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email Penerima Utama (To) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  placeholder="aris@mraretail.co.id"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                />
                {/* Quick email presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Pilih Cepat:</span>
                  {[
                    'aris@mraretail.co.id',
                    'pi@mogems.co.id',
                    'ps@mogems.co.id',
                    'bali@mogems.co.id',
                    'retail@mogems.co.id'
                  ].map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmailTo(e)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer",
                        emailTo === e
                          ? "bg-blue-600 text-white font-bold"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* CC Recipient Field */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email Tembusan (CC)
                </label>
                <input
                  type="text"
                  value={ccEmail}
                  onChange={e => setCcEmail(e.target.value)}
                  placeholder="jessica@mogems.co.id, natalia@mraretail.co.id, aris@mraretail.co.id"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">Pilihan cepat:</span>
                  {[
                    { label: 'Jessica', email: 'jessica@mogems.co.id' },
                    { label: 'Natalia', email: 'natalia@mraretail.co.id' },
                    { label: 'Aris', email: 'aris@mraretail.co.id' },
                  ].map(chip => (
                    <button
                      key={chip.email}
                      type="button"
                      onClick={() => {
                        const list = ccEmail.split(',').map(s => s.trim()).filter(Boolean);
                        if (!list.includes(chip.email)) {
                          setCcEmail(list.length ? `${ccEmail}, ${chip.email}` : chip.email);
                        }
                      }}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      + {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Field (Read-only preview) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Subjek Email (Otomatis)
                </label>
                <input
                  type="text"
                  readOnly
                  value={subject}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs text-slate-700 select-all cursor-default"
                />
              </div>

              {/* Notes */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Informasi Pengiriman</span>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-800">
                  Laporan akan dikirim menggunakan koneksi SMTP terkonfigurasi. Format email telah dioptimalkan agar tampil sempurna di aplikasi desktop Microsoft Outlook, Apple Mail, dan aplikasi smartphone.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="w-full sm:w-auto">
            {sendSuccess && (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{sendSuccess}</span>
              </div>
            )}
            {sendError && (
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{sendError}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={sending}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              {sendSuccess ? 'Tutup' : 'Batal'}
            </button>
            <button
              type="button"
              disabled={sending || loadingPreview}
              onClick={handleSend}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer",
                sending
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-95"
              )}
            >
              {sending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengirim Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Email Laporan Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  FileSpreadsheet,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Paperclip,
  Check
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface SendDailyEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onGeneratePdf: () => Promise<string | undefined>;
  onGenerateExcel: () => Promise<string | undefined>;
}

export default function SendDailyEmailModal({
  isOpen,
  onClose,
  date,
  onGeneratePdf,
  onGenerateExcel,
}: SendDailyEmailModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [displayDate, setDisplayDate] = useState<string>('');
  const [totalStoreSales, setTotalStoreSales] = useState<number>(0);
  const [totalSalesAll, setTotalSalesAll] = useState<number>(0);
  const [storeAchievement, setStoreAchievement] = useState<number>(0);

  // Email recipient state
  const [emailTo, setEmailTo] = useState('aldi@mraretail.co.id, aris@mraretail.co.id');
  const [ccEmail, setCcEmail] = useState('jessica@mogems.co.id, aris@mraretail.co.id');

  // Attachment toggles
  const [attachPdf, setAttachPdf] = useState(true);
  const [attachExcel, setAttachExcel] = useState(true);

  // Sending state
  const [sending, setSending] = useState(false);
  const [sendStep, setSendStep] = useState<string>('');
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Load preview whenever modal opens or date changes
  const loadPreview = async () => {
    setLoadingPreview(true);
    setSendSuccess(null);
    setSendError(null);
    try {
      const res = await fetch('/api/reports/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          action: 'preview',
          pdfFilename: `Daily Sales Report - ${date}.pdf`,
          excelFilename: `Daily_Sales_Report_${date}.xlsx`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewHtml(data.html || '');
        setSubject(data.subject || `Laporan Penjualan Harian Bulgari Indonesia : ${date}`);
        setDisplayDate(data.displayDate || date);
        setTotalStoreSales(data.totalStoreSales || 0);
        setTotalSalesAll(data.totalSalesAll || 0);
        setStoreAchievement(data.storeAchievement || 0);
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
  }, [isOpen, date]);

  const handleSend = async () => {
    if (!emailTo.trim()) {
      setSendError('Alamat email penerima (To) wajib diisi.');
      return;
    }

    setSending(true);
    setSendSuccess(null);
    setSendError(null);

    try {
      let pdfBase64: string | undefined;
      let excelBase64: string | undefined;

      // Step 1: Generate attachments if enabled
      if (attachPdf || attachExcel) {
        setSendStep('Menyiapkan lampiran dokumen PDF & Excel...');
        if (attachPdf) {
          try {
            pdfBase64 = await onGeneratePdf();
          } catch (e: any) {
            console.error('Error generating PDF:', e);
          }
        }
        if (attachExcel) {
          try {
            excelBase64 = await onGenerateExcel();
          } catch (e: any) {
            console.error('Error generating Excel:', e);
          }
        }
      }

      // Step 2: Send email via API
      setSendStep('Mengirim email via SMTP...');
      const res = await fetch('/api/reports/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          emailTo: emailTo.trim(),
          ccEmail: ccEmail.trim(),
          pdfBase64: attachPdf ? pdfBase64 : undefined,
          excelBase64: attachExcel ? excelBase64 : undefined,
          pdfFilename: `Daily Sales Report - ${date}.pdf`,
          excelFilename: `Daily_Sales_Report_${date}.xlsx`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        const attachCount = json.attachmentsCount ?? ((attachPdf ? 1 : 0) + (attachExcel ? 1 : 0));
        setSendSuccess(
          `Email laporan harian berhasil dikirim ke ${emailTo}! (${attachCount} lampiran disertakan)`
        );
      } else {
        setSendError(json.error || 'Gagal mengirim email laporan harian.');
      }
    } catch (err: any) {
      setSendError(err.message || 'Terjadi kesalahan sistem saat mengirim email.');
    } finally {
      setSending(false);
      setSendStep('');
    }
  };

  const addRecipientChip = (email: string, target: 'to' | 'cc') => {
    if (target === 'to') {
      const currentList = emailTo.split(',').map(s => s.trim()).filter(Boolean);
      if (!currentList.includes(email)) {
        setEmailTo(currentList.length ? `${emailTo}, ${email}` : email);
      }
    } else {
      const currentList = ccEmail.split(',').map(s => s.trim()).filter(Boolean);
      if (!currentList.includes(email)) {
        setCcEmail(currentList.length ? `${ccEmail}, ${email}` : email);
      }
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
            <span className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                <span>Laporan Email Daily Sales Report</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-amber-500/20 text-amber-300 font-bold">
                  {displayDate || date}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pratinjau tampilan email & pengaturan lampiran dokumen sebelum dikirim
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadPreview}
              disabled={loadingPreview || sending}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Muat ulang preview"
            >
              <RefreshCw className={cn("w-4 h-4", loadingPreview && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector & Summary Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === 'preview'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Tampilan Email (Live Preview)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === 'settings'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>Penerima & Lampiran</span>
            </button>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Store: <b>{formatCurrency(totalStoreSales)}</b></span>
            </span>
            <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>MTD Achv: <b className={storeAchievement >= 100 ? 'text-blue-600' : storeAchievement >= 80 ? 'text-emerald-600' : 'text-rose-600'}>{storeAchievement.toFixed(1)}%</b></span>
            </span>
            <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-lg font-semibold">
              <Paperclip className="w-3.5 h-3.5 text-amber-600" />
              <span>{(attachPdf ? 1 : 0) + (attachExcel ? 1 : 0)} Lampiran</span>
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50">
          {/* Status Message Alerts */}
          {sendSuccess && (
            <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Email Berhasil Dikirim!</p>
                <p className="text-xs text-emerald-700 mt-0.5">{sendSuccess}</p>
              </div>
            </div>
          )}

          {sendError && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Pengiriman Gagal</p>
                <p className="text-xs text-rose-700 mt-0.5">{sendError}</p>
              </div>
            </div>
          )}

          {activeTab === 'preview' ? (
            <div className="space-y-4">
              {/* Mail Client Mock Window */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Mock Mail Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                      <span className="font-bold text-slate-700 ml-2">Subjek:</span>
                      <span className="text-slate-900 font-medium select-all">{subject}</span>
                    </div>
                    <span className="text-slate-400 text-[11px] font-mono">{displayDate}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-semibold inline-block w-14">From:</span>
                      <span className="text-slate-700 font-mono">Bvlgari Dashboard &lt;noreply@mogems.co.id&gt;</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold inline-block w-14">To:</span>
                      <span className="text-slate-900 font-mono font-medium">{emailTo || '-'}</span>
                    </div>
                    {ccEmail && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 font-semibold inline-block w-14">CC:</span>
                        <span className="text-slate-600 font-mono">{ccEmail}</span>
                      </div>
                    )}
                  </div>

                  {/* Attachment Preview Badges */}
                  {(attachPdf || attachExcel) && (
                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
                      <span className="text-slate-400 font-semibold text-[11px]">Lampiran:</span>
                      {attachPdf && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                          <FileText className="w-3.5 h-3.5 text-rose-600" />
                          <span>Daily Sales Report - {date}.pdf</span>
                          <span className="text-[10px] text-rose-500 font-normal">(Executive Summary)</span>
                        </span>
                      )}
                      {attachExcel && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Daily_Sales_Report_{date}.xlsx</span>
                          <span className="text-[10px] text-emerald-500 font-normal">(Overview & Details)</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Body Viewer */}
                <div className="relative min-h-[460px] bg-slate-50 flex items-center justify-center">
                  {loadingPreview ? (
                    <div className="py-20 flex flex-col items-center gap-3 text-slate-500">
                      <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
                      <p className="text-sm font-medium">Memuat pratinjau isi email harian...</p>
                    </div>
                  ) : previewHtml ? (
                    <iframe
                      title="Daily Report Email Preview"
                      srcDoc={previewHtml}
                      className="w-full h-[580px] bg-white border-0"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="py-20 text-center text-slate-400 italic text-sm">
                      Tidak ada pratinjau email yang tersedia.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Settings & Recipients Tab */
            <div className="max-w-2xl mx-auto space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Pengaturan Penerima & Dokumen</h3>
                <p className="text-xs text-slate-500">
                  Konfigurasikan alamat tujuan email dan pilih berkas lampiran yang akan dikirimkan bersama laporan.
                </p>
              </div>

              {/* Email To */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email Penerima Utama (To) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  placeholder="contoh: aldi@mraretail.co.id, aris@mraretail.co.id"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:bg-white font-mono transition-colors"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">Pilihan cepat:</span>
                  {[
                    { label: 'Aldi', email: 'aldi@mraretail.co.id' },
                    { label: 'Aris', email: 'aris@mraretail.co.id' },
                    { label: 'Jessica', email: 'jessica@mogems.co.id' },
                  ].map(chip => (
                    <button
                      key={chip.email}
                      type="button"
                      onClick={() => addRecipientChip(chip.email, 'to')}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      + {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email CC */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email Tembusan (CC)
                </label>
                <input
                  type="text"
                  value={ccEmail}
                  onChange={e => setCcEmail(e.target.value)}
                  placeholder="contoh: jessica@mogems.co.id, finance@mogems.co.id"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:bg-white font-mono transition-colors"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">Pilihan cepat:</span>
                  {[
                    { label: 'Jessica', email: 'jessica@mogems.co.id' },
                    { label: 'Aris', email: 'aris@mraretail.co.id' },
                  ].map(chip => (
                    <button
                      key={chip.email}
                      type="button"
                      onClick={() => addRecipientChip(chip.email, 'cc')}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      + {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lampiran Dokumen Section */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pilihan Berkas Lampiran (Attachments)
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* PDF Toggle */}
                  <div
                    onClick={() => setAttachPdf(!attachPdf)}
                    className={cn(
                      "p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none",
                      attachPdf
                        ? "border-rose-400 bg-rose-50/50"
                        : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-white transition-colors",
                      attachPdf ? "bg-rose-600" : "bg-slate-300"
                    )}>
                      {attachPdf && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-rose-600" />
                        <span className="text-xs font-bold text-slate-800">Berkas PDF</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Executive Summary format A4 dengan tata letak visual elegan.
                      </p>
                    </div>
                  </div>

                  {/* Excel Toggle */}
                  <div
                    onClick={() => setAttachExcel(!attachExcel)}
                    className={cn(
                      "p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none",
                      attachExcel
                        ? "border-emerald-400 bg-emerald-50/50"
                        : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-white transition-colors",
                      attachExcel ? "bg-emerald-600" : "bg-slate-300"
                    )}>
                      {attachExcel && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800">Berkas Excel (.xlsx)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Overview global dan detail rincian produk per butik.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subjek Preview */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Subjek Email yang Dihasilkan
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700">
                  {subject || `Laporan Penjualan Harian Bulgari Indonesia : ${date}`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            {sending ? (
              <span className="flex items-center gap-2 text-amber-700 font-medium">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{sendStep || 'Sedang memproses...'}</span>
              </span>
            ) : (
              <span>Pastikan angka dan lampiran sudah sesuai sebelum pengiriman.</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || loadingPreview}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Email Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

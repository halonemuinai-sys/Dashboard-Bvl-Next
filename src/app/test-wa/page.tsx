"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertCircle, RefreshCw, MessageSquare, BarChart3 } from "lucide-react";
import { testWhatsAppAction, sendDailyReportAction } from "../actions/whatsappActions";

export default function TestWhatsAppPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await testWhatsAppAction(phoneNumber);
      if (res.success) {
        setStatus({ type: 'success', msg: "Pesan berhasil dikirim! Periksa WhatsApp Anda." });
      } else {
        setStatus({ type: 'error', msg: "Gagal mengirim pesan. Pastikan nomor sudah diverifikasi di Meta Dashboard." });
        console.error(res.error);
      }
    } catch (err) {
      setStatus({ type: 'error', msg: "Terjadi kesalahan sistem." });
    } finally {
      setLoading(false);
    }
  };

  const handleSendReport = async () => {
    if (!phoneNumber) return;
    setReportLoading(true);
    setStatus(null);

    try {
      const res = await sendDailyReportAction(phoneNumber);
      if (res.success) {
        setStatus({ type: 'success', msg: "Laporan Sales Harian berhasil dikirim ke WhatsApp!" });
      } else {
        // @ts-ignore
        const errorMsg = res.message || "Gagal mengirim laporan. Pastikan sudah ada transaksi hari ini.";
        setStatus({ type: 'error', msg: errorMsg });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: "Terjadi kesalahan saat mengambil data." });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-100 rounded-2xl">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">WhatsApp Test</h1>
            <p className="text-slate-500 text-sm">Uji integrasi Meta Cloud API</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Nomor WhatsApp Penerima
            </label>
            <input
              type="text"
              placeholder="Contoh: 628123456789"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleSend}
              disabled={loading || reportLoading || !phoneNumber}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {loading ? "Mengirim..." : "Kirim Template Hello World"}
            </button>

            <button
              onClick={handleSendReport}
              disabled={loading || reportLoading || !phoneNumber}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {reportLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <BarChart3 className="w-5 h-5" />}
              {reportLoading ? "Mengolah Data..." : "Kirim Laporan Sales Hari Ini"}
            </button>
          </div>
        </div>

        {status && (
          <div className={`mt-6 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <p className="text-sm font-medium">{status.msg}</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center">
            Integrasi ini menggunakan template <code>hello_world</code> default dari Meta.
          </p>
        </div>
      </div>
      
      <a href="/" className="mt-8 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors">
         Kembali ke Dashboard
      </a>
    </div>
  );
}

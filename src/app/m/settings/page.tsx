'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Building2, RefreshCcw, LogOut, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function MobileSettingsPage() {
  const router = useRouter();
  const [advisorName, setAdvisorName] = useState('');
  const [advisorRole, setAdvisorRole] = useState('');
  const [advisorStore, setAdvisorStore] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    setAdvisorName(localStorage.getItem('mobile_advisor_name') || '');
    setAdvisorRole(localStorage.getItem('mobile_advisor_role') || 'advisor');
    setAdvisorStore(localStorage.getItem('mobile_advisor_store') || 'Plaza Indonesia');
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('Menjalankan ETL Sync di Proxmox...');

    try {
      const res = await fetch('/api/mobile/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: advisorStore }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMsg(`Sync Selesai! ${data.inserted || 0} data baru dimasukkan.`);
      } else {
        setSyncMsg(`Error: ${data.error}`);
      }
    } catch (e) {
      setSyncMsg('Gagal terhubung ke Proxmox server');
    } fontally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mobile_token');
    localStorage.removeItem('mobile_advisor_name');
    localStorage.removeItem('mobile_advisor_role');
    localStorage.removeItem('mobile_advisor_store');
    router.push('/m/login');
  };

  return (
    <div className="space-y-4">
      
      {/* Account Info Tile */}
      <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-3 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-extrabold text-base shadow-sm">
            {advisorName.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">{advisorName}</h3>
            <p className="text-xs text-indigo-600 font-semibold uppercase">{advisorRole}</p>
            <p className="text-[11px] text-slate-500 font-medium flex items-center mt-0.5">
              <Building2 className="w-3.5 h-3.5 mr-1" /> {advisorStore}
            </p>
          </div>
        </div>
      </div>

      {/* Sync Engine Tile */}
      <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-3 shadow-sm">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
          <RefreshCcw className="w-4 h-4 mr-1.5 text-indigo-600" /> Proxmox Server Sync
        </h4>
        <p className="text-xs text-slate-500">Tarik dan sinkronkan data penjualan terbaru dari Bvlgari API.</p>

        {syncMsg && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-xl p-3 flex items-center font-medium">
            <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 text-indigo-600" />
            <span>{syncMsg}</span>
          </div>
        )}

        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-3 rounded-xl border border-slate-200 flex items-center justify-center space-x-2 transition-all"
        >
          <RefreshCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Memproses Sync...' : 'Jalankan Server Sync'}</span>
        </button>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold py-3.5 rounded-2xl flex items-center justify-center space-x-2 transition-all mt-6 shadow-sm"
      >
        <LogOut className="w-4 h-4" />
        <span>Keluar dari Mobile Portal</span>
      </button>

    </div>
  );
}

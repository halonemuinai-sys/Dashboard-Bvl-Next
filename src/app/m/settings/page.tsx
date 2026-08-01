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
    } finally {
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
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg">
            {advisorName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">{advisorName}</h3>
            <p className="text-xs text-amber-400 font-semibold uppercase">{advisorRole}</p>
            <p className="text-[10px] text-slate-400 flex items-center mt-0.5">
              <Building2 className="w-3 h-3 mr-1" /> {advisorStore}
            </p>
          </div>
        </div>
      </div>

      {/* Sync Engine Tile */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center">
          <RefreshCcw className="w-3.5 h-3.5 mr-1 text-amber-400" /> Proxmox Server Sync
        </h4>
        <p className="text-xs text-slate-400">Tarik dan sinkronkan data penjualan terbaru dari Bvlgari API.</p>

        {syncMsg && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl p-2.5 flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span>{syncMsg}</span>
          </div>
        )}

        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold py-2.5 rounded-xl border border-slate-700 flex items-center justify-center space-x-2 transition-all"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Memproses Sync...' : 'Jalankan Server Sync'}</span>
        </button>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all mt-6"
      >
        <LogOut className="w-4 h-4" />
        <span>Keluar dari Mobile Portal</span>
      </button>

    </div>
  );
}

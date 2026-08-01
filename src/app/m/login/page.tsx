'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Building, ArrowRight, KeyRound, Sparkles } from 'lucide-react';

export default function MobileLoginPage() {
  const router = useRouter();
  const [store, setStore] = useState('Plaza Indonesia');
  const [advisorName, setAdvisorName] = useState('');
  const [pin, setPin] = useState('');
  const [advisors, setAdvisors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const stores = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

  useEffect(() => {
    // Demo advisor lists per store
    if (store === 'Plaza Indonesia') {
      setAdvisors(['Advisor 1', 'Advisor 2', 'Supervisor PI', 'Store Manager PI']);
    } else if (store === 'Plaza Senayan') {
      setAdvisors(['Advisor PS 1', 'Advisor PS 2', 'Store Manager PS']);
    } else {
      setAdvisors(['Advisor Bali 1', 'Advisor Bali 2', 'Store Manager Bali']);
    }
  }, [store]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorName || !pin) {
      setError('Pilih nama advisor dan masukkan PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/mobile/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advisorName, pin, store }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem('mobile_token', data.token);
        localStorage.setItem('mobile_advisor_name', data.advisor.name);
        localStorage.setItem('mobile_advisor_role', data.advisor.role);
        localStorage.setItem('mobile_advisor_store', data.advisor.store);
        router.push('/m');
      } else {
        setError(data.error || 'PIN atau nama advisor salah');
      }
    } catch (err) {
      setError('Gagal menghubungi server. Periksa koneksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 text-slate-100">
      
      {/* Header Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3">
          <Sparkles className="w-8 h-8 text-slate-950" />
        </div>
        <h1 className="text-xl font-extrabold tracking-wider text-slate-100 uppercase">MPI ADVISOR BVL</h1>
        <p className="text-xs text-slate-400 mt-1">Mobile Portal & Business Intelligence</p>
      </div>

      {/* Login Card */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-3 mb-4 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Store Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center">
              <Building className="w-3.5 h-3.5 mr-1 text-amber-400" /> Store Location
            </label>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
            >
              {stores.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Advisor Name Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center">
              <User className="w-3.5 h-3.5 mr-1 text-amber-400" /> Advisor Name
            </label>
            <input
              type="text"
              placeholder="Masukkan / pilih nama advisor"
              value={advisorName}
              onChange={(e) => setAdvisorName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* PIN Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center">
              <KeyRound className="w-3.5 h-3.5 mr-1 text-amber-400" /> Enter 4-Digit PIN
            </label>
            <input
              type="password"
              placeholder="••••"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-center tracking-[0.5em] text-lg font-bold text-amber-400 rounded-xl py-2.5 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="text-sm font-semibold">Memverifikasi...</span>
            ) : (
              <>
                <span className="text-sm">Masuk Portal</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>

        </form>
      </div>

      <p className="text-[10px] text-slate-500 mt-6">Powered by Proxmox & Next.js 15 BI Engine</p>

    </div>
  );
}

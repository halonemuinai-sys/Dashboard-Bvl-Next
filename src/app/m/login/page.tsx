'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Building2, ArrowRight, KeyRound, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

export default function MobileLoginPage() {
  const router = useRouter();
  const [store, setStore] = useState('Plaza Indonesia');
  const [advisorName, setAdvisorName] = useState('');
  const [pin, setPin] = useState('');
  const [advisors, setAdvisors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAdvisors, setLoadingAdvisors] = useState(false);
  const [error, setError] = useState('');

  const stores = ['Plaza Indonesia', 'Plaza Senayan', 'Bali', 'All Stores'];

  useEffect(() => {
    async function fetchAdvisors() {
      setLoadingAdvisors(true);
      try {
        const res = await fetch(`/api/mobile/auth/advisors?store=${encodeURIComponent(store)}`);
        const data = await res.json();
        if (data.success && data.advisors && data.advisors.length > 0) {
          setAdvisors(data.advisors);
          setAdvisorName(data.advisors[0]);
          setLoadingAdvisors(false);
          return;
        }
      } catch (err) {
        console.error('Failed to load advisors:', err);
      }

      // Fallback per store
      let list: string[] = [];
      if (store === 'Plaza Indonesia') {
        list = ['Supervisor PI', 'Store Manager PI', 'Advisor 1', 'Advisor 2'];
      } else if (store === 'Plaza Senayan') {
        list = ['Store Manager PS', 'Advisor PS 1', 'Advisor PS 2'];
      } else if (store === 'Bali') {
        list = ['Store Manager Bali', 'Advisor Bali 1', 'Advisor Bali 2'];
      } else {
        list = ['Ops Manager', 'Supervisor PI', 'Store Manager PS', 'Store Manager Bali'];
      }
      setAdvisors(list);
      setAdvisorName(list[0]);
      setLoadingAdvisors(false);
    }

    fetchAdvisors();
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800">
      
      {/* Container matching Flutter Mobile 400px Max Width */}
      <div className="w-full max-w-[400px] bg-white rounded-[32px] p-8 shadow-xl border border-slate-100 flex flex-col items-center">
        
        {/* Crest / Logo Section matching Flutter */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-2xl font-serif font-bold tracking-tight text-slate-900 text-center">
          Elite Advisor Portal
        </h1>
        <p className="text-xs text-slate-500 mt-1 mb-6 text-center">
          Masuk ke portal advisor Anda (MPI BVL)
        </p>

        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3 mb-4 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-4">
          
          {/* Store Location Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center">
              <Building2 className="w-4 h-4 mr-1.5 text-indigo-600" /> Store Location
            </label>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            >
              {stores.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Advisor Name Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center">
              <User className="w-4 h-4 mr-1.5 text-indigo-600" /> Advisor Name
            </label>
            {loadingAdvisors ? (
              <div className="w-full bg-slate-100 animate-pulse h-11 rounded-xl flex items-center justify-center text-xs text-slate-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> Memuat Advisor...
              </div>
            ) : (
              <select
                value={advisorName}
                onChange={(e) => setAdvisorName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                required
              >
                <option value="" disabled>-- Pilih Nama Advisor --</option>
                {advisors.map((adv) => (
                  <option key={adv} value={adv}>{adv}</option>
                ))}
              </select>
            )}
          </div>

          {/* PIN Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center">
              <KeyRound className="w-4 h-4 mr-1.5 text-indigo-600" /> Enter 4-Digit PIN
            </label>
            <input
              type="password"
              placeholder="••••"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-center tracking-[0.5em] text-xl font-bold text-indigo-600 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="text-sm font-semibold flex items-center">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Memverifikasi...
              </span>
            ) : (
              <>
                <span className="text-sm">Masuk Portal</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>

        </form>
      </div>

      <p className="text-xs text-slate-400 mt-6 font-medium">Powered by Proxmox BI & Next.js Engine</p>

    </div>
  );
}

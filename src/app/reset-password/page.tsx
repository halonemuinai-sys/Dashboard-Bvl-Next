"use client";

import { useState, useEffect, useActionState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Diamond, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { completePasswordReset, validateToken } from './actions';
import { cn } from '@/lib/utils';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [state, formAction, isPending] = useActionState(completePasswordReset, null);

  useEffect(() => {
    if (!token) {
      setCheckingToken(false);
      setTokenValid(false);
      setTokenError('Tautan reset password tidak memiliki token.');
      return;
    }

    (async () => {
      setCheckingToken(true);
      const res = await validateToken(token);
      if (res.valid) {
        setTokenValid(true);
        setUserEmail(res.email || '');
      } else {
        setTokenValid(false);
        setTokenError(res.error || 'Tautan reset tidak valid atau telah kedaluwarsa.');
      }
      setCheckingToken(false);
    })();
  }, [token]);

  // Auto redirect on success
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push('/login?success=Password berhasil diperbarui! Silakan masuk dengan password baru Anda.');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  // Password strength logic
  const hasLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const strengthScore = [hasLength, hasNumber, hasUpper, hasSpecial].filter(Boolean).length;

  if (checkingToken) {
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-10 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-sm font-bold text-slate-700">Memverifikasi tautan reset password...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 space-y-5 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900">Tautan Tidak Valid atau Kedaluwarsa</h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{tokenError}</p>
        </div>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md"
          >
            Minta Tautan Reset Baru
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-900">Buat Password Baru</h2>
        <p className="text-slate-500 text-xs mt-1">
          Untuk akun <strong className="text-slate-700 font-semibold">{userEmail}</strong>
        </p>
      </div>

      {state?.success ? (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-3 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <div>
            <h3 className="text-sm font-extrabold text-emerald-900">Password Berhasil Diperbarui!</h3>
            <p className="mt-1">{state.message}</p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <span>Menuju Halaman Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          {state?.error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 ml-1">
              Password Baru
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="block w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {newPassword.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                  <div className={cn("h-full flex-1 rounded-full transition-all duration-300", strengthScore >= 1 ? (strengthScore <= 2 ? "bg-amber-400" : "bg-emerald-500") : "bg-slate-200")} />
                  <div className={cn("h-full flex-1 rounded-full transition-all duration-300", strengthScore >= 2 ? (strengthScore <= 2 ? "bg-amber-400" : "bg-emerald-500") : "bg-slate-200")} />
                  <div className={cn("h-full flex-1 rounded-full transition-all duration-300", strengthScore >= 3 ? "bg-emerald-500" : "bg-slate-200")} />
                  <div className={cn("h-full flex-1 rounded-full transition-all duration-300", strengthScore >= 4 ? "bg-emerald-500" : "bg-slate-200")} />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                  <span>Kekuatan Password:</span>
                  <span className={cn(
                    "font-bold uppercase",
                    strengthScore <= 1 ? "text-rose-500" :
                    strengthScore <= 2 ? "text-amber-500" :
                    "text-emerald-600"
                  )}>
                    {strengthScore <= 1 ? "Lemah" : strengthScore <= 2 ? "Sedang" : "Kuat"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 ml-1">
              Konfirmasi Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="block w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">Konfirmasi password belum cocok.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || newPassword.length < 8 || newPassword !== confirmPassword}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Password...</span>
              </>
            ) : (
              <span>Simpan Password Baru</span>
            )}
          </button>
        </form>
      )}

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <Link
          href="/login"
          className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          Kembali ke Halaman Login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-xl shadow-amber-500/20 mb-4">
            <Diamond className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">MRA Retail</h1>
          <p className="text-amber-400 font-bold text-xs uppercase tracking-[0.25em] mt-1">
            Bvlgari Intelligence
          </p>
        </div>

        <Suspense fallback={<div className="bg-white p-8 rounded-3xl text-center text-xs">Memuat halaman...</div>}>
          <ResetPasswordContent />
        </Suspense>

        <p className="mt-8 text-center text-xs text-slate-500 font-medium">
          &copy; 2026 MRA Retail • Bvlgari Intelligence Systems
        </p>
      </div>
    </div>
  );
}

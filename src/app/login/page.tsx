"use client";

import { useState, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, LockKeyhole, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { login } from './actions';
import styles from './login.module.css';

function LoginFormContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const successParam = searchParams.get('success');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => { await login(formData); });
  };
  return (
    <div className={styles.formContent}>
      <span className={styles.eyebrow}>YOUR DAILY PERSPECTIVE</span>
      <h2>Welcome back.</h2>
      <p className={styles.intro}>Sign in to discover the story behind every achievement at your boutique.</p>
      {successParam && <div role="status" className={`${styles.notice} ${styles.success}`}><CheckCircle2 size={18} /><span>{successParam}</span></div>}
      {errorParam && <div role="alert" className={`${styles.notice} ${styles.error}`}><AlertCircle size={18} /><span>{errorParam}</span></div>}
      <form onSubmit={handleSubmit} aria-busy={isPending} className={styles.form}>
        <div>
          <label htmlFor="email">Email address</label>
          <div className={styles.inputWrap}>
            <Mail size={18} aria-hidden="true" />
            <input id="email" name="email" type="email" autoComplete="username" required placeholder="name@mraretail.co.id" />
          </div>
        </div>
        <div>
          <div className={styles.labelRow}><label htmlFor="password">Password</label><Link href="/forgot-password">Forgot password?</Link></div>
          <div className={styles.inputWrap}>
            <LockKeyhole size={18} aria-hidden="true" />
            <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required placeholder="Enter your password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className={styles.passwordToggle}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </div>
        <button type="submit" disabled={isPending} className={styles.submit}><span>{isPending ? 'Verifying your account...' : 'Sign in to Dashboard'}</span>{isPending ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}</button>
      </form>
      <div className={styles.accessNote}><ShieldCheck size={18} aria-hidden="true" /><p>For authorized MRA Retail staff only.<br /><span>Need access? Contact your administrator.</span></p></div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className={styles.page} lang="en">
      <section className={styles.brandPanel} aria-label="Bvlgari Intelligence">
        <div className={styles.brand}><span className={styles.wordmark}>BVLGARI</span><span className={styles.brandSubtitle}>INTELLIGENCE</span></div>
        <div className={styles.art} aria-hidden="true"><div className={styles.arch} /><div className={styles.orbit} /><div className={styles.gem} /><span className={styles.artCaption}>A DISTINCTIVE POINT OF VIEW</span></div>
        <div className={styles.brandMessage}><span className={styles.eyebrow}>PRECISION MEETS POSSIBILITY</span><h1>Every detail.<br /><em>A clearer vision.</em></h1><p>One perspective on performance, client relationships,<br /> and every opportunity that matters.</p></div>
        <div className={styles.brandFooter}><span>MRA RETAIL</span><span>INDONESIA</span></div>
      </section>
      <section className={styles.formPanel} aria-label="Sign in to the dashboard">
        <header className={styles.formHeader}><span>RETAIL INTELLIGENCE PLATFORM</span><span className={styles.internalBadge}><LockKeyhole size={12} aria-hidden="true" /> INTERNAL ACCESS</span></header>
        <Suspense fallback={<p className={styles.loading} role="status">Loading sign-in form...</p>}><LoginFormContent /></Suspense>
        <footer className={styles.formFooter}><span>&copy; 2026 MRA Retail</span><span>Created by Aris Setiyono</span></footer>
      </section>
    </main>
  );
}

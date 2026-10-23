"use client";

import { useActionState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight, MailCheck, AlertCircle, Loader2, Clock3 } from 'lucide-react';
import { requestPasswordReset } from './actions';
import AuthLayout from '../login/AuthLayout';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null);

  return (
    <AuthLayout formLabel="Reset your password">
      <div className={styles.formContent}>
        <Link href="/login" className={styles.backLink}><ArrowLeft size={14} aria-hidden="true" /> Back to sign in</Link>
        <span className={styles.eyebrow}>ACCOUNT RECOVERY</span>
        {state?.success ? (
          <>
            <h2>Check your inbox.</h2>
            <div role="status" className={styles.sentCard}>
              <span className={styles.sentIcon}><MailCheck size={22} aria-hidden="true" /></span>
              <p>{state.message}</p>
            </div>
            <div className={styles.accessNote}><Clock3 size={18} aria-hidden="true" /><p>The link is valid for 60 minutes and works once.<br /><span>No email after a few minutes? Check your spam folder or ask your administrator.</span></p></div>
            <Link href="/login" className={`${styles.submit} ${styles.linkButton}`}><span>Return to sign in</span><ArrowRight size={18} /></Link>
          </>
        ) : (
          <>
            <h2>Forgot your password?</h2>
            <p className={styles.intro}>Enter the email address of your Vizione account. We will send you a secure link to set a new password.</p>
            {state?.error && <div role="alert" className={`${styles.notice} ${styles.error}`}><AlertCircle size={18} /><span>{state.error}</span></div>}
            <form action={formAction} aria-busy={isPending} className={styles.form}>
              <div>
                <label htmlFor="email">Email address</label>
                <div className={styles.inputWrap}>
                  <Mail size={18} aria-hidden="true" />
                  <input id="email" name="email" type="email" autoComplete="email" required autoFocus placeholder="name@mraretail.co.id" />
                </div>
              </div>
              <button type="submit" disabled={isPending} className={styles.submit}><span>{isPending ? 'Sending the reset link...' : 'Send reset link'}</span>{isPending ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}</button>
            </form>
            <div className={styles.accessNote}><Clock3 size={18} aria-hidden="true" /><p>The link is valid for 60 minutes.<br /><span>Remembered it? <Link href="/login">Sign in instead</Link>.</span></p></div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

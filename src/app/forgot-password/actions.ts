'use server';

import { headers } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import { generatePasswordResetToken } from '@/utils/auth';
import { emailService } from '@/services/emailService';

// Same reply whether or not the address has an active account, so the form cannot be used to find accounts.
const SENT_MESSAGE = 'If this email belongs to an active Vizione account, a reset link is on its way. Check your inbox and spam folder.';

/** Reset links always point at the dashboard's own domain, never at a Host header sent by the caller. */
async function appOrigin() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bvl.mogems.co.id').replace(/\/+$/, '');
  const host = (await headers()).get('host') || '';
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) && process.env.NODE_ENV !== 'production') return `http://${host}`;
  return site;
}

export async function requestPasswordReset(_prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return { error: 'Enter a valid email address.' };
  }

  try {
    const supabase = createAdminClient();

    const { data: dbUser, error } = await supabase
      .from('dashboard_users')
      .select('email, full_name, password, is_active')
      .eq('email', email)
      .single();

    if (error || !dbUser || !dbUser.is_active) {
      return { success: true, message: SENT_MESSAGE };
    }

    // Generate cryptographic reset token
    const token = await generatePasswordResetToken(dbUser.email, dbUser.password || '');

    const resetLink = `${await appOrigin()}/reset-password?token=${encodeURIComponent(token)}`;

    // Kirim email via SMTP
    await emailService.sendPasswordResetEmail({
      toEmail: dbUser.email,
      fullName: dbUser.full_name || 'Bvlgari User',
      resetLink,
    });

    return { success: true, message: SENT_MESSAGE };
  } catch (err) {
    console.error('Error in requestPasswordReset:', err);
    return { error: 'The reset email could not be sent. Please try again in a moment.' };
  }
}

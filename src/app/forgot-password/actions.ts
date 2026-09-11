'use server';

import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { generatePasswordResetToken } from '@/utils/auth';
import { emailService } from '@/services/emailService';

export async function requestPasswordReset(prevState: any, formData: FormData) {
  const email = (formData.get('email') as string || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return { error: 'Masukkan alamat email yang valid.' };
  }

  try {
    const supabase = await createClient();

    const { data: dbUser, error } = await supabase
      .from('dashboard_users')
      .select('email, full_name, password, is_active')
      .eq('email', email)
      .single();

    if (error || !dbUser) {
      // Anti-enumeration: beri respons sukses yang sama agar attacker tidak bisa menebak email terdaftar
      return {
        success: true,
        message: 'Jika email terdaftar di sistem, instruksi reset password telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam.',
      };
    }

    if (!dbUser.is_active) {
      return { error: 'Akun ini dinonaktifkan. Silakan hubungi Administrator IT.' };
    }

    // Generate cryptographic reset token
    const token = await generatePasswordResetToken(dbUser.email, dbUser.password || '');

    // Dapatkan host domain dinamis dari request headers
    const headerList = await headers();
    const host = headerList.get('host') || 'dashboard-bvl.mraretail.co.id';
    const proto = headerList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const resetLink = `${proto}://${host}/reset-password?token=${encodeURIComponent(token)}`;

    // Kirim email via SMTP
    await emailService.sendPasswordResetEmail({
      toEmail: dbUser.email,
      fullName: dbUser.full_name || 'Bvlgari User',
      resetLink,
    });

    return {
      success: true,
      message: 'Instruksi reset password telah dikirim ke email Anda. Silakan periksa kotak masuk atau folder spam Anda.',
    };
  } catch (err: any) {
    console.error('Error in requestPasswordReset:', err);
    return { error: 'Terjadi kesalahan sistem saat mengirim email reset. Silakan coba lagi.' };
  }
}

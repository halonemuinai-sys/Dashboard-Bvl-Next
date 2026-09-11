'use server';

import { createClient } from '@/utils/supabase/server';
import { hashPassword, verifyPasswordResetToken } from '@/utils/auth';

export async function validateToken(token: string) {
  if (!token) return { valid: false, error: 'Token reset password tidak ditemukan.' };

  try {
    const [payloadBase64] = token.split('.');
    if (!payloadBase64) return { valid: false, error: 'Format token tidak valid.' };

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
    const email = payload.email;

    if (!email) return { valid: false, error: 'Email tidak terdaftar dalam token.' };

    const supabase = await createClient();
    const { data: dbUser, error } = await supabase
      .from('dashboard_users')
      .select('email, password, is_active')
      .eq('email', email)
      .single();

    if (error || !dbUser || !dbUser.is_active) {
      return { valid: false, error: 'Akun tidak ditemukan atau telah dinonaktifkan.' };
    }

    const verification = await verifyPasswordResetToken(token, dbUser.password || '');
    return verification;
  } catch (err: any) {
    console.error('validateToken error:', err);
    return { valid: false, error: 'Token tidak valid atau telah kedaluwarsa.' };
  }
}

export async function completePasswordReset(prevState: any, formData: FormData) {
  const token = (formData.get('token') as string || '').trim();
  const password = formData.get('password') as string || '';
  const confirmPassword = formData.get('confirmPassword') as string || '';

  if (!token) {
    return { error: 'Token reset password tidak valid atau hilang.' };
  }

  if (!password || password.length < 8) {
    return { error: 'Password baru minimal harus terdiri dari 8 karakter.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Konfirmasi password tidak cocok dengan password baru.' };
  }

  try {
    const [payloadBase64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
    const email = payload.email;

    const supabase = await createClient();
    const { data: dbUser, error } = await supabase
      .from('dashboard_users')
      .select('id, email, password, is_active')
      .eq('email', email)
      .single();

    if (error || !dbUser) {
      return { error: 'Akun pengguna tidak ditemukan.' };
    }

    if (!dbUser.is_active) {
      return { error: 'Akun pengguna telah dinonaktifkan. Hubungi Administrator.' };
    }

    // Verifikasi token dan kecocokan hash saat ini (single-use guarantee)
    const verification = await verifyPasswordResetToken(token, dbUser.password || '');
    if (!verification.valid) {
      return { error: verification.error || 'Token tidak valid atau sudah pernah digunakan.' };
    }

    // Hash password baru dengan PBKDF2 + SHA-256
    const newPasswordHash = await hashPassword(password);

    // Update password di database
    const { error: updateError } = await supabase
      .from('dashboard_users')
      .update({
        password: newPasswordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbUser.id);

    if (updateError) {
      console.error('Update password error:', updateError);
      return { error: 'Gagal memperbarui password di database. Silakan coba lagi.' };
    }

    return {
      success: true,
      message: 'Password berhasil diperbarui! Silakan masuk dengan password baru Anda.',
    };
  } catch (err: any) {
    console.error('completePasswordReset error:', err);
    return { error: 'Terjadi kesalahan sistem saat mereset password.' };
  }
}

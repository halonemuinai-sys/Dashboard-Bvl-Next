'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { verifyPassword, generateSessionToken } from '@/utils/auth'

export async function login(formData: FormData) {
  const email = (formData.get('email') as string || '').trim().toLowerCase()
  const password = formData.get('password') as string || ''

  if (!email || !password) {
    return redirect('/login?error=Email dan password wajib diisi')
  }

  const supabase = await createClient()

  // Query langsung ke tabel dashboard_users untuk mendapatkan user & password hash
  const { data: dbUser, error } = await supabase
    .from('dashboard_users')
    .select('email, password, role, is_active')
    .eq('email', email)
    .single()

  if (error || !dbUser) {
    return redirect('/login?error=Email tidak terdaftar')
  }

  if (!dbUser.is_active) {
    return redirect('/login?error=Akun dinonaktifkan')
  }

  // Jika password di database belum diset (null/kosong), tolak
  if (!dbUser.password) {
    return redirect('/login?error=Password belum dikonfigurasi. Hubungi Admin.')
  }

  // Verifikasi password hash
  const isMatch = await verifyPassword(password, dbUser.password)
  if (!isMatch) {
    return redirect('/login?error=Password salah')
  }

  // Generate session token
  const token = await generateSessionToken(dbUser.email, dbUser.role)

  // Simpan token ke HTTP-Only cookie (secure: false agar berfungsi di HTTP biasa / tanpa SSL)
  const cookieStore = await cookies()
  cookieStore.set('session_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 hari
    path: '/',
  })

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const cookieStore = await cookies()
  
  // Hapus cookie session
  cookieStore.set('session_token', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  
  revalidatePath('/', 'layout')
  redirect('/login')
}

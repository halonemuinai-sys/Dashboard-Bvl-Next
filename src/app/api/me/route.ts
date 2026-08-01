import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { verifySessionToken } from '@/utils/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value || '';

    if (!sessionToken) {
      return NextResponse.json({ role: null, allowedPaths: [] });
    }

    // Verifikasi session token secara lokal
    const userPayload = await verifySessionToken(sessionToken);
    if (!userPayload || !userPayload.email) {
      return NextResponse.json({ role: null, allowedPaths: [] });
    }

    const supabase = await createClient();

    // Query data user dari database untuk memastikan akun aktif
    const { data: dbUser } = await supabase
      .from('dashboard_users')
      .select('role, is_active')
      .eq('email', userPayload.email.toLowerCase())
      .single();

    if (!dbUser || !dbUser.is_active) {
      return NextResponse.json({ role: null, allowedPaths: [] });
    }

    // super_admin & management_it mendapatkan akses penuh ke semua menu
    if (dbUser.role === 'super_admin' || dbUser.role === 'management_it') {
      return NextResponse.json({ role: dbUser.role, allowedPaths: ['*'] });
    }

    // Ambil detail path menu yang diizinkan untuk role tersebut
    const { data: accessRows } = await supabase
      .from('role_menu_access')
      .select('menu_path, allowed')
      .eq('role', dbUser.role);

    const allowedPaths = (accessRows || [])
      .filter((r: { allowed: boolean }) => r.allowed)
      .map((r: { menu_path: string }) => r.menu_path);

    return NextResponse.json({ role: dbUser.role, allowedPaths });
  } catch (error: any) {
    console.error("Error in GET /api/me:", error);
    return NextResponse.json({ role: null, allowedPaths: [] });
  }
}

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
      .select('full_name, role, is_active')
      .eq('email', userPayload.email.toLowerCase())
      .single();

    if (!dbUser || !dbUser.is_active) {
      return NextResponse.json({ role: null, assignedStore: 'ALL', allowedPaths: [] });
    }

    const { data: adv } = await supabase
      .from('advisors')
      .select('home_location')
      .ilike('name', dbUser.full_name || '')
      .maybeSingle();

    const assignedStore = adv?.home_location || (dbUser as any).assigned_store || 'ALL';

    // super_admin & management_it mendapatkan akses penuh ke semua menu
    if (dbUser.role === 'super_admin' || dbUser.role === 'management_it') {
      return NextResponse.json({
        email: userPayload.email,
        fullName: dbUser.full_name,
        role: dbUser.role,
        assignedStore,
        allowedPaths: ['*'],
      });
    }

    // Ambil detail path menu yang diizinkan untuk role tersebut
    const { data: accessRows } = await supabase
      .from('role_menu_access')
      .select('menu_path, allowed')
      .eq('role', dbUser.role);

    let allowedPaths = (accessRows || [])
      .filter((r: { allowed: boolean }) => r.allowed)
      .map((r: { menu_path: string }) => r.menu_path);

    // Default permissions jika role finance mengakses dashboard Store Manager & Finance
    if (dbUser.role === 'finance') {
      const defaultFinanceStoreManagerPaths = [
        '/',
        '/operations-sales',
        '/store-performance',
        '/daily-report',
        '/daily-breakdown',
        '/invoice-management',
        '/installment-guide',
        '/monthly-transactions',
        '/sales-journal',
        '/sales',
        '/crossing-sales',
        '/annual-sales',
        '/quarterly-standard',
        '/quarterly-budget',
        '/finance-reconciliation',
        '/finance-payment-analytics',
        '/finance-mdr-setup',
      ];

      const allowedSet = new Set(allowedPaths);
      // Tambahkan path default jika belum secara eksplisit di-disallow (false) di database
      defaultFinanceStoreManagerPaths.forEach(p => {
        const row = accessRows?.find((r: { menu_path: string; allowed: boolean }) => r.menu_path === p);
        if (!row || row.allowed) {
          allowedSet.add(p);
        }
      });
      allowedPaths = Array.from(allowedSet);
    }

    return NextResponse.json({
      email: userPayload.email,
      fullName: dbUser.full_name,
      role: dbUser.role,
      assignedStore,
      allowedPaths,
    });
  } catch (error: any) {
    console.error("Error in GET /api/me:", error);
    return NextResponse.json({ role: null, allowedPaths: [] });
  }
}

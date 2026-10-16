import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Read-only lookup of email -> {full_name, role}, used to label audit-trail
 * entries ("changed by ..."). dashboard_users is RLS-locked, so this has to
 * be served from a server route using the Service Role key.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('dashboard_users')
      .select('email, full_name, role');

    if (error) throw error;

    const map: Record<string, { full_name: string; role: string }> = {};
    (data || []).forEach((u: { email: string; full_name: string; role: string }) => {
      if (u.email) map[u.email.toLowerCase()] = { full_name: u.full_name, role: u.role };
    });

    return NextResponse.json(map);
  } catch (error: any) {
    console.error('Error in GET /api/dashboard-users-map:', error);
    return NextResponse.json({}, { status: 500 });
  }
}

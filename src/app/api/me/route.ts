import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ role: null, allowedPaths: [] });
    }

    const { data: dbUser } = await supabase
      .from('dashboard_users')
      .select('role, is_active')
      .eq('email', user.email.toLowerCase())
      .single();

    if (!dbUser || !dbUser.is_active) {
      return NextResponse.json({ role: 'management_it', allowedPaths: ['*'] });
    }

    if (dbUser.role === 'super_admin') {
      return NextResponse.json({ role: 'super_admin', allowedPaths: ['*'] });
    }

    const { data: accessRows } = await supabase
      .from('role_menu_access')
      .select('menu_path, allowed')
      .eq('role', dbUser.role);

    const allowedPaths = (accessRows || [])
      .filter((r: { allowed: boolean }) => r.allowed)
      .map((r: { menu_path: string }) => r.menu_path);

    return NextResponse.json({ role: dbUser.role, allowedPaths });
  } catch {
    return NextResponse.json({ role: 'management_it', allowedPaths: ['*'] });
  }
}

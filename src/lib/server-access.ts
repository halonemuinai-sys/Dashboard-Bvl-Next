import 'server-only';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/utils/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { isAdminRole, isRole, type DashboardUser } from './access-policy';

export async function getSessionUser() {
  const token = (await cookies()).get('session_token')?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) throw new Error('Please sign in to continue.');
  const db = createAdminClient();
  const { data, error } = await db.from('dashboard_users')
    .select('id,email,full_name,role,is_active')
    .eq('email', session.email.toLowerCase())
    .single();

  if (error || !data) throw new Error('Unable to verify your account. Please sign in again.');
  if (!data.is_active || !isRole(data.role)) throw new Error('Your account does not have access.');

  const { data: adv } = await db
    .from('advisors')
    .select('home_location')
    .ilike('name', data.full_name || '')
    .maybeSingle();

  const user: DashboardUser = {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role as DashboardUser['role'],
    assigned_store: adv?.home_location || 'ALL',
    is_active: data.is_active,
  };

  return { db, user };
}

export async function requireAccessAdmin() {
  const session = await getSessionUser();
  if (!isAdminRole(session.user.role)) throw new Error('Administrator access is required.');
  return session;
}

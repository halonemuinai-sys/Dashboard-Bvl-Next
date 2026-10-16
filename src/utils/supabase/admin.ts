import { createClient } from '@supabase/supabase-js';

/**
 * Privileged Supabase client — uses the Service Role Key, which bypasses
 * Row Level Security entirely. Server-side only: never import this from a
 * "use client" component or anything that ships to the browser bundle.
 *
 * Used for tables locked down by RLS (dashboard_users, role_menu_access)
 * where the app's own session/role system — not Postgres auth — is the
 * source of truth for who's allowed to do what.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Required to access RLS-protected tables server-side.'
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

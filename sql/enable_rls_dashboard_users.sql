-- Lock down dashboard_users and role_menu_access from direct anon/public access.
--
-- This app has NO Supabase Auth session (auth.uid() is always null here) — all
-- login/role/permission logic lives in custom Next.js code (src/utils/auth.ts,
-- src/lib/user-access-context.tsx) backed by a plain session cookie, not
-- Postgres roles. That means policies keyed on auth.uid() don't apply.
--
-- The correct model for this app: these two tables are NEVER touched by the
-- public anon key. Every read/write now goes through server-side Next.js
-- code (Server Actions / API routes) using the Service Role key, which
-- bypasses RLS entirely by default in Supabase — no policy needs to grant it
-- access. Enabling RLS here with zero policies means anon/authenticated get
-- a hard deny, while the app's own server code keeps working unaffected.
--
-- Do NOT run this until SUPABASE_SERVICE_ROLE_KEY is set in .env.local
-- (local) and on the Proxmox server, and the app has been redeployed with
-- the admin-client changes — otherwise login and User Access will break.

ALTER TABLE dashboard_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_menu_access ENABLE ROW LEVEL SECURITY;

-- No policies added on purpose: anon/authenticated are fully denied,
-- service_role (server-only) bypasses RLS automatically.

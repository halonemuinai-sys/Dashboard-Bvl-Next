#!/bin/sh
# Runs once, when the data directory is first created. Mirrors Supabase's API roles so the
# dashboard's supabase-js calls keep working: requests carry a JWT whose "role" claim is
# anon or service_role, and PostgREST switches to that role through "authenticator".
set -e
psql -v ON_ERROR_STOP=1 --username postgres --dbname vizione <<SQL
CREATE ROLE vizione_owner LOGIN PASSWORD '${VIZIONE_OWNER_PASSWORD}';
ALTER DATABASE vizione OWNER TO vizione_owner;
ALTER SCHEMA public OWNER TO vizione_owner;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD '${AUTHENTICATOR_PASSWORD}';
GRANT anon, authenticated, service_role TO authenticator;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
SQL

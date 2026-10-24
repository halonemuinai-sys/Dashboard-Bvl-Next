-- Database role for the Google Apps Script sync (AppSheet CRM traffic/profiling, footfall, budgets, stock).
-- It gets its own JWT (role claim "gas_sync"), so the script never holds the public anon key and can
-- touch only the tables it writes. Everything else (users, sales, invoices, logs) is out of reach.
-- Idempotent: safe to run again.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gas_sync') THEN
    CREATE ROLE gas_sync NOLOGIN BYPASSRLS;   -- stock_store has RLS policies; grants below still limit what it can do
  END IF;
END $$;

GRANT gas_sync TO authenticator;
GRANT USAGE ON SCHEMA public TO gas_sync;

-- Full replace/refresh tables (the script clears and reloads them, or reconciles rows it owns).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.footfall_store, public.store_budgets, public.stock_store, public.crm_profiling TO gas_sync;
-- Traffic is only ever upserted by source_id; the script cannot delete visits entered in Vizione or anywhere else.
GRANT SELECT, INSERT, UPDATE ON public.mirror_traffic TO gas_sync;

DO $$ DECLARE s record; BEGIN
  FOR s IN
    SELECT format('%I.%I', n.nspname, c.relname) AS seq
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_depend dep ON dep.objid = c.oid AND dep.deptype IN ('a', 'i')
    JOIN pg_class t ON t.oid = dep.refobjid
    WHERE c.relkind = 'S' AND t.relnamespace = 'public'::regnamespace
      AND t.relname IN ('footfall_store', 'store_budgets', 'stock_store', 'crm_profiling', 'mirror_traffic')
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO gas_sync', s.seq);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

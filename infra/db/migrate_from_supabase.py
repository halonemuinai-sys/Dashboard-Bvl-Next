"""Copies the dashboard database from Supabase (read-only) into the Proxmox Postgres and a local Laragon copy.

  python infra/db/migrate_from_supabase.py            # dump, keep a local copy, restore to Proxmox + Laragon, compare
  python infra/db/migrate_from_supabase.py --dump-only

Needs SUPABASE_DB_PASSWORD in .env.local (Supabase > Project Settings > Database). Supabase is never modified.
The Proxmox database is recreated from the dump each run, so run it again before the final switch-over.
"""
import os, re, subprocess, sys, time
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT); sys.dont_write_bytecode = True
import deploy_remote as d  # SSH helpers and .env.local loader

REMOTE_DIR = f"/home/{d.SSH_USER}/vizione-db/dumps"
LOCAL_DIR = os.path.join(ROOT, "backups", "db")
LARAGON_BIN = r"C:\laragon\bin\postgresql\postgresql-17\bin"
POOLER = "aws-1-ap-northeast-1.pooler.supabase.com"  # project region: Tokyo


# Supabase pieces the dump relies on: its API roles, supabase_admin (default-privilege lines) and the auth.*
# helpers used by RLS policies. The helpers read the JWT claims PostgREST sets per request.
COMPAT_SQL = """
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN CREATE ROLE supabase_admin NOLOGIN; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
  $f$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $f$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $f$ SELECT auth.jwt() ->> 'role' $f$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT nullif(auth.jwt() ->> 'sub', '')::uuid $f$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
"""


def env(name):
    value = d.load_env_local().get(name, "")
    if not value:
        sys.exit(f"GAGAL: {name} belum diisi di .env.local.")
    return value


def run(client, cmd, check=True):
    stdin, stdout, stderr = client.exec_command(cmd)
    out, err = stdout.read().decode(errors="replace"), stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if check and code != 0:
        client.exec_command("docker exec vizione-db rm -f /tmp/.pgpass")[1].channel.recv_exit_status()
        sys.exit(f"GAGAL ({code}): {cmd.split('&&')[0][:80]}...\n{err[-2000:]}")
    return out


def table_counts_sql():
    return ("select c.relname, (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint "
            "from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p') order by 1")


def main():
    ref = re.search(r"https://([a-z0-9]+)\.supabase", env("NEXT_PUBLIC_SUPABASE_URL")).group(1)
    password = env("SUPABASE_DB_PASSWORD")
    if "://" in password:  # a full connection string was pasted; keep only its password
        from urllib.parse import unquote, urlsplit
        password = unquote(urlsplit(password).password or "")
        if not password:
            sys.exit("GAGAL: connection string di SUPABASE_DB_PASSWORD tidak berisi password.")
    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    dump = f"supabase-{stamp}.dump"
    client = d.ssh_connect()
    run(client, f"mkdir -p {REMOTE_DIR} && chmod 700 {REMOTE_DIR}")
    # The Supabase password reaches pg_dump through a temporary .pgpass inside the container, written via stdin,
    # so it never appears in a command line or log. Removed at the end.
    escaped = password.replace("\\", "\\\\").replace(":", "\\:")
    stdin, stdout, _ = client.exec_command("docker exec -i vizione-db sh -c 'umask 077 && cat > /tmp/.pgpass'")
    stdin.write(f"{POOLER}:5432:postgres:postgres.{ref}:{escaped}\n"); stdin.channel.shutdown_write(); stdout.channel.recv_exit_status()
    pg = "docker exec -e PGPASSFILE=/tmp/.pgpass vizione-db"

    # 1. Read-only dump of the public schema from Supabase (session pooler; the direct host is IPv6-only).
    print(f"--- 1. Dump dari Supabase (hanya membaca) -> {dump}")
    started = time.time()
    src = f"host={POOLER} port=5432 dbname=postgres user=postgres.{ref} sslmode=require"
    run(client, f"{pg} pg_dump \"{src}\" --schema=public --format=custom --no-owner --file=/tmp/{dump} "
                f"&& docker cp vizione-db:/tmp/{dump} {REMOTE_DIR}/{dump} && docker exec vizione-db rm -f /tmp/{dump} && chmod 600 {REMOTE_DIR}/{dump}")
    size = run(client, f"stat -c %s {REMOTE_DIR}/{dump}").strip()
    print(f"    selesai {time.time() - started:.0f} detik, {int(size) / 1e6:.1f} MB")

    # 2. Local copy (backup on the laptop).
    os.makedirs(LOCAL_DIR, exist_ok=True)
    local_dump = os.path.join(LOCAL_DIR, dump)
    sftp = client.open_sftp(); sftp.get(f"{REMOTE_DIR}/{dump}", local_dump); sftp.close()
    print(f"--- 2. Salinan lokal: {local_dump}")
    if "--dump-only" in sys.argv:
        run(client, "docker exec vizione-db rm -f /tmp/.pgpass"); client.close()
        return

    # 3. Restore into the Proxmox database, owned by vizione_owner. Extensions Supabase keeps in "extensions".
    print("--- 3. Restore ke database vizione di Proxmox")
    psql = "docker exec -i vizione-db psql -v ON_ERROR_STOP=1 -U postgres -d vizione -q"
    run(client, f"""{psql} <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public AUTHORIZATION vizione_owner;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role, vizione_owner;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
{COMPAT_SQL}
GRANT USAGE ON SCHEMA auth TO vizione_owner;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO vizione_owner;
SQL""")
    restore = run(client, f"docker cp {REMOTE_DIR}/{dump} vizione-db:/tmp/{dump} && "
                          f"docker exec vizione-db pg_restore -U postgres -d vizione --no-owner --role=vizione_owner /tmp/{dump} 2>&1; "
                          f"docker exec vizione-db rm -f /tmp/{dump}", check=False)
    errors = [l for l in restore.splitlines() if "error" in l.lower()]
    print(f"    pg_restore: {len(errors)} pesan error" + ("" if not errors else "\n      " + "\n      ".join(errors[:15])))
    run(client, f"""{psql} <<'SQL'
ALTER DEFAULT PRIVILEGES FOR ROLE vizione_owner IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE vizione_owner IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE vizione_owner IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
SQL""")

    # 4. Same dump into the local Laragon copy (no roles there, so ownership and grants are skipped).
    print("--- 4. Restore ke vizione_backup di Laragon")
    lpsql = [os.path.join(LARAGON_BIN, "psql.exe"), "-h", "127.0.0.1", "-U", "postgres", "-d", "vizione_backup", "-w", "-q", "-v", "ON_ERROR_STOP=1", "-c"]
    subprocess.run(lpsql + ["DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; CREATE SCHEMA IF NOT EXISTS extensions; "
                            "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\" WITH SCHEMA extensions; CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;" + COMPAT_SQL], check=True)
    lr = subprocess.run([os.path.join(LARAGON_BIN, "pg_restore.exe"), "-h", "127.0.0.1", "-U", "postgres", "-d", "vizione_backup", "-w",
                         "--no-owner", "--no-privileges", local_dump], capture_output=True, text=True, encoding="utf-8", errors="replace")
    lerr = [l for l in lr.stderr.splitlines() if "error" in l.lower()]
    print(f"    pg_restore lokal: {len(lerr)} pesan error" + ("" if not lerr else "\n      " + "\n      ".join(lerr[:10])))

    # 5. Compare row counts: Supabase vs Proxmox vs Laragon.
    print("--- 5. Cocokkan jumlah baris per tabel")
    parse = lambda text: dict(line.split("|") for line in text.strip().splitlines() if "|" in line)
    sql = table_counts_sql()
    supa = parse(run(client, f"{pg} psql \"{src}\" -tA -c \"{sql}\""))
    run(client, "docker exec vizione-db rm -f /tmp/.pgpass")
    prox = parse(run(client, f"docker exec vizione-db psql -U postgres -d vizione -tA -c \"{sql}\""))
    lara = parse(subprocess.run([os.path.join(LARAGON_BIN, "psql.exe"), "-h", "127.0.0.1", "-U", "postgres", "-d", "vizione_backup", "-w", "-tA", "-c", sql],
                                capture_output=True, text=True).stdout)
    diff = [t for t in sorted(set(supa) | set(prox) | set(lara)) if not (supa.get(t) == prox.get(t) == lara.get(t))]
    print(f"    tabel: Supabase {len(supa)}, Proxmox {len(prox)}, Laragon {len(lara)} | total baris Supabase {sum(map(int, supa.values())):,}")
    for t in diff:
        print(f"    BEDA {t}: supabase={supa.get(t)} proxmox={prox.get(t)} laragon={lara.get(t)}")
    print("    SEMUA COCOK" if not diff else f"    {len(diff)} tabel berbeda")
    client.close()


if __name__ == "__main__":
    main()

"""Pulls the Vizione database backups from the Proxmox server to this laptop and refreshes the Laragon copy.

  python infra/db/pull_backup.py              # download new dumps, then restore the newest into Laragon vizione_backup
  python infra/db/pull_backup.py --no-restore # download only

Dumps land in backups/db/ (git-ignored); the 30 newest are kept. Read-only on the server.
"""
import os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT); sys.dont_write_bytecode = True
import deploy_remote as d

REMOTE_DIR = f"/home/{d.SSH_USER}/vizione-db/dumps"
LOCAL_DIR = os.path.join(ROOT, "backups", "db")
LARAGON_BIN = r"C:\laragon\bin\postgresql\postgresql-17\bin"
KEEP_LOCAL = 30


def main():
    os.makedirs(LOCAL_DIR, exist_ok=True)
    client = d.ssh_connect()
    sftp = client.open_sftp()
    remote = sorted(f for f in sftp.listdir(REMOTE_DIR) if f.startswith("vizione-") and f.endswith(".dump"))
    new = [f for f in remote if not os.path.exists(os.path.join(LOCAL_DIR, f))]
    for name in new:
        sftp.get(f"{REMOTE_DIR}/{name}", os.path.join(LOCAL_DIR, name))
        print(f"downloaded {name}")
    sftp.close(); client.close()
    print(f"{len(new)} new backup(s); server has {len(remote)}")

    local = sorted(f for f in os.listdir(LOCAL_DIR) if f.startswith("vizione-") and f.endswith(".dump"))
    for old in local[:-KEEP_LOCAL]:
        os.remove(os.path.join(LOCAL_DIR, old))
    if not local or "--no-restore" in sys.argv:
        return

    newest = os.path.join(LOCAL_DIR, local[-1])
    psql = [os.path.join(LARAGON_BIN, "psql.exe"), "-h", "127.0.0.1", "-U", "postgres", "-d", "vizione_backup", "-w", "-q", "-c"]
    subprocess.run(psql + ["DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"], check=True)
    result = subprocess.run([os.path.join(LARAGON_BIN, "pg_restore.exe"), "-h", "127.0.0.1", "-U", "postgres", "-d", "vizione_backup", "-w",
                             "--no-owner", "--no-privileges", "--exclude-schema=auth", "--exclude-schema=extensions", newest],
                            capture_output=True, text=True, encoding="utf-8", errors="replace")
    errors = [l for l in result.stderr.splitlines() if "error:" in l and "already exists" not in l]
    print(f"Laragon vizione_backup restored from {local[-1]}" + (f" ({len(errors)} errors)" if errors else ""))
    for line in errors[:10]:
        print("  " + line)


if __name__ == "__main__":
    main()

import os
import sys
import argparse
import subprocess
import getpass
from datetime import datetime

# Path helper to find .env.local
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local')

def parse_env():
    env = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                trimmed = line.strip()
                if trimmed and not trimmed.startswith('#') and '=' in trimmed:
                    parts = trimmed.split('=', 1)
                    key = parts[0].strip()
                    val = parts[1].strip().strip("'").strip('"')
                    env[key] = val
    return env

def get_project_ref(url):
    # Extracts project reference from 'https://vekgzcxorvdidjutuvrj.supabase.co' -> 'vekgzcxorvdidjutuvrj'
    if not url:
        return None
    url = url.replace('https://', '').replace('http://', '')
    if '.' in url:
        return url.split('.')[0]
    return url

def run_backup(db_password=None, output_dir=None, schema="public"):
    env = parse_env()
    supabase_url = env.get('NEXT_PUBLIC_SUPABASE_URL')
    
    project_ref = get_project_ref(supabase_url)
    if not project_ref:
        print("Error: NEXT_PUBLIC_SUPABASE_URL tidak ditemukan di .env.local atau format tidak valid.", file=sys.stderr)
        sys.exit(1)
        
    password = db_password or env.get('SUPABASE_DB_PASSWORD')
    if not password:
        print(f"Supabase Project ID: {project_ref}")
        password = getpass.getpass("Masukkan Password Database Supabase Anda: ").strip()
        if not password:
            print("Error: Password database wajib diisi.", file=sys.stderr)
            sys.exit(1)

    # Reconstruct Supabase connection string
    db_uri = f"postgresql://postgres:{password}@db.{project_ref}.supabase.co:5432/postgres"

    # Default output directory to "backups" in project root
    if not output_dir:
        output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backups')
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_dir, f"supabase_backup_{timestamp}.sql")

    print(f"Mengambil backup dari Supabase Cloud (Project: {project_ref}, Schema: {schema})...", flush=True)

    try:
        # Check if Docker is running
        subprocess.run(["docker", "info"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: Docker tidak terdeteksi atau belum aktif. Pastikan Docker Desktop menyala.", file=sys.stderr)
        sys.exit(1)

    try:
        with open(output_file, 'wb') as f:
            # Run pg_dump using Docker postgres:17-alpine container
            subprocess.run([
                "docker", "run", "--rm", "-i", "postgres:17-alpine",
                "pg_dump", db_uri, "-n", schema
            ], stdout=f, stderr=subprocess.PIPE, check=True)
            
        file_size = os.path.getsize(output_file)
        if file_size == 0:
            print("Error: Hasil file backup berukuran 0 bytes. Periksa password atau hak akses database Anda.", file=sys.stderr)
            if os.path.exists(output_file):
                os.remove(output_file)
            sys.exit(1)

        print(f"Sukses! Backup berhasil disimpan di:\n -> {output_file} ({file_size / 1024:.2f} KB)", flush=True)
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode('utf-8', errors='ignore')
        print(f"Error eksekusi pg_dump via Docker: {error_msg}", file=sys.stderr)
        if os.path.exists(output_file):
            os.remove(output_file)
        sys.exit(1)
    except Exception as e:
        print(f"Terjadi kesalahan tidak terduga: {str(e)}", file=sys.stderr)
        if os.path.exists(output_file):
            os.remove(output_file)
        sys.exit(1)

def setup_scheduler(output_dir, time_str, task_name):
    env = parse_env()
    password = env.get('SUPABASE_DB_PASSWORD')
    if not password:
        print("PERINGATAN: SUPABASE_DB_PASSWORD tidak ditemukan di .env.local.", file=sys.stderr)
        print("Untuk otomatisasi Task Scheduler, Anda wajib menyimpan password di .env.local dengan kunci:", file=sys.stderr)
        print("SUPABASE_DB_PASSWORD=password_database_anda", file=sys.stderr)
        sys.exit(1)

    script_path = os.path.abspath(__file__)
    
    # Construct task command to run this script in PowerShell
    run_command = f"powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -Command \"python '{script_path}' run --output-dir '{output_dir}'\""
    
    cmd = [
        "schtasks", "/create",
        "/tn", task_name,
        "/tr", run_command,
        "/sc", "daily",
        "/st", time_str,
        "/f"
    ]
    
    try:
        print(f"Mendaftarkan tugas '{task_name}' di Windows Task Scheduler untuk berjalan harian pukul {time_str}...", flush=True)
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        print("Sukses! Tugas berhasil terdaftar di Windows Task Scheduler.", flush=True)
        print(result.stdout.decode('utf-8', errors='ignore'))
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode('utf-8', errors='ignore')
        print(f"Gagal mendaftarkan tugas ke Windows Task Scheduler: {error_msg}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Supabase Local Backup CLI Tool")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Subcommand: run
    parser_run = subparsers.add_parser("run", help="Jalankan database backup")
    parser_run.add_argument("--password", help="Password database Supabase (opsional, jika tidak diset di .env.local)")
    parser_run.add_argument("--output-dir", help="Direktori penyimpanan file backup")
    parser_run.add_argument("--schema", default="public", help="Schema database yang akan dibackup (default: public)")
    
    # Subcommand: setup-scheduler
    parser_setup = subparsers.add_parser("setup-scheduler", help="Jadwalkan backup harian di Windows Task Scheduler")
    parser_setup.add_argument("--output-dir", required=True, help="Direktori penyimpanan file backup")
    parser_setup.add_argument("--time", default="12:00", help="Waktu eksekusi harian (e.g. 12:00, format 24 jam)")
    parser_setup.add_argument("--task-name", default="Supabase_Bvl_Local_Backup", help="Nama tugas di Windows Task Scheduler")
    
    args = parser.parse_args()
    
    if args.command == "run":
        run_backup(db_password=args.password, output_dir=args.output_dir, schema=args.schema)
    elif args.command == "setup-scheduler":
        setup_scheduler(output_dir=args.output_dir, time_str=args.time, task_name=args.task_name)

if __name__ == "__main__":
    main()

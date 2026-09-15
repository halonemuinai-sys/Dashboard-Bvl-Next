import os
import sys
import time
import paramiko

# SSH Details
SSH_HOST = "202.6.239.245"
SSH_USER = "ubuntu-mogems"
SSH_PASS = "ubuntu2026"
PROJECT_DIR = "dashboard-bvl"

def run_ssh_command(client, command, stdin_input=None):
    print(f"Executing: {command}")
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    
    if stdin_input:
        stdin.write(stdin_input + "\n")
        stdin.flush()
        
    # Read output in real-time
    output_lines = []
    while True:
        line = stdout.readline()
        if not line:
            break
        try:
            print(line, end="")
        except UnicodeEncodeError:
            try:
                print(line.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding), end="")
            except Exception:
                print(line.encode('ascii', errors='replace').decode('ascii'), end="")
        output_lines.append(line)
        
    exit_status = stdout.channel.recv_exit_status()
    err = stderr.read().decode('utf-8')
    if err:
        print(f"Error output: {err}")
        
    return exit_status, "".join(output_lines), err

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
        
    # Read local .env.local contents
    env_local_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.local')
    if not os.path.exists(env_local_path):
        print(f"Error: .env.local tidak ditemukan di {env_local_path}. Setup dihentikan.", file=sys.stderr)
        sys.exit(1)
        
    with open(env_local_path, 'r', encoding='utf-8') as f:
        env_content = f.read()

    print("=== MEMULAI REMOTE DEPLOYMENT KE PROXMOX VM ===")
    print(f"Menghubungkan ke {SSH_HOST} sebagai {SSH_USER}...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS, timeout=15)
        print("Koneksi SSH Sukses!\n")
        
        # 1. Check Git & Docker
        print("--- Memeriksa environment remote server ---")
        status, _, _ = run_ssh_command(client, "git --version && docker --version")
        if status != 0:
            print("Alat belum lengkap. Menjalankan apt update & install...")
            run_ssh_command(client, "sudo -S apt update", stdin_input=SSH_PASS)
            run_ssh_command(client, "sudo -S apt install -y git", stdin_input=SSH_PASS)
            run_ssh_command(client, "curl -fsSL https://get.docker.com -o get-docker.sh && sudo -S sh get-docker.sh", stdin_input=SSH_PASS)
            run_ssh_command(client, f"sudo -S usermod -aG docker {SSH_USER}", stdin_input=SSH_PASS)
            run_ssh_command(client, "sudo -S systemctl enable docker && sudo -S systemctl start docker", stdin_input=SSH_PASS)
        else:
            print("Git dan Docker terverifikasi aktif!")

        # 2. Clone or Pull repository
        print("\n--- Menyiapkan direktori project dan menarik source code terbaru ---")
        status, _, _ = run_ssh_command(client, f"ls -d {PROJECT_DIR}")
        if status != 0:
            print(f"Direktori {PROJECT_DIR} belum ada. Meng-clone repositori...")
            run_ssh_command(client, f"git clone https://github.com/halonemuinai-sys/Dashboard-Bvl-Next.git {PROJECT_DIR}")
        else:
            print(f"Direktori {PROJECT_DIR} sudah ada. Menarik code terbaru dari origin/main...")
            run_ssh_command(client, f"cd {PROJECT_DIR} && git fetch --all && git reset --hard origin/main")
            
        # 3. Write .env.local to remote and copy to .env for build interpolation
        print("\n--- Menulis file .env.local di server remote ---")
        write_cmd = f"cat << 'EOF' > {PROJECT_DIR}/.env.local\n{env_content.strip()}\nEOF\ncp {PROJECT_DIR}/.env.local {PROJECT_DIR}/.env"
        run_ssh_command(client, write_cmd)
        print("File .env.local dan .env berhasil ditulis di remote server.")
        
        # 4. Run Docker Compose build and start
        print("\n--- Membuild dan Menjalankan Docker Container ---")
        run_ssh_command(client, f"cd {PROJECT_DIR} && sudo -S docker compose --env-file .env.local up -d --build", stdin_input=SSH_PASS)
        
        # 5. Verification and diagnostics
        print("\n--- Menunggu container startup (5 detik) ---")
        time.sleep(5)
        print("\n--- Status Kontainer di Server Proxmox ---")
        run_ssh_command(client, f"cd {PROJECT_DIR} && sudo -S docker compose ps", stdin_input=SSH_PASS)
        
        print("\n--- Verifikasi Respon HTTP ---")
        run_ssh_command(client, "curl -I -s http://localhost:3001 | head -n 5")
        
        print("\n=== DEPLOYMENT SELESAI DENGAN SUKSES! ===")
        print(f"Aplikasi dashboard sekarang aktif berjalan di:")
        print(f"- Domain: https://bvl.mogems.co.id")
        print(f"- Direct IP: http://{SSH_HOST}:3001")
        
    except Exception as e:
        print(f"\n❌ Terjadi kesalahan saat deployment: {str(e)}", file=sys.stderr)
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()

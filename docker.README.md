# Panduan Deployment Docker di Proxmox VE
**MRA Retail - Bvlgari Intelligence Dashboard**

Dokumen ini berisi panduan lengkap untuk melakukan deploy aplikasi Dashboard ini menggunakan Docker di dalam lingkungan **Proxmox VE**.

---

## 🏗️ Langkah 1: Persiapan Environment di Proxmox VE

Anda dapat memilih antara menggunakan **LXC Container** atau **KVM Virtual Machine (VM)**.

### Opsi A: Menggunakan LXC Container (Sangat Ringan, Direkomendasikan)
LXC container sangat hemat resource RAM/CPU karena berbagi kernel dengan host Proxmox.
1. Buat LXC Container baru di Proxmox (Pilih template OS **Ubuntu Server** atau **Debian**).
2. **PENTING (Agar Docker bisa berjalan di LXC)**:
   - Sebelum menyalakan LXC, masuk ke tab **Options** container Anda di Proxmox.
   - Klik ganda pada menu **Features**.
   - Centang opsi **keyctl** dan **nesting** (nesting diwajibkan untuk menjalankan Docker di dalam LXC).
3. Nyalakan container LXC.

### Opsi B: Menggunakan Virtual Machine (VM)
Jika Anda ingin isolasi penuh dan menghindari konfigurasi khusus LXC:
1. Buat VM baru dengan OS **Ubuntu Server 24.04 LTS**.
2. Alokasikan minimal **2 vCPU** dan **2 GB RAM** untuk kestabilan saat proses build Next.js.
3. Nyalakan VM.

---

## 📦 Langkah 2: Install Docker & Git pada VM/LXC

Setelah masuk ke console VM/LXC Anda melalui SSH, jalankan perintah berikut untuk menginstal Git dan Docker:

```bash
# Update repository
sudo apt update && sudo apt upgrade -y

# Install Git
sudo apt install git -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verifikasi instalasi
docker --version
docker compose version
```

---

## 🚀 Langkah 3: Deploy Aplikasi Dashboard

1. **Clone repositori aplikasi** ke dalam server:
   ```bash
   git clone <URL_REPOSITORI_ANDA> dashboard-bvl
   cd dashboard-bvl
   ```

2. **Buat file `.env.local`** di direktori utama:
   ```bash
   nano .env.local
   ```
   *Salin isi variabel environment Anda (seperti kredensial Supabase, API Token Bvlgari, SMTP Mailer, dll.) ke dalam file ini, lalu simpan (Ctrl+O, Enter, Ctrl+X).*

3. **Build dan Jalankan Container** menggunakan Docker Compose:
   ```bash
   sudo docker compose up -d --build
   ```
   *Proses build pertama kali akan memakan waktu beberapa menit karena Next.js melakukan kompilasi production bundle.*

4. **Periksa status container**:
   ```bash
   sudo docker compose ps
   ```
   Aplikasi kini berjalan dan dapat diakses di port **3000** (misal: `http://<IP_ADDRESS_VM>:3000`).

---

## 🔄 Pemeliharaan & Update Aplikasi (Maintenances)

Untuk memperbarui aplikasi ke versi terbaru setelah Anda melakukan push kode baru ke repositori:

```bash
# Tarik kode terbaru dari git
git pull

# Build ulang container tanpa downtime lama
sudo docker compose up -d --build
```

---

## 🔒 Langkah 4: Konfigurasi Akses HTTPS (Reverse Proxy)

Agar aplikasi dapat diakses menggunakan nama domain lokal dan koneksi HTTPS aman (SSL):

1. **Gunakan Nginx Proxy Manager (Paling Praktis)**:
   Jalankan Nginx Proxy Manager di container terpisah, lalu arahkan domain Anda (misal: `dashboard.mraretail.co.id`) ke IP VM/LXC Proxmox dengan port **3000**.
2. **Gunakan Nginx Manual**:
   Instal Nginx di VM host:
   ```bash
   sudo apt install nginx -y
   ```
   Buat file konfigurasi block `/etc/nginx/sites-available/bvl-dashboard`:
   ```nginx
   server {
       listen 80;
       server_name dashboard.mraretail.co.id;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Aktifkan konfigurasi dan restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/bvl-dashboard /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```

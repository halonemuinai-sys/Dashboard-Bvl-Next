# Panduan Modul Inventory Valuation & Pembaruan Sistem
**MRA Retail - Bvlgari Intelligence Dashboard**

Dokumen ini menjelaskan konsep data, arsitektur, dan pembaruan fitur terbaru pada modul **Inventory Valuation** yang dirancang untuk kebutuhan audit stok bulanan, visualisasi data, dan pelacakan nilai jual retail butik.

---

## 🛠️ Ringkasan Fitur & Pembaruan Terkini

### 1. Fokus Valuasi Nilai Retail (Retail Price Focus)
*   **Penyembunyian Harga Modal (Hide Cost Price):** Untuk menjaga kerahasiaan data internal, seluruh referensi harga modal (*Cost Price*), nilai margin kotor (*Est. Gross Margin*), dan persentase margin telah disembunyikan sepenuhnya dari antarmuka pengguna (UI) serta dari file ekspor CSV/Excel.
*   **KPI Ringkasan Utama:** Hanya menampilkan **Total Qty (QOH)** dan **Total Retail Value** dengan tata letak grid yang bersih dan modern.

### 2. Ringkasan Stok per Kategori Utama (Category KPI Cards)
Terdapat 3 kartu ringkasan baru untuk melacak stok kategori utama secara cepat:
*   **Watches (Jam Tangan):** Ditandai dengan aksen warna **Biru**.
*   **Jewelry (Perhiasan):** Ditandai dengan aksen warna **Emerald / Hijau**.
*   **Accessories (Aksesoris):** Ditandai dengan aksen warna **Amber / Oranye**.
*   Setiap kartu menampilkan jumlah barang tersedia (*Pcs*) beserta akumulasi *Retail Value*-nya.

### 3. Grafik Recharts Interaktif & Tooltip Kustom (Custom Tooltip)
*   **Grafik Kategori Utama:** Grafik batang horizontal kini menampilkan rangkuman nilai jual retail per kategori utama yang terintegrasi secara dinamis dengan filter.
*   **Tooltip Kustom Premium:** Saat kursor diarahkan (*hover*) ke diagram batang, tooltip kustom berwarna putih bersih (*white card*) dengan bayangan halus (*shadow*) akan muncul menampilkan nama kategori, total *Retail Value*, dan total kuantitas stok (*QOH*).

### 4. Penyaringan Otomatis Item Kemasan (Exclusion "PACK")
*   Semua item kemasan, kotak, tas belanja, dan katalog yang memiliki kode koleksi `PACK` (atau berawalan `PACK,`) serta kolom `main_category` bernilai `PACK` / `PACKAGING` **disaring dan disembunyikan secara otomatis** dari seluruh perhitungan statistik, grafik, tabel, dan file ekspor.

### 5. Filter & Pencarian Cepat
*   **Filter Lokasi & Tanggal:** Dropdown untuk memfilter stok berdasarkan butik (seperti Plaza Indonesia, Plaza Senayan, dll.) dan tanggal penarikan stok.
*   **Filter "Tanpa Perfume":** Checkbox toggle yang aktif secara default untuk menyaring produk parfum agar tidak mengacaukan perhitungan stok barang mewah utama.
*   **Pencarian Instan:** Pencarian waktu nyata berdasarkan Nomor Serial, SAP SKU Code, Deskripsi, Kategori, atau Nama Koleksi.

---

## 🔄 Konsep Pengelolaan & Riwayat Data

Modul ini mengadopsi konsep **Snapshot-Based Data (Histori per Tanggal)** untuk memudahkan pelacakan historis stok:

### A. Jika Ganti Hari (Perubahan Harian)
*   Setiap kali penarikan stok dijalankan dengan tanggal yang baru (misal: ganti hari dari `2026-05-20` ke `2026-05-21`), sistem akan menyimpan data tersebut sebagai entri baru yang terpisah di database.
*   Data hari sebelumnya tetap tersimpan utuh. Anda dapat membandingkan stok antar-hari melalui dropdown filter tanggal snapshot di dashboard.
*   *Catatan:* Jika Anda melakukan sinkronisasi ulang di tanggal yang sama, sistem akan menghapus data lama untuk tanggal & lokasi tersebut terlebih dahulu sebelum menyimpan data yang baru agar data tidak duplikat.

### B. Jika Ganti Bulan (Perubahan Bulanan)
*   Ketika memasuki bulan baru, lakukan sinkronisasi dengan tanggal snapshot bulan baru tersebut (misalnya tanggal akhir bulan `2026-06-30`).
*   Data bulan-bulan sebelumnya (misalnya bulan Mei) akan otomatis tersimpan sebagai riwayat audit. Anda dapat dengan mudah melakukan perbandingan performa stok antar-bulan melalui dropdown tanggal di UI.

---

## 💾 Struktur Database & Integrasi API

### 1. Tabel Database (`inventory_valuation`)
Data disimpan pada tabel `inventory_valuation` di PostgreSQL (Supabase) dengan skema berikut:

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | UUID | Primary key otomatis |
| `location_code` | VARCHAR | Kode lokasi butik (contoh: `PI`, `PS`) |
| `location_name` | VARCHAR | Nama lengkap butik (contoh: `Plaza Indonesia`) |
| `snapshot_date` | DATE | Tanggal penarikan stok |
| `item_code` | VARCHAR | Nomor serial unik barang |
| `item_sku` | VARCHAR | Kode SKU SAP barang |
| `item_name` | VARCHAR | Nama barang |
| `description` | TEXT | Deskripsi detail barang |
| `item_price` | NUMERIC | Harga jual retail satuan |
| `item_cost` | NUMERIC | Harga modal satuan (hanya diakses backend) |
| `main_category` | VARCHAR | Nama kategori hasil normalisasi (*Watches*, *Jewelry*, etc.) |
| `collection_name`| VARCHAR | Nama koleksi resmi (*Serpenti*, *B.zero1*, etc.) |
| `qoh` | INTEGER | Jumlah stok fisik (*Quantity on Hand*) |
| `amount` | NUMERIC | Total Retail Value (`item_price` * `qoh`) |
| `created_at` | TIMESTAMP | Waktu pencatatan data ke database |

### 2. Normalisasi & Cross-Referencing Otomatis
Saat proses sinkronisasi berjalan, backend secara otomatis melakukan lookup data master:
*   Mencocokkan awalan kode koleksi dengan tabel master kategori (`master_main_category`) untuk mendapatkan kategori resmi.
*   Mencocokkan kode koleksi dengan tabel master koleksi (`master_collection`) untuk mendapatkan nama koleksi resmi (seperti *B.zero1*, *Serpenti*, *Divas' Dream*).
*   Jika lookup tidak ditemukan, sistem memiliki mekanisme *fallback* aman menggunakan pola pemisahan kode teks.

---

## 📈 Cara Melakukan Sinkronisasi Stok Baru
1.  Buka menu **"Inventory Val."** di bawah grup menu **OPERASIONAL** pada sidebar.
2.  Klik tombol **"Sync Stock"** di sudut kanan atas.
3.  Pilih butik yang ingin disinkronkan (contoh: *Plaza Indonesia*).
4.  Masukkan tanggal snapshot stok yang diinginkan (default adalah tanggal hari ini).
5.  Klik **"Ya, Sync Sekarang"**. Proses penarikan data dari API dan penyimpanan ke database akan berlangsung beberapa detik secara aman.

# 📖 PANDUAN PENGGUNA RESMI (USER MANUAL)
## SISTEM BVLGARI INTELLIGENCE DASHBOARD
### KHUSUS PERAN: STORE MANAGER (SM) & OPERATIONS SALES

**PT Mogems Putri International — MRA Retail Indonesia**  
*Versi Dokumen: 2.1 | Pembaruan Terakhir: Oktober 2026*  
*Akses Sistem:* [https://bvl.mogems.co.id](https://bvl.mogems.co.id)

---

## DAFTAR ISI
1. [Pendahuluan & Tujuan Dokumen](#1-pendahuluan--tujuan-dokumen)
2. [Akses Sistem & Keamanan Akun](#2-akses-sistem--keamanan-akun)
3. [Alur Kerja Rutin Harian (Daily Routine Store Manager)](#3-alur-kerja-rutin-harian-daily-routine-store-manager)
4. [Modul 1: Operations Sales Dashboard](#4-modul-1-operations-sales-dashboard)
5. [Modul 2: Daily Sales Report & Pengiriman Email Laporan](#5-modul-2-daily-sales-report--pengiriman-email-laporan)
6. [Modul 3: Advisor Performance & Evaluasi Tim](#6-modul-3-advisor-performance--evaluasi-tim)
7. [Modul 4: Panduan Cicilan 0% & MDR Bank (Installment Guide)](#7-modul-4-panduan-cicilan-0--mdr-bank-installment-guide)
8. [Modul 5: Crossing Sales & Invoice Management](#8-modul-5-crossing-sales--invoice-management)
9. [Modul 6: Traffic Footfall & CRM Clienteling](#9-modul-6-traffic-footfall--crm-clienteling)
10. [Pertanyaan Umum (FAQ) & Dukungan Teknis](#10-pertanyaan-umum-faq--dukungan-teknis)

---

## 1. PENDAHULUAN & TUJUAN DOKUMEN

Sistem **Bvlgari Intelligence Dashboard** adalah platform analitik terpadu untuk butik Bvlgari Indonesia (**Plaza Indonesia**, **Plaza Senayan**, dan **Bali Store**). 

Manual ini disusun sebagai panduan operasional standar (SOP) bagi **Store Manager (SM)** dan **Assistant Store Manager (ASM)** untuk:
1. Memantau pencapaian target penjualan toko secara *real-time*.
2. Memonitor dan mengevaluasi produktivitas Client Advisor setiap hari dan setiap bulan.
3. Menjalankan verifikasi transaksi kasir, split-payment, serta komisi mesin EDC/MDR bank.
4. Mengirimkan laporan berkas resmi (PDF & Excel) kepada manajemen pusat secara otomatis dan terstandarisasi.

---

## 2. AKSES SISTEM & KEAMANAN AKUN

### 2.1 Alamat Web & Login
1. Buka browser (disarankan **Google Chrome** atau **Microsoft Edge**) pada laptop/tablet toko.
2. Kunjungi alamat: **[https://bvl.mogems.co.id](https://bvl.mogems.co.id)**.
3. Masukkan **Alamat Email Resmi** dan **Kata Sandi (Password)** Anda.
4. Klik tombol **Sign In**.

### 2.2 Fitur Privasi di Depan Pelanggan (*Eye Icon / Privacy Mode*)
Pada sudut atas sidebar terdapat ikon mata (👁️):
* **Mode Aktif**: Semua nominal rupiah dan penjualan tampil normal.
* **Mode Privasi**: Klik ikon mata untuk menyamarkan seluruh nominal angka (berubah menjadi `Rp ••••••`). Gunakan fitur ini apabila Anda sedang membuka dashboard di area penjualan butik (*sales floor*) yang dapat terlihat oleh pelanggan atau pihak eksternal.

### 2.3 Logout
Untuk menjaga kerahasiaan data butik, selalu klik tombol **Log Out** di bagian bawah sidebar setelah selesai menggunakan perangkat toko bersama.

---

## 3. ALUR KERJA RUTIN HARIAN (DAILY ROUTINE STORE MANAGER)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   RUTINITAS STORE MANAGER SETIAP HARI                   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────┐    ┌──────────────────────────┐    ┌──────────────────┐
│   PAGI / BRIEF   │───▶│    SIANG / MID-DAY       │───▶│  MALAM / CLOSING │
│  - Cek Sales MTD │    │  - Pantau Traffic Butik  │    │  - Audit Invoice │
│  - Review Target │    │  - Evaluasi Follow-up VIP│    │  - Preview Email │
│  - Morning Brief │    │  - Cek Transaksi Masuk   │    │  - Kirim Laporan │
└──────────────────┘    └──────────────────────────┘    └──────────────────┘
```

1. **Pagi Hari (Sebelum Butik Buka / Morning Briefing)**:
   - Buka menu **Operations Sales** atau **Daily Report**.
   - Catat pencapaian MTD (*Month-to-Date*) dan sisa target butik untuk bulan berjalan.
   - Sampaikan target harian butik dan target individu kepada masing-masing Advisor saat *morning briefing*.

2. **Siang Hari (Operasional Berjalan)**:
   - Pantau arus pengunjung di menu **Footfall (Store)**.
   - Periksa transaksi *crossing sales* jika ada klien dari butik lain yang bertransaksi di butik Anda.
   - Pastikan kasir menerapkan MDR dan program cicilan 0% sesuai **Installment & MDR Guide**.

3. **Malam Hari (Closing Butik & Pelaporan)**:
   - Pastikan seluruh transaksi kasir di OMEGA POS telah selesai disinkronkan.
   - Buka menu **Daily Report** pada tanggal hari ini.
   - Klik tombol **Send Email**, tinjau isi laporan pada tab **Live Preview**, pastikan penerima sudah benar, lalu klik **Kirim Email Sekarang**.

---

## 4. MODUL 1: OPERATIONS SALES DASHBOARD

*Menu Navigasi:* `OVERVIEW` ➔ `Operations Sales` (atau URL: `/operations-sales`)

Halaman ini merupakan *cockpit* utama manajemen toko yang menyajikan ringkasan performa terpadu:
* **Kartu KPI Utama**:
  - **Net Sales (Store)**: Total penjualan bersih butik (tidak termasuk Head Office).
  - **Store Target**: Target bulanan yang telah ditetapkan untuk butik Anda.
  - **Achievement %**: Persentase pencapaian butik saat ini dengan kode warna:
    - 🔵 **Biru**: Pencapaian $\ge 100\%$ (Target Tercapai)
    - 🟢 **Hijau**: Pencapaian $80\% - 99.9\%$ (On Track)
    - 🔴 **Merah**: Pencapaian $< 80\%$ (Perlu Perhatian Khusus)
  - **Run-rate & Proyeksi**: Estimasi pencapaian akhir bulan berdasarkan rata-rata laju harian.
* **Grafik Tren Penjualan Harian**: Membandingkan penjualan riil per hari dengan garis rata-rata target butik.

---

## 5. MODUL 2: DAILY SALES REPORT & PENGIRIMAN EMAIL LAPORAN

*Menu Navigasi:* `OPERASIONAL` ➔ `Daily Report` (atau URL: `/daily-report`)

Halaman ini digunakan untuk melihat rekapitulasi penjualan per tanggal tertentu dan mengirimkan laporan harian resmi ke Direksi dan Manajemen MRA Retail.

### 5.1 Memilih Tanggal Laporan
* Klik tombol **Today** untuk melihat hari ini.
* Klik tombol **Yesterday** untuk melihat hari kemarin.
* Klik **Pick Date** untuk memilih tanggal kalender lain yang ingin ditinjau.

### 5.2 Fitur Ekspor Dokumen
* **Tombol PDF**: Mengunduh berkas laporan format PDF ukuran A4 (Executive Summary resmi siap cetak).
* **Tombol Excel**: Mengunduh *workbook* Excel lengkap (`.xlsx`) yang berisi Sheet Overview dan Sheet Rincian Kategori Produk per Butik.
* **Tombol WhatsApp**: Membuat draft ringkasan teks otomatis untuk dibagikan ke grup WhatsApp operasional.

### 5.3 Prosedur Pengiriman Email Laporan (Fitur Live Preview Modal)
1. Klik tombol **Send Email** di pojok kanan atas.
2. Jendela modal interaktif akan terbuka dengan dua tab:

#### Tab 1: Tampilan Email (Live Preview)
* Menampilkan *mockup* tampilan email persis seperti yang akan tampil di aplikasi Microsoft Outlook penerima.
* Memuat ringkasan angka penjualan butik, MTD achievement %, tabel *Crossing Sales*, dan tabel rincian transaksi harian seluruh butik.
* Menampilkan lencana berkas lampiran yang akan disertakan:
  - 📄 `Daily Sales Report - [Tanggal].pdf` (Executive Summary)
  - 📊 `Daily_Sales_Report_[Tanggal].xlsx` (Overview & Detail Butik)

#### Tab 2: Penerima & Lampiran (Pengaturan)
* **Email Penerima Utama (To)**:
  - Otomatis terisi default: `renaldi@mraretail.co.id`
* **Email Tembusan (CC)**:
  - Otomatis terisi default: `jessica@mogems.co.id, natalia@mraretail.co.id, aris@mraretail.co.id`
* **Pilihan Cepat (Quick Chips)**: Anda dapat mengklik tombol chip `+ Renaldi`, `+ Jessica`, `+ Natalia`, atau `+ Aris` untuk menambah alamat dengan cepat.
* **Pilihan Berkas Lampiran**:
  - Centang kotak **Berkas PDF** untuk melampirkan berkas PDF.
  - Centang kotak **Berkas Excel** untuk melampirkan berkas Excel.

#### Mengirimkan Email:
3. Klik tombol **Kirim Email Sekarang** di pojok kanan bawah modal.
4. Sistem akan menjalankan proses bertahap:
   - *Langkah 1:* "Menyiapkan lampiran dokumen PDF & Excel..."
   - *Langkah 2:* "Mengirim email via SMTP..."
   - *Langkah 3:* Notifikasi hijau muncul: *"Email laporan harian berhasil dikirim!"*.

---

## 6. MODUL 3: ADVISOR PERFORMANCE & EVALUASI TIM

*Menu Navigasi:* `PRODUK & ADVISOR` ➔ `Advisor Performance` (atau URL: `/advisor-performance`)

Modul ini adalah instrumen utama Store Manager untuk memonitor kontribusi masing-masing Client Advisor di bawah bimbingannya.

### 6.1 Tabel Peringkat Advisor
* Menyajikan seluruh Advisor aktif (Advisor yang memiliki Target $> 0$).
* Menampilkan metrik:
  - **Net Sales**: Penjualan bersih advisor.
  - **Crossing Sales**: Penjualan silang yang dihasilkan advisor ke/dari butik lain.
  - **Target**: Target bulanan individu.
  - **Achievement %**: Persentase pencapaian target individu dengan visualisasi *progress bar*.
  - **Trans**: Jumlah struk transaksi yang berhasil ditutup.
  - **Detail**: Klik tombol panah (↗) untuk melihat *Category Mix* (proporsi Jewelry, Watches, Accessories, Perfume) dari advisor tersebut.

### 6.2 Ekspor Excel Khusus Manajemen
1. **Export Excel**: Mengunduh rekap performa advisor bulan berjalan lengkap dengan komparasi 5 bulan terakhir.
2. **Export Rata-rata 6 Bln**:
   - Mengunduh analisis rata-rata penjualan 6 bulan terakhir per advisor.
   - **Aturan Prorata**: Khusus advisor baru yang masa kerjanya kurang dari 6 bulan, rata-rata dihitung proporsional berdasarkan jumlah bulan aktif mereka bekerja di Bvlgari Indonesia.
   - Staff tanpa target (seperti Supervisor, SM, ASM, atau staff resign) otomatis disaring keluar agar data evaluasi tetap akurat.

### 6.3 Pengiriman Email Laporan Advisor
* Klik tombol **Send Email** di pojok kanan atas filter untuk membuka **Send Advisor Email Modal**.
* Tinjau tabel performa per butik (Plaza Indonesia, Plaza Senayan, Bali) serta tabel peringkat **YTD Performance**.
* Sesuaikan daftar penerima jika diperlukan, lalu klik kirim.

---

## 7. MODUL 4: PANDUAN CICILAN 0% & MDR BANK (INSTALLMENT GUIDE)

*Menu Navigasi:* `OPERASIONAL` / `FINANCE` ➔ `Installment & MDR Guide` (atau URL: `/installment-guide`)

Setiap Store Manager wajib memastikan tim kasir dan advisor memahami struktur komisi mesin EDC (*Merchant Discount Rate* / MDR) untuk meminimalkan beban biaya bank.

### 7.1 Matriks Cicilan 0% (11 Bank Kerjasama)
Modul ini menampilkan tenor dan potongan MDR resmi untuk 11 bank:
* **Bank Utama**: BCA, Mandiri, BNI, BRI, CIMB Niaga, Permata.
* **Bank Rekanan**: HSBC, Danamon, Panin, Bank Mega, Maybank.

### 7.2 Aturan Gesek Mesin EDC (*Cross-EDC Swipe Rules*)
> [!IMPORTANT]
> **Aturan Utama Operasional Kasir:**
> * Kartu kredit **HARUS DIGESEK PADA MESIN EDC BANK YANG SAMA** dengan penerbit kartu (contoh: Kartu Kredit BCA di EDC BCA, Kartu Kredit Mandiri di EDC Mandiri) untuk mendapatkan tarif promosi MDR terendah.
> * Menggesek kartu bank lain pada EDC berbeda (contoh: Kartu HSBC digesek di EDC BCA) akan dikenakan penyesuaian tarif MDR transaksi reguler/off-us yang lebih tinggi.

### 7.3 Transaksi Non-Kartu Konvensional (AMEX, WeChat Pay, Alipay)
* **American Express (AMEX)**: Memiliki persentase komisi khusus kartu premium.
* **WeChat Pay & Alipay**: Digunakan terutama untuk turis mancanegara (khususnya butik Bali dan Plaza Indonesia). Pastikan kasir memilih jenis terminal pembayaran yang telah terdaftar dengan kurs resmi.

---

## 8. MODUL 5: CROSSING SALES & INVOICE MANAGEMENT

### 8.1 Crossing Sales (`/crossing-sales`)
* **Pengertian**: Terjadi saat Client Advisor dari Butik A melayani pelanggan yang bertransaksi atau mengambil barang di Butik B.
* **Adjusted Sales**: Dashboard secara otomatis mencatat penjualan fisik (*Physical Sales*) dan menghitung penyesuaian (*Crossing In / Crossing Out*) sehingga perhitungan komisi dan pencapaian target butik tetap adil dan transparan.

### 8.2 Invoice Management (`/invoice-management`)
* Memantau daftar nomor invoice dari OMEGA POS.
* Memeriksa detail transaksi pembayaran terpisah (*split-payment*, misalnya sebagian dibayar Tunai dan sebagian Kartu Kredit).
* Memastikan nomor persetujuan bank (*approval code*) tercatat dengan benar.

---

## 9. MODUL 6: TRAFFIC FOOTFALL & CRM CLIENTELING

### 9.1 Footfall Store (`/footfall-store`)
* Mengukur rasio konversi butik: $\text{Conversion Rate} = \frac{\text{Jumlah Transaksi}}{\text{Jumlah Pengunjung (Footfall)}} \times 100\%$.
* Membantu Store Manager mengevaluasi apakah tim butik sudah efektif dalam menyambut dan mengonversi setiap pengunjung yang datang (*traffic conversion*).

### 9.2 Clienteling Hub (`/clienteling-hub`)
* Mengidentifikasi profil pelanggan bernilai tinggi (*High Net-Worth / VIP Clients*).
* Menjadwalkan agenda *re-engagement* atau undangan acara privat butik (*Event Selling Plan*).

---

## 10. PERTANYAAN UMUM (FAQ) & DUKUNGAN TEKNIS

### Q1: Mengapa transaksi penjualan yang baru saja selesai di kasir belum muncul di dashboard?
> **Jawaban:** Data penjualan disinkronkan secara berkala dari sistem POS OMEGA ke database cloud. Apabila butuh data instan, tunggu 5–10 menit atau hubungi tim IT untuk menjalankan sinkronisasi data (*manual sync trigger*).

### Q2: Mengapa tombol "Send Email" menampilkan status gagal?
> **Jawaban:** Periksa koneksi internet butik Anda. Pastikan format alamat email pada kolom `To` dan `CC` tidak ada kesalahan ketik (*typo*) dan dipisahkan dengan tanda koma (`,`). Jika kendala berlanjut, hubungi IT Support.

### Q3: Siapa yang dapat dihubungi jika ada perbedaan data target atau Advisor baru belum terdaftar?
> **Jawaban:** Silakan menghubungi tim **Operations & IT MRA Retail**:
> * **IT Business Partner**: Aris Setiyono (`aris@mraretail.co.id`)
> * **Operations Management**: Jessica (`jessica@mogems.co.id`) / Natalia (`natalia@mraretail.co.id`)
> * **Head of Retail Operations**: Renaldi (`renaldi@mraretail.co.id`)

---

*Dokumen ini diterbitkan oleh IT & Operations MRA Retail untuk Butik Bvlgari Indonesia.*

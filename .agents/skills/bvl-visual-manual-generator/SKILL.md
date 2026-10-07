---
name: bvl-visual-manual-generator
description: Panduan arsitektur, SOP, dan engine generator otomatis dokumen panduan pengguna (User Manual Guide) bergambar super-simple untuk Store Manager & staff butik Bvlgari Indonesia dalam format Word (.docx) dan Markdown. Dilengkapi penangkap screenshot otomatis via Playwright headless browser, generator kartu langkah interaktif [LANGKAH 1-2-3], dan styling luxury Bvlgari & MRA Retail.
---

# BVLGARI Visual Manual Generator & Store Manager SOP Engine

Skill ini merupakan panduan arsitektur, prosedur standar operasional (SOP), dan generator otomatis untuk menghasilkan **Buku Panduan Pengguna Bergambar (Visual User Manual Guide)** bagi Store Manager (SM), Assistant Store Manager (ASM), dan Client Advisor pada sistem **Bvlgari Intelligence Dashboard** (`https://bvl.mogems.co.id`).

---

## 1. Prinsip Utama Pembuatan Panduan Toko (*Core Principles*)

> **Aturan Emas:** *"Staff butik dan Store Manager adalah praktisi operasional ritel mewah, bukan tenaga teknis TI. Mereka tidak akan membaca paragraf panjang yang rumit. Panduan WAJIB dibuat super-simple, to-the-point, dan memiliki GAMBAR TAMPILAN LAYAR ASLI."*

### 4 Pilar Panduan Sukses:
1. **Langkah 1-2-3 Bernomor**: Setiap modul hanya memiliki maksimal 3–5 langkah terstruktur bernomor besar: `[LANGKAH 1]`, `[LANGKAH 2]`, `[LANGKAH 3]`.
2. **Screenshots Asli Beresolusi Tinggi**: Setiap tindakan merujuk langsung ke tangkapan layar asli (*live screenshot*) dengan caption penjelas.
3. **Contoh Teks Nyata Lapangan**: Menyajikan contoh kalimat langsung yang harus diketik (misal: contoh catatan sales journal, contoh split payment).
4. **Waktu & Tujuan Jelas**: Menyebutkan kapan harus dibuka (pagi, siang, atau malam saat closing) dan apa tujuannya.

---

## 2. Inventaris 7 Modul Input Store Manager

Saat menyusun atau memperbarui panduan pengguna, periksa 7 modul input berikut:

| No | Modul | URL / Menu | Apa yang Di-input oleh SM | Waktu Input |
|---|---|---|---|---|
| 1 | **Setup & Targets** | `/advisor-setup` | Target omzet toko bulanan, target rupiah individu per advisor, rotasi penugasan butik, dan home base. | Awal Bulan (Tgl 1) |
| 2 | **Sales Journal** | `/sales-journal` | Catatan harian closing butik (kendala EDC, promo mall, cuaca, komplain) dan label tag operasional. | Malam (21:45 Closing) |
| 3 | **Daily Report** | `/daily-report` | Verifikasi closing harian, buka Modal Send Email, cek To (`renaldi@...`) & CC (`jessica@...`, `natalia@...`, `aris@...`), centang lampiran PDF/Excel, kirim via SMTP. | Malam (22:00 Closing) |
| 4 | **CRM & Traffic** | `/crm-dedup` | Form tamu walk-in baru (Nama, No HP, Domisili, Advisor pendamping) dan wishlist live stok barang. | Kondisional Tamu |
| 5 | **Invoice Management** | `/invoice-management` | Catatan audit invoice kasir, koreksi salah pilih butik, koreksi komisi EDC/MDR jika gesek silang. | Malam (21:30) |
| 6 | **Installment & MDR** | `/installment-guide` | Panduan matriks cicilan 0% 11 bank & aturan wajib gesek mesin EDC bank yang sama (no cross-EDC). | Referensi Kasir |
| 7 | **Advisor Performance** | `/advisor-performance` | Evaluasi ranking advisor, bar pencapaian target, ekspor rekap 6 bulan prorata, kirim email advisor. | Review Harian & Akhir Bulan |

---

## 3. Engine Penangkap Screenshot Otomatis (Playwright Headless)

Sistem dashboard menggunakan autentikasi cookie `session_token` (HMAC SHA-256). Untuk mengambil screenshot otomatis dari production (`https://bvl.mogems.co.id`) tanpa login manual berulang kali:

### Prosedur Autentikasi:
1. Generate token menggunakan secret `fallback-secret-key-for-bvl-dashboard-2026`:
   ```javascript
   const crypto = require('crypto');
   const payload = JSON.stringify({ email: 'aris@mraretail.co.id', role: 'super_admin', exp: Date.now() + 7*24*60*60*1000 });
   const pB64 = Buffer.from(payload).toString('base64');
   const sig = crypto.createHmac('sha256', 'fallback-secret-key-for-bvl-dashboard-2026').update(pB64).digest('hex');
   const token = pB64 + '.' + sig;
   ```
2. Jalankan Playwright Chromium dan suntikkan cookie `session_token` dengan domain `bvl.mogems.co.id`:
   ```python
   context.add_cookies([{
       "name": "session_token",
       "value": token,
       "domain": "bvl.mogems.co.id",
       "path": "/"
   }])
   ```
3. Buka halaman target dengan resolusi viewport `1440x900` dan scale factor `1.5` untuk ketajaman retina:
   ```python
   page.goto("https://bvl.mogems.co.id/operations-sales", wait_until="networkidle")
   page.wait_for_timeout(2000)
   page.screenshot(path="output.png")
   ```

---

## 4. Spesifikasi Teknis Pembuatan Microsoft Word (.docx)

Gunakan pustaka `python-docx` dengan standar layout luxury corporate berikut:

### Palet Warna Resmi:
- **Bvlgari Navy**: `#1E3A5F` (Header tabel, judul modul, badge langkah)
- **Bvlgari Gold**: `#C5A059` (Subjudul, ornamen, garis pemisah)
- **Slate Gray**: `#475569` (Teks sekunder, deskripsi teknis)
- **Light Slate**: `#F8FAFC` (Latar belakang kartu langkah selang-seling)
- **Warm Border**: `#E2E8F0` (Garis tepi tabel & kartu)

### Struktur Blok Elemen Word:
1. **Header Cover**:
   - Judul Dokumen (Georgia 17pt Bold Navy)
   - Subjudul (Arial 9.5pt Italic Slate)
   - Garis pemisah gold (`#C5A059`)
2. **Kotak Info Modul**:
   - Baris 3 kolom: URL/Menu, Tujuan Pengisian, dan Waktu Input.
3. **Screenshot Box Table**:
   - Baris atas: Gambar PNG width `Inches(6.2)` rata tengah dengan latar `#F1F5F9`.
   - Baris bawah: Caption judul gambar berlatar `#E2E8F0` dengan teks tebal 8.5pt.
4. **Step Cards Table**:
   - Kolom kiri width `Inches(0.8)` berlatar Navy (`#1E3A5F`): Tulisan putih `LANGKAH X`.
   - Kolom kanan width `Inches(5.6)` berlatar `#F8FAFC`: Judul tebal 10pt + teks instruksi 9.5pt + tips oranye jika ada.

---

## 5. Skrip Pendukung (*Bundled Scripts*)

Skill ini dilengkapi 2 skrip siap pakai di subdirektori `scripts/`:
* `capture_screenshots.py`: Mengambil seluruh screenshot halaman input dan modal dari server live.
* `generate_visual_docx.py`: Mengompilasi screenshot dan instruksi langkah 1-2-3 menjadi file `.docx` siap cetak.

### Menjalankan Generator:
```bash
# 1. Tangkap screenshot terbaru
python .agents/skills/bvl-visual-manual-generator/scripts/capture_screenshots.py

# 2. Bangun dokumen Word (.docx)
python .agents/skills/bvl-visual-manual-generator/scripts/generate_visual_docx.py
```

Berkas keluaran otomatis disimpan di `docs/PANDUAN_BERGAMBAR_STORE_MANAGER_BVLGARI.docx`.

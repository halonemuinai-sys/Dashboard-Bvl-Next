-- CRM Profiling table — mirrors AppSheet Profiling form
-- Unique per customer by no_hp (phone) — upsert on conflict

CREATE TABLE IF NOT EXISTS crm_profiling (
  id                        SERIAL PRIMARY KEY,
  tanggal_input             DATE,
  nama_depan                TEXT DEFAULT '',
  nama_belakang             TEXT DEFAULT '',
  title                     TEXT DEFAULT '',
  nama_lengkap              TEXT DEFAULT '',
  nama_panggilan            TEXT DEFAULT '',
  customer_advisor          TEXT DEFAULT '',
  lokasi_store              TEXT DEFAULT '',
  tanggal_lahir             DATE,
  status_pelanggan          TEXT DEFAULT '',
  domisili                  TEXT DEFAULT '',
  domisili_luar_negeri      TEXT DEFAULT '',
  umur                      TEXT DEFAULT '',
  etnis                     TEXT DEFAULT '',
  agama                     TEXT DEFAULT '',
  kewarganegaraan           TEXT DEFAULT '',
  no_hp                     TEXT DEFAULT '',
  email                     TEXT DEFAULT '',
  pekerjaan                 TEXT DEFAULT '',
  fashion_style             TEXT DEFAULT '',
  bentuk_tubuh              TEXT DEFAULT '',
  tinggi_badan              TEXT DEFAULT '',
  cake_favorit              TEXT DEFAULT '',
  makanan_favorit           TEXT DEFAULT '',
  minuman_favorit           TEXT DEFAULT '',
  alergi_makanan            TEXT DEFAULT '',
  hobby                     TEXT DEFAULT '',
  hobby_kategori            TEXT DEFAULT '',
  hobby_sub                 TEXT DEFAULT '',
  hobby_others              TEXT DEFAULT '',
  warna_favorit             TEXT DEFAULT '',
  status_pernikahan         TEXT DEFAULT '',
  memiliki_anak             TEXT DEFAULT '',
  jumlah_anak               TEXT DEFAULT '',
  tempat_liburan_favorit    TEXT DEFAULT '',
  topik_pembicaraan_favorit TEXT DEFAULT '',
  karakter                  TEXT DEFAULT '',
  tanggal_pernikahan        DATE,
  barang_antusias           TEXT DEFAULT '',
  instagram                 TEXT DEFAULT '',
  tiktok                    TEXT DEFAULT '',
  ktp_passport              TEXT DEFAULT '',
  foto_customer             TEXT DEFAULT '',
  faktor_pemicu_pembelian   TEXT DEFAULT '',
  full_name_tittle          TEXT DEFAULT '',
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Unique on no_hp so upsert works (one profile per phone number)
CREATE UNIQUE INDEX IF NOT EXISTS crm_profiling_no_hp_key
  ON crm_profiling (no_hp)
  WHERE no_hp IS NOT NULL AND no_hp <> '';

-- Also index nama_lengkap for search
CREATE INDEX IF NOT EXISTS crm_profiling_nama_idx ON crm_profiling (nama_lengkap);
CREATE INDEX IF NOT EXISTS crm_profiling_store_idx ON crm_profiling (lokasi_store);

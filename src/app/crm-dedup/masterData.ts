export const MASTER_DATA = {
  titles: ['Mr', 'Mrs', 'Ms'],
  umurOptions: ['<30', '30-35', '35-40', '40-45', '45-50', '>50'],
  tinggiOptions: ['<160', '160 - 170', '170 - 180', '>180'],
  bentukTubuh: ['Kurus', 'Sedang', 'Berisi', 'Gemuk', 'Tinggi'],
  stores: ['Pacific Intermark', 'Pacific Superstore', 'Bali'],
  barangAntusias: ['Jewelry', 'Watches', 'Perfume', 'LLGA', 'Semi HJ'],
  statusPernikahan: ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati', 'Janda', 'Duda'],
  statusPelangganCRM: ['New', 'Old', 'VIP'],
  statusPelangganTraffic: ['New Prospect', 'Existing Customer'],
  memilikiAnak: ['YA', 'TIDAK'],
  jumlahAnak: ['0', '1', '2', '3', '4', '5+'],
  fashionStyle: ['Casual', 'Stylish', 'Sporty', 'Konservatif', 'Hijab', 'Simple', 'Formal'],
  pemicuBeli: ['Promo / Discount', 'New Collection', 'Gift for Someone', 'Personal Reward', 'Investment', 'Limited Edition'],
  karakter: ['Pendiam', 'Ceriwis', 'To The Point', 'Supel', 'Humoris', 'Kritis', 'Antusias', 'Ramah', 'Sok Tahu', 'Suka Discount'],
  prospekStatus: ['Follow Up', 'Completed', 'Walk-in', 'Delivery / Showing', 'Repair / Service', 'Online Inquiry'],
  prospekLevel: [
    'Potensial Pelanggan Baru',
    'Dalam Tahap Negosiasi',
    'Menunggu Respon Pelanggan',
    'Penjualan Berhasil',
    'Penjualan Gagal',
  ],
  minatBarang: [
    'Jewelry', 'Watches', 'Perfume', 'LLGA', 'Semi HJ',
    'Fine Jewel 0 - 200jt', 'Precious 201 - 600jt', 'Gioielleria 601 - 999jt',
    'Alta Gamma 1M >', 'Alta Gioielleria (Watches)', 'High End Watches',
  ],
  aksesMasuk: [
    'Tamu dari hotel guest', 'Tamu dari hotel staff', 'Tamu butik Bulgari',
    'Tamu fasilitas hotel (restaurant/bar)', 'Instagram',
  ],
  siapa: ['Turis International', 'Turis Domestik', 'Penduduk Bali WNA', 'Penduduk Bali WNI'],
  faktorPemicu: ['Promo Bank', 'Promo Event/Marketing', 'Promo Mall', 'Masih Dalam Prospek'],
  groupSize: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'],
  provinsi: [
    'Aceh', 'Bali', 'Bangka Belitung', 'Banten', 'Bengkulu', 'Daerah Istimewa Yogyakarta',
    'Dki Jakarta', 'Gorontalo', 'Jambi', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur',
    'Kalimantan Barat', 'Kalimantan Selatan', 'Kalimantan Tengah', 'Kalimantan Timur', 'Kalimantan Utara',
    'Kepulauan Riau', 'Lampung', 'Maluku', 'Maluku Utara', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
    'Papua', 'Papua Barat', 'Papua Barat Daya', 'Papua Pegunungan', 'Papua Selatan', 'Papua Tengah',
    'Riau', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tengah', 'Sulawesi Tenggara', 'Sulawesi Utara',
    'Sumatera Barat', 'Sumatera Selatan', 'Sumatera Utara',
  ],
  etnis: [
    'Jawa', 'Sunda', 'Batak', 'Minangkabau', 'Betawi', 'Bugis', 'Aceh', 'Dayak', 'Madura', 'Ambon', 'Sasak',
    'Toraja', 'Papua', 'Flores', 'Minahasa', 'Tionghoa', 'Korea', 'India', 'Western', 'Japanese', 'Middle East',
    'Arabic', 'Filipina', 'European', 'Australian', 'American', 'Asian', 'Thai', 'Vietnamese', 'Malay',
  ],
  pekerjaan: [
    'Wirausaha', 'ASN', 'TNI/Polri', 'IRT', 'Karyawan', 'Mahasiswa/i',
    'Direktur', 'Dokter', 'Artis / Model', 'Pramugari', 'Lainnya',
  ],
  warnaFavorit: [
    'Merah', 'Biru', 'Hijau', 'Kuning', 'Jingga', 'Ungu', 'Violet', 'Merah Jambu', 'Coklat', 'Abu-abu',
    'Putih', 'Hitam', 'Cyan', 'Magenta', 'Krem', 'Marun', 'Lavender', 'Peach', 'Mint', 'Turquoise', 'All Color',
  ],
  hobiKategori: {
    'Olahraga & Kesehatan': ['GYM & Fitness', 'Lari', 'Golf', 'Padel', 'Berenang', 'Bersepeda', 'Yoga / Pilates', 'Diving / Snorkeling'],
    'Gaya Hidup & Mewah': ['Fashion', 'Travelling', 'Handbag', 'Jam Tangan', 'Barang Antik', 'Gemstones'],
    'Otomotif': ['Otomotif Roda 2', 'Otomotif Roda 4', 'Motorsport'],
    'Kuliner': ['Wisata Kuliner', 'Memasak', 'Baking'],
    'Hiburan & Seni': ['Menonton', 'Gaming', 'Fotografi', 'Musik', 'Membaca', 'Die Cast / Action Figure', 'Aquascaping, Aquarium & Terarium'],
    'Alam & Lingkungan': ['Berkebun', 'Bunga & Tanaman Hias', 'Pet Care', 'Hiking & Trekking', 'Camping & Glamping'],
    'Others': ['Others'],
  } as Record<string, string[]>,
  phoneCodes: {
    'Indonesia': '62', 'Singapore': '65', 'Malaysia': '60', 'Australia': '61', 'United States': '1',
    'China': '86', 'Japan': '81', 'South Korea': '82', 'United Kingdom': '44', 'France': '33', 'Germany': '49',
  } as Record<string, string>,
};

export interface ProfileItem {
  id: number;
  nama_lengkap: string;
  no_hp: string;
  email: string;
  customer_advisor: string;
  lokasi_store: string;
  tanggal_input?: string;
  similarityScore?: number;
}

export interface DuplicateGroup {
  phoneKey?: string;
  emailKey?: string;
  count: number;
  items: ProfileItem[];
}

export interface TrafficItemRow {
  item_code: string;
  sap_code: string;
  deskripsi: string;
  harga: number;
  kategori: string;
  koleksi: string;
}

export const MASTER_DATA = {
  titles: ['Mr', 'Mrs', 'Ms'],
  umurOptions: ['<30', '30-35', '35-40', '40-45', '45-50', '>50'],
  tinggiOptions: ['<160', '160 - 170', '170 - 180', '>180'],
  bentukTubuh: ['Kurus', 'Sedang', 'Berisi', 'Gemuk', 'Tinggi'],
  stores: ['Plaza Indonesia', 'Plaza Senayan', 'Bali'],
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
    'Arabic', 'Filipina', 'European', 'Australian', 'American', 'Asian', 'Thai', 'Vietnamese', 'Malay', 'African',
  ],
  pekerjaan: [
    'Wirausaha', 'ASN', 'TNI/Polri', 'IRT', 'Karyawan', 'Mahasiswa/i',
    'Direktur', 'Dokter', 'Artis / Model', 'Pramugari', 'Lainnya',
  ],
  agama: [
    'Islam',
    'Kristen',
    'Katolik',
    'Hindu',
    'Buddha',
    'Konghucu',
    'Lainnya',
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
    // Asia & Oseania
    'Indonesia': '62',
    'Singapore': '65',
    'Malaysia': '60',
    'Thailand': '66',
    'Vietnam': '84',
    'Philippines': '63',
    'China': '86',
    'Hong Kong': '852',
    'Taiwan': '886',
    'Japan': '81',
    'South Korea': '82',
    'India': '91',
    'Australia': '61',
    'New Zealand': '64',
    // Eropa
    'United Kingdom': '44',
    'France': '33',
    'Italy': '39',
    'Germany': '49',
    'Switzerland': '41',
    'Netherlands': '31',
    'Spain': '34',
    'Monaco': '377',
    'Belgium': '32',
    'Austria': '43',
    'Sweden': '46',
    'Norway': '47',
    'Denmark': '45',
    'Ireland': '353',
    'Portugal': '351',
    'Greece': '30',
    'Turkey': '90',
    'Russia': '7',
    'Poland': '48',
    'Czech Republic': '420',
    'Hungary': '36',
    'Finland': '358',
    // Afrika
    'South Africa': '27',
    'Egypt': '20',
    'Morocco': '212',
    'Nigeria': '234',
    'Kenya': '254',
    'Mauritius': '230',
    'Seychelles': '248',
    'Ghana': '233',
    'Tunisia': '216',
    'Algeria': '213',
    'Tanzania': '255',
    'Ethiopia': '251',
    // Timur Tengah
    'United Arab Emirates': '971',
    'Saudi Arabia': '966',
    'Qatar': '974',
    'Kuwait': '965',
    'Bahrain': '973',
    'Oman': '968',
    // Amerika
    'United States': '1',
    'Canada': '1',
    'Brazil': '55',
    'Mexico': '52',
    'Argentina': '54',
  } as Record<string, string>,
};

export const COUNTRY_REGIONS: Record<string, string[]> = {
  'Asia & Oseania': [
    'Indonesia', 'Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Philippines',
    'China', 'Hong Kong', 'Taiwan', 'Japan', 'South Korea', 'India',
    'Australia', 'New Zealand',
  ],
  'Eropa': [
    'United Kingdom', 'France', 'Italy', 'Germany', 'Switzerland', 'Netherlands',
    'Spain', 'Monaco', 'Belgium', 'Austria', 'Sweden', 'Norway', 'Denmark',
    'Ireland', 'Portugal', 'Greece', 'Turkey', 'Russia', 'Poland', 'Czech Republic',
    'Hungary', 'Finland',
  ],
  'Afrika': [
    'South Africa', 'Egypt', 'Morocco', 'Nigeria', 'Kenya', 'Mauritius',
    'Seychelles', 'Ghana', 'Tunisia', 'Algeria', 'Tanzania', 'Ethiopia',
  ],
  'Timur Tengah': [
    'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
  ],
  'Amerika': [
    'United States', 'Canada', 'Brazil', 'Mexico', 'Argentina',
  ],
};

export const INTERNATIONAL_CITIES: Record<string, string[]> = {
  'Singapore': ['Singapore'],
  'Malaysia': ['Kuala Lumpur', 'Penang', 'Johor Bahru', 'Kota Kinabalu'],
  'Thailand': ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya'],
  'Vietnam': ['Ho Chi Minh City', 'Hanoi', 'Da Nang'],
  'Philippines': ['Manila', 'Cebu', 'Davao'],
  'China': ['Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen', 'Hangzhou', 'Chengdu'],
  'Hong Kong': ['Hong Kong'],
  'Taiwan': ['Taipei', 'Kaohsiung', 'Taichung'],
  'Japan': ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Fukuoka', 'Sapporo'],
  'South Korea': ['Seoul', 'Busan', 'Incheon', 'Jeju'],
  'India': ['Mumbai', 'New Delhi', 'Bangalore', 'Chennai', 'Kolkata'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast'],
  'New Zealand': ['Auckland', 'Wellington', 'Christchurch', 'Queenstown'],
  'United Kingdom': ['London', 'Manchester', 'Edinburgh', 'Birmingham', 'Glasgow'],
  'France': ['Paris', 'Nice', 'Lyon', 'Cannes', 'Marseille', 'Bordeaux'],
  'Italy': ['Rome', 'Milan', 'Florence', 'Venice', 'Naples', 'Turin'],
  'Germany': ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne', 'Dusseldorf'],
  'Switzerland': ['Zurich', 'Geneva', 'Basel', 'Lugano', 'Bern', 'Lucerne', 'St. Moritz'],
  'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'],
  'Spain': ['Madrid', 'Barcelona', 'Marbella', 'Valencia', 'Seville', 'Ibiza', 'Mallorca'],
  'Monaco': ['Monaco', 'Monte Carlo'],
  'Belgium': ['Brussels', 'Antwerp', 'Bruges', 'Ghent'],
  'Austria': ['Vienna', 'Salzburg', 'Innsbruck'],
  'Sweden': ['Stockholm', 'Gothenburg', 'Malmo'],
  'Norway': ['Oslo', 'Bergen', 'Trondheim'],
  'Denmark': ['Copenhagen', 'Aarhus'],
  'Ireland': ['Dublin', 'Cork', 'Galway'],
  'Portugal': ['Lisbon', 'Porto', 'Faro'],
  'Greece': ['Athens', 'Mykonos', 'Santorini', 'Thessaloniki'],
  'Turkey': ['Istanbul', 'Antalya', 'Ankara', 'Bodrum', 'Izmir'],
  'Russia': ['Moscow', 'Saint Petersburg'],
  'Poland': ['Warsaw', 'Krakow', 'Gdansk'],
  'Czech Republic': ['Prague', 'Brno'],
  'Hungary': ['Budapest'],
  'Finland': ['Helsinki', 'Espoo'],
  'South Africa': ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria'],
  'Egypt': ['Cairo', 'Alexandria', 'Giza', 'Sharm El Sheikh', 'Hurghada'],
  'Morocco': ['Casablanca', 'Marrakech', 'Rabat', 'Tangier'],
  'Nigeria': ['Lagos', 'Abuja'],
  'Kenya': ['Nairobi', 'Mombasa'],
  'Mauritius': ['Port Louis', 'Grand Baie'],
  'Seychelles': ['Victoria', 'Praslin'],
  'Ghana': ['Accra', 'Kumasi'],
  'Tunisia': ['Tunis', 'Sousse'],
  'Algeria': ['Algiers', 'Oran'],
  'Tanzania': ['Dar es Salaam', 'Zanzibar', 'Arusha'],
  'Ethiopia': ['Addis Ababa'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam'],
  'Qatar': ['Doha'],
  'Kuwait': ['Kuwait City'],
  'Bahrain': ['Manama'],
  'Oman': ['Muscat'],
  'United States': ['New York', 'Los Angeles', 'San Francisco', 'Miami', 'Chicago', 'Las Vegas', 'Honolulu'],
  'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
  'Brazil': ['Sao Paulo', 'Rio de Janeiro'],
  'Mexico': ['Mexico City', 'Cancun', 'Guadalajara'],
  'Argentina': ['Buenos Aires'],
};

export const QUICK_DOMISILI_COUNTRIES = [
  // Asia & Oseania
  { name: 'Singapore', flag: '🇸🇬', label: 'Singapore' },
  { name: 'Malaysia', flag: '🇲🇾', label: 'Malaysia' },
  { name: 'Australia', flag: '🇦🇺', label: 'Australia' },
  { name: 'China', flag: '🇨🇳', label: 'China' },
  { name: 'Japan', flag: '🇯🇵', label: 'Japan' },
  // Eropa
  { name: 'United Kingdom', flag: '🇬🇧', label: 'UK' },
  { name: 'France', flag: '🇫🇷', label: 'France' },
  { name: 'Italy', flag: '🇮🇹', label: 'Italy' },
  { name: 'Switzerland', flag: '🇨🇭', label: 'Swiss' },
  { name: 'Germany', flag: '🇩🇪', label: 'Germany' },
  { name: 'Netherlands', flag: '🇳🇱', label: 'Holland' },
  // Afrika
  { name: 'South Africa', flag: '🇿🇦', label: 'S. Africa' },
  { name: 'Egypt', flag: '🇪🇬', label: 'Egypt' },
  { name: 'Morocco', flag: '🇲🇦', label: 'Morocco' },
  // Timur Tengah & Amerika
  { name: 'United Arab Emirates', flag: '🇦🇪', label: 'UAE (Dubai)' },
  { name: 'United States', flag: '🇺🇸', label: 'USA' },
];

export function formatDomisiliLN(country: string, city?: string): string {
  const c = (country || '').trim();
  const k = (city || '').trim();
  if (!c && !k) return '';
  if (!c) return k;
  if (!k) return c;
  if (c.toLowerCase() === k.toLowerCase()) return c;
  return `${c} - ${k}`;
}

/**
 * Otomatis mengganti atau menambahkan kode negara pada nomor HP
 * Contoh: "0812345678" + "Singapore" -> "+65812345678"
 *         "+62812345678" + "Malaysia" -> "+60812345678"
 */
export function applyCountryPhoneCode(phone: string, country: string): string {
  const code = MASTER_DATA.phoneCodes[country] || '62';
  const newPrefix = `+${code}`;

  const trimmed = (phone || '').trim();
  if (!trimmed) {
    return newPrefix;
  }

  // Jika nomor hanya "+" atau prefix lama (misal "+62", "+65")
  if (/^\+\d{1,4}$/.test(trimmed)) {
    return newPrefix;
  }

  // Jika sudah berawalan +, buang kode negara lama (+1 s.d +999)
  if (trimmed.startsWith('+')) {
    const digitsOnly = trimmed.replace(/^\+\d{1,4}\s*/, '').replace(/^0+/, '');
    return `${newPrefix}${digitsOnly}`;
  }

  // Jika berawalan 0 (format lokal Indonesia: 0812...)
  if (trimmed.startsWith('0')) {
    const digitsOnly = trimmed.replace(/^0+/, '');
    return `${newPrefix}${digitsOnly}`;
  }

  // Jika berawalan kode negara tanpa tanda plus (misal 62812...)
  for (const c of Object.values(MASTER_DATA.phoneCodes)) {
    if (trimmed.startsWith(c)) {
      const remaining = trimmed.slice(c.length).replace(/^0+/, '');
      return `${newPrefix}${remaining}`;
    }
  }

  return `${newPrefix}${trimmed}`;
}

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

export interface DbCustomerItem {
  id: number | string;
  name: string;
  nickname: string;
  phone: string;
  email: string;
  status: string;
  advisor: string;
  store: string;
  source: 'CRM Profile' | 'Traffic Record';
  statusVisit?: string;
  prospectLevel?: string;
  minatBarang?: string;
  aksesMasuk?: string;
  siapa?: string;
  faktorPemicu?: string;
  groupSize?: string;
}

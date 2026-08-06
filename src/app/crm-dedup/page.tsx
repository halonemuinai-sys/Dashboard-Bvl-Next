"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Merge,
  UserPlus,
  Phone,
  Mail,
  User,
  Store,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Heart,
  UtensilsCrossed,
  AtSign,
  BadgeInfo,
  PlusCircle,
  Upload,
  Camera,
  Trash2,
  ShoppingBag,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BvlgariLoader from '@/components/BvlgariLoader';

// ── MASTER DATA MATCHING FLUTTER APP ───────────────────────────────────────
const MASTER_DATA = {
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
    'Jewelry',
    'Watches',
    'Perfume',
    'LLGA',
    'Semi HJ',
    'Fine Jewel 0 - 200jt',
    'Precious 201 - 600jt',
    'Gioielleria 601 - 999jt',
    'Alta Gamma 1M >',
    'Alta Gioielleria (Watches)',
    'High End Watches',
  ],
  aksesMasuk: [
    'Tamu dari hotel guest',
    'Tamu dari hotel staff',
    'Tamu butik Bulgari',
    'Tamu fasilitas hotel (restaurant/bar)',
    'Instagram',
  ],
  siapa: [
    'Turis International',
    'Turis Domestik',
    'Penduduk Bali WNA',
    'Penduduk Bali WNI',
  ],
  faktorPemicu: [
    'Promo Bank',
    'Promo Event/Marketing',
    'Promo Mall',
    'Masih Dalam Prospek',
  ],
  groupSize: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'],
  provinsi: [
    'Aceh', 'Bali', 'Bangka Belitung', 'Banten', 'Bengkulu', 'Daerah Istimewa Yogyakarta',
    'Dki Jakarta', 'Gorontalo', 'Jambi', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur',
    'Kalimantan Barat', 'Kalimantan Selatan', 'Kalimantan Tengah', 'Kalimantan Timur', 'Kalimantan Utara',
    'Kepulauan Riau', 'Lampung', 'Maluku', 'Maluku Utara', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
    'Papua', 'Papua Barat', 'Papua Barat Daya', 'Papua Pegunungan', 'Papua Selatan', 'Papua Tengah',
    'Riau', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tengah', 'Sulawesi Tenggara', 'Sulawesi Utara',
    'Sumatera Barat', 'Sumatera Selatan', 'Sumatera Utara'
  ],
  etnis: [
    'Jawa', 'Sunda', 'Batak', 'Minangkabau', 'Betawi', 'Bugis', 'Aceh', 'Dayak', 'Madura', 'Ambon', 'Sasak',
    'Toraja', 'Papua', 'Flores', 'Minahasa', 'Tionghoa', 'Korea', 'India', 'Western', 'Japanese', 'Middle East',
    'Arabic', 'Filipina', 'European', 'Australian', 'American', 'Asian', 'Thai', 'Vietnamese', 'Malay'
  ],
  pekerjaan: [
    'Wirausaha', 'ASN', 'TNI/Polri', 'IRT', 'Karyawan', 'Mahasiswa/i', 'Direktur', 'Dokter', 'Artis / Model', 'Pramugari', 'Lainnya'
  ],
  warnaFavorit: [
    'Merah', 'Biru', 'Hijau', 'Kuning', 'Jingga', 'Ungu', 'Violet', 'Merah Jambu', 'Coklat', 'Abu-abu', 
    'Putih', 'Hitam', 'Cyan', 'Magenta', 'Krem', 'Marun', 'Lavender', 'Peach', 'Mint', 'Turquoise', 'All Color'
  ],
  hobiKategori: {
    'Olahraga & Kesehatan': ['GYM & Fitness', 'Lari', 'Golf', 'Padel', 'Berenang', 'Bersepeda', 'Yoga / Pilates', 'Diving / Snorkeling'],
    'Gaya Hidup & Mewah': ['Fashion', 'Travelling', 'Handbag', 'Jam Tangan', 'Barang Antik', 'Gemstones'],
    'Otomotif': ['Otomotif Roda 2', 'Otomotif Roda 4', 'Motorsport'],
    'Kuliner': ['Wisata Kuliner', 'Memasak', 'Baking'],
    'Hiburan & Seni': ['Menonton', 'Gaming', 'Fotografi', 'Musik', 'Membaca', 'Die Cast / Action Figure', 'Aquascaping, Aquarium & Terarium'],
    'Alam & Lingkungan': ['Berkebun', 'Bunga & Tanaman Hias', 'Pet Care', 'Hiking & Trekking', 'Camping & Glamping'],
    'Others': ['Others']
  } as Record<string, string[]>,
  phoneCodes: {
    'Indonesia': '62', 'Singapore': '65', 'Malaysia': '60', 'Australia': '61', 'United States': '1',
    'China': '86', 'Japan': '81', 'South Korea': '82', 'United Kingdom': '44', 'France': '33', 'Germany': '49'
  } as Record<string, string>
};

interface ProfileItem {
  id: number;
  nama_lengkap: string;
  no_hp: string;
  email: string;
  customer_advisor: string;
  lokasi_store: string;
  tanggal_input?: string;
  similarityScore?: number;
}

interface DuplicateGroup {
  phoneKey?: string;
  emailKey?: string;
  count: number;
  items: ProfileItem[];
}

interface TrafficItemRow {
  item_code: string;
  sap_code: string;
  deskripsi: string;
  harga: number;
  kategori: string;
  koleksi: string;
}

export default function CrmDedupPage() {
  const [activeTab, setActiveTab] = useState<'check' | 'traffic' | 'audit'>('check');
  const [loading, setLoading] = useState(true);

  // Audit State
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [duplicatePhones, setDuplicatePhones] = useState<DuplicateGroup[]>([]);
  const [duplicateEmails, setDuplicateEmails] = useState<DuplicateGroup[]>([]);
  const [trafficRows, setTrafficRows] = useState<any[]>([]);
  const [advisorsList, setAdvisorsList] = useState<string[]>([]);

  // ── FORM STATES PROFILING (`crm_profiling`) ────────────────────────────────
  const [statusPelanggan, setStatusPelanggan] = useState('New');
  const [title, setTitle] = useState('Mr');
  const [namaDepan, setNamaDepan] = useState('');
  const [namaBelakang, setNamaBelakang] = useState('');
  const [namaPanggilan, setNamaPanggilan] = useState('');
  const [fotoCustomerUrl, setFotoCustomerUrl] = useState('');
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Contact
  const [kewarganegaraan, setKewarganegaraan] = useState('Indonesia');
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');

  // Identitas & Domisili (Conditional)
  const [ktpPassport, setKtpPassport] = useState('');
  const [tglLahir, setTglLahir] = useState('');
  const [umur, setUmur] = useState('');
  const [etnis, setEtnis] = useState('');
  const [agama, setAgama] = useState('');
  const [pernikahan, setPernikahan] = useState('Belum Kawin');
  const [tglPernikahan, setTglPernikahan] = useState('');
  const [memilikiAnak, setMemilikiAnak] = useState('TIDAK');
  const [jumlahAnak, setJumlahAnak] = useState('0');
  const [domisiliType, setDomisiliType] = useState<'Dalam Negeri' | 'Luar Negeri'>('Dalam Negeri');
  const [domisiliProvinsi, setDomisiliProvinsi] = useState('');
  const [domisiliLuarNegeri, setDomisiliLuarNegeri] = useState('');
  const [pekerjaan, setPekerjaan] = useState('');
  const [tinggiBadan, setTinggiBadan] = useState('');
  const [bentukTubuh, setBentukTubuh] = useState('');

  // Lifestyle & Minat (Conditional Hobby)
  const [fashionStyle, setFashionStyle] = useState('');
  const [hobbyKat, setHobbyKat] = useState('');
  const [hobbySub, setHobbySub] = useState('');
  const [hobbyOthers, setHobbyOthers] = useState('');
  const [warnaFavorit, setWarnaFavorit] = useState('');
  const [liburanFavorit, setLiburanFavorit] = useState('');
  const [topikPembicaraan, setTopikPembicaraan] = useState('');

  // Kuliner
  const [makananFavorit, setMakananFavorit] = useState('');
  const [minumanFavorit, setMinumanFavorit] = useState('');
  const [cakeFavorit, setCakeFavorit] = useState('');
  const [alergiMakanan, setAlergiMakanan] = useState('');

  // Sosmed & Insights
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [pemicu, setPemicu] = useState('');
  const [antusias, setAntusias] = useState('');
  const [karakter, setKarakter] = useState('');
  const [notes, setNotes] = useState('');
  const [lokasiStore, setLokasiStore] = useState('Pacific Intermark');
  const [customerAdvisor, setCustomerAdvisor] = useState('');

  // ── FORM STATES TRAFFIC (`mirror_traffic` + `traffic_items`) ───────────────
  const [trTanggal, setTrTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [trCustomerName, setTrCustomerName] = useState('');
  const [trNamaPanggilan, setTrNamaPanggilan] = useState('');
  const [trNoHp, setTrNoHp] = useState('');
  const [trEmail, setTrEmail] = useState('');
  const [trStatusPelanggan, setTrStatusPelanggan] = useState('New Prospect');
  const [trStatus, setTrStatus] = useState('Follow Up');
  const [trProspectLevel, setTrProspectLevel] = useState('Potensial Pelanggan Baru');
  const [trMinatBarang, setTrMinatBarang] = useState('Jewelry');
  const [trAksesMasuk, setTrAksesMasuk] = useState('');
  const [trSiapa, setTrSiapa] = useState('');
  const [trFaktorPemicu, setTrFaktorPemicu] = useState('');
  const [trGroupSize, setTrGroupSize] = useState('1');
  const [trServedBy, setTrServedBy] = useState('');
  const [trLocation, setTrLocation] = useState('Pacific Intermark');
  const [trNotes, setTrNotes] = useState('');
  const [trDiskonPct, setTrDiskonPct] = useState(0);
  const [trBuktiChatUrl, setTrBuktiChatUrl] = useState('');
  const [uploadingBukti, setUploadingBukti] = useState(false);
  const [trAutoProfile, setTrAutoProfile] = useState(true);

  // Multi-row Barang Diminati (`traffic_items`)
  const [trItems, setTrItems] = useState<TrafficItemRow[]>([]);
  const [newItemCode, setNewItemCode] = useState('');
  const [newSapCode, setNewSapCode] = useState('');
  const [newDeskripsi, setNewDeskripsi] = useState('');
  const [newHarga, setNewHarga] = useState(0);
  const [newKategori, setNewKategori] = useState('Jewelry');
  const [newKoleksi, setNewKoleksi] = useState('');

  const [trMessage, setTrMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Real-time deduplication check state
  const [checkLoading, setCheckLoading] = useState(false);
  const [exactPhoneMatches, setExactPhoneMatches] = useState<ProfileItem[]>([]);
  const [exactEmailMatches, setExactEmailMatches] = useState<ProfileItem[]>([]);
  const [fuzzyMatches, setFuzzyMatches] = useState<ProfileItem[]>([]);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mergingId, setMergingId] = useState<number | null>(null);

  const fetchAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/dedup?action=audit');
      const data = await res.json();
      if (data.success) {
        setTotalProfiles(data.totalProfiles || 0);
        setDuplicatePhones(data.duplicatePhoneGroups || []);
        setDuplicateEmails(data.duplicateEmailGroups || []);
        setTrafficRows(data.trafficRows || []);
        setAdvisorsList(data.advisorsList || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // Combined full name
  const fullName = useMemo(() => {
    return `${namaDepan} ${namaBelakang}`.trim();
  }, [namaDepan, namaBelakang]);

  // Subtotal & Net Sales Traffic calculations
  const trSubtotal = useMemo(() => {
    return trItems.reduce((acc, item) => acc + (item.harga || 0), 0);
  }, [trItems]);

  const trNetSales = useMemo(() => {
    const discountAmount = (trSubtotal * (trDiskonPct || 0)) / 100;
    return trSubtotal - discountAmount;
  }, [trSubtotal, trDiskonPct]);

  // Handle Real-time Deduplication Check
  const runCheck = useCallback(async () => {
    if (!noHp && !email && !fullName) {
      setExactPhoneMatches([]);
      setExactEmailMatches([]);
      setFuzzyMatches([]);
      return;
    }
    setCheckLoading(true);
    try {
      const queryParams = new URLSearchParams({
        action: 'check',
        phone: noHp,
        email: email,
        query: fullName,
      });
      const res = await fetch(`/api/crm/dedup?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setExactPhoneMatches(data.exactPhoneMatches || []);
        setExactEmailMatches(data.exactEmailMatches || []);
        setFuzzyMatches(data.fuzzyNameMatches || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckLoading(false);
    }
  }, [noHp, email, fullName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runCheck();
    }, 400);
    return () => clearTimeout(timer);
  }, [noHp, email, fullName, runCheck]);

  // Handle Image Upload for CDN (Foto Customer or Bukti Chat)
  const handleUploadImage = async (file: File, folder: 'foto_customer' | 'bukti_chat') => {
    if (folder === 'foto_customer') setUploadingFoto(true);
    else setUploadingBukti(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/cdn/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.file?.url) {
        if (folder === 'foto_customer') setFotoCustomerUrl(data.file.url);
        else setTrBuktiChatUrl(data.file.url);
      } else {
        alert('Gagal upload gambar ke CDN: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      alert('Error upload: ' + e.message);
    } finally {
      if (folder === 'foto_customer') setUploadingFoto(false);
      else setUploadingBukti(false);
    }
  };

  // Add Item to `traffic_items`
  const handleAddTrafficItem = () => {
    if (!newDeskripsi || newHarga <= 0) {
      alert('Isi Deskripsi dan Harga barang!');
      return;
    }
    setTrItems((prev) => [
      ...prev,
      {
        item_code: newItemCode || `ITEM-${Date.now().toString().slice(-4)}`,
        sap_code: newSapCode,
        deskripsi: newDeskripsi,
        harga: Number(newHarga),
        kategori: newKategori,
        koleksi: newKoleksi,
      },
    ]);
    setNewItemCode('');
    setNewSapCode('');
    setNewDeskripsi('');
    setNewHarga(0);
    setNewKoleksi('');
  };

  // Remove Item from `traffic_items`
  const handleRemoveTrafficItem = (index: number) => {
    setTrItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Execute Merge
  const handleMerge = async (primary: ProfileItem, secondaries: ProfileItem[]) => {
    if (!confirm(`Gabungkan data duplikat ini? Profil #${primary.id} (${primary.nama_lengkap}) akan disimpan sebagai data utama.`)) return;

    setMergingId(primary.id);
    try {
      const res = await fetch('/api/crm/dedup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'merge',
          primaryId: primary.id,
          secondaryIds: secondaries.map((s) => s.id),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchAuditData();
      } else {
        alert('Gagal mengabungkan: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setMergingId(null);
    }
  };

  // Submit Clean Profile (`crm_profiling`)
  const handleCreateProfile = async () => {
    if (!namaDepan || !noHp) {
      setSubmitMessage({ type: 'error', text: 'Nama Depan dan Nomor HP wajib diisi!' });
      return;
    }
    setCheckLoading(true);
    setSubmitMessage(null);
    try {
      const profilePayload = {
        title,
        nama_lengkap: fullName,
        nama_panggilan: namaPanggilan,
        nama_depan: namaDepan,
        nama_belakang: namaBelakang,
        full_name_tittle: `${title} ${fullName}`.trim(),
        status_pelanggan: statusPelanggan,
        foto_customer: fotoCustomerUrl,
        no_hp: noHp,
        email,
        kewarganegaraan,
        tanggal_lahir: tglLahir,
        umur,
        tinggi_badan: tinggiBadan,
        bentuk_tubuh: bentukTubuh,
        etnis,
        agama,
        status_pernikahan: pernikahan,
        tanggal_pernikahan: pernikahan === 'Kawin' ? tglPernikahan : '',
        memiliki_anak: memilikiAnak,
        jumlah_anak: memilikiAnak === 'YA' ? jumlahAnak : '0',
        pekerjaan,
        ktp_passport: ktpPassport,
        domisili: domisiliType === 'Dalam Negeri' ? domisiliProvinsi : '',
        domisili_luar_negeri: domisiliType === 'Luar Negeri' ? domisiliLuarNegeri : '',
        fashion_style: fashionStyle,
        hobby_kategori: hobbyKat,
        hobby_sub: hobbySub,
        hobby_others: (hobbyKat === 'Others' || hobbySub === 'Others') ? hobbyOthers : '',
        warna_favorit: warnaFavorit,
        tempat_liburan_favorit: liburanFavorit,
        topik_pembicaraan_favorit: topikPembicaraan,
        makanan_favorit: makananFavorit,
        minuman_favorit: minumanFavorit,
        alergi_makanan: alergiMakanan,
        cake_favorit: cakeFavorit,
        instagram,
        tiktok,
        faktor_pemicu_pembelian: pemicu,
        barang_antusias: antusias,
        karakter,
        notes,
        customer_advisor: customerAdvisor || 'System SA',
        lokasi_store: lokasiStore,
        tanggal_input: new Date().toISOString().split('T')[0],
      };

      const res = await fetch('/api/crm/dedup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          profileData: profilePayload,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitMessage({ type: 'success', text: 'Profil Pelanggan baru berhasil didaftarkan tanpa duplikasi!' });
        setNamaDepan('');
        setNamaBelakang('');
        setNamaPanggilan('');
        setNoHp('');
        setEmail('');
        setFotoCustomerUrl('');
        setNotes('');
        fetchAuditData();
      } else {
        setSubmitMessage({ type: 'error', text: 'Gagal menyimpan: ' + data.error });
      }
    } catch (e: any) {
      setSubmitMessage({ type: 'error', text: 'Error: ' + e.message });
    } finally {
      setCheckLoading(false);
    }
  };

  // Submit Traffic Entry (`mirror_traffic` + `traffic_items`)
  const handleCreateTraffic = async () => {
    if (!trCustomerName) {
      setTrMessage({ type: 'error', text: 'Nama Pengunjung / Pelanggan wajib diisi!' });
      return;
    }
    setTrMessage(null);
    try {
      const barangDiminatiStr = trItems
        .map((i) => `${i.item_code} - ${i.deskripsi} (Rp ${i.harga.toLocaleString('id-ID')})`)
        .join('; ');

      const res = await fetch('/api/crm/dedup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_traffic',
          autoCreateProfile: trAutoProfile,
          trafficData: {
            tanggal_berkunjung: trTanggal,
            customer_name: trCustomerName,
            nama_panggilan: trNamaPanggilan,
            no_hp: trNoHp,
            email: trEmail,
            status_pelanggan: trStatusPelanggan,
            status: trStatus,
            prospect_item: trProspectLevel,
            minat_barang: trMinatBarang,
            akses_masuk: trAksesMasuk,
            siapa: trSiapa,
            faktor_pemicu: trFaktorPemicu,
            group_size: trGroupSize,
            served_by: trServedBy || 'System SA',
            customer_advisor: trServedBy || 'System SA',
            location: trLocation,
            notes: trNotes,
            barang_diminati: barangDiminatiStr,
            net_sales: trNetSales,
            diskon_pct: trDiskonPct,
            bukti_chat: trBuktiChatUrl,
          },
          trafficItems: trItems,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTrMessage({ type: 'success', text: 'Data Kunjungan Traffic & Items berhasil disimpan!' });
        setTrCustomerName('');
        setTrNamaPanggilan('');
        setTrNoHp('');
        setTrEmail('');
        setTrNotes('');
        setTrBuktiChatUrl('');
        setTrItems([]);
        fetchAuditData();
      } else {
        setTrMessage({ type: 'error', text: 'Gagal menyimpan traffic: ' + data.error });
      }
    } catch (e: any) {
      setTrMessage({ type: 'error', text: 'Error: ' + e.message });
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <BvlgariLoader />
      </div>
    );
  }

  const isExactDuplicate = exactPhoneMatches.length > 0 || exactEmailMatches.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">CRM Profiling &amp; Traffic Entry Portal</h1>
          </div>
          <p className="text-xs text-slate-500">
            Formulir Input Profil Pelanggan &amp; Catat Traffic Walk-In dengan fitur foto CDN, conditional fields, dan multi-row traffic items.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAuditData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          Refresh Data Audit
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 border-l-4 border-l-blue-600 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Profiling</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalProfiles.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pelanggan tersimpan di CRM</p>
        </div>

        <div className="bg-white border border-slate-200 border-l-4 border-l-amber-500 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duplikat No HP</span>
            <Phone className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{duplicatePhones.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Grup nomor HP ganda</p>
        </div>

        <div className="bg-white border border-slate-200 border-l-4 border-l-violet-500 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duplikat Email</span>
            <Mail className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-2xl font-black text-violet-600 mt-2">{duplicateEmails.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Grup email ganda</p>
        </div>

        <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prospect Traffic</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{trafficRows.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Kunjungan toko terbaru</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('check')}
          className={cn(
            'flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all',
            activeTab === 'check'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <UserPlus className="w-4 h-4 text-blue-600" />
          Form Profiling
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('traffic')}
          className={cn(
            'flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all',
            activeTab === 'traffic'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <PlusCircle className="w-4 h-4 text-emerald-600" />
          Traffic &amp; Items
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={cn(
            'flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all',
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Merge className="w-4 h-4 text-purple-600" />
          Audit Duplikat
          {(duplicatePhones.length + duplicateEmails.length) > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 rounded-full border border-amber-200 ml-1">
              {duplicatePhones.length + duplicateEmails.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: FORM PROFILING (`crm_profiling`) */}
      {activeTab === 'check' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main 7-Section Form */}
          <div className="lg:col-span-8 space-y-6">
            {submitMessage && (
              <div
                className={cn(
                  'p-4 rounded-2xl text-xs font-bold flex items-center gap-2',
                  submitMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                )}
              >
                {submitMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />}
                {submitMessage.text}
              </div>
            )}

            {/* 1. PRIMARY INFORMATION & FOTO CDN */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">1. PRIMARY INFORMATION</h3>
              </div>

              {/* Foto Customer CDN Section */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-20 h-20 bg-slate-200 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-300 relative shrink-0">
                  {fotoCustomerUrl ? (
                    <img src={fotoCustomerUrl} alt="Foto Customer" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Foto Customer (CDN Proxmox)</h4>
                  <p className="text-[11px] text-slate-500 mb-2">Upload foto ke server CDN (`foto_customer`)</p>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingFoto ? 'Uploading...' : 'Pilih Foto'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadImage(e.target.files[0], 'foto_customer');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Client Status</label>
                  <select
                    value={statusPelanggan}
                    onChange={(e) => setStatusPelanggan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold"
                  >
                    {MASTER_DATA.statusPelangganCRM.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Title</label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold"
                  >
                    {MASTER_DATA.titles.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nama depan..."
                    value={namaDepan}
                    onChange={(e) => setNamaDepan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="Nama belakang..."
                    value={namaBelakang}
                    onChange={(e) => setNamaBelakang(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Preferred Name (Nama Panggilan)</label>
                  <input
                    type="text"
                    placeholder="Nama panggilan..."
                    value={namaPanggilan}
                    onChange={(e) => setNamaPanggilan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 2. CONTACT DETAILS */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Phone className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">2. CONTACT DETAILS</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kewarganegaraan</label>
                  <select
                    value={kewarganegaraan}
                    onChange={(e) => setKewarganegaraan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    {Object.keys(MASTER_DATA.phoneCodes).map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Nomor HP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 3. IDENTITAS & DOMISILI (WITH CONDITIONAL FIELDS) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
                  <BadgeInfo className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">3. IDENTITAS &amp; DOMISILI</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">No. KTP / Passport</label>
                  <input
                    type="text"
                    placeholder="NIK / Passport..."
                    value={ktpPassport}
                    onChange={(e) => setKtpPassport(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={tglLahir}
                    onChange={(e) => setTglLahir(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kategori Umur</label>
                  <select
                    value={umur}
                    onChange={(e) => setUmur(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Umur...</option>
                    {MASTER_DATA.umurOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Conditional Pernikahan & Anak */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-violet-50/50 border border-violet-100 rounded-2xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Pernikahan</label>
                  <select
                    value={pernikahan}
                    onChange={(e) => setPernikahan(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    {MASTER_DATA.statusPernikahan.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {pernikahan === 'Kawin' && (
                  <div>
                    <label className="block text-[11px] font-bold text-violet-700 uppercase mb-1">Tanggal Pernikahan</label>
                    <input
                      type="date"
                      value={tglPernikahan}
                      onChange={(e) => setTglPernikahan(e.target.value)}
                      className="w-full bg-white border border-violet-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Memiliki Anak?</label>
                  <select
                    value={memilikiAnak}
                    onChange={(e) => setMemilikiAnak(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    {MASTER_DATA.memilikiAnak.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {memilikiAnak === 'YA' && (
                  <div>
                    <label className="block text-[11px] font-bold text-violet-700 uppercase mb-1">Jumlah Anak</label>
                    <select
                      value={jumlahAnak}
                      onChange={(e) => setJumlahAnak(e.target.value)}
                      className="w-full bg-white border border-violet-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                    >
                      {MASTER_DATA.jumlahAnak.map((j) => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Conditional Domisili */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Tipe Domisili</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="domType"
                      checked={domisiliType === 'Dalam Negeri'}
                      onChange={() => setDomisiliType('Dalam Negeri')}
                    />
                    Dalam Negeri (Indonesia)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="domType"
                      checked={domisiliType === 'Luar Negeri'}
                      onChange={() => setDomisiliType('Luar Negeri')}
                    />
                    Luar Negeri (International)
                  </label>
                </div>

                {domisiliType === 'Dalam Negeri' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Provinsi Domisili</label>
                    <select
                      value={domisiliProvinsi}
                      onChange={(e) => setDomisiliProvinsi(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                    >
                      <option value="">Pilih Provinsi...</option>
                      {MASTER_DATA.provinsi.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Negara / Kota Domisili Luar Negeri</label>
                    <input
                      type="text"
                      placeholder="e.g. Singapore, London, Tokyo..."
                      value={domisiliLuarNegeri}
                      onChange={(e) => setDomisiliLuarNegeri(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Etnis</label>
                  <select
                    value={etnis}
                    onChange={(e) => setEtnis(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Etnis...</option>
                    {MASTER_DATA.etnis.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Agama</label>
                  <input
                    type="text"
                    placeholder="Agama..."
                    value={agama}
                    onChange={(e) => setAgama(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Pekerjaan</label>
                  <select
                    value={pekerjaan}
                    onChange={(e) => setPekerjaan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Pekerjaan...</option>
                    {MASTER_DATA.pekerjaan.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. LIFESTYLE & MINAT (DYNAMIC CONDITIONAL HOBBY) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                  <Heart className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">4. LIFESTYLE &amp; HOBBY</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Fashion Style</label>
                  <select
                    value={fashionStyle}
                    onChange={(e) => setFashionStyle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Style...</option>
                    {MASTER_DATA.fashionStyle.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kategori Hobby</label>
                  <select
                    value={hobbyKat}
                    onChange={(e) => {
                      setHobbyKat(e.target.value);
                      setHobbySub('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Kategori...</option>
                    {Object.keys(MASTER_DATA.hobiKategori).map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Sub Hobby</label>
                  <select
                    value={hobbySub}
                    onChange={(e) => setHobbySub(e.target.value)}
                    disabled={!hobbyKat}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium disabled:opacity-40"
                  >
                    <option value="">Pilih Sub Hobby...</option>
                    {(MASTER_DATA.hobiKategori[hobbyKat] || []).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {(hobbyKat === 'Others' || hobbySub === 'Others') && (
                <div className="p-3 bg-pink-50 border border-pink-200 rounded-2xl">
                  <label className="block text-[11px] font-bold text-pink-800 uppercase mb-1">Hobby Lainnya (Spesifik)</label>
                  <input
                    type="text"
                    placeholder="Tuliskan hobi khusus..."
                    value={hobbyOthers}
                    onChange={(e) => setHobbyOthers(e.target.value)}
                    className="w-full bg-white border border-pink-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Warna Favorit</label>
                  <select
                    value={warnaFavorit}
                    onChange={(e) => setWarnaFavorit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Warna...</option>
                    {MASTER_DATA.warnaFavorit.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tempat Liburan Favorit</label>
                  <input
                    type="text"
                    placeholder="Paris, Bali, Tokyo..."
                    value={liburanFavorit}
                    onChange={(e) => setLiburanFavorit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Topik Pembicaraan Favorit</label>
                  <input
                    type="text"
                    placeholder="Art, Watch, Business..."
                    value={topikPembicaraan}
                    onChange={(e) => setTopikPembicaraan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 5. KULINER & ALERGI */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">5. KULINER &amp; ALERGI</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Makanan Favorit</label>
                  <input
                    type="text"
                    placeholder="Italian, Japanese..."
                    value={makananFavorit}
                    onChange={(e) => setMakananFavorit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Minuman Favorit</label>
                  <input
                    type="text"
                    placeholder="Wine, Champagne, Coffee..."
                    value={minumanFavorit}
                    onChange={(e) => setMinumanFavorit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Cake Favorit</label>
                  <input
                    type="text"
                    placeholder="Chocolate, Cheese Cake..."
                    value={cakeFavorit}
                    onChange={(e) => setCakeFavorit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Alergi Makanan</label>
                  <input
                    type="text"
                    placeholder="Nuts, Seafood..."
                    value={alergiMakanan}
                    onChange={(e) => setAlergiMakanan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 6. SOCIAL MEDIA & CLIENT INSIGHTS */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <AtSign className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">6. SOCIAL MEDIA &amp; INSIGHTS</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Instagram</label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">TikTok</label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Faktor Pemicu Pembelian</label>
                  <select
                    value={pemicu}
                    onChange={(e) => setPemicu(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Pemicu...</option>
                    {MASTER_DATA.pemicuBeli.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Barang Antusias</label>
                  <select
                    value={antusias}
                    onChange={(e) => setAntusias(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Kategori...</option>
                    {MASTER_DATA.barangAntusias.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Karakter Pelanggan</label>
                  <select
                    value={karakter}
                    onChange={(e) => setKarakter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Karakter...</option>
                    {MASTER_DATA.karakter.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Lokasi Store</label>
                  <select
                    value={lokasiStore}
                    onChange={(e) => setLokasiStore(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold"
                  >
                    {MASTER_DATA.stores.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Customer Advisor</label>
                  <select
                    value={customerAdvisor}
                    onChange={(e) => setCustomerAdvisor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Customer Advisor...</option>
                    {advisorsList.map((adv) => (
                      <option key={adv} value={adv}>{adv}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Catatan Tambahan (Notes)</label>
                <textarea
                  rows={3}
                  placeholder="Catatan profil pelanggan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isExactDuplicate || checkLoading}
              onClick={handleCreateProfile}
              className={cn(
                'w-full py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg',
                isExactDuplicate
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              <UserPlus className="w-5 h-5" />
              {isExactDuplicate ? 'Terdeteksi Duplikat — Pembuatan Terkunci' : 'Simpan Profil Pelanggan Baru'}
            </button>
          </div>

          {/* Sticky Real-time Deduplication Monitor Panel (Right Column) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Live Deduplication Monitor
                </h4>
                {checkLoading && <span className="text-[10px] text-blue-600 animate-pulse font-bold">Checking...</span>}
              </div>

              <div className="text-xs space-y-2">
                <p className="text-slate-500">
                  <span className="font-bold text-slate-700">Nama Input:</span> {fullName || '—'}
                </p>
                <p className="text-slate-500">
                  <span className="font-bold text-slate-700">HP Input:</span> {noHp || '—'}
                </p>
              </div>

              {!noHp && !fullName && !email ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl p-4">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">Mulai mengetik Nama / No. HP</p>
                  <p className="text-[11px] mt-1 text-slate-400">Sistem akan memeriksa database 8.287 profil secara otomatis.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* EXACT MATCH WARNING */}
                  {isExactDuplicate && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>DUPLIKAT PERSIS TERDETEKSI!</span>
                      </div>
                      <p className="text-[11px] text-red-600">Pelanggan dengan nomor HP / Email ini sudah ada di database.</p>

                      {[...exactPhoneMatches, ...exactEmailMatches].map((p) => (
                        <div key={p.id} className="bg-white border border-red-200 rounded-xl p-3 text-xs space-y-1">
                          <p className="font-bold text-slate-900">
                            {p.nama_lengkap} (ID #{p.id})
                          </p>
                          <p className="text-slate-500">HP: {p.no_hp} | Store: {p.lokasi_store}</p>
                          <p className="text-slate-500">CA: {p.customer_advisor || '—'}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* FUZZY MATCH RECOMMENDATION */}
                  {!isExactDuplicate && fuzzyMatches.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{fuzzyMatches.length} Profil Mirip Ditemukan:</span>
                      </div>

                      {fuzzyMatches.map((p) => (
                        <div key={p.id} className="bg-white border border-amber-200 rounded-xl p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900">{p.nama_lengkap}</p>
                            <span className="text-[9px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                              {p.similarityScore}% Mirip
                            </span>
                          </div>
                          <p className="text-slate-500">HP: {p.no_hp} | CA: {p.customer_advisor}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CLEAN STATUS */}
                  {!isExactDuplicate && fuzzyMatches.length === 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-emerald-900">Data Bersih &amp; Belum Ada di CRM!</p>
                      <p className="text-[11px] text-emerald-600 mt-1">Anda aman untuk menekan tombol Simpan.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FORM TRAFFIC & MULTI-ROW ITEMS (`mirror_traffic` + `traffic_items`) */}
      {activeTab === 'traffic' && (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Form Catat Prospect Traffic &amp; Items</h3>
                <p className="text-xs text-slate-500">Formulir lengkap kunjungan toko dengan bukti CDN &amp; tabel barang diminati multi-row.</p>
              </div>
            </div>

            {trMessage && (
              <div
                className={cn(
                  'p-4 rounded-2xl text-xs font-bold flex items-center gap-2',
                  trMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                )}
              >
                {trMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                {trMessage.text}
              </div>
            )}

            {/* Section A: Informasi Pelanggan & Kunjungan */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">A. INFORMASI PELANGGAN &amp; KUNJUNGAN</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tanggal Kunjungan</label>
                  <input
                    type="date"
                    value={trTanggal}
                    onChange={(e) => setTrTanggal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Nama Pengunjung <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nama lengkap..."
                    value={trCustomerName}
                    onChange={(e) => setTrCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama Panggilan</label>
                  <input
                    type="text"
                    placeholder="Nama panggilan..."
                    value={trNamaPanggilan}
                    onChange={(e) => setTrNamaPanggilan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nomor HP</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={trNoHp}
                    onChange={(e) => setTrNoHp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={trEmail}
                    onChange={(e) => setTrEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Pelanggan</label>
                  <select
                    value={trStatusPelanggan}
                    onChange={(e) => setTrStatusPelanggan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    {MASTER_DATA.statusPelangganTraffic.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Visit / Kunjungan</label>
                  <select
                    value={trStatus}
                    onChange={(e) => setTrStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold"
                  >
                    {MASTER_DATA.prospekStatus.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Section B: Detail Segmentasi Prospek */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">B. DETAIL SEGMENTASI PROSPEK</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tahap Prospek</label>
                  <select
                    value={trProspectLevel}
                    onChange={(e) => setTrProspectLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    {MASTER_DATA.prospekLevel.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kategori Minat Utama</label>
                  <select
                    value={trMinatBarang}
                    onChange={(e) => setTrMinatBarang(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    {MASTER_DATA.minatBarang.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Akses Masuk (Source)</label>
                  <select
                    value={trAksesMasuk}
                    onChange={(e) => setTrAksesMasuk(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Akses...</option>
                    {MASTER_DATA.aksesMasuk.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kategori Pengunjung (Siapa)</label>
                  <select
                    value={trSiapa}
                    onChange={(e) => setTrSiapa(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Kategori...</option>
                    {MASTER_DATA.siapa.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Faktor Pemicu</label>
                  <select
                    value={trFaktorPemicu}
                    onChange={(e) => setTrFaktorPemicu(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Pemicu...</option>
                    {MASTER_DATA.faktorPemicu.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Group Size</label>
                  <select
                    value={trGroupSize}
                    onChange={(e) => setTrGroupSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    {MASTER_DATA.groupSize.map((g) => <option key={g} value={g}>{g} orang</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Served By (SA)</label>
                  <select
                    value={trServedBy}
                    onChange={(e) => setTrServedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  >
                    <option value="">Pilih Served By (SA)...</option>
                    {advisorsList.map((adv) => (
                      <option key={adv} value={adv}>{adv}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section C: Multi-Row Barang Diminati (`traffic_items`) */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  C. BARANG DIMINATI (`traffic_items` MULTI-ROW)
                </h4>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Total: Rp {trNetSales.toLocaleString('id-ID')}
                </span>
              </div>

              {/* Form Tambah Item */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kode Item</label>
                    <input
                      type="text"
                      placeholder="e.g. AN855420"
                      value={newItemCode}
                      onChange={(e) => setNewItemCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SAP Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 100234"
                      value={newSapCode}
                      onChange={(e) => setNewSapCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Deskripsi Barang</label>
                    <input
                      type="text"
                      placeholder="B.zero1 4-Band Ring 18kt Rose Gold..."
                      value={newDeskripsi}
                      onChange={(e) => setNewDeskripsi(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kategori</label>
                    <select
                      value={newKategori}
                      onChange={(e) => setNewKategori(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none"
                    >
                      {MASTER_DATA.minatBarang.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Koleksi</label>
                    <input
                      type="text"
                      placeholder="B.zero1, Serpenti..."
                      value={newKoleksi}
                      onChange={(e) => setNewKoleksi(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Harga (Rp)</label>
                    <input
                      type="number"
                      placeholder="45000000"
                      value={newHarga || ''}
                      onChange={(e) => setNewHarga(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none font-bold text-slate-900"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddTrafficItem}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Table List Items */}
              {trItems.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="p-3">Kode / SAP</th>
                        <th className="p-3">Deskripsi Barang</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3 text-right">Harga</th>
                        <th className="p-3 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-700">
                            {item.item_code} {item.sap_code && `(${item.sap_code})`}
                          </td>
                          <td className="p-3 font-bold text-slate-900">{item.deskripsi}</td>
                          <td className="p-3 text-slate-600">{item.kategori}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">
                            Rp {item.harga.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveTrafficItem(idx)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Discount & Calculations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Diskon (%)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={trDiskonPct || ''}
                    onChange={(e) => setTrDiskonPct(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Subtotal Harga</label>
                  <p className="text-sm font-bold text-slate-900 pt-2">Rp {trSubtotal.toLocaleString('id-ID')}</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Net Sales (Setelah Diskon)</label>
                  <p className="text-base font-black text-emerald-600 pt-1">Rp {trNetSales.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>

            {/* Section D: Bukti CDN & Notes */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">D. BUKTI CHAT (CDN) &amp; CATATAN</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-xl overflow-hidden flex items-center justify-center border border-slate-300 relative shrink-0">
                    {trBuktiChatUrl ? (
                      <img src={trBuktiChatUrl} alt="Bukti Chat" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Bukti Chat / Lampiran (CDN)</h5>
                    <p className="text-[11px] text-slate-500 mb-2">Upload bukti ke folder `bukti_chat`</p>
                    <label className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all">
                      <Upload className="w-3 h-3" />
                      {uploadingBukti ? 'Uploading...' : 'Upload Bukti'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleUploadImage(e.target.files[0], 'bukti_chat');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Catatan Kunjungan (Notes)</label>
                  <textarea
                    rows={3}
                    placeholder="Keperluan pelanggan, request khusus..."
                    value={trNotes}
                    onChange={(e) => setTrNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="autoProfileCheck"
                  checked={trAutoProfile}
                  onChange={(e) => setTrAutoProfile(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="autoProfileCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Otomatis Buat &amp; Link Profil CRM Baru untuk Pelanggan Ini
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateTraffic}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg mt-4"
            >
              <PlusCircle className="w-5 h-5" />
              Simpan Data Kunjungan Traffic &amp; Items
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: AUDITING & MERGING */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {duplicatePhones.length === 0 && duplicateEmails.length === 0 ? (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-emerald-900">Database Profiling Bersih dari Duplikasi Exact!</h3>
              <p className="text-xs text-emerald-600 mt-1 max-w-md mx-auto">
                Tidak ditemukan nomor HP atau Email ganda di database saat ini.
              </p>
            </div>
          ) : (
            <>
              {/* DUPLICATE PHONES SECTION */}
              {duplicatePhones.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-500" />
                    Grup Duplikat Berdasarkan Nomor HP ({duplicatePhones.length})
                  </h3>

                  <div className="space-y-4">
                    {duplicatePhones.map((group, gIdx) => (
                      <div key={gIdx} className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                            No. HP: {group.phoneKey} ({group.count} profil)
                          </span>
                          <span className="text-[11px] text-slate-400">Pilih 1 profil utama untuk dipertahankan</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.items.map((item) => {
                            const secondaries = group.items.filter((s) => s.id !== item.id);
                            return (
                              <div
                                key={item.id}
                                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-blue-300 transition-all"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400">ID #{item.id}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                      {item.lokasi_store || 'No Store'}
                                    </span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-900">{item.nama_lengkap || 'Tanpa Nama'}</p>
                                  <div className="text-xs text-slate-500 space-y-1">
                                    <p className="flex items-center gap-1.5">
                                      <Phone className="w-3 h-3 text-slate-400" /> {item.no_hp || '—'}
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                      <User className="w-3 h-3 text-slate-400" /> CA: {item.customer_advisor || '—'}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={mergingId === item.id}
                                  onClick={() => handleMerge(item, secondaries)}
                                  className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                                >
                                  <Merge className="w-3.5 h-3.5" />
                                  Simpan Ini Sebagai Utama (Gabung {secondaries.length} Lainnya)
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DUPLICATE EMAILS SECTION */}
              {duplicateEmails.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-violet-500" />
                    Grup Duplikat Berdasarkan Email ({duplicateEmails.length})
                  </h3>

                  <div className="space-y-4">
                    {duplicateEmails.map((group, gIdx) => (
                      <div key={gIdx} className="bg-white border border-violet-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <span className="text-xs font-bold text-violet-800 bg-violet-50 px-3 py-1 rounded-full border border-violet-200">
                            Email: {group.emailKey} ({group.count} profil)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.items.map((item) => {
                            const secondaries = group.items.filter((s) => s.id !== item.id);
                            return (
                              <div
                                key={item.id}
                                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
                              >
                                <div className="space-y-2">
                                  <span className="text-[10px] font-black text-slate-400">ID #{item.id}</span>
                                  <p className="text-sm font-bold text-slate-900">{item.nama_lengkap}</p>
                                  <p className="text-xs text-slate-500">CA: {item.customer_advisor}</p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleMerge(item, secondaries)}
                                  className="mt-4 w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                                >
                                  <Merge className="w-3.5 h-3.5" />
                                  Simpan Ini Sebagai Utama
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

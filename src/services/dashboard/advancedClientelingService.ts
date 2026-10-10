import { supabase } from '@/lib/supabase';

/**
 * Advanced Clienteling — gabungan crm_profiling (form profiling advisor)
 * dengan riwayat belanja POS (bvlgari_sales) yang di-join lewat nomor HP.
 *
 * Data sensitif (KTP/Passport, agama) sengaja TIDAK diambil.
 */

export interface AdvancedClient {
  id: number;
  name: string;
  nickname: string;
  gender: string;            // Mr / Mrs / Ms
  phone: string;
  email: string;
  store: string;             // Plaza Indonesia / Plaza Senayan / Bali
  advisor: string;
  status: string;            // VIP / CURRENT / NEW / OLD
  ageBracket: string;        // <30, 30-35, ..., >50, atau ''
  nationality: string;       // 'Indonesia' atau nama negara
  isForeign: boolean;
  domicile: string;          // dinormalisasi (Jakarta, Bali, ...)
  ethnicity: string;
  occupation: string;
  maritalStatus: string;
  hasChildren: boolean;
  interests: string[];       // Jewelry / Watches / LLGA / Perfume / Semi HJ
  fashionStyle: string;
  characters: string[];      // Ramah, To The Point, Suka Discount, ...
  hobbyCategories: string[]; // Level 1: Kategori Utama (Gaya Hidup & Mewah, Olahraga & Kesehatan, dll.)
  hobbySubs: string[];       // Level 2 (Turunan): Golf, Tennis, Travelling, Fashion, dll.
  hobbies: string[];         // gabungan seluruh label hobby
  birthDate: string | null;
  daysToBirthday: number | null;
  inputDate: string | null;
  // Nilai belanja (join POS via no HP)
  totalSpend: number;
  txCount: number;
  lastPurchase: string | null;
  daysSincePurchase: number | null;
}

// ── Normalisasi ────────────────────────────────────────────────────────────

const clean = (v: unknown) => {
  const s = String(v ?? '').trim();
  return s === '-' ? '' : s;
};

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const splitMulti = (v: unknown) =>
  clean(v).split(/[,;]/).map(s => s.trim()).filter(Boolean);

export const normPhone = (p: unknown) => {
  let d = String(p ?? '').replace(/\D/g, '');
  if (d.startsWith('62')) d = '0' + d.slice(2);
  else if (d.startsWith('8')) d = '0' + d;
  return d.length >= 8 ? d : '';
};

const normGender = (t: string) => clean(t).replace(/\./g, '');

const normStore = (s: string) => {
  const l = clean(s).toLowerCase();
  if (l.includes('senayan')) return 'Plaza Senayan';
  if (l.includes('indonesia')) return 'Plaza Indonesia';
  if (l.includes('bali')) return 'Bali';
  return clean(s);
};

const normDomicile = (s: string) => {
  const v = clean(s);
  if (!v) return '';
  const l = v.toLowerCase();
  if (l.includes('jakarta')) return 'Jakarta';
  if (l.includes('tangerang')) return 'Tangerang';
  if (l.includes('bali') || l.includes('denpasar')) return 'Bali';
  return titleCase(v);
};

const ETHNICITY_ALIAS: Record<string, string> = {
  tionghoa: 'Chinese', chinese: 'Chinese', china: 'Chinese',
  korea: 'Korean', korean: 'Korean',
  jawa: 'Jawa', javanese: 'Jawa',
};
const normEthnicity = (s: string) => {
  const v = clean(s);
  if (!v) return '';
  return ETHNICITY_ALIAS[v.toLowerCase()] ?? titleCase(v);
};

const NATIONALITY_ALIAS: Array<[RegExp, string]> = [
  [/^indonesia/i, 'Indonesia'],
  [/korea/i, 'Korea'],
  [/russia/i, 'Russia'],
  [/united states|^usa$/i, 'USA'],
  [/china/i, 'China'],
  [/united kingdom|^uk$/i, 'United Kingdom'],
];
const normNationality = (s: string) => {
  const v = clean(s).replace(/\s*\(the\)\s*/gi, ' ').trim();
  if (!v) return '';
  for (const [re, label] of NATIONALITY_ALIAS) if (re.test(v)) return label;
  return titleCase(v);
};

// ── Taksonomi Hobby 2-Level & Smart Normalization ───────────────────────────

export const HOBBY_TAXONOMY: Record<string, string[]> = {
  'Gaya Hidup & Mewah': ['Travelling', 'Fashion', 'Handbag', 'Jam Tangan', 'Gemstones', 'Barang Antik', 'Shopping'],
  'Olahraga & Kesehatan': ['Golf', 'Tennis', 'Padel', 'GYM & Fitness', 'Lari', 'Berenang', 'Bersepeda', 'Yoga / Pilates', 'Diving / Snorkeling', 'Badminton', 'Berkuda'],
  'Otomotif': ['Otomotif Roda 4', 'Otomotif Roda 2', 'Motorsport'],
  'Kuliner': ['Wisata Kuliner', 'Memasak', 'Baking', 'Wine & Champagne', 'Kopi / Barista'],
  'Hiburan & Seni': ['Menonton', 'Gaming', 'Fotografi', 'Musik', 'Membaca', 'Art Collecting', 'Die Cast / Action Figure', 'Aquascaping, Aquarium & Terarium'],
  'Alam & Lingkungan': ['Berkebun', 'Bunga & Tanaman Hias', 'Pet Care', 'Hiking & Trekking', 'Camping & Glamping'],
  'Others': ['Others'],
};

// Pemetaan sub-hobby -> kategori induk
const SUB_TO_CATEGORY = new Map<string, string>();
for (const [cat, subs] of Object.entries(HOBBY_TAXONOMY)) {
  for (const s of subs) {
    SUB_TO_CATEGORY.set(s.toLowerCase(), cat);
  }
}

// Alias teks bebas lama / variasi ejaan -> { canonicalSub, category }
const HOBBY_SUB_ALIASES: Record<string, { sub: string; cat: string }> = {
  // Olahraga
  golf: { sub: 'Golf', cat: 'Olahraga & Kesehatan' },
  tennis: { sub: 'Tennis', cat: 'Olahraga & Kesehatan' },
  tenis: { sub: 'Tennis', cat: 'Olahraga & Kesehatan' },
  padel: { sub: 'Padel', cat: 'Olahraga & Kesehatan' },
  gym: { sub: 'GYM & Fitness', cat: 'Olahraga & Kesehatan' },
  fitness: { sub: 'GYM & Fitness', cat: 'Olahraga & Kesehatan' },
  'gym & fitness': { sub: 'GYM & Fitness', cat: 'Olahraga & Kesehatan' },
  'gym/fitness': { sub: 'GYM & Fitness', cat: 'Olahraga & Kesehatan' },
  lari: { sub: 'Lari', cat: 'Olahraga & Kesehatan' },
  running: { sub: 'Lari', cat: 'Olahraga & Kesehatan' },
  jogging: { sub: 'Lari', cat: 'Olahraga & Kesehatan' },
  marathon: { sub: 'Lari', cat: 'Olahraga & Kesehatan' },
  renang: { sub: 'Berenang', cat: 'Olahraga & Kesehatan' },
  berenang: { sub: 'Berenang', cat: 'Olahraga & Kesehatan' },
  swimming: { sub: 'Berenang', cat: 'Olahraga & Kesehatan' },
  sepeda: { sub: 'Bersepeda', cat: 'Olahraga & Kesehatan' },
  bersepeda: { sub: 'Bersepeda', cat: 'Olahraga & Kesehatan' },
  cycling: { sub: 'Bersepeda', cat: 'Olahraga & Kesehatan' },
  yoga: { sub: 'Yoga / Pilates', cat: 'Olahraga & Kesehatan' },
  pilates: { sub: 'Yoga / Pilates', cat: 'Olahraga & Kesehatan' },
  'yoga / pilates': { sub: 'Yoga / Pilates', cat: 'Olahraga & Kesehatan' },
  'yoga/pilates': { sub: 'Yoga / Pilates', cat: 'Olahraga & Kesehatan' },
  diving: { sub: 'Diving / Snorkeling', cat: 'Olahraga & Kesehatan' },
  snorkeling: { sub: 'Diving / Snorkeling', cat: 'Olahraga & Kesehatan' },
  'diving / snorkeling': { sub: 'Diving / Snorkeling', cat: 'Olahraga & Kesehatan' },
  badminton: { sub: 'Badminton', cat: 'Olahraga & Kesehatan' },
  bulutangkis: { sub: 'Badminton', cat: 'Olahraga & Kesehatan' },
  berkuda: { sub: 'Berkuda', cat: 'Olahraga & Kesehatan' },
  equestrian: { sub: 'Berkuda', cat: 'Olahraga & Kesehatan' },
  'horse riding': { sub: 'Berkuda', cat: 'Olahraga & Kesehatan' },

  // Gaya Hidup & Mewah
  travel: { sub: 'Travelling', cat: 'Gaya Hidup & Mewah' },
  travelling: { sub: 'Travelling', cat: 'Gaya Hidup & Mewah' },
  traveling: { sub: 'Travelling', cat: 'Gaya Hidup & Mewah' },
  travellin: { sub: 'Travelling', cat: 'Gaya Hidup & Mewah' },
  'jalan-jalan': { sub: 'Travelling', cat: 'Gaya Hidup & Mewah' },
  holiday: { sub: 'Travelling', cat: 'Gaya Hidup & Mewah' },
  liburan: { sub: 'Travelling', cat: 'Gaya Hidup & Mewah' },
  fashion: { sub: 'Fashion', cat: 'Gaya Hidup & Mewah' },
  shopping: { sub: 'Shopping', cat: 'Gaya Hidup & Mewah' },
  belanja: { sub: 'Shopping', cat: 'Gaya Hidup & Mewah' },
  handbag: { sub: 'Handbag', cat: 'Gaya Hidup & Mewah' },
  tas: { sub: 'Handbag', cat: 'Gaya Hidup & Mewah' },
  'tas mewah': { sub: 'Handbag', cat: 'Gaya Hidup & Mewah' },
  bag: { sub: 'Handbag', cat: 'Gaya Hidup & Mewah' },
  'jam tangan': { sub: 'Jam Tangan', cat: 'Gaya Hidup & Mewah' },
  watch: { sub: 'Jam Tangan', cat: 'Gaya Hidup & Mewah' },
  watches: { sub: 'Jam Tangan', cat: 'Gaya Hidup & Mewah' },
  'watch collecting': { sub: 'Jam Tangan', cat: 'Gaya Hidup & Mewah' },
  gemstones: { sub: 'Gemstones', cat: 'Gaya Hidup & Mewah' },
  gemstone: { sub: 'Gemstones', cat: 'Gaya Hidup & Mewah' },
  jewelry: { sub: 'Gemstones', cat: 'Gaya Hidup & Mewah' },
  perhiasan: { sub: 'Gemstones', cat: 'Gaya Hidup & Mewah' },
  berlian: { sub: 'Gemstones', cat: 'Gaya Hidup & Mewah' },
  diamond: { sub: 'Gemstones', cat: 'Gaya Hidup & Mewah' },
  'barang antik': { sub: 'Barang Antik', cat: 'Gaya Hidup & Mewah' },
  antique: { sub: 'Barang Antik', cat: 'Gaya Hidup & Mewah' },
  antiques: { sub: 'Barang Antik', cat: 'Gaya Hidup & Mewah' },

  // Otomotif
  'otomotif roda 4': { sub: 'Otomotif Roda 4', cat: 'Otomotif' },
  mobil: { sub: 'Otomotif Roda 4', cat: 'Otomotif' },
  'mobil mewah': { sub: 'Otomotif Roda 4', cat: 'Otomotif' },
  supercar: { sub: 'Otomotif Roda 4', cat: 'Otomotif' },
  'sports car': { sub: 'Otomotif Roda 4', cat: 'Otomotif' },
  car: { sub: 'Otomotif Roda 4', cat: 'Otomotif' },
  cars: { sub: 'Otomotif Roda 4', cat: 'Otomotif' },
  'otomotif roda 2': { sub: 'Otomotif Roda 2', cat: 'Otomotif' },
  moge: { sub: 'Otomotif Roda 2', cat: 'Otomotif' },
  motor: { sub: 'Otomotif Roda 2', cat: 'Otomotif' },
  harley: { sub: 'Otomotif Roda 2', cat: 'Otomotif' },
  motorcycle: { sub: 'Otomotif Roda 2', cat: 'Otomotif' },
  motorsport: { sub: 'Motorsport', cat: 'Otomotif' },
  balap: { sub: 'Motorsport', cat: 'Otomotif' },
  racing: { sub: 'Motorsport', cat: 'Otomotif' },

  // Kuliner
  'wisata kuliner': { sub: 'Wisata Kuliner', cat: 'Kuliner' },
  kuliner: { sub: 'Wisata Kuliner', cat: 'Kuliner' },
  culinary: { sub: 'Wisata Kuliner', cat: 'Kuliner' },
  foodie: { sub: 'Wisata Kuliner', cat: 'Kuliner' },
  'fine dining': { sub: 'Wisata Kuliner', cat: 'Kuliner' },
  memasak: { sub: 'Memasak', cat: 'Kuliner' },
  masak: { sub: 'Memasak', cat: 'Kuliner' },
  cooking: { sub: 'Memasak', cat: 'Kuliner' },
  baking: { sub: 'Baking', cat: 'Kuliner' },
  kue: { sub: 'Baking', cat: 'Kuliner' },
  wine: { sub: 'Wine & Champagne', cat: 'Kuliner' },
  champagne: { sub: 'Wine & Champagne', cat: 'Kuliner' },
  'wine & champagne': { sub: 'Wine & Champagne', cat: 'Kuliner' },
  kopi: { sub: 'Kopi / Barista', cat: 'Kuliner' },
  coffee: { sub: 'Kopi / Barista', cat: 'Kuliner' },
  barista: { sub: 'Kopi / Barista', cat: 'Kuliner' },

  // Hiburan & Seni
  menonton: { sub: 'Menonton', cat: 'Hiburan & Seni' },
  nonton: { sub: 'Menonton', cat: 'Hiburan & Seni' },
  movie: { sub: 'Menonton', cat: 'Hiburan & Seni' },
  movies: { sub: 'Menonton', cat: 'Hiburan & Seni' },
  cinema: { sub: 'Menonton', cat: 'Hiburan & Seni' },
  gaming: { sub: 'Gaming', cat: 'Hiburan & Seni' },
  game: { sub: 'Gaming', cat: 'Hiburan & Seni' },
  fotografi: { sub: 'Fotografi', cat: 'Hiburan & Seni' },
  photography: { sub: 'Fotografi', cat: 'Hiburan & Seni' },
  photo: { sub: 'Fotografi', cat: 'Hiburan & Seni' },
  musik: { sub: 'Musik', cat: 'Hiburan & Seni' },
  music: { sub: 'Musik', cat: 'Hiburan & Seni' },
  konser: { sub: 'Musik', cat: 'Hiburan & Seni' },
  membaca: { sub: 'Membaca', cat: 'Hiburan & Seni' },
  reading: { sub: 'Membaca', cat: 'Hiburan & Seni' },
  buku: { sub: 'Membaca', cat: 'Hiburan & Seni' },
  'art collecting': { sub: 'Art Collecting', cat: 'Hiburan & Seni' },
  art: { sub: 'Art Collecting', cat: 'Hiburan & Seni' },
  seni: { sub: 'Art Collecting', cat: 'Hiburan & Seni' },
  lukisan: { sub: 'Art Collecting', cat: 'Hiburan & Seni' },
  'die cast / action figure': { sub: 'Die Cast / Action Figure', cat: 'Hiburan & Seni' },
  'die cast': { sub: 'Die Cast / Action Figure', cat: 'Hiburan & Seni' },
  'action figure': { sub: 'Die Cast / Action Figure', cat: 'Hiburan & Seni' },
  'aquascaping, aquarium & terarium': { sub: 'Aquascaping, Aquarium & Terarium', cat: 'Hiburan & Seni' },
  aquarium: { sub: 'Aquascaping, Aquarium & Terarium', cat: 'Hiburan & Seni' },

  // Alam & Lingkungan
  berkebun: { sub: 'Berkebun', cat: 'Alam & Lingkungan' },
  gardening: { sub: 'Berkebun', cat: 'Alam & Lingkungan' },
  'bunga & tanaman hias': { sub: 'Bunga & Tanaman Hias', cat: 'Alam & Lingkungan' },
  tanaman: { sub: 'Bunga & Tanaman Hias', cat: 'Alam & Lingkungan' },
  bunga: { sub: 'Bunga & Tanaman Hias', cat: 'Alam & Lingkungan' },
  'pet care': { sub: 'Pet Care', cat: 'Alam & Lingkungan' },
  pets: { sub: 'Pet Care', cat: 'Alam & Lingkungan' },
  'hiking & trekking': { sub: 'Hiking & Trekking', cat: 'Alam & Lingkungan' },
  hiking: { sub: 'Hiking & Trekking', cat: 'Alam & Lingkungan' },
  trekking: { sub: 'Hiking & Trekking', cat: 'Alam & Lingkungan' },
  'camping & glamping': { sub: 'Camping & Glamping', cat: 'Alam & Lingkungan' },
  camping: { sub: 'Camping & Glamping', cat: 'Alam & Lingkungan' },
  glamping: { sub: 'Camping & Glamping', cat: 'Alam & Lingkungan' },
};

const ageBracketFrom = (umur: string, birth: string | null): string => {
  const u = clean(umur);
  if (/^(<30|>50|\d{2}-\d{2})$/.test(u)) return u;
  let age: number | null = /^\d{1,3}$/.test(u) ? parseInt(u, 10) : null;
  if (age === null && birth) {
    const d = new Date(birth);
    if (!isNaN(d.getTime())) {
      age = new Date().getFullYear() - d.getFullYear();
    }
  }
  if (age === null || age < 15 || age > 100) return '';
  if (age < 30) return '<30';
  if (age > 50) return '>50';
  const lo = Math.floor(age / 5) * 5;
  return `${lo}-${lo + 5}`;
};

const daysUntilBirthday = (birth: string | null): number | null => {
  if (!birth) return null;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
};

// ── Fetch helper (hindari batas 1000 baris PostgREST) ─────────────────────

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const PAGE = 1000;
  let from = 0;
  const out: T[] = [];
  for (;;) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data || []) as T[]));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

// ── Main loader ────────────────────────────────────────────────────────────

const PROFILE_COLUMNS = [
  'id', 'tanggal_input', 'nama_lengkap', 'nama_depan', 'nama_belakang', 'nama_panggilan', 'title',
  'customer_advisor', 'lokasi_store', 'tanggal_lahir', 'umur', 'status_pelanggan',
  'domisili', 'kewarganegaraan', 'etnis', 'no_hp', 'email', 'pekerjaan',
  'fashion_style', 'karakter', 'barang_antusias', 'status_pernikahan', 'memiliki_anak', 'jumlah_anak',
  'hobby', 'hobby_kategori', 'hobby_sub', 'hobby_others',
].join(',');

// Konvensi sama dengan clean_master: abaikan lokasi RB dan koleksi DPS/SVC/PACK
const EXCLUDED_COLLECTIONS = ['DPS', 'SVC', 'PACK'];

export async function getAdvancedClienteling(): Promise<AdvancedClient[]> {
  type ProfileRow = Record<string, string | null>;
  type SaleRow = { phone_no: string | null; net_sales: number | null; transaction_date: string | null; transaction_no: string | null; location: string | null; collection: string | null };

  const [profiles, sales] = await Promise.all([
    fetchAll<ProfileRow>('crm_profiling', PROFILE_COLUMNS),
    fetchAll<SaleRow>('bvlgari_sales', 'phone_no, net_sales, transaction_date, transaction_no, location, collection'),
  ]);

  // Agregasi belanja per nomor HP
  const spendMap = new Map<string, { net: number; tx: Set<string>; last: string }>();
  for (const s of sales) {
    if ((s.location || '').toUpperCase().includes('RB')) continue;
    const coll = (s.collection || '').toUpperCase();
    if (EXCLUDED_COLLECTIONS.some(ex => coll.includes(ex))) continue;
    const phone = normPhone(s.phone_no);
    if (!phone) continue;
    const e = spendMap.get(phone) ?? { net: 0, tx: new Set<string>(), last: '' };
    e.net += s.net_sales || 0;
    if (s.transaction_no) e.tx.add(s.transaction_no);
    const d = (s.transaction_date || '').slice(0, 10);
    if (d > e.last) e.last = d;
    spendMap.set(phone, e);
  }

  const todayMs = new Date().setHours(0, 0, 0, 0);

  return profiles.map(p => {
    const phone = normPhone(p.no_hp);
    const spend = phone ? spendMap.get(phone) : undefined;
    const nationality = normNationality(p.kewarganegaraan || '');

    const categories = new Set<string>();
    const subs = new Set<string>();

    // 1. Kategori eksplisit dari form (hobby_kategori)
    for (const rawKat of splitMulti(p.hobby_kategori)) {
      const k = clean(rawKat);
      if (!k || k.toLowerCase() === 'others') continue;
      const matched = Object.keys(HOBBY_TAXONOMY).find(c => c.toLowerCase() === k.toLowerCase());
      if (matched) categories.add(matched);
      else categories.add(titleCase(k));
    }

    // 2. Sub-hobby eksplisit dari form (hobby_sub)
    for (const rawSub of splitMulti(p.hobby_sub)) {
      const s = clean(rawSub);
      if (!s || s.toLowerCase() === 'others') continue;
      const alias = HOBBY_SUB_ALIASES[s.toLowerCase()];
      if (alias) {
        subs.add(alias.sub);
        categories.add(alias.cat);
      } else {
        const directCat = SUB_TO_CATEGORY.get(s.toLowerCase());
        if (directCat) {
          subs.add(s);
          categories.add(directCat);
        } else {
          subs.add(titleCase(s));
        }
      }
    }

    // 3. Teks bebas lama (hobby) & hobby_others dengan smart auto-mapping
    for (const raw of [p.hobby, p.hobby_others].flatMap(splitMulti)) {
      const item = clean(raw);
      if (!item || item.toLowerCase() === 'others') continue;
      const alias = HOBBY_SUB_ALIASES[item.toLowerCase()];
      if (alias) {
        subs.add(alias.sub);
        categories.add(alias.cat);
      } else {
        const catMatch = Object.keys(HOBBY_TAXONOMY).find(c => c.toLowerCase() === item.toLowerCase());
        if (catMatch) {
          categories.add(catMatch);
        } else {
          const directCat = SUB_TO_CATEGORY.get(item.toLowerCase());
          if (directCat) {
            subs.add(item);
            categories.add(directCat);
          } else {
            subs.add(titleCase(item));
          }
        }
      }
    }

    // Bila ada sub tapi belum ada kategori terpetakan, masukkan ke Others
    if (subs.size > 0 && categories.size === 0) {
      categories.add('Others');
    }

    const hobbyCategories = Array.from(categories);
    const hobbySubs = Array.from(subs);
    const hobbies = Array.from(new Set([...hobbySubs, ...hobbyCategories]));

    const name = clean(p.nama_lengkap) || `${clean(p.nama_depan)} ${clean(p.nama_belakang)}`.trim();
    const jumlahAnak = parseInt(clean(p.jumlah_anak), 10);

    return {
      id: Number(p.id),
      name,
      nickname: clean(p.nama_panggilan),
      gender: normGender(p.title || ''),
      phone: clean(p.no_hp),
      email: clean(p.email),
      store: normStore(p.lokasi_store || ''),
      advisor: clean(p.customer_advisor),
      status: clean(p.status_pelanggan).toUpperCase(),
      ageBracket: ageBracketFrom(p.umur || '', p.tanggal_lahir),
      nationality,
      isForeign: !!nationality && nationality !== 'Indonesia',
      domicile: normDomicile(p.domisili || ''),
      ethnicity: normEthnicity(p.etnis || ''),
      occupation: clean(p.pekerjaan),
      maritalStatus: clean(p.status_pernikahan),
      hasChildren: clean(p.memiliki_anak).toLowerCase() === 'true' || jumlahAnak > 0,
      interests: splitMulti(p.barang_antusias),
      fashionStyle: clean(p.fashion_style),
      characters: splitMulti(p.karakter),
      hobbyCategories,
      hobbySubs,
      hobbies,
      birthDate: p.tanggal_lahir || null,
      daysToBirthday: daysUntilBirthday(p.tanggal_lahir),
      inputDate: p.tanggal_input || null,
      totalSpend: spend?.net ?? 0,
      txCount: spend?.tx.size ?? 0,
      lastPurchase: spend?.last || null,
      daysSincePurchase: spend?.last
        ? Math.floor((todayMs - new Date(spend.last).getTime()) / 86_400_000)
        : null,
    };
  });
}

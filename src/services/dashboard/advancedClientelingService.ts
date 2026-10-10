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
  hobbies: string[];         // gabungan hobby + kategori + sub (dinormalisasi)
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

const HOBBY_ALIAS: Record<string, string> = {
  travelling: 'Travelling', traveling: 'Travelling', travellin: 'Travelling', travel: 'Travelling',
  shopping: 'Shopping', belanja: 'Shopping',
  cooking: 'Memasak', memasak: 'Memasak', masak: 'Memasak',
  culinary: 'Kuliner', kuliner: 'Kuliner', 'wisata kuliner': 'Kuliner',
  sports: 'Olahraga', sport: 'Olahraga', olahraga: 'Olahraga',
  'gym & fitness': 'Gym & Fitness', gym: 'Gym & Fitness', fitness: 'Gym & Fitness',
};
const normHobby = (s: string) => {
  const v = s.trim();
  if (!v || v.toLowerCase() === 'others') return '';
  return HOBBY_ALIAS[v.toLowerCase()] ?? titleCase(v);
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

    const hobbies = Array.from(new Set(
      [p.hobby, p.hobby_kategori, p.hobby_sub, p.hobby_others]
        .flatMap(splitMulti)
        .map(normHobby)
        .filter(Boolean)
    ));

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

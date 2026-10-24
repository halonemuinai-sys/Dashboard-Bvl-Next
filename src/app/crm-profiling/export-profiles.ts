import type { CrmProfilingRow } from '@/services/dashboardService';
import { profileCsvCell as q } from '@/lib/crm-profiling-query';
const fmtDate = (value: string | null) => value || '';
export function profilesCsv(rows: CrmProfilingRow[]) {
    const headers = ["Full name","Title","Nickname","Boutique","Advisor","Phone","Email","Date of birth","Age","Customer status","Residence","Ethnicity","Religion","Nationality","Occupation","Fashion style","Body type","Height","Favorite color","Favorite cake","Favorite food","Favorite drink","Food allergies","Hobbies","Hobby category","Travel destinations","Marital status","Has children","Number of children","Instagram","TikTok","Personality","Product interests","Purchase motivation","Profile created"];
    const csvRows = rows.map(r => [
      q(r.full_name_tittle || r.nama_lengkap), q(r.title), q(r.nama_panggilan),
      q(r.lokasi_store), q(r.customer_advisor), q(r.no_hp), q(r.email),
      q(fmtDate(r.tanggal_lahir)), q(r.umur), q(r.status_pelanggan),
      q(r.domisili), q(r.etnis), q(r.agama), q(r.kewarganegaraan),
      q(r.pekerjaan), q(r.fashion_style), q(r.bentuk_tubuh), q(r.tinggi_badan), q(r.warna_favorit),
      q(r.cake_favorit), q(r.makanan_favorit), q(r.minuman_favorit), q(r.alergi_makanan),
      q(r.hobby), q(r.hobby_kategori), q(r.tempat_liburan_favorit),
      q(r.status_pernikahan), q(r.memiliki_anak), q(r.jumlah_anak),
      q(r.instagram), q(r.tiktok),
      q(r.karakter), q(r.barang_antusias), q(r.faktor_pemicu_pembelian),
      q(fmtDate(r.tanggal_input)),
    ].join(','));

return '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n');
}

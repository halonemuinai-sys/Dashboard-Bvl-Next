"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProfileItem, DuplicateGroup, TrafficItemRow } from './masterData';

export function useCrmDedup() {
  const [loading, setLoading] = useState(true);

  // Audit state
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [duplicatePhones, setDuplicatePhones] = useState<DuplicateGroup[]>([]);
  const [duplicateEmails, setDuplicateEmails] = useState<DuplicateGroup[]>([]);
  const [trafficRows, setTrafficRows] = useState<any[]>([]);
  const [advisorsList, setAdvisorsList] = useState<string[]>([]);

  // Profiling form state
  const [statusPelanggan, setStatusPelanggan] = useState('New');
  const [title, setTitle] = useState('Mr');
  const [namaDepan, setNamaDepan] = useState('');
  const [namaBelakang, setNamaBelakang] = useState('');
  const [namaPanggilan, setNamaPanggilan] = useState('');
  const [fotoCustomerUrl, setFotoCustomerUrl] = useState('');
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [kewarganegaraan, setKewarganegaraan] = useState('Indonesia');
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
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
  const [fashionStyle, setFashionStyle] = useState('');
  const [hobbyKat, setHobbyKat] = useState('');
  const [hobbySub, setHobbySub] = useState('');
  const [hobbyOthers, setHobbyOthers] = useState('');
  const [warnaFavorit, setWarnaFavorit] = useState('');
  const [liburanFavorit, setLiburanFavorit] = useState('');
  const [topikPembicaraan, setTopikPembicaraan] = useState('');
  const [makananFavorit, setMakananFavorit] = useState('');
  const [minumanFavorit, setMinumanFavorit] = useState('');
  const [cakeFavorit, setCakeFavorit] = useState('');
  const [alergiMakanan, setAlergiMakanan] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [pemicu, setPemicu] = useState('');
  const [antusias, setAntusias] = useState('');
  const [karakter, setKarakter] = useState('');
  const [notes, setNotes] = useState('');
  const [lokasiStore, setLokasiStore] = useState('Pacific Intermark');
  const [customerAdvisor, setCustomerAdvisor] = useState('');
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Traffic form state
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
  const [trItems, setTrItems] = useState<TrafficItemRow[]>([]);
  const [newItemCode, setNewItemCode] = useState('');
  const [newSapCode, setNewSapCode] = useState('');
  const [newDeskripsi, setNewDeskripsi] = useState('');
  const [newHarga, setNewHarga] = useState(0);
  const [newKategori, setNewKategori] = useState('Jewelry');
  const [newKoleksi, setNewKoleksi] = useState('');
  const [trMessage, setTrMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dedup check state
  const [checkLoading, setCheckLoading] = useState(false);
  const [exactPhoneMatches, setExactPhoneMatches] = useState<ProfileItem[]>([]);
  const [exactEmailMatches, setExactEmailMatches] = useState<ProfileItem[]>([]);
  const [fuzzyMatches, setFuzzyMatches] = useState<ProfileItem[]>([]);
  const [mergingId, setMergingId] = useState<number | null>(null);

  // Computed
  const fullName = useMemo(() => `${namaDepan} ${namaBelakang}`.trim(), [namaDepan, namaBelakang]);
  const trSubtotal = useMemo(() => trItems.reduce((acc, item) => acc + (item.harga || 0), 0), [trItems]);
  const trNetSales = useMemo(() => trSubtotal - (trSubtotal * (trDiskonPct || 0)) / 100, [trSubtotal, trDiskonPct]);
  const isExactDuplicate = exactPhoneMatches.length > 0 || exactEmailMatches.length > 0;

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

  useEffect(() => { fetchAuditData(); }, [fetchAuditData]);

  const runCheck = useCallback(async () => {
    if (!noHp && !email && !fullName) {
      setExactPhoneMatches([]);
      setExactEmailMatches([]);
      setFuzzyMatches([]);
      return;
    }
    setCheckLoading(true);
    try {
      const params = new URLSearchParams({ action: 'check', phone: noHp, email, query: fullName });
      const res = await fetch(`/api/crm/dedup?${params.toString()}`);
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
    const timer = setTimeout(() => { runCheck(); }, 400);
    return () => clearTimeout(timer);
  }, [noHp, email, fullName, runCheck]);

  const handleUploadImage = async (file: File, folder: 'foto_customer' | 'bukti_chat') => {
    if (folder === 'foto_customer') setUploadingFoto(true);
    else setUploadingBukti(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      const res = await fetch('/api/cdn/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.file?.url) {
        if (folder === 'foto_customer') setFotoCustomerUrl(data.file.url);
        else setTrBuktiChatUrl(data.file.url);
      } else {
        alert('Gagal upload gambar: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      alert('Error upload: ' + e.message);
    } finally {
      if (folder === 'foto_customer') setUploadingFoto(false);
      else setUploadingBukti(false);
    }
  };

  const handleAddTrafficItem = () => {
    if (!newDeskripsi || newHarga <= 0) { alert('Isi Deskripsi dan Harga barang!'); return; }
    setTrItems(prev => [...prev, {
      item_code: newItemCode || `ITEM-${Date.now().toString().slice(-4)}`,
      sap_code: newSapCode, deskripsi: newDeskripsi,
      harga: Number(newHarga), kategori: newKategori, koleksi: newKoleksi,
    }]);
    setNewItemCode(''); setNewSapCode(''); setNewDeskripsi(''); setNewHarga(0); setNewKoleksi('');
  };

  const handleRemoveTrafficItem = (index: number) => {
    setTrItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMerge = async (primary: ProfileItem, secondaries: ProfileItem[]) => {
    if (!confirm(`Gabungkan data duplikat ini? Profil #${primary.id} (${primary.nama_lengkap}) akan disimpan sebagai data utama.`)) return;
    setMergingId(primary.id);
    try {
      const res = await fetch('/api/crm/dedup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'merge', primaryId: primary.id, secondaryIds: secondaries.map(s => s.id) }),
      });
      const data = await res.json();
      if (data.success) { alert(data.message); fetchAuditData(); }
      else alert('Gagal mengabungkan: ' + data.error);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setMergingId(null);
    }
  };

  const handleCreateProfile = async () => {
    if (!namaDepan || !noHp) { setSubmitMessage({ type: 'error', text: 'Nama Depan dan Nomor HP wajib diisi!' }); return; }
    setCheckLoading(true);
    setSubmitMessage(null);
    try {
      const profilePayload = {
        title, nama_lengkap: fullName, nama_panggilan: namaPanggilan,
        nama_depan: namaDepan, nama_belakang: namaBelakang,
        full_name_tittle: `${title} ${fullName}`.trim(),
        status_pelanggan: statusPelanggan, foto_customer: fotoCustomerUrl,
        no_hp: noHp, email, kewarganegaraan,
        tanggal_lahir: tglLahir, umur, tinggi_badan: tinggiBadan, bentuk_tubuh: bentukTubuh,
        etnis, agama, status_pernikahan: pernikahan,
        tanggal_pernikahan: pernikahan === 'Kawin' ? tglPernikahan : '',
        memiliki_anak: memilikiAnak,
        jumlah_anak: memilikiAnak === 'YA' ? jumlahAnak : '0',
        pekerjaan, ktp_passport: ktpPassport,
        domisili: domisiliType === 'Dalam Negeri' ? domisiliProvinsi : '',
        domisili_luar_negeri: domisiliType === 'Luar Negeri' ? domisiliLuarNegeri : '',
        fashion_style: fashionStyle, hobby_kategori: hobbyKat, hobby_sub: hobbySub,
        hobby_others: (hobbyKat === 'Others' || hobbySub === 'Others') ? hobbyOthers : '',
        warna_favorit: warnaFavorit, tempat_liburan_favorit: liburanFavorit,
        topik_pembicaraan_favorit: topikPembicaraan,
        makanan_favorit: makananFavorit, minuman_favorit: minumanFavorit,
        alergi_makanan: alergiMakanan, cake_favorit: cakeFavorit,
        instagram, tiktok, faktor_pemicu_pembelian: pemicu,
        barang_antusias: antusias, karakter, notes,
        customer_advisor: customerAdvisor || 'System SA',
        lokasi_store: lokasiStore,
        tanggal_input: new Date().toISOString().split('T')[0],
      };
      const res = await fetch('/api/crm/dedup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', profileData: profilePayload }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitMessage({ type: 'success', text: 'Profil Pelanggan baru berhasil didaftarkan tanpa duplikasi!' });
        setNamaDepan(''); setNamaBelakang(''); setNamaPanggilan('');
        setNoHp(''); setEmail(''); setFotoCustomerUrl(''); setNotes('');
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

  const handleCreateTraffic = async () => {
    if (!trCustomerName) { setTrMessage({ type: 'error', text: 'Nama Pengunjung / Pelanggan wajib diisi!' }); return; }
    setTrMessage(null);
    try {
      const barangDiminatiStr = trItems
        .map(i => `${i.item_code} - ${i.deskripsi} (Rp ${i.harga.toLocaleString('id-ID')})`)
        .join('; ');
      const res = await fetch('/api/crm/dedup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_traffic',
          autoCreateProfile: trAutoProfile,
          trafficData: {
            tanggal_berkunjung: trTanggal, customer_name: trCustomerName,
            nama_panggilan: trNamaPanggilan, no_hp: trNoHp, email: trEmail,
            status_pelanggan: trStatusPelanggan, status: trStatus,
            prospect_item: trProspectLevel, minat_barang: trMinatBarang,
            akses_masuk: trAksesMasuk, siapa: trSiapa, faktor_pemicu: trFaktorPemicu,
            group_size: trGroupSize,
            served_by: trServedBy || 'System SA',
            customer_advisor: trServedBy || 'System SA',
            location: trLocation, notes: trNotes,
            barang_diminati: barangDiminatiStr,
            net_sales: trNetSales, diskon_pct: trDiskonPct, bukti_chat: trBuktiChatUrl,
          },
          trafficItems: trItems,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTrMessage({ type: 'success', text: 'Data Kunjungan Traffic & Items berhasil disimpan!' });
        setTrCustomerName(''); setTrNamaPanggilan(''); setTrNoHp('');
        setTrEmail(''); setTrNotes(''); setTrBuktiChatUrl(''); setTrItems([]);
        fetchAuditData();
      } else {
        setTrMessage({ type: 'error', text: 'Gagal menyimpan traffic: ' + data.error });
      }
    } catch (e: any) {
      setTrMessage({ type: 'error', text: 'Error: ' + e.message });
    }
  };

  return {
    // loading & data
    loading, totalProfiles, duplicatePhones, duplicateEmails, trafficRows, advisorsList,
    fetchAuditData,
    // profiling form
    statusPelanggan, setStatusPelanggan,
    title, setTitle,
    namaDepan, setNamaDepan,
    namaBelakang, setNamaBelakang,
    namaPanggilan, setNamaPanggilan,
    fotoCustomerUrl, uploadingFoto,
    kewarganegaraan, setKewarganegaraan,
    noHp, setNoHp,
    email, setEmail,
    ktpPassport, setKtpPassport,
    tglLahir, setTglLahir,
    umur, setUmur,
    etnis, setEtnis,
    agama, setAgama,
    pernikahan, setPernikahan,
    tglPernikahan, setTglPernikahan,
    memilikiAnak, setMemilikiAnak,
    jumlahAnak, setJumlahAnak,
    domisiliType, setDomisiliType,
    domisiliProvinsi, setDomisiliProvinsi,
    domisiliLuarNegeri, setDomisiliLuarNegeri,
    pekerjaan, setPekerjaan,
    tinggiBadan, setTinggiBadan,
    bentukTubuh, setBentukTubuh,
    fashionStyle, setFashionStyle,
    hobbyKat, setHobbyKat,
    hobbySub, setHobbySub,
    hobbyOthers, setHobbyOthers,
    warnaFavorit, setWarnaFavorit,
    liburanFavorit, setLiburanFavorit,
    topikPembicaraan, setTopikPembicaraan,
    makananFavorit, setMakananFavorit,
    minumanFavorit, setMinumanFavorit,
    cakeFavorit, setCakeFavorit,
    alergiMakanan, setAlergiMakanan,
    instagram, setInstagram,
    tiktok, setTiktok,
    pemicu, setPemicu,
    antusias, setAntusias,
    karakter, setKarakter,
    notes, setNotes,
    lokasiStore, setLokasiStore,
    customerAdvisor, setCustomerAdvisor,
    submitMessage, handleCreateProfile,
    // dedup check
    checkLoading, fullName, isExactDuplicate,
    exactPhoneMatches, exactEmailMatches, fuzzyMatches,
    mergingId, handleMerge,
    // traffic form
    trTanggal, setTrTanggal,
    trCustomerName, setTrCustomerName,
    trNamaPanggilan, setTrNamaPanggilan,
    trNoHp, setTrNoHp,
    trEmail, setTrEmail,
    trStatusPelanggan, setTrStatusPelanggan,
    trStatus, setTrStatus,
    trProspectLevel, setTrProspectLevel,
    trMinatBarang, setTrMinatBarang,
    trAksesMasuk, setTrAksesMasuk,
    trSiapa, setTrSiapa,
    trFaktorPemicu, setTrFaktorPemicu,
    trGroupSize, setTrGroupSize,
    trServedBy, setTrServedBy,
    trLocation, setTrLocation,
    trNotes, setTrNotes,
    trDiskonPct, setTrDiskonPct,
    trBuktiChatUrl, uploadingBukti,
    trAutoProfile, setTrAutoProfile,
    trItems, trSubtotal, trNetSales,
    newItemCode, setNewItemCode,
    newSapCode, setNewSapCode,
    newDeskripsi, setNewDeskripsi,
    newHarga, setNewHarga,
    newKategori, setNewKategori,
    newKoleksi, setNewKoleksi,
    handleAddTrafficItem, handleRemoveTrafficItem,
    trMessage, handleCreateTraffic,
    handleUploadImage,
  };
}

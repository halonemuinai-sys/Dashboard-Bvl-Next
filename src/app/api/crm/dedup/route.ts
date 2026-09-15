import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Clean phone helper
function cleanPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

// Levenshtein / String similarity helper
function stringSimilarity(s1: string, s2: string): number {
  let longer = s1.toLowerCase().trim();
  let shorter = s2.toLowerCase().trim();
  if (longer.length < shorter.length) {
    let tmp = longer;
    longer = shorter;
    shorter = tmp;
  }
  let longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  
  // Edit distance
  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longerLength - costs[shorter.length]) / longerLength;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'audit';
    const query = searchParams.get('query') || searchParams.get('q') || '';
    const phone = searchParams.get('phone') || '';
    const email = searchParams.get('email') || '';
    const store = searchParams.get('store') || '';

    // 0. SEARCH CUSTOMERS FROM DB FOR AUTOCOMPLETE / PICKER
    if (action === 'search_customers') {
      const q = query.trim();

      // Normalization helpers for visit & segmentation fields
      const normalizeStatusVisit = (val: string | null | undefined): string => {
        if (!val) return 'Walk-in';
        const v = val.trim().toLowerCase();
        if (v.includes('walk')) return 'Walk-in';
        if (v.includes('follow')) return 'Follow Up';
        if (v.includes('in house') || v.includes('in house')) return 'Walk-in';
        if (v.includes('complete') || v.includes('selesai')) return 'Completed';
        if (v.includes('repair')) return 'Repair / Service';
        if (v.includes('online')) return 'Online Inquiry';
        if (v.includes('delivery') || v.includes('showing')) return 'Delivery / Showing';
        return val.trim();
      };

      const normalizeMinatBarang = (val: string | null | undefined): string => {
        if (!val) return 'Jewelry';
        const parts = val.split(/[,;/]/).map(s => s.trim()).filter(Boolean);
        return parts[0] || 'Jewelry';
      };

      const normalizeSiapa = (siapaVal: string | null | undefined, kewarganegaraanVal: string | null | undefined): string => {
        if (siapaVal && siapaVal.trim()) return siapaVal.trim();
        if (kewarganegaraanVal) {
          const k = kewarganegaraanVal.trim().toLowerCase();
          if (k && k !== 'indonesia' && k !== 'indonesian' && k !== 'wni') {
            return 'Turis International';
          }
          return 'Turis Domestik';
        }
        return 'Turis Domestik';
      };

      let crmQuery = supabase
        .from('crm_profiling')
        .select('id, nama_lengkap, nama_panggilan, no_hp, email, status_pelanggan, customer_advisor, lokasi_store, barang_antusias, faktor_pemicu_pembelian, kewarganegaraan, etnis')
        .not('nama_lengkap', 'is', null);

      let trafficQuery = supabase
        .from('mirror_traffic')
        .select('id, customer_name, nama_panggilan, no_hp, email, status_pelanggan, customer_advisor, served_by, location, status, prospect_item, siapa, akses_masuk, faktor_pemicu, group_size, minat_barang')
        .not('customer_name', 'is', null);

      if (q) {
        crmQuery = crmQuery.or(`nama_lengkap.ilike.%${q}%,nama_panggilan.ilike.%${q}%,no_hp.ilike.%${q}%,email.ilike.%${q}%`).limit(30);
        trafficQuery = trafficQuery.or(`customer_name.ilike.%${q}%,nama_panggilan.ilike.%${q}%,no_hp.ilike.%${q}%,email.ilike.%${q}%`).limit(30);
      } else {
        crmQuery = crmQuery.order('id', { ascending: false }).limit(25);
        trafficQuery = trafficQuery.order('id', { ascending: false }).limit(25);
      }

      if (store && store !== 'ALL') {
        crmQuery = crmQuery.eq('lokasi_store', store);
        trafficQuery = trafficQuery.eq('location', store);
      }

      const [{ data: crmRows, error: crmErr }, { data: trafficRows, error: trafficErr }] = await Promise.all([
        crmQuery,
        trafficQuery,
      ]);

      if (crmErr) console.warn('Error in crmQuery search:', crmErr);
      if (trafficErr) console.warn('Error in trafficQuery search:', trafficErr);

      const map = new Map<string, any>();

      // 1. First insert traffic records (which have rich visit segmentation history)
      (trafficRows || []).forEach(t => {
        if (!t.customer_name) return;
        const key = t.customer_name.trim().toLowerCase();
        map.set(key, {
          id: t.id,
          name: t.customer_name.trim(),
          nickname: t.nama_panggilan?.trim() || '',
          phone: t.no_hp?.trim() || '',
          email: t.email?.trim() || '',
          status: t.status_pelanggan?.trim() || 'Existing Customer',
          advisor: t.customer_advisor?.trim() || t.served_by?.trim() || '',
          store: t.location?.trim() || '',
          source: 'Traffic Record',
          // Visit & Segmentation details
          statusVisit: normalizeStatusVisit(t.status),
          prospectLevel: t.prospect_item?.trim() || 'Potensial Pelanggan Baru',
          minatBarang: normalizeMinatBarang(t.minat_barang),
          aksesMasuk: t.akses_masuk?.trim() || 'Tamu butik Bulgari',
          siapa: normalizeSiapa(t.siapa, null),
          faktorPemicu: t.faktor_pemicu?.trim() || 'Masih Dalam Prospek',
          groupSize: t.group_size ? String(t.group_size) : '1',
        });
      });

      // 2. Then merge or insert CRM Profiles (profiles take precedence for master details, and enrich segmentation)
      (crmRows || []).forEach(c => {
        if (!c.nama_lengkap) return;
        const key = c.nama_lengkap.trim().toLowerCase();
        const existing = map.get(key);

        if (existing) {
          map.set(key, {
            ...existing,
            nickname: c.nama_panggilan?.trim() || existing.nickname,
            phone: c.no_hp?.trim() || existing.phone,
            email: c.email?.trim() || existing.email,
            status: c.status_pelanggan?.trim() || existing.status,
            advisor: c.customer_advisor?.trim() || existing.advisor,
            store: c.lokasi_store?.trim() || existing.store,
            source: 'CRM Profile',
            minatBarang: existing.minatBarang || normalizeMinatBarang(c.barang_antusias),
            faktorPemicu: existing.faktorPemicu || c.faktor_pemicu_pembelian?.trim() || 'Masih Dalam Prospek',
            siapa: existing.siapa || normalizeSiapa(null, c.kewarganegaraan),
          });
        } else {
          map.set(key, {
            id: c.id,
            name: c.nama_lengkap.trim(),
            nickname: c.nama_panggilan?.trim() || '',
            phone: c.no_hp?.trim() || '',
            email: c.email?.trim() || '',
            status: c.status_pelanggan?.trim() || 'Existing Customer',
            advisor: c.customer_advisor?.trim() || '',
            store: c.lokasi_store?.trim() || '',
            source: 'CRM Profile',
            statusVisit: 'Walk-in',
            prospectLevel: 'Potensial Pelanggan Baru',
            minatBarang: normalizeMinatBarang(c.barang_antusias),
            aksesMasuk: 'Tamu butik Bulgari',
            siapa: normalizeSiapa(null, c.kewarganegaraan),
            faktorPemicu: c.faktor_pemicu_pembelian?.trim() || 'Masih Dalam Prospek',
            groupSize: '1',
          });
        }
      });

      return NextResponse.json({
        success: true,
        customers: Array.from(map.values()),
      });
    }

    // 0.1 INTEGRATED TRAFFIC LIST WITH CRM LINKING (FOR OPSI 2)
    if (action === 'get_integrated_traffic') {
      const q = (searchParams.get('q') || query || '').trim();
      const storeFilter = searchParams.get('store') || '';
      const statusFilter = searchParams.get('status') || '';
      const prospectFilter = searchParams.get('prospect') || '';
      const startDate = searchParams.get('startDate') || '';
      const endDate = searchParams.get('endDate') || '';
      const limit = Math.min(Number(searchParams.get('limit')) || 60, 100);
      const page = Math.max(Number(searchParams.get('page')) || 1, 1);
      const offset = (page - 1) * limit;

      let trafficQuery = supabase
        .from('mirror_traffic')
        .select(`
          id, customer_name, nama_panggilan, no_hp, email,
          served_by, customer_advisor, location, status, prospect_item,
          gross_sales, disc_pct, net_sales, siapa, akses_masuk,
          tanggal_berkunjung, minat_barang, detail_items, notes,
          bukti_chat, group_size, faktor_pemicu
        `, { count: 'exact' })
        .not('customer_name', 'is', null)
        .order('tanggal_berkunjung', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false });

      if (q) {
        trafficQuery = trafficQuery.or(
          `customer_name.ilike.%${q}%,nama_panggilan.ilike.%${q}%,no_hp.ilike.%${q}%,served_by.ilike.%${q}%,minat_barang.ilike.%${q}%`
        );
      }
      if (storeFilter && storeFilter !== 'ALL') {
        trafficQuery = trafficQuery.eq('location', storeFilter);
      }
      if (statusFilter && statusFilter !== 'ALL') {
        trafficQuery = trafficQuery.ilike('status', `%${statusFilter}%`);
      }
      if (prospectFilter && prospectFilter !== 'ALL') {
        trafficQuery = trafficQuery.ilike('prospect_item', `%${prospectFilter}%`);
      }
      if (startDate) {
        trafficQuery = trafficQuery.gte('tanggal_berkunjung', startDate);
      }
      if (endDate) {
        trafficQuery = trafficQuery.lte('tanggal_berkunjung', endDate);
      }

      trafficQuery = trafficQuery.range(offset, offset + limit - 1);

      const { data: rawTraffic, count: totalCount, error: tErr } = await trafficQuery;
      if (tErr) throw tErr;

      const trafficRows = rawTraffic || [];

      // Extract unique customer names and phones to match against crm_profiling
      const names = Array.from(new Set(trafficRows.map(t => t.customer_name?.trim()).filter(Boolean)));

      const crmMap = new Map<string, any>();
      if (names.length > 0) {
        // Query matching CRM profiles in chunks or OR conditions
        const orConditions = names.slice(0, 35).map(n => `nama_lengkap.ilike.%${n}%`).join(',');
        if (orConditions) {
          const { data: crmMatches, error: cErr } = await supabase
            .from('crm_profiling')
            .select(`
              id, nama_lengkap, nama_panggilan, no_hp, email,
              status_pelanggan, customer_advisor, lokasi_store,
              pekerjaan, etnis, hobby, warna_favorit, fashion_style,
              barang_antusias, faktor_pemicu_pembelian, foto_customer,
              domisili, umur, kewarganegaraan
            `)
            .or(orConditions);

          if (!cErr && crmMatches) {
            crmMatches.forEach(p => {
              if (p.nama_lengkap) {
                crmMap.set(p.nama_lengkap.trim().toLowerCase(), p);
              }
              const pPhone = cleanPhone(p.no_hp);
              if (pPhone) {
                crmMap.set(pPhone, p);
              }
            });
          }
        }
      }

      // Enrich traffic rows with CRM profile link
      let crmLinkedCount = 0;
      let totalNetSales = 0;
      let closingCount = 0;

      const enrichedRows = trafficRows.map(t => {
        const keyName = (t.customer_name || '').trim().toLowerCase();
        const keyPhone = cleanPhone(t.no_hp);
        const matchedCrm = crmMap.get(keyName) || (keyPhone ? crmMap.get(keyPhone) : null);

        if (matchedCrm) crmLinkedCount++;
        const netSalesNum = Number(t.net_sales) || 0;
        totalNetSales += netSalesNum;
        if (
          (t.prospect_item && t.prospect_item.toLowerCase().includes('berhasil')) ||
          netSalesNum > 0
        ) {
          closingCount++;
        }

        return {
          ...t,
          hasCrmProfile: !!matchedCrm,
          crmProfile: matchedCrm ? {
            id: matchedCrm.id,
            nama_lengkap: matchedCrm.nama_lengkap,
            nama_panggilan: matchedCrm.nama_panggilan,
            no_hp: matchedCrm.no_hp,
            email: matchedCrm.email,
            status_pelanggan: matchedCrm.status_pelanggan,
            customer_advisor: matchedCrm.customer_advisor,
            lokasi_store: matchedCrm.lokasi_store,
            pekerjaan: matchedCrm.pekerjaan,
            etnis: matchedCrm.etnis,
            hobby: matchedCrm.hobby,
            warna_favorit: matchedCrm.warna_favorit,
            fashion_style: matchedCrm.fashion_style,
            barang_antusias: matchedCrm.barang_antusias,
            faktor_pemicu_pembelian: matchedCrm.faktor_pemicu_pembelian,
            foto_customer: matchedCrm.foto_customer,
            domisili: matchedCrm.domisili,
            umur: matchedCrm.umur,
            kewarganegaraan: matchedCrm.kewarganegaraan,
          } : null,
        };
      });

      return NextResponse.json({
        success: true,
        trafficRows: enrichedRows,
        totalCount: totalCount || enrichedRows.length,
        page,
        limit,
        metrics: {
          totalRows: totalCount || enrichedRows.length,
          totalNetSales,
          crmLinkedCount,
          closingCount,
        },
      });
    }

    // 0.2 CUSTOMER 360 HISTORY (FOR OPSI 1 & OPSI 2)
    if (action === 'get_customer_history') {
      const name = (searchParams.get('name') || query || '').trim();
      const phoneParam = searchParams.get('phone') || phone || '';
      const emailParam = searchParams.get('email') || email || '';
      const cleanPhoneParam = cleanPhone(phoneParam);

      if (!name && !cleanPhoneParam && !emailParam) {
        return NextResponse.json({
          success: true,
          visits: [],
          sales: [],
          summary: { totalVisits: 0, totalLifetimeSales: 0, lastVisitDate: null, lastPurchaseDate: null, topCollections: [] }
        });
      }

      // 1. Fetch visits from mirror_traffic
      let trafficQuery = supabase
        .from('mirror_traffic')
        .select(`
          id, customer_name, nama_panggilan, no_hp, email,
          served_by, customer_advisor, location, status, prospect_item,
          gross_sales, disc_pct, net_sales, siapa, akses_masuk,
          tanggal_berkunjung, minat_barang, detail_items, notes,
          bukti_chat, group_size, faktor_pemicu
        `)
        .order('tanggal_berkunjung', { ascending: false, nullsFirst: false })
        .limit(30);

      const conditions: string[] = [];
      if (name) conditions.push(`customer_name.ilike.%${name}%`);
      if (cleanPhoneParam) conditions.push(`no_hp.ilike.%${cleanPhoneParam}%`);
      if (emailParam) conditions.push(`email.ilike.%${emailParam}%`);

      trafficQuery = trafficQuery.or(conditions.join(','));

      // 2. Fetch completed POS sales from clean_master
      let salesQuery = supabase
        .from('clean_master')
        .select(`
          trans_no, transaction_date, customer, location,
          net_sales, gross_sales, sap_code, collection,
          main_category, qty, catalogue_code
        `)
        .order('transaction_date', { ascending: false })
        .limit(40);

      if (name) {
        salesQuery = salesQuery.ilike('customer', `%${name}%`);
      }

      const [{ data: visits, error: vErr }, { data: sales, error: sErr }] = await Promise.all([
        trafficQuery,
        salesQuery,
      ]);

      if (vErr) console.warn('Error fetching customer visits:', vErr);
      if (sErr) console.warn('Error fetching customer sales:', sErr);

      const visitList = visits || [];
      const salesList = (sales || []).map((s: any) => ({
        ...s,
        doc_num: s.trans_no || s.doc_num || '—',
        doc_date: s.transaction_date || s.doc_date,
        store: s.location || s.store || '—',
        item_name: s.collection ? `${s.collection} ${s.main_category || ''}`.trim() : (s.sap_code || '—'),
        product_line: s.main_category || s.product_line,
        item_code: s.sap_code || s.catalogue_code || s.item_code,
      }));

      // Calculate summary metrics
      const totalVisits = visitList.length;
      const totalLifetimeSales = salesList.reduce((sum, s) => sum + (Number(s.net_sales) || 0), 0);
      const lastVisitDate = visitList.length > 0 ? visitList[0].tanggal_berkunjung : null;
      const lastPurchaseDate = salesList.length > 0 ? salesList[0].transaction_date : null;

      // Collections summary
      const collectionsMap: Record<string, number> = {};
      salesList.forEach(s => {
        if (s.collection) {
          collectionsMap[s.collection] = (collectionsMap[s.collection] || 0) + (Number(s.net_sales) || 0);
        }
      });
      const topCollections = Object.entries(collectionsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cName, spend]) => ({ name: cName, spend }));

      return NextResponse.json({
        success: true,
        visits: visitList,
        sales: salesList,
        trafficVisits: visitList,
        salesTransactions: salesList,
        summary: {
          totalVisits,
          totalSalesTransactions: salesList.length,
          totalLifetimeSales,
          lastVisitDate,
          lastPurchaseDate,
          topCollections,
        },
      });
    }

    // 1. LIVE CHECKER FOR FORM INPUT
    if (action === 'check') {
      const cleanInputPhone = cleanPhone(phone);
      const cleanInputEmail = email.toLowerCase().trim();

      const { data: allProfiles, error } = await supabase
        .from('crm_profiling')
        .select('*');

      if (error) throw error;

      const exactPhoneMatches: any[] = [];
      const exactEmailMatches: any[] = [];
      const fuzzyNameMatches: any[] = [];

      (allProfiles || []).forEach(p => {
        const pCleanPhone = cleanPhone(p.no_hp);
        const pCleanEmail = (p.email || '').toLowerCase().trim();

        // Exact phone check
        if (cleanInputPhone && pCleanPhone && (pCleanPhone === cleanInputPhone || pCleanPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(pCleanPhone))) {
          exactPhoneMatches.push(p);
        }
        // Exact email check
        else if (cleanInputEmail && pCleanEmail && pCleanEmail === cleanInputEmail) {
          exactEmailMatches.push(p);
        }
        // Fuzzy name check
        else if (query && p.nama_lengkap) {
          const sim = stringSimilarity(query, p.nama_lengkap);
          if (sim >= 0.7) {
            fuzzyNameMatches.push({ ...p, similarityScore: Math.round(sim * 100) });
          }
        }
      });

      return NextResponse.json({
        success: true,
        exactPhoneMatches,
        exactEmailMatches,
        fuzzyNameMatches: fuzzyNameMatches.sort((a, b) => b.similarityScore - a.similarityScore),
        isDuplicate: exactPhoneMatches.length > 0 || exactEmailMatches.length > 0,
        hasPotentialMatches: fuzzyNameMatches.length > 0,
      });
    }

    // 2. FULL AUDIT OF DUPLICATES IN DATABASE
    if (action === 'audit') {
      const { data: profiles, error } = await supabase
        .from('crm_profiling')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      const phoneGroups: Record<string, any[]> = {};
      const emailGroups: Record<string, any[]> = {};

      (profiles || []).forEach(p => {
        const cp = cleanPhone(p.no_hp);
        if (cp && cp.length >= 8) {
          if (!phoneGroups[cp]) phoneGroups[cp] = [];
          phoneGroups[cp].push(p);
        }

        const em = (p.email || '').toLowerCase().trim();
        if (em && em.includes('@')) {
          if (!emailGroups[em]) emailGroups[em] = [];
          emailGroups[em].push(p);
        }
      });

      // Filter groups with > 1 item
      const duplicatePhones = Object.entries(phoneGroups)
        .filter(([_, items]) => items.length > 1)
        .map(([phoneKey, items]) => ({ phoneKey, count: items.length, items }));

      const duplicateEmails = Object.entries(emailGroups)
        .filter(([_, items]) => items.length > 1)
        .map(([emailKey, items]) => ({ emailKey, count: items.length, items }));

      // Fetch unlinked mirror_traffic rows
      const { data: trafficRows } = await supabase
        .from('mirror_traffic')
        .select('*')
        .order('tanggal_berkunjung', { ascending: false })
        .limit(100);

      // Fetch Advisors list from advisor_pins and advisors
      const { data: pins } = await supabase.from('advisor_pins').select('advisor_name');
      const { data: advs } = await supabase.from('advisors').select('name');

      const advisorSet = new Set<string>();
      (pins || []).forEach((p: any) => {
        if (p.advisor_name) advisorSet.add(p.advisor_name.trim());
      });
      (advs || []).forEach((a: any) => {
        if (a.name) advisorSet.add(a.name.trim());
      });

      // Default fallbacks if empty
      if (advisorSet.size === 0) {
        [
          'Supervisor PI', 'Store Manager PI', 'Advisor Plaza Indonesia 1', 'Advisor Plaza Indonesia 2',
          'Store Manager PS', 'Advisor Plaza Senayan 1', 'Advisor Plaza Senayan 2',
          'Store Manager Bali', 'Advisor Bali 1', 'Advisor Bali 2'
        ].forEach((n) => advisorSet.add(n));
      }

      return NextResponse.json({
        success: true,
        totalProfiles: (profiles || []).length,
        duplicatePhoneCount: duplicatePhones.reduce((acc, curr) => acc + curr.count, 0),
        duplicateEmailCount: duplicateEmails.reduce((acc, curr) => acc + curr.count, 0),
        duplicatePhoneGroups: duplicatePhones,
        duplicateEmailGroups: duplicateEmails,
        trafficRows: trafficRows || [],
        advisorsList: Array.from(advisorSet).sort(),
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, primaryId, secondaryIds, profileData, trafficData, trafficItems, autoCreateProfile } = body;

    // Merge profiles action
    if (action === 'merge') {
      if (!primaryId || !secondaryIds || !Array.isArray(secondaryIds)) {
        return NextResponse.json({ success: false, error: 'Missing primaryId or secondaryIds' }, { status: 400 });
      }

      // Delete secondary profiles
      const { error: delError } = await supabase
        .from('crm_profiling')
        .delete()
        .in('id', secondaryIds);

      if (delError) throw delError;

      return NextResponse.json({
        success: true,
        message: `Berhasil mengabungkan profil. ${secondaryIds.length} data duplikat dihapus.`,
      });
    }

    // Create deduplicated CRM profile action
    if (action === 'create') {
      const { data: inserted, error: insError } = await supabase
        .from('crm_profiling')
        .insert(profileData)
        .select()
        .single();

      if (insError) throw insError;

      return NextResponse.json({
        success: true,
        message: 'Profil baru berhasil dibuat tanpa duplikasi!',
        data: inserted,
      });
    }

    // Create Traffic / Prospect entry action
    if (action === 'create_traffic') {
      let createdProfileId = trafficData.crm_profile_id || null;

      // Auto-create CRM profile if checked
      if (autoCreateProfile && trafficData.customer_name) {
        const { data: newProf, error: profErr } = await supabase
          .from('crm_profiling')
          .insert({
            nama_lengkap: trafficData.customer_name,
            no_hp: trafficData.no_hp || '',
            email: trafficData.email || '',
            lokasi_store: trafficData.location || 'Plaza Indonesia',
            customer_advisor: trafficData.served_by || 'System SA',
            status_pelanggan: trafficData.status_pelanggan || 'New Prospect',
            tanggal_input: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (!profErr && newProf) {
          createdProfileId = newProf.id;
        }
      }

      // Insert into mirror_traffic
      const { data: insTraffic, error: trErr } = await supabase
        .from('mirror_traffic')
        .insert({
          tanggal_berkunjung: trafficData.tanggal_berkunjung || new Date().toISOString().split('T')[0],
          customer_name: trafficData.customer_name,
          nama_panggilan: trafficData.nama_panggilan || '',
          customer_advisor: trafficData.customer_advisor || trafficData.served_by,
          served_by: trafficData.served_by,
          location: trafficData.location,
          status: trafficData.status || 'Follow Up',
          prospect_item: trafficData.prospect_item || '',
          minat_barang: trafficData.minat_barang || '',
          akses_masuk: trafficData.akses_masuk || '',
          siapa: trafficData.siapa || '',
          faktor_pemicu: trafficData.faktor_pemicu || '',
          group_size: trafficData.group_size || '',
          no_hp: trafficData.no_hp || '',
          email: trafficData.email || '',
          status_pelanggan: trafficData.status_pelanggan || 'New Prospect',
          notes: trafficData.notes || '',
          barang_diminati: trafficData.barang_diminati || '',
          net_sales: trafficData.net_sales || 0,
          diskon_pct: trafficData.diskon_pct || 0,
          bukti_chat: trafficData.bukti_chat || '',
          crm_profile_id: createdProfileId,
        })
        .select()
        .single();

      if (trErr) throw trErr;

      // Insert multi-row items into traffic_items if provided
      if (Array.isArray(trafficItems) && trafficItems.length > 0 && insTraffic) {
        const rowsToInsert = trafficItems.map((item: any) => ({
          traffic_id: insTraffic.id,
          item_code: item.item_code || '',
          sap_code: item.sap_code || '',
          deskripsi: item.deskripsi || '',
          harga: Number(item.harga) || 0,
          kategori: item.kategori || '',
          koleksi: item.koleksi || '',
        }));

        await supabase.from('traffic_items').insert(rowsToInsert);
      }

      return NextResponse.json({
        success: true,
        message: 'Kunjungan Traffic / Walk-in berhasil dicatat!',
        data: insTraffic,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

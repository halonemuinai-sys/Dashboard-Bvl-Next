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
    const query = searchParams.get('query') || '';
    const phone = searchParams.get('phone') || '';
    const email = searchParams.get('email') || '';

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

      return NextResponse.json({
        success: true,
        totalProfiles: (profiles || []).length,
        duplicatePhoneCount: duplicatePhones.reduce((acc, curr) => acc + curr.count, 0),
        duplicateEmailCount: duplicateEmails.reduce((acc, curr) => acc + curr.count, 0),
        duplicatePhoneGroups: duplicatePhones,
        duplicateEmailGroups: duplicateEmails,
        trafficRows: trafficRows || [],
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
            lokasi_store: trafficData.location || 'Pacific Intermark',
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

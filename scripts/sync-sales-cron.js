const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../.env')
  ];
  
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual !== -1) {
            const key = trimmed.substring(0, firstEqual).trim();
            let val = trimmed.substring(firstEqual + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

async function runSync() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiBase = process.env.BVLGARI_API_BASE || 'http://139.99.102.231:8089/demo';
  const apiToken = process.env.BVLGARI_API_TOKEN;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.');
    process.exit(1);
  }

  if (!apiToken) {
    console.error('Error: BVLGARI_API_TOKEN is missing.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Sync current month and previous month
  const now = new Date();
  const monthsToSync = [];
  
  // Current month
  monthsToSync.push({ month: now.getMonth() + 1, year: now.getFullYear() });
  
  // Previous month
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  monthsToSync.push({ month: prevDate.getMonth() + 1, year: prevDate.getFullYear() });

  console.log(`[${new Date().toLocaleString('id-ID')}] Starting hourly sales sync...`);

  // Fetch Master Data once
  const [
    { data: masterCats, error: catErr },
    { data: masterColls, error: collErr }
  ] = await Promise.all([
    supabase.from('master_main_category').select('*'),
    supabase.from('master_collection').select('*')
  ]);

  if (catErr || collErr) {
    console.error('Error fetching master data:', catErr || collErr);
    process.exit(1);
  }

  const catMap = new Map();
  (masterCats || []).forEach(r => catMap.set(String(r.code).trim().toUpperCase(), r.description));
  
  const collMap = new Map();
  (masterColls || []).forEach(r => collMap.set(String(r.code).trim().toUpperCase(), r.description));

  for (const item of monthsToSync) {
    const { month, year } = item;
    console.log(`\nSyncing sales data for ${year}-${String(month).padStart(2, '0')}...`);
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const apiUrl = `${apiBase}/dailysalestransaction?startdate=${encodeURIComponent(startDate)}&enddate=${encodeURIComponent(endDate)}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Authorization': apiToken }
      });

      if (!response.ok) {
        console.error(`Bvlgari API returned error HTTP ${response.status} for ${startDate} to ${endDate}`);
        continue;
      }

      const apiData = await response.json();
      if (!Array.isArray(apiData) || apiData.length === 0) {
        console.log(`No data returned from Bvlgari API for ${startDate} to ${endDate}`);
        continue;
      }

      // Deduplicate with existing bvlgari_sales
      const { data: existingRaw, error: rawFetchErr } = await supabase
        .from('bvlgari_sales')
        .select('transaction_no')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      if (rawFetchErr) {
        console.error('Error fetching existing raw sales:', rawFetchErr);
        continue;
      }

      const existingTxSet = new Set((existingRaw || []).map(r => r.transaction_no));
      const rawRows = [];
      let skipped = 0;

      for (const itm of apiData) {
        if (existingTxSet.has(itm.transactionNo)) {
          skipped++;
          continue;
        }

        const qtyRaw = parseInt(String(itm.qty));
        const qtyForCalc = (isNaN(qtyRaw) || qtyRaw === 0) ? 1 : qtyRaw;
        const unitPrice = parseFloat(String(itm.price)) || 0;
        const gross = qtyForCalc * unitPrice;
        const discount = parseFloat(String(itm.subTotalDiscount)) || 0;
        let taxAmount = parseFloat(String(itm.subTotaltax || itm.subTotalTax)) || 0;
        const taxRate = parseFloat(String(itm.tax)) || 0;
        const collCode = (itm.collectionCode || '').toUpperCase();
        const grossAfterDiscount = gross - discount;

        if (taxAmount === 0 && (collCode === 'PFM' || taxRate > 1)) {
          const divisor = taxRate > 1 ? taxRate : 1.11;
          const calculatedNet = grossAfterDiscount / divisor;
          taxAmount = grossAfterDiscount - calculatedNet;
        }

        const netSales = grossAfterDiscount - taxAmount;

        rawRows.push({
          transaction_date: itm.transactionDate || null,
          transaction_time: itm.transactionTime || null,
          salesman: itm.salesman || null,
          customer_name: itm.customerName || null,
          phone_no: itm.phoneNo || null,
          transaction_no: itm.transactionNo || null,
          location: itm.location || null,
          sap_code: itm.sapCode || null,
          catalogue_code: itm.catalogueCode || null,
          description: itm.description || null,
          collection: itm.collectionCode || null,
          qty: qtyForCalc,
          price: unitPrice,
          sub_total_discount: discount,
          sub_total_tax: taxAmount,
          net_sales: netSales
        });
      }

      if (rawRows.length === 0) {
        console.log(`All ${apiData.length} records for ${year}-${month} are duplicates. Skipped.`);
        continue;
      }

      // Insert to bvlgari_sales
      let rawInserted = 0;
      for (let i = 0; i < rawRows.length; i += 500) {
        const batch = rawRows.slice(i, i + 500);
        const { error: rawErr } = await supabase.from('bvlgari_sales').insert(batch);
        if (rawErr) {
          console.error('bvlgari_sales insert error:', rawErr);
          break;
        }
        rawInserted += batch.length;
      }

      // Normalize to clean_master
      const EXCLUDED_COLLECTIONS = ['DPS', 'SVC', 'PACK'];
      const normalizedRows = rawRows
        .filter(row => {
          const loc = (row.location || '').toUpperCase();
          if (loc.includes('RB')) return false;

          const collCode = (row.collection || '').toUpperCase();
          if (EXCLUDED_COLLECTIONS.some(ex => collCode.includes(ex))) return false;

          return true;
        })
        .map(row => {
          const codes = String(row.collection || "").split(',').map(s => s.trim().toUpperCase());
          const mainCat = catMap.get(codes[0]) || "Other";
          const collName = collMap.get(codes[codes.length - 1]) || "Unknown";

          const grossSales = row.qty * row.price;
          const valDisc = row.sub_total_discount;
          const discPct = grossSales > 0 ? valDisc / grossSales : 0;
          const netPrice = grossSales - valDisc;
          const comm = 0;
          const cost = valDisc + comm;

          return {
            transaction_date: row.transaction_date,
            location: row.location,
            salesman: row.salesman,
            customer: row.customer_name,
            trans_no: row.transaction_no,
            sap_code: row.sap_code,
            main_category: mainCat,
            collection: collName,
            qty: row.qty,
            gross_sales: grossSales,
            disc_pct: discPct,
            val_disc: valDisc,
            net_price: netPrice,
            comm: comm,
            cost: cost,
            net_sales: row.net_sales,
            type: 'Regular',
            catalogue_code: row.catalogue_code
          };
        });

      let normalizedInserted = 0;
      for (let i = 0; i < normalizedRows.length; i += 500) {
        const batch = normalizedRows.slice(i, i + 500);
        const { error: normErr } = await supabase.from('clean_master').insert(batch);
        if (normErr) {
          console.error('clean_master insert error:', normErr);
          break;
        }
        normalizedInserted += batch.length;
      }

      console.log(`Sync success for ${year}-${month}: Inserted ${rawInserted} raw rows, ${normalizedInserted} normalized rows, skipped ${skipped} duplicates.`);

    } catch (e) {
      console.error(`Unexpected error syncing ${year}-${month}:`, e);
    }
  }

  console.log(`\n[${new Date().toLocaleString('id-ID')}] Sales sync completed.`);
}

runSync();

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { corsHeaders, handleOptions } from '@/lib/mobile-auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { month, year, location } = body;

    const now = new Date();
    const syncMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const syncYear = year ? parseInt(year, 10) : now.getFullYear();

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const lastDay = new Date(syncYear, syncMonth, 0).getDate();
    const startDateStr = `${syncYear}-${pad(syncMonth)}-01`;
    const endDateStr = `${syncYear}-${pad(syncMonth)}-${pad(lastDay)}`;

    // Proxy request to Bvlgari External API
    const bvlgariApiUrl = `http://139.99.102.231:8089/demo/dailysalestransaction?startdate=${startDateStr}&enddate=${endDateStr}`;
    const token = process.env.BVLGARI_API_TOKEN || 'c0J2bGFnMjAyNjptcmFiMTJnMw==';

    const apiRes = await fetch(bvlgariApiUrl, {
      headers: {
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
      },
    });

    if (!apiRes.ok) {
      return NextResponse.json(
        { success: false, error: `External Bvlgari API returned ${apiRes.status}` },
        { status: 502, headers: corsHeaders }
      );
    }

    const rawData = await apiRes.json();
    const records = Array.isArray(rawData) ? rawData : rawData.data || rawData.records || [];

    if (!records.length) {
      return NextResponse.json(
        { success: true, message: 'No records found for specified date range', inserted: 0, skipped: 0 },
        { headers: corsHeaders }
      );
    }

    // Existing trans_no deduplication check
    const { data: existingSales } = await supabase
      .from('bvlgari_sales')
      .select('trans_no')
      .gte('transaction_date', `${startDateStr}T00:00:00`)
      .lte('transaction_date', `${endDateStr}T23:59:59`);

    const existingTransSet = new Set((existingSales || []).map(s => s.trans_no));

    const newSalesRows: any[] = [];
    const newCleanRows: any[] = [];

    records.forEach((r: any) => {
      const transNo = r.trans_no || r.transNo || r.invoice_no || r.InvoiceNo;
      if (!transNo || existingTransSet.has(transNo)) return;

      const gross = Number(r.gross_sales || r.grossAmount || 0);
      const disc = Number(r.val_disc || r.discount || 0);
      const tax = Number(r.tax || r.vat || 0);
      const net = gross - disc;

      const loc = r.location || location || 'Plaza Indonesia';

      newSalesRows.push({
        trans_no: transNo,
        transaction_date: r.transaction_date || r.transDate || `${startDateStr}T00:00:00`,
        gross_sales: gross,
        val_disc: disc,
        net_sales: net,
        tax: tax,
        location: loc,
        salesman: r.salesman || r.salesPerson || '',
        customer: r.customer || r.customerName || '',
        main_category: r.main_category || r.category || '',
        collection: r.collection || '',
        qty: Number(r.qty || 1),
        created_at: new Date().toISOString(),
      });

      // Filter non-retail for clean_master
      const locLower = loc.toLowerCase();
      if (!locLower.includes('head office') && !locLower.includes('ho')) {
        newCleanRows.push({
          trans_no: transNo,
          transaction_date: r.transaction_date || r.transDate || `${startDateStr}T00:00:00`,
          gross_sales: gross,
          val_disc: disc,
          net_sales: net,
          cost: Number(r.cost || net * 0.4),
          location: loc,
          salesman: r.salesman || r.salesPerson || '',
          customer: r.customer || r.customerName || '',
          main_category: r.main_category || r.category || 'Jewelry',
          collection: r.collection || 'General',
          qty: Number(r.qty || 1),
          created_at: new Date().toISOString(),
        });
      }
    });

    if (newSalesRows.length > 0) {
      await supabase.from('bvlgari_sales').insert(newSalesRows);
    }

    if (newCleanRows.length > 0) {
      await supabase.from('clean_master').insert(newCleanRows);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Sync completed successfully',
        inserted: newSalesRows.length,
        totalFetched: records.length,
        skipped: records.length - newSalesRows.length,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error executing sync ETL' },
      { status: 500, headers: corsHeaders }
    );
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { corsHeaders, handleOptions } from '@/lib/mobile-auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const store = searchParams.get('store') || '';
    const advisor = searchParams.get('advisor') || '';
    const monthStr = searchParams.get('month'); // 1-12
    const yearStr = searchParams.get('year');

    const now = new Date();
    const month = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1;
    const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();

    // Date ranges
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const startDate = `${year}-${pad(month)}-01T00:00:00`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59`;

    // Prev month date ranges for growth comparison
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = `${prevYear}-${pad(prevMonth)}-01T00:00:00`;
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
    const prevEndDate = `${prevYear}-${pad(prevMonth)}-${pad(prevLastDay)}T23:59:59`;

    // Year date range for 12-month chart
    const yearStartDate = `${year}-01-01T00:00:00`;
    const yearEndDate = `${year}-12-31T23:59:59`;

    // Build base queries for clean_master
    let queryCurrent = supabase
      .from('clean_master')
      .select('net_sales, qty, trans_no, main_category, salesman, location')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    let queryPrev = supabase
      .from('clean_master')
      .select('net_sales')
      .gte('transaction_date', prevStartDate)
      .lte('transaction_date', prevEndDate);

    let queryYear = supabase
      .from('clean_master')
      .select('transaction_date, net_sales, qty')
      .gte('transaction_date', yearStartDate)
      .lte('transaction_date', yearEndDate);

    // Filter by store if provided
    if (store && store.toLowerCase() !== 'all stores' && store.toLowerCase() !== 'all') {
      const locTerm = store.split(' ').pop() || store;
      queryCurrent = queryCurrent.ilike('location', `%${locTerm}%`);
      queryPrev = queryPrev.ilike('location', `%${locTerm}%`);
      queryYear = queryYear.ilike('location', `%${locTerm}%`);
    }

    // Filter by advisor ONLY if advisor is not a manager/supervisor role keyword
    const isGenericRole = !advisor || advisor.toLowerCase().includes('manager') || advisor.toLowerCase().includes('supervisor') || advisor.toLowerCase().includes('advisor');
    if (advisor && !isGenericRole) {
      queryCurrent = queryCurrent.ilike('salesman', `%${advisor}%`);
      queryPrev = queryPrev.ilike('salesman', `%${advisor}%`);
      queryYear = queryYear.ilike('salesman', `%${advisor}%`);
    }

    // Run queries in parallel
    const [
      { data: currentRows, error: currentErr },
      { data: prevRows },
      { data: yearRows },
      { data: targetRows },
      { data: trafficRows },
      { data: crmRows }
    ] = await Promise.all([
      queryCurrent,
      queryPrev,
      queryYear,
      // Target lookup
      supabase.from('targets').select('target_value, target_qty').ilike('store_name', `%${store || 'Plaza Indonesia'}%`).eq('month_number', month).eq('year', year),
      // Prospect / Traffic count
      supabase.from('mirror_traffic').select('status, id').gte('created_at', startDate).lte('created_at', endDate),
      // New CRM Profiles count
      supabase.from('crm_profiling').select('id').gte('created_at', startDate).lte('created_at', endDate)
    ]);

    if (currentErr) console.error('Current query error:', currentErr);

    // 1. MTD Aggregations
    let mtdNetSales = 0;
    let mtdQty = 0;
    const uniqueTrans = new Set<string>();
    const catMap: Record<string, { netSales: number; qty: number }> = {};

    (currentRows || []).forEach(row => {
      const ns = Number(row.net_sales) || 0;
      const q = Number(row.qty) || 0;
      mtdNetSales += ns;
      mtdQty += q;
      if (row.trans_no) uniqueTrans.add(row.trans_no);

      const cat = (row.main_category || 'Other').trim();
      if (!catMap[cat]) catMap[cat] = { netSales: 0, qty: 0 };
      catMap[cat].netSales += ns;
      catMap[cat].qty += q;
    });

    // 2. Target calculations
    let targetValue = 0;
    let targetQty = 0;
    (targetRows || []).forEach(t => {
      targetValue += Number(t.target_value) || 0;
      if ('target_qty' in t) targetQty += Number(t.target_qty) || 0;
    });

    // Default target fallback if database targets table is empty for the month
    if (targetValue === 0) {
      targetValue = 1500000000; // 1.5 M target default
      targetQty = 10;
    }

    const achievementPct = targetValue > 0 ? (mtdNetSales / targetValue) * 100 : 0;

    // 3. Growth vs Prev Month
    let prevNetSales = 0;
    (prevRows || []).forEach(r => { prevNetSales += Number(r.net_sales) || 0; });
    const growthVsPrevMonth = prevNetSales > 0 ? ((mtdNetSales - prevNetSales) / prevNetSales) * 100 : 0;

    // 4. Category breakdown array
    const categoryBreakdown = Object.keys(catMap).map(category => ({
      category,
      netSales: catMap[category].netSales,
      qty: catMap[category].qty,
    })).sort((a, b) => b.netSales - a.netSales);

    // 5. 12-Month Sales Trend
    const monthlyChart = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      netSales: 0,
      qty: 0,
    }));

    (yearRows || []).forEach(r => {
      if (r.transaction_date) {
        const d = new Date(r.transaction_date);
        const mIdx = d.getMonth();
        if (mIdx >= 0 && mIdx < 12) {
          monthlyChart[mIdx].netSales += Number(r.net_sales) || 0;
          monthlyChart[mIdx].qty += Number(r.qty) || 0;
        }
      }
    });

    // 6. Quick Stats
    let prospectCount = (trafficRows || []).length;
    let followUpCount = (trafficRows || []).filter(t => (t.status || '').toLowerCase().includes('follow')).length;
    let newProfileCount = (crmRows || []).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          mtd: {
            netSales: mtdNetSales,
            qty: mtdQty,
            targetValue,
            targetQty,
            achievementPct,
            transactionCount: uniqueTrans.size,
            growthVsPrevMonth,
          },
          categoryBreakdown,
          monthlyChart,
          quickStats: {
            prospectCount,
            followUpCount,
            newProfileCount,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching dashboard data' },
      { status: 500, headers: corsHeaders }
    );
  }
}

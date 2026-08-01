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
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');

    const now = new Date();
    const month = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1;
    const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const startDate = `${year}-${pad(month)}-01T00:00:00`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59`;

    const yearStartDate = `${year}-01-01T00:00:00`;
    const yearEndDate = `${year}-12-31T23:59:59`;

    // Fetch Traffic & CRM data
    let trafficQuery = supabase.from('mirror_traffic').select('*').gte('created_at', startDate).lte('created_at', endDate);
    let crmQuery = supabase.from('crm_profiling').select('id').gte('created_at', startDate).lte('created_at', endDate);
    let salesQuery = supabase.from('clean_master').select('trans_no, net_sales, transaction_date').gte('transaction_date', startDate).lte('transaction_date', endDate);
    let yearSalesQuery = supabase.from('clean_master').select('net_sales, transaction_date').gte('transaction_date', yearStartDate).lte('transaction_date', yearEndDate);

    if (store && store.toLowerCase() !== 'all stores' && store.toLowerCase() !== 'all') {
      trafficQuery = trafficQuery.ilike('location', `%${store}%`);
      salesQuery = salesQuery.ilike('location', `%${store}%`);
      yearSalesQuery = yearSalesQuery.ilike('location', `%${store}%`);
    }

    const [
      { data: trafficRows },
      { data: crmRows },
      { data: salesRows },
      { data: yearSalesRows }
    ] = await Promise.all([
      trafficQuery,
      crmQuery,
      salesQuery,
      yearSalesQuery
    ]);

    const trafficBreakdown = {
      walkIn: 0,
      followUp: 0,
      delivery: 0,
      service: 0,
      online: 0,
      total: 0,
    };

    (trafficRows || []).forEach(r => {
      trafficBreakdown.total += 1;
      const status = (r.status || '').toLowerCase();
      if (status.includes('walk')) trafficBreakdown.walkIn += 1;
      else if (status.includes('follow')) trafficBreakdown.followUp += 1;
      else if (status.includes('delivery')) trafficBreakdown.delivery += 1;
      else if (status.includes('service')) trafficBreakdown.service += 1;
      else if (status.includes('online')) trafficBreakdown.online += 1;
      else trafficBreakdown.walkIn += 1;
    });

    const uniqueSalesCount = new Set((salesRows || []).map(s => s.trans_no)).size;
    const conversionRate = trafficBreakdown.total > 0 ? (uniqueSalesCount / trafficBreakdown.total) * 100 : 0;

    // Annual Summary Calculation
    let ytdTotal = 0;
    const monthlyMap = new Array(12).fill(0);

    (yearSalesRows || []).forEach(r => {
      const ns = Number(r.net_sales) || 0;
      ytdTotal += ns;
      if (r.transaction_date) {
        const m = new Date(r.transaction_date).getMonth();
        if (m >= 0 && m < 12) monthlyMap[m] += ns;
      }
    });

    let bestMonthIdx = 0;
    let maxVal = 0;
    monthlyMap.forEach((val, idx) => {
      if (val > maxVal) {
        maxVal = val;
        bestMonthIdx = idx;
      }
    });

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return NextResponse.json(
      {
        success: true,
        data: {
          trafficBreakdown,
          newProfiles: (crmRows || []).length,
          conversionRate,
          annualSummary: {
            ytdTotal,
            bestMonth: {
              month: bestMonthIdx + 1,
              name: MONTH_NAMES[bestMonthIdx],
              netSales: maxVal,
            },
            avgMonthly: ytdTotal / (now.getMonth() + 1),
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching reports data' },
      { status: 500, headers: corsHeaders }
    );
  }
}

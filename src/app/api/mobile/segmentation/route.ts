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
    const segmentFilter = searchParams.get('segment') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    // Query view_customer_segmentation
    let query = supabase.from('view_customer_segmentation').select('*', { count: 'exact' });

    if (segmentFilter && segmentFilter.toLowerCase() !== 'all') {
      query = query.eq('segment', segmentFilter);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to).order('ltv', { ascending: false });

    // Fetch paginated customer list
    const { data: customers, count: totalCount, error: listErr } = await query;

    if (listErr) throw listErr;

    // KPI & Segment counts aggregation query
    const { data: allSegData } = await supabase
      .from('view_customer_segmentation')
      .select('name, segment, ltv, first_visit, recency_days');

    const segmentCounts: Record<string, number> = {
      Top: 0,
      Elite: 0,
      'High Potential': 0,
      Potential: 0,
      Prospect: 0,
      Inactive: 0,
    };

    let totalLtvSum = 0;
    let activeCustomerCount = 0;
    let topSpender = { name: '-', ltv: 0 };
    let newCustomerCount = 0;

    (allSegData || []).forEach(row => {
      const seg = row.segment || 'Prospect';
      if (segmentCounts[seg] !== undefined) {
        segmentCounts[seg] += 1;
      } else {
        segmentCounts[seg] = 1;
      }

      if (seg !== 'Inactive') {
        activeCustomerCount += 1;
        const ltv = Number(row.ltv) || 0;
        totalLtvSum += ltv;

        if (ltv > topSpender.ltv && !row.name?.toUpperCase().includes('GROUP')) {
          topSpender = { name: row.name, ltv };
        }

        // New customer in last 90 days
        if (row.recency_days !== null && Number(row.recency_days) <= 90) {
          newCustomerCount += 1;
        }
      }
    });

    const avgLtv = activeCustomerCount > 0 ? totalLtvSum / activeCustomerCount : 0;
    const newCustomerRatio = activeCustomerCount > 0 ? newCustomerCount / activeCustomerCount : 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          kpis: {
            activeCustomers: activeCustomerCount,
            avgLtv,
            topSpender,
            newCustomerRatio,
          },
          segmentCounts,
          customers: customers || [],
          pagination: {
            page,
            pageSize,
            totalCount: totalCount || 0,
            totalPages: Math.ceil((totalCount || 0) / pageSize),
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching customer segmentation' },
      { status: 500, headers: corsHeaders }
    );
  }
}

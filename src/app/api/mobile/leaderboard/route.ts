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

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = `${prevYear}-${pad(prevMonth)}-01T00:00:00`;
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
    const prevEndDate = `${prevYear}-${pad(prevMonth)}-${pad(prevLastDay)}T23:59:59`;

    // 1. Fetch current sales by salesman & location
    let currentQuery = supabase
      .from('clean_master')
      .select('salesman, location, net_sales, qty')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    let prevQuery = supabase
      .from('clean_master')
      .select('salesman, location, net_sales')
      .gte('transaction_date', prevStartDate)
      .lte('transaction_date', prevEndDate);

    if (store && store.toLowerCase() !== 'all stores' && store.toLowerCase() !== 'all') {
      currentQuery = currentQuery.ilike('location', `%${store}%`);
      prevQuery = prevQuery.ilike('location', `%${store}%`);
    }

    const [
      { data: currentRows, error: curErr },
      { data: prevRows },
      { data: advisorTargets },
      { data: storeTargets },
      { data: advisorList }
    ] = await Promise.all([
      currentQuery,
      prevQuery,
      supabase.from('advisor_targets').select('advisor_name, target_value').eq('month_number', month).eq('year', year),
      supabase.from('targets').select('store_name, target_value, target_qty').eq('month_number', month).eq('year', year),
      supabase.from('advisors').select('name, home_location, role')
    ]);

    if (curErr) throw curErr;

    // Leaderboard Aggregation per Salesman
    const salesMap: Record<string, { netSales: number; qty: number; location: string }> = {};
    (currentRows || []).forEach(r => {
      const sName = (r.salesman || 'Unassigned').trim();
      if (!salesMap[sName]) salesMap[sName] = { netSales: 0, qty: 0, location: r.location || '' };
      salesMap[sName].netSales += Number(r.net_sales) || 0;
      salesMap[sName].qty += Number(r.qty) || 0;
    });

    const prevMap: Record<string, number> = {};
    (prevRows || []).forEach(r => {
      const sName = (r.salesman || 'Unassigned').trim();
      prevMap[sName] = (prevMap[sName] || 0) + (Number(r.net_sales) || 0);
    });

    const targetMap: Record<string, number> = {};
    (advisorTargets || []).forEach(t => {
      if (t.advisor_name) targetMap[t.advisor_name.trim()] = Number(t.target_value) || 0;
    });

    const leaderboard = Object.keys(salesMap).map(salesman => {
      const netSales = salesMap[salesman].netSales;
      const qty = salesMap[salesman].qty;
      const prevSales = prevMap[salesman] || 0;
      const target = targetMap[salesman] || 0;

      const achievementPct = target > 0 ? (netSales / target) * 100 : 0;
      const growthPct = prevSales > 0 ? ((netSales - prevSales) / prevSales) * 100 : 0;

      return {
        advisor: salesman,
        location: salesMap[salesman].location,
        netSales,
        qty,
        target,
        achievementPct,
        growthPct,
      };
    }).sort((a, b) => b.netSales - a.netSales);

    // Store Comparison Aggregation
    const storesList = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];
    const storeSalesCurrent: Record<string, { netSales: number; qty: number }> = {};
    const storeSalesPrev: Record<string, number> = {};
    const storeTargetMap: Record<string, number> = {};

    storesList.forEach(s => {
      storeSalesCurrent[s] = { netSales: 0, qty: 0 };
      storeSalesPrev[s] = 0;
      storeTargetMap[s] = 0;
    });

    (currentRows || []).forEach(r => {
      const loc = (r.location || '').toLowerCase();
      storesList.forEach(s => {
        if (loc.includes(s.toLowerCase())) {
          storeSalesCurrent[s].netSales += Number(r.net_sales) || 0;
          storeSalesCurrent[s].qty += Number(r.qty) || 0;
        }
      });
    });

    (prevRows || []).forEach(r => {
      const loc = (r.location || '').toLowerCase();
      storesList.forEach(s => {
        if (loc.includes(s.toLowerCase())) {
          storeSalesPrev[s] += Number(r.net_sales) || 0;
        }
      });
    });

    (storeTargets || []).forEach(t => {
      const sName = (t.store_name || '').toLowerCase();
      storesList.forEach(s => {
        if (sName.includes(s.toLowerCase())) {
          storeTargetMap[s] += Number(t.target_value) || 0;
        }
      });
    });

    const storeComparison = storesList.map(s => {
      const curNet = storeSalesCurrent[s].netSales;
      const curQty = storeSalesCurrent[s].qty;
      const prevNet = storeSalesPrev[s];
      const target = storeTargetMap[s];

      return {
        store: s,
        netSales: curNet,
        qty: curQty,
        target,
        achievementPct: target > 0 ? (curNet / target) * 100 : 0,
        growthPct: prevNet > 0 ? ((curNet - prevNet) / prevNet) * 100 : 0,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          leaderboard,
          storeComparison,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching leaderboard' },
      { status: 500, headers: corsHeaders }
    );
  }
}

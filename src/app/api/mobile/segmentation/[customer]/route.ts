import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { corsHeaders, handleOptions } from '@/lib/mobile-auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request, props: { params: Promise<{ customer: string }> }) {
  try {
    const params = await props.params;
    const customerName = decodeURIComponent(params.customer);

    const [
      { data: segRecord },
      { data: txRows, error: txErr }
    ] = await Promise.all([
      supabase.from('view_customer_segmentation').select('*').eq('name', customerName).maybeSingle(),
      supabase
        .from('clean_master')
        .select('transaction_date, net_sales, qty, main_category, collection, trans_no, location')
        .eq('customer', customerName)
        .order('transaction_date', { ascending: false })
    ]);

    if (txErr) throw txErr;

    let totalSpend = 0;
    let totalQty = 0;
    const collectionMap: Record<string, { netSales: number; qty: number }> = {};

    (txRows || []).forEach(r => {
      const ns = Number(r.net_sales) || 0;
      const q = Number(r.qty) || 0;
      totalSpend += ns;
      totalQty += q;

      const col = (r.collection || r.main_category || 'Other').trim();
      if (!collectionMap[col]) collectionMap[col] = { netSales: 0, qty: 0 };
      collectionMap[col].netSales += ns;
      collectionMap[col].qty += q;
    });

    const topCollections = Object.keys(collectionMap).map(col => ({
      name: col,
      netSales: collectionMap[col].netSales,
      qty: collectionMap[col].qty,
    })).sort((a, b) => b.netSales - a.netSales);

    return NextResponse.json(
      {
        success: true,
        data: {
          profile: segRecord || { name: customerName },
          summary: {
            totalSpend,
            totalQty,
            transactionCount: (txRows || []).length,
            firstVisit: txRows && txRows.length > 0 ? txRows[txRows.length - 1].transaction_date : null,
            lastVisit: txRows && txRows.length > 0 ? txRows[0].transaction_date : null,
          },
          topCollections,
          transactions: txRows || [],
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching customer detail' },
      { status: 500, headers: corsHeaders }
    );
  }
}

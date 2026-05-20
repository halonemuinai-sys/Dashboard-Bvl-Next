import { NextRequest, NextResponse } from 'next/server';

// Config dari environment variables
const BVLGARI_API_BASE = process.env.BVLGARI_API_BASE || 'http://139.99.102.231:8089/demo';
const BVLGARI_API_TOKEN = process.env.BVLGARI_API_TOKEN || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Proxy endpoint untuk stock valuation (inventory).
 * Client memanggil: /api/sync-inventory?location=PI
 * Server meneruskan ke API Bvlgari dan mengembalikan hasilnya.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');

    if (!location) {
      return NextResponse.json(
        { error: 'Parameter location wajib diisi.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Panggil API Bvlgari dari server
    const apiUrl = `${BVLGARI_API_BASE}/stockvaluation?location=${encodeURIComponent(location)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        'Authorization': BVLGARI_API_TOKEN 
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `API Bvlgari error: HTTP ${response.status}`, detail: text },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: corsHeaders });

  } catch (err: any) {
    return NextResponse.json(
      { error: 'Gagal menghubungi API Bvlgari.', detail: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

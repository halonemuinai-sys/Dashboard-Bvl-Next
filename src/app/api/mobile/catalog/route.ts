import { NextResponse } from 'next/server';
import { corsHeaders, handleOptions } from '@/lib/mobile-auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get('keyword') || '';
    const category = searchParams.get('category') || '';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';

    const token = process.env.BVLGARI_API_TOKEN || 'Basic c0J2bGFnMjAyNjptcmFiMTJnMw==';
    const apiUrl = `http://139.99.102.231:8089/demo/catalogproduct2?keyword=${encodeURIComponent(keyword)}&category=${encodeURIComponent(category)}&page=${page}&limit=${limit}`;

    const apiRes = await fetch(apiUrl, {
      headers: {
        Authorization: token,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!apiRes.ok) {
      return NextResponse.json(
        { success: false, error: `Catalog API error: ${apiRes.status}` },
        { status: 502, headers: corsHeaders }
      );
    }

    const data = await apiRes.json();

    return NextResponse.json(
      { success: true, data },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch catalog' },
      { status: 500, headers: corsHeaders }
    );
  }
}

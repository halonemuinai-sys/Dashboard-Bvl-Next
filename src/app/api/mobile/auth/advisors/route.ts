import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { corsHeaders, handleOptions } from '@/lib/mobile-auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const store = searchParams.get('store');

    let query = supabase.from('advisor_pins').select('advisor_name, role, store');
    if (store && store.toLowerCase() !== 'all stores' && store.toLowerCase() !== 'all') {
      const locTerm = store.split(' ').pop() || store;
      query = query.ilike('store', `%${locTerm}%`);
    }
    const { data: pinsData } = await query;

    let advisors: string[] = [];

    if (pinsData && pinsData.length > 0) {
      advisors = pinsData.map((a: any) => a.advisor_name);
    } else {
      // Fallback query to advisors table
      let advQuery = supabase.from('advisors').select('name, home_location');
      if (store) {
        advQuery = advQuery.ilike('home_location', `%${store}%`);
      }
      const { data: advData } = await advQuery;
      if (advData && advData.length > 0) {
        advisors = advData.map((a: any) => a.name);
      }
    }

    // Default fallbacks if database table is empty or loading
    if (advisors.length === 0) {
      const allFallbacks = [
        { name: 'Supervisor PI', store: 'Plaza Indonesia' },
        { name: 'Store Manager PI', store: 'Plaza Indonesia' },
        { name: 'Advisor Plaza Indonesia 1', store: 'Plaza Indonesia' },
        { name: 'Advisor Plaza Indonesia 2', store: 'Plaza Indonesia' },
        { name: 'Store Manager PS', store: 'Plaza Senayan' },
        { name: 'Advisor Plaza Senayan 1', store: 'Plaza Senayan' },
        { name: 'Advisor Plaza Senayan 2', store: 'Plaza Senayan' },
        { name: 'Store Manager Bali', store: 'Bali' },
        { name: 'Advisor Bali 1', store: 'Bali' },
        { name: 'Advisor Bali 2', store: 'Bali' },
      ];

      if (store && store.toLowerCase() !== 'all stores' && store.toLowerCase() !== 'all') {
        const locTerm = store.split(' ').pop()?.toLowerCase() || store.toLowerCase();
        advisors = allFallbacks
          .filter(f => f.store.toLowerCase().includes(locTerm))
          .map(f => f.name);
      } else {
        advisors = allFallbacks.map(f => f.name);
      }
    }

    return NextResponse.json(
      { success: true, advisors: Array.from(new Set(advisors)) },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, advisors: ['Supervisor PI', 'Store Manager PI'] },
      { headers: corsHeaders }
    );
  }
}

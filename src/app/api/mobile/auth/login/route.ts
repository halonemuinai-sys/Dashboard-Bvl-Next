import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateSessionToken } from '@/utils/auth';
import { corsHeaders, handleOptions } from '@/lib/mobile-auth';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { advisorName, pin, store } = body;

    if (!advisorName || !pin) {
      return NextResponse.json(
        { success: false, error: 'Advisor name and PIN are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // SHA-256 Hash of PIN
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const pinHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check advisor_pins table
    const { data: pinRecord, error: pinErr } = await supabase
      .from('advisor_pins')
      .select('*')
      .eq('advisor_name', advisorName)
      .eq('pin_hash', pinHash)
      .maybeSingle();

    if (pinErr || !pinRecord) {
      return NextResponse.json(
        { success: false, error: 'PIN atau nama advisor salah' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get store and role from advisors table
    const { data: advRecord } = await supabase
      .from('advisors')
      .select('home_location, role')
      .eq('name', advisorName)
      .maybeSingle();

    const homeLocation = advRecord?.home_location || store || '';
    const role = advRecord?.role || pinRecord?.role || 'advisor';

    // Generate JWT/Session Token
    const token = await generateSessionToken(advisorName, role);

    return NextResponse.json(
      {
        success: true,
        token,
        advisor: {
          name: advisorName,
          role: role,
          store: homeLocation,
          homeLocation: homeLocation,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

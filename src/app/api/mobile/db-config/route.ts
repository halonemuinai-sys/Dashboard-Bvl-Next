import { NextResponse } from 'next/server';

// The mobile app reads its database address from here when it starts, so moving the database only needs a
// dashboard deploy (phones follow on their next start). Both values are already public in the web bundle.
export function GET() {
  return NextResponse.json(
    { url: process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

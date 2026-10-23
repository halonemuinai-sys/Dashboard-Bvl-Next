import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/utils/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { canManageMdr, validateMdrConfiguration } from '@/lib/mdr-config';

export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionToken(request.cookies.get('session_token')?.value || '');
    if (!session?.email) return NextResponse.json({ success: false, error: 'Sign in to manage MDR settings.' }, { status: 401 });
    const db = createAdminClient();
    const { data: user, error: userError } = await db.from('dashboard_users').select('role, is_active').eq('email', session.email.toLowerCase()).single();
    if (userError || !user?.is_active || !canManageMdr(user.role)) return NextResponse.json({ success: false, error: 'Finance or administrator access is required.' }, { status: 403 });
    const body = await request.json();
    if (!['save', 'reset'].includes(body.action)) return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
    if (body.action === 'save') {
      try { validateMdrConfiguration(body.config); }
      catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Invalid configuration.' }, { status: 400 }); }
    }
    const key = '__CONFIG_MDR_RULES__';
    const { data: current, error: readError } = await db.from('transaction_records_meta').select('updated_at').eq('trans_no', key).maybeSingle();
    if (readError) throw readError;
    if ((current?.updated_at || null) !== (body.expectedUpdatedAt || null)) return NextResponse.json({ success: false, error: 'Settings changed since you loaded them. Reload before saving.' }, { status: 409 });
    const updatedAt = new Date().toISOString();
    const updatedBy = session.email.toLowerCase();
    if (body.action === 'reset' && !current) return NextResponse.json({ success: true });
    const payload = { trans_no: key, other_remarks: JSON.stringify({ ...body.config, version: 2, updatedBy, updatedAt }), updated_by: updatedBy, updated_at: updatedAt };
    let mutation;
    if (current) {
      const query = body.action === 'reset' ? db.from('transaction_records_meta').delete() : db.from('transaction_records_meta').update(payload);
      const match = query.eq('trans_no', key);
      mutation = current.updated_at ? match.eq('updated_at', current.updated_at) : match.is('updated_at', null);
    } else mutation = db.from('transaction_records_meta').insert(payload);
    const { data: changed, error } = await mutation.select('trans_no');
    if (error?.code === '23505' || (!error && !changed?.length)) return NextResponse.json({ success: false, error: 'Another user changed these settings. Reload and try again.' }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ success: true, updatedAt, updatedBy });
  } catch (error) {
    console.error('MDR configuration request failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to save MDR settings. Please try again.' }, { status: 500 });
  }
}

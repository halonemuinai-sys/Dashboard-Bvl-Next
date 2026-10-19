import { NextRequest, NextResponse } from 'next/server';
import { generateDailySalesReportExcel } from '@/services/dailyReportExportService';
import { getSessionUser } from '@/lib/server-access';
import { hasMenuAccess } from '@/lib/access-policy';
import { monthBounds } from '@/lib/invoice-report-filters';
import { verifySessionToken } from '@/utils/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get('session_token')?.value || '');
  if (!session) return NextResponse.json({ error: 'Please sign in before exporting.' }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const month = Number(params.get('month'));
  const year = Number(params.get('year'));
  let store = params.get('store') || 'ALL';
  try {
    monthBounds(month, year);
    if (store.length > 150) throw new Error('Invalid report filters.');
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid report filters.' }, { status: 400 }); }
  try {
    const { db, user } = await getSessionUser();
    const { data: permissions, error } = await db.from('role_menu_access').select('menu_path,allowed').eq('role', user.role);
    if (error) throw new Error('Unable to verify report permissions.');
    if (!hasMenuAccess(user.role, (permissions || []).filter(row => row.allowed).map(row => row.menu_path), '/invoice-management')) return NextResponse.json({ error: 'You do not have access to Invoice Management.' }, { status: 403 });
    if (user.assigned_store && user.assigned_store !== 'ALL') {
      if (store !== 'ALL' && store !== user.assigned_store) return NextResponse.json({ error: 'You can only export your assigned store.' }, { status: 403 });
      store = user.assigned_store;
    }
    const { buffer, filename, totalRows, totalGross, totalNet } = await generateDailySalesReportExcel({ month, year, store }, db);
    return new NextResponse(new Uint8Array(buffer), { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store',
      'X-Total-Rows': String(totalRows), 'X-Total-Gross': String(totalGross), 'X-Total-Net': String(totalNet),
    } });
  } catch (error) {
    console.error('Daily Sales Report export failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'The report could not be generated. Please refresh the invoices and check the saved data or server configuration.' }, { status: 500 });
  }
}

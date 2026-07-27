import { NextResponse } from 'next/server';
import { reportService } from '@/services/reportService';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  return handleCronJob(request);
}

export async function POST(request: Request) {
  return handleCronJob(request);
}

async function handleCronJob(request: Request) {
  try {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const now = new Date();
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();

    console.log(`[CRON WEEKLY REPORT] Starting automatic email dispatch for ${month} ${year}...`);

    const stores = [
      { name: 'Plaza Indonesia', email: 'pi@mogems.co.id' },
      { name: 'Plaza Senayan', email: 'ps@mogems.co.id' },
      { name: 'Bali', email: 'bali@mogems.co.id' },
      { name: 'Semua Lokasi', email: 'aris@mraretail.co.id' },
    ];

    const results = [];
    for (const store of stores) {
      console.log(`[CRON WEEKLY REPORT] Sending report for ${store.name} to ${store.email}...`);
      const res = await reportService.sendMonthlyExcelReport(
        month,
        year,
        store.name,
        store.email,
        'aris@mraretail.co.id, jessica@mogems.co.id'
      );
      results.push({ store: store.name, email: store.email, result: res });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      period: `${month} ${year}`,
      results,
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[CRON WEEKLY REPORT ERROR]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Cron execution failed',
    }, { status: 500, headers: corsHeaders });
  }
}

import { NextResponse } from 'next/server';
import { syncService } from '@/services/syncService';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  return handleCronSync(request);
}

export async function POST(request: Request) {
  return handleCronSync(request);
}

async function handleCronSync(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    
    const month = searchParams.get('month') 
      ? parseInt(searchParams.get('month')!, 10) 
      : now.getMonth() + 1;
      
    const year = searchParams.get('year') 
      ? parseInt(searchParams.get('year')!, 10) 
      : now.getFullYear();

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const periodStr = `${monthNames[month - 1]} ${year}`;

    console.log(`[CRON SALES SYNC] Starting automatic sync for ${periodStr} at ${now.toISOString()}...`);

    const result = await syncService.syncSalesData(month, year);

    if (!result.success) {
      console.error('[CRON SALES SYNC FAILED]', result.error);
      return NextResponse.json({
        success: false,
        timestamp: new Date().toISOString(),
        period: periodStr,
        error: result.error || 'Sales Data sync failed',
      }, { status: 500, headers: corsHeaders });
    }

    console.log(`[CRON SALES SYNC SUCCESS] Raw Inserted: ${result.rawInserted}, Normalized: ${result.normalizedInserted}, Skipped: ${result.skippedDuplicates}`);

    return NextResponse.json({
      success: true,
      message: 'Sales Data sync completed automatically',
      timestamp: new Date().toISOString(),
      period: periodStr,
      rawInserted: result.rawInserted,
      normalizedInserted: result.normalizedInserted,
      skippedDuplicates: result.skippedDuplicates,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('[CRON SALES SYNC EXCEPTION]', error);
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message || 'Unhandled exception in Sales Data sync cron',
    }, { status: 500, headers: corsHeaders });
  }
}

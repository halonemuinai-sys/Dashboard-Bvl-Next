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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, year, emailTo, ccEmail, location, format } = body;

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: 'month and year are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (format === 'excel') {
      const result = await reportService.sendMonthlyExcelReport(
        month,
        parseInt(year),
        location || 'ALL',
        emailTo,
        ccEmail
      );
      return NextResponse.json(result, { headers: corsHeaders });
    }

    const result = await reportService.sendAdvisorReport(month, parseInt(year), emailTo);
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error sending report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send report' },
      { status: 500, headers: corsHeaders }
    );
  }
}

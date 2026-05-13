import { NextResponse } from 'next/server';
import { reportService } from '@/services/reportService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, year, emailTo } = body;

    if (!month || !year) {
      return NextResponse.json({ success: false, error: 'month and year are required' }, { status: 400 });
    }

    const result = await reportService.sendAdvisorReport(month, parseInt(year), emailTo);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error sending advisor report:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to send report' }, { status: 500 });
  }
}

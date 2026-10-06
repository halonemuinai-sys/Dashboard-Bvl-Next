import { NextResponse } from 'next/server';
import { reportService } from '@/services/reportService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const date = body.date; // e.g., "2026-05-03"
    
    if (!date) {
      return NextResponse.json({ success: false, error: "Date parameter is required" }, { status: 400 });
    }

    const { action, emailTo, ccEmail, pdfBase64, excelBase64, pdfFilename, excelFilename } = body;

    if (action === 'preview') {
      const preview = await reportService.getDailyReportHtml(date, {
        pdfBase64,
        excelBase64,
        pdfFilename,
        excelFilename,
      });
      return NextResponse.json({
        success: true,
        ...preview,
      });
    }

    const result = await reportService.sendDailyReport(date, {
      emailTo,
      ccEmail,
      pdfBase64,
      excelBase64,
      pdfFilename,
      excelFilename,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error sending daily report:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to send report",
    }, { status: 500 });
  }
}

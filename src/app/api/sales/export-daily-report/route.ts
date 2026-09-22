import { NextRequest, NextResponse } from 'next/server';
import { generateDailySalesReportExcel } from '@/services/dailyReportExportService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const store = searchParams.get('store') || 'Plaza Indonesia';

    const now = new Date();
    const month = monthParam ? parseInt(monthParam, 10) : (now.getMonth() + 1);
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

    const { buffer, filename, totalRows, totalGross, totalNet } = await generateDailySalesReportExcel({
      month,
      year,
      store,
    });

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'X-Total-Rows': String(totalRows),
        'X-Total-Gross': String(totalGross),
        'X-Total-Net': String(totalNet),
      },
    });
  } catch (error: any) {
    console.error('Error generating Daily Sales Report Excel:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal membuat file Daily Sales Report',
      },
      { status: 500 }
    );
  }
}

'use server'

import { sendWhatsAppMessage } from "@/services/whatsappService";

/**
 * Server action to test WhatsApp sending.
 */
export async function testWhatsAppAction(phoneNumber: string) {
  // Nomor HP tujuan harus dalam format internasional tanpa tanda +, contoh: 628123456789
  const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
  
  console.log(`Sending test WhatsApp to: ${formattedPhone}`);
  
  const result = await sendWhatsAppMessage(formattedPhone, "hello_world");
  
  return result;
}

/**
 * Server action untuk mengirim laporan sales harian.
 */
export async function sendDailyReportAction(phoneNumber: string) {
  const { reportingService } = await import("@/services/reportingService");
  const { sendWhatsAppText } = await import("@/services/whatsappService");

  try {
    const reportData = await reportingService.getTodaySalesSummary();
    
    if (!reportData.success) {
      return reportData;
    }

    const message = reportingService.formatSalesMessage(reportData);
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
    
    const result = await sendWhatsAppText(formattedPhone, message);
    return result;
  } catch (error) {
    console.error("Failed to send daily report:", error);
    return { success: false, error: "Terjadi kesalahan sistem saat mengambil data." };
  }
}

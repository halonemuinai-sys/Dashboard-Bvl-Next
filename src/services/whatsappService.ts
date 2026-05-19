
/**
 * Service to handle WhatsApp Business API interactions via Meta Cloud API.
 */
export async function sendWhatsAppMessage(to: string, templateName: string = "hello_world") {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error("WhatsApp credentials missing in environment variables.");
    return { error: "Configuration missing" };
  }

  // Gunakan v20.0 sesuai dashboard terbaru Meta
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to, // Nomor harus diawali kode negara tanpa tanda +, contoh: 62812345678
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("WhatsApp API Error:", data);
      return { error: data };
    }

    console.log("WhatsApp Message Sent Successfully:", data.messages[0].id);
    return { success: true, data };
  } catch (error) {
    console.error("Network error calling WhatsApp API:", error);
    return { error: "Network error" };
  }
}

/**
 * Mengirim pesan teks bebas (bukan template).
 * Hanya bisa jika sudah ada percakapan aktif dari user dalam 24 jam terakhir.
 */
export async function sendWhatsAppText(to: string, text: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return { error: "Configuration missing" };
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: text },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("WhatsApp Text API Error:", data);
      return { error: data };
    }

    console.log("WhatsApp Text Sent Successfully:", data.messages[0].id);
    return { success: true, data };
  } catch (error) {
    console.error("Network error:", error);
    return { error: "Network error" };
  }
}

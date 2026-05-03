import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  try {
    // 1. Create Transporter menggunakan kredensial dari .env.local
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true, // true untuk port 465 (SSL)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 2. Setup Email Content
    const mailOptions = {
      from: `"Bvlgari Dashboard" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Kirim ke diri sendiri untuk test
      subject: "Test Koneksi Email Dashboard - Turbify",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #c5a059;">Koneksi Berhasil!</h2>
          <p>Halo Pak Aris,</p>
          <p>Jika Anda menerima email ini, berarti setup SMTP <b>Turbify</b> pada Dashboard Next.js sudah berhasil terhubung.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Dikirim secara otomatis dari Dashboard BI Bvlgari - Vercel Environment.</p>
        </div>
      `,
    };

    // 3. Kirim Email
    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: "Email test berhasil terkirim!",
      messageId: info.messageId,
    });

  } catch (error: any) {
    console.error("SMTP Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Gagal mengirim email",
    }, { status: 500 });
  }
}

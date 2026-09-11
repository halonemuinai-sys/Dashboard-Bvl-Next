import nodemailer from 'nodemailer';

export const emailService = {
  getTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.bizmail.yahoo.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const user = process.env.SMTP_USER || 'aris@mraretail.co.id';
    const pass = process.env.SMTP_PASS || '';

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  },

  async sendPasswordResetEmail({
    toEmail,
    fullName,
    resetLink,
  }: {
    toEmail: string;
    fullName: string;
    resetLink: string;
  }) {
    const transporter = this.getTransporter();
    const sender = process.env.SMTP_USER || 'aris@mraretail.co.id';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - Bvlgari Intelligence</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="560" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" border="0" cellspacing="0" cellpadding="0">
                
                <!-- HEADER -->
                <tr>
                  <td style="background-color: #0b0f19; padding: 36px 40px; text-align: center;">
                    <div style="display: inline-block; padding: 10px; background: rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 12px;">
                      <span style="font-size: 24px; color: #f59e0b;">◆</span>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
                      MRA Retail
                    </h1>
                    <p style="margin: 4px 0 0; color: #3b82f6; font-size: 11px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase;">
                      Bvlgari Intelligence
                    </p>
                  </td>
                </tr>

                <!-- ACCENT BAR -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #3b82f6, #f59e0b, #3b82f6);"></td>
                </tr>

                <!-- BODY -->
                <tr>
                  <td style="padding: 40px 40px 32px;">
                    <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 800;">
                      Permintaan Reset Password
                    </h2>
                    <p style="margin: 0 0 16px; color: #475569; font-size: 14px; line-height: 1.6;">
                      Halo <strong>${fullName || 'Pengguna'}</strong>,
                    </p>
                    <p style="margin: 0 0 28px; color: #475569; font-size: 14px; line-height: 1.6;">
                      Kami menerima permintaan untuk mereset password akun Dashboard Bvlgari Anda (${toEmail}). Klik tombol di bawah ini untuk membuat password baru:
                    </p>

                    <!-- CTA BUTTON -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 32px;">
                      <tr>
                        <td align="center">
                          <a href="${resetLink}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(37,99,235,0.35);">
                            Reset Password Saya →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- EXPIRATION & SECURITY NOTICE -->
                    <div style="background-color: #f1f5f9; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;">
                      <p style="margin: 0; color: #475569; font-size: 12px; line-height: 1.5;">
                        <strong style="color: #0f172a;">Perhatian:</strong> Tautan ini hanya berlaku selama <strong>60 menit</strong> dan hanya dapat digunakan <strong>1 kali</strong>.
                      </p>
                    </div>

                    <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                      Jika Anda tidak pernah meminta reset password, Anda dapat mengabaikan email ini dengan aman. Password lama Anda tetap aktif dan tidak berubah.
                    </p>
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center;">
                    <p style="margin: 0 0 4px; color: #94a3b8; font-size: 11px;">
                      Email otomatis ini dikirim secara aman oleh <strong>Dashboard Bvlgari Intelligence</strong>.
                    </p>
                    <p style="margin: 0; color: #cbd5e1; font-size: 10px;">
                      &copy; 2026 MRA Retail • Authorized Personnel Only
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await transporter.sendMail({
      from: `"Bvlgari Intelligence" <${sender}>`,
      to: toEmail,
      subject: "Permintaan Reset Password - Bvlgari Intelligence",
      html: htmlContent,
    });
  },
};

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

interface BrevoEmailPayload {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly configured: boolean;
  private readonly senderName: string;
  private readonly senderEmail: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('BREVO_API_KEY', '');
    this.senderName = this.config.get<string>('SENDER_NAME', 'Movia');
    this.senderEmail = this.config.get<string>('SENDER_EMAIL', 'noreply@movia.bf');
    this.configured = !!this.apiKey && this.apiKey !== 'your_brevo_api_key';

    if (!this.configured) {
      this.logger.warn('Brevo not configured — emails will be logged to console only');
    }
  }

  async sendOtpEmail(to: string, otp: string, name: string): Promise<void> {
    const subject = 'Votre code de vérification Movia';
    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#C0392B">Movia — Code de vérification</h2>
        <p>Bonjour ${name},</p>
        <p>Votre code de vérification est :</p>
        <div style="background:#FEF2F2;border:2px solid #FECACA;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
          <span style="font-size:36px;font-weight:800;color:#C0392B;letter-spacing:8px">${otp}</span>
        </div>
        <p style="color:#6B7280;font-size:13px">Ce code expire dans 5 minutes. Ne le partagez pas.</p>
        <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
        <p style="color:#9CA3AF;font-size:12px">Movia — Transport Burkina Faso</p>
      </div>
    `;

    this.logger.log(`[OTP] ${to} → ${otp}`);

    if (!this.configured) {
      this.logger.log(`[EMAIL SKIPPED — no Brevo key] To: ${to} | Subject: ${subject}`);
      return;
    }

    await this.sendViaBrevo({ to: [{ email: to, name }], subject, htmlContent });
  }

  async sendEmailVerification(to: string, otp: string, name: string): Promise<void> {
    const subject = 'Vérifiez votre adresse email — Movia';
    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#C0392B">Confirmez votre email</h2>
        <p>Bonjour ${name},</p>
        <p>Pour valider votre adresse email, saisissez ce code dans l'application :</p>
        <div style="background:#FEF2F2;border:2px solid #FECACA;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
          <span style="font-size:36px;font-weight:800;color:#C0392B;letter-spacing:8px">${otp}</span>
        </div>
        <p style="color:#6B7280;font-size:13px">Ce code expire dans 10 minutes.</p>
      </div>
    `;

    this.logger.log(`[EMAIL VERIFY OTP] ${to} → ${otp}`);

    if (!this.configured) {
      this.logger.log(`[EMAIL SKIPPED] To: ${to} | Subject: ${subject}`);
      return;
    }

    await this.sendViaBrevo({ to: [{ email: to, name }], subject, htmlContent });
  }

  private sendViaBrevo(payload: BrevoEmailPayload): Promise<void> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        sender: { name: this.senderName, email: this.senderEmail },
        ...payload,
      });

      const options = {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            this.logger.error(`Brevo error ${res.statusCode}: ${data}`);
            resolve();
          }
        });
      });

      req.on('error', (err) => {
        this.logger.error('Brevo request failed', err.message);
        resolve();
      });

      req.write(body);
      req.end();
    });
  }
}

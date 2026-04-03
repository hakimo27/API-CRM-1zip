import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

@Injectable()
export class NotificationsService {
  private transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

  constructor(private configService: ConfigService) {
    const host = this.configService.get("SMTP_HOST");
    const user = this.configService.get("SMTP_USER");

    if (host && user) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.configService.get("SMTP_PORT") || "587"),
        secure: this.configService.get("SMTP_SECURE") === "true",
        auth: {
          user,
          pass: this.configService.get("SMTP_PASS"),
        },
      });
    } else {
      console.warn("SMTP not configured - emails will be logged only");
    }
  }

  private getFromEmail() {
    const name = this.configService.get("EMAIL_FROM_NAME") || "КаякРент";
    const email = this.configService.get("EMAIL_FROM") || "noreply@kayakrent.ru";
    return `"${name}" <${email}>`;
  }

  private getSiteUrl() {
    return this.configService.get("SITE_URL") || "https://kayakrent.ru";
  }

  async sendEmailVerification(email: string, name: string, token: string) {
    const url = `${this.getSiteUrl()}/verify-email?token=${token}`;
    const subject = "Подтверждение email — КаякРент";
    const html = `
      <h2>Добро пожаловать, ${name}!</h2>
      <p>Для подтверждения email нажмите на кнопку:</p>
      <a href="${url}" style="padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;display:inline-block">
        Подтвердить email
      </a>
      <p>Ссылка действительна 24 часа.</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  async sendPasswordReset(email: string, name: string, token: string) {
    const url = `${this.getSiteUrl()}/reset-password?token=${token}`;
    const subject = "Сброс пароля — КаякРент";
    const html = `
      <h2>Сброс пароля</h2>
      <p>Здравствуйте, ${name}!</p>
      <p>Для сброса пароля нажмите на кнопку:</p>
      <a href="${url}" style="padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;display:inline-block">
        Сбросить пароль
      </a>
      <p>Ссылка действительна 1 час. Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  async sendOrderConfirmation(email: string, name: string, orderNumber: string) {
    const subject = `Заказ ${orderNumber} подтверждён — КаякРент`;
    const html = `
      <h2>Заказ подтверждён!</h2>
      <p>Здравствуйте, ${name}!</p>
      <p>Ваш заказ <strong>${orderNumber}</strong> принят и подтверждён.</p>
      <p>Мы свяжемся с вами для уточнения деталей.</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  async sendOrderStatusUpdate(email: string, name: string, orderNumber: string, status: string) {
    const statusMap: Record<string, string> = {
      confirmed: "Подтверждён",
      paid: "Оплачен",
      in_progress: "В процессе",
      completed: "Завершён",
      cancelled: "Отменён",
    };
    const subject = `Статус заказа ${orderNumber} изменён — КаякРент`;
    const html = `
      <h2>Статус заказа изменён</h2>
      <p>Здравствуйте, ${name}!</p>
      <p>Статус вашего заказа <strong>${orderNumber}</strong> изменён на: <strong>${statusMap[status] || status}</strong>.</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.getFromEmail(),
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
    }
  }
}

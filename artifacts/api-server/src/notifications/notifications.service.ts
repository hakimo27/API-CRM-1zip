import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

  constructor(private configService: ConfigService) {
    const host = this.configService.get("SMTP_HOST");
    const user = this.configService.get("SMTP_USER");

    if (host && user) {
      const port = parseInt(this.configService.get("SMTP_PORT") || "587");
      const secure = this.configService.get("SMTP_SECURE") === "true" || port === 465;

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass: this.configService.get("SMTP_PASS"),
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.transporter.verify((err) => {
        if (err) {
          this.logger.warn(`SMTP connection failed: ${err.message} — emails will be logged only`);
          this.transporter = null;
        } else {
          this.logger.log(`SMTP connected: ${host}:${port} (secure=${secure}) as ${user}`);
        }
      });
    } else {
      this.logger.warn("SMTP_HOST or SMTP_USER not configured — emails will be logged only");
    }
  }

  private getFrom(): string {
    const name = this.configService.get("EMAIL_FROM_NAME") || "КаякРент";
    const email =
      this.configService.get("SMTP_FROM") ||
      this.configService.get("EMAIL_FROM") ||
      "noreply@kayakrent.ru";
    return `"${name}" <${email}>`;
  }

  private getSiteUrl(): string {
    return (
      this.configService.get("APP_URL") ||
      this.configService.get("SITE_URL") ||
      "https://kayakrent.ru"
    );
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
    const url = `${this.getSiteUrl()}/orders/${orderNumber}`;
    const subject = `Заказ ${orderNumber} принят — КаякРент`;
    const html = `
      <h2>Заказ принят!</h2>
      <p>Здравствуйте, ${name}!</p>
      <p>Ваш заказ <strong>${orderNumber}</strong> успешно принят.</p>
      <p>Мы свяжемся с вами в ближайшее время для уточнения деталей.</p>
      <p><a href="${url}" style="color:#2563eb">Посмотреть заказ</a></p>
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

  async sendNewOrderNotificationToManager(
    managerEmail: string,
    orderNumber: string,
    customerName: string,
    customerPhone: string,
    totalAmount: string,
    orderType: "rental" | "sale" = "rental"
  ) {
    const typeLabel = orderType === "sale" ? "продажа" : "аренда";
    const adminUrl = `${this.getSiteUrl()}/crm/orders/${orderNumber}`;
    const subject = `Новый заказ ${orderNumber} (${typeLabel}) — КаякРент`;
    const html = `
      <h2>Новый заказ!</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:6px;font-weight:bold">Номер заказа</td><td style="padding:6px">${orderNumber}</td></tr>
        <tr><td style="padding:6px;font-weight:bold">Тип</td><td style="padding:6px">${typeLabel}</td></tr>
        <tr><td style="padding:6px;font-weight:bold">Клиент</td><td style="padding:6px">${customerName}</td></tr>
        <tr><td style="padding:6px;font-weight:bold">Телефон</td><td style="padding:6px">${customerPhone}</td></tr>
        <tr><td style="padding:6px;font-weight:bold">Сумма</td><td style="padding:6px">${totalAmount} ₽</td></tr>
      </table>
      <p style="margin-top:16px">
        <a href="${adminUrl}" style="padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;display:inline-block">
          Открыть в CRM
        </a>
      </p>
    `;
    await this.sendEmail(managerEmail, subject, html);
  }

  async sendTestEmail(toEmail: string): Promise<{ success: boolean; message: string }> {
    if (!this.transporter) {
      return { success: false, message: "SMTP не настроен. Проверьте SMTP_HOST, SMTP_USER, SMTP_PASS в .env" };
    }
    try {
      await this.transporter.sendMail({
        from: this.getFrom(),
        to: toEmail,
        subject: "Тестовое письмо — КаякРент",
        html: `
          <h2>Тест SMTP</h2>
          <p>Это тестовое письмо от КаякРент.</p>
          <p>Если вы получили его, настройки SMTP работают корректно.</p>
          <p>Время отправки: ${new Date().toLocaleString("ru-RU")}</p>
        `,
      });
      return { success: true, message: `Письмо отправлено на ${toEmail}` };
    } catch (error: any) {
      this.logger.error(`Test email failed: ${error.message}`, error.stack);
      return { success: false, message: `Ошибка отправки: ${error.message}` };
    }
  }

  private async sendEmail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.log(`[EMAIL SKIPPED] To: ${to} | Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.getFrom(),
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
    }
  }
}

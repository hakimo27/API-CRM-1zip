import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import { SettingsService } from "../settings/settings.service.js";

type Transporter = ReturnType<typeof nodemailer.createTransport>;

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // Lazy transporter cache — rebuilt from settings on first use and every 60 s
  private cachedTransporter: Transporter | null = null;
  private cacheBuiltAt = 0;
  private readonly CACHE_TTL_MS = 60_000;

  constructor(
    private configService: ConfigService,
    @Optional() private settingsService: SettingsService,
  ) {}

  // ─── Read SMTP config: env vars first, then DB settings ──────────────────

  private async readSmtpConfig(): Promise<SmtpConfig | null> {
    // Priority 1 — environment variables
    const envHost = this.configService.get<string>("SMTP_HOST");
    const envUser = this.configService.get<string>("SMTP_USER");
    if (envHost && envUser) {
      const port = parseInt(this.configService.get<string>("SMTP_PORT") || "587");
      return {
        host: envHost,
        port,
        secure: this.configService.get<string>("SMTP_SECURE") === "true" || port === 465,
        user: envUser,
        pass: this.configService.get<string>("SMTP_PASS") || "",
        from: this.configService.get<string>("SMTP_FROM") ||
              this.configService.get<string>("EMAIL_FROM") ||
              envUser,
      };
    }

    // Priority 2 — database settings (configured via admin panel)
    if (!this.settingsService) return null;
    try {
      const [host, portRaw, user, pass, fromEmail] = await Promise.all([
        this.settingsService.get("notifications.email_host"),
        this.settingsService.get("notifications.email_port"),
        this.settingsService.get("notifications.email_user"),
        this.settingsService.get("notifications.email_password"),
        this.settingsService.get("notifications.email_from"),
      ]);
      const hostStr = typeof host === "string" ? host.replace(/^"|"$/g, "").trim() : String(host || "").trim();
      const userStr = typeof user === "string" ? user.replace(/^"|"$/g, "").trim() : String(user || "").trim();
      if (!hostStr || !userStr) return null;

      const passStr = typeof pass === "string" ? pass.replace(/^"|"$/g, "").trim() : String(pass || "").trim();
      const fromStr = typeof fromEmail === "string" ? fromEmail.replace(/^"|"$/g, "").trim() : "";
      const port = parseInt(String(portRaw || "587")) || 587;
      return {
        host: hostStr,
        port,
        secure: port === 465,
        user: userStr,
        pass: passStr,
        from: fromStr || userStr,
      };
    } catch (err: any) {
      this.logger.warn(`Failed to read SMTP settings from DB: ${err.message}`);
      return null;
    }
  }

  private createTransport(cfg: SmtpConfig): Transporter {
    return nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
      tls: { rejectUnauthorized: false },
    });
  }

  // ─── Lazy transporter (cached 60 s) ──────────────────────────────────────

  private async getTransporter(): Promise<Transporter | null> {
    const now = Date.now();
    if (this.cachedTransporter && now - this.cacheBuiltAt < this.CACHE_TTL_MS) {
      return this.cachedTransporter;
    }

    const cfg = await this.readSmtpConfig();
    if (!cfg) {
      this.logger.warn("SMTP not configured (no env vars or DB settings) — emails will be skipped");
      this.cachedTransporter = null;
      this.cacheBuiltAt = now;
      return null;
    }

    const transport = this.createTransport(cfg);
    // Verify connection before caching
    try {
      await new Promise<void>((resolve, reject) => {
        transport.verify((err) => (err ? reject(err) : resolve()));
      });
      this.logger.log(`SMTP ready: ${cfg.host}:${cfg.port} (secure=${cfg.secure}) as ${cfg.user}`);
      this.cachedTransporter = transport;
      this.cacheBuiltAt = now;
      return transport;
    } catch (err: any) {
      this.logger.error(`SMTP connection failed: ${err.message}`);
      this.cachedTransporter = null;
      this.cacheBuiltAt = now; // cache the failure to avoid hammering the server
      return null;
    }
  }

  // Force refresh transporter cache (call this after settings change)
  invalidateTransporterCache() {
    this.cachedTransporter = null;
    this.cacheBuiltAt = 0;
  }

  // ─── Sender helpers ───────────────────────────────────────────────────────

  private async getFrom(): Promise<string> {
    const name = this.configService.get<string>("EMAIL_FROM_NAME") || "КаякРент";
    let email = this.configService.get<string>("SMTP_FROM") || this.configService.get<string>("EMAIL_FROM") || "";
    if (!email && this.settingsService) {
      const raw = await this.settingsService.get("notifications.email_from").catch(() => null);
      email = typeof raw === "string" ? raw.replace(/^"|"$/g, "").trim() : "";
    }
    return `"${name}" <${email || "noreply@kayakrent.ru"}>`;
  }

  private getSiteUrl(): string {
    return (
      this.configService.get<string>("APP_URL") ||
      this.configService.get<string>("SITE_URL") ||
      "https://kayakrent.ru"
    );
  }

  async getManagerEmail(): Promise<string | null> {
    const fromEnv = this.configService.get<string>("MANAGER_EMAIL");
    if (fromEnv) return fromEnv;
    if (!this.settingsService) return null;
    try {
      const raw = await this.settingsService.get("notifications.manager_email");
      const val = typeof raw === "string" ? raw.replace(/^"|"$/g, "").trim() : "";
      return val || null;
    } catch {
      return null;
    }
  }

  // ─── Public send methods ──────────────────────────────────────────────────

  async sendEmailVerification(email: string, name: string, token: string) {
    const url = `${this.getSiteUrl()}/verify-email?token=${token}`;
    await this.sendEmail(email, "Подтверждение email — КаякРент", `
      <h2>Добро пожаловать, ${name}!</h2>
      <p>Для подтверждения email нажмите на кнопку:</p>
      <a href="${url}" style="padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;display:inline-block">Подтвердить email</a>
      <p>Ссылка действительна 24 часа.</p>
    `);
  }

  async sendPasswordReset(email: string, name: string, token: string) {
    const url = `${this.getSiteUrl()}/reset-password?token=${token}`;
    await this.sendEmail(email, "Сброс пароля — КаякРент", `
      <h2>Сброс пароля</h2>
      <p>Здравствуйте, ${name}!</p>
      <p>Для сброса пароля нажмите на кнопку:</p>
      <a href="${url}" style="padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;display:inline-block">Сбросить пароль</a>
      <p>Ссылка действительна 1 час. Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
    `);
  }

  async sendOrderConfirmation(email: string, name: string, orderNumber: string) {
    const url = `${this.getSiteUrl()}/orders/${orderNumber}`;
    await this.sendEmail(email, `Заказ ${orderNumber} принят — КаякРент`, `
      <h2>Заказ принят!</h2>
      <p>Здравствуйте, ${name}!</p>
      <p>Ваш заказ <strong>${orderNumber}</strong> успешно принят.</p>
      <p>Мы свяжемся с вами в ближайшее время для уточнения деталей.</p>
      <p><a href="${url}" style="color:#2563eb">Посмотреть заказ</a></p>
    `);
  }

  async sendOrderStatusUpdate(email: string, name: string, orderNumber: string, status: string) {
    const statusMap: Record<string, string> = {
      confirmed: "Подтверждён", paid: "Оплачен", in_progress: "В процессе",
      completed: "Завершён", cancelled: "Отменён",
    };
    await this.sendEmail(email, `Статус заказа ${orderNumber} изменён — КаякРент`, `
      <h2>Статус заказа изменён</h2>
      <p>Здравствуйте, ${name}!</p>
      <p>Статус вашего заказа <strong>${orderNumber}</strong> изменён на: <strong>${statusMap[status] || status}</strong>.</p>
    `);
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
    await this.sendEmail(managerEmail, `Новый заказ ${orderNumber} (${typeLabel}) — КаякРент`, `
      <h2>Новый заказ!</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:6px;font-weight:bold">Номер заказа</td><td style="padding:6px">${orderNumber}</td></tr>
        <tr><td style="padding:6px;font-weight:bold">Тип</td><td style="padding:6px">${typeLabel}</td></tr>
        <tr><td style="padding:6px;font-weight:bold">Клиент</td><td style="padding:6px">${customerName}</td></tr>
        <tr><td style="padding:6px;font-weight:bold">Телефон</td><td style="padding:6px">${customerPhone}</td></tr>
        <tr><td style="padding:6px;font-weight:bold">Сумма</td><td style="padding:6px">${totalAmount} ₽</td></tr>
      </table>
      <p style="margin-top:16px">
        <a href="${adminUrl}" style="padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;display:inline-block">Открыть в CRM</a>
      </p>
    `);
  }

  async sendTestEmail(toEmail: string): Promise<{ success: boolean; message: string; config?: string }> {
    const cfg = await this.readSmtpConfig();
    if (!cfg) {
      return {
        success: false,
        message: "SMTP не настроен. Укажите хост/логин/пароль в Настройках → Уведомления → SMTP.",
      };
    }

    const transport = await this.getTransporter();
    if (!transport) {
      return {
        success: false,
        message: `Не удалось подключиться к SMTP: ${cfg.host}:${cfg.port}. Проверьте хост, порт и пароль.`,
        config: `${cfg.host}:${cfg.port} secure=${cfg.secure} user=${cfg.user}`,
      };
    }

    try {
      const from = await this.getFrom();
      await transport.sendMail({
        from,
        to: toEmail,
        subject: "Тестовое письмо — КаякРент",
        html: `
          <h2>Тест SMTP ✓</h2>
          <p>Это тестовое письмо от КаякРент.</p>
          <p>Если вы получили его, настройки SMTP работают корректно.</p>
          <hr/>
          <p style="color:#666;font-size:12px">Конфигурация: ${cfg.host}:${cfg.port} (secure=${cfg.secure}) | From: ${cfg.from}</p>
          <p style="color:#666;font-size:12px">Время отправки: ${new Date().toLocaleString("ru-RU")}</p>
        `,
      });
      return { success: true, message: `Письмо успешно отправлено на ${toEmail}`, config: `${cfg.host}:${cfg.port}` };
    } catch (error: any) {
      this.logger.error(`Test email failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Ошибка отправки: ${error.message}`,
        config: `${cfg.host}:${cfg.port} secure=${cfg.secure} user=${cfg.user}`,
      };
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const transport = await this.getTransporter();
    if (!transport) {
      this.logger.warn(`[EMAIL SKIPPED — SMTP not configured] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      const from = await this.getFrom();
      await transport.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent → ${to} | ${subject}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
    }
  }
}

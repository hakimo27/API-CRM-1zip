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

  private async getCompanyName(): Promise<string> {
    const fallback = this.configService.get<string>("COMPANY_NAME") || "Байдабаза";
    if (!this.settingsService) return fallback;
    try {
      const raw = await this.settingsService.get("general.company_name").catch(() => null);
      return (typeof raw === "string" ? raw.replace(/^"|"$/g, "").trim() : "") || fallback;
    } catch {
      return fallback;
    }
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

  // ─── HTML template helper ─────────────────────────────────────────────────

  private async buildHtml(opts: {
    title: string;
    preheader?: string;
    body: string;
    cta?: { label: string; url: string };
  }): Promise<string> {
    const company = await this.getCompanyName();
    const ctaHtml = opts.cta
      ? `<div style="text-align:center;margin:28px 0">
           <a href="${opts.cta.url}" style="display:inline-block;padding:14px 32px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">${opts.cta.label}</a>
         </div>`
      : "";
    return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${opts.title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
${opts.preheader ? `<div style="display:none;font-size:1px;color:#f1f5f9;max-height:0;overflow:hidden">${opts.preheader}</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
      <!-- header -->
      <tr><td style="background:#1d4ed8;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px">${company}</p>
      </td></tr>
      <!-- body -->
      <tr><td style="padding:32px 32px 24px">
        ${opts.body}
        ${ctaHtml}
      </td></tr>
      <!-- footer -->
      <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0">
        <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">© ${new Date().getFullYear()} ${company}. Это автоматическое сообщение — не отвечайте на него.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
  }

  private infoRow(label: string, value: string): string {
    return `<tr>
      <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#374151;background:#f8fafc;border-bottom:1px solid #e5e7eb;white-space:nowrap">${label}</td>
      <td style="padding:8px 12px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb">${value}</td>
    </tr>`;
  }

  private infoTable(rows: [string, string][]): string {
    return `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:20px 0">
      ${rows.map(([l, v]) => this.infoRow(l, v)).join("")}
    </table>`;
  }

  // ─── Email senders ────────────────────────────────────────────────────────

  async sendEmailVerification(email: string, name: string, token: string) {
    const url = `${this.getSiteUrl()}/verify-email?token=${token}`;
    const company = await this.getCompanyName();
    const html = await this.buildHtml({
      title: "Подтверждение email",
      preheader: `Добро пожаловать, ${name}! Подтвердите ваш email.`,
      body: `<h2 style="margin:0 0 16px;font-size:22px;color:#111827">Добро пожаловать, ${name}!</h2>
             <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">Благодарим за регистрацию в ${company}. Для завершения регистрации подтвердите ваш email.</p>
             <p style="color:#6b7280;font-size:13px;margin:20px 0 0">Ссылка действительна 24 часа.</p>`,
      cta: { label: "Подтвердить email", url },
    });
    await this.sendEmail(email, `Подтверждение email — ${company}`, html);
  }

  async sendPasswordReset(email: string, name: string, token: string) {
    const url = `${this.getSiteUrl()}/reset-password?token=${token}`;
    const company = await this.getCompanyName();
    const html = await this.buildHtml({
      title: "Сброс пароля",
      preheader: "Запрос на сброс пароля",
      body: `<h2 style="margin:0 0 16px;font-size:22px;color:#111827">Сброс пароля</h2>
             <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">Здравствуйте, ${name}! Мы получили запрос на сброс пароля для вашего аккаунта.</p>
             <p style="color:#6b7280;font-size:13px;margin:20px 0 0">Ссылка действительна 1 час. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.</p>`,
      cta: { label: "Сбросить пароль", url },
    });
    await this.sendEmail(email, `Сброс пароля — ${company}`, html);
  }

  async sendOrderConfirmation(email: string, name: string, orderNumber: string) {
    const company = await this.getCompanyName();
    const html = await this.buildHtml({
      title: `Заказ ${orderNumber} принят`,
      preheader: `Ваш заказ ${orderNumber} успешно оформлен`,
      body: `<h2 style="margin:0 0 8px;font-size:22px;color:#111827">Заказ принят!</h2>
             <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">Здравствуйте, ${name}! Ваш заказ на аренду успешно оформлен.</p>
             ${this.infoTable([["Номер заказа", orderNumber], ["Статус", "Принят"]])}
             <p style="color:#374151;font-size:14px;line-height:1.6">Мы свяжемся с вами в ближайшее время для уточнения деталей.</p>`,
    });
    await this.sendEmail(email, `Заказ ${orderNumber} принят — ${company}`, html);
  }

  async sendSaleOrderConfirmation(email: string, name: string, orderNumber: string) {
    const company = await this.getCompanyName();
    const html = await this.buildHtml({
      title: `Заказ ${orderNumber} оформлен`,
      preheader: `Ваш заказ в магазине ${company} успешно оформлен`,
      body: `<h2 style="margin:0 0 8px;font-size:22px;color:#111827">Заказ оформлен!</h2>
             <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">Здравствуйте, ${name}! Ваш заказ в магазине успешно принят.</p>
             ${this.infoTable([["Номер заказа", orderNumber], ["Статус", "В обработке"]])}
             <p style="color:#374151;font-size:14px;line-height:1.6">Мы свяжемся с вами для подтверждения и уточнения деталей доставки.</p>`,
    });
    await this.sendEmail(email, `Заказ ${orderNumber} оформлен — ${company}`, html);
  }

  async sendOrderStatusUpdate(email: string, name: string, orderNumber: string, status: string) {
    const statusMap: Record<string, string> = {
      confirmed: "Подтверждён", paid: "Оплачен", in_progress: "В процессе",
      completed: "Завершён", cancelled: "Отменён",
    };
    const company = await this.getCompanyName();
    const statusLabel = statusMap[status] || status;
    const html = await this.buildHtml({
      title: `Статус заказа ${orderNumber} изменён`,
      preheader: `Статус вашего заказа ${orderNumber}: ${statusLabel}`,
      body: `<h2 style="margin:0 0 8px;font-size:22px;color:#111827">Статус заказа изменён</h2>
             <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">Здравствуйте, ${name}!</p>
             ${this.infoTable([["Номер заказа", orderNumber], ["Новый статус", `<strong>${statusLabel}</strong>`]])}`,
    });
    await this.sendEmail(email, `Статус заказа ${orderNumber} — ${company}`, html);
  }

  async sendTourBookingConfirmation(
    email: string, name: string, tourTitle: string, participants: number, totalAmount: string
  ) {
    const company = await this.getCompanyName();
    const html = await this.buildHtml({
      title: "Бронирование тура подтверждено",
      preheader: `Ваше бронирование тура «${tourTitle}» принято`,
      body: `<h2 style="margin:0 0 8px;font-size:22px;color:#111827">Бронирование принято!</h2>
             <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">Здравствуйте, ${name}! Ваше бронирование успешно оформлено.</p>
             ${this.infoTable([
               ["Тур", tourTitle],
               ["Участников", String(participants)],
               ["Сумма", `${Number(totalAmount).toLocaleString("ru")} ₽`],
               ["Статус", "Ожидает подтверждения"],
             ])}
             <p style="color:#374151;font-size:14px;line-height:1.6">Наш менеджер свяжется с вами в ближайшее время для подтверждения бронирования и уточнения деталей.</p>`,
    });
    await this.sendEmail(email, `Бронирование тура «${tourTitle}» — ${company}`, html);
  }

  async sendNewOrderNotificationToManager(
    managerEmail: string,
    orderNumber: string,
    customerName: string,
    customerPhone: string,
    totalAmount: string,
    orderType: "rental" | "sale" = "rental"
  ) {
    const typeLabel = orderType === "sale" ? "Магазин" : "Аренда";
    const company = await this.getCompanyName();
    const adminUrl = `${this.getSiteUrl()}/crm`;
    const html = await this.buildHtml({
      title: `Новый заказ ${orderNumber}`,
      preheader: `Новый заказ ${orderType === "sale" ? "магазина" : "аренды"} ${orderNumber}`,
      body: `<h2 style="margin:0 0 16px;font-size:22px;color:#111827">Новый заказ ${typeLabel}</h2>
             ${this.infoTable([
               ["Номер заказа", orderNumber],
               ["Тип", typeLabel],
               ["Клиент", customerName],
               ["Телефон", customerPhone],
               ["Сумма", `${Number(totalAmount).toLocaleString("ru")} ₽`],
             ])}`,
      cta: { label: "Открыть в CRM", url: adminUrl },
    });
    await this.sendEmail(managerEmail, `[${company}] Новый заказ ${orderNumber} (${typeLabel})`, html);
  }

  async sendTourBookingNotificationToManager(
    managerEmail: string,
    bookingId: number,
    tourTitle: string,
    contactName: string,
    contactPhone: string,
    participants: number,
    totalAmount: string
  ) {
    const company = await this.getCompanyName();
    const adminUrl = `${this.getSiteUrl()}/crm/tours`;
    const html = await this.buildHtml({
      title: "Новое бронирование тура",
      preheader: `Новое бронирование: «${tourTitle}»`,
      body: `<h2 style="margin:0 0 16px;font-size:22px;color:#111827">Новое бронирование тура</h2>
             ${this.infoTable([
               ["Тур", tourTitle],
               ["Бронирование №", String(bookingId)],
               ["Клиент", contactName],
               ["Телефон", contactPhone],
               ["Участников", String(participants)],
               ["Сумма", `${Number(totalAmount).toLocaleString("ru")} ₽`],
             ])}`,
      cta: { label: "Открыть в CRM", url: adminUrl },
    });
    await this.sendEmail(managerEmail, `[${company}] Новое бронирование тура «${tourTitle}»`, html);
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

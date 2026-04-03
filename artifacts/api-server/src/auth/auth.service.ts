import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { eq, and, gt } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import {
  usersTable,
  refreshTokensTable,
  settingsTable,
} from "@workspace/db";
import type { RegisterDto, LoginDto } from "./dto/auth.dto.js";
import type { JwtPayload } from "@workspace/shared";
import { NotificationsService } from "../notifications/notifications.service.js";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_TOKEN) private db: DrizzleDb,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, dto.email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException("Пользователь с таким email уже существует");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const [user] = await this.db
      .insert(usersTable)
      .values({
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: "customer",
      })
      .returning();

    if (!user) throw new BadRequestException("Ошибка создания пользователя");

    const verificationToken = await this.generateVerificationToken(user.id);

    try {
      await this.notificationsService.sendEmailVerification(
        user.email,
        user.firstName,
        verificationToken
      );
    } catch {
      console.warn("Failed to send verification email");
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role as string);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, dto.email.toLowerCase()))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException("Неверный email или пароль");
    }

    if (!user.active) {
      throw new UnauthorizedException("Аккаунт заблокирован");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Неверный email или пароль");
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role as string, userAgent, ipAddress);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(refreshToken: string, userAgent?: string, ipAddress?: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get("JWT_REFRESH_SECRET") || "dev-refresh-secret",
      });
    } catch {
      throw new UnauthorizedException("Недействительный токен обновления");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Неверный тип токена");
    }

    const tokenHash = await this.hashToken(refreshToken);
    const now = new Date();

    const [storedToken] = await this.db
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.tokenHash, tokenHash),
          eq(refreshTokensTable.userId, payload.sub),
          gt(refreshTokensTable.expiresAt, now)
        )
      )
      .limit(1);

    if (!storedToken || storedToken.revokedAt) {
      throw new UnauthorizedException("Токен отозван или истёк");
    }

    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub))
      .limit(1);

    if (!user || !user.active) {
      throw new UnauthorizedException("Пользователь не найден или заблокирован");
    }

    await this.db
      .update(refreshTokensTable)
      .set({ revokedAt: now })
      .where(eq(refreshTokensTable.id, storedToken.id));

    const tokens = await this.generateTokens(user.id, user.email, user.role as string, userAgent, ipAddress);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async logout(refreshToken: string) {
    try {
      const tokenHash = await this.hashToken(refreshToken);
      await this.db
        .update(refreshTokensTable)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokensTable.tokenHash, tokenHash));
    } catch {
      // ignore errors on logout
    }
    return { message: "Выход выполнен" };
  }

  async verifyEmail(token: string) {
    let payload: { sub: number; type: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get("JWT_SECRET") || "dev-secret-change-in-prod",
      });
    } catch {
      throw new BadRequestException("Недействительная или устаревшая ссылка подтверждения");
    }

    if (payload.type !== "email_verify") {
      throw new BadRequestException("Неверный тип токена");
    }

    await this.db
      .update(usersTable)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(usersTable.id, payload.sub));

    return { message: "Email успешно подтверждён" };
  }

  async forgotPassword(email: string) {
    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return { message: "Если аккаунт существует, инструкции отправлены на email" };
    }

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, type: "password_reset" },
      {
        secret: this.configService.get("JWT_SECRET") || "dev-secret-change-in-prod",
        expiresIn: "1h",
      }
    );

    try {
      await this.notificationsService.sendPasswordReset(user.email, user.firstName, resetToken);
    } catch {
      console.warn("Failed to send password reset email");
    }

    return { message: "Если аккаунт существует, инструкции отправлены на email" };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: { sub: number; type: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get("JWT_SECRET") || "dev-secret-change-in-prod",
      });
    } catch {
      throw new BadRequestException("Недействительная или устаревшая ссылка");
    }

    if (payload.type !== "password_reset") {
      throw new BadRequestException("Неверный тип токена");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, payload.sub));

    await this.db
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.userId, payload.sub));

    return { message: "Пароль успешно изменён" };
  }

  private async generateTokens(
    userId: number,
    email: string,
    role: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    const accessPayload: JwtPayload = { sub: userId, email, role: role as any, type: "access" };
    const refreshPayload: JwtPayload = { sub: userId, email, role: role as any, type: "refresh" };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get("JWT_SECRET") || "dev-secret-change-in-prod",
        expiresIn: this.configService.get("JWT_ACCESS_EXPIRES") || "15m",
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get("JWT_REFRESH_SECRET") || "dev-refresh-secret",
        expiresIn: this.configService.get("JWT_REFRESH_EXPIRES") || "7d",
      }),
    ]);

    const tokenHash = await this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.db.insert(refreshTokensTable).values({
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    });

    return { accessToken, refreshToken };
  }

  private async generateVerificationToken(userId: number): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, type: "email_verify" },
      {
        secret: this.configService.get("JWT_SECRET") || "dev-secret-change-in-prod",
        expiresIn: "24h",
      }
    );
  }

  private async hashToken(token: string): Promise<string> {
    const { createHash } = await import("node:crypto");
    return createHash("sha256").update(token).digest("hex");
  }

  private sanitizeUser(user: typeof usersTable.$inferSelect) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}

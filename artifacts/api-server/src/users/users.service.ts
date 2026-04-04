import { Injectable, NotFoundException, Inject, ForbiddenException, ConflictException } from "@nestjs/common";
import { eq, desc, like, or, sql } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { usersTable } from "@workspace/db";
import * as bcrypt from "bcryptjs";

type DrizzleDb = typeof import("@workspace/db").db;

const SAFE_FIELDS = {
  id: usersTable.id,
  email: usersTable.email,
  firstName: usersTable.firstName,
  lastName: usersTable.lastName,
  phone: usersTable.phone,
  role: usersTable.role,
  active: usersTable.active,
  avatar: usersTable.avatar,
  telegramChatId: usersTable.telegramChatId,
  notes: usersTable.notes,
  emailVerifiedAt: usersTable.emailVerifiedAt,
  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
};

@Injectable()
export class UsersService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async findAll(params: { role?: string; search?: string; page?: number; limit?: number }) {
    const { role, search, page = 1, limit = 100 } = params;
    const offset = (page - 1) * limit;

    let query = this.db
      .select(SAFE_FIELDS)
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .$dynamic();

    const conditions = [];
    if (role) conditions.push(eq(usersTable.role, role as any));
    if (search) {
      conditions.push(
        or(
          like(usersTable.firstName, `%${search}%`),
          like(usersTable.email, `%${search}%`),
          like(usersTable.phone || sql`''`, `%${search}%`)
        )
      );
    }

    return query.limit(limit).offset(offset);
  }

  async findById(id: number) {
    const [user] = await this.db
      .select(SAFE_FIELDS)
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (!user) throw new NotFoundException("Пользователь не найден");
    return user;
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    role?: string;
    notes?: string;
  }) {
    const existing = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, data.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException("Пользователь с таким email уже существует");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const [user] = await this.db
      .insert(usersTable)
      .values({
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: (data.role as any) || "manager",
        notes: data.notes,
        emailVerifiedAt: new Date(),
        active: true,
      })
      .returning(SAFE_FIELDS);

    return user;
  }

  async update(id: number, data: Partial<typeof usersTable.$inferInsert>) {
    const { passwordHash, ...safeData } = data as any;

    const [updated] = await this.db
      .update(usersTable)
      .set({ ...safeData, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning(SAFE_FIELDS);

    if (!updated) throw new NotFoundException("Пользователь не найден");
    return updated;
  }

  async toggleActive(id: number) {
    const [user] = await this.db
      .select({ id: usersTable.id, active: usersTable.active })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (!user) throw new NotFoundException("Пользователь не найден");
    return this.update(id, { active: !user.active });
  }

  async adminResetPassword(id: number, newPassword: string) {
    const user = await this.findById(id);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id));
    return { message: `Пароль пользователя ${user.email} успешно сброшен` };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException("Пользователь не найден");

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new ForbiddenException("Неверный текущий пароль");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId));
    return { message: "Пароль успешно изменён" };
  }

  async setActive(id: number, active: boolean) {
    return this.update(id, { active });
  }

  async delete(id: number) {
    const [deleted] = await this.db
      .delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id });

    if (!deleted) throw new NotFoundException("Пользователь не найден");
    return { message: "Пользователь удалён" };
  }
}

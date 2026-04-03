import { Injectable, NotFoundException, Inject, ForbiddenException } from "@nestjs/common";
import { eq, desc, like, or, sql } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { usersTable } from "@workspace/db";
import * as bcrypt from "bcryptjs";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class UsersService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async findAll(params: { role?: string; search?: string; page?: number; limit?: number }) {
    const { role, search, page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    let query = this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        phone: usersTable.phone,
        role: usersTable.role,
        active: usersTable.active,
        emailVerifiedAt: usersTable.emailVerifiedAt,
        createdAt: usersTable.createdAt,
      })
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

    const results = await query.limit(limit).offset(offset);
    return results;
  }

  async findById(id: number) {
    const [user] = await this.db
      .select({
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
      })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (!user) throw new NotFoundException("Пользователь не найден");
    return user;
  }

  async update(id: number, data: Partial<typeof usersTable.$inferInsert>) {
    const { passwordHash, ...safeData } = data as any;

    const [updated] = await this.db
      .update(usersTable)
      .set(safeData)
      .where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        role: usersTable.role,
        active: usersTable.active,
      });

    if (!updated) throw new NotFoundException("Пользователь не найден");
    return updated;
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

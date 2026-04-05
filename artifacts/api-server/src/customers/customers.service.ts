import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { customersTable, ordersTable, chatSessionsTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class CustomersService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async findAll(params: { search?: string; channel?: string; page?: number; limit?: number }) {
    const { search, channel, page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    let customers = await this.db
      .select()
      .from(customersTable)
      .orderBy(desc(customersTable.createdAt))
      .limit(limit)
      .offset(offset);

    if (channel) customers = customers.filter((c) => c.communicationChannel === channel);
    if (search) {
      const s = search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          (c.phone || "").includes(s) ||
          (c.email || "").toLowerCase().includes(s)
      );
    }

    return customers;
  }

  async findById(id: number) {
    const [customer] = await this.db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .limit(1);

    if (!customer) throw new NotFoundException("Клиент не найден");

    const [orders, chatSessions] = await Promise.all([
      this.db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.customerId, id))
        .orderBy(desc(ordersTable.createdAt))
        .limit(20),
      this.db
        .select()
        .from(chatSessionsTable)
        .where(eq(chatSessionsTable.customerId, id))
        .orderBy(desc(chatSessionsTable.createdAt))
        .limit(10),
    ]);

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const activeOrders = orders.filter(o => !["cancelled", "completed", "refunded"].includes(o.status)).length;

    return { ...customer, orders, chatSessions, stats: { totalOrders, totalRevenue, activeOrders } };
  }

  async findByPhone(phone: string) {
    const [customer] = await this.db
      .select()
      .from(customersTable)
      .where(eq(customersTable.phone, phone))
      .limit(1);
    return customer || null;
  }

  async create(data: typeof customersTable.$inferInsert) {
    const [created] = await this.db.insert(customersTable).values(data).returning();
    return created;
  }

  async update(id: number, data: Partial<typeof customersTable.$inferInsert>) {
    const [updated] = await this.db
      .update(customersTable)
      .set(data)
      .where(eq(customersTable.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Клиент не найден");
    return updated;
  }

  async delete(id: number) {
    const [deleted] = await this.db
      .delete(customersTable)
      .where(eq(customersTable.id, id))
      .returning({ id: customersTable.id });
    if (!deleted) throw new NotFoundException("Клиент не найден");
    return { message: "Клиент удалён" };
  }

  async getStats() {
    const all = await this.db.select({ channel: customersTable.communicationChannel }).from(customersTable);
    const stats = {
      total: all.length,
      byChannel: {} as Record<string, number>,
    };
    for (const c of all) {
      const ch = c.channel || "unknown";
      stats.byChannel[ch] = (stats.byChannel[ch] || 0) + 1;
    }
    return stats;
  }
}

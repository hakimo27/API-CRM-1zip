import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { eq, desc, count, inArray, or } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import {
  customersTable,
  ordersTable,
  chatSessionsTable,
  chatMessagesTable,
  saleOrdersTable,
  tourBookingsTable,
  usersTable,
  reviewsTable,
  feedbackReportsTable,
} from "@workspace/db";

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
          (c.lastName || "").toLowerCase().includes(s) ||
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

    // Rental orders and chat sessions linked directly by customerId
    const [orders, chatSessions, reviews] = await Promise.all([
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
        .orderBy(desc(chatSessionsTable.lastMessageAt), desc(chatSessionsTable.createdAt))
        .limit(20),
      this.db
        .select()
        .from(reviewsTable)
        .where(eq(reviewsTable.customerId, id))
        .orderBy(desc(reviewsTable.createdAt))
        .limit(20),
    ]);

    // Enrich chat sessions with message counts
    let enrichedChatSessions = chatSessions;
    if (chatSessions.length > 0) {
      const sessionIds = chatSessions.map((s) => s.id);
      const msgCounts = await this.db
        .select({ sessionId: chatMessagesTable.sessionId, count: count() })
        .from(chatMessagesTable)
        .where(inArray(chatMessagesTable.sessionId, sessionIds))
        .groupBy(chatMessagesTable.sessionId);
      const countMap: Record<number, number> = {};
      for (const row of msgCounts) countMap[row.sessionId] = Number(row.count);
      enrichedChatSessions = chatSessions.map((s) => ({ ...s, messageCount: countMap[s.id] || 0 }));
    }

    // Feedback reports matched by phone or email
    let feedbackReports: any[] = [];
    if (customer.phone || customer.email) {
      const allFeedback = await this.db
        .select()
        .from(feedbackReportsTable)
        .orderBy(desc(feedbackReportsTable.createdAt))
        .limit(100);
      feedbackReports = allFeedback.filter((f) => {
        const contact = (f.contact || "").toLowerCase();
        return (
          (customer.phone && contact.includes(customer.phone.replace(/\D/g, "").slice(-7))) ||
          (customer.email && contact.includes(customer.email.toLowerCase()))
        );
      });
    }

    // Sale orders and tour bookings: link via email → user lookup
    let saleOrders: any[] = [];
    let tourBookings: any[] = [];

    if (customer.email) {
      const [linkedUser] = await this.db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, customer.email))
        .limit(1);

      if (linkedUser) {
        [saleOrders, tourBookings] = await Promise.all([
          this.db
            .select()
            .from(saleOrdersTable)
            .where(eq(saleOrdersTable.userId, linkedUser.id))
            .orderBy(desc(saleOrdersTable.createdAt))
            .limit(20),
          this.db
            .select()
            .from(tourBookingsTable)
            .where(eq(tourBookingsTable.userId, linkedUser.id))
            .orderBy(desc(tourBookingsTable.createdAt))
            .limit(20),
        ]);
      }
    }

    // Tour bookings: also match directly by phone (contactPhone field)
    if (tourBookings.length === 0 && customer.phone) {
      tourBookings = await this.db
        .select()
        .from(tourBookingsTable)
        .where(eq(tourBookingsTable.contactPhone, customer.phone))
        .orderBy(desc(tourBookingsTable.createdAt))
        .limit(20);
    }

    const totalOrders =
      orders.length + saleOrders.length + tourBookings.length;
    const totalRevenue =
      orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0) +
      saleOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const activeOrders = orders.filter(
      (o) => !["cancelled", "completed", "refunded"].includes(o.status)
    ).length;

    return {
      ...customer,
      orders,
      saleOrders,
      tourBookings,
      reviews,
      feedbackReports,
      chatSessions: enrichedChatSessions,
      stats: { totalOrders, totalRevenue, activeOrders },
    };
  }

  async findByPhone(phone: string) {
    const [customer] = await this.db
      .select()
      .from(customersTable)
      .where(eq(customersTable.phone, phone))
      .limit(1);
    return customer || null;
  }

  async findByEmail(email: string) {
    const [customer] = await this.db
      .select()
      .from(customersTable)
      .where(eq(customersTable.email, email))
      .limit(1);
    return customer || null;
  }

  async findOrCreate(data: { name?: string; phone?: string; email?: string; notes?: string }) {
    if (data.phone) {
      const byPhone = await this.findByPhone(data.phone);
      if (byPhone) return { customer: byPhone, created: false };
    }
    if (data.email) {
      const byEmail = await this.findByEmail(data.email);
      if (byEmail) return { customer: byEmail, created: false };
    }
    const created = await this.create({
      name: data.name || data.email || data.phone || "Новый клиент",
      phone: data.phone || "",
      email: data.email,
      notes: data.notes,
      communicationChannel: "web",
    });
    return { customer: created, created: true };
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

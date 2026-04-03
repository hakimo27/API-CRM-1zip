import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { eq, asc } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { branchesTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class BranchesService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async findAll() {
    return this.db.select().from(branchesTable).where(eq(branchesTable.active, true)).orderBy(asc(branchesTable.sortOrder));
  }

  async findAllAdmin() {
    return this.db.select().from(branchesTable).orderBy(asc(branchesTable.sortOrder));
  }

  async findById(id: number) {
    const [branch] = await this.db.select().from(branchesTable).where(eq(branchesTable.id, id)).limit(1);
    if (!branch) throw new NotFoundException("Пункт проката не найден");
    return branch;
  }

  async create(data: typeof branchesTable.$inferInsert) {
    const [created] = await this.db.insert(branchesTable).values(data).returning();
    return created;
  }

  async update(id: number, data: Partial<typeof branchesTable.$inferInsert>) {
    const [updated] = await this.db.update(branchesTable).set(data).where(eq(branchesTable.id, id)).returning();
    if (!updated) throw new NotFoundException("Пункт проката не найден");
    return updated;
  }

  async delete(id: number) {
    const [deleted] = await this.db.delete(branchesTable).where(eq(branchesTable.id, id)).returning({ id: branchesTable.id });
    if (!deleted) throw new NotFoundException("Пункт проката не найден");
    return { message: "Пункт проката удалён" };
  }
}

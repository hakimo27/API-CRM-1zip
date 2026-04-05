import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, asc } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { specTemplatesTable, tariffTemplatesTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class TemplatesService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  getSpecTemplates() {
    return this.db.select().from(specTemplatesTable).orderBy(asc(specTemplatesTable.name));
  }

  async createSpecTemplate(name: string, specs: any[]) {
    const [row] = await this.db.insert(specTemplatesTable).values({ name, specs }).returning();
    return row;
  }

  async updateSpecTemplate(id: number, data: { name?: string; specs?: any[] }) {
    const [row] = await this.db.update(specTemplatesTable).set({ ...data, updatedAt: new Date() })
      .where(eq(specTemplatesTable.id, id)).returning();
    if (!row) throw new NotFoundException("Шаблон не найден");
    return row;
  }

  async deleteSpecTemplate(id: number) {
    const [row] = await this.db.delete(specTemplatesTable).where(eq(specTemplatesTable.id, id)).returning({ id: specTemplatesTable.id });
    if (!row) throw new NotFoundException("Шаблон не найден");
    return { message: "Удалён" };
  }

  getTariffTemplates() {
    return this.db.select().from(tariffTemplatesTable).orderBy(asc(tariffTemplatesTable.name));
  }

  async createTariffTemplate(name: string, tariffs: any[]) {
    const [row] = await this.db.insert(tariffTemplatesTable).values({ name, tariffs }).returning();
    return row;
  }

  async updateTariffTemplate(id: number, data: { name?: string; tariffs?: any[] }) {
    const [row] = await this.db.update(tariffTemplatesTable).set({ ...data, updatedAt: new Date() })
      .where(eq(tariffTemplatesTable.id, id)).returning();
    if (!row) throw new NotFoundException("Шаблон не найден");
    return row;
  }

  async deleteTariffTemplate(id: number) {
    const [row] = await this.db.delete(tariffTemplatesTable).where(eq(tariffTemplatesTable.id, id)).returning({ id: tariffTemplatesTable.id });
    if (!row) throw new NotFoundException("Шаблон не найден");
    return { message: "Удалён" };
  }
}

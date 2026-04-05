import { Injectable, NotFoundException, Inject, BadRequestException } from "@nestjs/common";
import { eq, and, asc, desc, gte, like, or, sql } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { toursTable, tourDatesTable, tourBookingsTable, usersTable } from "@workspace/db";

type DrizzleDb = typeof import("@workspace/db").db;

@Injectable()
export class ToursService {
  constructor(@Inject(DB_TOKEN) private db: DrizzleDb) {}

  async findAll(params: { type?: string; active?: boolean; featured?: boolean }) {
    const { type, active = true, featured } = params;
    let tours = await this.db
      .select()
      .from(toursTable)
      .where(active ? eq(toursTable.active, true) : undefined)
      .orderBy(asc(toursTable.sortOrder));

    if (type) tours = tours.filter((t) => t.type === type);
    if (featured !== undefined) tours = tours.filter((t) => t.featured === featured);

    return tours;
  }

  async findAllAdmin(params: { type?: string; active?: string; search?: string }) {
    const { type, active, search } = params;
    let tours = await this.db
      .select()
      .from(toursTable)
      .orderBy(asc(toursTable.sortOrder), desc(toursTable.createdAt));

    if (type) tours = tours.filter((t) => t.type === type);
    if (active === "true") tours = tours.filter((t) => t.active === true);
    if (active === "false") tours = tours.filter((t) => t.active === false);
    if (search) {
      const q = search.toLowerCase();
      tours = tours.filter((t) => t.title.toLowerCase().includes(q));
    }

    return tours;
  }

  async findBySlug(slug: string) {
    const [tour] = await this.db.select().from(toursTable).where(eq(toursTable.slug, slug)).limit(1);
    if (!tour) throw new NotFoundException("Тур не найден");

    const now = new Date();
    const allDates = await this.db
      .select()
      .from(tourDatesTable)
      .where(and(eq(tourDatesTable.tourId, tour.id), eq(tourDatesTable.status, "planned")))
      .orderBy(asc(tourDatesTable.startDate))
      .limit(20);

    const upcomingDates = allDates.filter(d => {
      try { return d.startDate && new Date(d.startDate) >= now; } catch { return false; }
    }).slice(0, 10);

    return { ...tour, upcomingDates };
  }

  async getTourDates(tourId: number) {
    const now = new Date();
    const all = await this.db
      .select()
      .from(tourDatesTable)
      .where(eq(tourDatesTable.tourId, tourId))
      .orderBy(asc(tourDatesTable.startDate));

    return all.filter(d => {
      try { return d.startDate && new Date(d.startDate) >= now; } catch { return false; }
    });
  }

  async getAllDates(params: { tourId?: number; status?: string; from?: string }) {
    const { tourId, status, from } = params;
    let dates = await this.db
      .select({
        date: tourDatesTable,
        tour: { id: toursTable.id, title: toursTable.title, slug: toursTable.slug },
        instructor: {
          id: usersTable.id,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
        },
      })
      .from(tourDatesTable)
      .leftJoin(toursTable, eq(tourDatesTable.tourId, toursTable.id))
      .leftJoin(usersTable, eq(tourDatesTable.instructorId, usersTable.id))
      .orderBy(asc(tourDatesTable.startDate));

    if (tourId) dates = dates.filter((d) => d.date.tourId === tourId);
    if (status) dates = dates.filter((d) => d.date.status === status);
    if (from) dates = dates.filter((d) => d.date.startDate >= new Date(from));

    return dates.map(({ date, tour, instructor }) => ({ ...date, tour, instructor }));
  }

  async create(data: any) {
    if (!data.slug && data.title) {
      data.slug = data.title
        .toLowerCase()
        .replace(/[^a-zа-я0-9\s]/gi, "")
        .replace(/\s+/g, "-")
        .replace(/[а-я]/g, (c: string) => {
          const map: Record<string, string> = {
            а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",
            и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",
            с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",
            щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
          };
          return map[c] || c;
        });
    }
    const [created] = await this.db.insert(toursTable).values(data).returning();
    return created;
  }

  async update(id: number, data: any) {
    const [updated] = await this.db
      .update(toursTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(toursTable.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Тур не найден");
    return updated;
  }

  async delete(id: number) {
    const [deleted] = await this.db
      .delete(toursTable)
      .where(eq(toursTable.id, id))
      .returning({ id: toursTable.id });
    if (!deleted) throw new NotFoundException("Тур не найден");
    return { message: "Тур удалён" };
  }

  private sanitizeTourDateData(data: any): any {
    const result: any = { ...data };

    // Drizzle PgTimestamp requires Date objects — never raw strings
    if (result.startDate !== undefined && result.startDate !== null && result.startDate !== '') {
      const d = new Date(result.startDate);
      if (isNaN(d.getTime())) throw new BadRequestException(`Неверный формат startDate: ${result.startDate}`);
      result.startDate = d;
    }
    if (result.endDate !== undefined && result.endDate !== null && result.endDate !== '') {
      const d = new Date(result.endDate);
      if (isNaN(d.getTime())) throw new BadRequestException(`Неверный формат endDate: ${result.endDate}`);
      result.endDate = d;
    }

    // instructorId: empty string → null, else cast to number
    if (result.instructorId === '' || result.instructorId === undefined) {
      result.instructorId = null;
    } else if (result.instructorId !== null) {
      result.instructorId = Number(result.instructorId);
      if (isNaN(result.instructorId)) result.instructorId = null;
    }

    // Numeric fields: ensure numbers not strings where needed
    if (result.seatsTotal !== undefined) result.seatsTotal = Number(result.seatsTotal) || 1;
    if (result.seatsBooked !== undefined) result.seatsBooked = Number(result.seatsBooked) || 0;

    // Remove frontend-only fields that don't exist in the DB table
    delete result.tour;
    delete result.instructor;

    return result;
  }

  async createDate(data: any) {
    const sanitized = this.sanitizeTourDateData(data);
    console.log('[ToursService] createDate payload:', JSON.stringify(sanitized));
    const [created] = await this.db.insert(tourDatesTable).values(sanitized).returning();
    return created;
  }

  async updateDate(dateId: number, data: any) {
    const sanitized = this.sanitizeTourDateData(data);
    console.log('[ToursService] updateDate id=%d payload:', dateId, JSON.stringify(sanitized));
    const [updated] = await this.db
      .update(tourDatesTable)
      .set({ ...sanitized, updatedAt: new Date() })
      .where(eq(tourDatesTable.id, dateId))
      .returning();
    if (!updated) throw new NotFoundException("Дата тура не найдена");
    return updated;
  }

  async deleteDate(dateId: number) {
    const [deleted] = await this.db
      .delete(tourDatesTable)
      .where(eq(tourDatesTable.id, dateId))
      .returning({ id: tourDatesTable.id });
    if (!deleted) throw new NotFoundException("Дата тура не найдена");
    return { message: "Дата тура удалена" };
  }

  async updateBooking(bookingId: number, data: any) {
    const [updated] = await this.db
      .update(tourBookingsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tourBookingsTable.id, bookingId))
      .returning();
    if (!updated) throw new NotFoundException("Бронирование не найдено");
    return updated;
  }

  async createBooking(tourDateId: number, bookingData: any) {
    const [tourDate] = await this.db
      .select()
      .from(tourDatesTable)
      .where(eq(tourDatesTable.id, tourDateId))
      .limit(1);

    if (!tourDate) throw new NotFoundException("Дата тура не найдена");

    const availableSeats = tourDate.seatsTotal - tourDate.seatsBooked;
    if (availableSeats < bookingData.participantCount) {
      throw new BadRequestException(`Осталось мест: ${availableSeats}`);
    }

    const [booking] = await this.db
      .insert(tourBookingsTable)
      .values({
        tourDateId,
        userId: bookingData.userId,
        participantCount: bookingData.participantCount,
        totalAmount: String(parseFloat(tourDate.price as string) * bookingData.participantCount),
        contactName: bookingData.contactName,
        contactPhone: bookingData.contactPhone,
        contactEmail: bookingData.contactEmail,
        notes: bookingData.notes,
        status: "pending",
      })
      .returning();

    await this.db
      .update(tourDatesTable)
      .set({ seatsBooked: tourDate.seatsBooked + bookingData.participantCount })
      .where(eq(tourDatesTable.id, tourDateId));

    return booking;
  }

  async getBookings(params: { status?: string; tourId?: number }) {
    const { status, tourId } = params;
    let bookings = await this.db
      .select({ booking: tourBookingsTable, tourDate: tourDatesTable, tour: toursTable })
      .from(tourBookingsTable)
      .leftJoin(tourDatesTable, eq(tourBookingsTable.tourDateId, tourDatesTable.id))
      .leftJoin(toursTable, eq(tourDatesTable.tourId, toursTable.id))
      .orderBy(desc(tourBookingsTable.createdAt));

    if (status) bookings = bookings.filter((b) => b.booking.status === status);
    if (tourId) bookings = bookings.filter((b) => b.tourDate?.tourId === tourId);

    return bookings.map(({ booking, tourDate, tour }) => ({ ...booking, tourDate, tour }));
  }

  async findBookingById(id: number) {
    const [row] = await this.db
      .select({ booking: tourBookingsTable, tourDate: tourDatesTable, tour: toursTable })
      .from(tourBookingsTable)
      .leftJoin(tourDatesTable, eq(tourBookingsTable.tourDateId, tourDatesTable.id))
      .leftJoin(toursTable, eq(tourDatesTable.tourId, toursTable.id))
      .where(eq(tourBookingsTable.id, id))
      .limit(1);

    if (!row) throw new NotFoundException("Бронирование не найдено");

    return { ...row.booking, tourDate: row.tourDate, tour: row.tour };
  }
}

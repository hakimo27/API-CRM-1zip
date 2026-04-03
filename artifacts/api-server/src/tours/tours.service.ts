import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { eq, and, asc, desc, gte, lt } from "drizzle-orm";
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

  async findBySlug(slug: string) {
    const [tour] = await this.db.select().from(toursTable).where(eq(toursTable.slug, slug)).limit(1);
    if (!tour) throw new NotFoundException("Тур не найден");

    const upcomingDates = await this.db
      .select()
      .from(tourDatesTable)
      .where(
        and(
          eq(tourDatesTable.tourId, tour.id),
          eq(tourDatesTable.status, "planned"),
          gte(tourDatesTable.startDate, new Date())
        )
      )
      .orderBy(asc(tourDatesTable.startDate))
      .limit(10);

    return { ...tour, upcomingDates };
  }

  async getTourDates(tourId: number) {
    return this.db
      .select()
      .from(tourDatesTable)
      .where(
        and(
          eq(tourDatesTable.tourId, tourId),
          gte(tourDatesTable.startDate, new Date())
        )
      )
      .orderBy(asc(tourDatesTable.startDate));
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
      throw new NotFoundException(`Осталось мест: ${availableSeats}`);
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

  async create(data: any) {
    const [created] = await this.db.insert(toursTable).values(data).returning();
    return created;
  }

  async update(id: number, data: any) {
    const [updated] = await this.db.update(toursTable).set(data).where(eq(toursTable.id, id)).returning();
    if (!updated) throw new NotFoundException("Тур не найден");
    return updated;
  }

  async createDate(data: any) {
    const [created] = await this.db.insert(tourDatesTable).values(data).returning();
    return created;
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
}

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Query, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ToursService } from "./tours.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";

@Controller("tours")
export class ToursController {
  constructor(private toursService: ToursService) {}

  @Public()
  @Get()
  findAll(@Query("type") type?: string, @Query("featured") featured?: string) {
    return this.toursService.findAll({
      type,
      featured: featured === "true" ? true : featured === "false" ? false : undefined,
    });
  }

  @Get("admin")
  @Roles("admin", "manager", "superadmin", "instructor")
  findAllAdmin(
    @Query("type") type?: string,
    @Query("active") active?: string,
    @Query("search") search?: string,
  ) {
    return this.toursService.findAllAdmin({ type, active, search });
  }

  @Get("bookings")
  @Roles("admin", "manager", "instructor", "superadmin")
  getBookings(@Query("status") status?: string, @Query("tourId") tourId?: string) {
    return this.toursService.getBookings({ status, tourId: tourId ? parseInt(tourId) : undefined });
  }

  @Get("dates")
  @Roles("admin", "manager", "instructor", "superadmin")
  getAllDates(
    @Query("tourId") tourId?: string,
    @Query("status") status?: string,
    @Query("from") from?: string,
  ) {
    return this.toursService.getAllDates({
      tourId: tourId ? parseInt(tourId) : undefined,
      status,
      from,
    });
  }

  @Public()
  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.toursService.findBySlug(slug);
  }

  @Public()
  @Get(":id/dates")
  getTourDates(@Param("id", ParseIntPipe) id: number) {
    return this.toursService.getTourDates(id);
  }

  @Post()
  @Roles("admin", "manager", "superadmin")
  create(@Body() body: any) {
    return this.toursService.create(body);
  }

  @Patch(":id")
  @Roles("admin", "manager", "superadmin")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.toursService.update(id, body);
  }

  @Delete(":id")
  @Roles("admin", "superadmin")
  @HttpCode(HttpStatus.OK)
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.toursService.delete(id);
  }

  @Post(":id/dates")
  @Roles("admin", "manager", "instructor", "superadmin")
  createDate(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.toursService.createDate({ ...body, tourId: id });
  }

  @Patch("dates/:dateId")
  @Roles("admin", "manager", "instructor", "superadmin")
  updateDate(@Param("dateId", ParseIntPipe) dateId: number, @Body() body: any) {
    return this.toursService.updateDate(dateId, body);
  }

  @Delete("dates/:dateId")
  @Roles("admin", "manager", "superadmin")
  @HttpCode(HttpStatus.OK)
  deleteDate(@Param("dateId", ParseIntPipe) dateId: number) {
    return this.toursService.deleteDate(dateId);
  }

  @Patch("bookings/:bookingId")
  @Roles("admin", "manager", "superadmin")
  updateBooking(@Param("bookingId", ParseIntPipe) bookingId: number, @Body() body: any) {
    return this.toursService.updateBooking(bookingId, body);
  }

  @Public()
  @Post(":id/book")
  bookTour(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any
  ) {
    return this.toursService.createBooking(id, { ...body, userId: user?.id });
  }
}

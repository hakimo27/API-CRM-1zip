import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ToursService } from "./tours.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";

@Controller("tours")
export class ToursController {
  constructor(private toursService: ToursService) {}

  @Public()
  @Get()
  findAll(
    @Query("type") type?: string,
    @Query("featured") featured?: string
  ) {
    return this.toursService.findAll({
      type,
      featured: featured === "true" ? true : featured === "false" ? false : undefined,
    });
  }

  @Get("bookings")
  @Roles("admin", "manager", "instructor")
  getBookings(@Query("status") status?: string, @Query("tourId") tourId?: string) {
    return this.toursService.getBookings({ status, tourId: tourId ? parseInt(tourId) : undefined });
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

  @Public()
  @Post(":id/book")
  bookTour(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any
  ) {
    return this.toursService.createBooking(id, { ...body, userId: user?.id });
  }

  @Post()
  @Roles("admin", "manager")
  create(@Body() body: any) {
    return this.toursService.create(body);
  }

  @Patch(":id")
  @Roles("admin", "manager")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.toursService.update(id, body);
  }

  @Post(":id/dates")
  @Roles("admin", "manager", "instructor")
  createDate(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.toursService.createDate({ ...body, tourId: id });
  }
}

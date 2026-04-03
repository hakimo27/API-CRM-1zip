import { Controller, Get, Query, ParseIntPipe } from "@nestjs/common";
import { AvailabilityService } from "./availability.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { PricingService } from "../pricing/pricing.service.js";

@Controller("availability")
export class AvailabilityController {
  constructor(
    private availabilityService: AvailabilityService,
    private pricingService: PricingService
  ) {}

  @Public()
  @Get()
  check(
    @Query("productId", ParseIntPipe) productId: number,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("quantity") quantity?: string
  ) {
    return this.availabilityService.checkAvailability(
      productId,
      new Date(startDate),
      new Date(endDate),
      quantity ? parseInt(quantity) : 1
    );
  }

  @Public()
  @Get("pricing")
  async getPricing(
    @Query("productId", ParseIntPipe) productId: number,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string
  ) {
    return this.pricingService.calculatePrice(productId, new Date(startDate), new Date(endDate));
  }
}

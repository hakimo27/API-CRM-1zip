import { Module } from "@nestjs/common";
import { OrdersService } from "./orders.service.js";
import { OrdersController } from "./orders.controller.js";
import { AvailabilityModule } from "../availability/availability.module.js";
import { PricingModule } from "../pricing/pricing.module.js";

@Module({
  imports: [AvailabilityModule, PricingModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}

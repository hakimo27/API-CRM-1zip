import { Module } from "@nestjs/common";
import { OrdersService } from "./orders.service.js";
import { OrdersController } from "./orders.controller.js";
import { AvailabilityModule } from "../availability/availability.module.js";
import { PricingModule } from "../pricing/pricing.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [AvailabilityModule, PricingModule, NotificationsModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}

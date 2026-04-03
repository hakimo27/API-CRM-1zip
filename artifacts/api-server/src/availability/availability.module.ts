import { Module } from "@nestjs/common";
import { AvailabilityService } from "./availability.service.js";
import { AvailabilityController } from "./availability.controller.js";
import { PricingModule } from "../pricing/pricing.module.js";

@Module({
  imports: [PricingModule],
  providers: [AvailabilityService],
  controllers: [AvailabilityController],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}

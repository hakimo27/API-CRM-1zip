import { Module } from "@nestjs/common";
import { ToursService } from "./tours.service.js";
import { ToursController } from "./tours.controller.js";

@Module({
  providers: [ToursService],
  controllers: [ToursController],
  exports: [ToursService],
})
export class ToursModule {}

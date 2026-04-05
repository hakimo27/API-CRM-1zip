import { Module } from "@nestjs/common";
import { ToursService } from "./tours.service.js";
import { ToursController } from "./tours.controller.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [NotificationsModule],
  providers: [ToursService],
  controllers: [ToursController],
  exports: [ToursService],
})
export class ToursModule {}

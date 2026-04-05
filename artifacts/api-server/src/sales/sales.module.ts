import { Module } from "@nestjs/common";
import { SalesService } from "./sales.service.js";
import { SalesController } from "./sales.controller.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [NotificationsModule],
  providers: [SalesService],
  controllers: [SalesController],
  exports: [SalesService],
})
export class SalesModule {}

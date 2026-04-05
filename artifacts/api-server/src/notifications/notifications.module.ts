import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import { BusinessNotificationsService } from "./business-notifications.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { TelegramModule } from "../telegram/telegram.module.js";

@Module({
  imports: [TelegramModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, BusinessNotificationsService],
  exports: [NotificationsService, BusinessNotificationsService],
})
export class NotificationsModule {}

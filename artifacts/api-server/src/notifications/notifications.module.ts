import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import { BusinessNotificationsService } from "./business-notifications.service.js";
import { PushNotificationsService } from "./push-notifications.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { TelegramModule } from "../telegram/telegram.module.js";
import { SettingsModule } from "../settings/settings.module.js";

@Module({
  imports: [TelegramModule, SettingsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, BusinessNotificationsService, PushNotificationsService],
  exports: [NotificationsService, BusinessNotificationsService, PushNotificationsService],
})
export class NotificationsModule {}

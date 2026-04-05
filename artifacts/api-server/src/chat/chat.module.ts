import { Module } from "@nestjs/common";
import { ChatService } from "./chat.service.js";
import { ChatController } from "./chat.controller.js";
import { ChatGateway } from "./chat.gateway.js";
import { TelegramModule } from "../telegram/telegram.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [TelegramModule, NotificationsModule],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}

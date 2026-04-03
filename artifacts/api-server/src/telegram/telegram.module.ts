import { Module } from "@nestjs/common";
import { TelegramService } from "./telegram.service.js";
import { TelegramController } from "./telegram.controller.js";

@Module({
  providers: [TelegramService],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}

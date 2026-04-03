import { Controller, Post, Get, Body, Query } from "@nestjs/common";
import { TelegramService } from "./telegram.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("telegram")
export class TelegramController {
  constructor(private telegramService: TelegramService) {}

  @Public()
  @Post("webhook")
  handleWebhook(@Body() update: any) {
    return this.telegramService.handleWebhook(update);
  }

  @Get("info")
  @Roles("admin")
  getBotInfo() {
    return this.telegramService.getBotInfo();
  }

  @Post("webhook/set")
  @Roles("admin")
  setWebhook(@Body() body: { url: string }) {
    return this.telegramService.setWebhook(body.url);
  }

  @Post("webhook/delete")
  @Roles("admin")
  deleteWebhook() {
    return this.telegramService.deleteWebhook();
  }

  @Get("sessions")
  @Roles("admin", "manager")
  getActiveSessions() {
    return this.telegramService.getActiveSessions();
  }

  @Post("send")
  @Roles("admin", "manager")
  sendMessage(@Body() body: { chatId: string; text: string }) {
    return this.telegramService.sendMessage(body.chatId, body.text);
  }
}

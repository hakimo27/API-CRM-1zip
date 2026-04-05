import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ChatService } from "./chat.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("chat")
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get("sessions")
  @Roles("admin", "manager")
  getSessions(
    @Query("status") status?: string,
    @Query("channel") channel?: string,
    @Query("page") page?: string
  ) {
    return this.chatService.getSessions({ status, channel, page: page ? parseInt(page) : 1 });
  }

  @Get("sessions/unread")
  @Roles("admin", "manager")
  getUnreadCount() {
    return this.chatService.getUnreadCount();
  }

  @Public()
  @Post("sessions")
  createSession(
    @Body() body: {
      channel?: string;
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const meta = {
      ...(body.metadata || {}),
      ...(body.customerPhone ? { phone: body.customerPhone } : {}),
      ...(body.customerEmail ? { email: body.customerEmail } : {}),
    };
    return this.chatService.getOrCreateSession(
      body.channel || "web",
      undefined,
      meta,
      body.customerName,
    );
  }

  @Get("sessions/:id")
  @Roles("admin", "manager")
  getSession(@Param("id", ParseIntPipe) id: number) {
    return this.chatService.getSession(id);
  }

  @Get("sessions/:id/messages")
  @Roles("admin", "manager")
  getMessages(@Param("id", ParseIntPipe) id: number) {
    return this.chatService.getMessages(id);
  }

  @Public()
  @Get("sessions/:id/messages/public")
  getMessagesPublic(@Param("id", ParseIntPipe) id: number) {
    return this.chatService.getMessages(id, 100);
  }

  @Public()
  @Post("sessions/:id/messages")
  sendMessage(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { content: string; sender?: "customer" | "manager"; senderName?: string }
  ) {
    return this.chatService.createMessage(id, body.content, body.sender || "customer", body.senderName);
  }

  @Patch("sessions/:id/status")
  @Roles("admin", "manager")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: { status: string }) {
    return this.chatService.updateSessionStatus(id, body.status);
  }

  @Patch("sessions/:id/read")
  @Roles("admin", "manager")
  markAsRead(@Param("id", ParseIntPipe) id: number) {
    return this.chatService.markAsRead(id);
  }
}

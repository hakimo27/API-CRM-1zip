import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ChatService } from "./chat.service.js";
import { ChatGateway } from "./chat.gateway.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("chat")
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

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
  async createSession(
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
    const session = await this.chatService.getOrCreateSession(
      body.channel || "web",
      undefined,
      meta,
      body.customerName,
    );
    // Notify all managers of the new session in real-time
    this.chatGateway.server?.to("managers").emit("new_session", session);
    return session;
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
  async sendMessage(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { content: string; sender?: "customer" | "manager"; senderName?: string }
  ) {
    const sender = body.sender || "customer";
    const message = await this.chatService.createMessage(id, body.content, sender, body.senderName);
    // Broadcast to everyone in the session room
    this.chatGateway.broadcastMessage(id, message);
    // Also push a lightweight update to managers room so they can refresh their session list
    if (sender === "customer") {
      this.chatGateway.server?.to("managers").emit("new_customer_message", { sessionId: id });
    }
    return message;
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

  @Public()
  @Post("offline-request")
  async createOfflineRequest(
    @Body() body: {
      name?: string;
      phone?: string;
      email?: string;
      message: string;
      sourcePage?: string;
    }
  ) {
    const result = await this.chatService.createOfflineRequest(body);
    // Notify managers of the new session from offline form
    const session = await this.chatService.getSession(result.sessionId).catch(() => null);
    if (session) {
      this.chatGateway.server?.to("managers").emit("new_session", session);
    }
    return result;
  }
}

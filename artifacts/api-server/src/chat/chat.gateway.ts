import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service.js";
import { TelegramService } from "../telegram/telegram.service.js";

@WebSocketGateway({
  namespace: "chat",
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private chatService: ChatService,
    private telegramService: TelegramService
  ) {}

  handleConnection(client: Socket) {
    console.log(`Chat client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join_session")
  async handleJoinSession(
    @MessageBody() data: { sessionId: number },
    @ConnectedSocket() client: Socket
  ) {
    await client.join(`session:${data.sessionId}`);
    const messages = await this.chatService.getMessages(data.sessionId);
    client.emit("session_history", messages);
  }

  @SubscribeMessage("send_message")
  async handleMessage(
    @MessageBody()
    data: {
      sessionId: number;
      content: string;
      sender: "customer" | "manager";
      senderName?: string;
    },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const message = await this.chatService.createMessage(
        data.sessionId,
        data.content,
        data.sender,
        data.senderName
      );

      this.server.to(`session:${data.sessionId}`).emit("new_message", message);

      if (data.sender === "manager") {
        const session = await this.chatService.getSession(data.sessionId);
        if (session.telegramChatId) {
          await this.telegramService.sendMessage(session.telegramChatId, data.content).catch(() => {});
        }
      }

      return { success: true, message };
    } catch (error) {
      client.emit("error", { message: "Ошибка отправки сообщения" });
    }
  }

  @SubscribeMessage("start_session")
  async handleStartSession(
    @MessageBody() data: { channel?: string; customerName?: string },
    @ConnectedSocket() client: Socket
  ) {
    const session = await this.chatService.getOrCreateSession(
      data.channel || "web",
      undefined,
      { customerName: data.customerName }
    );

    await client.join(`session:${session.id}`);
    const messages = await this.chatService.getMessages(session.id);

    client.emit("session_created", { session, messages });
    this.server.to("managers").emit("new_session", session);

    return session;
  }

  @SubscribeMessage("close_session")
  async handleCloseSession(@MessageBody() data: { sessionId: number }) {
    const updated = await this.chatService.updateSessionStatus(data.sessionId, "closed");
    this.server.to(`session:${data.sessionId}`).emit("session_closed", updated);
    return updated;
  }

  @SubscribeMessage("join_managers")
  handleJoinManagers(@ConnectedSocket() client: Socket) {
    client.join("managers");
  }

  broadcastMessage(sessionId: number, message: unknown) {
    this.server.to(`session:${sessionId}`).emit("new_message", message);
  }
}

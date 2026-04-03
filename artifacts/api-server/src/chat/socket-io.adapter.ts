import { IoAdapter } from "@nestjs/platform-socket.io";
import type { ServerOptions } from "socket.io";

export class SocketIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: true,
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });
    return server;
  }
}

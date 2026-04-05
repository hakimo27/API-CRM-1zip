import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, RequestMethod } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import cookieParser from "cookie-parser";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor.js";
import { SocketIoAdapter } from "./chat/socket-io.adapter.js";
import express from "express";
import * as path from "path";
import * as fs from "fs";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });

  const port = parseInt(process.env.PORT || "8080", 10);
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR || "./uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // Serve uploads at /api/uploads (routed through Replit proxy) AND /uploads (direct)
  app.use("/api/uploads", express.static(uploadsDir));
  app.use("/uploads", express.static(uploadsDir));

  // Exclude SEO routes from /api prefix — they must be served at root paths
  // so nginx can proxy /robots.txt, /sitemap.xml, /feed.xml directly to this API
  app.setGlobalPrefix("api", {
    exclude: [
      { path: "robots.txt", method: RequestMethod.GET },
      { path: "sitemap.xml", method: RequestMethod.GET },
      { path: "feed.xml", method: RequestMethod.GET },
      { path: "feed/yml", method: RequestMethod.GET },
    ],
  });

  app.use(cookieParser());

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useWebSocketAdapter(new SocketIoAdapter(app));

  await app.listen(port);
  console.log(`API server running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

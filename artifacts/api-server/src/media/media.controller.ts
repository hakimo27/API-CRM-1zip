import {
  Controller, Get, Post, Delete, Query, Body,
  UploadedFile, UseInterceptors, BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import * as path from "path";
import * as fs from "fs";
import { MediaService } from "./media.service.js";
import { Roles } from "../common/decorators/roles.decorator.js";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

@Controller("media")
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Get("files")
  @Roles("admin", "manager", "content_manager")
  listFiles(@Query("folder") folder?: string) {
    return this.mediaService.listFiles(folder);
  }

  @Get("folders")
  @Roles("admin", "manager", "content_manager")
  getFolders() {
    return this.mediaService.getFolders();
  }

  @Post("upload")
  @Roles("admin", "manager", "content_manager")
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const folder = (req.query.folder as string) || "";
        const dir = folder ? path.join(UPLOADS_DIR, folder) : UPLOADS_DIR;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-z0-9а-яё]/gi, "-").toLowerCase();
        cb(null, `${base}-${unique}${ext}`);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File, @Query("folder") folder?: string) {
    if (!file) throw new BadRequestException("Файл не предоставлен");
    return this.mediaService.saveFile(file, folder);
  }

  @Delete("files")
  @Roles("admin", "manager", "content_manager")
  deleteFile(@Query("path") filePath: string) {
    if (!filePath) throw new BadRequestException("Путь к файлу не указан");
    return this.mediaService.deleteFile(filePath);
  }

  @Post("folders")
  @Roles("admin", "manager", "content_manager")
  createFolder(@Body("name") name: string) {
    if (!name) throw new BadRequestException("Название папки не указано");
    return this.mediaService.createFolder(name);
  }
}

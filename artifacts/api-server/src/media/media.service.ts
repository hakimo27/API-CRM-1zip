import { Injectable, NotFoundException } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

@Injectable()
export class MediaService {
  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  async listFiles(folder?: string): Promise<any[]> {
    const baseDir = folder ? path.join(UPLOADS_DIR, folder) : UPLOADS_DIR;
    this.ensureDir(baseDir);
    const baseUrl = process.env.PUBLIC_UPLOADS_URL || "/api/uploads";

    const readDir = (dir: string, prefix: string): any[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: any[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          files.push(...readDir(path.join(dir, entry.name), prefix + entry.name + "/"));
        } else {
          const filePath = path.join(dir, entry.name);
          const stat = fs.statSync(filePath);
          const ext = path.extname(entry.name).toLowerCase();
          const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"].includes(ext);
          const isVideo = [".mp4", ".webm", ".ogg", ".mov"].includes(ext);
          files.push({
            name: entry.name,
            path: prefix + entry.name,
            url: `${baseUrl}/${prefix}${entry.name}`,
            size: stat.size,
            type: isImage ? "image" : isVideo ? "video" : "file",
            mime: this.getMime(ext),
            createdAt: stat.birthtime,
            modifiedAt: stat.mtime,
          });
        }
      }
      return files;
    };

    return readDir(baseDir, folder ? folder + "/" : "");
  }

  async getFolders(): Promise<string[]> {
    this.ensureDir(UPLOADS_DIR);
    const entries = fs.readdirSync(UPLOADS_DIR, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  }

  async saveFile(file: Express.Multer.File, folder?: string): Promise<any> {
    const targetDir = folder ? path.join(UPLOADS_DIR, folder) : UPLOADS_DIR;
    this.ensureDir(targetDir);
    const baseUrl = process.env.PUBLIC_UPLOADS_URL || "/api/uploads";
    const filePath = path.join(targetDir, file.filename || file.originalname);
    if (file.path && file.path !== filePath) {
      fs.renameSync(file.path, filePath);
    }
    const relativePath = folder ? `${folder}/${file.filename || file.originalname}` : (file.filename || file.originalname);
    return {
      name: file.originalname,
      filename: file.filename || file.originalname,
      path: relativePath,
      url: `${baseUrl}/${relativePath}`,
      size: file.size,
      mime: file.mimetype,
      type: file.mimetype.startsWith("image/") ? "image" : file.mimetype.startsWith("video/") ? "video" : "file",
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(UPLOADS_DIR, filePath);
    if (!fs.existsSync(fullPath)) throw new NotFoundException("Файл не найден");
    fs.unlinkSync(fullPath);
  }

  async createFolder(name: string): Promise<void> {
    const folderPath = path.join(UPLOADS_DIR, name);
    this.ensureDir(folderPath);
  }

  private getMime(ext: string): string {
    const map: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
      ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
      ".avif": "image/avif", ".mp4": "video/mp4", ".webm": "video/webm",
      ".pdf": "application/pdf", ".zip": "application/zip",
    };
    return map[ext] || "application/octet-stream";
  }
}

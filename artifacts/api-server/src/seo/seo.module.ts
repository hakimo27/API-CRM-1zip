import { Module } from "@nestjs/common";
import { SeoController } from "./seo.controller.js";
import { DatabaseModule } from "../database/database.module.js";

@Module({
  imports: [DatabaseModule],
  controllers: [SeoController],
})
export class SeoModule {}

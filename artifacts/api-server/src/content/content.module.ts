import { Module } from "@nestjs/common";
import { ContentService } from "./content.service.js";
import { ContentController } from "./content.controller.js";

@Module({
  providers: [ContentService],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}

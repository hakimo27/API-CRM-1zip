import { Module } from "@nestjs/common";
import { BranchesService } from "./branches.service.js";
import { BranchesController } from "./branches.controller.js";

@Module({
  providers: [BranchesService],
  controllers: [BranchesController],
  exports: [BranchesService],
})
export class BranchesModule {}

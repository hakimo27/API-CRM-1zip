import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from "@nestjs/common";
import { BranchesService } from "./branches.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("branches")
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Public()
  @Get()
  findAll() {
    return this.branchesService.findAll();
  }

  @Get("admin")
  @Roles("admin", "manager")
  findAllAdmin() {
    return this.branchesService.findAllAdmin();
  }

  @Public()
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.branchesService.findById(id);
  }

  @Post()
  @Roles("admin")
  create(@Body() body: any) {
    return this.branchesService.create(body);
  }

  @Patch(":id")
  @Roles("admin")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.branchesService.update(id, body);
  }

  @Delete(":id")
  @Roles("admin")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.branchesService.delete(id);
  }
}

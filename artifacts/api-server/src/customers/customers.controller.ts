import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from "@nestjs/common";
import { CustomersService } from "./customers.service.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("customers")
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @Roles("admin", "manager")
  findAll(
    @Query("search") search?: string,
    @Query("channel") channel?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.customersService.findAll({
      search,
      channel,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get("stats")
  @Roles("admin", "manager")
  getStats() {
    return this.customersService.getStats();
  }

  @Get(":id")
  @Roles("admin", "manager")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.customersService.findById(id);
  }

  @Post()
  @Roles("admin", "manager")
  create(@Body() body: any) {
    return this.customersService.create(body);
  }

  @Patch(":id")
  @Roles("admin", "manager")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.customersService.update(id, body);
  }

  @Delete(":id")
  @Roles("admin")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.customersService.delete(id);
  }
}

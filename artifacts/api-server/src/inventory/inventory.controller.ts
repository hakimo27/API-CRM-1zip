import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from "@nestjs/common";
import { InventoryService } from "./inventory.service.js";
import { Roles } from "../common/decorators/roles.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";

@Controller("inventory")
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @Roles("admin", "manager", "warehouse")
  findAll(
    @Query("productId") productId?: string,
    @Query("status") status?: string
  ) {
    return this.inventoryService.findAll({
      productId: productId ? parseInt(productId) : undefined,
      status,
    });
  }

  @Get("stats")
  @Roles("admin", "manager", "warehouse")
  getStats() {
    return this.inventoryService.getStats();
  }

  @Get(":id")
  @Roles("admin", "manager", "warehouse")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.inventoryService.findById(id);
  }

  @Post()
  @Roles("admin", "manager", "warehouse")
  create(@Body() body: any) {
    return this.inventoryService.create(body);
  }

  @Patch(":id")
  @Roles("admin", "manager", "warehouse")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.inventoryService.update(id, body);
  }

  @Patch(":id/status")
  @Roles("admin", "manager", "warehouse")
  changeStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { status: string; reason: string; notes?: string },
    @CurrentUser() user: any
  ) {
    return this.inventoryService.changeStatus(id, body.status, body.reason, user?.id, body.notes);
  }

  @Delete(":id")
  @Roles("admin")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.inventoryService.delete(id);
  }
}

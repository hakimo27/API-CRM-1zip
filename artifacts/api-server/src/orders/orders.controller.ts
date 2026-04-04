import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from "@nestjs/common";
import { OrdersService } from "./orders.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";

@Controller("orders")
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @Roles("admin", "manager")
  findAll(
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.ordersService.findAll({
      status,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get("stats")
  @Roles("admin", "manager")
  getStats() {
    return this.ordersService.getStats();
  }

  @Get("my")
  getMyOrders(@CurrentUser() user: any) {
    return this.ordersService.findAll({ userId: user.id });
  }

  @Get("by-id/:id")
  @Roles("admin", "manager")
  findById(@Param("id", ParseIntPipe) id: number) {
    return this.ordersService.findById(id);
  }

  @Public()
  @Get(":number")
  findOne(@Param("number") number: string) {
    return this.ordersService.findByNumber(number);
  }

  @Public()
  @Post()
  create(@Body() body: any) {
    return this.ordersService.create(body);
  }

  @Patch(":id/extend")
  @Roles("admin", "manager")
  extend(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { endDate: string }
  ) {
    return this.ordersService.extendOrder(id, body.endDate);
  }

  @Patch(":id/status")
  @Roles("admin", "manager")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { status: string; comment?: string },
    @CurrentUser() user: any
  ) {
    return this.ordersService.updateStatus(id, body.status, body.comment, user?.id);
  }

  @Post(":id/items")
  @Roles("admin", "manager")
  addItem(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { productId: number; quantity: number; pricePerDay?: number; totalPrice?: number }
  ) {
    return this.ordersService.addItem(id, body);
  }

  @Patch(":id/items/:itemId")
  @Roles("admin", "manager")
  updateItem(
    @Param("id", ParseIntPipe) id: number,
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() body: { quantity?: number; pricePerDay?: number; totalPrice?: number }
  ) {
    return this.ordersService.updateItem(id, itemId, body);
  }

  @Delete(":id/items/:itemId")
  @Roles("admin", "manager")
  removeItem(
    @Param("id", ParseIntPipe) id: number,
    @Param("itemId", ParseIntPipe) itemId: number
  ) {
    return this.ordersService.removeItem(id, itemId);
  }

  @Patch(":id")
  @Roles("admin", "manager")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.ordersService.update(id, body);
  }
}

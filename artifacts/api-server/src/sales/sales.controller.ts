import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from "@nestjs/common";
import { SalesService } from "./sales.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("sales")
export class SalesController {
  constructor(private salesService: SalesService) {}

  // ─── Products ──────────────────────────────────────────────────────────────

  @Public()
  @Get("products")
  getProducts(@Query("search") search?: string) {
    return this.salesService.findAllProducts({ active: true, search });
  }

  @Get("products/admin")
  @Roles("admin", "manager")
  getProductsAdmin(@Query("search") search?: string) {
    return this.salesService.findAllProducts({ search });
  }

  @Post("products")
  @Roles("admin", "manager")
  createProduct(@Body() body: any) {
    return this.salesService.createProduct(body);
  }

  @Patch("products/:id")
  @Roles("admin", "manager")
  updateProduct(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.salesService.updateProduct(id, body);
  }

  @Delete("products/:id")
  @Roles("admin", "manager")
  deleteProduct(@Param("id", ParseIntPipe) id: number) {
    return this.salesService.deleteProduct(id);
  }

  // ─── Orders ────────────────────────────────────────────────────────────────

  @Get("orders")
  @Roles("admin", "manager")
  getOrders(@Query("status") status?: string, @Query("page") page?: string) {
    return this.salesService.findAllOrders({ status, page: page ? parseInt(page) : 1 });
  }

  @Get("orders/stats")
  @Roles("admin", "manager")
  getStats() {
    return this.salesService.getStats();
  }

  @Public()
  @Post("orders")
  createOrder(@Body() body: any) {
    return this.salesService.createOrder(body);
  }

  @Patch("orders/:id/status")
  @Roles("admin", "manager")
  updateOrderStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { status: string }
  ) {
    return this.salesService.updateOrderStatus(id, body.status);
  }
}

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

  @Public()
  @Get("products/:slug")
  getProductBySlug(@Param("slug") slug: string) {
    return this.salesService.findProductBySlug(slug);
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

  @Get("orders/:id")
  @Roles("admin", "manager")
  getOrderById(@Param("id", ParseIntPipe) id: number) {
    return this.salesService.findOrderById(id);
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

  @Patch("orders/:id")
  @Roles("admin", "manager")
  updateOrder(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.salesService.updateOrder(id, body);
  }

  @Post("orders/:id/items")
  @Roles("admin", "manager")
  addOrderItem(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { productId: number; quantity: number; price?: number }
  ) {
    return this.salesService.addOrderItem(id, body);
  }

  @Patch("orders/:id/items/:itemId")
  @Roles("admin", "manager")
  updateOrderItem(
    @Param("id", ParseIntPipe) id: number,
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() body: { quantity?: number; price?: number }
  ) {
    return this.salesService.updateOrderItem(id, itemId, body);
  }

  @Delete("orders/:id/items/:itemId")
  @Roles("admin", "manager")
  removeOrderItem(
    @Param("id", ParseIntPipe) id: number,
    @Param("itemId", ParseIntPipe) itemId: number
  ) {
    return this.salesService.removeOrderItem(id, itemId);
  }
}

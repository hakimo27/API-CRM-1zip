import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ProductsService } from "./products.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("products")
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Public()
  @Get()
  findAll(
    @Query("categoryId") categoryId?: string,
    @Query("categorySlug") categorySlug?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.productsService.findAll({
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      categorySlug,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get("admin")
  @Roles("admin", "manager", "warehouse")
  findAllAdmin(@Query("search") search?: string, @Query("categoryId") categoryId?: string) {
    return this.productsService.findAll({ active: undefined, categoryId: categoryId ? parseInt(categoryId) : undefined, search });
  }

  @Public()
  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    if (!isNaN(parseInt(slug))) {
      return this.productsService.findById(parseInt(slug));
    }
    return this.productsService.findBySlug(slug);
  }

  @Post()
  @Roles("admin", "manager")
  create(@Body() body: any) {
    return this.productsService.create(body);
  }

  @Patch(":id/images")
  @Roles("admin", "manager")
  syncImages(@Param("id", ParseIntPipe) id: number, @Body() body: { urls: string[] }) {
    return this.productsService.syncImages(id, body.urls || []);
  }

  @Patch(":id")
  @Roles("admin", "manager")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.productsService.update(id, body);
  }

  @Delete(":id")
  @Roles("admin")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.delete(id);
  }
}

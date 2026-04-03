import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from "@nestjs/common";
import { CategoriesService } from "./categories.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("categories")
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Post()
  @Roles("admin")
  create(@Body() body: any) {
    return this.categoriesService.create(body);
  }

  @Patch(":id")
  @Roles("admin")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.categoriesService.update(id, body);
  }

  @Delete(":id")
  @Roles("admin")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.delete(id);
  }
}

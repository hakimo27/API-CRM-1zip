import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from "@nestjs/common";
import { TemplatesService } from "./templates.service.js";
import { Roles } from "../common/decorators/roles.decorator.js";
import { Public } from "../common/decorators/public.decorator.js";

@Controller("templates")
export class TemplatesController {
  constructor(private svc: TemplatesService) {}

  @Public()
  @Get("spec-templates")
  getSpecTemplates() { return this.svc.getSpecTemplates(); }

  @Post("spec-templates")
  @Roles("admin", "manager")
  createSpecTemplate(@Body() body: { name: string; specs: any[] }) {
    return this.svc.createSpecTemplate(body.name, body.specs ?? []);
  }

  @Patch("spec-templates/:id")
  @Roles("admin", "manager")
  updateSpecTemplate(@Param("id", ParseIntPipe) id: number, @Body() body: { name?: string; specs?: any[] }) {
    return this.svc.updateSpecTemplate(id, body);
  }

  @Delete("spec-templates/:id")
  @Roles("admin", "manager")
  deleteSpecTemplate(@Param("id", ParseIntPipe) id: number) {
    return this.svc.deleteSpecTemplate(id);
  }

  @Public()
  @Get("tariff-templates")
  getTariffTemplates() { return this.svc.getTariffTemplates(); }

  @Post("tariff-templates")
  @Roles("admin", "manager")
  createTariffTemplate(@Body() body: { name: string; tariffs: any[] }) {
    return this.svc.createTariffTemplate(body.name, body.tariffs ?? []);
  }

  @Patch("tariff-templates/:id")
  @Roles("admin", "manager")
  updateTariffTemplate(@Param("id", ParseIntPipe) id: number, @Body() body: { name?: string; tariffs?: any[] }) {
    return this.svc.updateTariffTemplate(id, body);
  }

  @Delete("tariff-templates/:id")
  @Roles("admin", "manager")
  deleteTariffTemplate(@Param("id", ParseIntPipe) id: number) {
    return this.svc.deleteTariffTemplate(id);
  }
}

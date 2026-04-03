import { Controller, Get, Put, Post, Body, Param } from "@nestjs/common";
import { SettingsService } from "./settings.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("settings")
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Public()
  @Get("public")
  getPublicSettings() {
    return this.settingsService.getPublic();
  }

  @Get()
  @Roles("admin", "manager")
  getAll() {
    return this.settingsService.getAll();
  }

  @Get("group/:group")
  @Roles("admin", "manager")
  getByGroup(@Param("group") group: string) {
    return this.settingsService.getByGroup(group);
  }

  @Get(":key")
  @Roles("admin", "manager")
  getOne(@Param("key") key: string) {
    return this.settingsService.get(key);
  }

  @Put()
  @Roles("admin")
  setBulk(@Body() body: Record<string, unknown>) {
    return this.settingsService.setBulk(body);
  }

  @Put(":key")
  @Roles("admin")
  setOne(@Param("key") key: string, @Body() body: { value: unknown; group?: string }) {
    return this.settingsService.set(key, body.value, body.group);
  }

  @Post("init")
  @Roles("admin")
  initDefaults() {
    return this.settingsService.initDefaults();
  }
}

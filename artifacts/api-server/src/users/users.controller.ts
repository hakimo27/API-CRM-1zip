import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles("admin", "manager", "superadmin")
  findAll(
    @Query("role") role?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.usersService.findAll({
      role,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 100,
    });
  }

  @Get("profile")
  getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Patch("profile")
  updateProfile(@CurrentUser() user: any, @Body() body: any) {
    const { role, email, passwordHash, ...safeData } = body;
    return this.usersService.update(user.id, safeData);
  }

  @Patch("profile/password")
  changePassword(
    @CurrentUser() user: any,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    return this.usersService.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  @Post()
  @Roles("admin", "superadmin")
  create(@Body() body: any) {
    return this.usersService.createUser(body);
  }

  @Get(":id")
  @Roles("admin", "manager", "superadmin")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Patch(":id")
  @Roles("admin", "superadmin")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Post(":id/reset-password")
  @Roles("admin", "superadmin")
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { newPassword: string }
  ) {
    return this.usersService.adminResetPassword(id, body.newPassword);
  }

  @Post(":id/toggle-active")
  @Roles("admin", "superadmin")
  @HttpCode(HttpStatus.OK)
  toggleActive(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.toggleActive(id);
  }

  @Delete(":id")
  @Roles("admin", "superadmin")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.delete(id);
  }
}

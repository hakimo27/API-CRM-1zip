import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles("admin", "manager")
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
      limit: limit ? parseInt(limit) : 50,
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

  @Get(":id")
  @Roles("admin", "manager")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Patch(":id")
  @Roles("admin")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Delete(":id")
  @Roles("admin")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.delete(id);
  }
}

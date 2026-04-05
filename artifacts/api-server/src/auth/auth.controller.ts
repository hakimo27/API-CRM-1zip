import {
  Controller,
  Post,
  Body,
  Headers,
  Ip,
  Get,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { RegisterDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto } from "./dto/auth.dto.js";
import { Public } from "../common/decorators/public.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string
  ) {
    return this.authService.login(dto, userAgent, ip);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body() dto: RefreshTokenDto,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string
  ) {
    return this.authService.refresh(dto.refreshToken, userAgent, ip);
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Get("verify-email")
  verifyEmail(@Query("token") token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get("me")
  me(@CurrentUser() user: any) {
    return this.authService.findById(user.id);
  }

  @Get("healthz")
  @Public()
  health() {
    return { status: "ok", time: new Date().toISOString() };
  }

  /**
   * One-time bootstrap endpoint. Creates a superadmin if none exists.
   * Safe to call repeatedly — skips if superadmin already exists.
   * Only callable when BOOTSTRAP_SUPERADMIN_CREATE=true in env.
   */
  @Public()
  @Post("setup-superadmin")
  @HttpCode(HttpStatus.OK)
  setupSuperadmin(@Body() body: any) {
    if (process.env.BOOTSTRAP_SUPERADMIN_CREATE !== "true") {
      return { message: "Bootstrap disabled. Set BOOTSTRAP_SUPERADMIN_CREATE=true to enable.", skipped: true };
    }
    return this.authService.setupSuperadmin({
      email: body.email,
      password: body.password,
      firstName: body.firstName || "Администратор",
      lastName: body.lastName,
      phone: body.phone,
    });
  }
}

import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: "Введите корректный email" })
  email!: string;

  @IsString()
  @MinLength(6, { message: "Пароль должен быть не менее 6 символов" })
  password!: string;

  @IsString({ message: "Введите имя" })
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @IsEmail({}, { message: "Введите корректный email" })
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

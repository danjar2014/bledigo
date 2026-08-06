import { IsEmail, IsString, MinLength, IsOptional, IsEnum, Matches } from 'class-validator';
import { UserRole } from '../../common/enums';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Numero de telephone invalide' })
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class VerifyEmailDto {
  @IsString()
  token: string;
}

export class VerifyPhoneDto {
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Numero de telephone invalide' })
  phone: string;

  @IsString()
  code: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class OAuthDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class TwoFactorEnableDto {
  @IsString()
  method: string;
}

export class TwoFactorVerifyDto {
  @IsString()
  code: string;
}

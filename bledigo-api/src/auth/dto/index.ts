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

/**
 * Jeton d identite renvoye par le bouton Google du navigateur.
 *
 * Une classe, et non un type en ligne : le ValidationPipe global ignore
 * purement et simplement les parametres types par un objet anonyme, ce qui
 * laisserait passer un corps vide jusqu au service.
 */
export class GoogleLoginDto {
  @IsString()
  @MinLength(20)
  credential: string;
}

export class TwoFactorEnableDto {
  @IsString()
  method: string;
}

export class TwoFactorVerifyDto {
  @IsString()
  code: string;
}

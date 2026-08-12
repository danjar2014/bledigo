import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import {
  RegisterDto, LoginDto, RefreshDto, VerifyEmailDto, VerifyPhoneDto,
  ForgotPasswordDto, ResetPasswordDto, OAuthDto, GoogleLoginDto,
  TwoFactorEnableDto, TwoFactorVerifyDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Request } from 'express';

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Creer un compte (traveler / owner / agency)' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip || '', String(req.headers['user-agent'] || ''));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: any) {
    return user;
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Post('oauth')
  async oauth(@Body() dto: OAuthDto) {
    return this.authService.oauthLogin(dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion Google : jeton d identite verifie aupres de Google' })
  async google(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.credential);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  async verifyPhone(@Body() dto: VerifyPhoneDto) {
    return this.authService.verifyPhone(dto.phone, dto.code);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async enable2FA(@CurrentUser('id') userId: string, @Body() dto: TwoFactorEnableDto) {
    return this.twoFactorService.enable(userId, dto.method);
  }

  @Post('2fa/verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verify2FA(@CurrentUser('id') userId: string, @Body() dto: TwoFactorVerifyDto) {
    return this.twoFactorService.verify(userId, dto.code);
  }
}

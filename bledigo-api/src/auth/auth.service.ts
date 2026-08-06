import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, OAuthDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '../common/enums';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email deja utilise');

    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role || UserRole.traveler,
        status: UserStatus.active,
      },
    });

    // Creer le passeport correspondant
    if (user.role === UserRole.traveler) {
      await this.prisma.travelerPassport.create({ data: { userId: user.id } });
    } else if (user.role === UserRole.owner) {
      await this.prisma.ownerPassport.create({ data: { userId: user.id } });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    if (user.status === UserStatus.banned) {
      throw new UnauthorizedException('Compte suspendu definitivement');
    }
    if (user.status === UserStatus.suspended) {
      throw new UnauthorizedException('Compte temporairement suspendu');
    }

    // Log audit
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        ipAddress: ip,
        userAgent: userAgent || '',
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      return this.generateTokens(payload.sub, payload.email, payload.role);
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }
  }

  async logout(userId: string) {
    // Invalider le refresh token (blacklist Redis)
    return { success: true };
  }

  async oauthLogin(dto: OAuthDto) {
    // Implementation OAuth2 (Google, Facebook, Apple)
    // Verifier le token avec l'API du provider
    // Creer ou connecter l'utilisateur
    return { user: {}, accessToken: '', refreshToken: '' };
  }

  async verifyEmail(token: string) {
    // Verifier le token JWT de verification
    // Activer email_verified
    return { success: true };
  }

  async verifyPhone(phone: string, code: string) {
    // Verifier le code SMS (Twilio)
    // Activer phone_verified
    return { success: true };
  }

  async forgotPassword(email: string) {
    // Generer token, envoyer email
    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    // Verifier token, hasher nouveau mot de passe
    return { success: true };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }),
    ]);
    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}

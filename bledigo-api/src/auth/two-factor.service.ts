import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomInt } from 'crypto';

/**
 * 2FA simplifie : en dev le code est renvoye dans la reponse.
 * En prod, brancher Twilio (SMS) / SendGrid (email) ou TOTP (otplib).
 */
@Injectable()
export class TwoFactorService {
  private readonly codes = new Map<string, { code: string; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async enable(userId: string, method: string) {
    if (!['sms', 'email', 'totp'].includes(method)) {
      throw new BadRequestException('Methode 2FA invalide (sms | email | totp)');
    }
    const code = randomInt(100000, 999999).toString();
    this.codes.set(userId, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

    const devMode = !process.env.TWILIO_ACCOUNT_SID && !process.env.SENDGRID_API_KEY;
    return {
      success: true,
      method,
      ...(devMode ? { devCode: code, note: 'Mode dev : aucun SMS/email envoye' } : {}),
    };
  }

  async verify(userId: string, code: string) {
    const entry = this.codes.get(userId);
    if (!entry) throw new BadRequestException('Aucun code en attente');
    if (Date.now() > entry.expiresAt) {
      this.codes.delete(userId);
      throw new BadRequestException('Code expire');
    }
    if (entry.code !== code) throw new BadRequestException('Code invalide');
    this.codes.delete(userId);
    return { success: true, verified: true };
  }
}

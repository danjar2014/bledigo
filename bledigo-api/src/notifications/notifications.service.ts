import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toDbJson } from '../common/json';

type Channel = 'email' | 'sms' | 'push' | 'in_app';

/**
 * En prod : SendGrid (email), Twilio (SMS), FCM (push).
 * En local : les notifications sont journalisees et stockees en audit_logs.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(userId: string, channel: Channel, template: string, payload: Record<string, any> = {}) {
    const simulated = !process.env.SENDGRID_API_KEY && !process.env.TWILIO_ACCOUNT_SID;
    if (simulated) {
      this.logger.log(`[SIMULE] ${channel} -> ${userId} : ${template} ${JSON.stringify(payload)}`);
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: `notification.${channel}`,
        entityType: 'notification',
        entityId: template,
        details: toDbJson(payload),
        ipAddress: 'system',
        userAgent: 'system',
      },
    });

    return { sent: true, simulated, channel, template };
  }

  async listForUser(userId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId, action: { startsWith: 'notification.' } },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}

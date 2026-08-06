import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionType, SubscriptionStatus, Currency } from '../common/enums';

export const PLANS: Record<SubscriptionType, { price: number; currency: Currency; features: string[] }> = {
  [SubscriptionType.owner_pro]: {
    price: 29,
    currency: Currency.EUR,
    features: ['5 annonces', 'statistiques', 'badge Pro'],
  },
  [SubscriptionType.owner_premium]: {
    price: 79,
    currency: Currency.EUR,
    features: ['annonces illimitees', 'mise en avant', 'support prioritaire', 'certification acceleree'],
  },
  [SubscriptionType.agency]: {
    price: 199,
    currency: Currency.EUR,
    features: ['multi-comptes', 'API partenaire', 'gestionnaire dedie'],
  },
};

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  plans() {
    return Object.entries(PLANS).map(([type, p]) => ({ type, ...p, interval: 'month' }));
  }

  async subscribe(userId: string, type: SubscriptionType) {
    const plan = PLANS[type];
    if (!plan) throw new BadRequestException('Plan inconnu');

    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);

    const sub = await this.prisma.subscription.create({
      data: {
        userId,
        type,
        status: SubscriptionStatus.active,
        price: plan.price,
        currency: plan.currency,
        interval: 'month',
        stripeSubscriptionId: `sub_sim_${Date.now()}`,
        currentPeriodStart: now,
        currentPeriodEnd: end,
      },
    });

    await this.prisma.ownerPassport.updateMany({
      where: { userId },
      data: { subscriptionTier: type },
    });

    return sub;
  }

  async mine(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(userId: string, id: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { id, userId } });
    if (!sub) throw new BadRequestException('Abonnement non trouve');
    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.cancelled },
    });
  }
}

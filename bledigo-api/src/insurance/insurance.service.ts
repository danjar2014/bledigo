import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InsuranceType, InsuranceProvider, InsuranceStatus } from '../common/enums';

/** Taux de prime par type de garantie (% du montant de la reservation) */
const RATES: Record<InsuranceType, { rate: number; coverageMultiplier: number }> = {
  [InsuranceType.cancellation]: { rate: 0.05, coverageMultiplier: 1 },
  [InsuranceType.damage]: { rate: 0.03, coverageMultiplier: 2 },
  [InsuranceType.theft]: { rate: 0.02, coverageMultiplier: 1.5 },
  [InsuranceType.assistance]: { rate: 0.01, coverageMultiplier: 0.5 },
  [InsuranceType.liability]: { rate: 0.04, coverageMultiplier: 3 },
};

@Injectable()
export class InsuranceService {
  constructor(private readonly prisma: PrismaService) {}

  quote(totalPrice: number, type: InsuranceType) {
    const r = RATES[type];
    if (!r) throw new NotFoundException('Type de garantie inconnu');
    return {
      type,
      premiumAmount: Math.round(totalPrice * r.rate * 100) / 100,
      coverageAmount: Math.round(totalPrice * r.coverageMultiplier * 100) / 100,
    };
  }

  async quoteForBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Reservation non trouvee');
    return Object.keys(RATES).map((t) =>
      this.quote(Number(booking.totalPrice), t as InsuranceType),
    );
  }

  async subscribe(bookingId: string, type: InsuranceType) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Reservation non trouvee');
    const q = this.quote(Number(booking.totalPrice), type);

    const policy = await this.prisma.insurancePolicy.create({
      data: {
        bookingId,
        type,
        provider: InsuranceProvider.internal,
        premiumAmount: q.premiumAmount,
        coverageAmount: q.coverageAmount,
        status: InsuranceStatus.active,
      },
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        insuranceFee: { increment: q.premiumAmount },
        totalPrice: { increment: q.premiumAmount },
      },
    });

    return policy;
  }

  async findByBooking(bookingId: string) {
    return this.prisma.insurancePolicy.findMany({ where: { bookingId } });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SanctionType, UserStatus, ListingStatus, CertificationLevel } from '../common/enums';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [users, listings, bookings, disputes, revenue] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.listing.count({ where: { deletedAt: null } }),
      this.prisma.booking.count(),
      this.prisma.dispute.count({ where: { status: { in: ['pending', 'analysis', 'missing_docs'] } } }),
      this.prisma.payment.aggregate({ where: { status: 'captured' }, _sum: { amount: true } }),
    ]);

    const byStatus = await this.prisma.booking.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      users,
      listings,
      bookings,
      openDisputes: disputes,
      capturedRevenue: Number(revenue._sum.amount || 0),
      bookingsByStatus: byStatus,
    };
  }

  async moderateListing(id: string, status: ListingStatus) {
    return this.prisma.listing.update({ where: { id }, data: { status } });
  }

  async certify(listingId: string, level: CertificationLevel, adminId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Logement non trouve');

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await this.prisma.certification.create({
      data: {
        listingId,
        level,
        status: 'validated',
        validatedAt: new Date(),
        validatedBy: adminId,
        expiresAt,
      },
    });

    return this.prisma.listing.update({
      where: { id: listingId },
      data: { certificationLevel: level, certificationExpiresAt: expiresAt },
    });
  }

  async sanction(adminId: string, dto: { userId: string; type: SanctionType; reason: string; durationDays?: number }) {
    const statusMap: Record<string, UserStatus> = {
      [SanctionType.watch]: UserStatus.watched,
      [SanctionType.limit]: UserStatus.limited,
      [SanctionType.suspend]: UserStatus.suspended,
      [SanctionType.ban]: UserStatus.banned,
    };

    const sanction = await this.prisma.sanction.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        reason: dto.reason,
        durationDays: dto.durationDays,
        expiresAt: dto.durationDays ? new Date(Date.now() + dto.durationDays * 86400000) : null,
        appliedBy: adminId,
      },
    });

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { status: statusMap[dto.type] },
    });

    return sanction;
  }

  async auditLogs(page = 1, limit = 50) {
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);
    return { items, total, page, limit };
  }

  async scheduleControlVisit(agentId: string, dto: { listingId: string; scheduledAt: string }) {
    return this.prisma.controlVisit.create({
      data: {
        listingId: dto.listingId,
        agentId,
        scheduledAt: new Date(dto.scheduledAt),
        status: 'scheduled',
      },
    });
  }
}

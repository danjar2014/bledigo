import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SanctionType,
  UserStatus,
  ListingStatus,
  CertificationLevel,
  BookingStatus,
  PaymentStatus,
} from '../common/enums';
import { toDbJson } from '../common/json';
import { ScoringService } from '../ai/scoring.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
  ) {}

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

    const maj = await this.prisma.listing.update({
      where: { id: listingId },
      data: { certificationLevel: level, certificationExpiresAt: expiresAt },
    });

    await this.scoring.recalculer(listingId, 'certification');
    return maj;
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

  /**
   * Sanctions encore en vigueur, avec l etat du compte et ce qui reste a
   * honorer. Sans cette vue, une mesure conservatoire immobilise des fonds
   * indefiniment : rien ne la leve tout seul.
   */
  async activeSanctions() {
    const sanctions = await this.prisma.sanction.findMany({
      where: { revokedAt: null },
      orderBy: { appliedAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
        },
      },
    });

    // Le nombre de sejours restant a honorer conditionne la levee : c est lui
    // qui dit si le gel a encore un objet.
    const enrichies = await Promise.all(
      sanctions.map(async (s: (typeof sanctions)[number]) => ({
        ...s,
        reservationsEnCours: await this.prisma.booking.count({
          where: {
            ownerId: s.userId,
            status: {
              in: [BookingStatus.pending, BookingStatus.confirmed, BookingStatus.checked_in],
            },
          },
        }),
      })),
    );

    return enrichies;
  }

  /**
   * Leve une sanction. Le compte ne redevient actif que si aucune AUTRE
   * mesure ne pese encore sur lui, sans quoi on annulerait par effet de bord
   * une decision sans rapport.
   */
  async revokeSanction(adminId: string, sanctionId: string) {
    const sanction = await this.prisma.sanction.findUnique({ where: { id: sanctionId } });
    if (!sanction) throw new NotFoundException('Sanction non trouvee');
    if (sanction.revokedAt) throw new BadRequestException('Sanction deja levee');

    await this.prisma.sanction.update({
      where: { id: sanctionId },
      data: { revokedAt: new Date(), revokedBy: adminId },
    });

    const restantes = await this.prisma.sanction.count({
      where: { userId: sanction.userId, revokedAt: null },
    });

    if (restantes === 0) {
      await this.prisma.user.update({
        where: { id: sanction.userId },
        data: { status: UserStatus.active },
      });
      // Les annonces retirees de la diffusion par la mesure y reviennent.
      await this.prisma.listing.updateMany({
        where: { ownerId: sanction.userId, status: ListingStatus.under_review },
        data: { status: ListingStatus.active },
      });
    }

    return { revoked: true, compteReactive: restantes === 0, sanctionsRestantes: restantes };
  }

  /** Versements immobilises par une mesure conservatoire. */
  async heldPayments() {
    return this.prisma.payment.findMany({
      where: { status: PaymentStatus.held },
      orderBy: { heldAt: 'desc' },
      take: 100,
      include: {
        booking: {
          include: {
            listing: { select: { title: true, city: true } },
            owner: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
            traveler: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  /**
   * Denouement d un versement gele : soit vers l hote, soit vers le voyageur.
   * C est une decision humaine, jamais automatique — c est precisement ce que
   * la verification devait trancher.
   */
  async settleHeldPayment(
    adminId: string,
    paymentId: string,
    decision: 'release' | 'refund',
    motif: string,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Paiement non trouve');
    if (payment.status !== PaymentStatus.held) {
      throw new BadRequestException('Ce paiement n est pas en attente de decision');
    }

    const paye = decision === 'release';
    const maj = await this.prisma.payment.update({
      where: { id: paymentId },
      data: paye
        ? { status: PaymentStatus.captured, capturedAt: new Date() }
        : {
            status: PaymentStatus.refunded,
            refundedAt: new Date(),
            refundAmount: payment.amount,
            refundReason: motif,
          },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: paye ? 'payment.released' : 'payment.refunded',
        entityType: 'payment',
        entityId: paymentId,
        details: toDbJson({ motif, montant: payment.amount, bookingId: payment.bookingId }),
        ipAddress: 'admin',
        userAgent: 'admin',
      },
    });

    return maj;
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

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { DisputeStatus, PaymentStatus, BookingStatus } from '../common/enums';
import { CreateDisputeDto, AddEvidenceDto, DecideDisputeDto } from './dto';
import { toDbJson } from '../common/json';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async create(userId: string, dto: CreateDisputeDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException('Reservation non trouvee');

    const dispute = await this.prisma.dispute.create({
      data: {
        bookingId: dto.bookingId,
        initiatedBy: userId,
        type: dto.type,
        status: DisputeStatus.pending,
        description: dto.description,
      },
    });

    // Bloquer le paiement le temps de l'instruction
    if (booking.payment) {
      await this.prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: PaymentStatus.held },
      });
    }

    await this.prisma.booking.update({
      where: { id: dto.bookingId },
      data: { status: BookingStatus.disputed, disputeId: dispute.id },
    });

    return dispute;
  }

  async findOne(id: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { evidence: true, booking: { include: { listing: true, payment: true } } },
    });
    if (!dispute) throw new NotFoundException('Litige non trouve');
    return dispute;
  }

  async addEvidence(disputeId: string, userId: string, dto: AddEvidenceDto) {
    return this.prisma.disputeEvidence.create({
      data: {
        disputeId,
        uploadedBy: userId,
        type: dto.type,
        url: dto.url,
        description: dto.description,
      },
    });
  }

  /** Decision BlediGo : remboursement eventuel + sanctions */
  async decide(adminId: string, disputeId: string, dto: DecideDisputeDto) {
    const dispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: dto.status,
        resolutionNotes: dto.resolutionNotes,
        refundAmount: dto.refundAmount,
        decidedBy: adminId,
        decidedAt: new Date(),
        sanctions: toDbJson(dto.sanctions || []),
      },
      include: { booking: { include: { payment: true } } },
    });

    if (dto.refundAmount && dispute.booking.payment) {
      await this.payments.refund(dispute.booking.payment.id, dto.refundAmount);
    } else if (dto.status === DisputeStatus.rejected && dispute.booking.payment) {
      await this.payments.capture(dispute.booking.payment.id);
    }

    for (const sanction of dto.sanctions || []) {
      await this.prisma.sanction.create({
        data: {
          userId: sanction.userId,
          type: sanction.type,
          reason: sanction.reason,
          durationDays: sanction.durationDays,
          expiresAt: sanction.durationDays
            ? new Date(Date.now() + sanction.durationDays * 86400000)
            : null,
          appliedBy: adminId,
          evidence: toDbJson(sanction.evidence || {}),
        },
      });
    }

    await this.prisma.booking.update({
      where: { id: dispute.bookingId },
      data: { status: BookingStatus.completed },
    });

    return dispute;
  }

  async findAll(query: { status?: string; page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const where = query.status ? { status: query.status } : {};
    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { booking: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dispute.count({ where }),
    ]);
    return { items: disputes, total, page, limit };
  }
}

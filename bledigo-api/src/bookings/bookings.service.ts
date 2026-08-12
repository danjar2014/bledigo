import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, PaymentStatus, ValidationStatus, DisputeType, DisputeStatus } from '../common/enums';
import { CreateBookingDto, ValidateBookingDto, RefuseBookingDto } from './dto';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service';
import { toDbJson } from '../common/json';

/** Delai de validation post check-in, en minutes (regle metier BlediGo) */
const VALIDATION_WINDOW_MINUTES = 30;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antiFraud: AntiFraudService,
  ) {}

  async create(travelerId: string, dto: CreateBookingDto) {
    const listing = await this.prisma.listing.findUnique({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException('Logement non trouve');
    if (listing.ownerId === travelerId) {
      throw new BadRequestException('Impossible de reserver son propre logement');
    }

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);
    if (checkOut <= checkIn) throw new BadRequestException('checkOut doit etre apres checkIn');
    if (dto.guestsCount > listing.maxGuests) {
      throw new BadRequestException(`Capacite maximale : ${listing.maxGuests} voyageurs`);
    }

    // Verifier disponibilite (chevauchement de dates)
    const existing = await this.prisma.booking.findMany({
      where: {
        listingId: dto.listingId,
        status: { notIn: [BookingStatus.cancelled, BookingStatus.disputed] },
        AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }],
      },
    });
    if (existing.length > 0) throw new BadRequestException('Dates non disponibles');

    const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);
    const basePrice = Number(listing.pricePerNight) * totalNights;
    const cleaningFee = Number(listing.cleaningFee);
    const serviceFee = Number(listing.serviceFee);
    const totalPrice = basePrice + cleaningFee + serviceFee;

    const booking = await this.prisma.booking.create({
      data: {
        listingId: dto.listingId,
        travelerId,
        ownerId: listing.ownerId,
        checkIn,
        checkOut,
        guestsCount: dto.guestsCount,
        totalNights,
        basePrice,
        cleaningFee,
        serviceFee,
        totalPrice,
        currency: listing.currency,
        status: BookingStatus.pending,
        paymentStatus: PaymentStatus.pending,
        validationStatus: ValidationStatus.pending,
      },
      include: { listing: true },
    });

    return { booking, totalPrice, breakdown: { basePrice, cleaningFee, serviceFee, totalNights } };
  }

  async findMine(userId: string, role: 'traveler' | 'owner' = 'traveler') {
    return this.prisma.booking.findMany({
      where: role === 'owner' ? { ownerId: userId } : { travelerId: userId },
      include: { listing: { include: { photos: true } }, payment: true },
      orderBy: { checkIn: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, OR: [{ travelerId: userId }, { ownerId: userId }] },
      include: { listing: true, payment: true },
    });
    if (!booking) throw new NotFoundException('Reservation non trouvee');
    return booking;
  }

  async confirm(ownerId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id, ownerId } });
    if (!booking) throw new NotFoundException('Reservation non trouvee');
    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.confirmed },
    });
  }

  async cancel(userId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, OR: [{ travelerId: userId }, { ownerId: userId }] },
    });
    if (!booking) throw new NotFoundException('Reservation non trouvee');
    if ([BookingStatus.completed, BookingStatus.disputed].includes(booking.status as BookingStatus)) {
      throw new BadRequestException('Reservation non annulable a ce stade');
    }
    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.cancelled },
    });
  }

  /** Check-in declenche par le proprietaire : ouvre la fenetre de validation de 30 min */
  async checkIn(ownerId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, ownerId } });
    if (!booking) throw new NotFoundException('Reservation non trouvee');

    const validationDeadline = new Date(Date.now() + VALIDATION_WINDOW_MINUTES * 60 * 1000);
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.checked_in, validationDeadline },
    });
  }

  /** Validation du sejour par le voyageur : libere le paiement ou ouvre un litige */
  async validate(travelerId: string, bookingId: string, dto: ValidateBookingDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, travelerId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException('Reservation non trouvee');
    if (booking.validationStatus !== ValidationStatus.pending) {
      throw new BadRequestException('Validation deja effectuee');
    }

    // Delai depasse : auto-validation
    if (booking.validationDeadline && new Date() > booking.validationDeadline) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          validationStatus: ValidationStatus.auto_validated,
          status: BookingStatus.completed,
        },
      });
      await this.releasePayment(booking.payment?.id);
      return {
        booking: await this.prisma.booking.findUnique({ where: { id: bookingId } }),
        autoValidated: true,
      };
    }

    const allValid =
      dto.conform && dto.photosConform && dto.locationConform && dto.amenitiesPresent && dto.clean;

    if (allValid) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { validationStatus: ValidationStatus.validated, status: BookingStatus.completed },
      });
      await this.releasePayment(booking.payment?.id);
      await this.bumpPassports(booking.listingId, travelerId, booking.ownerId, booking.totalNights);
    } else {
      await this.openDispute(bookingId, travelerId, dto);
    }

    return { booking: await this.prisma.booking.findUnique({ where: { id: bookingId } }) };
  }

  /**
   * Refus du logement a l arrivee : la reservation est annulee et le paiement
   * rendu, sans arbitrage.
   *
   * Se distingue du litige, qui bloque les fonds le temps de l instruction.
   * Ici le voyageur repart : on ne peut lui demander ni d attendre, ni de
   * payer un logement qu il n occupera pas.
   *
   * La fenetre de 30 minutes ouverte au check-in est le garde-fou : passe ce
   * delai le sejour s auto-valide, on ne peut donc plus refuser apres avoir
   * occupe les lieux.
   */
  async refuse(travelerId: string, bookingId: string, dto: RefuseBookingDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, travelerId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException('Reservation non trouvee');

    if (booking.validationStatus !== ValidationStatus.pending) {
      throw new BadRequestException('Cette reservation a deja ete validee ou contestee');
    }
    if (booking.status !== BookingStatus.checked_in) {
      throw new BadRequestException(
        'Le refus n est possible qu a l arrivee, une fois le check-in fait par le proprietaire',
      );
    }
    if (booking.validationDeadline && new Date() > booking.validationDeadline) {
      throw new BadRequestException(
        'Le delai de verification est depasse : le sejour est auto-valide. Ouvrez un litige.',
      );
    }

    // Refuser un logement declare conforme n a pas de sens : le motif doit
    // exister, faute de quoi le refus serait inopposable au proprietaire.
    const motifs = (
      [
        ['conform', "le logement ne correspond pas a l annonce"],
        ['photosConform', 'les photos ne sont pas conformes'],
        ['locationConform', "l emplacement n est pas celui annonce"],
        ['amenitiesPresent', 'des equipements annonces sont absents'],
        ['clean', "le logement n est pas propre"],
      ] as const
    )
      .filter(([cle]) => !dto[cle])
      .map(([, libelle]) => libelle);

    if (motifs.length === 0) {
      throw new BadRequestException(
        'Indiquez au moins un critere non conforme pour refuser le logement',
      );
    }

    if (dto.reason) {
      await this.antiFraud.assertClean(travelerId, dto.reason, 'booking_refusal');
    }

    const [mise] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.cancelled,
          validationStatus: ValidationStatus.refused,
          validationData: toDbJson({
            refusedAt: new Date().toISOString(),
            criteria: {
              conform: dto.conform,
              photosConform: dto.photosConform,
              locationConform: dto.locationConform,
              amenitiesPresent: dto.amenitiesPresent,
              clean: dto.clean,
            },
            motifs,
            reason: dto.reason ?? null,
          }),
        },
      }),
      ...(booking.payment
        ? [
            this.prisma.payment.update({
              where: { id: booking.payment.id },
              data: {
                status: PaymentStatus.refunded,
                refundedAt: new Date(),
                refundAmount: booking.payment.amount,
                refundReason: `Logement refuse a l arrivee : ${motifs.join(', ')}`,
              },
            }),
          ]
        : []),
    ]);

    return { booking: mise, refunded: !!booking.payment, motifs };
  }

  private async releasePayment(paymentId?: string) {
    if (!paymentId) return;
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.captured, capturedAt: new Date() },
    });
  }

  /** Litige automatique quand un critere de conformite echoue */
  private async openDispute(bookingId: string, travelerId: string, dto: ValidateBookingDto) {
    const type = !dto.locationConform
      ? DisputeType.false_location
      : !dto.clean
        ? DisputeType.dirty
        : !dto.amenitiesPresent
          ? DisputeType.missing_amenities
          : DisputeType.non_conform;

    const dispute = await this.prisma.dispute.create({
      data: {
        bookingId,
        initiatedBy: travelerId,
        type,
        status: DisputeStatus.pending,
        description: dto.comment || 'Litige ouvert automatiquement suite a la validation du sejour',
      },
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.disputed,
        validationStatus: ValidationStatus.disputed,
        disputeId: dispute.id,
      },
    });

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (booking?.payment) {
      await this.prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: PaymentStatus.held },
      });
    }

    return dispute;
  }

  private async bumpPassports(listingId: string, travelerId: string, ownerId: string, nights: number) {
    await Promise.all([
      this.prisma.travelerPassport.updateMany({
        where: { userId: travelerId },
        data: { totalStays: { increment: 1 }, totalNights: { increment: nights } },
      }),
      this.prisma.ownerPassport.updateMany({
        where: { userId: ownerId },
        data: { totalBookings: { increment: 1 } },
      }),
      this.prisma.listing.update({
        where: { id: listingId },
        data: { totalBookings: { increment: 1 } },
      }),
      this.prisma.listingPassport.updateMany({
        where: { listingId },
        data: { stayCount: { increment: 1 } },
      }),
    ]);
  }
}

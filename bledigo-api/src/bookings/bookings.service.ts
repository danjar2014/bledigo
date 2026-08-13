import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BookingStatus,
  PaymentStatus,
  ValidationStatus,
  UserStatus,
  DisputeType,
  DisputeStatus,
} from '../common/enums';
import { CreateBookingDto, ValidateBookingDto, RefuseBookingDto } from './dto';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service';
import { RefusalGuardService } from './refusal-guard.service';
import { CalendarService } from '../listings/calendar.service';
import { ScoringService } from '../ai/scoring.service';
import { toDbJson } from '../common/json';
import { paiementEnLigne, coordonneesAutorisees } from '../common/mode-plateforme';

/** Delai de validation post check-in, en minutes (regle metier BlediGo) */
const VALIDATION_WINDOW_MINUTES = 30;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly antiFraud: AntiFraudService,
    private readonly refusalGuard: RefusalGuardService,
    private readonly calendar: CalendarService,
    private readonly scoring: ScoringService,
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

    // Horizon de reservation : l hote refuse les demandes trop lointaines, pour
    // ne pas bloquer un logement des mois a l avance. Rien a voir avec
    // maxNights, qui borne la duree du sejour et non son eloignement.
    if (listing.bookingHorizonDays != null) {
      const limite = new Date();
      limite.setDate(limite.getDate() + listing.bookingHorizonDays);
      if (checkIn > limite) {
        throw new BadRequestException(
          `Ce logement n accepte pas de reservation au-dela de ${listing.bookingHorizonDays} jours`,
        );
      }
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

    // Le calendrier de l hote ferme des dates que les reservations ne couvrent
    // pas : usage personnel, travaux, saison morte.
    const ferme = await this.prisma.listingCalendar.findFirst({
      where: {
        listingId: dto.listingId,
        blocked: true,
        AND: [{ startDate: { lt: checkOut } }, { endDate: { gt: checkIn } }],
      },
    });
    if (ferme) throw new BadRequestException('Le proprietaire a ferme ces dates');

    // Tarification nuit par nuit : une periode saisonniere peut ne couvrir
    // qu une partie du sejour, le prix de base s applique ailleurs.
    const tarification = await this.calendar.tarifer(dto.listingId, checkIn, checkOut);
    const totalNights = tarification.nuits;

    if (totalNights < tarification.minNights) {
      throw new BadRequestException(
        `Sejour minimum de ${tarification.minNights} nuits sur cette periode`,
      );
    }

    const basePrice = tarification.basePrice;
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
        // Reservation instantanee : l hote a coche la case, il renonce donc a
        // valider chaque demande et la reservation est acceptee d emblee. Sans
        // elle, la demande attend son accord — c est cet accord qui declenche
        // l echange des coordonnees.
        status: listing.instantBook ? BookingStatus.confirmed : BookingStatus.pending,
        paymentStatus: PaymentStatus.pending,
        validationStatus: ValidationStatus.pending,
      },
      include: { listing: true },
    });

    return {
      booking,
      totalPrice,
      breakdown: { basePrice, cleaningFee, serviceFee, totalNights },
      /** Le front s en sert pour ne pas appeler la route de paiement en vain. */
      paiementEnLigne: paiementEnLigne(),
    };
  }

  async findMine(userId: string, role: 'traveler' | 'owner' = 'traveler') {
    const bookings = await this.prisma.booking.findMany({
      where: role === 'owner' ? { ownerId: userId } : { travelerId: userId },
      include: {
        listing: { include: { photos: true } },
        payment: true,
        owner: {
          select: {
            firstName: true, lastName: true, phone: true, email: true,
            contactChannel: true, whatsappNumber: true,
          },
        },
        traveler: {
          select: {
            firstName: true, lastName: true, phone: true, email: true,
            contactChannel: true, whatsappNumber: true,
          },
        },
      },
      orderBy: { checkIn: 'desc' },
    });

    return bookings.map((b) => this.avecContact(b, role));
  }

  /**
   * En paiement direct, les deux parties reglent entre elles : elles doivent
   * donc pouvoir se joindre. Les coordonnees ne sont revelees qu APRES
   * acceptation par l hote — avant, le filtre anti-fraude continue de proteger
   * du demarchage et de l aspiration de contacts.
   */
  private avecContact(booking: any, role: 'traveler' | 'owner') {
    const acceptee = [
      BookingStatus.confirmed,
      BookingStatus.checked_in,
      BookingStatus.validated,
      BookingStatus.completed,
    ].includes(booking.status as BookingStatus);

    const contrepartie = role === 'owner' ? booking.traveler : booking.owner;
    const visible = coordonneesAutorisees(acceptee);

    // Canal choisi par la personne a joindre, pas par celle qui regarde.
    const canal = contrepartie?.contactChannel === 'whatsapp' ? 'whatsapp' : 'phone';
    // Beaucoup d hotes utilisent leur numero principal sur WhatsApp sans en
    // renseigner un second : on y retombe plutot que de n afficher aucun moyen
    // de joindre, ce qui viderait de son sens tout le paiement direct.
    const numero =
      (canal === 'whatsapp' ? contrepartie?.whatsappNumber ?? contrepartie?.phone : contrepartie?.phone) ??
      null;

    return {
      ...booking,
      owner: undefined,
      traveler: undefined,
      /** Renseigne uniquement quand l echange direct est autorise. */
      contact: visible
        ? {
            nom: `${contrepartie?.firstName ?? ''} ${contrepartie?.lastName ?? ''}`.trim(),
            canal,
            numero,
            email: contrepartie?.email ?? null,
            role: role === 'owner' ? 'voyageur' : 'hote',
          }
        : null,
      /** L interface adapte son vocabulaire et ses boutons a partir de ceci. */
      paiementEnLigne: paiementEnLigne(),
    };
  }

  async findOne(userId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, OR: [{ travelerId: userId }, { ownerId: userId }] },
      include: {
        listing: true,
        payment: true,
        owner: {
          select: {
            firstName: true, lastName: true, phone: true, email: true,
            contactChannel: true, whatsappNumber: true,
          },
        },
        traveler: {
          select: {
            firstName: true, lastName: true, phone: true, email: true,
            contactChannel: true, whatsappNumber: true,
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Reservation non trouvee');
    return this.avecContact(booking, booking.ownerId === userId ? 'owner' : 'traveler');
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
      await this.releasePayment(booking.payment?.id, booking.ownerId);
      await this.scoring.recalculer(booking.listingId, 'validation_automatique');
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
      await this.releasePayment(booking.payment?.id, booking.ownerId);
      await this.bumpPassports(booking.listingId, travelerId, booking.ownerId, booking.totalNights);
      // Ce sejour etait peut-etre le dernier que l hote sous gel avait a honorer.
      await this.refusalGuard.cloturerSiPlusRien(booking.ownerId);
      await this.scoring.recalculer(booking.listingId, 'validation');
    } else {
      await this.openDispute(bookingId, travelerId, dto);
      await this.scoring.recalculer(booking.listingId, 'litige');
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

    await this.antiFraud.assertClean(travelerId, dto.reason, 'booking_refusal');

    // Un refus immediat n est pas credible : personne ne constate qu un
    // logement ne correspond pas a l annonce en quelques secondes. Ce delai
    // est le marqueur le moins contournable d un refus de complaisance.
    const ouvertureFenetre = booking.validationDeadline
      ? new Date(booking.validationDeadline).getTime() - VALIDATION_WINDOW_MINUTES * 60 * 1000
      : null;
    const secondesDepuisArrivee = ouvertureFenetre
      ? Math.round((Date.now() - ouvertureFenetre) / 1000)
      : null;

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
            reason: dto.reason,
            secondesDepuisArrivee,
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

    // Le controle vient APRES l enregistrement : le refus reste acquis au
    // voyageur meme s il declenche une sanction. On ne lui refuse pas une
    // protection au motif qu il pourrait en abuser.
    const verdict = await this.refusalGuard.evaluer(bookingId, travelerId, booking.ownerId);

    // Un refus est le fait le plus lourd pour la conformite : il dit qu un
    // voyageur a prefere repartir plutot que d occuper le logement annonce.
    await this.scoring.recalculer(booking.listingId, 'refus');

    return {
      booking: mise,
      refunded: !!booking.payment,
      motifs,
      /** Sanctions declenchees, pour que l interface puisse l annoncer sans detour. */
      sanctions: verdict.sanctions.map((s) => ({ userId: s.userId, type: s.type })),
      refusAnterieurs: verdict.refusVoyageur - 1,
    };
  }

  /**
   * Libere les fonds vers l hote — sauf si ses versements sont geles.
   *
   * Un hote sous mesure conservatoire continue d accueillir les voyageurs deja
   * reserves : les annuler punirait d abord ces voyageurs, qui n y sont pour
   * rien. Mais l argent reste bloque le temps de la verification. C est
   * exactement ce que fait Airbnb, qui suspend le versement sans couper le
   * compte tant que des sejours sont engages.
   *
   * Le paiement reste donc en `held` : ni rendu au voyageur, ni verse a l hote.
   */
  private async releasePayment(paymentId?: string, ownerId?: string) {
    if (!paymentId) return;

    if (ownerId) {
      const hote = await this.prisma.user.findUnique({ where: { id: ownerId } });
      const gele =
        hote?.status === UserStatus.limited || hote?.status === UserStatus.suspended;

      if (gele) {
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: PaymentStatus.held, heldAt: new Date() },
        });
        this.logger.warn(
          `Versement gele pour l hote ${ownerId} : fonds conserves jusqu a la fin de la verification`,
        );
        return;
      }
    }

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

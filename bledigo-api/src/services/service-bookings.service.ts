import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from './vehicles.service';
import { BookingStatus, ProviderStatus, ProviderType } from '../common/enums';
import { DemandeServiceDto } from './dto';
import { coordonneesAutorisees } from '../common/mode-plateforme';

/**
 * Demandes de prestation.
 *
 * Meme regle que pour un sejour, et pour la meme raison : les coordonnees ne
 * s echangent qu APRES acceptation. Avant, le filtre anti-desintermediation
 * protege du demarchage — un annuaire qui donnerait les numeros a la simple
 * consultation ne serait qu une liste de contacts a aspirer.
 */
@Injectable()
export class ServiceBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicles: VehiclesService,
  ) {}

  /**
   * Location proposee au voyageur APRES reservation de son sejour.
   *
   * Le rattachement au sejour n est pas decoratif : il donne les dates par
   * defaut, le lieu de prise en charge, et il evite qu une agence soit
   * sollicitee par quelqu un qui ne vient pas.
   */
  async demanderVoiture(travelerId: string, bookingId: string, dto: DemandeServiceDto) {
    const sejour = await this.prisma.booking.findFirst({
      where: { id: bookingId, travelerId },
      include: { listing: true },
    });
    if (!sejour) throw new NotFoundException('Reservation non trouvee');
    if (
      ![BookingStatus.confirmed, BookingStatus.checked_in].includes(sejour.status as BookingStatus)
    ) {
      throw new BadRequestException('Location proposee une fois le sejour accepte');
    }
    if (!dto.vehicleId) throw new BadRequestException('vehicleId requis');

    // Par defaut la location epouse le sejour, ce qui est le cas courant.
    const debut = dto.startDate ? new Date(dto.startDate) : new Date(sejour.checkIn);
    const fin = dto.endDate ? new Date(dto.endDate) : new Date(sejour.checkOut);

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, status: 'active', deletedAt: null },
      include: { provider: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicule non trouve');
    if (vehicle.provider.status !== ProviderStatus.active) {
      throw new BadRequestException('Agence indisponible');
    }

    // Verification a l instant de la demande, pas seulement a l affichage : la
    // liste consultee peut avoir plusieurs minutes.
    const proposables = await this.vehicles.disponiblesPour(
      sejour.listing.latitude,
      sejour.listing.longitude,
      debut,
      fin,
    );
    if (!proposables.some((v) => v.id === vehicle.id)) {
      throw new BadRequestException('Ce vehicule n est plus disponible sur ces dates');
    }

    const tarif = await this.vehicles.tarifer(vehicle.id, debut, fin);

    return this.prisma.serviceBooking.create({
      data: {
        providerId: vehicle.providerId,
        type: ProviderType.location_voiture,
        bookingId: sejour.id,
        listingId: sejour.listingId,
        vehicleId: vehicle.id,
        requesterId: travelerId,
        startDate: debut,
        endDate: fin,
        price: tarif.prix,
        currency: sejour.currency,
        note: dto.note,
      },
    });
  }

  /**
   * Vehicules proposables au voyageur pour SON sejour.
   *
   * L offre n apparait qu apres acceptation du sejour : proposer une voiture
   * pour une demande encore en attente promettrait un voyage qui n aura
   * peut-etre pas lieu, et exposerait les agences a des demandes fantomes.
   */
  async voituresPourSejour(travelerId: string, bookingId: string) {
    const sejour = await this.prisma.booking.findFirst({
      where: { id: bookingId, travelerId },
      include: { listing: true },
    });
    if (!sejour) throw new NotFoundException('Reservation non trouvee');
    if (
      ![BookingStatus.confirmed, BookingStatus.checked_in].includes(sejour.status as BookingStatus)
    ) {
      return { disponible: false, motif: 'Sejour pas encore accepte', vehicules: [] };
    }

    const vehicules = await this.vehicles.disponiblesPour(
      sejour.listing.latitude,
      sejour.listing.longitude,
      new Date(sejour.checkIn),
      new Date(sejour.checkOut),
    );
    return {
      disponible: true,
      lieu: { ville: sejour.listing.city, region: sejour.listing.region },
      duJour: sejour.checkIn,
      auJour: sejour.checkOut,
      vehicules,
    };
  }

  /** Menage ou entretien demande par l hote pour un de ses logements. */
  async demanderMenage(ownerId: string, listingId: string, dto: DemandeServiceDto) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, ownerId, deletedAt: null },
    });
    if (!listing) throw new NotFoundException('Logement non trouve');
    if (!dto.providerId) throw new BadRequestException('providerId requis');
    if (!dto.startDate) throw new BadRequestException('startDate requis');

    const provider = await this.prisma.serviceProvider.findFirst({
      where: { id: dto.providerId, type: ProviderType.menage, status: ProviderStatus.active },
    });
    if (!provider) throw new NotFoundException('Prestataire non trouve');

    const debut = new Date(dto.startDate);
    const fin = dto.endDate ? new Date(dto.endDate) : new Date(debut.getTime() + 2 * 60 * 60 * 1000);

    return this.prisma.serviceBooking.create({
      data: {
        providerId: provider.id,
        type: ProviderType.menage,
        listingId: listing.id,
        requesterId: ownerId,
        startDate: debut,
        endDate: fin,
        // Le tarif d un menage se convient entre les parties : la plateforme
        // n encaisse rien et n a aucune raison d imposer un prix.
        price: 0,
        currency: listing.currency,
        note: dto.note,
      },
    });
  }

  /** Demandes recues par le prestataire connecte. */
  async mesDemandes(userId: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Aucun compte prestataire pour cet utilisateur');

    const demandes = await this.prisma.serviceBooking.findMany({
      where: { providerId: provider.id },
      include: {
        vehicle: true,
        requester: { select: { firstName: true, lastName: true, phone: true, email: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return demandes.map((d) => this.avecContact(d, d.requester));
  }

  /** Demandes emises par l utilisateur connecte, voyageur ou hote. */
  async mesCommandes(userId: string) {
    const demandes = await this.prisma.serviceBooking.findMany({
      where: { requesterId: userId },
      include: {
        vehicle: true,
        provider: {
          include: { user: { select: { firstName: true, lastName: true, phone: true, email: true } } },
        },
      },
      orderBy: { startDate: 'desc' },
    });
    return demandes.map((d) => this.avecContact(d, d.provider?.user));
  }

  private avecContact(demande: any, contrepartie: any) {
    const acceptee = ['confirmed', 'completed'].includes(demande.status);
    const visible = coordonneesAutorisees(acceptee);
    return {
      ...demande,
      requester: undefined,
      contact: visible
        ? {
            nom: `${contrepartie?.firstName ?? ''} ${contrepartie?.lastName ?? ''}`.trim(),
            telephone: contrepartie?.phone ?? null,
            email: contrepartie?.email ?? null,
          }
        : null,
    };
  }

  private async demandeDuPrestataire(userId: string, id: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { userId } });
    if (!provider) throw new ForbiddenException('Aucun compte prestataire');
    const demande = await this.prisma.serviceBooking.findFirst({
      where: { id, providerId: provider.id },
    });
    if (!demande) throw new NotFoundException('Demande non trouvee');
    return demande;
  }

  async accepter(userId: string, id: string) {
    const demande = await this.demandeDuPrestataire(userId, id);
    if (demande.status !== 'pending') throw new BadRequestException('Demande deja traitee');
    return this.prisma.serviceBooking.update({
      where: { id },
      data: { status: 'confirmed', contactSharedAt: new Date() },
    });
  }

  async refuser(userId: string, id: string, motif?: string) {
    const demande = await this.demandeDuPrestataire(userId, id);
    if (demande.status !== 'pending') throw new BadRequestException('Demande deja traitee');
    return this.prisma.serviceBooking.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelledBy: userId, note: motif },
    });
  }

  /** Annulation par le demandeur, tant que la prestation n a pas eu lieu. */
  async annuler(userId: string, id: string) {
    const demande = await this.prisma.serviceBooking.findFirst({
      where: { id, requesterId: userId },
    });
    if (!demande) throw new NotFoundException('Demande non trouvee');
    if (demande.status === 'completed') throw new BadRequestException('Prestation deja effectuee');
    return this.prisma.serviceBooking.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelledBy: userId },
    });
  }
}

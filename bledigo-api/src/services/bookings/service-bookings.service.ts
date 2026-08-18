import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { BookingStatus, ProviderStatus, ProviderType } from '../../common/enums';
import { DemandeServiceDto, DemandeMenageDto } from '../dto';
import { coordonneesAutorisees } from '../../common/mode-plateforme';
import { findLocality } from '../../common/localities';

/**
 * Demandes de prestation.
 *
 * Meme regle que pour un sejour, et pour la meme raison : les coordonnees ne
 * s echangent qu APRES acceptation. Avant, le filtre anti-desintermediation
 * protege du demarchage — un annuaire qui donnerait les numeros a la simple
 * consultation ne serait qu une liste de contacts a aspirer.
 */

/**
 * Propositions de tarif admises sur une demande de menage, les deux camps
 * confondus. Trois suffisent a converger : proposition, contre-proposition,
 * dernier mot. Au-dela, ce n est plus une negociation mais une demande qui
 * n aboutit pas, et le prestataire garde un creneau libre pour rien.
 */
const TOURS_DE_NEGOCIATION = 3;

/**
 * Dates acceptees en un seul envoi.
 *
 * Assez pour couvrir un mois de rotations, pas assez pour qu une erreur de
 * saisie envoie cent demandes a quelqu un qui n en attendait aucune.
 */
const MAX_DATES_PAR_DEMANDE = 12;
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
      findLocality(sejour.listing.city)?.slug,
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
      findLocality(sejour.listing.city)?.slug,
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
  /**
   * Dates auxquelles un menage a du sens : les departs a venir.
   *
   * Un menage suit un depart. Demander a l hote de ressaisir des dates que la
   * plateforme connait deja, c est lui faire recopier son propre calendrier et
   * lui offrir une occasion de se tromper d un jour.
   */
  async datesSuggerees(ownerId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, ownerId, deletedAt: null },
      select: { id: true, city: true, region: true },
    });
    if (!listing) throw new NotFoundException('Logement non trouve');

    const sejours = await this.prisma.booking.findMany({
      where: {
        listingId: listing.id,
        status: { notIn: [BookingStatus.cancelled] },
        // Un depart deja passe n appelle plus de menage a programmer : s il n a
        // pas ete fait, il ne se planifie pas dans le passe.
        checkOut: { gte: new Date() },
      },
      select: { id: true, checkOut: true, guestsCount: true },
      orderBy: { checkOut: 'asc' },
      take: 20,
    });

    return {
      ville: listing.city,
      region: listing.region,
      departs: sejours.map((b) => ({
        bookingId: b.id,
        date: b.checkOut,
        voyageurs: b.guestsCount,
      })),
    };
  }

  /**
   * Demande de menage sur une ou plusieurs dates.
   *
   * Chaque date donne une prestation DISTINCTE, et ce n est pas un detail
   * d implementation : un prestataire peut etre libre mardi et pris jeudi, et
   * une demande groupee l obligerait a tout refuser pour une seule date qui ne
   * lui convient pas. Elles se negocient et s acceptent separement.
   */
  async demanderMenage(ownerId: string, listingId: string, dto: DemandeMenageDto) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, ownerId, deletedAt: null },
    });
    if (!listing) throw new NotFoundException('Logement non trouve');
    if (!dto.providerId) throw new BadRequestException('providerId requis');

    // Retro-compatibilite : les appels d avant le multi-dates envoyaient
    // startDate/endDate. On les accepte plutot que de casser un client deja
    // deploye.
    const dates = dto.dates?.length
      ? dto.dates
      : dto.startDate
        ? [dto.startDate.slice(0, 10)]
        : [];
    if (!dates.length) throw new BadRequestException('Au moins une date d intervention est requise');
    if (dates.length > MAX_DATES_PAR_DEMANDE) {
      throw new BadRequestException(
        `${MAX_DATES_PAR_DEMANDE} dates au maximum par envoi : au-dela, c est un contrat, pas une demande`,
      );
    }

    const provider = await this.prisma.serviceProvider.findFirst({
      where: { id: dto.providerId, type: ProviderType.menage, status: ProviderStatus.active },
    });
    if (!provider) throw new NotFoundException('Prestataire non trouve');

    const heureDebut = dto.startTime || (dto.startDate ? dto.startDate.slice(11, 16) : '') || '10:00';
    const heureFin = dto.endTime || (dto.endDate ? dto.endDate.slice(11, 16) : '') || '12:00';

    const creees: any[] = [];
    for (const jour of dates) {
      const debut = new Date(`${jour.slice(0, 10)}T${heureDebut}:00.000Z`);
      const fin = new Date(`${jour.slice(0, 10)}T${heureFin}:00.000Z`);
      if (fin <= debut) throw new BadRequestException('La fin du creneau doit suivre son debut');

      creees.push(
        await this.prisma.serviceBooking.create({
          data: {
            providerId: provider.id,
            type: ProviderType.menage,
            listingId: listing.id,
            requesterId: ownerId,
            startDate: debut,
            endDate: fin,
            // La plateforme n encaisse toujours rien : `price` reste a 0 tant
            // que rien n est convenu, et l acceptation y recopie le montant
            // retenu. Ce qui change, c est qu il y a quelque chose a retenir.
            price: 0,
            proposedPrice: dto.proposedPrice ?? null,
            currency: listing.currency,
            // La ville et le gouvernorat viennent du LOGEMENT, jamais du corps
            // de la requete : les accepter du client permettrait d annoncer une
            // zone qui n est pas celle du bien, et de faire deplacer quelqu un
            // pour rien. Le quartier, lui, n existe pas sur l annonce.
            city: listing.city,
            region: listing.region,
            district: dto.district ?? null,
            addressHint: dto.addressHint ?? null,
            note: dto.note,
          },
        }),
      );
    }

    return { creees: creees.length, demandes: creees };
  }

  /**
   * Contre-proposition de tarif.
   *
   * Les deux parties passent par ici, et le sens se deduit de l appelant comme
   * pour les avis : le laisser choisir permettrait a un prestataire de repondre
   * au nom de son client.
   *
   * `negotiationRound` borne les allers-retours. Sans borne, une demande reste
   * ouverte indefiniment et le prestataire ne sait jamais s il doit garder le
   * creneau libre.
   */
  async contreProposer(userId: string, id: string, price: number, message?: string) {
    const demande = await this.prisma.serviceBooking.findFirst({
      where: { id, OR: [{ requesterId: userId }, { provider: { userId } }] },
      include: { provider: true },
    });
    if (!demande) throw new NotFoundException('Demande non trouvee');

    if (demande.type !== ProviderType.menage) {
      throw new BadRequestException(
        'La negociation ne concerne que le menage : une location est tarifee par le calendrier du vehicule',
      );
    }
    // Une demande acceptee ne se renegocie pas. C est le pendant du prix fige
    // d une extension de sejour : ce qui a ete accepte l a ete a un montant, et
    // le rouvrir permettrait d en changer les termes apres coup.
    if (demande.status !== 'pending') {
      throw new BadRequestException('Demande deja traitee, le tarif est fige');
    }
    if (demande.negotiationRound >= TOURS_DE_NEGOCIATION) {
      throw new BadRequestException(
        `Negociation close apres ${TOURS_DE_NEGOCIATION} propositions : acceptez ou refusez`,
      );
    }

    const parLePrestataire = demande.provider.userId === userId;
    return this.prisma.serviceBooking.update({
      where: { id },
      data: {
        // Chaque camp garde sa colonne : le prestataire ecrit `counterPrice`,
        // l hote revient sur `proposedPrice`. Le dernier chiffre de chacun
        // reste ainsi lisible sans reconstituer un historique.
        ...(parLePrestataire ? { counterPrice: price } : { proposedPrice: price }),
        counterAt: new Date(),
        negotiationRound: { increment: 1 },
        note: message ?? demande.note,
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
        // Sans les avis deja deposes, l interface proposerait de noter deux fois
        // et l API repondrait par une erreur — un bouton qui echoue vaut moins
        // qu un bouton absent.
        reviews: { select: { direction: true, rating: true } },
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
        reviews: { select: { direction: true, rating: true } },
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

  /**
   * Ce que le prestataire sait de son client AVANT d accepter.
   *
   * Jusqu ici il decidait a l aveugle : le nom n apparaissait qu une fois la
   * demande acceptee, c est-a-dire une fois la decision prise. Or c est
   * exactement au moment de decider qu il a besoin de savoir a qui il confie
   * une voiture ou les cles d un logement.
   *
   * La regle des coordonnees ne bouge pas pour autant : identite et historique
   * avant, telephone et email seulement apres acceptation. On donne de quoi
   * decider, pas de quoi demarcher — c est toute la difference entre un
   * annuaire et une place de marche.
   */
  async ficheClient(userId: string, demandeId: string) {
    const demande = await this.demandeDuPrestataire(userId, demandeId);

    const client = await this.prisma.user.findUnique({
      where: { id: demande.requesterId },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true, createdAt: true },
    });
    if (!client) throw new NotFoundException('Client non trouve');

    const [prestations, avisRecus, sinistres] = await Promise.all([
      this.prisma.serviceBooking.groupBy({
        by: ['status'],
        where: { requesterId: client.id },
        _count: true,
      }),
      // Uniquement les avis que des PRESTATAIRES ont laisses sur lui. Sa note
      // d hote ou de voyageur ne dit rien de la facon dont il rend une voiture.
      this.prisma.serviceReview.findMany({
        where: {
          direction: 'prestataire_vers_client',
          serviceBooking: { requesterId: client.id },
        },
        select: { rating: true },
      }),
      this.prisma.vehicleIncident.findMany({
        where: { serviceBooking: { requesterId: client.id } },
        select: { resolution: true, type: true, declaredAt: true },
        orderBy: { declaredAt: 'desc' },
      }),
    ]);

    const parStatut = (s: string) => prestations.find((p) => p.status === s)?._count ?? 0;
    const total = prestations.reduce((n, p) => n + p._count, 0);
    const note = avisRecus.length
      ? Math.round((avisRecus.reduce((s, a) => s + a.rating, 0) / avisRecus.length) * 10) / 10
      : null;

    const acceptee = ['confirmed', 'completed'].includes(demande.status);
    return {
      nom: `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim(),
      membreDepuis: client.createdAt,
      prestations: {
        total,
        terminees: parStatut('completed'),
        enCours: parStatut('confirmed'),
        annulees: parStatut('cancelled'),
      },
      note,
      avisRecus: avisRecus.length,
      sinistres: {
        total: sinistres.length,
        // Un sinistre conteste reste affiche : l information utile au
        // prestataire suivant est qu il y a eu desaccord, pas seulement qui a
        // eu gain de cause. Le masquer reviendrait a effacer la moitie du fait.
        etablis: sinistres.filter((s) => s.resolution === 'etabli').length,
        contestes: sinistres.filter((s) => s.resolution === 'conteste').length,
        derniers: sinistres.slice(0, 5),
      },
      // Meme frontiere que partout ailleurs : rien avant acceptation.
      contact: coordonneesAutorisees(acceptee)
        ? { telephone: client.phone ?? null, email: client.email }
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

  /**
   * Acceptation, par l une ou l autre partie.
   *
   * Symetrique de `contreProposer`, et pour la meme raison : apres un
   * aller-retour, c est l hote qui doit pouvoir accepter le chiffre du
   * prestataire. Une acceptation reservee au prestataire laisserait sa
   * contre-proposition sans issue — il ne peut pas accepter son propre prix.
   *
   * Le montant retenu est TOUJOURS le dernier chiffre de l AUTRE camp : on
   * n accepte que ce qu on n a pas ecrit soi-meme.
   */
  async accepter(userId: string, id: string) {
    const demande = await this.prisma.serviceBooking.findFirst({
      where: { id, OR: [{ requesterId: userId }, { provider: { userId } }] },
      include: { provider: true },
    });
    if (!demande) throw new NotFoundException('Demande non trouvee');
    if (demande.status !== 'pending') throw new BadRequestException('Demande deja traitee');

    const parLePrestataire = demande.provider.userId === userId;

    // Une location est tarifee par le calendrier du vehicule, pas negociee :
    // le client n a rien a y accepter, il a demande a ce prix-la.
    if (demande.type !== ProviderType.menage) {
      if (!parLePrestataire) throw new ForbiddenException('Seule l agence accepte une location');
      return this.prisma.serviceBooking.update({
        where: { id },
        data: { status: 'confirmed', contactSharedAt: new Date() },
      });
    }

    const retenu = parLePrestataire ? demande.proposedPrice : demande.counterPrice;
    if (retenu == null) {
      throw new BadRequestException(
        parLePrestataire
          ? 'Aucun tarif propose : contre-proposez un montant plutot que d accepter dans le vide'
          : 'Le prestataire n a pas encore propose de tarif',
      );
    }

    // Le montant est recopie dans `price` et fige : c est lui qui fait foi, et
    // plus les colonnes de negociation qui gardent seulement la trace du chemin.
    return this.prisma.serviceBooking.update({
      where: { id },
      data: { status: 'confirmed', contactSharedAt: new Date(), price: retenu },
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

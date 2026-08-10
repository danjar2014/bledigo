import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReverseSearchStatus,
  ReverseOfferStatus,
  BookingStatus,
  PaymentStatus,
  ValidationStatus,
  ReviewType,
  UserRole,
} from '../common/enums';
import { toDbJson } from '../common/json';
import { buildOwnerZone, filterByZone, matchesZone, type ZoneScope } from '../common/zone';
import { hasRole } from '../common/roles';
import { findLocality, resolveLocality } from '../common/localities';
import { buildOfferMessage } from '../common/offer-templates';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service';

/** Packs de credits pour l acces des proprietaires aux demandes. */
export const CREDIT_PACKAGES: Record<string, { credits: number; price: number }> = {
  starter: { credits: 10, price: 29 },
  pro: { credits: 50, price: 99 },
  unlimited: { credits: 9999, price: 299 },
};

const SEARCH_TTL_DAYS = 7;
const OFFER_TTL_HOURS = 48;

/** Recherche inversee : le voyageur publie son besoin, les proprietaires proposent. */
@Injectable()
export class ReverseSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antiFraud: AntiFraudService,
  ) {}

  async create(travelerId: string, dto: any) {
    const user = await this.prisma.user.findUnique({ where: { id: travelerId } });
    // Role effectif : un proprietaire ayant active le mode voyageur peut publier
    if (!hasRole(user, UserRole.traveler)) {
      throw new ForbiddenException(
        'Activez le mode voyageur pour publier une demande de location.',
      );
    }

    // Le voyageur ecrit librement son besoin : on refuse les coordonnees
    await this.antiFraud.assertClean(travelerId, dto.title, 'reverse_search_title');
    await this.antiFraud.assertClean(travelerId, dto.description, 'reverse_search_description');

    // La ville doit provenir du referentiel : c est ce qui rend le
    // rapprochement avec la zone des proprietaires fiable.
    const locality = this.resolveRequestLocality(dto);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SEARCH_TTL_DAYS);

    const reverseSearch = await this.prisma.reverseSearch.create({
      data: {
        travelerId,
        title: dto.title,
        description: dto.description,
        destination: locality.name,
        city: locality.name,
        region: locality.region,
        checkIn: new Date(dto.checkIn),
        checkOut: new Date(dto.checkOut),
        guestsCount: dto.guestsCount,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        requirements: toDbJson(dto.requirements || {}),
        amenitiesRequired: toDbJson(dto.amenitiesRequired || []),
        propertyTypes: toDbJson(dto.propertyTypes || []),
        certificationMin: dto.certificationMin,
        minTrustScore: dto.minTrustScore,
        status: ReverseSearchStatus.active,
        expiresAt,
      },
    });

    await this.notifyEligibleOwners(reverseSearch);
    return reverseSearch;
  }


  /**
   * Resout la localite d une demande contre le referentiel.
   * Accepte `citySlug` (selecteur), sinon `city` puis `destination`.
   */
  private resolveRequestLocality(dto: any) {
    const locality =
      findLocality(dto.citySlug) ??
      findLocality(dto.city) ??
      resolveLocality(dto.destination);

    if (!locality) {
      throw new BadRequestException(
        'Choisissez une destination dans la liste proposee : elle determine quels proprietaires verront votre demande.',
      );
    }
    return locality;
  }

  /**
   * Recherches du voyageur connecte.
   *
   * Il n existe volontairement aucune liste publique : les demandes
   * contiennent les dates et le budget du voyageur. Les proprietaires y
   * accedent uniquement via findAvailableForOwner, qui applique le perimetre
   * geographique ; le detail complet exige un deblocage.
   */
  async findAllForTraveler(travelerId: string, q: { status?: string; page?: number; limit?: number } = {}) {
    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 20;
    const where: any = { travelerId, ...(q.status ? { status: q.status } : {}) };

    const [items, total] = await Promise.all([
      this.prisma.reverseSearch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { offers: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reverseSearch.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  /**
   * Detail d une demande. Accessible au voyageur qui l a publiee, et aux
   * proprietaires dont la zone correspond (les offres restent masquees : elles
   * ne regardent que le voyageur).
   */
  async findOne(id: string, user: { id: string; role?: string; secondaryRoles?: unknown }) {
    const item = await this.prisma.reverseSearch.findUnique({
      where: { id },
      include: {
        offers: { include: { listing: true } },
        // Le proprietaire a besoin du passeport de confiance pour decider
        traveler: {
          select: {
            id: true,
            firstName: true,
            avatarUrl: true,
            travelerPassport: { select: { trustScore: true, totalStays: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Recherche non trouvee');

    const isAuthor = item.travelerId === user.id;

    if (!isAuthor) {
      const canHost = hasRole(user, UserRole.owner) || hasRole(user, UserRole.agency);
      if (!canHost) throw new ForbiddenException('Acces refuse');

      const listings = await this.prisma.listing.findMany({
        where: { ownerId: user.id, deletedAt: null },
        select: { city: true, region: true },
      });
      const zone = buildOwnerZone(listings);
      if (!matchesZone(item, zone)) {
        throw new ForbiddenException('Cette demande ne concerne pas votre zone.');
      }

      // Le detail complet est reserve aux demandes debloquees ou deja repondues
      if (!(await this.hasAccess(user.id, id))) {
        throw new ForbiddenException(
          'Ouvrez cette demande pour en voir le detail : elle sera debloquee definitivement.',
        );
      }
    }

    await this.prisma.reverseSearch.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // Les offres recues ne sont visibles que par le voyageur
    return isAuthor ? item : { ...item, offers: undefined };
  }

  /** Champs qu un voyageur peut corriger apres publication. */
  private static readonly EDITABLE = [
    'title',
    'description',
    'destination',
    'city',
    'region',
    'checkIn',
    'checkOut',
    'guestsCount',
    'bedrooms',
    'bathrooms',
    'budgetMin',
    'budgetMax',
    'certificationMin',
    'minTrustScore',
  ];

  /** Modification de sa propre demande, tant qu aucune offre n a ete acceptee. */
  async update(travelerId: string, id: string, dto: any) {
    const search = await this.prisma.reverseSearch.findUnique({ where: { id } });
    if (!search) throw new NotFoundException('Recherche non trouvee');
    if (search.travelerId !== travelerId) {
      throw new ForbiddenException('Vous n etes pas l auteur de cette demande');
    }
    if (search.status !== ReverseSearchStatus.active) {
      throw new BadRequestException('Cette demande n est plus modifiable');
    }

    await this.antiFraud.assertClean(travelerId, dto.title, 'reverse_search_title');
    await this.antiFraud.assertClean(travelerId, dto.description, 'reverse_search_description');

    const data: any = {};
    for (const key of ReverseSearchService.EDITABLE) {
      if (dto[key] === undefined) continue;
      if (key === 'city' || key === 'region' || key === 'destination') continue; // traites ensemble
      data[key] = key === 'checkIn' || key === 'checkOut' ? new Date(dto[key]) : dto[key];
    }

    // La localite se met a jour en bloc, toujours depuis le referentiel
    if (dto.citySlug !== undefined || dto.city !== undefined || dto.destination !== undefined) {
      const locality = this.resolveRequestLocality(dto);
      data.city = locality.name;
      data.region = locality.region;
      data.destination = locality.name;
    }
    if (dto.amenitiesRequired !== undefined) data.amenitiesRequired = toDbJson(dto.amenitiesRequired);
    if (dto.propertyTypes !== undefined) data.propertyTypes = toDbJson(dto.propertyTypes);
    if (dto.requirements !== undefined) data.requirements = toDbJson(dto.requirements);

    if (Object.keys(data).length === 0) return search;
    return this.prisma.reverseSearch.update({ where: { id }, data });
  }

  /** Retrait de la demande : les offres en attente sont rejetees. */
  async cancel(travelerId: string, id: string) {
    const search = await this.prisma.reverseSearch.findUnique({ where: { id } });
    if (!search) throw new NotFoundException('Recherche non trouvee');
    if (search.travelerId !== travelerId) {
      throw new ForbiddenException('Vous n etes pas l auteur de cette demande');
    }
    if (search.status === ReverseSearchStatus.fulfilled) {
      throw new BadRequestException('Une offre a deja ete acceptee sur cette demande');
    }

    await this.prisma.reverseOffer.updateMany({
      where: { reverseSearchId: id, status: ReverseOfferStatus.pending },
      data: { status: ReverseOfferStatus.rejected },
    });

    return this.prisma.reverseSearch.update({
      where: { id },
      data: { status: ReverseSearchStatus.cancelled },
    });
  }

  /** Recherches du voyageur connecte. */
  async findMine(travelerId: string) {
    return this.prisma.reverseSearch.findMany({
      where: { travelerId },
      include: { _count: { select: { offers: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Demandes visibles par le proprietaire, dans son perimetre.
   *
   * La consultation est gratuite : chaque demande est resumee tant qu elle n a
   * pas ete debloquee. Seul le deblocage coute un credit, une fois pour toutes.
   */
  async findAvailableForOwner(ownerId: string, query: any = {}) {
    // Perimetre : le proprietaire ne voit que les demandes la ou il possede un bien
    const ownerListings = await this.prisma.listing.findMany({
      where: { ownerId, deletedAt: null },
      select: { city: true, region: true },
    });
    const zone = buildOwnerZone(ownerListings);
    if (zone.regions.size === 0 && zone.cities.size === 0) {
      throw new ForbiddenException(
        'Publiez d abord une annonce : les demandes affichees sont celles de votre zone.',
      );
    }
    const scope: ZoneScope = query.scope === 'city' ? 'city' : 'region';

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const where: any = {
      status: ReverseSearchStatus.active,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };
    if (query.city) where.city = { contains: query.city };
    if (query.region) where.region = { contains: query.region };
    if (query.minBudget) where.budgetMin = { gte: Number(query.minBudget) };
    if (query.maxBudget) where.budgetMax = { lte: Number(query.maxBudget) };

    // Le filtre de zone porte sur des champs libres : il se fait en memoire,
    // apres un premier tri SQL. Volume attendu faible (demandes actives 7 jours).
    const candidates = await this.prisma.reverseSearch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        traveler: {
          select: {
            id: true,
            firstName: true,
            avatarUrl: true,
            travelerPassport: { select: { trustScore: true, totalStays: true } },
          },
        },
      },
    });

    const inZone = filterByZone(candidates as any, zone, scope) as typeof candidates;
    const total = inZone.length;
    const pageItems = inZone.slice((page - 1) * limit, page * limit);

    // Deja debloquees, ou deja repondues : acces definitif, sans nouveau credit
    const [unlocks, offers, credits] = await Promise.all([
      this.prisma.reverseSearchUnlock.findMany({
        where: { ownerId, reverseSearchId: { in: pageItems.map((s) => s.id) } },
        select: { reverseSearchId: true },
      }),
      this.prisma.reverseOffer.findMany({
        where: { ownerId, reverseSearchId: { in: pageItems.map((s) => s.id) } },
        select: { reverseSearchId: true },
      }),
      this.prisma.reverseSearchCredit.findUnique({ where: { userId: ownerId } }),
    ]);

    const opened = new Set([
      ...unlocks.map((u) => u.reverseSearchId),
      ...offers.map((o) => o.reverseSearchId),
    ]);
    const answered = new Set(offers.map((o) => o.reverseSearchId));

    // La consultation est gratuite : les demandes non debloquees sont resumees.
    const searches = pageItems.map((item) => {
      const isOpen = opened.has(item.id);
      return {
        ...item,
        unlocked: isOpen,
        answered: answered.has(item.id),
        // Aperçu suffisant pour decider, sans livrer le contenu paye
        description: isOpen ? item.description : ReverseSearchService.preview(item.description),
        traveler: isOpen
          ? item.traveler
          : { travelerPassport: item.traveler?.travelerPassport ?? null },
      };
    });

    return {
      searches,
      items: searches,
      total,
      page,
      limit,
      creditsRemaining: credits?.creditsRemaining ?? 0,
      lockedCount: searches.filter((s) => !s.unlocked).length,
      zone: {
        scope,
        regions: [...zone.regions],
        cities: [...zone.cities],
      },
    };
  }

  /** Resume affiche tant que la demande n est pas debloquee. */
  private static preview(text: string | null | undefined, max = 120) {
    if (!text) return '';
    return text.length <= max ? text : text.slice(0, max).trimEnd() + '...';
  }

  /**
   * Debloque une demande : un credit, une fois pour toutes.
   *
   * Le modele precedent facturait chaque consultation de la liste, ce qui
   * penalisait la simple navigation. Ici le proprietaire ne paie que les
   * demandes qu il decide reellement d etudier, et n est jamais debite deux
   * fois pour la meme.
   */
  async unlock(ownerId: string, reverseSearchId: string) {
    const existing = await this.prisma.reverseSearchUnlock.findUnique({
      where: { ownerId_reverseSearchId: { ownerId, reverseSearchId } },
    });
    if (existing) return { alreadyUnlocked: true, creditsSpent: 0 };

    // Une demande deja repondue reste accessible sans nouveau credit
    const offer = await this.prisma.reverseOffer.findFirst({
      where: { ownerId, reverseSearchId },
      select: { id: true },
    });
    if (offer) return { alreadyUnlocked: true, creditsSpent: 0 };

    const search = await this.prisma.reverseSearch.findUnique({ where: { id: reverseSearchId } });
    if (!search) throw new NotFoundException('Demande non trouvee');
    if (search.status !== ReverseSearchStatus.active) {
      throw new BadRequestException('Cette demande n est plus active');
    }

    // On ne facture jamais une demande hors perimetre
    const listings = await this.prisma.listing.findMany({
      where: { ownerId, deletedAt: null },
      select: { city: true, region: true },
    });
    const zone = buildOwnerZone(listings);
    if (!matchesZone(search, zone)) {
      throw new ForbiddenException('Cette demande ne concerne pas votre zone.');
    }

    const credits = await this.prisma.reverseSearchCredit.findUnique({ where: { userId: ownerId } });
    if (!credits || credits.creditsRemaining <= 0) {
      throw new ForbiddenException(
        'Credits insuffisants. Achetez des credits pour ouvrir cette demande.',
      );
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.reverseSearchUnlock.create({
        data: { ownerId, reverseSearchId, creditsSpent: 1 },
      }),
      this.prisma.reverseSearchCredit.update({
        where: { userId: ownerId },
        data: { creditsUsed: { increment: 1 }, creditsRemaining: { decrement: 1 } },
      }),
    ]);

    return {
      alreadyUnlocked: false,
      creditsSpent: 1,
      creditsRemaining: updated.creditsRemaining,
    };
  }

  /** Vrai si le proprietaire a deja acces a cette demande. */
  private async hasAccess(ownerId: string, reverseSearchId: string) {
    const [unlock, offer] = await Promise.all([
      this.prisma.reverseSearchUnlock.findUnique({
        where: { ownerId_reverseSearchId: { ownerId, reverseSearchId } },
        select: { id: true },
      }),
      this.prisma.reverseOffer.findFirst({
        where: { ownerId, reverseSearchId },
        select: { id: true },
      }),
    ]);
    return Boolean(unlock || offer);
  }

  /** Le proprietaire envoie une offre sur une demande. */
  async createOffer(ownerId: string, reverseSearchId: string, dto: any) {
    const search = await this.prisma.reverseSearch.findUnique({
      where: { id: reverseSearchId },
    });
    if (!search) throw new NotFoundException('Recherche non trouvee');
    if (search.status !== ReverseSearchStatus.active) {
      throw new BadRequestException('Cette recherche n est plus active');
    }
    if (search.expiresAt && search.expiresAt < new Date()) {
      throw new BadRequestException('Cette recherche a expire');
    }

    const listing = await this.prisma.listing.findFirst({
      where: { id: dto.listingId, ownerId },
    });
    if (!listing) throw new ForbiddenException('Vous ne possedez pas ce logement');

    if (search.guestsCount > listing.maxGuests) {
      throw new BadRequestException('Ce logement ne peut pas accueillir assez de voyageurs');
    }

    const conflict = await this.prisma.booking.findFirst({
      where: {
        listingId: dto.listingId,
        status: { notIn: [BookingStatus.cancelled, BookingStatus.disputed] },
        AND: [{ checkIn: { lte: search.checkOut } }, { checkOut: { gte: search.checkIn } }],
      },
    });
    if (conflict) {
      throw new BadRequestException('Ce logement n est pas disponible aux dates demandees');
    }

    // Le message provient exclusivement du catalogue : aucune saisie libre ne
    // peut transiter vers le voyageur. Une cle inconnue est un contournement.
    let composed: { message: string; keys: string[] };
    try {
      composed = buildOfferMessage(dto.messageKeys ?? dto.messageKey);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }

    // Defense en profondeur : si un client force un `message` libre, il est
    // analyse et refuse plutot qu ignore silencieusement.
    if (dto.message) {
      await this.antiFraud.assertClean(ownerId, String(dto.message), 'reverse_offer');
      throw new BadRequestException(
        'Le message libre n est plus accepte : composez votre offre a partir des messages proposes.',
      );
    }

    const offer = await this.prisma.reverseOffer.create({
      data: {
        reverseSearchId,
        listingId: dto.listingId,
        ownerId,
        proposedPrice: dto.proposedPrice,
        originalPrice: listing.pricePerNight,
        discountPercent:
          dto.discountPercent ??
          (listing.pricePerNight > 0
            ? Math.round(((listing.pricePerNight - dto.proposedPrice) / listing.pricePerNight) * 100)
            : null),
        message: composed.message,
        status: ReverseOfferStatus.pending,
        expiresAt: new Date(Date.now() + OFFER_TTL_HOURS * 60 * 60 * 1000),
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            certificationLevel: true,
            trustScore: true,
            avgRating: true,
            totalReviews: true,
            photos: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    });

    await this.prisma.reverseSearch.update({
      where: { id: reverseSearchId },
      data: { offerCount: { increment: 1 } },
    });

    // Repondre vaut acces : la demande reste consultable sans credit
    await this.prisma.reverseSearchUnlock
      .create({ data: { ownerId, reverseSearchId, creditsSpent: 0 } })
      .catch(() => undefined); // deja debloquee

    return offer;
  }

  /** Compatibilite : ancienne signature d envoi d offre. */
  async offer(ownerId: string, reverseSearchId: string, dto: any) {
    return this.createOffer(ownerId, reverseSearchId, dto);
  }

  /** Le voyageur consulte les offres recues, triees et filtrees. */
  async getOffersForTraveler(travelerId: string, reverseSearchId: string, query: any = {}) {
    const search = await this.prisma.reverseSearch.findFirst({
      where: { id: reverseSearchId, travelerId },
    });
    if (!search) throw new NotFoundException('Recherche non trouvee');

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const sortBy = query.sortBy || 'rating';

    // On montre aussi les offres contre-proposees : le voyageur doit voir
    // que sa negociation est en cours cote proprietaire.
    const where: any = {
      reverseSearchId,
      status: { in: [ReverseOfferStatus.pending, ReverseOfferStatus.countered] },
    };

    const orderBy: any =
      sortBy === 'rating'
        ? { listing: { avgRating: 'desc' } }
        : sortBy === 'price_asc'
          ? { proposedPrice: 'asc' }
          : sortBy === 'trust'
            ? { listing: { trustScore: 'desc' } }
            : { createdAt: 'desc' };

    const offers = await this.prisma.reverseOffer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
      include: {
        listing: {
          include: {
            photos: { where: { isPrimary: true }, take: 1 },
            owner: {
              select: {
                id: true,
                firstName: true,
                avatarUrl: true,
                ownerPassport: { select: { trustScore: true, totalBookings: true } },
              },
            },
            reviews: {
              where: { type: ReviewType.traveler_to_listing },
              select: { rating: true },
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    let filtered = offers;
    if (query.minRating) {
      filtered = filtered.filter((o) => Number(o.listing.avgRating) >= Number(query.minRating));
    }
    if (query.minTrustScore) {
      filtered = filtered.filter((o) => o.listing.trustScore >= Number(query.minTrustScore));
    }

    return {
      offers: filtered,
      items: filtered,
      total: filtered.length,
      page,
      limit,
      searchDetails: {
        title: search.title,
        destination: search.destination,
        checkIn: search.checkIn,
        checkOut: search.checkOut,
        guestsCount: search.guestsCount,
      },
    };
  }

  /**
   * Le voyageur accepte une offre : cree la reservation, rejette les autres offres.
   * `reverseSearchId` est optionnel (compatibilite avec l ancienne route).
   */
  async acceptOffer(travelerId: string, a: string, b?: string) {
    const offerId = b ?? a;
    const reverseSearchId = b ? a : undefined;

    const offer = await this.prisma.reverseOffer.findFirst({
      where: {
        id: offerId,
        status: ReverseOfferStatus.pending, // une offre contre-proposee attend le proprietaire
        ...(reverseSearchId ? { reverseSearchId } : {}),
      },
      include: { reverseSearch: true, listing: true },
    });
    if (!offer) throw new NotFoundException('Offre non trouvee ou expiree');
    if (offer.reverseSearch.travelerId !== travelerId) {
      throw new ForbiddenException('Cette offre ne vous est pas destinee');
    }
    if (offer.expiresAt && offer.expiresAt < new Date()) {
      throw new BadRequestException('Cette offre a expire');
    }

    const totalNights = Math.max(
      1,
      Math.ceil(
        (offer.reverseSearch.checkOut.getTime() - offer.reverseSearch.checkIn.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    const basePrice = offer.proposedPrice * totalNights;
    const totalPrice = basePrice + offer.listing.cleaningFee + offer.listing.serviceFee;

    const booking = await this.prisma.booking.create({
      data: {
        listingId: offer.listingId,
        travelerId,
        ownerId: offer.ownerId,
        checkIn: offer.reverseSearch.checkIn,
        checkOut: offer.reverseSearch.checkOut,
        guestsCount: offer.reverseSearch.guestsCount,
        totalNights,
        basePrice,
        cleaningFee: offer.listing.cleaningFee,
        serviceFee: offer.listing.serviceFee,
        totalPrice,
        currency: offer.listing.currency,
        status: BookingStatus.pending,
        paymentStatus: PaymentStatus.pending,
        validationStatus: ValidationStatus.pending,
      },
    });

    await this.prisma.reverseOffer.update({
      where: { id: offerId },
      data: { status: ReverseOfferStatus.accepted },
    });
    await this.prisma.reverseOffer.updateMany({
      where: {
        reverseSearchId: offer.reverseSearchId,
        id: { not: offerId },
        status: ReverseOfferStatus.pending,
      },
      data: { status: ReverseOfferStatus.rejected },
    });
    await this.prisma.reverseSearch.update({
      where: { id: offer.reverseSearchId },
      data: { status: ReverseSearchStatus.fulfilled },
    });

    return { booking, message: 'Reservation creee avec succes' };
  }


  /**
   * Negociation d une offre.
   *
   * Le statut porte le tour de parole :
   *  - `pending`   : la main est au voyageur (accepter, refuser, contre-proposer) ;
   *  - `countered` : la main est au proprietaire (accepter, refuser, recontrer).
   *
   * Quand le proprietaire accepte ou recontre, l offre repasse en `pending` :
   * c est toujours le voyageur qui valide en dernier, puisque c est lui qui
   * declenche la reservation et le paiement.
   */
  static readonly MAX_NEGOTIATION_ROUNDS = 3;

  /** Le voyageur refuse une offre. */
  async rejectOffer(travelerId: string, offerId: string) {
    const offer = await this.loadOfferForTraveler(travelerId, offerId);
    if (![ReverseOfferStatus.pending, ReverseOfferStatus.countered].includes(offer.status as any)) {
      throw new BadRequestException('Cette offre n est plus en cours');
    }
    return this.prisma.reverseOffer.update({
      where: { id: offerId },
      data: { status: ReverseOfferStatus.rejected },
    });
  }

  /** Le voyageur propose un autre montant : la main passe au proprietaire. */
  async counterOffer(travelerId: string, offerId: string, price: number) {
    const offer = await this.loadOfferForTraveler(travelerId, offerId);

    if (offer.status !== ReverseOfferStatus.pending) {
      throw new BadRequestException('Cette offre n attend pas votre reponse');
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new BadRequestException('Montant invalide');
    }
    if (price >= offer.proposedPrice) {
      throw new BadRequestException(
        'Votre contre-proposition doit etre inferieure au tarif propose.',
      );
    }
    if (offer.negotiationRound >= ReverseSearchService.MAX_NEGOTIATION_ROUNDS) {
      throw new BadRequestException(
        'Le nombre d echanges autorises est atteint : acceptez ou refusez cette offre.',
      );
    }
    if (offer.expiresAt && offer.expiresAt < new Date()) {
      throw new BadRequestException('Cette offre a expire');
    }

    return this.prisma.reverseOffer.update({
      where: { id: offerId },
      data: {
        status: ReverseOfferStatus.countered,
        counterPrice: price,
        counterAt: new Date(),
        negotiationRound: { increment: 1 },
      },
    });
  }

  /**
   * Le proprietaire repond a une contre-proposition.
   *  - `accept`  : il retient le montant du voyageur ;
   *  - `counter` : il propose un montant intermediaire ;
   *  - `reject`  : il met fin a la negociation.
   *
   * Dans les deux premiers cas l offre revient au voyageur pour validation.
   */
  async respondToCounter(
    ownerId: string,
    offerId: string,
    action: 'accept' | 'reject' | 'counter',
    price?: number,
  ) {
    const offer = await this.prisma.reverseOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offre non trouvee');
    if (offer.ownerId !== ownerId) {
      throw new ForbiddenException('Cette offre n est pas la votre');
    }
    if (offer.status !== ReverseOfferStatus.countered) {
      throw new BadRequestException('Cette offre n attend pas votre reponse');
    }

    if (action === 'reject') {
      return this.prisma.reverseOffer.update({
        where: { id: offerId },
        data: { status: ReverseOfferStatus.rejected },
      });
    }

    // Montant retenu : celui du voyageur, ou le compromis du proprietaire
    let finalPrice = offer.counterPrice ?? offer.proposedPrice;
    if (action === 'counter') {
      if (!Number.isFinite(price as number) || (price as number) <= 0) {
        throw new BadRequestException('Montant invalide');
      }
      const low = offer.counterPrice ?? 0;
      if ((price as number) <= low || (price as number) >= offer.proposedPrice) {
        throw new BadRequestException(
          'Votre compromis doit se situer entre la contre-proposition et votre tarif initial.',
        );
      }
      if (offer.negotiationRound >= ReverseSearchService.MAX_NEGOTIATION_ROUNDS) {
        throw new BadRequestException('Le nombre d echanges autorises est atteint.');
      }
      finalPrice = price as number;
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: offer.listingId },
      select: { pricePerNight: true },
    });
    const reference = listing?.pricePerNight ?? offer.originalPrice ?? finalPrice;

    return this.prisma.reverseOffer.update({
      where: { id: offerId },
      data: {
        // La main repasse au voyageur : c est lui qui valide et reserve
        status: ReverseOfferStatus.pending,
        proposedPrice: finalPrice,
        counterPrice: null,
        discountPercent:
          reference > 0 ? Math.round(((reference - finalPrice) / reference) * 100) : null,
        negotiationRound: action === 'counter' ? { increment: 1 } : undefined,
      },
    });
  }

  /** Offres du proprietaire en attente de sa reponse. */
  async myPendingCounters(ownerId: string) {
    return this.prisma.reverseOffer.findMany({
      where: { ownerId, status: ReverseOfferStatus.countered },
      include: {
        listing: { select: { id: true, title: true, city: true, pricePerNight: true } },
        reverseSearch: {
          select: {
            id: true,
            title: true,
            city: true,
            checkIn: true,
            checkOut: true,
            guestsCount: true,
          },
        },
      },
      orderBy: { counterAt: 'desc' },
    });
  }

  /** Charge une offre en verifiant que le voyageur en est bien le destinataire. */
  private async loadOfferForTraveler(travelerId: string, offerId: string) {
    const offer = await this.prisma.reverseOffer.findUnique({
      where: { id: offerId },
      include: { reverseSearch: { select: { travelerId: true } } },
    });
    if (!offer) throw new NotFoundException('Offre non trouvee');
    if (offer.reverseSearch.travelerId !== travelerId) {
      throw new ForbiddenException('Cette offre ne vous est pas destinee');
    }
    return offer;
  }

  /** Solde de credits du proprietaire. */
  async getCredits(userId: string) {
    const credits = await this.prisma.reverseSearchCredit.findUnique({ where: { userId } });
    return (
      credits ?? {
        userId,
        creditsTotal: 0,
        creditsUsed: 0,
        creditsRemaining: 0,
        lastPurchasedAt: null,
      }
    );
  }

  /** Achat d un pack de credits. */
  async purchaseCredits(userId: string, packageType: string) {
    const pkg = CREDIT_PACKAGES[packageType];
    if (!pkg) throw new BadRequestException('Package invalide');

    return this.prisma.reverseSearchCredit.upsert({
      where: { userId },
      update: {
        creditsTotal: { increment: pkg.credits },
        creditsRemaining: { increment: pkg.credits },
        lastPurchasedAt: new Date(),
      },
      create: {
        userId,
        creditsTotal: pkg.credits,
        creditsUsed: 0,
        creditsRemaining: pkg.credits,
        lastPurchasedAt: new Date(),
      },
    });
  }

  /**
   * Notifie les proprietaires disposant de credits et d un logement compatible.
   * TODO : brancher NotificationsService (evite une dependance circulaire pour l instant).
   */
  private async notifyEligibleOwners(_search: any): Promise<void> {
    return;
  }
}

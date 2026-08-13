import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingStatus, BookingStatus, ReviewType } from '../common/enums';
import { toDbJson } from '../common/json';
import { findLocality, resolveLocality } from '../common/localities';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service';
import { CreateListingDto, UpdateListingDto, QueryListingsDto } from './dto';

/** Champs qu un proprietaire peut modifier lui-meme. */
const EDITABLE_FIELDS = [
  'title',
  'description',
  'pricePerNight',
  'cleaningFee',
  'serviceFee',
  'securityDeposit',
  'maxGuests',
  'amenities',
  'houseRules',
  'checkInTime',
  'checkOutTime',
  'minNights',
  'maxNights',
  'instantBook',
  'bookingHorizonDays',
  'rentalProfile',
  'cancellationDeadlineDays',
  'shortenSurchargePercent',
] as const;

/** Champs sensibles : leur modification declenche une re-verification si sejours en cours. */
const CRITICAL_FIELDS = ['pricePerNight', 'maxGuests', 'address', 'latitude', 'longitude'];

/** Champs stockes en JSON (String sous sqlite, Json sous postgres). */
const JSON_FIELDS = ['amenities', 'houseRules', 'rules'];

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antiFraud: AntiFraudService,
  ) {}

  private slugify(title: string) {
    return (
      title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60) +
      '-' +
      Math.random().toString(36).slice(2, 8)
    );
  }

  async create(ownerId: string, dto: CreateListingDto & Record<string, any>) {
    // Une annonce est lue par tous les voyageurs : pas de coordonnees dedans
    await this.antiFraud.assertClean(ownerId, dto.title, 'listing_title');
    await this.antiFraud.assertClean(ownerId, dto.description, 'listing_description');

    // Ville et region proviennent du referentiel : les demandes des voyageurs
    // sont rapprochees sur ces valeurs exactes.
    const locality = findLocality((dto as any).citySlug) ?? findLocality(dto.city) ?? resolveLocality(dto.city);
    if (!locality) {
      throw new BadRequestException(
        'Choisissez une ville dans la liste proposee : elle determine quels voyageurs verront votre annonce.',
      );
    }
    const { citySlug, ...rest } = dto as any;

    const listing = await this.prisma.listing.create({
      data: {
        ...rest,
        city: locality.name,
        region: locality.region,
        latitude: dto.latitude ?? locality.lat,
        longitude: dto.longitude ?? locality.lng,
        ownerId,
        slug: this.slugify(dto.title),
        country: dto.country || 'Tunisia',
        cleaningFee: dto.cleaningFee ?? 0,
        serviceFee: dto.serviceFee ?? 0,
        securityDeposit: dto.securityDeposit ?? 0,
        checkInTime: dto.checkInTime || '15:00',
        checkOutTime: dto.checkOutTime || '11:00',
        minNights: dto.minNights ?? 1,
        maxNights: dto.maxNights,
        instantBook: dto.instantBook ?? false,
        amenities: toDbJson(dto.amenities || []),
        houseRules: toDbJson(dto.houseRules || []),
        rules: toDbJson(dto.rules || {}),
        status: ListingStatus.draft,
      } as any,
    });
    await this.prisma.listingPassport.create({ data: { listingId: listing.id } });
    return listing;
  }

  async findAll(q: QueryListingsDto) {
    const page = q.page || 1;
    const limit = q.limit || 20;
    const where: any = {
      deletedAt: null,
      status: ListingStatus.active,
      ...(q.city ? { city: { contains: q.city } } : {}),
      ...(q.propertyType ? { propertyType: q.propertyType } : {}),
      ...(q.certificationLevel ? { certificationLevel: q.certificationLevel } : {}),
      ...(q.guests ? { maxGuests: { gte: Number(q.guests) } } : {}),
    };
    if (q.minPrice != null || q.maxPrice != null) {
      where.pricePerNight = {
        ...(q.minPrice != null ? { gte: Number(q.minPrice) } : {}),
        ...(q.maxPrice != null ? { lte: Number(q.maxPrice) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { photos: true },
        orderBy: [{ certificationLevel: 'desc' }, { trustScore: 'desc' }],
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }


  /**
   * Annonces du proprietaire connecte, tous statuts confondus.
   * L endpoint public ne renvoie que les annonces actives : un brouillon ou
   * une annonce en re-verification resterait invisible a son propre auteur.
   */
  async findMine(ownerId: string) {
    return this.prisma.listing.findMany({
      where: { ownerId, deletedAt: null },
      include: { photos: true, _count: { select: { bookings: true, reviews: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { OR: [{ id }, { slug: id }], deletedAt: null },
      include: {
        photos: true,
        passport: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            createdAt: true,
            ownerPassport: {
              select: { trustScore: true, responseRate: true, totalBookings: true },
            },
          },
        },
        reviews: {
          where: { type: ReviewType.traveler_to_listing, isFlagged: false },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { reviewer: { select: { firstName: true, avatarUrl: true } } },
        },
        certifications: { orderBy: { level: 'desc' }, take: 1 },
      },
    });
    if (!listing) throw new NotFoundException('Logement non trouve');
    return listing;
  }

  /**
   * Modification par le proprietaire : filtre les champs autorises,
   * journalise chaque changement et passe en re-verification si necessaire.
   */
  async update(userId: string, id: string, dto: UpdateListingDto & Record<string, any>) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Logement non trouve');
    if (listing.ownerId !== userId) throw new ForbiddenException('Vous n etes pas le proprietaire');
    if ((listing as any).isEditable === false) {
      throw new ForbiddenException('Ce logement n est pas modifiable');
    }

    await this.antiFraud.assertClean(userId, (dto as any).title, 'listing_title');
    await this.antiFraud.assertClean(userId, (dto as any).description, 'listing_description');

    const activeBookings = await this.prisma.booking.count({
      where: { listingId: id, status: { in: [BookingStatus.confirmed, BookingStatus.checked_in] } },
    });

    const updateData: any = {};
    const modifications: any[] = [];

    for (const key of Object.keys(dto)) {
      if (!(EDITABLE_FIELDS as readonly string[]).includes(key)) continue;
      const value = (dto as any)[key];
      updateData[key] = JSON_FIELDS.includes(key) ? toDbJson(value) : value;
      modifications.push({
        listingId: id,
        modifiedBy: userId,
        fieldName: key,
        oldValue: String((listing as any)[key] ?? ''),
        newValue: String(JSON_FIELDS.includes(key) ? JSON.stringify(value) : value),
        reason: (dto as any).modificationReason || 'Mise a jour par le proprietaire',
      });
    }

    if (Object.keys(updateData).length === 0) return listing;

    const modifiedCritical = Object.keys(dto).filter((k) => CRITICAL_FIELDS.includes(k));
    if (activeBookings > 0 && modifiedCritical.length > 0) {
      updateData.status = ListingStatus.under_review;
    }

    updateData.lastModifiedAt = new Date();
    updateData.modificationCount = { increment: 1 };

    const updated = await this.prisma.listing.update({ where: { id }, data: updateData });

    if (modifications.length > 0) {
      await this.prisma.listingModification.createMany({ data: modifications });
    }

    return updated;
  }

  /** Historique des modifications, reserve au proprietaire. */
  async getModificationHistory(listingId: string, ownerId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, ownerId },
    });
    if (!listing) throw new ForbiddenException('Acces non autorise');

    return this.prisma.listingModification.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, id: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Logement non trouve');
    if (listing.ownerId !== userId) throw new ForbiddenException('Vous n etes pas le proprietaire');
    await this.prisma.listing.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async publish(userId: string, id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { photos: true },
    });
    if (!listing) throw new NotFoundException('Logement non trouve');
    if (listing.ownerId !== userId) throw new ForbiddenException('Vous n etes pas le proprietaire');
    return this.prisma.listing.update({ where: { id }, data: { status: ListingStatus.active } });
  }

  async availability(id: string) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        listingId: id,
        status: { notIn: [BookingStatus.cancelled] },
        checkOut: { gte: new Date() },
      },
      select: { checkIn: true, checkOut: true },
      orderBy: { checkIn: 'asc' },
    });
    return { listingId: id, blocked: bookings };
  }

  async addPhoto(userId: string, id: string, dto: { url: string; isPrimary?: boolean }) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Logement non trouve');
    if (listing.ownerId !== userId) throw new ForbiddenException('Vous n etes pas le proprietaire');
    return this.prisma.listingPhoto.create({
      data: { listingId: id, url: dto.url, isPrimary: dto.isPrimary ?? false },
    });
  }
}

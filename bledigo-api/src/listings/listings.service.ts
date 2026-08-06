import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingStatus } from '../common/enums';
import { CreateListingDto, UpdateListingDto, QueryListingsDto } from './dto';

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(title: string) {
    return (
      title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60) +
      '-' +
      Math.random().toString(36).slice(2, 8)
    );
  }

  async create(ownerId: string, dto: CreateListingDto) {
    const listing = await this.prisma.listing.create({
      data: {
        ...dto,
        ownerId,
        slug: this.slugify(dto.title),
        status: ListingStatus.draft,
      },
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

  async findOne(id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { OR: [{ id }, { slug: id }], deletedAt: null },
      include: {
        photos: true,
        passport: true,
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, createdAt: true } },
        reviews: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!listing) throw new NotFoundException('Logement non trouve');
    return listing;
  }

  async update(userId: string, id: string, dto: UpdateListingDto) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Logement non trouve');
    if (listing.ownerId !== userId) throw new ForbiddenException('Vous n etes pas le proprietaire');
    return this.prisma.listing.update({ where: { id }, data: dto as any });
  }

  async remove(userId: string, id: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Logement non trouve');
    if (listing.ownerId !== userId) throw new ForbiddenException('Vous n etes pas le proprietaire');
    await this.prisma.listing.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async publish(userId: string, id: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id }, include: { photos: true } });
    if (!listing) throw new NotFoundException('Logement non trouve');
    if (listing.ownerId !== userId) throw new ForbiddenException('Vous n etes pas le proprietaire');
    return this.prisma.listing.update({ where: { id }, data: { status: ListingStatus.active } });
  }

  async availability(id: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { listingId: id, status: { notIn: ['cancelled'] }, checkOut: { gte: new Date() } },
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

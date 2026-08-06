import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReverseSearchStatus, ReverseOfferStatus } from '../common/enums';
import { toDbJson } from '../common/json';

/** Recherche inversee : le voyageur publie son besoin, les proprietaires proposent. */
@Injectable()
export class ReverseSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async create(travelerId: string, dto: any) {
    return this.prisma.reverseSearch.create({
      data: {
        travelerId,
        title: dto.title,
        description: dto.description,
        destination: dto.destination,
        checkIn: new Date(dto.checkIn),
        checkOut: new Date(dto.checkOut),
        guestsCount: dto.guestsCount,
        bedrooms: dto.bedrooms,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        requirements: toDbJson(dto.requirements || {}),
        status: ReverseSearchStatus.active,
      },
    });
  }

  async findAll(q: { destination?: string; page?: number; limit?: number }) {
    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 20;
    const where: any = {
      status: ReverseSearchStatus.active,
      ...(q.destination ? { destination: { contains: q.destination } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.reverseSearch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { offers: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reverseSearch.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const item = await this.prisma.reverseSearch.findUnique({
      where: { id },
      include: { offers: { include: { listing: true } } },
    });
    if (!item) throw new NotFoundException('Recherche non trouvee');
    return item;
  }

  async offer(ownerId: string, reverseSearchId: string, dto: any) {
    const listing = await this.prisma.listing.findUnique({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException('Logement non trouve');
    if (listing.ownerId !== ownerId) throw new ForbiddenException('Vous n etes pas le proprietaire');

    return this.prisma.reverseOffer.create({
      data: {
        reverseSearchId,
        listingId: dto.listingId,
        ownerId,
        proposedPrice: dto.proposedPrice,
        message: dto.message,
        status: ReverseOfferStatus.pending,
      },
    });
  }

  async acceptOffer(travelerId: string, offerId: string) {
    const offer = await this.prisma.reverseOffer.findUnique({
      where: { id: offerId },
      include: { reverseSearch: true },
    });
    if (!offer) throw new NotFoundException('Offre non trouvee');
    if (offer.reverseSearch.travelerId !== travelerId) throw new ForbiddenException('Acces refuse');

    await this.prisma.reverseOffer.update({
      where: { id: offerId },
      data: { status: ReverseOfferStatus.accepted },
    });
    await this.prisma.reverseOffer.updateMany({
      where: { reverseSearchId: offer.reverseSearchId, id: { not: offerId } },
      data: { status: ReverseOfferStatus.rejected },
    });
    return this.prisma.reverseSearch.update({
      where: { id: offer.reverseSearchId },
      data: { status: ReverseSearchStatus.fulfilled },
    });
  }
}

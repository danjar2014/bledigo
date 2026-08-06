import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewType, BookingStatus } from '../common/enums';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Avis verifie : uniquement apres un sejour reellement termine */
  async create(reviewerId: string, dto: any) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { review: true },
    });
    if (!booking) throw new NotFoundException('Reservation non trouvee');
    if (booking.travelerId !== reviewerId && booking.ownerId !== reviewerId) {
      throw new BadRequestException('Vous n avez pas participe a ce sejour');
    }
    if (booking.status !== BookingStatus.completed) {
      throw new BadRequestException('Avis possible uniquement apres un sejour termine');
    }
    if (booking.review) throw new BadRequestException('Avis deja depose');

    const isTraveler = booking.travelerId === reviewerId;
    const review = await this.prisma.review.create({
      data: {
        bookingId: booking.id,
        listingId: booking.listingId,
        reviewerId,
        revieweeId: isTraveler ? booking.ownerId : booking.travelerId,
        type: isTraveler ? ReviewType.traveler_to_listing : ReviewType.owner_to_traveler,
        rating: dto.rating,
        cleanliness: dto.cleanliness ?? dto.rating,
        accuracy: dto.accuracy ?? dto.rating,
        checkIn: dto.checkIn ?? dto.rating,
        communication: dto.communication ?? dto.rating,
        location: dto.location ?? dto.rating,
        value: dto.value ?? dto.rating,
        comment: dto.comment,
        isVerified: true,
      },
    });

    await this.recomputeListingScores(booking.listingId);
    return review;
  }

  async findByListing(listingId: string, page = 1, limit = 20) {
    const [items, total, agg] = await Promise.all([
      this.prisma.review.findMany({
        where: { listingId },
        skip: (page - 1) * limit,
        take: limit,
        include: { reviewer: { select: { firstName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { listingId } }),
      this.prisma.review.aggregate({
        where: { listingId },
        _avg: { rating: true, cleanliness: true, accuracy: true, communication: true, location: true, value: true },
      }),
    ]);
    return { items, total, page, limit, averages: agg._avg };
  }

  private async recomputeListingScores(listingId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { listingId },
      _avg: { rating: true, cleanliness: true },
      _count: true,
    });
    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        totalReviews: agg._count,
        qualityScore: Math.round((agg._avg.rating || 0) * 20),
        cleanlinessScore: Math.round((agg._avg.cleanliness || 0) * 20),
      },
    });
  }

  async flag(id: string, reason: string) {
    return this.prisma.review.update({
      where: { id },
      data: { isFlagged: true, flagReason: reason },
    });
  }
}

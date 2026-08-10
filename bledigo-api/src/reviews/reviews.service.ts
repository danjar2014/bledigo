import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewType, BookingStatus } from '../common/enums';

/** Delai maximum pour deposer un avis apres le check-out (jours). */
const REVIEW_WINDOW_DAYS = 30;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Avis verifie : uniquement apres un sejour reellement termine, dans les 30 jours. */
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

    const daysSinceCheckout = Math.floor(
      (Date.now() - booking.checkOut.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCheckout > REVIEW_WINDOW_DAYS) {
      throw new BadRequestException(
        `La periode d avis est terminee (${REVIEW_WINDOW_DAYS} jours)`,
      );
    }

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

    if (isTraveler) {
      await this.recomputeListingScores(booking.listingId);
    }
    await this.updatePassportScores(
      isTraveler ? booking.ownerId : booking.travelerId,
      isTraveler,
    );

    return review;
  }

  /**
   * Avis publics d un logement avec tri, repartition par note et moyennes par critere.
   * Accepte l ancienne signature (listingId, page, limit) et la nouvelle (listingId, query).
   */
  async findByListing(listingId: string, pageOrQuery: any = 1, legacyLimit = 20) {
    const q =
      typeof pageOrQuery === 'object' && pageOrQuery !== null
        ? pageOrQuery
        : { page: pageOrQuery, limit: legacyLimit };

    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 20;
    const sortBy = q.sortBy || 'newest';

    const where: any = {
      listingId,
      type: ReviewType.traveler_to_listing,
      isFlagged: false,
    };
    if (q.rating) where.rating = Number(q.rating);

    const orderBy =
      sortBy === 'helpful'
        ? { helpfulCount: 'desc' as const }
        : sortBy === 'highest'
          ? { rating: 'desc' as const }
          : sortBy === 'lowest'
            ? { rating: 'asc' as const }
            : { createdAt: 'desc' as const };

    const [items, total, stats, criteriaAvg] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reviewer: {
            select: {
              id: true,
              firstName: true,
              avatarUrl: true,
              travelerPassport: { select: { trustScore: true, totalStays: true } },
            },
          },
        },
        orderBy,
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { listingId, type: ReviewType.traveler_to_listing },
        _count: { rating: true },
      }),
      this.prisma.review.aggregate({
        where: { listingId, type: ReviewType.traveler_to_listing },
        _avg: {
          rating: true,
          cleanliness: true,
          accuracy: true,
          checkIn: true,
          communication: true,
          location: true,
          value: true,
        },
      }),
    ]);

    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let ratingSum = 0;
    let ratingCount = 0;
    for (const s of stats) {
      breakdown[s.rating] = s._count.rating;
      ratingSum += s.rating * s._count.rating;
      ratingCount += s._count.rating;
    }
    const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : '0';

    return {
      items,
      reviews: items, // alias attendu par le front v2
      total,
      page,
      limit,
      avgRating,
      breakdown,
      averages: criteriaAvg._avg,
      criteriaAvg: criteriaAvg._avg,
    };
  }

  /** Marque un avis comme utile. */
  async markHelpful(reviewId: string, _userId?: string) {
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
    });
  }

  async flag(id: string, reason: string) {
    return this.prisma.review.update({
      where: { id },
      data: { isFlagged: true, flagReason: reason },
    });
  }

  /** Alias explicite (moderation). */
  async flagReview(_adminId: string, reviewId: string, reason: string) {
    return this.flag(reviewId, reason);
  }

  private async recomputeListingScores(listingId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { listingId, type: ReviewType.traveler_to_listing },
      _avg: { rating: true, cleanliness: true },
      _count: true,
    });
    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        totalReviews: agg._count,
        avgRating: agg._avg.rating || 0,
        qualityScore: Math.round((agg._avg.rating || 0) * 20),
        cleanlinessScore: Math.round((agg._avg.cleanliness || 0) * 20),
      },
    });
  }

  private async updatePassportScores(userId: string, revieweeIsOwner: boolean) {
    if (revieweeIsOwner) {
      await this.prisma.ownerPassport.updateMany({
        where: { userId },
        data: { totalBookings: { increment: 1 } },
      });
    } else {
      await this.prisma.travelerPassport.updateMany({
        where: { userId },
        data: { totalStays: { increment: 1 } },
      });
    }
  }
}

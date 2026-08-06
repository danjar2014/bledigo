import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingStatus } from '../common/enums';

/**
 * Recherche full-text + geo. En prod : Elasticsearch (voir ELASTICSEARCH_URL).
 * En local : requetes Prisma + filtre distance calcule en memoire (Haversine).
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  async search(q: {
    q?: string;
    city?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 20;

    const where: any = { deletedAt: null, status: ListingStatus.active };
    if (q.q) {
      where.OR = [
        { title: { contains: q.q } },
        { description: { contains: q.q } },
        { city: { contains: q.q } },
        { region: { contains: q.q } },
      ];
    }
    if (q.city) where.city = { contains: q.city };
    if (q.guests) where.maxGuests = { gte: Number(q.guests) };
    if (q.minPrice != null || q.maxPrice != null) {
      where.pricePerNight = {
        ...(q.minPrice != null ? { gte: Number(q.minPrice) } : {}),
        ...(q.maxPrice != null ? { lte: Number(q.maxPrice) } : {}),
      };
    }

    let results = await this.prisma.listing.findMany({
      where,
      include: { photos: { where: { isPrimary: true }, take: 1 } },
      orderBy: [{ certificationLevel: 'desc' }, { trustScore: 'desc' }],
    });

    // Filtre geographique
    if (q.lat != null && q.lng != null) {
      const radius = Number(q.radiusKm) || 25;
      results = results
        .map((l: any) => ({
          ...l,
          distanceKm: this.distanceKm(Number(q.lat), Number(q.lng), Number(l.latitude), Number(l.longitude)),
        }))
        .filter((l: any) => l.distanceKm <= radius)
        .sort((a: any, b: any) => a.distanceKm - b.distanceKm);
    }

    // Filtre disponibilite
    if (q.checkIn && q.checkOut) {
      const checkIn = new Date(q.checkIn);
      const checkOut = new Date(q.checkOut);
      const busy = await this.prisma.booking.findMany({
        where: {
          status: { notIn: ['cancelled'] },
          AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }],
        },
        select: { listingId: true },
      });
      const busyIds = new Set(busy.map((b: any) => b.listingId));
      results = results.filter((l: any) => !busyIds.has(l.id));
    }

    const total = results.length;
    return {
      items: results.slice((page - 1) * limit, page * limit),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async suggestions(term: string) {
    if (!term || term.length < 2) return { cities: [], listings: [] };
    const [cities, listings] = await Promise.all([
      this.prisma.listing.findMany({
        where: { city: { contains: term }, status: ListingStatus.active },
        select: { city: true, region: true },
        distinct: ['city'],
        take: 5,
      }),
      this.prisma.listing.findMany({
        where: { title: { contains: term }, status: ListingStatus.active },
        select: { id: true, title: true, slug: true, city: true },
        take: 5,
      }),
    ]);
    return { cities, listings };
  }
}

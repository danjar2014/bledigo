import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingStatus } from '../common/enums';
import { filterByAmenities } from '../common/amenities';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Recherche geographique pour la carte.
 *
 * SQLite ne dispose pas d index spatial : le filtrage grossier se fait en SQL
 * sur la bounding box, puis le raffinement (polygone) en memoire. En production
 * PostgreSQL, remplacer par PostGIS (ST_Within) pour absorber le volume.
 */
@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Test d appartenance a un polygone par lancer de rayon.
   * Le polygone est suppose ferme implicitement (dernier point relie au premier).
   */
  static pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      const intersects =
        yi > point.lat !== yj > point.lat &&
        point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;

      if (intersects) inside = !inside;
    }
    return inside;
  }

  private static boundsOf(polygon: LatLng[]) {
    return polygon.reduce(
      (acc, p) => ({
        south: Math.min(acc.south, p.lat),
        north: Math.max(acc.north, p.lat),
        west: Math.min(acc.west, p.lng),
        east: Math.max(acc.east, p.lng),
      }),
      { south: 90, north: -90, west: 180, east: -180 },
    );
  }

  private parsePolygon(raw: any): LatLng[] | null {
    if (!raw) return null;
    let value = raw;
    if (typeof raw === 'string') {
      try {
        value = JSON.parse(raw);
      } catch {
        throw new BadRequestException('Polygone invalide : JSON attendu');
      }
    }
    if (!Array.isArray(value) || value.length < 3) {
      throw new BadRequestException('Polygone invalide : au moins 3 points requis');
    }
    return value.map((p: any) => {
      const lat = Number(Array.isArray(p) ? p[0] : p.lat);
      const lng = Number(Array.isArray(p) ? p[1] : p.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new BadRequestException('Polygone invalide : coordonnees non numeriques');
      }
      return { lat, lng };
    });
  }

  /**
   * Annonces visibles sur la carte.
   * Accepte soit une bounding box (north/south/east/west), soit un polygone.
   */
  async inArea(query: any = {}) {
    const polygon = this.parsePolygon(query.polygon);

    const bounds = polygon
      ? GeoService.boundsOf(polygon)
      : {
          north: Number(query.north),
          south: Number(query.south),
          east: Number(query.east),
          west: Number(query.west),
        };

    if ([bounds.north, bounds.south, bounds.east, bounds.west].some((v) => Number.isNaN(v))) {
      throw new BadRequestException('Fournir une bounding box (north, south, east, west) ou un polygone');
    }

    const where: any = {
      deletedAt: null,
      status: ListingStatus.active,
      latitude: { gte: bounds.south, lte: bounds.north },
      longitude: { gte: bounds.west, lte: bounds.east },
    };

    if (query.guests) where.maxGuests = { gte: Number(query.guests) };
    if (query.propertyType) where.propertyType = query.propertyType;
    if (query.certificationLevel) where.certificationLevel = query.certificationLevel;
    if (query.minPrice != null || query.maxPrice != null) {
      where.pricePerNight = {
        ...(query.minPrice != null ? { gte: Number(query.minPrice) } : {}),
        ...(query.maxPrice != null ? { lte: Number(query.maxPrice) } : {}),
      };
    }

    let items = await this.prisma.listing.findMany({
      where,
      take: Number(query.limit) || 300,
      select: {
        id: true,
        slug: true,
        title: true,
        city: true,
        region: true,
        latitude: true,
        longitude: true,
        pricePerNight: true,
        currency: true,
        propertyType: true,
        maxGuests: true,
        bedrooms: true,
        bathrooms: true,
        trustScore: true,
        avgRating: true,
        totalReviews: true,
        certificationLevel: true,
        amenities: true,
        photos: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
      orderBy: [{ certificationLevel: 'desc' }, { trustScore: 'desc' }],
    });

    // Filtre equipements
    items = filterByAmenities(items as any, query.amenities) as any;

    // Raffinement : ne garder que les points reellement dans la zone tracee
    if (polygon) {
      items = items.filter((l) =>
        GeoService.pointInPolygon({ lat: l.latitude, lng: l.longitude }, polygon),
      );
    }

    // Exclure les logements deja reserves sur la periode demandee
    if (query.checkIn && query.checkOut) {
      const checkIn = new Date(query.checkIn);
      const checkOut = new Date(query.checkOut);
      const busy = await this.prisma.booking.findMany({
        where: {
          status: { notIn: ['cancelled'] },
          AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }],
        },
        select: { listingId: true },
      });
      const busyIds = new Set(busy.map((b) => b.listingId));
      items = items.filter((l) => !busyIds.has(l.id));
    }

    return {
      items,
      total: items.length,
      bounds,
      mode: polygon ? 'polygon' : 'bbox',
    };
  }
}

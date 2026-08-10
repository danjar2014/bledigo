import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingStatus } from '../common/enums';

/** Coordonnees de repli pour centrer la carte quand une ville n a pas encore d annonce. */
const CITY_CENTERS: Record<string, { lat: number; lng: number; region: string }> = {
  tunis: { lat: 36.8065, lng: 10.1815, region: 'Tunis' },
  sousse: { lat: 35.8256, lng: 10.6084, region: 'Sousse' },
  hammamet: { lat: 36.4, lng: 10.6167, region: 'Nabeul' },
  djerba: { lat: 33.8076, lng: 10.8451, region: 'Medenine' },
  sfax: { lat: 34.7406, lng: 10.7603, region: 'Sfax' },
  monastir: { lat: 35.7643, lng: 10.8113, region: 'Monastir' },
  bizerte: { lat: 37.2746, lng: 9.8739, region: 'Bizerte' },
  nabeul: { lat: 36.4513, lng: 10.7357, region: 'Nabeul' },
  tabarka: { lat: 36.9544, lng: 8.7581, region: 'Jendouba' },
  mahdia: { lat: 35.5047, lng: 11.0622, region: 'Mahdia' },
  tozeur: { lat: 33.9197, lng: 8.1335, region: 'Tozeur' },
  kelibia: { lat: 36.8478, lng: 11.0939, region: 'Nabeul' },
};

export function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Villes ayant au moins une annonce active, avec compteur et prix mini. */
  async findAll(limit?: number) {
    const listings = await this.prisma.listing.findMany({
      where: { deletedAt: null, status: ListingStatus.active },
      select: {
        city: true,
        region: true,
        latitude: true,
        longitude: true,
        pricePerNight: true,
        propertyType: true,
      },
    });

    const byCity = new Map<string, any>();
    for (const l of listings) {
      const slug = slugifyCity(l.city);
      const entry = byCity.get(slug) ?? {
        slug,
        name: l.city,
        region: l.region,
        count: 0,
        minPrice: Infinity,
        latSum: 0,
        lngSum: 0,
        propertyTypes: new Set<string>(),
      };
      entry.count += 1;
      entry.minPrice = Math.min(entry.minPrice, l.pricePerNight);
      entry.latSum += l.latitude;
      entry.lngSum += l.longitude;
      entry.propertyTypes.add(l.propertyType);
      byCity.set(slug, entry);
    }

    const cities = [...byCity.values()]
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        region: c.region,
        count: c.count,
        minPrice: c.minPrice === Infinity ? null : c.minPrice,
        latitude: c.latSum / c.count,
        longitude: c.lngSum / c.count,
        propertyTypes: [...c.propertyTypes],
      }))
      .sort((a, b) => b.count - a.count);

    return limit ? cities.slice(0, Number(limit)) : cities;
  }

  /** Detail d une ville + ses annonces. */
  async findOne(slug: string, query: any = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 24;

    const all = await this.prisma.listing.findMany({
      where: { deletedAt: null, status: ListingStatus.active },
      select: { id: true, city: true },
    });
    const ids = all.filter((l) => slugifyCity(l.city) === slug).map((l) => l.id);

    if (ids.length === 0) {
      const fallback = CITY_CENTERS[slug];
      if (!fallback) throw new NotFoundException('Ville non trouvee');
      return {
        city: {
          slug,
          name: slug.charAt(0).toUpperCase() + slug.slice(1),
          region: fallback.region,
          count: 0,
          latitude: fallback.lat,
          longitude: fallback.lng,
        },
        items: [],
        total: 0,
        page,
        limit,
      };
    }

    const where: any = { id: { in: ids } };
    if (query.propertyType) where.propertyType = query.propertyType;
    if (query.guests) where.maxGuests = { gte: Number(query.guests) };

    const [items, total, sample] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { photos: { where: { isPrimary: true }, take: 1 } },
        orderBy: [{ certificationLevel: 'desc' }, { trustScore: 'desc' }],
      }),
      this.prisma.listing.count({ where }),
      this.prisma.listing.findFirst({
        where: { id: { in: ids } },
        select: { city: true, region: true, latitude: true, longitude: true },
      }),
    ]);

    return {
      city: {
        slug,
        name: sample?.city ?? slug,
        region: sample?.region ?? null,
        count: ids.length,
        latitude: sample?.latitude ?? null,
        longitude: sample?.longitude ?? null,
      },
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /** Repartition par type de bien, pour les tuiles de la page d accueil. */
  async propertyTypes() {
    const listings = await this.prisma.listing.findMany({
      where: { deletedAt: null, status: ListingStatus.active },
      select: { propertyType: true },
    });
    const counts = new Map<string, number>();
    for (const l of listings) {
      counts.set(l.propertyType, (counts.get(l.propertyType) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }
}

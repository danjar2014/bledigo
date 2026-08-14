import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../listings/calendar.service';
import { ListingStatus } from '../common/enums';
import { filterByAmenities } from '../common/amenities';

/** Au-dela d une semaine on quitte le court sejour, au-dela d un mois le moyen. */
const SEUIL_MOYEN_NUITS = 7;
const SEUIL_LONG_NUITS = 30;

/** Profil que la duree demandee appelle naturellement. */
export function profilAttendu(nuits: number): 'court' | 'moyen' | 'long' {
  if (nuits <= SEUIL_MOYEN_NUITS) return 'court';
  if (nuits <= SEUIL_LONG_NUITS) return 'moyen';
  return 'long';
}

/**
 * Le profil de l annonce correspond-il a la duree demandee ?
 *
 * Sert a ORDONNER et a signaler, jamais a exclure : un hote qui vise la longue
 * duree n a pas refuse les sejours courts, il a exprime une preference. Le
 * faire disparaitre d une recherche de trois nuits priverait le voyageur d une
 * offre disponible et l hote d une reservation qu il aurait acceptee.
 */
export function profilAdapte(profilAnnonce: string | null | undefined, nuits: number) {
  return (profilAnnonce || 'court') === profilAttendu(nuits);
}

/**
 * Recherche full-text + geo. En prod : Elasticsearch (voir ELASTICSEARCH_URL).
 * En local : requetes Prisma + filtre distance calcule en memoire (Haversine).
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
  ) {}

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
    propertyType?: string;
    amenities?: string | string[];
    minRating?: number;
    bedrooms?: number;
    certificationLevel?: string;
    sortBy?: string;
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
    if (q.propertyType) where.propertyType = q.propertyType;
    if (q.minRating) where.avgRating = { gte: Number(q.minRating) };
    if (q.bedrooms) where.bedrooms = { gte: Number(q.bedrooms) };
    if (q.certificationLevel) where.certificationLevel = q.certificationLevel;
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

    // Filtre equipements : le logement doit posseder tous ceux demandes
    results = filterByAmenities(results as any, q.amenities) as any;

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

    // Filtre disponibilite : reservations ET fermetures decidees par l hote.
    // Ne retenir que les reservations laisserait passer des dates que le
    // proprietaire a explicitement fermees.
    if (q.checkIn && q.checkOut) {
      const indisponibles = await this.calendar.logementsIndisponibles(
        new Date(q.checkIn),
        new Date(q.checkOut),
      );
      results = results.filter((l: any) => !indisponibles.has(l.id));

      // Profil de location : on signale la correspondance et on remonte les
      // annonces faites pour cette duree. Aucune n est retiree — voir
      // profilAdapte pour le pourquoi.
      const nuits = Math.max(
        1,
        Math.round((+new Date(q.checkOut) - +new Date(q.checkIn)) / 86400000),
      );
      results = results.map((l: any) => ({
        ...l,
        profilAdapte: profilAdapte(l.rentalProfile, nuits),
        profilAttendu: profilAttendu(nuits),
      }));
      // Le tri explicite du visiteur reste prioritaire : il n est applique
      // qu ensuite, et ecrase alors volontairement cet ordre.
      if (!q.sortBy) {
        results.sort((a: any, b: any) => Number(b.profilAdapte) - Number(a.profilAdapte));
      }
    }

    // Tri demande par l utilisateur
    const sortBy = q.sortBy;
    if (sortBy === 'price_asc') results.sort((a: any, b: any) => a.pricePerNight - b.pricePerNight);
    else if (sortBy === 'price_desc') results.sort((a: any, b: any) => b.pricePerNight - a.pricePerNight);
    else if (sortBy === 'rating') results.sort((a: any, b: any) => Number(b.avgRating) - Number(a.avgRating));
    else if (sortBy === 'newest') results.sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt));

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

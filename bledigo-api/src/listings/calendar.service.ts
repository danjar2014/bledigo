import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '../common/enums';

/**
 * Calendrier d un logement.
 *
 * Deux sources rendent une date indisponible, et il ne faut pas les confondre :
 * les REservations, subies, et les periodes du calendrier, decidees par l hote.
 * La recherche doit tenir compte des deux, sans quoi elle proposerait des dates
 * que le proprietaire refusera.
 *
 * Convention de bornes, la meme partout : debut inclus, fin exclue. Une nuit du
 * 10 au 11 occupe le 10 ; fermer du 10 au 12 laisse le 12 reservable en arrivee.
 */

export type PeriodeDto = {
  startDate: string;
  endDate: string;
  blocked?: boolean;
  pricePerNight?: number | null;
  minNights?: number | null;
  note?: string | null;
};

/** Deux intervalles se chevauchent si chacun commence avant que l autre finisse. */
function chevauche(aDebut: Date, aFin: Date, bDebut: Date, bFin: Date): boolean {
  return aDebut < bFin && bDebut < aFin;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProprietaire(listingId: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Logement non trouve');
    if (listing.ownerId !== userId) throw new ForbiddenException('Vous n etes pas le proprietaire');
    return listing;
  }

  private bornes(dto: PeriodeDto) {
    const debut = new Date(dto.startDate);
    const fin = new Date(dto.endDate);
    if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) {
      throw new BadRequestException('Dates invalides');
    }
    if (fin <= debut) throw new BadRequestException('La fin doit suivre le debut');
    return { debut, fin };
  }

  /** Periodes d un logement, a partir d aujourd hui. */
  async periodes(listingId: string) {
    return this.prisma.listingCalendar.findMany({
      where: { listingId, endDate: { gte: new Date() } },
      orderBy: { startDate: 'asc' },
    });
  }

  async creer(userId: string, listingId: string, dto: PeriodeDto) {
    await this.assertProprietaire(listingId, userId);
    const { debut, fin } = this.bornes(dto);

    if (!dto.blocked && dto.pricePerNight == null && dto.minNights == null) {
      throw new BadRequestException(
        'Une periode doit fermer les dates, fixer un tarif ou imposer une duree minimale',
      );
    }

    // Fermer des dates deja reservees n annulerait pas le sejour : cela
    // rendrait seulement le calendrier menteur.
    if (dto.blocked) {
      const reservees = await this.prisma.booking.findMany({
        where: {
          listingId,
          status: { notIn: [BookingStatus.cancelled] },
          AND: [{ checkIn: { lt: fin } }, { checkOut: { gt: debut } }],
        },
        select: { checkIn: true, checkOut: true },
      });
      if (reservees.length) {
        throw new BadRequestException(
          'Ces dates comportent deja une reservation : annulez-la avant de fermer la periode',
        );
      }
    }

    return this.prisma.listingCalendar.create({
      data: {
        listingId,
        startDate: debut,
        endDate: fin,
        blocked: dto.blocked ?? false,
        pricePerNight: dto.pricePerNight ?? null,
        minNights: dto.minNights ?? null,
        note: dto.note ?? null,
      },
    });
  }

  async supprimer(userId: string, listingId: string, periodeId: string) {
    await this.assertProprietaire(listingId, userId);
    const periode = await this.prisma.listingCalendar.findFirst({
      where: { id: periodeId, listingId },
    });
    if (!periode) throw new NotFoundException('Periode non trouvee');
    await this.prisma.listingCalendar.delete({ where: { id: periodeId } });
    return { deleted: true };
  }

  /**
   * Disponibilite reelle : reservations ET fermetures decidees par l hote.
   * C est cette vue que consulte la fiche logement.
   */
  async disponibilite(listingId: string) {
    const maintenant = new Date();
    const [reservations, periodes] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          listingId,
          status: { notIn: [BookingStatus.cancelled] },
          checkOut: { gte: maintenant },
        },
        select: { checkIn: true, checkOut: true },
        orderBy: { checkIn: 'asc' },
      }),
      this.prisma.listingCalendar.findMany({
        where: { listingId, endDate: { gte: maintenant } },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    return {
      listingId,
      blocked: [
        ...reservations.map((r) => ({ from: r.checkIn, to: r.checkOut, raison: 'reservation' })),
        ...periodes
          .filter((p) => p.blocked)
          .map((p) => ({ from: p.startDate, to: p.endDate, raison: 'ferme par l hote' })),
      ],
      tarifs: periodes
        .filter((p) => p.pricePerNight != null)
        .map((p) => ({ from: p.startDate, to: p.endDate, pricePerNight: p.pricePerNight })),
      dureesMinimales: periodes
        .filter((p) => p.minNights != null)
        .map((p) => ({ from: p.startDate, to: p.endDate, minNights: p.minNights })),
    };
  }

  /**
   * Identifiants des logements indisponibles sur un intervalle, toutes causes
   * confondues. Une seule requete pour la recherche, plutot qu une par annonce.
   */
  async logementsIndisponibles(debut: Date, fin: Date): Promise<Set<string>> {
    const [reserves, fermes] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          status: { notIn: [BookingStatus.cancelled] },
          AND: [{ checkIn: { lt: fin } }, { checkOut: { gt: debut } }],
        },
        select: { listingId: true },
      }),
      this.prisma.listingCalendar.findMany({
        where: {
          blocked: true,
          AND: [{ startDate: { lt: fin } }, { endDate: { gt: debut } }],
        },
        select: { listingId: true },
      }),
    ]);

    return new Set([...reserves, ...fermes].map((x) => x.listingId));
  }

  /**
   * Tarification d un sejour nuit par nuit : une periode peut n en couvrir
   * qu une partie, et le prix de base s applique ailleurs.
   *
   * Renvoie aussi la duree minimale la plus contraignante rencontree, pour que
   * la reservation puisse la refuser en connaissance de cause.
   */
  async tarifer(listingId: string, debut: Date, fin: Date) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Logement non trouve');

    const periodes = await this.prisma.listingCalendar.findMany({
      where: { listingId, AND: [{ startDate: { lt: fin } }, { endDate: { gt: debut } }] },
    });

    const prixBase = Number(listing.pricePerNight);
    let total = 0;
    let nuits = 0;
    let minNights = listing.minNights ?? 1;

    for (const jour = new Date(debut); jour < fin; jour.setDate(jour.getDate() + 1)) {
      const lendemain = new Date(jour);
      lendemain.setDate(lendemain.getDate() + 1);

      // La derniere periode declaree l emporte : l hote corrige en ajoutant.
      const applicables = periodes.filter((p) =>
        chevauche(jour, lendemain, new Date(p.startDate), new Date(p.endDate)),
      );

      const tarif = applicables.filter((p) => p.pricePerNight != null).at(-1);
      total += tarif ? Number(tarif.pricePerNight) : prixBase;
      nuits += 1;

      for (const p of applicables) {
        if (p.minNights != null && p.minNights > minNights) minNights = p.minNights;
      }
    }

    return { nuits, basePrice: total, minNights, prixMoyen: nuits ? total / nuits : prixBase };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, ReverseOfferStatus } from '../common/enums';

/**
 * Le flux de la cloche est DEDUIT de l etat courant, il n est pas stocke.
 *
 * Une table de notifications imposerait d ecrire a chaque evenement, donc une
 * migration, et resterait vide pour tout ce qui s est produit avant sa mise en
 * service. En derivant, le flux est exact des la premiere requete, ne peut pas
 * se desynchroniser de la realite, et une notification disparait d elle-meme
 * quand l action a ete faite.
 *
 * En contrepartie, il ne conserve aucun historique : on n y voit que ce qui
 * attend encore quelque chose, plus quelques issues recentes.
 */

/** Au-dela, une issue passee n a plus d interet dans la cloche. */
const FENETRE_JOURS = 7;

export type NotificationItem = {
  id: string;
  type:
    | 'offer_received'
    | 'counter_answered'
    | 'counter_to_answer'
    | 'booking_to_confirm'
    | 'booking_confirmed'
    | 'booking_cancelled';
  /** Le role concerne : permet a l interface de regrouper par casquette. */
  audience: 'traveler' | 'owner';
  title: string;
  body: string;
  /** Route du front vers l evenement. */
  link: string;
  actionRequired: boolean;
  createdAt: Date;
};

@Injectable()
export class NotificationFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async feed(userId: string): Promise<{ items: NotificationItem[]; actionCount: number }> {
    const depuis = new Date(Date.now() - FENETRE_JOURS * 24 * 60 * 60 * 1000);

    const [offresRecues, contrePropositions, aConfirmer, recentes] = await Promise.all([
      // VOYAGEUR : offres qui attendent sa decision, sur ses propres demandes.
      this.prisma.reverseOffer.findMany({
        where: {
          status: ReverseOfferStatus.pending,
          reverseSearch: { travelerId: userId },
        },
        include: { reverseSearch: { select: { id: true, title: true } }, listing: { select: { title: true, city: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),

      // PROPRIETAIRE : contre-propositions du voyageur, la main est a lui.
      this.prisma.reverseOffer.findMany({
        where: { status: ReverseOfferStatus.countered, ownerId: userId },
        include: { reverseSearch: { select: { id: true, title: true } }, listing: { select: { title: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),

      // PROPRIETAIRE : reservations en attente de sa confirmation.
      this.prisma.booking.findMany({
        where: { ownerId: userId, status: BookingStatus.pending },
        include: { listing: { select: { title: true, city: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),

      // VOYAGEUR : issues recentes de ses reservations.
      this.prisma.booking.findMany({
        where: {
          travelerId: userId,
          status: { in: [BookingStatus.confirmed, BookingStatus.cancelled] },
          updatedAt: { gte: depuis },
        },
        include: { listing: { select: { title: true, city: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);

    const items: NotificationItem[] = [];

    for (const o of offresRecues) {
      // negotiationRound > 0 : ce n est pas une premiere offre mais la reponse
      // du proprietaire a une contre-proposition. Le libelle doit le dire.
      const reponse = (o.negotiationRound ?? 0) > 0;
      items.push({
        id: `offer:${o.id}`,
        type: reponse ? 'counter_answered' : 'offer_received',
        audience: 'traveler',
        title: reponse ? 'Reponse a votre contre-proposition' : 'Nouvelle offre recue',
        body: reponse
          ? `${o.listing?.title ?? 'Un logement'} vous repond : ${this.prix(o.proposedPrice)} par nuit.`
          : `${o.listing?.title ?? 'Un logement'} vous propose ${this.prix(o.proposedPrice)} par nuit pour « ${o.reverseSearch?.title ?? 'votre demande'} ».`,
        link: `/besoins/${o.reverseSearchId}/offres`,
        actionRequired: true,
        createdAt: o.createdAt,
      });
    }

    for (const o of contrePropositions) {
      items.push({
        id: `counter:${o.id}`,
        type: 'counter_to_answer',
        audience: 'owner',
        title: 'Contre-proposition a traiter',
        body: `Le voyageur propose ${this.prix(o.counterPrice)} par nuit pour ${o.listing?.title ?? 'votre logement'}, au lieu de ${this.prix(o.proposedPrice)}.`,
        link: '/besoins',
        actionRequired: true,
        createdAt: o.counterAt ?? o.updatedAt,
      });
    }

    for (const b of aConfirmer) {
      items.push({
        id: `booking:${b.id}`,
        type: 'booking_to_confirm',
        audience: 'owner',
        title: 'Reservation a confirmer',
        body: `${b.totalNights} nuit${b.totalNights > 1 ? 's' : ''} a ${b.listing?.city ?? ''} pour ${b.guestsCount} voyageur${b.guestsCount > 1 ? 's' : ''}, a partir du ${this.date(b.checkIn)}.`,
        link: '/reservations',
        actionRequired: true,
        createdAt: b.createdAt,
      });
    }

    for (const b of recentes) {
      const annulee = b.status === BookingStatus.cancelled;
      items.push({
        id: `booking-issue:${b.id}`,
        type: annulee ? 'booking_cancelled' : 'booking_confirmed',
        audience: 'traveler',
        title: annulee ? 'Reservation annulee' : 'Reservation confirmee',
        body: `${b.listing?.title ?? 'Votre sejour'} — arrivee le ${this.date(b.checkIn)}.`,
        link: '/reservations',
        actionRequired: false,
        createdAt: b.updatedAt,
      });
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { items, actionCount: items.filter((i) => i.actionRequired).length };
  }

  private prix(valeur: unknown): string {
    const n = Number(valeur ?? 0);
    return `${Math.round(n)} TND`;
  }

  private date(valeur: Date): string {
    return new Date(valeur).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}

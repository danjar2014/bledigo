import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, ReverseOfferStatus, ValidationStatus } from '../common/enums';

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

      // Issues recentes des reservations, pour les DEUX parties : le voyageur
      // suit ses sejours, et le proprietaire doit apprendre qu un logement a
      // ete refuse a l arrivee — c est precisement ce qu il doit corriger.
      this.prisma.booking.findMany({
        where: {
          OR: [{ travelerId: userId }, { ownerId: userId }],
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
      const cotePropio = b.ownerId === userId;
      const annulee = b.status === BookingStatus.cancelled;
      const refuse = b.validationStatus === ValidationStatus.refused;

      // Un refus n est pas une annulation ordinaire : cote proprietaire c est
      // un signal a traiter, pas une simple information.
      let title: string;
      if (refuse) title = cotePropio ? 'Logement refuse a l arrivee' : 'Sejour refuse, aucun debit';
      else if (annulee) title = 'Reservation annulee';
      else title = cotePropio ? 'Reservation a venir' : 'Reservation confirmee';

      items.push({
        id: `booking-issue:${b.id}`,
        type: annulee ? 'booking_cancelled' : 'booking_confirmed',
        audience: cotePropio ? 'owner' : 'traveler',
        title,
        body: refuse && cotePropio
          ? `${b.listing?.title ?? 'Votre logement'} a ete refuse a l arrivee : reservation annulee, paiement rendu. Le motif vous est communique. Chaque refus est controle — au deuxieme, le compte est suspendu le temps d une verification.`
          : refuse
            ? `${b.listing?.title ?? 'Le sejour'} a ete refuse : vous n avez pas ete debite.`
            : `${b.listing?.title ?? 'Le sejour'} — arrivee le ${this.date(b.checkIn)}.`,
        link: '/reservations',
        // Un refus n est pas une simple information pour l hote : il doit
        // corriger son annonce ou contester, sous peine de recidive.
        actionRequired: refuse && cotePropio,
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

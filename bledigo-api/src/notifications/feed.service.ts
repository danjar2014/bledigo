import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, ReverseOfferStatus, ValidationStatus } from '../common/enums';
import { libelleMotif } from '../common/cancellation-reasons';

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
    | 'booking_cancelled'
    | 'change_to_answer'
    | 'change_answered';
  /** Le role concerne : permet a l interface de regrouper par casquette. */
  audience: 'traveler' | 'owner' | 'provider';
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

    const [
      offresRecues,
      contrePropositions,
      aConfirmer,
      recentes,
      changementsARepondre,
      changementsTraites,
    ] = await Promise.all([
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

      // DEMANDES DE CHANGEMENT recues : annulation ou report soumis a l accord
      // de cet utilisateur. C est le point de toute la fonctionnalite — sans
      // cette entree, l hote n apprendrait la demande qu en ouvrant la page.
      //
      // On EXCLUT ses propres demandes : le demandeur n a rien a valider.
      this.prisma.changeRequest.findMany({
        where: {
          status: 'pending',
          requestedById: { not: userId },
          OR: [
            { booking: { OR: [{ travelerId: userId }, { ownerId: userId }] } },
            { serviceBooking: { OR: [{ requesterId: userId }, { provider: { userId } }] } },
          ],
        },
        include: {
          booking: { select: { listingId: true, listing: { select: { title: true } } } },
          serviceBooking: { select: { vehicle: { select: { brand: true, model: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),

      // Reponses recentes a SES demandes : le demandeur doit apprendre qu il
      // est annule, ou que son report est refuse et que les dates tiennent.
      this.prisma.changeRequest.findMany({
        where: {
          requestedById: userId,
          status: { in: ['accepted', 'refused', 'expired'] },
          updatedAt: { gte: depuis },
        },
        include: {
          booking: { select: { listing: { select: { title: true } } } },
          serviceBooking: { select: { vehicle: { select: { brand: true, model: true } } } },
        },
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
        // L ancre designe la reservation concernee : une liste de dix
        // reservations obligeait sinon a retrouver soi-meme celle dont on
        // vient d etre averti.
        link: `/reservations#${b.id}`,
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
      // Une absence declaree n est pas une annulation ordinaire non plus : elle
      // se retourne contre le voyageur, qui doit donc l apprendre explicitement
      // et savoir ce qu elle lui coute. Une sanction qu on decouvre en se
      // faisant bloquer n est pas une sanction, c est une surprise.
      const absence = !!b.noShowDeclaredAt;

      let title: string;
      if (refuse) title = cotePropio ? 'Logement refuse a l arrivee' : 'Sejour refuse, aucun debit';
      else if (absence) title = cotePropio ? 'Absence declaree' : 'Absence signalee a l arrivee';
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
            : absence && cotePropio
              ? `Vous avez declare l absence du voyageur pour ${b.listing?.title ?? 'votre logement'}. Les dates sont liberees. Chaque declaration est comptee : un taux eleve rapporte a vos sejours aboutis declenche une verification.`
              : absence
                ? `L hote a declare que vous ne vous etes pas presente pour ${b.listing?.title ?? 'ce sejour'}. Si vous etiez sur place, declarez votre arrivee : votre parole vaut la sienne et aucune sanction n est prise en cas de contradiction. Sans reponse, une seconde absence entraine la suspension de votre compte.`
                : `${b.listing?.title ?? 'Le sejour'} — arrivee le ${this.date(b.checkIn)}.`,
        link: `/reservations#${b.id}`,
        // Un refus n est pas une simple information pour l hote : il doit
        // corriger son annonce ou contester, sous peine de recidive.
        actionRequired: refuse && cotePropio,
        createdAt: b.updatedAt,
      });
    }

    for (const d of changementsARepondre) {
      const annulation = d.kind === 'annulation';
      const quoi = this.intitule(d);
      const reste = this.heuresRestantes(d.autoAcceptAt);

      items.push({
        id: `change:${d.id}`,
        type: 'change_to_answer',
        // Le destinataire est celui qui n a PAS demande, et son role se deduit
        // de celui du demandeur. Supposer que c est toujours l agence enverrait
        // le locataire sur l espace prestataire quand c est elle qui demande.
        audience: this.destinataire(d),
        title: annulation ? 'Demande d annulation' : 'Demande de nouvelles dates',
        body: annulation
          ? `${quoi} — motif : ${libelleMotif(d.reasonCode)}. Sans reponse de votre part, l annulation prend effet dans ${reste}.`
          : `${quoi} — report demande du ${this.date(d.newStartDate!)} au ${this.date(d.newEndDate!)}. Motif : ${libelleMotif(d.reasonCode)}. Sans reponse, le report prend effet dans ${reste}.`,
        link: this.pageDe(this.destinataire(d)),
        actionRequired: true,
        createdAt: d.createdAt,
      });
    }

    for (const d of changementsTraites) {
      const annulation = d.kind === 'annulation';
      // Une echeance depassee vaut acceptation : le dire autrement laisserait
      // croire que l autre partie a repondu, alors qu elle s est tue.
      const parDefaut = d.status === 'expired';
      const acceptee = d.status === 'accepted' || parDefaut;

      items.push({
        id: `change-answered:${d.id}`,
        type: 'change_answered',
        // C est SA demande : son role au moment ou il l a deposee, fige sur la
        // demande, dit ou la reponse doit apparaitre.
        audience: this.audienceDuRole(d.requestedByRole),
        title: acceptee
          ? annulation
            ? 'Annulation acceptee'
            : 'Nouvelles dates acceptees'
          : annulation
            ? 'Annulation refusee'
            : 'Report refuse',
        body: acceptee
          ? `${this.intitule(d)} — ${parDefaut ? 'sans reponse dans le delai, votre demande a pris effet' : 'votre demande a ete acceptee'}.`
          : `${this.intitule(d)} — refus.${d.responseNote ? ` Motif : ${d.responseNote}` : ''} Votre reservation reste en place ; contactez l autre partie si le desaccord persiste.`,
        link: this.pageDe(this.audienceDuRole(d.requestedByRole)),
        actionRequired: false,
        createdAt: d.respondedAt ?? d.updatedAt,
      });
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { items, actionCount: items.filter((i) => i.actionRequired).length };
  }

  /**
   * Ou ce role consulte ses demandes.
   *
   * Un hote ne passe pas par /reservations, qui est la page du VOYAGEUR : l y
   * envoyer lui montrerait ses propres sejours, pas les demandes a traiter.
   * Chaque casquette a son tableau de bord, et le lien doit y mener.
   */
  private pageDe(audience: 'traveler' | 'owner' | 'provider'): string {
    if (audience === 'owner') return '/proprietaire#demandes';
    if (audience === 'provider') return '/prestataire#demandes';
    return '/reservations#demandes';
  }

  /** Traduit le role fige sur la demande en audience du fil. */
  private audienceDuRole(role: string): 'traveler' | 'owner' | 'provider' {
    if (role === 'prestataire') return 'provider';
    if (role === 'hote') return 'owner';
    return 'traveler';
  }

  /**
   * Qui doit repondre : l autre partie que le demandeur.
   *
   * Un sejour oppose voyageur et hote, une location voyageur et prestataire.
   * Le role du demandeur suffit donc a designer le destinataire.
   */
  private destinataire(d: any): 'traveler' | 'owner' | 'provider' {
    if (d.requestedByRole === 'voyageur') return d.scope === 'location' ? 'provider' : 'owner';
    return 'traveler';
  }

  /** De quoi la demande parle, en une expression courte et reconnaissable. */
  private intitule(d: any): string {
    if (d.booking?.listing?.title) return d.booking.listing.title;
    const v = d.serviceBooking?.vehicle;
    if (v) return `${v.brand} ${v.model}`;
    return 'Votre reservation';
  }

  /**
   * Temps restant avant que le silence vaille acceptation.
   *
   * Affiche parce que c est l information qui decide : « repondez » sans
   * echeance ne dit pas si l on a une heure ou deux jours.
   */
  private heuresRestantes(echeance: Date): string {
    const h = Math.max(0, Math.round((new Date(echeance).getTime() - Date.now()) / 3600000));
    if (h < 1) return 'moins d une heure';
    if (h < 24) return `${h} h`;
    return `${Math.round(h / 24)} jour(s)`;
  }

  private prix(valeur: unknown): string {
    const n = Number(valeur ?? 0);
    return `${Math.round(n)} TND`;
  }

  private date(valeur: Date): string {
    return new Date(valeur).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}

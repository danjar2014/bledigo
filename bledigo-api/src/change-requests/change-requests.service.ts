import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../listings/calendar.service';
import { VehiclesService } from '../services/vehicles/vehicles.service';
import { BookingStatus, ProviderType } from '../common/enums';
import { motifValide, libelleMotif, metEnCause } from '../common/cancellation-reasons';
import { toDbJson } from '../common/json';

export type Scope = 'sejour' | 'location';
export type Kind = 'annulation' | 'modification_dates';

/**
 * Delai laisse a l autre partie pour repondre.
 *
 * Passe ce delai la demande est reputee ACCEPTEE. Une validation sans echeance
 * serait un piege : il suffirait de se taire pour immobiliser le demandeur
 * indefiniment, ce qui est pire que l annulation immediate qu on remplace.
 */
const HEURES_POUR_REPONDRE = 48;

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Statuts pour lesquels une reservation occupe encore les dates. */
const OCCUPANTS = ['pending', 'confirmed', 'checked_in'];

/** Statuts au-dela desquels plus rien ne se demande. */
const TERMINAUX = ['completed', 'cancelled', 'disputed'];

/**
 * Demandes d annulation et de changement de dates.
 *
 * CE QUI CHANGE. Annuler etait immediat et unilateral, des deux cotes : le
 * voyageur cliquait, les dates se liberaient, et l hote l apprenait en
 * consultant son calendrier — sans motif, et sans avoir pu repondre. La demande
 * ne retient personne de force : elle rend le geste visible, motive et datable.
 *
 * DEUX EXCEPTIONS ASSUMEES, qui ne sont pas des trous dans la regle.
 *
 * 1. Une reservation encore `pending` se retire SANS accord. Demander a
 *    quelqu un de valider l abandon d une demande qu il n a lui-meme jamais
 *    acceptee n a pas de sens : il n a rien organise, rien bloque, rien perdu.
 *
 * 2. Le silence vaut acceptation au bout de HEURES_POUR_REPONDRE. Sans cela on
 *    remplacerait un desagrement par une sequestration.
 *
 * CE QUI N EST PAS FAIT, DELIBEREMENT. Aucun montant n est retenu, aucune
 * penalite appliquee, meme sur une annulation tardive. Le paiement se fait de
 * la main a la main : la plateforme ne tient aucun fonds, donc elle ne peut
 * rien prelever, et annoncer une penalite qu on ne peut pas appliquer serait
 * mentir. Le retard est CONSIGNE — date, motif, conditions opposees — pour etre
 * exploitable en phase 2, quand le paiement par carte rendra ces conditions
 * reellement opposables.
 */
@Injectable()
export class ChangeRequestsService {
  private readonly logger = new Logger(ChangeRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
    private readonly vehicles: VehiclesService,
  ) {}

  // ------------------------------------------------------------------ //
  // Contexte : qui demande, a qui, et sur quelle reservation            //
  // ------------------------------------------------------------------ //

  /**
   * Resout une reservation des deux metiers en une forme commune.
   *
   * C est ce qui permet a tout le reste du service d ignorer si l on parle d un
   * sejour ou d une location. Sans cette normalisation, chaque methode porterait
   * deux branches, et elles divergeraient a la premiere correction.
   */
  private async contexte(userId: string, scope: Scope, reservationId: string) {
    if (scope === 'sejour') {
      const b = await this.prisma.booking.findFirst({
        where: { id: reservationId, OR: [{ travelerId: userId }, { ownerId: userId }] },
        include: { listing: true },
      });
      if (!b) throw new NotFoundException('Reservation non trouvee');

      const estVoyageur = b.travelerId === userId;
      return {
        scope: 'sejour' as const,
        id: b.id,
        statut: b.status,
        debut: new Date(b.checkIn),
        fin: new Date(b.checkOut),
        prix: Number(b.totalPrice),
        devise: b.currency,
        titre: b.listing?.title ?? 'Sejour',
        demandeurRole: (estVoyageur ? 'voyageur' : 'hote') as 'voyageur' | 'hote',
        destinataireId: estVoyageur ? b.ownerId : b.travelerId,
        delaiJours: b.listing?.cancellationDeadlineDays ?? null,
        conditions: b.listing?.cancellationPolicy ?? null,
        brut: b as any,
      };
    }

    const s = await this.prisma.serviceBooking.findFirst({
      where: {
        id: reservationId,
        type: ProviderType.location_voiture,
        OR: [{ requesterId: userId }, { provider: { userId } }],
      },
      include: { vehicle: true, provider: true },
    });
    if (!s) throw new NotFoundException('Location non trouvee');

    const estLocataire = s.requesterId === userId;
    return {
      scope: 'location' as const,
      id: s.id,
      statut: s.status,
      debut: new Date(s.startDate),
      fin: new Date(s.endDate),
      prix: Number(s.price),
      devise: s.currency,
      titre: s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model}` : 'Location',
      demandeurRole: (estLocataire ? 'voyageur' : 'prestataire') as 'voyageur' | 'prestataire',
      destinataireId: estLocataire ? s.provider.userId : s.requesterId,
      delaiJours: s.vehicle?.cancellationDeadlineDays ?? null,
      conditions: s.vehicle?.cancellationPolicy ?? null,
      brut: s as any,
    };
  }

  /**
   * Date jusqu a laquelle l annulation reste libre.
   *
   * `null` = libre jusqu au depart, ce qui reste le defaut de toute annonce ou
   * de tout vehicule qui n a rien declare. Le delai se compte depuis le DEBUT
   * du sejour, pas depuis la reservation : c est la date qui approche qui rend
   * une annulation couteuse.
   */
  private limite(delaiJours: number | null, debut: Date): Date | null {
    if (delaiJours == null) return null;
    return new Date(debut.getTime() - delaiJours * JOUR_MS);
  }

  // ------------------------------------------------------------------ //
  // Conditions, servies AVANT toute demande                             //
  // ------------------------------------------------------------------ //

  /**
   * Ce qui est opposable, lisible avant de demander quoi que ce soit.
   *
   * Meme regle que partout ailleurs dans le projet : une condition decouverte
   * apres coup n est pas une condition. Le voyageur doit lire le delai, le texte
   * de l hote et le delai de reponse AU MOMENT ou il decide.
   */
  async conditions(userId: string, scope: Scope, reservationId: string) {
    const c = await this.contexte(userId, scope, reservationId);
    const limite = this.limite(c.delaiJours, c.debut);
    const enAttente = await this.demandeEnCours(scope, reservationId);

    return {
      scope: c.scope,
      reservationId: c.id,
      titre: c.titre,
      statut: c.statut,
      debut: c.debut,
      fin: c.fin,
      role: c.demandeurRole,
      modifiable: OCCUPANTS.includes(c.statut),
      annulation: {
        delaiJours: c.delaiJours,
        libreJusquA: limite,
        tardiveMaintenant: limite != null && new Date() > limite,
        /** Texte libre redige par l hote ou l agence. */
        conditions: c.conditions,
        /**
         * Le point que l interface doit dire en toutes lettres : rien n est
         * preleve, ces conditions valent sur l honneur tant que le paiement se
         * fait de la main a la main.
         */
        surLHonneur: true,
      },
      /**
       * Une reservation `pending` se retire sans accord : il n y a personne a
       * incommoder. L interface s en sert pour ne pas promettre une validation
       * qui n aura pas lieu.
       */
      accordRequis: c.statut !== 'pending',
      heuresPourRepondre: HEURES_POUR_REPONDRE,
      demandeEnCours: enAttente,
    };
  }

  private async demandeEnCours(scope: Scope, reservationId: string) {
    return this.prisma.changeRequest.findFirst({
      where: {
        status: 'pending',
        ...(scope === 'sejour' ? { bookingId: reservationId } : { serviceBookingId: reservationId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ------------------------------------------------------------------ //
  // Chiffrage d un changement de dates                                  //
  // ------------------------------------------------------------------ //

  /**
   * Ce que couteraient les nouvelles dates, et si elles sont seulement
   * possibles.
   *
   * Sert au devis ET a l application, comme `chiffrerExtension` : les deux
   * doivent repondre exactement la meme chose, sans quoi on appliquerait un
   * decalage que le devis annoncait impossible.
   */
  async chiffrerDates(userId: string, scope: Scope, reservationId: string, debut: Date, fin: Date) {
    return this.chiffrer(await this.contexte(userId, scope, reservationId), debut, fin);
  }

  /**
   * Le chiffrage proprement dit, sur un contexte DEJA resolu.
   *
   * Separe de la facade parce que `demander` et `appliquer` ont deja la
   * reservation en main : la resoudre une seconde fois doublait une requete a
   * chaque demande, sans rien verifier de plus. Meme forme que
   * `chiffrerExtension`, qui recoit la reservation et non son identifiant.
   */
  private async chiffrer(c: any, debut: Date, fin: Date) {
    if (fin <= debut) {
      throw new BadRequestException('La date de fin doit suivre la date de debut');
    }
    if (!OCCUPANTS.includes(c.statut)) {
      throw new BadRequestException('Cette reservation ne peut plus etre modifiee');
    }
    // On ne decale pas vers le passe : des dates ecoulees ne se reservent pas,
    // et l accepter ouvrirait la porte a la reecriture d un historique.
    const aujourdhui = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    if (debut < aujourdhui) {
      throw new BadRequestException('Les nouvelles dates ne peuvent pas commencer dans le passe');
    }

    if (c.scope === 'sejour') {
      // Chevauchement teste en s EXCLUANT soi-meme : la reservation qu on
      // deplace occupe evidemment ses propres dates actuelles.
      const occupe = await this.prisma.booking.findFirst({
        where: {
          listingId: c.brut.listingId,
          id: { not: c.id },
          status: { notIn: [BookingStatus.cancelled, BookingStatus.disputed] },
          AND: [{ checkIn: { lt: fin } }, { checkOut: { gt: debut } }],
        },
      });
      if (occupe) throw new BadRequestException('Ces dates sont deja reservees');

      const ferme = await this.prisma.listingCalendar.findFirst({
        where: {
          listingId: c.brut.listingId,
          blocked: true,
          AND: [{ startDate: { lt: fin } }, { endDate: { gt: debut } }],
        },
      });
      if (ferme) throw new BadRequestException('Le proprietaire a ferme ces dates');

      const t = await this.calendar.tarifer(c.brut.listingId, debut, fin);
      // minNights est oppose ICI, contrairement a l extension de sejour, et la
      // difference est voulue : une extension ALLONGE un sejour deja commence,
      // tandis qu un decalage refait un sejour entier — qui doit donc respecter
      // la duree minimale comme n importe quelle reservation.
      if (t.nuits < t.minNights) {
        throw new BadRequestException(
          `Ce logement demande au moins ${t.minNights} nuits sur cette periode`,
        );
      }

      // Menage, frais de service et assurance ne bougent PAS : ils valent pour
      // un sejour, pas pour une nuit, et le sejour reste le meme — il se
      // deplace. Les recalculer ferait payer deux fois un menage unique.
      const annexes =
        Number(c.brut.cleaningFee ?? 0) +
        Number(c.brut.serviceFee ?? 0) +
        Number(c.brut.insuranceFee ?? 0);

      return {
        scope: c.scope,
        debutActuel: c.debut,
        finActuelle: c.fin,
        debutDemande: debut,
        finDemandee: fin,
        unites: t.nuits,
        uniteLabel: 'nuits',
        nouveauPrix: Math.round((t.basePrice + annexes) * 100) / 100,
        ancienPrix: c.prix,
        devise: c.devise,
      };
    }

    // --- location de voiture ---
    const vehicleId = c.brut.vehicleId;
    if (!vehicleId) throw new BadRequestException('Location sans vehicule rattache');

    const chevauche = { AND: [{ startDate: { lt: fin } }, { endDate: { gt: debut } }] };
    const [ferme, prise] = await Promise.all([
      this.prisma.vehicleCalendar.findFirst({ where: { vehicleId, blocked: true, ...chevauche } }),
      this.prisma.serviceBooking.findFirst({
        where: {
          vehicleId,
          id: { not: c.id },
          type: ProviderType.location_voiture,
          status: { in: OCCUPANTS },
          ...chevauche,
        },
      }),
    ]);
    if (ferme) throw new BadRequestException('L agence a ferme ces dates');
    if (prise) throw new BadRequestException('Ce vehicule est deja loue sur ces dates');

    const t = await this.vehicles.tarifer(vehicleId, debut, fin);
    return {
      scope: c.scope,
      debutActuel: c.debut,
      finActuelle: c.fin,
      debutDemande: debut,
      finDemandee: fin,
      unites: t.jours,
      uniteLabel: 'jours',
      nouveauPrix: t.prix,
      ancienPrix: c.prix,
      devise: c.devise,
    };
  }

  // ------------------------------------------------------------------ //
  // Deposer une demande                                                 //
  // ------------------------------------------------------------------ //

  async demander(
    userId: string,
    dto: {
      scope: Scope;
      reservationId: string;
      kind: Kind;
      reasonCode: string;
      reasonText?: string;
      newStartDate?: string;
      newEndDate?: string;
    },
  ) {
    const c = await this.contexte(userId, dto.scope, dto.reservationId);

    if (!motifValide(dto.reasonCode, dto.scope)) {
      throw new BadRequestException('Motif inconnu');
    }
    // « Autre » sans texte ne dit rien, et c est justement le cas ou l on a
    // besoin de la phrase, puisque aucun code ne convenait.
    if (dto.reasonCode === 'autre' && !dto.reasonText?.trim()) {
      throw new BadRequestException('Precisez le motif');
    }
    if (TERMINAUX.includes(c.statut)) {
      throw new BadRequestException('Cette reservation est deja close');
    }

    const limite = this.limite(c.delaiJours, c.debut);
    // Le retard est CONSIGNE, jamais bloquant : refuser une annulation tardive
    // ne ferait pas venir le voyageur, elle garderait seulement les dates
    // bloquees pour rien.
    const tardive = limite != null && new Date() > limite;

    let newStart: Date | null = null;
    let newEnd: Date | null = null;
    let newPrice: number | null = null;

    if (dto.kind === 'modification_dates') {
      if (!dto.newStartDate || !dto.newEndDate) {
        throw new BadRequestException('Nouvelles dates requises');
      }
      newStart = new Date(dto.newStartDate);
      newEnd = new Date(dto.newEndDate);
      if (newStart.getTime() === c.debut.getTime() && newEnd.getTime() === c.fin.getTime()) {
        throw new BadRequestException('Ces dates sont deja celles de la reservation');
      }
      const devis = await this.chiffrer(c, newStart, newEnd);
      // Prix FIGE a la demande, comme pour l extension de sejour : c est le
      // montant que le demandeur a eu sous les yeux, et pas un autre.
      newPrice = devis.nouveauPrix;
    }

    // Retrait direct d une reservation que personne n a acceptee.
    if (c.statut === 'pending') {
      if (dto.kind === 'modification_dates') {
        throw new BadRequestException(
          'Modifiez directement votre demande tant qu elle n est pas acceptee',
        );
      }
      const annulee = await this.appliquerAnnulation(c, userId);
      await this.tracer(userId, c.id, 'change_request.retrait_avant_acceptation', {
        scope: dto.scope,
        motif: libelleMotif(dto.reasonCode),
      });
      return { applique: true, sansAccord: true, demande: null, reservation: annulee };
    }

    // Une nouvelle demande remplace la precedente : quelqu un qui se ravise n a
    // pas a attendre un refus pour proposer autre chose. Meme regle que
    // l extension de sejour.
    await this.prisma.changeRequest.updateMany({
      where: {
        status: 'pending',
        ...(dto.scope === 'sejour'
          ? { bookingId: dto.reservationId }
          : { serviceBookingId: dto.reservationId }),
      },
      data: { status: 'withdrawn', respondedAt: new Date(), respondedById: userId },
    });

    const demande = await this.prisma.changeRequest.create({
      data: {
        kind: dto.kind,
        scope: dto.scope,
        bookingId: dto.scope === 'sejour' ? dto.reservationId : null,
        serviceBookingId: dto.scope === 'location' ? dto.reservationId : null,
        requestedById: userId,
        requestedByRole: c.demandeurRole,
        newStartDate: newStart,
        newEndDate: newEnd,
        newPrice,
        reasonCode: dto.reasonCode,
        reasonText: dto.reasonText?.trim() || null,
        status: 'pending',
        autoAcceptAt: new Date(Date.now() + HEURES_POUR_REPONDRE * 60 * 60 * 1000),
        wasLate: tardive,
        // Copie des conditions TELLES QU ELLES ETAIENT : l hote peut modifier
        // son delai apres coup, et on ne saurait plus ce qui a ete oppose.
        policySnapshot: toDbJson({
          delaiJours: c.delaiJours,
          libreJusquA: limite,
          conditions: c.conditions,
          surLHonneur: true,
        }),
      },
    });

    // Un motif qui met en cause l autre partie est trace a part : il n emporte
    // aucune sanction — la parole d une seule partie ne prouve rien, comme pour
    // les sinistres — mais une recurrence doit etre visible de l administration.
    if (metEnCause(dto.reasonCode)) {
      await this.tracer(userId, demande.id, 'change_request.mise_en_cause', {
        scope: dto.scope,
        reservationId: dto.reservationId,
        motif: libelleMotif(dto.reasonCode),
        viseId: c.destinataireId,
      });
    }

    await this.tracer(userId, demande.id, `change_request.${dto.kind}_demandee`, {
      scope: dto.scope,
      reservationId: dto.reservationId,
      motif: libelleMotif(dto.reasonCode),
      tardive,
    });

    return { applique: false, sansAccord: false, demande, reservation: null };
  }

  // ------------------------------------------------------------------ //
  // Repondre                                                            //
  // ------------------------------------------------------------------ //

  async repondre(userId: string, demandeId: string, accepte: boolean, note?: string) {
    const demande = await this.prisma.changeRequest.findUnique({ where: { id: demandeId } });
    if (!demande) throw new NotFoundException('Demande non trouvee');
    if (demande.status !== 'pending') throw new BadRequestException('Demande deja traitee');

    const reservationId = (demande.bookingId ?? demande.serviceBookingId) as string;
    // `contexte` porte le controle d acces : il ne rend la reservation qu a ses
    // deux parties. Un tiers recoit un 404 avant d atteindre quoi que ce soit.
    const c = await this.contexte(userId, demande.scope as Scope, reservationId);

    // Repondre a sa propre demande n est pas repondre, c est la retirer.
    if (demande.requestedById === userId) {
      throw new BadRequestException('Utilisez le retrait pour votre propre demande');
    }

    if (!accepte) {
      const refusee = await this.prisma.changeRequest.update({
        where: { id: demandeId },
        data: {
          status: 'refused',
          respondedAt: new Date(),
          respondedById: userId,
          responseNote: note?.trim() || null,
        },
      });
      await this.tracer(userId, demandeId, 'change_request.refusee', {
        scope: demande.scope,
        reservationId,
      });
      return { demande: refusee, reservation: null };
    }

    const reservation = await this.appliquer(demande, c);
    const acceptee = await this.prisma.changeRequest.update({
      where: { id: demandeId },
      data: {
        status: 'accepted',
        respondedAt: new Date(),
        respondedById: userId,
        responseNote: note?.trim() || null,
      },
    });
    await this.tracer(userId, demandeId, 'change_request.acceptee', {
      scope: demande.scope,
      reservationId,
    });
    return { demande: acceptee, reservation };
  }

  /** Le demandeur se ravise avant toute reponse. */
  async retirer(userId: string, demandeId: string) {
    const demande = await this.prisma.changeRequest.findFirst({
      where: { id: demandeId, requestedById: userId },
    });
    if (!demande) throw new NotFoundException('Demande non trouvee');
    if (demande.status !== 'pending') throw new BadRequestException('Demande deja traitee');

    return this.prisma.changeRequest.update({
      where: { id: demandeId },
      data: { status: 'withdrawn', respondedAt: new Date(), respondedById: userId },
    });
  }

  // ------------------------------------------------------------------ //
  // Application                                                         //
  // ------------------------------------------------------------------ //

  private async appliquer(demande: any, c: any) {
    if (demande.kind === 'annulation') {
      return this.appliquerAnnulation(c, demande.requestedById);
    }

    const debut = new Date(demande.newStartDate);
    const fin = new Date(demande.newEndDate);

    // Disponibilite REVERIFIEE ici, et c est le point essentiel : entre la
    // demande et la reponse, quelqu un d autre a pu prendre ces dates.
    // Appliquer sur la foi du devis les vendrait deux fois.
    await this.chiffrer(c, debut, fin);

    // Le PRIX en revanche reste celui de la demande, meme si les tarifs ont
    // change depuis : c est celui que le demandeur a accepte.
    const prix = Number(demande.newPrice ?? c.prix);

    if (demande.scope === 'sejour') {
      const nuits = Math.round((fin.getTime() - debut.getTime()) / JOUR_MS);
      return this.prisma.booking.update({
        where: { id: c.id },
        data: { checkIn: debut, checkOut: fin, totalNights: nuits, totalPrice: prix },
      });
    }
    return this.prisma.serviceBooking.update({
      where: { id: c.id },
      data: { startDate: debut, endDate: fin, price: prix },
    });
  }

  private async appliquerAnnulation(c: any, parQui: string) {
    if (c.scope === 'sejour') {
      return this.prisma.booking.update({
        where: { id: c.id },
        data: { status: BookingStatus.cancelled, cancelledAt: new Date(), cancelledBy: parQui },
      });
    }
    return this.prisma.serviceBooking.update({
      where: { id: c.id },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelledBy: parQui },
    });
  }

  // ------------------------------------------------------------------ //
  // Echeances                                                           //
  // ------------------------------------------------------------------ //

  /**
   * Applique les demandes dont le delai de reponse a expire.
   *
   * Le projet n a AUCUN ordonnanceur, et en ajouter un pour cela seul serait
   * disproportionne. Le balayage est donc paresseux : il tourne quand quelqu un
   * consulte ses demandes. La consequence est assumee — une echeance prend effet
   * au premier regard, pas a la seconde pres — et elle est sans portee pratique,
   * puisque personne ne constate un changement sans regarder.
   *
   * Meme raisonnement que le fil de notifications, qui derive son contenu de
   * l etat courant plutot que de le stocker.
   */
  async appliquerEcheances(): Promise<number> {
    const expirees = await this.prisma.changeRequest.findMany({
      where: { status: 'pending', autoAcceptAt: { lte: new Date() } },
      take: 50,
    });

    let appliquees = 0;
    for (const demande of expirees) {
      try {
        const reservationId = (demande.bookingId ?? demande.serviceBookingId) as string;
        // On se place du point de vue du DEMANDEUR : c est sa demande qui prend
        // effet, faute de reponse.
        const c = await this.contexte(demande.requestedById, demande.scope as Scope, reservationId);
        await this.appliquer(demande, c);
        await this.prisma.changeRequest.update({
          where: { id: demande.id },
          data: { status: 'expired', respondedAt: new Date() },
        });
        appliquees += 1;
      } catch (e: any) {
        // Une demande devenue inapplicable — dates reprises entre-temps,
        // reservation close par ailleurs — ne doit pas bloquer les autres. Elle
        // est refermee avec sa raison plutot que retentee sans fin.
        await this.prisma.changeRequest.update({
          where: { id: demande.id },
          data: {
            status: 'refused',
            respondedAt: new Date(),
            responseNote: `Echeance non applicable : ${e?.message ?? 'erreur'}`,
          },
        });
        this.logger.warn(`Echeance non applicable sur ${demande.id} : ${e?.message}`);
      }
    }
    return appliquees;
  }

  // ------------------------------------------------------------------ //
  // Listes                                                              //
  // ------------------------------------------------------------------ //

  /**
   * Les demandes qui concernent cet utilisateur, dans les deux sens.
   *
   * `recues` est ce qui attend une decision de sa part — c est ce que compte la
   * cloche. `envoyees` est ce qu il a demande et attend.
   */
  async mesDemandes(userId: string) {
    await this.appliquerEcheances();

    const [envoyees, recues] = await Promise.all([
      this.prisma.changeRequest.findMany({
        where: { requestedById: userId },
        include: this.inclusions(),
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.changeRequest.findMany({
        where: {
          requestedById: { not: userId },
          OR: [
            { booking: { OR: [{ travelerId: userId }, { ownerId: userId }] } },
            { serviceBooking: { OR: [{ requesterId: userId }, { provider: { userId } }] } },
          ],
        },
        include: this.inclusions(),
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const decorer = (d: any) => ({
      ...d,
      motifLabel: libelleMotif(d.reasonCode),
      titre:
        d.booking?.listing?.title ??
        (d.serviceBooking?.vehicle
          ? `${d.serviceBooking.vehicle.brand} ${d.serviceBooking.vehicle.model}`
          : 'Reservation'),
      conditions: d.policySnapshot ? JSON.parse(d.policySnapshot) : null,
    });

    return {
      envoyees: envoyees.map(decorer),
      recues: recues.map(decorer),
      aRepondre: recues.filter((d) => d.status === 'pending').length,
      heuresPourRepondre: HEURES_POUR_REPONDRE,
    };
  }

  private inclusions() {
    return {
      booking: { include: { listing: { select: { title: true, city: true } } } },
      serviceBooking: { include: { vehicle: { select: { brand: true, model: true } } } },
      requestedBy: { select: { firstName: true, lastName: true } },
    } as const;
  }

  private async tracer(userId: string, entityId: string, action: string, details: any) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: 'change_request',
        entityId,
        details: toDbJson(details),
        ipAddress: 'system',
        userAgent: 'system',
      },
    });
  }
}

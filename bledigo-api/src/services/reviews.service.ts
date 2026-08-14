import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SensAvis = 'client_vers_prestataire' | 'prestataire_vers_client';

/**
 * Notation mutuelle des prestations.
 *
 * Deux principes qui viennent de ce qu on a deja appris ailleurs dans ce code.
 *
 * 1. L inaction d une partie ne bloque pas l autre. On n exige pas qu un statut
 *    `completed` soit pose par le prestataire pour ouvrir la notation : la
 *    prestation est notable des que sa date de fin est passee. Le no-show a
 *    montre ce que coute un declenchement confie a une seule main.
 *
 * 2. La note du prestataire ne se calcule que sur les avis QUE SES CLIENTS lui
 *    laissent. Melanger les deux sens ferait grimper la note d un prestataire
 *    genereux avec ses clients, ce qui n apprend rien a personne.
 */
@Injectable()
export class ServiceReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private async prestationNotable(userId: string, serviceBookingId: string) {
    const demande = await this.prisma.serviceBooking.findUnique({
      where: { id: serviceBookingId },
      include: { provider: true },
    });
    if (!demande) throw new NotFoundException('Prestation non trouvee');

    const estClient = demande.requesterId === userId;
    const estPrestataire = demande.provider.userId === userId;
    if (!estClient && !estPrestataire) throw new ForbiddenException('Prestation etrangere');

    if (demande.status === 'cancelled') {
      throw new BadRequestException('Prestation annulee : rien a noter');
    }
    if (demande.status === 'pending') {
      throw new BadRequestException('Prestation pas encore acceptee');
    }
    // La date fait foi, pas le clic d une des deux parties.
    if (new Date() < new Date(demande.endDate)) {
      throw new BadRequestException('Prestation pas encore terminee');
    }

    return { demande, estClient };
  }

  async noter(userId: string, serviceBookingId: string, rating: number, comment?: string) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('La note va de 1 a 5');
    }
    const { demande, estClient } = await this.prestationNotable(userId, serviceBookingId);
    const direction: SensAvis = estClient ? 'client_vers_prestataire' : 'prestataire_vers_client';

    const existant = await this.prisma.serviceReview.findFirst({
      where: { serviceBookingId, direction },
    });
    if (existant) throw new BadRequestException('Avis deja depose');

    const avis = await this.prisma.serviceReview.create({
      data: {
        serviceBookingId,
        providerId: demande.providerId,
        authorId: userId,
        direction,
        rating,
        comment,
      },
    });

    // La prestation est close des qu elle a ete notee par son client : c est le
    // seul signal qui atteste qu elle a bien eu lieu.
    if (estClient && demande.status !== 'completed') {
      await this.prisma.serviceBooking.update({
        where: { id: serviceBookingId },
        data: { status: 'completed' },
      });
    }

    await this.recalculer(demande.providerId);
    return avis;
  }

  /**
   * Recalcul complet plutot qu incremental.
   *
   * Une moyenne mise a jour par increments derive des qu un avis est supprime
   * ou modere. Le volume ne justifie aucune optimisation ici, et une agregation
   * fausse dans un systeme dont l argument principal est la confiance coute
   * beaucoup plus cher que quelques millisecondes.
   */
  async recalculer(providerId: string) {
    const [agg, jobs] = await Promise.all([
      this.prisma.serviceReview.aggregate({
        where: { providerId, direction: 'client_vers_prestataire' },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.serviceBooking.count({ where: { providerId, status: 'completed' } }),
    ]);

    const moyenne = agg._avg.rating ?? 0;
    const nombre = agg._count._all;

    return this.prisma.serviceProvider.update({
      where: { id: providerId },
      data: {
        avgRating: Math.round(moyenne * 100) / 100,
        totalReviews: nombre,
        totalJobs: jobs,
        trustScore: this.score(moyenne, nombre, jobs),
      },
    });
  }

  /**
   * Score de confiance d un prestataire.
   *
   * Volontairement lisible et non appris, comme `heuristique-v2` pour les
   * annonces : la note pondere, le volume donne du poids a la note, et
   * l anciennete des prestations reelles compte. Un 5/5 sur un seul avis ne
   * doit pas battre un 4,6 sur trente.
   *
   * La ponderation par le volume est la partie qui compte : sans elle, un faux
   * prestataire s achete une reputation avec un unique avis complaisant.
   */
  private score(moyenne: number, nombre: number, jobs: number) {
    if (nombre === 0) return 0;
    // Confiance dans la moyenne : 0 sans avis, ~0.5 a 5 avis, ~0.9 a 30.
    const confiance = nombre / (nombre + 5);
    const base = (moyenne / 5) * 100;
    // Un plancher de 50 tant qu il n y a pas de volume, pour ne pas ecraser un
    // nouveau prestataire honnete des son premier avis moyen.
    const pondere = 50 + (base - 50) * confiance;
    // Les prestations menees a terme comptent, plafonnees : elles temoignent
    // d une activite reelle sans permettre de compenser une mauvaise note.
    const activite = Math.min(jobs, 20) * 0.25;
    return Math.round(Math.max(0, Math.min(100, pondere + activite)));
  }

  /** Avis publics d un prestataire : uniquement ce que ses clients ont ecrit. */
  async avisDuPrestataire(providerId: string) {
    return this.prisma.serviceReview.findMany({
      where: { providerId, direction: 'client_vers_prestataire' },
      select: { id: true, rating: true, comment: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Reputation d un client vue par les prestataires.
   *
   * Reservee aux prestataires : c est l equivalent du passeport voyageur, et
   * elle n a pas a etre publique.
   */
  async reputationClient(userId: string) {
    const avis = await this.prisma.serviceReview.findMany({
      where: { direction: 'prestataire_vers_client', serviceBooking: { requesterId: userId } },
      select: { rating: true, comment: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const moyenne = avis.length ? avis.reduce((s, a) => s + a.rating, 0) / avis.length : null;
    return {
      note: moyenne != null ? Math.round(moyenne * 100) / 100 : null,
      nombre: avis.length,
      avis,
    };
  }
}

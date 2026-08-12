import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, ValidationStatus, DisputeStatus } from '../common/enums';

/**
 * Extraction des variables d un logement.
 *
 * Ce module est volontairement separe du calcul du score. C est lui qui rendra
 * un modele appris possible en phase 2 : un modele n a pas besoin de notre
 * heuristique, il a besoin des MEMES variables, observees sur un historique.
 * Tant qu on ne stocke que le score final, on ne peut rien entrainer.
 *
 * Regle a tenir : tout ce qui entre dans le score passe par ici, sous forme
 * numerique et documentee. Aucun calcul de score dans ce fichier.
 */

export type ListingFeatures = {
  /** --- Volume : sans lui, aucun taux n a de sens statistique. --- */
  sejoursTermines: number;
  avisRecus: number;
  ageJours: number;

  /** --- Conformite constatee, la seule mesure d ecart entre promesse et realite. --- */
  validationsExplicites: number;
  /** Validation par expiration du delai : le voyageur n a rien confirme. */
  validationsAutomatiques: number;
  refusArrivee: number;
  litigesOuverts: number;
  litigesPerdusParHote: number;
  /** Part des criteres decoches sur l ensemble des validations negatives. */
  criteresEchoues: Record<string, number>;

  /** --- Satisfaction declaree. --- */
  noteMoyenne: number;
  proprete: number;

  /** --- Elements verifiables par la plateforme. --- */
  photos: number;
  photosCertifiees: number;
  niveauCertification: string;
  visitesControle: number;

  /** --- Signaux de comportement de l hote. --- */
  tentativesHorsPlateforme: number;
  annulationsParHote: number;
};

@Injectable()
export class FeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  async collecter(listingId: string): Promise<ListingFeatures | null> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { photos: true, reviews: true, passport: true },
    });
    if (!listing) return null;

    const [bookings, litiges, passeportHote] = await Promise.all([
      this.prisma.booking.findMany({
        where: { listingId },
        select: { status: true, validationStatus: true, validationData: true },
      }),
      this.prisma.dispute.findMany({
        where: { booking: { listingId } },
        select: { status: true },
      }),
      this.prisma.ownerPassport.findUnique({ where: { userId: listing.ownerId } }),
    ]);

    // Les criteres decoches disent OU l annonce ment : emplacement, proprete,
    // equipements. C est le detail le plus exploitable par un modele.
    const criteresEchoues: Record<string, number> = {};
    for (const b of bookings) {
      if (b.validationStatus !== ValidationStatus.refused) continue;
      try {
        const donnees = JSON.parse(String(b.validationData ?? '{}'));
        for (const [cle, valeur] of Object.entries(donnees.criteria ?? {})) {
          if (valeur === false) criteresEchoues[cle] = (criteresEchoues[cle] ?? 0) + 1;
        }
      } catch {
        // Donnee illisible : on l ignore plutot que de fausser le compte.
      }
    }

    const avis = listing.reviews ?? [];
    const moyenne = (extraire: (r: any) => number) =>
      avis.length ? avis.reduce((s: number, r: any) => s + (extraire(r) || 0), 0) / avis.length : 0;

    return {
      sejoursTermines: bookings.filter((b) => b.status === BookingStatus.completed).length,
      avisRecus: avis.length,
      ageJours: Math.floor((Date.now() - new Date(listing.createdAt).getTime()) / 86400000),

      validationsExplicites: bookings.filter(
        (b) => b.validationStatus === ValidationStatus.validated,
      ).length,
      validationsAutomatiques: bookings.filter(
        (b) => b.validationStatus === ValidationStatus.auto_validated,
      ).length,
      refusArrivee: bookings.filter((b) => b.validationStatus === ValidationStatus.refused).length,
      litigesOuverts: litiges.length,
      litigesPerdusParHote: litiges.filter((d) => d.status === DisputeStatus.refunded).length,
      criteresEchoues,

      noteMoyenne: moyenne((r) => r.rating),
      proprete: moyenne((r) => r.cleanliness),

      photos: listing.photos.length,
      photosCertifiees: listing.photos.filter((p: any) => p.isCertified).length,
      niveauCertification: listing.certificationLevel,
      visitesControle: listing.passport?.controlVisitsCount ?? 0,

      tentativesHorsPlateforme: passeportHote?.offPlatformAttempts ?? 0,
      annulationsParHote: bookings.filter((b) => b.status === BookingStatus.cancelled).length,
    };
  }
}

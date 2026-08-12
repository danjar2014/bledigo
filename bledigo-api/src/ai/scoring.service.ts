import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeaturesService, type ListingFeatures } from './features.service';
import { toDbJson, fromDbJson } from '../common/json';

/**
 * Notation d un logement.
 *
 * Trois principes, poses pour que la phase 2 puisse substituer un modele appris
 * sans rien changer autour :
 *
 * 1. `calculer()` est une fonction PURE des variables. Aucun acces base, aucune
 *    date, aucun hasard. Elle se remplace par un appel de modele, et se teste.
 * 2. `MODELE` identifie la version. Un score archive reste interpretable meme
 *    apres changement de formule.
 * 3. Chaque recalcul archive les variables ET le resultat dans le passeport du
 *    logement. C est ce journal qui constituera le jeu d entrainement : sans
 *    lui, la phase 2 demarrerait sans donnees.
 */

const MODELE = 'heuristique-v2';

/**
 * Lissage bayesien : un logement sans historique ne vaut ni 0 ni 100.
 *
 * Sans cela, un premier sejour valide donnerait 100 % de conformite et un
 * premier refus 0 % — deux verdicts absurdes sur une seule observation. On part
 * d une presomption moyenne que les faits deplacent d autant plus vite qu ils
 * sont nombreux.
 */
const PRESOMPTION = 0.75;
const POIDS_PRESOMPTION = 3;

/** La validation automatique compte moins : le voyageur n a rien confirme. */
const POIDS_VALIDATION_AUTO = 0.4;

const CERTIF_POINTS: Record<string, number> = {
  none: 0,
  bronze: 5,
  silver: 10,
  gold: 15,
  diamond: 20,
};

export type Scores = {
  trustScore: number;
  /** Ecart constate entre l annonce et la realite, c est LE score de conformite. */
  complianceScore: number;
  qualityScore: number;
  cleanlinessScore: number;
  safetyScore: number;
  modele: string;
};

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeaturesService,
  ) {}

  /**
   * Fonction pure : memes variables, memes scores. C est le point de
   * substitution du modele appris.
   */
  calculer(f: ListingFeatures): Scores {
    // --- Conformite : rapport entre sejours conformes et sejours juges ---
    const favorables = f.validationsExplicites + f.validationsAutomatiques * POIDS_VALIDATION_AUTO;
    const defavorables = f.refusArrivee + f.litigesPerdusParHote + f.litigesOuverts * 0.5;
    const juges = favorables + defavorables;

    const tauxConformite =
      (favorables + PRESOMPTION * POIDS_PRESOMPTION) / (juges + POIDS_PRESOMPTION);

    // Un refus n est pas un litige de plus : il signale que le voyageur a
    // prefere partir. On le penalise au-dela du simple taux.
    const penaliteRefus = Math.min(f.refusArrivee * 8, 30);
    const complianceScore = Math.round(
      Math.max(0, Math.min(100, tauxConformite * 100 - penaliteRefus)),
    );

    // --- Qualite et proprete : declaratif des voyageurs, sur 5 ---
    const qualityScore = Math.round(Math.min(100, (f.noteMoyenne / 5) * 100));
    const cleanlinessScore = Math.round(Math.min(100, (f.proprete / 5) * 100));

    // --- Securite : ce que la plateforme a verifie elle-meme ---
    const safetyScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          40 +
            (CERTIF_POINTS[f.niveauCertification] ?? 0) * 2 +
            Math.min(f.photosCertifiees * 5, 20) +
            Math.min(f.visitesControle * 10, 20) -
            f.tentativesHorsPlateforme * 15,
        ),
      ),
    );

    // --- Confiance : synthese, la conformite pesant le plus ---
    const volume = Math.min(f.sejoursTermines * 3 + f.avisRecus * 2, 20);
    const anciennete = Math.min(Math.floor(f.ageJours / 30), 10);
    const trustScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          complianceScore * 0.4 +
            qualityScore * 0.2 +
            safetyScore * 0.2 +
            volume * 0.5 +
            anciennete * 0.5 -
            f.annulationsParHote * 2,
        ),
      ),
    );

    return { trustScore, complianceScore, qualityScore, cleanlinessScore, safetyScore, modele: MODELE };
  }

  /**
   * Recalcule et archive. Appele apres chaque evenement qui change les faits :
   * validation, refus, litige, avis, certification.
   *
   * Ne leve jamais : une erreur de notation ne doit pas faire echouer la
   * reservation ou l avis qui l a declenchee.
   */
  async recalculer(listingId: string, declencheur: string): Promise<Scores | null> {
    try {
      const f = await this.features.collecter(listingId);
      if (!f) return null;

      const scores = this.calculer(f);

      await this.prisma.listing.update({
        where: { id: listingId },
        data: {
          trustScore: scores.trustScore,
          complianceScore: scores.complianceScore,
          qualityScore: scores.qualityScore,
          cleanlinessScore: scores.cleanlinessScore,
          safetyScore: scores.safetyScore,
        },
      });

      await this.archiver(listingId, f, scores, declencheur);
      return scores;
    } catch (e) {
      this.logger.error(`Recalcul impossible pour ${listingId} : ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * Journal des variables et des scores, dans le passeport du logement.
   *
   * C est le jeu d entrainement de la phase 2 : chaque ligne associe l etat
   * observe a la note qui en a ete tiree, et au fait qui l a declenchee. Un
   * modele supervise a besoin exactement de cela.
   */
  private async archiver(
    listingId: string,
    features: ListingFeatures,
    scores: Scores,
    declencheur: string,
  ) {
    const passeport = await this.prisma.listingPassport.findUnique({ where: { listingId } });
    if (!passeport) return;

    const historique = fromDbJson<any[]>(passeport.scoresHistory, []);
    historique.push({ date: new Date().toISOString(), declencheur, features, scores });

    // On borne : ce journal sert a apprendre, pas a tout conserver. Les 200
    // dernieres observations suffisent, et l export se fera avant purge.
    await this.prisma.listingPassport.update({
      where: { listingId },
      data: { scoresHistory: toDbJson(historique.slice(-200)) },
    });
  }
}

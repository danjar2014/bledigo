import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service';
import { BookingStatus, SanctionType } from '../common/enums';
import { toDbJson } from '../common/json';

/**
 * Absences a l arrivee et annulations tardives.
 *
 * Sans paiement en ligne, il n existe aucun levier financier : un voyageur qui
 * ne se presente pas ne perd rien, et l hote a bloque ses dates pour rien. Le
 * seul recours disponible est le compte du voyageur.
 *
 * D ou une exigence que le paiement rendait inutile : la PREUVE. Une sanction
 * ne peut pas reposer sur la seule parole de l hote, qui a interet a declarer
 * une absence pour liberer ses dates ou pour nuire. Et elle ne peut pas non
 * plus reposer sur l absence de check-in, puisque le check-in est declenche par
 * l hote lui-meme : son inaction ne prouve rien contre le voyageur.
 *
 * Il faut donc deux signaux qui ne viennent pas de la meme main :
 *  - le voyageur declare son arrivee ;
 *  - l hote declare l absence, une fois le delai de grace ecoule.
 *
 * Les deux se contredisent ? C est un litige, pas une sanction. Personne n a
 * les moyens de trancher automatiquement entre ces deux paroles.
 *
 * Le meme raisonnement que RefusalGuardService s applique ensuite : c est
 * l acteur recurrent qu on regarde, taux compris, pas l incident isole.
 */

/** Fenetre glissante d observation, alignee sur celle des refus. */
const FENETRE_JOURS = 180;

/** Au-dela, on considere que l acteur recidive. */
const SEUIL = 2;

/** En dessous de ce volume, un taux n a pas de sens. */
const VOLUME_MINIMAL = 3;

const SUSPENSION_JOURS = 30;

/**
 * Delai laisse au voyageur pour se signaler apres l heure d arrivee prevue.
 *
 * Un retard d avion, une route coupee, un telephone vide : rien de tout cela ne
 * fait un voyageur de mauvaise foi. L hote ne peut donc pas declarer l absence
 * le jour meme.
 */
const GRACE_HEURES = 24;

export type VerdictAbsence = {
  etabli: boolean;
  contradiction: boolean;
  absencesVoyageur: number;
  declarationsHote: number;
  tauxDeclarationsHote: number | null;
  sanctions: { userId: string; type: SanctionType; motif: string }[];
};

@Injectable()
export class NoShowGuardService {
  private readonly logger = new Logger(NoShowGuardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly antiFraud: AntiFraudService,
  ) {}

  /** Fin du delai de grace pour une reservation donnee. */
  static finDuDelaiDeGrace(checkIn: Date) {
    return new Date(new Date(checkIn).getTime() + GRACE_HEURES * 60 * 60 * 1000);
  }

  /**
   * Tranche une declaration d absence deja enregistree sur la reservation.
   *
   * `contradiction` : le voyageur avait declare son arrivee. On ne sanctionne
   * personne — mais la declaration de l hote reste comptee, c est justement ce
   * qui rend un hote menteur visible a la longue.
   */
  async evaluer(bookingId: string): Promise<VerdictAbsence> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return {
        etabli: false, contradiction: false, absencesVoyageur: 0,
        declarationsHote: 0, tauxDeclarationsHote: null, sanctions: [],
      };
    }

    const { travelerId, ownerId } = booking;
    const contradiction = booking.arrivalConfirmedAt != null;
    const etabli = !contradiction;

    const depuis = new Date(Date.now() - FENETRE_JOURS * 24 * 60 * 60 * 1000);
    const declaree = { noShowDeclaredAt: { gte: depuis } };

    const [absencesVoyageur, declarationsHote, sejoursHote] = await Promise.all([
      // Absences etablies contre ce voyageur : celles qu il n a pas contredites.
      this.prisma.booking.count({
        where: { ...declaree, travelerId, arrivalConfirmedAt: null },
      }),
      // Toutes les declarations de cet hote, contredites ou non.
      this.prisma.booking.count({ where: { ...declaree, ownerId } }),
      this.prisma.booking.count({
        where: {
          ownerId,
          updatedAt: { gte: depuis },
          status: { in: [BookingStatus.completed, BookingStatus.cancelled] },
        },
      }),
    ]);

    const tauxDeclarationsHote =
      sejoursHote >= VOLUME_MINIMAL ? declarationsHote / sejoursHote : null;
    const sanctions: VerdictAbsence['sanctions'] = [];

    // Le voyageur : une absence peut arriver, la repetition non. Sanction
    // revocable, jamais un bannissement — la preuve reste une parole contre
    // une absence de parole.
    if (etabli && absencesVoyageur >= SEUIL) {
      sanctions.push({
        userId: travelerId,
        type: SanctionType.suspend,
        motif: `${absencesVoyageur} absences a l arrivee en ${FENETRE_JOURS} jours, sans declaration d arrivee de votre part`,
      });
    }

    // L hote : declarer une absence libere ses dates et penalise le voyageur.
    // Celui qui en declare beaucoup rapporte a ses sejours aboutis merite le
    // meme examen qu un hote qui refuse beaucoup de logements.
    if (declarationsHote >= SEUIL && tauxDeclarationsHote != null && tauxDeclarationsHote >= 0.5) {
      sanctions.push({
        userId: ownerId,
        type: SanctionType.watch,
        motif: `${declarationsHote} absences declarees en ${FENETRE_JOURS} jours (${Math.round(tauxDeclarationsHote * 100)} % de ses sejours)`,
      });
    }

    for (const s of sanctions) {
      await this.antiFraud.applySanction(s.userId, s.type, s.motif, SUSPENSION_JOURS, 'absence_arrivee');
    }

    // Trace systematique, sanction ou non : c est cet historique qui permettra
    // de distinguer un voyageur negligent d un hote qui declare a tort.
    await this.prisma.auditLog.create({
      data: {
        userId: booking.noShowDeclaredBy ?? ownerId,
        action: contradiction ? 'booking.absence_contredite' : 'booking.absence_etablie',
        entityType: 'booking',
        entityId: bookingId,
        details: toDbJson({
          travelerId, ownerId, contradiction,
          absencesVoyageur, declarationsHote, tauxDeclarationsHote, sanctions,
        }),
        ipAddress: 'system',
        userAgent: 'system',
      },
    });

    if (contradiction) {
      this.logger.warn(
        `Absence ${bookingId} contredite : le voyageur avait declare son arrivee, aucune sanction`,
      );
    }

    return { etabli, contradiction, absencesVoyageur, declarationsHote, tauxDeclarationsHote, sanctions };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service';
import { BookingStatus, SanctionType, ValidationStatus } from '../common/enums';
import { toDbJson } from '../common/json';

/**
 * Surveillance des refus de logement.
 *
 * Le refus annule la reservation sans prelevement : c est exactement la porte
 * de sortie que cherche une entente entre un hote et son voyageur, qui se
 * regleraient ensuite de la main a la main, sans commission.
 *
 * Le signal determinant n est PAS le couple hote-voyageur. Un hote qui vit de
 * ce contournement propose l arrangement a chaque nouveau client : le duo ne
 * se repete jamais, alors que lui revient a chaque fois. C est donc l acteur
 * recurrent qu il faut regarder, de chaque cote.
 *
 * Le taux compte autant que le nombre. Un hote honnete accumule des sejours
 * menes a terme ; deux refus noyes dans trente sejours reussis signalent un
 * probleme de qualite, deux refus sur trois reservations signalent autre chose.
 */

/** Fenetre glissante d observation. */
const FENETRE_JOURS = 180;

/** Au-dela, on considere que l acteur recidive. */
const SEUIL_REFUS = 2;

/** En dessous de ce volume, le taux n a pas de sens statistique. */
const VOLUME_MINIMAL = 3;

const SUSPENSION_JOURS = 30;

export type VerdictRefus = {
  refusVoyageur: number;
  refusHote: number;
  refusMemeDuo: number;
  tauxHote: number | null;
  sanctions: { userId: string; type: SanctionType; motif: string }[];
};

@Injectable()
export class RefusalGuardService {
  private readonly logger = new Logger(RefusalGuardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly antiFraud: AntiFraudService,
  ) {}

  async evaluer(bookingId: string, travelerId: string, ownerId: string): Promise<VerdictRefus> {
    const depuis = new Date(Date.now() - FENETRE_JOURS * 24 * 60 * 60 * 1000);
    const refuse = { validationStatus: ValidationStatus.refused, updatedAt: { gte: depuis } };

    const [refusVoyageur, refusHote, refusMemeDuo, sejoursHote] = await Promise.all([
      this.prisma.booking.count({ where: { ...refuse, travelerId } }),
      this.prisma.booking.count({ where: { ...refuse, ownerId } }),
      this.prisma.booking.count({ where: { ...refuse, ownerId, travelerId } }),
      this.prisma.booking.count({
        where: {
          ownerId,
          updatedAt: { gte: depuis },
          status: { in: [BookingStatus.completed, BookingStatus.cancelled] },
        },
      }),
    ]);

    const tauxHote = sejoursHote >= VOLUME_MINIMAL ? refusHote / sejoursHote : null;
    const sanctions: VerdictRefus['sanctions'] = [];

    // Le duo qui se repete reste le cas le plus difficile a expliquer
    // autrement : on n attend pas d autre signal.
    if (refusMemeDuo >= 2) {
      sanctions.push(
        { userId: ownerId, type: SanctionType.suspend, motif: `Entente suspectee : ${refusMemeDuo} refus entre les memes personnes` },
        { userId: travelerId, type: SanctionType.suspend, motif: `Entente suspectee : ${refusMemeDuo} refus entre les memes personnes` },
      );
    } else {
      // L hote recurrent : soit son annonce est mensongere, soit il organise
      // le contournement. Les deux justifient d arreter la diffusion.
      if (refusHote >= SEUIL_REFUS) {
        const proportion = tauxHote != null ? ` (${Math.round(tauxHote * 100)} % de ses sejours)` : '';
        sanctions.push({
          userId: ownerId,
          type: SanctionType.suspend,
          motif: `${refusHote} logements refuses a l arrivee en ${FENETRE_JOURS} jours${proportion}`,
        });
      }

      // Le voyageur recurrent : deux refus peuvent relever de la malchance,
      // mais la repetition doit etre examinee. Sanction revocable, pas un
      // bannissement.
      if (refusVoyageur >= SEUIL_REFUS) {
        sanctions.push({
          userId: travelerId,
          type: SanctionType.suspend,
          motif: `${refusVoyageur} refus de logement en ${FENETRE_JOURS} jours`,
        });
      }
    }

    for (const s of sanctions) {
      await this.antiFraud.applySanction(
        s.userId,
        s.type,
        s.motif,
        SUSPENSION_JOURS,
        'refus_logement',
      );
    }

    // Trace systematique, y compris sans sanction : c est cet historique qui
    // permettra plus tard de distinguer une annonce mediocre d un contournement.
    await this.prisma.auditLog.create({
      data: {
        userId: travelerId,
        action: 'booking.refused',
        entityType: 'booking',
        entityId: bookingId,
        details: toDbJson({ ownerId, refusVoyageur, refusHote, refusMemeDuo, tauxHote, sanctions }),
        ipAddress: 'system',
        userAgent: 'system',
      },
    });

    if (sanctions.length) {
      this.logger.warn(
        `Refus ${bookingId} : ${sanctions.length} sanction(s) — voyageur ${refusVoyageur}, hote ${refusHote}, duo ${refusMemeDuo}`,
      );
    }

    return { refusVoyageur, refusHote, refusMemeDuo, tauxHote, sanctions };
  }
}

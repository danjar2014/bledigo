import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderType } from '../../common/enums';
import { CreneauDto, AbsenceDto } from '../dto';

/**
 * Disponibilites d un prestataire : quand il travaille, et quand il ne
 * travaille pas.
 *
 * Un prestataire propose ses services a des HEURES, pas a des jours. Le
 * proposer pour une intervention a 7 h alors qu il commence a 9 h fait perdre
 * son temps a tout le monde : l hote attend une reponse qui sera un refus, et
 * le prestataire refuse une demande qui n aurait pas du lui parvenir.
 *
 * Trois choses rendent un creneau indisponible, et il faut les trois pour que
 * la promesse tienne :
 *  - il sort des horaires declares,
 *  - il tombe dans une absence,
 *  - il chevauche une prestation deja acceptee.
 *
 * Ce troisieme point est ce que « il ne doit plus etre propose une fois qu il a
 * valide » veut dire concretement : accepter occupe le creneau.
 */

/** "HH:MM" -> minutes depuis minuit. Comparer des chaines marcherait ici, mais
 *  se casserait au premier "9:00" saisi sans zero initial. */
function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

const FORMAT_HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private async provider(userId: string) {
    const p = await this.prisma.serviceProvider.findUnique({ where: { userId } });
    if (!p) throw new ForbiddenException('Aucun compte prestataire');
    return p;
  }

  async mesDisponibilites(userId: string) {
    const p = await this.provider(userId);
    const [creneaux, absences] = await Promise.all([
      this.prisma.providerAvailability.findMany({
        where: { providerId: p.id },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.providerTimeOff.findMany({
        where: { providerId: p.id, endDate: { gte: new Date() } },
        orderBy: { startDate: 'asc' },
      }),
    ]);
    return { creneaux, absences };
  }

  async ajouterCreneau(userId: string, dto: CreneauDto) {
    const p = await this.provider(userId);
    if (!FORMAT_HEURE.test(dto.startTime) || !FORMAT_HEURE.test(dto.endTime)) {
      throw new BadRequestException('Heures attendues au format HH:MM');
    }
    if (minutes(dto.endTime) <= minutes(dto.startTime)) {
      throw new BadRequestException('La fin du creneau doit suivre son debut');
    }

    // Deux creneaux qui se chevauchent le meme jour ne veulent rien dire de
    // plus qu un seul creneau elargi, et fausseraient l affichage.
    const memeJour = await this.prisma.providerAvailability.findMany({
      where: { providerId: p.id, dayOfWeek: dto.dayOfWeek },
    });
    const chevauche = memeJour.some(
      (c) => minutes(dto.startTime) < minutes(c.endTime) && minutes(c.startTime) < minutes(dto.endTime),
    );
    if (chevauche) {
      throw new BadRequestException('Ce creneau en chevauche un autre le meme jour');
    }

    return this.prisma.providerAvailability.create({
      data: {
        providerId: p.id,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async retirerCreneau(userId: string, id: string) {
    const p = await this.provider(userId);
    const c = await this.prisma.providerAvailability.findFirst({ where: { id, providerId: p.id } });
    if (!c) throw new NotFoundException('Creneau non trouve');
    await this.prisma.providerAvailability.delete({ where: { id } });
    return { retire: id };
  }

  async ajouterAbsence(userId: string, dto: AbsenceDto) {
    const p = await this.provider(userId);
    const debut = new Date(dto.startDate);
    const fin = new Date(dto.endDate);
    if (fin <= debut) throw new BadRequestException('La fin de l absence doit suivre son debut');

    return this.prisma.providerTimeOff.create({
      data: { providerId: p.id, startDate: debut, endDate: fin, note: dto.note ?? null },
    });
  }

  async retirerAbsence(userId: string, id: string) {
    const p = await this.provider(userId);
    const a = await this.prisma.providerTimeOff.findFirst({ where: { id, providerId: p.id } });
    if (!a) throw new NotFoundException('Absence non trouvee');
    await this.prisma.providerTimeOff.delete({ where: { id } });
    return { retiree: id };
  }

  /**
   * Prestataires reellement disponibles sur un creneau, parmi ceux proposes.
   *
   * Repli assume : un prestataire qui n a declare AUCUN horaire reste propose.
   * Le contraire ferait disparaitre tous les comptes anterieurs a cette
   * fonctionnalite, sans qu ils comprennent pourquoi leurs demandes se sont
   * taries.
   */
  async filtrerDisponibles(providerIds: string[], debut: Date, fin: Date): Promise<Set<string>> {
    if (!providerIds.length) return new Set();

    const [horaires, absences, occupations] = await Promise.all([
      this.prisma.providerAvailability.findMany({ where: { providerId: { in: providerIds } } }),
      this.prisma.providerTimeOff.findMany({
        where: {
          providerId: { in: providerIds },
          AND: [{ startDate: { lt: fin } }, { endDate: { gt: debut } }],
        },
        select: { providerId: true },
      }),
      this.prisma.serviceBooking.findMany({
        where: {
          providerId: { in: providerIds },
          type: ProviderType.menage,
          status: { in: ['pending', 'confirmed'] },
          AND: [{ startDate: { lt: fin } }, { endDate: { gt: debut } }],
        },
        select: { providerId: true },
      }),
    ]);

    const indisponibles = new Set([
      ...absences.map((a) => a.providerId),
      ...occupations.map((o) => o.providerId),
    ]);

    // Le jour et les heures se lisent en UTC, comme toutes les dates du projet :
    // une lecture en heure locale du serveur donnerait un jour different selon
    // l endroit ou tourne l instance.
    const jour = debut.getUTCDay();
    const debutMin = debut.getUTCHours() * 60 + debut.getUTCMinutes();
    const finMin = fin.getUTCHours() * 60 + fin.getUTCMinutes();

    const declarants = new Set(horaires.map((h) => h.providerId));

    return new Set(
      providerIds.filter((id) => {
        if (indisponibles.has(id)) return false;
        if (!declarants.has(id)) return true;
        return horaires.some(
          (h) =>
            h.providerId === id &&
            h.dayOfWeek === jour &&
            minutes(h.startTime) <= debutMin &&
            minutes(h.endTime) >= finMin,
        );
      }),
    );
  }
}

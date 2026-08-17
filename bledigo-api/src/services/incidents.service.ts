import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderType } from '../common/enums';
import { toDbJson } from '../common/json';
import { DeclarerSinistreDto } from './dto';

/**
 * Sinistres constates au retour d un vehicule.
 *
 * La question n est pas de savoir s il faut les enregistrer — elle est de
 * savoir ce qu ils DECLENCHENT. Le projet a deja tranche ce point pour les
 * absences a l arrivee : une sanction ne peut pas reposer sur la parole d une
 * seule partie, surtout quand cette partie a interet a parler. Une agence qui
 * declare un dommage recupere une caution ; c est exactement le genre
 * d interet qui interdit de la croire sur parole.
 *
 * D ou la forme retenue. Le sinistre est CONSIGNE, visible sur la fiche du
 * client, et CONTESTABLE. Sans contestation il est etabli. Avec, les deux
 * paroles se contredisent et personne n est sanctionne automatiquement :
 * l administration tranche a la main, comme pour les sanctions deja
 * appliquees.
 *
 * Rien ici ne touche au score ni au statut d un compte. C est volontaire.
 */

/**
 * Delai pendant lequel une agence peut declarer, une fois la location finie.
 *
 * Au-dela, plus rien ne rattache le dommage a ce client plutot qu au suivant :
 * le vehicule a roule, il a pu etre reloue. Une declaration tardive ne serait
 * pas une preuve, seulement une affirmation.
 */
const FENETRE_DECLARATION_JOURS = 7;

/**
 * Delai laisse au client pour contester.
 *
 * Il court a partir de la declaration, pas de la fin de location : le client
 * ne peut pas contester ce dont il n a pas encore ete informe.
 */
const FENETRE_CONTESTATION_JOURS = 14;

const JOUR_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** La location appartient-elle bien a l agence connectee ? */
  private async locationDeLAgence(userId: string, serviceBookingId: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { userId } });
    if (!provider) throw new ForbiddenException('Aucun compte prestataire');

    const location = await this.prisma.serviceBooking.findFirst({
      where: { id: serviceBookingId, providerId: provider.id },
    });
    if (!location) throw new NotFoundException('Location non trouvee');
    if (location.type !== ProviderType.location_voiture) {
      throw new BadRequestException('Un sinistre ne se declare que sur une location de vehicule');
    }
    return location;
  }

  async declarer(userId: string, serviceBookingId: string, dto: DeclarerSinistreDto) {
    const location = await this.locationDeLAgence(userId, serviceBookingId);

    if (!['confirmed', 'completed'].includes(location.status)) {
      throw new BadRequestException(
        'Aucun sinistre sur une location refusee ou annulee : le vehicule n est pas parti',
      );
    }

    const maintenant = new Date();
    const fin = new Date(location.endDate);
    // Avant la restitution, le vehicule est encore chez le client : ce qui lui
    // arrivera d ici la n est pas encore constatable.
    if (maintenant < fin) {
      throw new BadRequestException('Sinistre declarable une fois le vehicule restitue');
    }
    const limite = new Date(fin.getTime() + FENETRE_DECLARATION_JOURS * JOUR_MS);
    if (maintenant > limite) {
      throw new BadRequestException(
        `Delai depasse : un sinistre se declare dans les ${FENETRE_DECLARATION_JOURS} jours suivant la restitution`,
      );
    }

    const sinistre = await this.prisma.vehicleIncident.create({
      data: {
        serviceBookingId: location.id,
        vehicleId: location.vehicleId,
        declaredBy: userId,
        type: dto.type,
        description: dto.description,
        estimatedCost: dto.estimatedCost ?? null,
        photos: dto.photos?.length ? toDbJson(dto.photos) : null,
      },
    });

    // Trace systematique, y compris quand personne ne conteste : c est cet
    // historique qui rendra visible, a la longue, une agence qui declare un
    // dommage a chaque retour.
    await this.tracer(userId, sinistre.id, 'sinistre.declare', {
      serviceBookingId: location.id,
      type: dto.type,
      estimatedCost: dto.estimatedCost ?? null,
    });

    return sinistre;
  }

  /**
   * Contestation par le client.
   *
   * Elle n efface pas le sinistre, elle l oppose. Les deux versions restent
   * lisibles, et c est le desaccord lui-meme qui devient l information.
   */
  async contester(userId: string, sinistreId: string, motif: string) {
    const sinistre = await this.prisma.vehicleIncident.findFirst({
      where: { id: sinistreId, serviceBooking: { requesterId: userId } },
    });
    if (!sinistre) throw new NotFoundException('Sinistre non trouve');
    if (sinistre.contestedAt) throw new BadRequestException('Sinistre deja conteste');
    if (sinistre.resolution === 'abandonne') {
      throw new BadRequestException('Sinistre retire par l agence, il n y a plus rien a contester');
    }

    const limite = new Date(sinistre.declaredAt.getTime() + FENETRE_CONTESTATION_JOURS * JOUR_MS);
    if (new Date() > limite) {
      throw new BadRequestException(
        `Delai de contestation depasse : ${FENETRE_CONTESTATION_JOURS} jours a compter de la declaration`,
      );
    }

    const conteste = await this.prisma.vehicleIncident.update({
      where: { id: sinistreId },
      data: { contestedAt: new Date(), contestReason: motif, resolution: 'conteste' },
    });

    await this.tracer(userId, sinistreId, 'sinistre.conteste', { motif });
    this.logger.warn(
      `Sinistre ${sinistreId} conteste : deux paroles se contredisent, aucune sanction automatique`,
    );
    return conteste;
  }

  /** L agence retire sa declaration. Toujours possible : se retracter ne nuit a personne. */
  async retirer(userId: string, sinistreId: string) {
    const sinistre = await this.prisma.vehicleIncident.findFirst({
      where: { id: sinistreId, declaredBy: userId },
    });
    if (!sinistre) throw new NotFoundException('Sinistre non trouve');

    const retire = await this.prisma.vehicleIncident.update({
      where: { id: sinistreId },
      data: { resolution: 'abandonne', resolvedAt: new Date(), resolvedBy: userId },
    });
    await this.tracer(userId, sinistreId, 'sinistre.retire', {});
    return retire;
  }

  /** Sinistres attaches a une location, visibles des deux parties. */
  async parLocation(userId: string, serviceBookingId: string) {
    const location = await this.prisma.serviceBooking.findFirst({
      where: {
        id: serviceBookingId,
        OR: [{ requesterId: userId }, { provider: { userId } }],
      },
    });
    if (!location) throw new NotFoundException('Location non trouvee');

    return this.prisma.vehicleIncident.findMany({
      where: { serviceBookingId },
      orderBy: { declaredAt: 'desc' },
    });
  }

  /**
   * Arbitrage par l administration.
   *
   * Volontairement humain et volontairement le seul chemin : rien dans ce
   * service ne bascule une resolution tout seul.
   */
  async arbitrer(adminId: string, sinistreId: string, resolution: 'etabli' | 'abandonne') {
    const sinistre = await this.prisma.vehicleIncident.findUnique({ where: { id: sinistreId } });
    if (!sinistre) throw new NotFoundException('Sinistre non trouve');

    const arbitre = await this.prisma.vehicleIncident.update({
      where: { id: sinistreId },
      data: { resolution, resolvedAt: new Date(), resolvedBy: adminId },
    });
    await this.tracer(adminId, sinistreId, 'sinistre.arbitre', { resolution });
    return arbitre;
  }

  private async tracer(userId: string, sinistreId: string, action: string, details: any) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: 'vehicle_incident',
        entityId: sinistreId,
        details: toDbJson(details),
        ipAddress: 'system',
        userAgent: 'system',
      },
    });
  }
}

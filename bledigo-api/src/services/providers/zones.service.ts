import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { findLocality } from '../../common/localities';

/**
 * Zones d intervention d un prestataire.
 *
 * Le rayon en kilometres, seul critere jusqu ici, ne decrit pas ce qu une
 * entreprise dessert reellement : un cercle de 60 km autour de Tunis englobe
 * des localites qu on ne va pas servir, et en exclut d autres qu on sert tres
 * bien parce qu il y a une autoroute. Une zone se declare.
 *
 * Le referentiel est celui des annonces (`common/localities`) : c est ce qui
 * permet de rapprocher une demande d un prestataire. Accepter du texte libre
 * ferait coexister « La Marsa » et « Marsa », et le rapprochement echouerait
 * sans que personne comprenne pourquoi.
 */
@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  private async provider(userId: string) {
    const p = await this.prisma.serviceProvider.findUnique({ where: { userId } });
    if (!p) throw new ForbiddenException('Aucun compte prestataire');
    return p;
  }

  async mesZones(userId: string) {
    const p = await this.provider(userId);
    return this.prisma.providerZone.findMany({
      where: { providerId: p.id },
      orderBy: [{ region: 'asc' }, { city: 'asc' }],
    });
  }

  async ajouter(userId: string, citySlug: string) {
    const p = await this.provider(userId);
    const localite = findLocality(citySlug);
    if (!localite) throw new BadRequestException('Ville inconnue du referentiel');

    const existe = await this.prisma.providerZone.findFirst({
      where: { providerId: p.id, citySlug: localite.slug },
    });
    // Redeclarer une ville n est pas une erreur de l utilisateur, c est un
    // double clic : on rend la zone existante plutot qu une 409 incomprehensible.
    if (existe) return existe;

    return this.prisma.providerZone.create({
      data: {
        providerId: p.id,
        citySlug: localite.slug,
        city: localite.name,
        region: localite.region,
      },
    });
  }

  async retirer(userId: string, id: string) {
    const p = await this.provider(userId);
    const zone = await this.prisma.providerZone.findFirst({
      where: { id, providerId: p.id },
    });
    if (!zone) throw new NotFoundException('Zone non trouvee');
    await this.prisma.providerZone.delete({ where: { id } });
    return { retiree: id };
  }

  /**
   * Prestataires desservant une ville.
   *
   * Repli sur le rayon quand aucune zone n est declaree : la mise en service de
   * cette fonctionnalite ne doit pas faire disparaitre du jour au lendemain
   * tous les prestataires inscrits avant elle.
   */
  async idsDesservant(citySlug: string): Promise<Set<string>> {
    const zones = await this.prisma.providerZone.findMany({
      where: { citySlug },
      select: { providerId: true },
    });
    return new Set(zones.map((z) => z.providerId));
  }

  /** Prestataires ayant declare au moins une zone, donc pour qui le rayon ne vaut plus. */
  async idsAvecZones(): Promise<Set<string>> {
    const zones = await this.prisma.providerZone.groupBy({
      by: ['providerId'],
    });
    return new Set(zones.map((z) => z.providerId));
  }
}

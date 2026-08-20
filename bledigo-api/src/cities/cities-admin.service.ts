import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LOCALITIES } from '../common/localities';
import { toDbJson } from '../common/json';

/**
 * Referentiel des villes, administrable.
 *
 * Il vivait dans `common/localities.ts`, en dur : ajouter une destination
 * demandait un commit et un deploiement, ce qui n a pas de sens pour une donnee
 * editoriale que l administration doit pouvoir corriger un dimanche soir.
 *
 * La liste statique n est pas supprimee pour autant. Elle sert de SEMIS et de
 * REPLI : tant que la table est vide — base fraiche, environnement de recette —
 * c est elle qui repond, sinon la recherche se retrouverait sans aucune ville et
 * paraitrait cassee sans l etre.
 */
@Injectable()
export class CitiesAdminService {
  private readonly logger = new Logger(CitiesAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Un slug se deduit du nom, jamais saisi : deux orthographes casseraient le
   *  rapprochement avec les annonces et les zones des prestataires. */
  private slugifier(nom: string) {
    return nom
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Liste administrable, avec le nombre d annonces qui pointent sur chaque
   * ville — c est ce chiffre qui dit si une suppression est possible.
   */
  async lister() {
    const villes = await this.prisma.city.findMany({
      orderBy: [{ region: 'asc' }, { name: 'asc' }],
    });

    // Table vide : on montre la liste statique en lecture, en le disant. Faire
    // croire a un referentiel vide inviterait a tout ressaisir a la main.
    if (!villes.length) {
      return {
        source: 'statique' as const,
        villes: LOCALITIES.map((l) => ({
          id: null,
          slug: l.slug,
          name: l.name,
          region: l.region,
          latitude: l.lat,
          longitude: l.lng,
          active: true,
          annonces: 0,
        })),
      };
    }

    const parVille = await this.prisma.listing.groupBy({
      by: ['city'],
      where: { deletedAt: null },
      _count: true,
    });
    const compte = new Map(parVille.map((c) => [c.city, c._count]));

    return {
      source: 'base' as const,
      villes: villes.map((v) => ({ ...v, annonces: compte.get(v.name) ?? 0 })),
    };
  }

  /**
   * Recopie la liste statique en base, une fois.
   *
   * Sans cette reprise, la premiere ville ajoutee a la main ferait basculer le
   * referentiel sur une table qui n en contiendrait qu UNE : toutes les autres
   * destinations disparaitraient d un coup.
   */
  async importerLeReferentiel(adminId: string) {
    const existantes = await this.prisma.city.count();
    if (existantes > 0) {
      throw new ConflictException('Le referentiel est deja en base : rien a importer');
    }

    await this.prisma.city.createMany({
      data: LOCALITIES.map((l) => ({
        slug: l.slug,
        name: l.name,
        region: l.region,
        latitude: l.lat,
        longitude: l.lng,
      })),
    });

    await this.tracer(adminId, 'villes.import', { nombre: LOCALITIES.length });
    this.logger.log(`Referentiel importe : ${LOCALITIES.length} villes`);
    return { importees: LOCALITIES.length };
  }

  async creer(
    adminId: string,
    dto: { name: string; region: string; latitude: number; longitude: number },
  ) {
    // Ajouter une ville alors que la table est vide masquerait tout le reste :
    // on reprend d abord le referentiel, puis on ajoute.
    if ((await this.prisma.city.count()) === 0) await this.importerLeReferentiel(adminId);

    const slug = this.slugifier(dto.name);
    if (!slug) throw new BadRequestException('Nom de ville invalide');

    const deja = await this.prisma.city.findUnique({ where: { slug } });
    if (deja) throw new ConflictException(`« ${deja.name} » existe deja`);

    const ville = await this.prisma.city.create({
      data: {
        slug,
        name: dto.name.trim(),
        region: dto.region.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    await this.tracer(adminId, 'villes.creation', { slug, name: ville.name });
    return ville;
  }

  async modifier(adminId: string, id: string, dto: Partial<{ name: string; region: string; latitude: number; longitude: number; active: boolean }>) {
    const ville = await this.prisma.city.findUnique({ where: { id } });
    if (!ville) throw new NotFoundException('Ville non trouvee');

    // Le SLUG ne bouge pas, meme si le nom est corrige : il est reference par
    // les zones des prestataires, et le changer les detacherait en silence.
    const modifiee = await this.prisma.city.update({
      where: { id },
      data: {
        name: dto.name?.trim() ?? undefined,
        region: dto.region?.trim() ?? undefined,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
        active: dto.active ?? undefined,
      },
    });

    await this.tracer(adminId, 'villes.modification', { id, avant: ville, apres: modifiee });
    return modifiee;
  }

  /**
   * Suppression, refusee si des annonces y pointent.
   *
   * Supprimer une ville habitee laisserait des logements rattaches a une
   * destination qui n existe plus : ils sortiraient de la recherche par ville
   * sans que personne comprenne pourquoi. Le message propose la desactivation,
   * qui est le geste voulu dans presque tous les cas.
   */
  async supprimer(adminId: string, id: string) {
    const ville = await this.prisma.city.findUnique({ where: { id } });
    if (!ville) throw new NotFoundException('Ville non trouvee');

    const [annonces, zones] = await Promise.all([
      this.prisma.listing.count({ where: { city: ville.name, deletedAt: null } }),
      this.prisma.providerZone.count({ where: { citySlug: ville.slug } }),
    ]);

    if (annonces > 0 || zones > 0) {
      throw new ConflictException(
        `Suppression impossible : ${annonces} annonce(s) et ${zones} zone(s) de prestataire y pointent. Desactivez-la pour la retirer des listes sans rien detacher.`,
      );
    }

    await this.prisma.city.delete({ where: { id } });
    await this.tracer(adminId, 'villes.suppression', { slug: ville.slug, name: ville.name });
    return { supprimee: ville.slug };
  }

  private async tracer(userId: string, action: string, details: any) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: 'city',
        entityId: details?.id ?? details?.slug ?? 'referentiel',
        details: toDbJson(details),
        ipAddress: 'system',
        userAgent: 'system',
      },
    });
  }
}

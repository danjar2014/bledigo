import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderStatus, ProviderType } from '../common/enums';
import { VehicleDto, UpdateVehicleDto, VehiclePeriodDto } from './dto';
import { distanceKm } from '../common/geo';
import { toDbJson } from '../common/json';

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Statuts d une prestation qui immobilisent le vehicule. */
const OCCUPANTS = ['pending', 'confirmed'];

/**
 * Flotte et disponibilite des agences de location.
 *
 * Le calendrier reprend deliberement la forme de celui des logements : une
 * periode ferme des dates ou substitue un tarif, bornes debut incluse et fin
 * exclue. Meme vocabulaire, meme raisonnement — il n y a aucune raison qu une
 * agence apprenne un second systeme.
 */
@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  private async providerDe(userId: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Aucun compte prestataire pour cet utilisateur');
    if (provider.type !== ProviderType.location_voiture) {
      throw new ForbiddenException('Reserve aux agences de location');
    }
    return provider;
  }

  /** Le vehicule appartient-il bien a l agence connectee ? */
  private async vehiculeDe(userId: string, vehicleId: string) {
    const provider = await this.providerDe(userId);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, providerId: provider.id, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundException('Vehicule non trouve');
    return vehicle;
  }

  async listerMaFlotte(userId: string) {
    const provider = await this.providerDe(userId);
    return this.prisma.vehicle.findMany({
      where: { providerId: provider.id, deletedAt: null },
      include: {
        photos: { orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }] },
        _count: { select: { calendar: true, services: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * `options` arrive en tableau et se range en JSON : la liste des extras varie
   * d une agence a l autre, et une colonne par option couterait une migration a
   * chaque nouveau siege bebe.
   */
  private aPlat(dto: VehicleDto | UpdateVehicleDto) {
    const { options, ...reste } = dto as any;
    return options === undefined ? reste : { ...reste, options: toDbJson(options) };
  }

  async ajouter(userId: string, dto: VehicleDto) {
    const provider = await this.providerDe(userId);
    if (provider.status !== ProviderStatus.active) {
      throw new ForbiddenException('Compte en attente de verification');
    }
    return this.prisma.vehicle.create({
      data: { ...this.aPlat(dto), providerId: provider.id },
    });
  }

  async modifier(userId: string, vehicleId: string, dto: UpdateVehicleDto) {
    await this.vehiculeDe(userId, vehicleId);
    return this.prisma.vehicle.update({ where: { id: vehicleId }, data: this.aPlat(dto) });
  }

  /**
   * Galerie du vehicule.
   *
   * Une seule photo ne montre ni l interieur, ni l etat de la carrosserie, ni
   * le coffre — c est-a-dire rien de ce qu on regarde avant de louer. La
   * premiere ajoutee devient principale d office : sans cela une flotte entiere
   * s afficherait sans visuel parce que personne n a coche la case.
   */
  async ajouterPhoto(userId: string, vehicleId: string, url: string, isPrimary?: boolean) {
    await this.vehiculeDe(userId, vehicleId);
    const existantes = await this.prisma.vehiclePhoto.count({ where: { vehicleId } });
    const principale = isPrimary ?? existantes === 0;

    if (principale && existantes > 0) {
      await this.prisma.vehiclePhoto.updateMany({ where: { vehicleId }, data: { isPrimary: false } });
    }

    return this.prisma.vehiclePhoto.create({
      data: { vehicleId, url, isPrimary: principale, position: existantes },
    });
  }

  async supprimerPhoto(userId: string, vehicleId: string, photoId: string) {
    await this.vehiculeDe(userId, vehicleId);
    const photo = await this.prisma.vehiclePhoto.findFirst({ where: { id: photoId, vehicleId } });
    if (!photo) throw new NotFoundException('Photo non trouvee');

    await this.prisma.vehiclePhoto.delete({ where: { id: photoId } });

    // Supprimer la principale laisserait le vehicule sans visuel alors qu il
    // lui reste des photos : la suivante prend la place.
    if (photo.isPrimary) {
      const suivante = await this.prisma.vehiclePhoto.findFirst({
        where: { vehicleId },
        orderBy: { position: 'asc' },
      });
      if (suivante) {
        await this.prisma.vehiclePhoto.update({
          where: { id: suivante.id },
          data: { isPrimary: true },
        });
      }
    }
    return { supprimee: photoId };
  }

  /** Retrait logique : les prestations passees gardent leur vehicule. */
  async retirer(userId: string, vehicleId: string) {
    await this.vehiculeDe(userId, vehicleId);
    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { deletedAt: new Date(), status: 'retire' },
    });
  }

  async calendrier(userId: string, vehicleId: string) {
    await this.vehiculeDe(userId, vehicleId);
    return this.prisma.vehicleCalendar.findMany({
      where: { vehicleId },
      orderBy: { startDate: 'asc' },
    });
  }

  async ajouterPeriode(userId: string, vehicleId: string, dto: VehiclePeriodDto) {
    await this.vehiculeDe(userId, vehicleId);
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) throw new BadRequestException('endDate doit etre apres startDate');

    return this.prisma.vehicleCalendar.create({
      data: {
        vehicleId,
        startDate,
        endDate,
        blocked: dto.blocked ?? false,
        pricePerDay: dto.pricePerDay,
        note: dto.note,
      },
    });
  }

  async supprimerPeriode(userId: string, vehicleId: string, periodeId: string) {
    await this.vehiculeDe(userId, vehicleId);
    const periode = await this.prisma.vehicleCalendar.findFirst({
      where: { id: periodeId, vehicleId },
    });
    if (!periode) throw new NotFoundException('Periode non trouvee');
    return this.prisma.vehicleCalendar.delete({ where: { id: periodeId } });
  }

  /**
   * Tarif d une location, jour par jour.
   *
   * Une periode saisonniere peut ne couvrir qu une partie de la location : le
   * tarif de base s applique ailleurs. C est le meme calcul que pour un sejour,
   * et pour la meme raison — un prix moyen fausserait les bords.
   */
  async tarifer(vehicleId: string, debut: Date, fin: Date) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicule non trouve');

    const periodes = await this.prisma.vehicleCalendar.findMany({
      where: {
        vehicleId,
        AND: [{ startDate: { lt: fin } }, { endDate: { gt: debut } }],
      },
    });

    let prix = 0;
    let jours = 0;
    for (let t = debut.getTime(); t < fin.getTime(); t += JOUR_MS) {
      const jour = new Date(t);
      const periode = periodes.find(
        (p) => jour >= new Date(p.startDate) && jour < new Date(p.endDate) && p.pricePerDay != null,
      );
      prix += periode?.pricePerDay ?? vehicle.pricePerDay;
      jours += 1;
    }
    return { jours, prix: Math.round(prix * 100) / 100, pricePerDay: vehicle.pricePerDay };
  }

  /** Vehicules immobilises sur la periode : fermetures de l agence et locations en cours. */
  private async indisponibles(debut: Date, fin: Date) {
    const chevauche = { AND: [{ startDate: { lt: fin } }, { endDate: { gt: debut } }] };
    const [fermetures, locations] = await Promise.all([
      this.prisma.vehicleCalendar.findMany({
        where: { blocked: true, ...chevauche },
        select: { vehicleId: true },
      }),
      this.prisma.serviceBooking.findMany({
        where: { type: ProviderType.location_voiture, status: { in: OCCUPANTS }, ...chevauche },
        select: { vehicleId: true },
      }),
    ]);
    return new Set([
      ...fermetures.map((f) => f.vehicleId),
      ...locations.map((l) => l.vehicleId).filter((v): v is string => v != null),
    ]);
  }

  /**
   * Vehicules proposables pour un sejour donne.
   *
   * La proximite se mesure entre le LOGEMENT et l agence : un voyageur qui
   * arrive a Djerba n a que faire d une agence de Tunis, meme excellente. Le
   * rayon retenu est celui que l agence declare servir.
   */
  async disponiblesPour(lat: number, lng: number, debut: Date, fin: Date) {
    if (fin <= debut) throw new BadRequestException('La date de restitution doit suivre la prise');

    const agences = await this.prisma.serviceProvider.findMany({
      where: {
        type: ProviderType.location_voiture,
        status: ProviderStatus.active,
        deletedAt: null,
      },
      include: {
        vehicles: {
          where: { status: 'active', deletedAt: null },
          // Les photos et les conditions partent avec le vehicule : le voyageur
          // doit pouvoir voir la voiture et lire ce qui l engage AVANT de
          // demander, pas au comptoir.
          include: { photos: { orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }] } },
        },
      },
    });

    const immobilises = await this.indisponibles(debut, fin);
    const resultats: any[] = [];

    for (const agence of agences) {
      const d =
        agence.latitude != null && agence.longitude != null
          ? Math.round(distanceKm(lat, lng, agence.latitude, agence.longitude) * 10) / 10
          : null;
      // Une agence sans coordonnees reste proposee : le geocodage est optionnel
      // et beaucoup de petites structures ne le renseigneront pas. Elle est
      // simplement classee apres celles dont on connait la distance.
      if (d != null && d > agence.serviceRadiusKm) continue;

      for (const v of agence.vehicles) {
        if (immobilises.has(v.id)) continue;
        const tarif = await this.tarifer(v.id, debut, fin);
        resultats.push({
          ...v,
          distanceKm: d,
          agence: {
            id: agence.id,
            nom: agence.companyName,
            ville: agence.city,
            note: agence.avgRating,
            avis: agence.totalReviews,
          },
          tarif,
        });
      }
    }

    return resultats.sort((a, b) => {
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }
}

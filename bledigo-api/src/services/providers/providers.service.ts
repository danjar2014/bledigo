import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderStatus, ProviderType, ProviderLegalForm, UserRole, UserStatus } from '../../common/enums';
import { CreateProviderDto, UpdateProviderDto } from '../dto';
import { distanceKm } from '../../common/geo';
import { findLocality, resolveLocality } from '../../common/localities';
import { ZonesService } from './zones.service';
import { AvailabilityService } from './availability.service';
import { toDbJson } from '../../common/json';

/**
 * Comptes prestataires.
 *
 * Phase 1 : l administration cree le compte apres avoir constate le statut
 * d agence — un registre de commerce, une carte professionnelle. C est une
 * verification humaine, la seule disponible tant qu il n y a ni abonnement ni
 * controle automatique. `provider` reste donc hors des roles auto-attribuables.
 *
 * Phase 2 prevue : inscription libre, verification automatique et abonnement.
 * Le modele ne changera pas, seule la porte d entree change.
 */
@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zones: ZonesService,
    private readonly dispos: AvailabilityService,
  ) {}

  /**
   * Mot de passe initial.
   *
   * Il est affiche UNE FOIS a l administration, qui le transmet a l agence.
   * Ce detour existe parce que ni l envoi d email ni la reinitialisation ne
   * sont branches : `forgotPassword` est encore une ebauche. Sans ce compromis,
   * une agence qui perd son mot de passe serait definitivement dehors — d ou
   * aussi `regenererMotDePasse`.
   */
  private motDePasseInitial() {
    return randomBytes(9).toString('base64url');
  }

  async creer(adminId: string, dto: CreateProviderDto) {
    const email = dto.email.trim().toLowerCase();
    const existant = await this.prisma.user.findUnique({ where: { email } });
    if (existant) throw new BadRequestException('Email deja utilise');

    const forme = this.formeJuridique(dto.type, dto.legalForm);

    // La ville suffit : ses coordonnees viennent du referentiel, comme pour une
    // annonce. Sans elles, la proximite ne se calcule pas et le prestataire
    // serait propose dans toute la Tunisie — un loueur de Djerba apparaitrait a
    // un voyageur de Tunis. Des coordonnees explicites restent prioritaires.
    const locality = findLocality(dto.city) ?? resolveLocality(dto.city);
    const latitude = dto.latitude ?? locality?.lat;
    const longitude = dto.longitude ?? locality?.lng;

    const motDePasse = this.motDePasseInitial();
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(motDePasse, 12),
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.provider,
        status: UserStatus.active,
        // L administration a constate l existence de l agence, pas la
        // propriete de l adresse : emailVerified reste faux.
        emailVerified: false,
        phone: dto.phone || undefined,
      },
    });

    const provider = await this.prisma.serviceProvider.create({
      data: {
        userId: user.id,
        type: dto.type,
        legalForm: forme,
        companyName: dto.companyName,
        registrationNumber: dto.registrationNumber,
        city: locality?.name ?? dto.city,
        region: dto.region ?? locality?.region,
        latitude,
        longitude,
        serviceRadiusKm: dto.serviceRadiusKm ?? 30,
        phone: dto.phone,
        // Cree en attente : c est la verification qui l active, pas la creation.
        status: ProviderStatus.pending,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'provider.cree',
        entityType: 'service_provider',
        entityId: provider.id,
        details: toDbJson({ email, type: dto.type, legalForm: forme, companyName: dto.companyName }),
        ipAddress: 'system',
        userAgent: 'system',
      },
    });

    // Le mot de passe n est retourne qu ici, et n est jamais journalise.
    return { provider, identifiants: { email, motDePasse } };
  }

  /**
   * Une personne physique ne peut proposer que du menage.
   *
   * Louer des vehicules suppose une flotte, une assurance professionnelle et une
   * immatriculation : ce n est pas une activite qu on exerce a titre personnel.
   * Le refus est explicite plutot que silencieux — un formulaire qui accepte
   * puis ne fonctionne pas est pire qu un formulaire qui refuse.
   */
  private formeJuridique(type: string, demandee?: string) {
    const forme = demandee || ProviderLegalForm.societe;
    if (forme === ProviderLegalForm.individuel && type !== ProviderType.menage) {
      throw new BadRequestException(
        'La location de vehicules est reservee aux societes. Une personne physique peut proposer du menage et de l entretien.',
      );
    }
    return forme;
  }

  /**
   * Candidature spontanee, depuis la page publique.
   *
   * Le compte est cree AVEC UNE EMPREINTE INUTILISABLE : la societe ne peut donc
   * pas se connecter. C est le point essentiel — la verification humaine du
   * statut d agence reste la regle, une candidature ne l a jamais remplacee.
   *
   * Le parcours est : candidature ici, constatation par l administration, puis
   * generation du mot de passe qui ouvre reellement le compte.
   *
   * Pourquoi creer un compte plutot qu une table de candidatures : le statut
   * `pending` signifie deja « pas encore constate », et une empreinte
   * inutilisable ferme la porte aussi surement qu une ligne dans une autre
   * table. Une table de plus n aurait rien ajoute qu un modele a maintenir.
   */
  async candidater(dto: CreateProviderDto & { phone: string }) {
    const email = dto.email.trim().toLowerCase();
    const existant = await this.prisma.user.findUnique({ where: { email } });
    if (existant) {
      throw new BadRequestException(
        'Une demande existe deja pour cette adresse. Nous vous recontactons au numero indique.',
      );
    }

    const forme = this.formeJuridique(dto.type, dto.legalForm);
    const locality = findLocality(dto.city) ?? resolveLocality(dto.city);

    const user = await this.prisma.user.create({
      data: {
        email,
        // Aucune connexion possible avant constatation du statut.
        passwordHash: await bcrypt.hash(randomUUID() + randomUUID(), 12),
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.provider,
        status: UserStatus.active,
        emailVerified: false,
      },
    });

    const provider = await this.prisma.serviceProvider.create({
      data: {
        userId: user.id,
        type: dto.type,
        legalForm: forme,
        companyName: dto.companyName,
        registrationNumber: dto.registrationNumber,
        city: locality?.name ?? dto.city,
        region: locality?.region,
        latitude: locality?.lat,
        longitude: locality?.lng,
        serviceRadiusKm: dto.serviceRadiusKm ?? 30,
        // Le telephone est obligatoire ici : sans envoi d email, c est le seul
        // moyen de recontacter une candidature.
        phone: dto.phone,
        description: (dto as any).description,
        status: ProviderStatus.pending,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'provider.candidature',
        entityType: 'service_provider',
        entityId: provider.id,
        details: toDbJson({ email, type: dto.type, legalForm: forme, companyName: dto.companyName, phone: dto.phone }),
        ipAddress: 'public',
        userAgent: 'public',
      },
    });

    return {
      recue: true,
      // Le message suit la forme juridique : parler de « statut d entreprise » a
      // une personne qui travaille a son compte la laisse croire qu il lui en
      // faut un.
      message:
        forme === ProviderLegalForm.individuel
          ? 'Demande enregistree. Nous verifions votre identite puis vous transmettons vos identifiants par telephone.'
          : 'Demande enregistree. Nous verifions votre statut d entreprise puis vous transmettons vos identifiants par telephone.',
    };
  }

  /** Constatation du statut d agence : le compte devient utilisable. */
  async verifier(adminId: string, id: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Prestataire non trouve');

    const maj = await this.prisma.serviceProvider.update({
      where: { id },
      data: { status: ProviderStatus.active, verifiedAt: new Date(), verifiedBy: adminId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'provider.verifie',
        entityType: 'service_provider',
        entityId: id,
        details: toDbJson({ registrationNumber: provider.registrationNumber }),
        ipAddress: 'system',
        userAgent: 'system',
      },
    });
    return maj;
  }

  async suspendre(adminId: string, id: string, motif: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Prestataire non trouve');

    const maj = await this.prisma.serviceProvider.update({
      where: { id },
      data: { status: ProviderStatus.suspended },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'provider.suspendu',
        entityType: 'service_provider',
        entityId: id,
        details: toDbJson({ motif }),
        ipAddress: 'system',
        userAgent: 'system',
      },
    });
    return maj;
  }

  /** Seule voie de recuperation tant que la reinitialisation par email n existe pas. */
  async regenererMotDePasse(adminId: string, id: string) {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!provider) throw new NotFoundException('Prestataire non trouve');

    const motDePasse = this.motDePasseInitial();
    await this.prisma.user.update({
      where: { id: provider.userId },
      data: { passwordHash: await bcrypt.hash(motDePasse, 12) },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'provider.mot_de_passe_regenere',
        entityType: 'service_provider',
        entityId: id,
        details: '{}',
        ipAddress: 'system',
        userAgent: 'system',
      },
    });
    return { identifiants: { email: provider.user.email, motDePasse } };
  }

  async lister(type?: string, status?: string) {
    return this.prisma.serviceProvider.findMany({
      where: {
        deletedAt: null,
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
      },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Fiche du prestataire connecte. */
  async monProfil(userId: string) {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { userId },
      include: { _count: { select: { vehicles: true, services: true } } },
    });
    if (!provider) throw new NotFoundException('Aucun compte prestataire pour cet utilisateur');
    return provider;
  }

  async mettreAJour(userId: string, dto: UpdateProviderDto) {
    const provider = await this.monProfil(userId);
    // Ni `type` ni `status` ne figurent dans le DTO : un prestataire ne change
    // pas de metier ni ne se verifie lui-meme.
    return this.prisma.serviceProvider.update({ where: { id: provider.id }, data: { ...dto } });
  }

  /**
   * Prestataires actifs autour d un point.
   *
   * Le rayon retenu est celui que le prestataire declare servir, pas un rayon
   * arbitraire : une agence de Tunis qui accepte de livrer a Hammamet le dit
   * elle-meme. Un prestataire sans coordonnees n est pas exclu, il est
   * simplement classe apres ceux qu on sait proches — le geocodage est optionnel
   * et beaucoup de petites structures ne le renseigneront pas.
   */
  /** Prestataires autour d un logement donne. */
  /**
   * Prestataires proposables pour un logement.
   *
   * Deux criteres, dans cet ordre.
   *
   * LA ZONE d abord, quand le prestataire en a declare : elle dit ce qu il
   * dessert vraiment, la ou un rayon de 60 km autour de Tunis englobe des
   * localites qu il ne visitera jamais. Ceux qui n ont declare aucune zone
   * restent filtres au rayon — mettre cette regle en service ne doit pas faire
   * disparaitre du jour au lendemain tous les comptes anterieurs.
   *
   * LES HORAIRES ensuite, si un creneau est demande. Proposer quelqu un qui ne
   * travaille pas a cette heure-la fait perdre son temps aux deux : l hote
   * attend une reponse qui sera un refus.
   */
  async autourDeListing(type: string, listingId: string, debut?: Date, fin?: Date) {
    const listing = await this.prisma.listing.findFirst({
      where: { OR: [{ id: listingId }, { slug: listingId }], deletedAt: null },
      select: { latitude: true, longitude: true, city: true },
    });
    if (!listing) throw new NotFoundException('Logement non trouve');

    const proches = await this.autourDe(type, listing.latitude, listing.longitude);

    const localite = findLocality(listing.city);
    const desservants = localite ? await this.zones.idsDesservant(localite.slug) : new Set<string>();
    const avecZones = await this.zones.idsAvecZones();

    const parZone = proches.filter((p: any) =>
      avecZones.has(p.id) ? desservants.has(p.id) : true,
    );

    if (!debut || !fin) return parZone;

    const libres = await this.dispos.filtrerDisponibles(
      parZone.map((p: any) => p.id),
      debut,
      fin,
    );
    return parZone.filter((p: any) => libres.has(p.id));
  }

  async autourDe(type: string, lat: number | null, lng: number | null) {
    const providers = await this.prisma.serviceProvider.findMany({
      where: { type, status: ProviderStatus.active, deletedAt: null },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    if (lat == null || lng == null) return providers.map((p) => ({ ...p, distanceKm: null }));

    return providers
      .map((p) => ({
        ...p,
        distanceKm:
          p.latitude != null && p.longitude != null
            ? Math.round(distanceKm(lat, lng, p.latitude, p.longitude) * 10) / 10
            : null,
      }))
      .filter((p) => p.distanceKm == null || p.distanceKm <= p.serviceRadiusKm)
      .sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }
}

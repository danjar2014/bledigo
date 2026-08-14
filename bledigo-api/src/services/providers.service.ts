import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderStatus, ProviderType, UserRole, UserStatus } from '../common/enums';
import { CreateProviderDto, UpdateProviderDto } from './dto';
import { distanceKm } from '../common/geo';
import { toDbJson } from '../common/json';

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

  constructor(private readonly prisma: PrismaService) {}

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
        companyName: dto.companyName,
        registrationNumber: dto.registrationNumber,
        city: dto.city,
        region: dto.region,
        latitude: dto.latitude,
        longitude: dto.longitude,
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
        details: toDbJson({ email, type: dto.type, companyName: dto.companyName }),
        ipAddress: 'system',
        userAgent: 'system',
      },
    });

    // Le mot de passe n est retourne qu ici, et n est jamais journalise.
    return { provider, identifiants: { email, motDePasse } };
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
  async autourDeListing(type: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { OR: [{ id: listingId }, { slug: listingId }], deletedAt: null },
      select: { latitude: true, longitude: true, city: true },
    });
    if (!listing) throw new NotFoundException('Logement non trouve');
    return this.autourDe(type, listing.latitude, listing.longitude);
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

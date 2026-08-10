import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus, UserRole } from '../common/enums';
import { effectiveRoles, parseRoles, availableModes, SELF_ASSIGNABLE_ROLES } from '../common/roles';
import { toDbJson } from '../common/json';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private strip<T extends { passwordHash?: string }>(user: T) {
    const { passwordHash, ...rest } = user as any;
    return rest;
  }

  async findAll(page = 1, limit = 20, role?: string) {
    const where: any = { deletedAt: null, ...(role ? { role } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map((u: any) => this.strip(u)), total, page, limit };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { travelerPassport: true, ownerPassport: true },
    });
    if (!user || user.deletedAt) throw new NotFoundException('Utilisateur non trouve');
    return this.strip(user);
  }

  async update(currentUserId: string, id: string, dto: any) {
    if (currentUserId !== id) throw new ForbiddenException('Modification non autorisee');
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return this.strip(user);
  }

  async remove(currentUserId: string, id: string) {
    if (currentUserId !== id) throw new ForbiddenException('Suppression non autorisee');
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  /** Passeport de confiance : traveler ou owner selon le role */
  async passport(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { travelerPassport: true, ownerPassport: true },
    });
    if (!user) throw new NotFoundException('Utilisateur non trouve');
    return {
      userId: user.id,
      role: user.role,
      traveler: user.travelerPassport,
      owner: user.ownerPassport,
    };
  }

  async setStatus(id: string, status: UserStatus) {
    const user = await this.prisma.user.update({ where: { id }, data: { status } });
    return this.strip(user);
  }

  /**
   * Active un role supplementaire pour le compte courant.
   * Un proprietaire peut ainsi reserver sans creer un second compte, et
   * inversement. Cree le passeport correspondant s il manque.
   */
  async enableRole(userId: string, role: string) {
    if (!SELF_ASSIGNABLE_ROLES.includes(role)) {
      throw new ForbiddenException('Ce role ne peut pas etre active librement');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouve');

    const current = effectiveRoles(user);
    if (!current.includes(role)) {
      const secondary = [...new Set([...parseRoles(user.secondaryRoles), role])].filter(
        (r) => r !== user.role,
      );
      await this.prisma.user.update({
        where: { id: userId },
        data: { secondaryRoles: toDbJson(secondary) },
      });
    }

    // Le passeport porte l historique de confiance : un par facette
    if (role === UserRole.traveler) {
      const existing = await this.prisma.travelerPassport.findUnique({ where: { userId } });
      if (!existing) await this.prisma.travelerPassport.create({ data: { userId } });
    } else if (role === UserRole.owner) {
      const existing = await this.prisma.ownerPassport.findUnique({ where: { userId } });
      if (!existing) await this.prisma.ownerPassport.create({ data: { userId } });
    }

    const updated = await this.prisma.user.findUnique({ where: { id: userId } });
    return {
      ...this.strip(updated as any),
      roles: effectiveRoles(updated),
      modes: availableModes(updated),
    };
  }

  /** Roles et modes disponibles pour le compte courant. */
  async myRoles(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouve');
    return { roles: effectiveRoles(user), modes: availableModes(user), primary: user.role };
  }

}

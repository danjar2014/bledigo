import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingStatus } from '../common/enums';

/**
 * Favoris d un voyageur.
 *
 * Volontairement minimal : un logement est en favori ou il ne l est pas. Pas de
 * listes nommees, pas de notes, pas de partage — ce sont d autres
 * fonctionnalites, et rien ne dit qu elles seront demandees. Une table de
 * liaison qu on peut lire d un coup d oeil vaut mieux qu un modele qui anticipe.
 */
@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bascule le favori.
   *
   * Un seul point d entree plutot qu un ajout et une suppression : l interface
   * n a qu un bouton coeur, et lui faire deviner l etat courant avant de choisir
   * la bonne route invite les desynchronisations.
   */
  async basculer(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, deletedAt: null },
      select: { id: true },
    });
    if (!listing) throw new NotFoundException('Logement non trouve');

    const existant = await this.prisma.favorite.findFirst({
      where: { userId, listingId },
    });

    if (existant) {
      await this.prisma.favorite.delete({ where: { id: existant.id } });
      return { favori: false };
    }

    await this.prisma.favorite.create({ data: { userId, listingId } });
    return { favori: true };
  }

  /**
   * Les favoris, avec de quoi les afficher.
   *
   * Un logement retire de la diffusion RESTE visible ici, avec son statut : le
   * faire disparaitre sans explication donnerait l impression d avoir perdu sa
   * selection, alors que le bien existe toujours.
   */
  async mesFavoris(userId: string) {
    const favoris = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        listing: {
          include: { photos: { take: 1, orderBy: { isPrimary: 'desc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favoris.map((f) => ({
      id: f.id,
      ajouteLe: f.createdAt,
      indisponible: f.listing.status !== ListingStatus.active || f.listing.deletedAt != null,
      listing: f.listing,
    }));
  }

  /**
   * Identifiants des logements en favori, pour colorer les coeurs d une liste.
   *
   * Un ensemble d identifiants plutot que les objets complets : la liste de
   * recherche a deja les logements, elle n a besoin que de savoir lesquels sont
   * marques. Renvoyer les objets doublerait la charge utile pour rien.
   */
  async idsFavoris(userId: string): Promise<string[]> {
    const favoris = await this.prisma.favorite.findMany({
      where: { userId },
      select: { listingId: true },
    });
    return favoris.map((f) => f.listingId);
  }
}

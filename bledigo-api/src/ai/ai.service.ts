import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/enums';

/**
 * L appelant, tel que le jeton le decrit.
 *
 * On prend l utilisateur ENTIER et non son seul identifiant : le droit d analyser
 * une annonce depend de la propriete ET du role, et ne passer que l id obligerait
 * le service a relire l utilisateur en base a chaque appel.
 */
export type Appelant = { id: string; role?: string };

/** L administration voit tout : c est sa fonction, elle arbitre les litiges. */
const ROLES_ADMINISTRATION: string[] = [UserRole.admin, UserRole.support];

/**
 * Moteur de scoring BlediGo (heuristique deterministe, sans dependance externe).
 * Remplacable par un modele ML entraine sans changer l'interface.
 */
const CERTIF_POINTS = { none: 0, bronze: 5, silver: 10, gold: 15, diamond: 20 };

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seuls le proprietaire de l annonce et l administration l analysent.
   *
   * Ces deux routes ne rendent pas des donnees publiques. Le score expose les
   * criteres echoues et les axes d amelioration ; la detection de fraude expose
   * des signaux sur la PERSONNE du proprietaire — identite non verifiee, prix
   * anormalement bas. Ouvertes a tout compte connecte, elles offraient a un
   * concurrent le diagnostic de son voisin, et a n importe qui un soupcon
   * documente sur un tiers.
   *
   * La garde est ici et non dans le controleur, parce que le droit se lit sur
   * l ANNONCE : aucun role ne dit a lui seul si ce compte-ci possede
   * celle-la.
   */
  private verifierAcces(listing: { ownerId: string } | null, appelant: Appelant) {
    // Une annonce absente rend `null` sans passer par la garde, faute de
    // proprietaire a qui la comparer.
    //
    // CE QUE CELA REVELE, ET POURQUOI C EST ACCEPTE : un tiers recoit donc 403
    // sur une annonce qui existe et `null` sur une qui n existe pas, ce qui lui
    // apprend lesquelles existent. L information n est pas confidentielle — les
    // annonces sont publiquement cherchables — et uniformiser les deux reponses
    // couterait un mensonge au proprietaire legitime, a qui l on dirait
    // « non trouvee » pour une annonce bien presente.
    if (!listing) return;
    if (ROLES_ADMINISTRATION.includes(appelant?.role ?? '')) return;
    if (listing.ownerId === appelant?.id) return;
    throw new ForbiddenException('Vous n etes pas le proprietaire de cette annonce');
  }

  /** Score de confiance d'un logement : 0-100 */
  async scoreListing(listingId: string, appelant: Appelant) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { photos: true, reviews: true, passport: true, certifications: true },
    });
    if (!listing) return null;
    this.verifierAcces(listing, appelant);

    const reviews = listing.reviews || [];
    const avg = reviews.length ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : 0;

    const certifiedPhotos = listing.photos.filter((p: any) => p.isCertified).length;
    const ageDays = (Date.now() - new Date(listing.createdAt).getTime()) / 86400000;

    // Ponderation : total maximum = 100
    const components = {
      quality: Math.round((avg / 5) * 30), // 30 pts : note moyenne
      volume: Math.min(reviews.length * 2, 15), // 15 pts : nombre d avis
      photos: Math.min(listing.photos.length * 2 + certifiedPhotos * 3, 20), // 20 pts
      certification: CERTIF_POINTS[listing.certificationLevel as keyof typeof CERTIF_POINTS] ?? 0, // 20 pts
      seniority: Math.min(Math.floor(ageDays / 30), 15), // 15 pts : anciennete
    };

    const trustScore = Math.max(
      0,
      Math.min(100, Math.round(Object.values(components).reduce((a, b) => a + b, 0))),
    );

    await this.prisma.listing.update({
      where: { id: listingId },
      data: { trustScore, qualityScore: components.quality },
    });

    return { listingId, trustScore, components };
  }

  /** Detection de fraude sur une annonce : signaux + niveau de risque */
  async detectFraud(listingId: string, appelant: Appelant) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { photos: true, owner: true, bookings: true },
    });
    if (!listing) return null;
    this.verifierAcces(listing, appelant);

    const signals: string[] = [];
    const marketAvg = await this.prisma.listing.aggregate({
      where: { city: listing.city, status: 'active' },
      _avg: { pricePerNight: true },
    });
    const avgPrice = Number(marketAvg._avg.pricePerNight || 0);

    if (avgPrice && Number(listing.pricePerNight) < avgPrice * 0.4) {
      signals.push('prix anormalement bas par rapport au marche local');
    }
    if (listing.photos.length < 3) signals.push('moins de 3 photos');
    if (!listing.owner.identityVerified) signals.push('identite du proprietaire non verifiee');
    if (!listing.owner.phoneVerified) signals.push('telephone non verifie');
    if (listing.description.length < 100) signals.push('description tres courte');

    const riskLevel = signals.length >= 4 ? 'high' : signals.length >= 2 ? 'medium' : 'low';
    return { listingId, riskLevel, signals };
  }

  /** Prix conseille a partir des annonces comparables de la ville */
  async suggestPrice(city: string, propertyType: string, bedrooms: number) {
    const comparable = await this.prisma.listing.aggregate({
      where: { city, propertyType, bedrooms, status: 'active' },
      _avg: { pricePerNight: true },
      _min: { pricePerNight: true },
      _max: { pricePerNight: true },
      _count: true,
    });
    return {
      city,
      propertyType,
      bedrooms,
      sampleSize: comparable._count,
      suggested: Math.round(Number(comparable._avg.pricePerNight || 0)),
      range: {
        min: Number(comparable._min.pricePerNight || 0),
        max: Number(comparable._max.pricePerNight || 0),
      },
    };
  }
}

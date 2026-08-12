import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, OAuthDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { UserRole, UserStatus } from '../common/enums';
import { availableModes, effectiveRoles } from '../common/roles';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Recherche un compte par adresse, en tolerant la casse historique.
   *
   * `googleLogin` a toujours normalise l adresse en minuscules, `register` non :
   * la base peut donc contenir des lignes en casse mixte, et l index unique est
   * sensible a la casse aussi bien sous PostgreSQL que sous SQLite. On cherche
   * la forme normalisee, puis la forme exacte saisie, pour ne pas rendre
   * inaccessible un compte cree avant cette normalisation.
   *
   * Pas de `mode: 'insensitive'` ici : SQLite ne le supporte pas et le client
   * Prisma du developpement local cesserait de compiler.
   */
  private async trouverParEmail(saisie: string) {
    const normalise = this.normaliserEmail(saisie);
    const user = await this.prisma.user.findUnique({ where: { email: normalise } });
    if (user || normalise === saisie) return user;
    return this.prisma.user.findUnique({ where: { email: saisie } });
  }

  private normaliserEmail(email: string) {
    return String(email || '').trim().toLowerCase();
  }

  /** Empreinte qu aucune saisie ne peut reproduire : le compte reste ouvert,
   *  mais plus par mot de passe. */
  private empreinteInutilisable() {
    return bcrypt.hash(randomUUID() + randomUUID(), 12);
  }

  async register(dto: RegisterDto) {
    const email = this.normaliserEmail(dto.email);
    const existing = await this.trouverParEmail(dto.email);
    if (existing) throw new BadRequestException('Email deja utilise');

    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role || UserRole.traveler,
        status: UserStatus.active,
      },
    });

    // Creer le passeport correspondant
    if (user.role === UserRole.traveler) {
      await this.prisma.travelerPassport.create({ data: { userId: user.id } });
    } else if (user.role === UserRole.owner) {
      await this.prisma.ownerPassport.create({ data: { userId: user.id } });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.trouverParEmail(dto.email);
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    if (user.status === UserStatus.banned) {
      throw new UnauthorizedException('Compte suspendu definitivement');
    }
    if (user.status === UserStatus.suspended) {
      throw new UnauthorizedException('Compte temporairement suspendu');
    }

    // Log audit
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        ipAddress: ip,
        userAgent: userAgent || '',
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      return this.generateTokens(payload.sub, payload.email, payload.role);
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }
  }

  async logout(userId: string) {
    // Invalider le refresh token (blacklist Redis)
    return { success: true };
  }

  /**
   * Connexion Google.
   *
   * Le front obtient un jeton d identite signe par Google et nous le transmet ;
   * nous le faisons valider par Google avant d y croire. Un jeton non verifie
   * serait une porte ouverte : n importe qui pourrait en fabriquer un et se
   * declarer proprietaire de n importe quelle adresse.
   *
   * Deux controles sont indispensables et souvent oublies :
   *  - `aud` doit etre NOTRE identifiant client, sinon un jeton emis pour une
   *    autre application serait accepte ;
   *  - `email_verified` doit etre vrai, sinon on lierait un compte a une
   *    adresse que Google lui-meme ne garantit pas.
   */
  async googleLogin(credential: string, ip = '', userAgent = '') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('Connexion Google non configuree sur ce serveur');
    }

    const reponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );
    if (!reponse.ok) throw new UnauthorizedException('Jeton Google invalide ou expire');

    const info: any = await reponse.json();

    if (info.aud !== clientId) {
      throw new UnauthorizedException('Ce jeton Google ne concerne pas BlediGo');
    }
    if (String(info.email_verified) !== 'true' || !info.email) {
      throw new UnauthorizedException('Adresse Google non verifiee');
    }

    const email = this.normaliserEmail(info.email);
    let user = await this.trouverParEmail(email);

    if (user) {
      if (user.status === UserStatus.banned) {
        throw new UnauthorizedException('Compte suspendu definitivement');
      }
      if (user.status === UserStatus.suspended) {
        throw new UnauthorizedException('Compte temporairement suspendu');
      }
      // Rattachement a un compte existant : c est le moment dangereux.
      //
      // Rien ne verifie l adresse a l inscription par mot de passe
      // (`verifyEmail` n est encore qu une ebauche). Il suffisait donc
      // d inscrire l adresse de quelqu un avant lui pour qu il atterrisse, a sa
      // premiere connexion Google, dans un compte dont on gardait le mot de
      // passe — et dont on lisait ensuite les messages et les reservations.
      //
      // Google vient de prouver la propriete de l adresse ; le mot de passe
      // preexistant, lui, n a jamais rien prouve. On le rend donc inutilisable.
      // Personne ne perd l acces au passage : seul quelqu un qui possede cette
      // adresse chez Google peut arriver jusqu ici, et ce chemin lui reste
      // ouvert. Un compte deja verifie n est pas concerne.
      if (!user.emailVerified) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: true,
            passwordHash: await this.empreinteInutilisable(),
          },
        });
        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'google_reprise_compte_non_verifie',
            entityType: 'user',
            entityId: user.id,
            details: JSON.stringify({
              motif: 'compte cree par mot de passe sans verification d adresse',
            }),
            ipAddress: ip,
            userAgent: userAgent || '',
          },
        });
      }
    } else {
      // Pas de mot de passe utilisable : on stocke une empreinte aleatoire
      // plutot qu une valeur vide, pour qu aucune saisie ne puisse y
      // correspondre par accident.
      const inutilisable = await this.empreinteInutilisable();

      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: inutilisable,
          firstName: info.given_name || String(info.name || email).split(' ')[0] || 'Utilisateur',
          lastName: info.family_name || '',
          role: UserRole.traveler,
          status: UserStatus.active,
          emailVerified: true,
        },
      });
      await this.prisma.travelerPassport.create({ data: { userId: user.id } });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async oauthLogin(dto: OAuthDto, ip = '', userAgent = '') {
    // Seul Google est branche : Facebook exigerait une verification
    // d entreprise, et Instagram ne fournit pas d adresse email.
    return this.googleLogin(dto.token, ip, userAgent);
  }

  async verifyEmail(token: string) {
    // Verifier le token JWT de verification
    // Activer email_verified
    return { success: true };
  }

  async verifyPhone(phone: string, code: string) {
    // Verifier le code SMS (Twilio)
    // Activer phone_verified
    return { success: true };
  }

  async forgotPassword(email: string) {
    // Generer token, envoyer email
    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    // Verifier token, hasher nouveau mot de passe
    return { success: true };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }),
    ]);
    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    // Le front s appuie sur les roles effectifs pour proposer la bascule de mode
    return { ...rest, roles: effectiveRoles(user), modes: availableModes(user) };
  }
}

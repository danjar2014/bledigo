import { ForbiddenException } from '@nestjs/common';
import { AiService } from './ai.service';
import { UserRole } from '../common/enums';

/**
 * Qui a le droit de faire analyser une annonce.
 *
 * Ces deux routes ne rendent pas des donnees publiques : le score expose les
 * criteres echoues d une annonce et ses axes d amelioration, et la detection de
 * fraude expose des signaux sur son PROPRIETAIRE — « identite non verifiee »,
 * « prix anormalement bas ». Les laisser ouvertes a tout compte connecte revenait
 * a offrir a un concurrent le diagnostic de qualite de son voisin, et a n importe
 * qui un soupcon documente sur un tiers.
 *
 * Ce qui se teste ici est donc le REFUS, pas l acces : l acces marchait deja.
 */
describe('AiService - qui peut analyser une annonce', () => {
  const ANNONCE = {
    id: 'l-1',
    ownerId: 'hote',
    city: 'La Marsa',
    pricePerNight: 180,
    createdAt: new Date('2026-01-01'),
    certificationLevel: 'none',
    photos: [],
    reviews: [],
    passport: null,
    certifications: [],
    // `detectFraud` lit aussi ces deux-la : sans elles le simulacre casse sur
    // une lecture de `.length`, ce qui masquerait le comportement teste.
    description: 'Une description assez longue pour ne declencher aucun signal de fraude dans ce test unitaire.',
    owner: { identityVerified: true, phoneVerified: true },
    bookings: [],
  };

  function build(annonce: any = ANNONCE) {
    const prisma: any = {
      listing: {
        findUnique: jest.fn().mockResolvedValue(annonce),
        aggregate: jest.fn().mockResolvedValue({ _avg: { pricePerNight: 180 } }),
        update: jest.fn().mockImplementation(({ data }: any) => ({ ...annonce, ...data })),
      },
    };
    return { service: new AiService(prisma), prisma };
  }

  const HOTE = { id: 'hote', role: UserRole.owner };
  const TIERS = { id: 'curieux', role: UserRole.owner };
  const ADMIN = { id: 'admin-1', role: UserRole.admin };

  // ------------------------------------------------------------------ //
  // Le refus, qui est la regle nouvelle                                 //
  // ------------------------------------------------------------------ //

  it('refuse le score a un tiers connecte', async () => {
    const { service } = build();
    await expect(service.scoreListing('l-1', TIERS)).rejects.toThrow(ForbiddenException);
  });

  it('refuse la detection de fraude a un tiers connecte', async () => {
    // Plus sensible encore que le score : elle porte sur la personne du
    // proprietaire, pas seulement sur la qualite de son annonce.
    const { service } = build();
    await expect(service.detectFraud('l-1', TIERS)).rejects.toThrow(ForbiddenException);
  });

  it('ne laisse rien filtrer du contenu avant de refuser', async () => {
    // Un refus qui rendrait quand meme des donnees ne serait pas un refus.
    const { service } = build();
    await expect(service.scoreListing('l-1', TIERS)).rejects.toThrow(/proprietaire/i);
  });

  // ------------------------------------------------------------------ //
  // Ce qui doit continuer de marcher                                    //
  // ------------------------------------------------------------------ //

  it('laisse le proprietaire noter son annonce', async () => {
    const { service } = build();
    const r = await service.scoreListing('l-1', HOTE);
    expect(r).not.toBeNull();
  });

  it('laisse le proprietaire consulter sa detection de fraude', async () => {
    const { service } = build();
    const r = await service.detectFraud('l-1', HOTE);
    expect(r).not.toBeNull();
  });

  it('laisse l administration analyser n importe quelle annonce', async () => {
    // C est sa raison d etre : l administration arbitre, donc elle doit voir.
    const { service } = build();
    await expect(service.scoreListing('l-1', ADMIN)).resolves.not.toBeNull();
    await expect(service.detectFraud('l-1', ADMIN)).resolves.not.toBeNull();
  });

  it('laisse le support analyser n importe quelle annonce', async () => {
    const { service } = build();
    const support = { id: 's-1', role: UserRole.support };
    await expect(service.scoreListing('l-1', support)).resolves.not.toBeNull();
  });

  // ------------------------------------------------------------------ //
  // Annonce absente                                                     //
  // ------------------------------------------------------------------ //

  it('rend null sur une annonce absente, sans lever de refus', async () => {
    // La garde a besoin d un proprietaire pour comparer : sans annonce, il n y a
    // rien a proteger. Un tiers distingue donc l absente (null) de l interdite
    // (403) — c est assume, les annonces sont publiquement cherchables.
    const { service } = build(null);
    await expect(service.scoreListing('inconnu', TIERS)).resolves.toBeNull();
  });
});

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

/**
 * Semis BlediGo.
 *
 * Ce script est rejoue a CHAQUE reveil du service : il vit dans le startCommand
 * de render.yaml, faute de Shell Render sur l offre gratuite. Deux consequences
 * gouvernent tout ce fichier.
 *
 * 1. Supprimer un compte directement en base ne sert a rien, le semis suivant
 *    le recree. Une neutralisation doit donc se faire ICI, pas en base.
 * 2. Le bloc `update` des upsert s execute a chaque demarrage : c est le seul
 *    levier disponible pour corriger des lignes deja en production.
 *
 * Aucun mot de passe n est ecrit en dur. Ils viennent de l environnement, donc
 * de l interface Render. Un mot de passe de demonstration commite serait, sur
 * une URL publique, une porte d entree permanente.
 */

const prisma = new PrismaClient();

const EN_PRODUCTION = process.env.NODE_ENV === 'production';

/** Adresses cablees dans les versions precedentes du semis. Elles partageaient
 *  toutes le meme mot de passe, present dans l historique git : toute adresse
 *  qui ne fait plus partie du jeu de demonstration courant doit etre fermee. */
const HERITAGE = ['admin@bledigo.com', 'owner@bledigo.com', 'traveler@bledigo.com'];

/** Empreinte qu aucune saisie ne peut reproduire : le compte continue d exister
 *  et garde son historique, mais la connexion par mot de passe lui est fermee.
 *  Une chaine vide ne conviendrait pas, bcrypt.compare la comparerait quand meme. */
function empreinteInutilisable() {
  return bcrypt.hash(randomUUID() + randomUUID(), 12);
}

/** Ferme l acces par mot de passe a une adresse, si elle existe. `updateMany`
 *  plutot que `update` : ne rien trouver n est pas une erreur ici. */
async function fermer(email: string, raison: string) {
  const r = await prisma.user.updateMany({
    where: { email },
    data: { passwordHash: await empreinteInutilisable() },
  });
  if (r.count > 0) console.log(`  ferme : ${email} (${raison})`);
}

async function main() {
  console.log('Seed BlediGo...');

  // ------------------------------------------------------------ Administrateur
  //
  // Plus de compte admin par defaut : il n existe que si un mot de passe est
  // fourni par l environnement. Le passwordHash est aussi dans `update`, ce qui
  // fait de ce script le moyen de rotation du mot de passe admin — remplacer la
  // valeur dans Render et redeployer suffit.
  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const hashAdmin = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { passwordHash: hashAdmin, role: 'admin', status: 'active' },
      create: {
        email: ADMIN_EMAIL,
        passwordHash: hashAdmin,
        firstName: 'Admin',
        lastName: 'BlediGo',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        phoneVerified: true,
        identityVerified: true,
      },
    });
    console.log(`  admin : ${admin.email}`);
  } else if (EN_PRODUCTION) {
    console.warn('  ATTENTION : aucun compte admin (ADMIN_EMAIL / ADMIN_PASSWORD absents).');
  }

  // ------------------------------------------------------------ Demonstration
  const DEMO_ACTIF = (process.env.SEED_DEMO || 'true').toLowerCase() === 'true';
  const EMAIL_OWNER = (process.env.DEMO_EMAIL_OWNER || 'owner@bledigo.com').trim().toLowerCase();
  const EMAIL_TRAVELER = (process.env.DEMO_EMAIL_TRAVELER || 'traveler@bledigo.com').trim().toLowerCase();

  // En local, un mot de passe connu evite de configurer quoi que ce soit. En
  // production il doit venir de Render : sans lui les comptes sont crees mais
  // sans acces par mot de passe, ce qui est le defaut sur lequel se tromper.
  const MDP_DEMO = process.env.DEMO_PASSWORD || (EN_PRODUCTION ? '' : 'Password123!');

  // Toute adresse d origine qui n est plus utilisee comme compte de demo est
  // fermee, y compris quand la demo reste active sur d autres adresses.
  const conserves = new Set([ADMIN_EMAIL, ...(DEMO_ACTIF ? [EMAIL_OWNER, EMAIL_TRAVELER] : [])]);
  for (const email of HERITAGE) {
    if (!conserves.has(email)) await fermer(email, 'compte de demonstration historique');
  }

  if (!DEMO_ACTIF) {
    console.log('Demonstration desactivee (SEED_DEMO != true). Aucune donnee de demo.');
    return;
  }

  if (EN_PRODUCTION && !MDP_DEMO) {
    console.warn('  ATTENTION : DEMO_PASSWORD absent, les comptes de demo restent sans mot de passe.');
  }

  const hash = MDP_DEMO ? await bcrypt.hash(MDP_DEMO, 12) : await empreinteInutilisable();

  const owner = await prisma.user.upsert({
    where: { email: EMAIL_OWNER },
    update: { passwordHash: hash },
    create: {
      email: EMAIL_OWNER,
      passwordHash: hash,
      firstName: 'Sami',
      lastName: 'Ben Ali',
      phone: '+21620123456',
      role: 'owner',
      status: 'active',
      emailVerified: true,
      phoneVerified: true,
      identityVerified: true,
      ownerPassport: { create: { trustScore: 78 } },
    },
  });

  const traveler = await prisma.user.upsert({
    where: { email: EMAIL_TRAVELER },
    update: { passwordHash: hash },
    create: {
      email: EMAIL_TRAVELER,
      passwordHash: hash,
      firstName: 'Leila',
      lastName: 'Trabelsi',
      phone: '+33612345678',
      role: 'traveler',
      status: 'active',
      emailVerified: true,
      travelerPassport: { create: { trustScore: 65 } },
    },
  });

  const listings = [
    {
      title: 'Villa avec piscine a Hammamet',
      description:
        'Belle villa de 4 chambres a 300 m de la plage, piscine privee, jardin ombrage, wifi fibre et climatisation dans toutes les pieces. Ideale pour des vacances en famille.',
      city: 'Hammamet',
      region: 'Nabeul',
      address: '12 rue des Oliviers',
      latitude: 36.4,
      longitude: 10.6167,
      propertyType: 'villa',
      maxGuests: 8,
      bedrooms: 4,
      bathrooms: 3,
      pricePerNight: 320,
      cleaningFee: 60,
      serviceFee: 30,
      certificationLevel: 'gold',
      trustScore: 88,
    },
    {
      title: 'Appartement vue mer a La Marsa',
      description:
        'Appartement lumineux de 2 chambres avec grande terrasse vue mer, a 5 minutes a pied des cafes de La Marsa. Parking securise inclus.',
      city: 'La Marsa',
      region: 'Tunis',
      address: '45 avenue Habib Bourguiba',
      latitude: 36.8783,
      longitude: 10.3247,
      propertyType: 'apartment',
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1,
      pricePerNight: 180,
      cleaningFee: 40,
      serviceFee: 18,
      certificationLevel: 'silver',
      trustScore: 74,
    },
    {
      title: 'Riad traditionnel a Djerba',
      description:
        'Riad authentique restaure au coeur de Houmt Souk, patio central avec fontaine, 3 chambres decorees a la main, petit dejeuner tunisien inclus.',
      city: 'Djerba',
      region: 'Medenine',
      address: '8 impasse El Ghriba',
      latitude: 33.8756,
      longitude: 10.8571,
      propertyType: 'riad',
      maxGuests: 6,
      bedrooms: 3,
      bathrooms: 2,
      pricePerNight: 240,
      cleaningFee: 50,
      serviceFee: 24,
      certificationLevel: 'diamond',
      trustScore: 94,
    },
    {
      title: 'Studio cosy a Sidi Bou Said',
      description:
        'Studio typique bleu et blanc dans le village de Sidi Bou Said, terrasse privative avec vue sur le golfe de Tunis. Parfait pour un couple.',
      city: 'Sidi Bou Said',
      region: 'Tunis',
      address: '3 rue Sidi Chabaane',
      latitude: 36.8708,
      longitude: 10.3417,
      propertyType: 'studio',
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: 1,
      pricePerNight: 110,
      cleaningFee: 25,
      serviceFee: 11,
      certificationLevel: 'bronze',
      trustScore: 61,
    },
  ];

  for (const [i, l] of listings.entries()) {
    const slug = l.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const listing = await prisma.listing.upsert({
      where: { slug },
      update: {},
      create: {
        ...(l as any),
        slug,
        ownerId: owner.id,
        country: 'Tunisia',
        currency: 'TND',
        status: 'active',
        photos: {
          create: [
            { url: `https://picsum.photos/seed/bledigo${i}a/1200/800`, isPrimary: true, isCertified: true },
            { url: `https://picsum.photos/seed/bledigo${i}b/1200/800` },
            { url: `https://picsum.photos/seed/bledigo${i}c/1200/800` },
          ],
        },
        passport: { create: { stayCount: 0 } },
      },
    });
    console.log(`  annonce : ${listing.title}`);
  }

  // Le mot de passe n est jamais affiche : ces journaux sont consultables dans
  // l interface Render.
  console.log('\nComptes de demonstration');
  console.log(`  proprietaire : ${owner.email}`);
  console.log(`  voyageur     : ${traveler.email}`);
  const origineMdp = process.env.DEMO_PASSWORD
    ? 'defini par DEMO_PASSWORD'
    : MDP_DEMO
      ? 'valeur de developpement local'
      : 'aucun, connexion par mot de passe fermee';
  console.log(`  mot de passe : ${origineMdp}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

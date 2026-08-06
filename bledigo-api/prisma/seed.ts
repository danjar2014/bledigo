import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed BlediGo...');

  const hash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bledigo.com' },
    update: {},
    create: {
      email: 'admin@bledigo.com',
      passwordHash: hash,
      firstName: 'Admin',
      lastName: 'BlediGo',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      phoneVerified: true,
      identityVerified: true,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@bledigo.com' },
    update: {},
    create: {
      email: 'owner@bledigo.com',
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
    where: { email: 'traveler@bledigo.com' },
    update: {},
    create: {
      email: 'traveler@bledigo.com',
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

  console.log('\nComptes de demo (mot de passe : Password123!)');
  console.log(`  admin     : ${admin.email}`);
  console.log(`  owner     : ${owner.email}`);
  console.log(`  traveler  : ${traveler.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

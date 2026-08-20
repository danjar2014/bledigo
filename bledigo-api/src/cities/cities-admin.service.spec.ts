import { CitiesAdminService } from './cities-admin.service';

/**
 * Referentiel des villes.
 *
 * Deux comportements peuvent echouer sans bruit, et ce sont eux qu on epingle :
 * une suppression qui detacherait des annonces, et une premiere creation qui
 * ferait disparaitre toutes les villes livrees avec le code.
 */
describe('CitiesAdminService', () => {
  function build(opts: any = {}) {
    const prisma = {
      city: {
        findMany: jest.fn().mockResolvedValue(opts.villes ?? []),
        findUnique: jest.fn().mockResolvedValue(opts.ville ?? null),
        count: jest.fn().mockResolvedValue(opts.nbVilles ?? 0),
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'v-1', ...data })),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockImplementation(({ data }) => ({ ...opts.ville, ...data })),
        delete: jest.fn().mockResolvedValue({}),
      },
      listing: {
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(opts.annonces ?? 0),
      },
      providerZone: { count: jest.fn().mockResolvedValue(opts.zones ?? 0) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    return { service: new CitiesAdminService(prisma as any), prisma };
  }

  describe('lecture', () => {
    /**
     * Le repli qui evite de paraitre casse : une base fraiche n a aucune ville
     * en table, et rendre une liste vide donnerait une recherche sans
     * destination et un back-office qui invite a tout ressaisir.
     */
    it('sert la liste livree avec le code tant que la table est vide', async () => {
      const { service } = build({ villes: [] });

      const res = await service.lister();

      expect(res.source).toBe('statique');
      expect(res.villes.length).toBeGreaterThan(20);
      expect(res.villes.some((v: any) => v.name === 'Hammamet')).toBe(true);
    });

    it('sert la base des qu elle contient quelque chose', async () => {
      const { service } = build({
        villes: [{ id: 'v-1', slug: 'tunis', name: 'Tunis', region: 'Tunis', active: true }],
      });

      const res = await service.lister();

      expect(res.source).toBe('base');
      expect(res.villes).toHaveLength(1);
    });
  });

  describe('creation', () => {
    /**
     * Le piege : ajouter la premiere ville a la main ferait basculer la lecture
     * sur une table qui n en contiendrait QU UNE, et les trente autres
     * destinations disparaitraient d un coup.
     */
    it('reprend le referentiel avant d ajouter la premiere ville', async () => {
      const { service, prisma } = build({ nbVilles: 0 });

      await service.creer('admin', {
        name: 'Tabarka',
        region: 'Jendouba',
        latitude: 36.9,
        longitude: 8.7,
      });

      expect(prisma.city.createMany).toHaveBeenCalled();
      expect(prisma.city.create).toHaveBeenCalled();
    });

    it('n importe pas deux fois quand la table est deja peuplee', async () => {
      const { service, prisma } = build({ nbVilles: 30 });

      await service.creer('admin', { name: 'Tabarka', region: 'Jendouba', latitude: 36.9, longitude: 8.7 });

      expect(prisma.city.createMany).not.toHaveBeenCalled();
    });

    it('deduit le slug du nom, accents et espaces compris', async () => {
      const { service, prisma } = build({ nbVilles: 30 });

      await service.creer('admin', { name: '  Sidi Bou Saïd ', region: 'Tunis', latitude: 1, longitude: 2 });

      expect(prisma.city.create.mock.calls[0][0].data.slug).toBe('sidi-bou-said');
    });

    it('refuse un doublon', async () => {
      const { service } = build({ nbVilles: 30, ville: { id: 'x', name: 'Tunis' } });

      await expect(
        service.creer('admin', { name: 'Tunis', region: 'Tunis', latitude: 1, longitude: 2 }),
      ).rejects.toThrow(/existe deja/);
    });
  });

  describe('suppression', () => {
    it('supprime une ville que personne n utilise', async () => {
      const { service, prisma } = build({ ville: { id: 'v-1', slug: 'x', name: 'X' } });

      await service.supprimer('admin', 'v-1');

      expect(prisma.city.delete).toHaveBeenCalled();
    });

    /** Supprimer une ville habitee sortirait ses logements de la recherche par
     *  ville, sans que personne comprenne pourquoi. */
    it('refuse quand des annonces y pointent, et propose la desactivation', async () => {
      const { service, prisma } = build({ ville: { id: 'v-1', slug: 'tunis', name: 'Tunis' }, annonces: 4 });

      await expect(service.supprimer('admin', 'v-1')).rejects.toThrow(/Desactivez-la/);
      expect(prisma.city.delete).not.toHaveBeenCalled();
    });

    it('refuse aussi quand un prestataire la declare comme zone', async () => {
      const { service } = build({ ville: { id: 'v-1', slug: 'tunis', name: 'Tunis' }, zones: 2 });

      await expect(service.supprimer('admin', 'v-1')).rejects.toThrow(/zone\(s\) de prestataire/);
    });
  });

  describe('modification', () => {
    /** Le slug est reference par les zones des prestataires : le regenerer a
     *  chaque correction de nom les detacherait en silence. */
    it('ne touche jamais au slug, meme quand le nom change', async () => {
      const { service, prisma } = build({ ville: { id: 'v-1', slug: 'la-marsa', name: 'Marsa' } });

      await service.modifier('admin', 'v-1', { name: 'La Marsa' });

      expect(prisma.city.update.mock.calls[0][0].data.slug).toBeUndefined();
    });
  });
});

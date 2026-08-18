import { AvailabilityService } from './availability.service';

/**
 * Disponibilites d un prestataire.
 *
 * Ce qui se teste ici est ce que le filtre REFUSE. Un filtre trop laxiste
 * propose quelqu un qui refusera, un filtre trop strict fait disparaitre des
 * prestataires sans que personne comprenne pourquoi ses demandes se tarissent
 * — et c est le second cas qui se remarque le plus tard.
 */
describe('AvailabilityService - filtrerDisponibles', () => {
  /** Mardi 25 aout 2026, 09:00 -> 12:00 UTC. */
  const debut = new Date('2026-08-25T09:00:00.000Z');
  const fin = new Date('2026-08-25T12:00:00.000Z');
  const MARDI = debut.getUTCDay();

  function build(opts: any = {}) {
    const prisma = {
      providerAvailability: { findMany: jest.fn().mockResolvedValue(opts.horaires ?? []) },
      providerTimeOff: { findMany: jest.fn().mockResolvedValue(opts.absences ?? []) },
      serviceBooking: { findMany: jest.fn().mockResolvedValue(opts.occupations ?? []) },
    };
    return new AvailabilityService(prisma as any);
  }

  it('propose un prestataire dont le creneau couvre la demande', async () => {
    const s = build({
      horaires: [{ providerId: 'p1', dayOfWeek: MARDI, startTime: '08:00', endTime: '18:00' }],
    });

    expect([...(await s.filtrerDisponibles(['p1'], debut, fin))]).toEqual(['p1']);
  });

  it('ecarte celui qui commence trop tard', async () => {
    const s = build({
      horaires: [{ providerId: 'p1', dayOfWeek: MARDI, startTime: '10:00', endTime: '18:00' }],
    });

    expect((await s.filtrerDisponibles(['p1'], debut, fin)).size).toBe(0);
  });

  it('ecarte celui qui finit trop tot, meme d une demi-heure', async () => {
    const s = build({
      horaires: [{ providerId: 'p1', dayOfWeek: MARDI, startTime: '08:00', endTime: '11:30' }],
    });

    expect((await s.filtrerDisponibles(['p1'], debut, fin)).size).toBe(0);
  });

  it('ecarte celui qui travaille un autre jour', async () => {
    const s = build({
      horaires: [{ providerId: 'p1', dayOfWeek: (MARDI + 1) % 7, startTime: '08:00', endTime: '18:00' }],
    });

    expect((await s.filtrerDisponibles(['p1'], debut, fin)).size).toBe(0);
  });

  /**
   * Le repli qui evite de vider l annuaire : un compte cree avant les horaires
   * n a rien declare, et le sortir des resultats le punirait d une
   * fonctionnalite qui n existait pas.
   */
  it('garde celui qui n a declare aucun horaire', async () => {
    const s = build({ horaires: [] });

    expect([...(await s.filtrerDisponibles(['ancien'], debut, fin))]).toEqual(['ancien']);
  });

  it('ecarte celui qui est en conges, meme dans ses horaires', async () => {
    const s = build({
      horaires: [{ providerId: 'p1', dayOfWeek: MARDI, startTime: '08:00', endTime: '18:00' }],
      absences: [{ providerId: 'p1' }],
    });

    expect((await s.filtrerDisponibles(['p1'], debut, fin)).size).toBe(0);
  });

  /**
   * « Une fois qu il a valide, il ne doit plus etre propose » : accepter occupe
   * le creneau. Sans cela on lui enverrait deux menages a la meme heure.
   */
  it('ecarte celui qui a deja une prestation sur ce creneau', async () => {
    const s = build({
      horaires: [{ providerId: 'p1', dayOfWeek: MARDI, startTime: '08:00', endTime: '18:00' }],
      occupations: [{ providerId: 'p1' }],
    });

    expect((await s.filtrerDisponibles(['p1'], debut, fin)).size).toBe(0);
  });

  it('ne fait aucune requete quand personne n est a filtrer', async () => {
    const s = build();

    expect((await s.filtrerDisponibles([], debut, fin)).size).toBe(0);
  });

  it('ne garde que les disponibles dans un lot mixte', async () => {
    const s = build({
      horaires: [
        { providerId: 'ouvert', dayOfWeek: MARDI, startTime: '08:00', endTime: '18:00' },
        { providerId: 'ferme', dayOfWeek: MARDI, startTime: '14:00', endTime: '18:00' },
      ],
      absences: [{ providerId: 'absent' }],
    });

    const libres = await s.filtrerDisponibles(['ouvert', 'ferme', 'absent', 'sansHoraire'], debut, fin);

    expect([...libres].sort()).toEqual(['ouvert', 'sansHoraire']);
  });
});

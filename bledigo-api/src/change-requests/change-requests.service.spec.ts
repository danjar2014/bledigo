import { ChangeRequestsService } from './change-requests.service';

/**
 * Demandes d annulation et de changement de dates.
 *
 * Ce qui se teste ici n est pas la mecanique de mise a jour, mais les regles qui
 * distinguent une demande d une annulation deguisee : le motif est obligatoire,
 * le silence a une echeance, une reservation jamais acceptee se retire seule, et
 * la disponibilite est reverifiee au moment d appliquer — pas au moment de
 * demander.
 */
describe('ChangeRequestsService', () => {
  const SEJOUR = {
    id: 'b-1',
    listingId: 'l-1',
    travelerId: 'voyageur',
    ownerId: 'hote',
    checkIn: new Date('2026-11-10T00:00:00.000Z'),
    checkOut: new Date('2026-11-13T00:00:00.000Z'),
    status: 'confirmed',
    totalPrice: 598,
    cleaningFee: 40,
    serviceFee: 18,
    insuranceFee: 0,
    currency: 'TND',
    listing: { title: 'Dar Ali', cancellationDeadlineDays: 7, cancellationPolicy: 'Sur l honneur.' },
  };

  function build(surcharge: any = {}) {
    const sejour = {
      ...SEJOUR,
      ...surcharge,
      listing: { ...SEJOUR.listing, ...(surcharge.listing ?? {}) },
    };

    const creees: any[] = [];
    const prisma: any = {
      booking: {
        findFirst: jest
          .fn()
          // Le premier appel retrouve la reservation ; les suivants cherchent un
          // chevauchement, absent par defaut.
          .mockResolvedValueOnce(sejour)
          .mockResolvedValue(surcharge.chevauchement ?? null),
        update: jest.fn().mockImplementation(({ data }: any) => ({ ...sejour, ...data })),
      },
      serviceBooking: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockImplementation(({ data }: any) => data),
      },
      listingCalendar: { findFirst: jest.fn().mockResolvedValue(surcharge.datesFermees ?? null) },
      vehicleCalendar: { findFirst: jest.fn().mockResolvedValue(null) },
      changeRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(surcharge.demande ?? null),
        findMany: jest.fn().mockResolvedValue(surcharge.expirees ?? []),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockImplementation(({ data }: any) => data),
        create: jest.fn().mockImplementation(({ data }: any) => {
          creees.push(data);
          return { id: 'cr-1', ...data };
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    const calendar: any = {
      tarifer: jest.fn().mockResolvedValue({
        nuits: 3,
        basePrice: 540,
        minNights: surcharge.minNights ?? 1,
        prixMoyen: 180,
      }),
    };
    const vehicles: any = { tarifer: jest.fn().mockResolvedValue({ jours: 3, prix: 300 }) };

    return {
      service: new ChangeRequestsService(prisma, calendar, vehicles),
      prisma,
      calendar,
      creees,
    };
  }

  const BASE = {
    scope: 'sejour' as const,
    reservationId: 'b-1',
    kind: 'annulation' as const,
    reasonCode: 'changement_programme',
  };

  // ------------------------------------------------------------------ //
  // Le motif                                                            //
  // ------------------------------------------------------------------ //

  it('refuse un motif hors de la liste', async () => {
    const { service } = build();
    await expect(service.demander('voyageur', { ...BASE, reasonCode: 'parce_que' })).rejects.toThrow(
      /Motif inconnu/,
    );
  });

  it('refuse un motif propre a la location sur un sejour', async () => {
    // `vehicule_indisponible` existe, mais pas pour un logement. Sans ce
    // cloisonnement la liste finirait par tout proposer partout.
    const { service } = build();
    await expect(
      service.demander('voyageur', { ...BASE, reasonCode: 'vehicule_indisponible' }),
    ).rejects.toThrow(/Motif inconnu/);
  });

  it('exige un texte quand le motif est « autre »', async () => {
    const { service } = build();
    await expect(
      service.demander('voyageur', { ...BASE, reasonCode: 'autre', reasonText: '   ' }),
    ).rejects.toThrow(/Precisez le motif/);
  });

  // ------------------------------------------------------------------ //
  // Accord requis, ou non                                               //
  // ------------------------------------------------------------------ //

  it('annule immediatement une reservation que personne n a acceptee', async () => {
    // Personne n a rien organise : faire valider l abandon d une demande jamais
    // acceptee n aurait aucun sens.
    const { service, prisma } = build({ status: 'pending' });
    const r = await service.demander('voyageur', BASE);

    expect(r.applique).toBe(true);
    expect(r.sansAccord).toBe(true);
    expect(prisma.changeRequest.create).not.toHaveBeenCalled();
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }),
    );
  });

  it('cree une demande en attente sur une reservation acceptee', async () => {
    const { service, creees } = build({ status: 'confirmed' });
    const r = await service.demander('voyageur', BASE);

    expect(r.applique).toBe(false);
    expect(creees[0].status).toBe('pending');
    expect(creees[0].requestedByRole).toBe('voyageur');
    // L echeance est POSEE des la creation : sans elle, le silence de l hote
    // immobiliserait le voyageur indefiniment.
    expect(creees[0].autoAcceptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('refuse toute demande sur une reservation deja close', async () => {
    const { service } = build({ status: 'completed' });
    await expect(service.demander('voyageur', BASE)).rejects.toThrow(/deja close/);
  });

  // ------------------------------------------------------------------ //
  // Annulation tardive                                                  //
  // ------------------------------------------------------------------ //

  it('consigne le retard sans bloquer la demande', async () => {
    // Le delai est de 7 jours et l arrivee est demain : la demande est tardive.
    // Elle DOIT quand meme passer — refuser ne ferait pas venir le voyageur, et
    // garderait les dates bloquees pour rien.
    const demain = new Date(Date.now() + 24 * 3600 * 1000);
    const { service, creees } = build({ checkIn: demain, status: 'confirmed' });

    const r = await service.demander('voyageur', BASE);

    expect(r.applique).toBe(false);
    expect(creees[0].wasLate).toBe(true);
  });

  it('ne declare rien de tardif quand l annonce n a pas de delai', async () => {
    const demain = new Date(Date.now() + 24 * 3600 * 1000);
    const { service, creees } = build({
      checkIn: demain,
      status: 'confirmed',
      listing: { cancellationDeadlineDays: null },
    });

    await service.demander('voyageur', BASE);
    expect(creees[0].wasLate).toBe(false);
  });

  it('fige les conditions opposees au moment de la demande', async () => {
    // L hote peut changer son delai apres coup : sans cette copie, on ne saurait
    // plus ce qui a reellement ete oppose.
    const { service, creees } = build({ status: 'confirmed' });
    await service.demander('voyageur', BASE);

    const fige = JSON.parse(creees[0].policySnapshot);
    expect(fige.delaiJours).toBe(7);
    expect(fige.conditions).toBe('Sur l honneur.');
    expect(fige.surLHonneur).toBe(true);
  });

  // ------------------------------------------------------------------ //
  // Changement de dates                                                 //
  // ------------------------------------------------------------------ //

  it('fige le prix des nouvelles dates des la demande', async () => {
    const { service, creees } = build({ status: 'confirmed' });
    await service.demander('voyageur', {
      ...BASE,
      kind: 'modification_dates',
      newStartDate: '2026-12-01',
      newEndDate: '2026-12-04',
    });

    // 540 de nuits + 40 de menage + 18 de service : les annexes ne bougent pas,
    // elles valent pour un sejour et le sejour se deplace.
    expect(creees[0].newPrice).toBe(598);
  });

  it('refuse des dates deja prises par quelqu un d autre', async () => {
    const { service } = build({ status: 'confirmed', chevauchement: { id: 'b-2' } });
    await expect(
      service.demander('voyageur', {
        ...BASE,
        kind: 'modification_dates',
        newStartDate: '2026-12-01',
        newEndDate: '2026-12-04',
      }),
    ).rejects.toThrow(/deja reservees/);
  });

  it('oppose la duree minimale, contrairement a une extension', async () => {
    // Une extension allonge un sejour commence ; un decalage refait un sejour
    // entier, qui doit donc respecter minNights comme toute reservation.
    const { service } = build({ status: 'confirmed', minNights: 7 });
    await expect(
      service.demander('voyageur', {
        ...BASE,
        kind: 'modification_dates',
        newStartDate: '2026-12-01',
        newEndDate: '2026-12-04',
      }),
    ).rejects.toThrow(/au moins 7 nuits/);
  });

  it('refuse un deplacement vers le passe', async () => {
    const { service } = build({ status: 'confirmed' });
    await expect(
      service.demander('voyageur', {
        ...BASE,
        kind: 'modification_dates',
        newStartDate: '2020-01-01',
        newEndDate: '2020-01-04',
      }),
    ).rejects.toThrow(/dans le passe/);
  });

  // ------------------------------------------------------------------ //
  // Reponse                                                             //
  // ------------------------------------------------------------------ //

  it('interdit de repondre a sa propre demande', async () => {
    const { service } = build({
      status: 'confirmed',
      demande: {
        id: 'cr-1',
        scope: 'sejour',
        kind: 'annulation',
        status: 'pending',
        bookingId: 'b-1',
        requestedById: 'voyageur',
      },
    });
    await expect(service.repondre('voyageur', 'cr-1', true)).rejects.toThrow(/retrait/);
  });

  it('applique l annulation quand l hote accepte', async () => {
    const { service, prisma } = build({
      status: 'confirmed',
      demande: {
        id: 'cr-1',
        scope: 'sejour',
        kind: 'annulation',
        status: 'pending',
        bookingId: 'b-1',
        requestedById: 'voyageur',
      },
    });

    await service.repondre('hote', 'cr-1', true);

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        // Annulee AU NOM DU DEMANDEUR, pas de celui qui accepte : c est le
        // voyageur qui annule, l hote ne fait qu y consentir.
        data: expect.objectContaining({ status: 'cancelled', cancelledBy: 'voyageur' }),
      }),
    );
  });

  it('laisse la reservation en place quand l hote refuse', async () => {
    const { service, prisma } = build({
      status: 'confirmed',
      demande: {
        id: 'cr-1',
        scope: 'sejour',
        kind: 'annulation',
        status: 'pending',
        bookingId: 'b-1',
        requestedById: 'voyageur',
      },
    });

    const r = await service.repondre('hote', 'cr-1', false, 'Trop tard');

    expect(r.reservation).toBeNull();
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('refuse de traiter deux fois la meme demande', async () => {
    const { service } = build({
      demande: { id: 'cr-1', scope: 'sejour', status: 'accepted', bookingId: 'b-1' },
    });
    await expect(service.repondre('hote', 'cr-1', true)).rejects.toThrow(/deja traitee/);
  });

  // ------------------------------------------------------------------ //
  // Echeance                                                            //
  // ------------------------------------------------------------------ //

  it('applique une demande dont le delai de reponse a expire', async () => {
    const { service, prisma } = build({
      status: 'confirmed',
      expirees: [
        {
          id: 'cr-1',
          scope: 'sejour',
          kind: 'annulation',
          status: 'pending',
          bookingId: 'b-1',
          requestedById: 'voyageur',
          autoAcceptAt: new Date(Date.now() - 3600 * 1000),
        },
      ],
    });

    const n = await service.appliquerEcheances();

    expect(n).toBe(1);
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }),
    );
    expect(prisma.changeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'expired' }) }),
    );
  });

  it('referme une echeance devenue inapplicable au lieu de la retenter sans fin', async () => {
    // Les dates ont ete reprises entre-temps : la demande ne peut plus
    // s appliquer, mais elle ne doit pas bloquer les autres a chaque balayage.
    const { service, prisma } = build({
      status: 'confirmed',
      chevauchement: { id: 'b-2' },
      expirees: [
        {
          id: 'cr-1',
          scope: 'sejour',
          kind: 'modification_dates',
          status: 'pending',
          bookingId: 'b-1',
          requestedById: 'voyageur',
          newStartDate: new Date('2026-12-01T00:00:00.000Z'),
          newEndDate: new Date('2026-12-04T00:00:00.000Z'),
          newPrice: 598,
          autoAcceptAt: new Date(Date.now() - 3600 * 1000),
        },
      ],
    });

    const n = await service.appliquerEcheances();

    expect(n).toBe(0);
    expect(prisma.changeRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'refused' }) }),
    );
  });

  // ------------------------------------------------------------------ //
  // Conditions servies avant                                            //
  // ------------------------------------------------------------------ //

  it('annonce les conditions et le delai AVANT toute demande', async () => {
    const { service } = build({ status: 'confirmed' });
    const c = await service.conditions('voyageur', 'sejour', 'b-1');

    expect(c.annulation.delaiJours).toBe(7);
    expect(c.annulation.conditions).toBe('Sur l honneur.');
    // Le point que l interface doit dire en toutes lettres : rien n est preleve.
    expect(c.annulation.surLHonneur).toBe(true);
    expect(c.accordRequis).toBe(true);
    expect(c.heuresPourRepondre).toBe(48);
  });

  it('annonce qu aucun accord n est requis sur une reservation en attente', async () => {
    const { service } = build({ status: 'pending' });
    const c = await service.conditions('voyageur', 'sejour', 'b-1');
    expect(c.accordRequis).toBe(false);
  });
});

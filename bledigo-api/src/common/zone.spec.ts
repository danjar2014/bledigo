import { buildOwnerZone, filterByZone, matchesZone, normalize } from './zone';

describe('perimetre geographique du proprietaire', () => {
  // Proprietaire qui possede deux biens a Djerba (region Medenine)
  const djerba = buildOwnerZone([
    { city: 'Djerba', region: 'Medenine' },
    { city: 'Zarzis', region: 'Medenine' },
  ]);

  // Proprietaire a Tunis
  const tunis = buildOwnerZone([{ city: 'Tunis', region: 'Tunis' }]);

  it('normalise accents, casse et ponctuation', () => {
    expect(normalize('Médenine')).toBe('medenine');
    expect(normalize('Sidi Bou Saïd')).toBe('sidi bou said');
    expect(normalize(null)).toBe('');
  });

  it('cache a un proprietaire de Djerba les demandes de Tunis', () => {
    const demandeTunis = { city: 'Tunis', region: 'Tunis', destination: 'Tunis centre' };
    expect(matchesZone(demandeTunis, djerba)).toBe(false);
    expect(matchesZone(demandeTunis, tunis)).toBe(true);
  });

  it('accepte une demande dans la meme region mais une autre ville', () => {
    // Le proprietaire possede a Djerba et Zarzis ; la demande vise Ben Gardane,
    // autre ville de Medenine : pertinent en portee region, pas en portee ville.
    const demande = { city: 'Ben Gardane', region: 'Medenine', destination: 'Ben Gardane' };
    expect(matchesZone(demande, djerba, 'region')).toBe(true);
    expect(matchesZone(demande, djerba, 'city')).toBe(false);
  });

  it('accepte la ville exacte quelle que soit la portee', () => {
    const demande = { city: 'Djerba', region: 'Medenine', destination: 'Djerba Houmt Souk' };
    expect(matchesZone(demande, djerba, 'city')).toBe(true);
    expect(matchesZone(demande, djerba, 'region')).toBe(true);
  });

  it('retrouve la ville citee dans une destination libre', () => {
    const demande = { city: null, region: null, destination: 'Une semaine a Djerba en famille' };
    expect(matchesZone(demande, djerba)).toBe(true);
    expect(matchesZone(demande, tunis)).toBe(false);
  });

  it('tolere les accents dans la demande', () => {
    const zone = buildOwnerZone([{ city: 'Médenine', region: 'Médenine' }]);
    expect(matchesZone({ city: 'Medenine', region: null, destination: null }, zone)).toBe(true);
  });

  it('ne montre rien a un proprietaire sans annonce', () => {
    const vide = buildOwnerZone([]);
    const demandes = [{ city: 'Tunis', region: 'Tunis', destination: 'Tunis' }];
    expect(filterByZone(demandes, vide)).toHaveLength(0);
  });

  it('filtre une liste melangee', () => {
    const demandes = [
      { id: 1, city: 'Tunis', region: 'Tunis', destination: 'Tunis' },
      { id: 2, city: 'Djerba', region: 'Medenine', destination: 'Djerba' },
      { id: 3, city: 'Zarzis', region: 'Medenine', destination: 'Zarzis plage' },
      { id: 4, city: 'Sousse', region: 'Sousse', destination: 'Sousse' },
    ];
    expect(filterByZone(demandes, djerba).map((d) => d.id)).toEqual([2, 3]);
    expect(filterByZone(demandes, tunis).map((d) => d.id)).toEqual([1]);
  });
});

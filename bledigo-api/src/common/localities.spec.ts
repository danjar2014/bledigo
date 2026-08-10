import { LOCALITIES, findLocality, localitiesByRegion, normalizeLocality, resolveLocality } from './localities';

describe('referentiel des localites', () => {
  it('n a ni slug ni nom en double', () => {
    const slugs = LOCALITIES.map((l) => l.slug);
    const names = LOCALITIES.map((l) => normalizeLocality(l.name));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('retrouve par slug, par nom et par alias', () => {
    expect(findLocality('djerba')?.slug).toBe('djerba');
    expect(findLocality('Djerba')?.slug).toBe('djerba');
    expect(findLocality('Jerba')?.slug).toBe('djerba');
    expect(findLocality('Houmt Souk')?.slug).toBe('djerba');
  });

  it('tolere accents et ponctuation', () => {
    expect(findLocality('Médenine')?.slug).toBe('medenine');
    expect(findLocality('sidi-bou-said')?.slug).toBe('sidi-bou-said');
    expect(findLocality('Sidi Bou Saïd')?.slug).toBe('sidi-bou-said');
  });

  it('rend le gouvernorat, pas la ville', () => {
    expect(findLocality('Djerba')?.region).toBe('Medenine');
    expect(findLocality('Hammamet')?.region).toBe('Nabeul');
    expect(findLocality('La Marsa')?.region).toBe('Tunis');
  });

  it('rejette une localite inconnue', () => {
    expect(findLocality('Marseille')).toBeNull();
    expect(findLocality('')).toBeNull();
    expect(findLocality(null)).toBeNull();
  });

  it('repeche une ville citee dans un texte libre', () => {
    expect(resolveLocality('Une semaine a Djerba en famille')?.slug).toBe('djerba');
    expect(resolveLocality('sejour a Sidi Bou Said')?.slug).toBe('sidi-bou-said');
    expect(resolveLocality('vacances en Espagne')).toBeNull();
  });

  it('prefere la correspondance la plus longue', () => {
    // « La Marsa » ne doit pas etre reduit a une sous-chaine plus courte
    expect(resolveLocality('appartement a La Marsa')?.slug).toBe('la-marsa');
  });

  it('groupe par gouvernorat sans perdre de localite', () => {
    const groups = localitiesByRegion();
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(LOCALITIES.length);
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });
});

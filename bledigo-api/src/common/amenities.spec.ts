import { filterByAmenities, hasAllAmenities, normalizeAmenityFilter, parseAmenities } from './amenities';

describe('filtre equipements', () => {
  const villa = { id: 'a', amenities: '["wifi","pool","parking"]' }; // sqlite : chaine
  const studio = { id: 'b', amenities: ['wifi'] }; // postgres : tableau
  const vide = { id: 'c', amenities: null };

  it('lit les deux formats de stockage', () => {
    expect(parseAmenities(villa.amenities)).toEqual(['wifi', 'pool', 'parking']);
    expect(parseAmenities(studio.amenities)).toEqual(['wifi']);
    expect(parseAmenities(vide.amenities)).toEqual([]);
    expect(parseAmenities('pas du json')).toEqual([]);
  });

  it('normalise le parametre de filtre', () => {
    expect(normalizeAmenityFilter('wifi,pool')).toEqual(['wifi', 'pool']);
    expect(normalizeAmenityFilter(['wifi', ' pool '])).toEqual(['wifi', 'pool']);
    expect(normalizeAmenityFilter('')).toEqual([]);
    expect(normalizeAmenityFilter(undefined)).toEqual([]);
  });

  it('exige TOUS les equipements demandes, pas au moins un', () => {
    expect(hasAllAmenities(villa, ['wifi', 'pool'])).toBe(true);
    expect(hasAllAmenities(studio, ['wifi', 'pool'])).toBe(false);
  });

  it('ne filtre rien quand aucun equipement n est demande', () => {
    expect(filterByAmenities([villa, studio, vide], '')).toHaveLength(3);
  });

  it('filtre la liste', () => {
    expect(filterByAmenities([villa, studio, vide], 'wifi').map((l) => l.id)).toEqual(['a', 'b']);
    expect(filterByAmenities([villa, studio, vide], 'wifi,pool').map((l) => l.id)).toEqual(['a']);
    expect(filterByAmenities([villa, studio, vide], 'jacuzzi')).toHaveLength(0);
  });
});

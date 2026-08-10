import { GeoService } from './geo.service';

describe('GeoService.pointInPolygon', () => {
  // Carre simple autour de Tunis
  const square = [
    { lat: 36.7, lng: 10.0 },
    { lat: 36.9, lng: 10.0 },
    { lat: 36.9, lng: 10.3 },
    { lat: 36.7, lng: 10.3 },
  ];

  it('accepte un point au centre', () => {
    expect(GeoService.pointInPolygon({ lat: 36.8, lng: 10.15 }, square)).toBe(true);
  });

  it('rejette un point a l exterieur', () => {
    expect(GeoService.pointInPolygon({ lat: 36.8, lng: 10.5 }, square)).toBe(false);
    expect(GeoService.pointInPolygon({ lat: 35.0, lng: 10.15 }, square)).toBe(false);
  });

  it('rejette un point juste au-dela d un bord', () => {
    expect(GeoService.pointInPolygon({ lat: 36.9001, lng: 10.15 }, square)).toBe(false);
  });

  it('gere un polygone concave', () => {
    // Forme en L : le coin manquant doit etre exclu
    const lShape = [
      { lat: 0, lng: 0 },
      { lat: 2, lng: 0 },
      { lat: 2, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 2 },
      { lat: 0, lng: 2 },
    ];
    expect(GeoService.pointInPolygon({ lat: 0.5, lng: 0.5 }, lShape)).toBe(true);
    expect(GeoService.pointInPolygon({ lat: 1.5, lng: 1.5 }, lShape)).toBe(false);
  });

  it('ferme implicitement le polygone', () => {
    const triangle = [
      { lat: 0, lng: 0 },
      { lat: 4, lng: 0 },
      { lat: 0, lng: 4 },
    ];
    expect(GeoService.pointInPolygon({ lat: 1, lng: 1 }, triangle)).toBe(true);
    expect(GeoService.pointInPolygon({ lat: 3, lng: 3 }, triangle)).toBe(false);
  });
});

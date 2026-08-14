import { profilAttendu, profilAdapte } from './search.service';

/**
 * Le profil de location ordonne et signale, il n exclut jamais.
 *
 * La regle qui compte n est pas le seuil choisi mais le fait qu aucune annonce
 * ne disparaisse : un hote qui vise le long sejour n a pas refuse les courts.
 */
describe('Profil de location', () => {
  it('rattache la duree demandee au bon profil', () => {
    expect(profilAttendu(1)).toBe('court');
    expect(profilAttendu(7)).toBe('court');
    expect(profilAttendu(8)).toBe('moyen');
    expect(profilAttendu(30)).toBe('moyen');
    expect(profilAttendu(31)).toBe('long');
  });

  it('considere une annonce sans profil comme du court sejour', () => {
    expect(profilAdapte(null, 3)).toBe(true);
    expect(profilAdapte(undefined, 3)).toBe(true);
    expect(profilAdapte(null, 60)).toBe(false);
  });

  it('signale la correspondance sans jamais valoir exclusion', () => {
    // Une annonce longue duree sur une recherche de trois nuits : pas adaptee,
    // mais toujours presente. C est un booleen d affichage, pas un filtre.
    expect(profilAdapte('long', 3)).toBe(false);
    expect(profilAdapte('long', 60)).toBe(true);
    expect(profilAdapte('moyen', 14)).toBe(true);
  });
});

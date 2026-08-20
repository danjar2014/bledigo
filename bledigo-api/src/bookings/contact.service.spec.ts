import { BookingsService } from './bookings.service';

/**
 * Moyens de joindre l autre partie.
 *
 * En paiement direct, c est la seule chose qui permet a une reservation
 * d aboutir : si le numero manque ou si le mauvais canal est propose, les deux
 * parties se retrouvent avec un accord et aucun moyen de se parler.
 */
describe('BookingsService - moyens de contact', () => {
  const service = new BookingsService(
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  /** La methode est privee : on la sollicite comme le fait avecContact(). */
  const moyens = (personne: any) => (service as any).moyensDeContact(personne);

  const TEL = '+21620111222';
  const WA = '+21699888777';

  it('rend le seul telephone quand c est le choix', () => {
    expect(moyens({ contactChannel: 'phone', phone: TEL, whatsappNumber: WA })).toEqual([
      { canal: 'phone', numero: TEL },
    ]);
  });

  it('rend le seul WhatsApp quand c est le choix', () => {
    expect(moyens({ contactChannel: 'whatsapp', phone: TEL, whatsappNumber: WA })).toEqual([
      { canal: 'whatsapp', numero: WA },
    ]);
  });

  /**
   * Beaucoup repondent au telephone comme sur WhatsApp. Forcer un choix unique
   * fait perdre la moitie des tentatives de contact.
   */
  it('rend les deux quand l hote accepte les deux', () => {
    expect(moyens({ contactChannel: 'both', phone: TEL, whatsappNumber: WA })).toEqual([
      { canal: 'whatsapp', numero: WA },
      { canal: 'phone', numero: TEL },
    ]);
  });

  /** Beaucoup utilisent WhatsApp sur leur numero habituel sans en declarer un
   *  second : sans ce repli, choisir WhatsApp reviendrait a n etre joignable
   *  nulle part. */
  it('retombe sur le numero principal quand aucun WhatsApp n est declare', () => {
    expect(moyens({ contactChannel: 'whatsapp', phone: TEL, whatsappNumber: null })).toEqual([
      { canal: 'whatsapp', numero: TEL },
    ]);
  });

  it('rend le meme numero deux fois si les deux canaux le partagent', () => {
    // Ce n est pas un doublon inutile : les deux boutons n ouvrent pas la meme
    // application, et le voyageur choisit celui qui lui convient.
    expect(moyens({ contactChannel: 'both', phone: TEL, whatsappNumber: null })).toEqual([
      { canal: 'whatsapp', numero: TEL },
      { canal: 'phone', numero: TEL },
    ]);
  });

  /** Un bouton qui n appelle personne est pire qu un bouton absent. */
  it('ne rend aucun moyen quand aucun numero n existe', () => {
    expect(moyens({ contactChannel: 'both', phone: null, whatsappNumber: null })).toEqual([]);
  });

  it('retombe sur le telephone quand le canal n est pas renseigne', () => {
    expect(moyens({ phone: TEL })).toEqual([{ canal: 'phone', numero: TEL }]);
  });

  it('place le canal PREFERE en premier', () => {
    const [premier] = moyens({ contactChannel: 'both', phone: TEL, whatsappNumber: WA });
    expect(premier.canal).toBe('whatsapp');
  });
});

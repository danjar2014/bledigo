import { ChatService } from './chat.service';

describe('ChatService - filtre anti-desintermediation', () => {
  const service = new ChatService({} as any);
  const scan = (c: string) => (service as any).scan(c);

  it('laisse passer un message normal', () => {
    expect(scan('Bonjour, le logement est-il disponible en aout ?')).toBeNull();
  });

  it('detecte un numero de telephone', () => {
    expect(scan('appelle moi au +216 20 123 456')).toBe('numero de telephone');
  });

  it('detecte un email', () => {
    expect(scan('ecris a sami.benali@gmail.com')).toBe('adresse email');
  });

  it('detecte une messagerie externe', () => {
    expect(scan('on continue sur WhatsApp ?')).toBe('messagerie externe');
  });

  it('detecte un paiement hors plateforme', () => {
    expect(scan('tu peux payer en especes a l arrivee')).toBe('paiement hors plateforme');
  });
});

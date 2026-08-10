import { AntiFraudService, ContactAttemptType } from './anti-fraud.service';

/** Seuil de blocage utilise par analyzeMessage. */
const FLAG_THRESHOLD = 0.6;

describe('AntiFraudService - detection anti-desintermediation', () => {
  const service = new AntiFraudService({} as any);
  const inspect = (c: string) => service.inspect(c);
  const types = (c: string) => inspect(c).detections.map((d) => d.type);
  const isBlocked = (c: string) => inspect(c).confidence > FLAG_THRESHOLD;

  it('laisse passer un message normal', () => {
    const res = inspect('Bonjour, le logement est-il disponible en aout ?');
    expect(res.detections).toHaveLength(0);
    expect(res.confidence).toBe(0);
  });

  it('laisse passer une question sur le nombre de chambres', () => {
    expect(isBlocked('Combien y a-t-il de chambres et de salles de bain ?')).toBe(false);
  });

  it('detecte un numero au format tunisien', () => {
    expect(types('appelle moi au +216 20 123 456')).toContain(ContactAttemptType.phone);
    expect(isBlocked('appelle moi au +216 20 123 456')).toBe(true);
  });

  it('detecte un numero au format francais', () => {
    expect(types('mon num 06 12 34 56 78')).toContain(ContactAttemptType.phone);
  });

  it('detecte un email', () => {
    expect(types('ecris a sami.benali@gmail.com')).toContain(ContactAttemptType.email);
    expect(isBlocked('ecris a sami.benali@gmail.com')).toBe(true);
  });

  it('detecte une messagerie externe', () => {
    expect(types('on continue sur WhatsApp ?')).toContain(ContactAttemptType.platform_keyword);
    expect(isBlocked('on continue sur WhatsApp ?')).toBe(true);
  });

  it('detecte un paiement hors plateforme', () => {
    expect(types('tu peux payer en especes a l arrivee')).toContain(
      ContactAttemptType.platform_keyword,
    );
    expect(isBlocked('tu peux payer en especes a l arrivee')).toBe(true);
  });

  it('ne bloque pas sur un signal faible isole', () => {
    expect(isBlocked('je vous reponds directement des que possible')).toBe(false);
  });

  it('bloque quand plusieurs signaux se cumulent', () => {
    const res = inspect('contactez-moi directement au 20 123 456, on evite les frais');
    expect(res.detections.length).toBeGreaterThan(1);
    expect(res.confidence).toBeGreaterThan(FLAG_THRESHOLD);
  });

  it('classe le signal le plus fort en premier', () => {
    const res = inspect('directement par mail : test@example.com');
    expect(res.detections[0].type).toBe(ContactAttemptType.email);
  });
});

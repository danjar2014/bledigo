import { AuthService } from './auth.service';
import * as bcrypt from 'bcryptjs';

/**
 * Connexion Google : ce qui se passe quand l adresse existe deja en base.
 *
 * Le jeton Google ne peut pas etre fabrique, on simule donc la reponse de
 * `tokeninfo`. Ce qui est verifie ici n est pas la cryptographie de Google mais
 * notre decision de rattachement, qui est la partie dont nous sommes
 * responsables — et celle qui ouvrait une reprise de compte.
 */
describe('AuthService - rattachement d un compte a Google', () => {
  const CLIENT_ID = 'client-bledigo.apps.googleusercontent.com';

  function build(compteExistant: any) {
    const update = jest.fn().mockImplementation(({ data }) => ({ ...compteExistant, ...data }));
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(compteExistant),
        update,
        create: jest.fn().mockResolvedValue({ id: 'u-neuf', email: 'neuf@gmail.com', role: 'traveler' }),
      },
      travelerPassport: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('jeton') };
    return { service: new AuthService(prisma as any, jwt as any), prisma, update };
  }

  function reponseGoogle(charge: Record<string, unknown>) {
    return jest.fn().mockResolvedValue({ ok: true, json: async () => charge });
  }

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    global.fetch = reponseGoogle({
      aud: CLIENT_ID,
      email: 'victime@gmail.com',
      email_verified: 'true',
      given_name: 'Victime',
    }) as any;
  });

  it('ferme le mot de passe d un compte jamais verifie', async () => {
    // Le scenario ferme : quelqu un inscrit l adresse d un tiers par mot de
    // passe, le tiers arrive ensuite par Google. Sans cette regle il entrait
    // dans un compte dont l inscrivant gardait la cle.
    const empreinteAttaquant = await bcrypt.hash('MotDePasseAttaquant1', 4);
    const { service, update, prisma } = build({
      id: 'u-1',
      email: 'victime@gmail.com',
      role: 'traveler',
      status: 'active',
      emailVerified: false,
      passwordHash: empreinteAttaquant,
    });

    await service.googleLogin('jeton-google', '127.0.0.1', 'jest');

    const data = update.mock.calls[0][0].data;
    expect(data.emailVerified).toBe(true);
    expect(data.passwordHash).toBeDefined();
    expect(data.passwordHash).not.toBe(empreinteAttaquant);
    expect(await bcrypt.compare('MotDePasseAttaquant1', data.passwordHash)).toBe(false);
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('laisse intact le mot de passe d un compte deja verifie', async () => {
    // Les comptes de demonstration sont semes avec emailVerified a true : une
    // connexion Google ne doit pas leur retirer l acces par mot de passe.
    const { service, update } = build({
      id: 'u-2',
      email: 'victime@gmail.com',
      role: 'traveler',
      status: 'active',
      emailVerified: true,
      passwordHash: 'empreinte-demo',
    });

    await service.googleLogin('jeton-google');

    expect(update).not.toHaveBeenCalled();
  });

  it('refuse un jeton emis pour une autre application', async () => {
    global.fetch = reponseGoogle({
      aud: 'une-autre-application.apps.googleusercontent.com',
      email: 'victime@gmail.com',
      email_verified: 'true',
    }) as any;
    const { service } = build(null);

    await expect(service.googleLogin('jeton-google')).rejects.toThrow(/ne concerne pas BlediGo/);
  });

  it('refuse une adresse que Google ne garantit pas', async () => {
    global.fetch = reponseGoogle({
      aud: CLIENT_ID,
      email: 'victime@gmail.com',
      email_verified: 'false',
    }) as any;
    const { service } = build(null);

    await expect(service.googleLogin('jeton-google')).rejects.toThrow(/non verifiee/);
  });
});

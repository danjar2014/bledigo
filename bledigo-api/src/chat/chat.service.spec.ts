import { ChatService } from './chat.service';

/**
 * La detection anti-desintermediation a ete deplacee dans AntiFraudService
 * (voir anti-fraud.service.spec.ts pour la couverture des motifs).
 * Ce test verifie que ChatService delegue bien l analyse a ce service.
 */
describe('ChatService - delegation anti-fraude', () => {
  const conversation = {
    id: 'conv-1',
    participantIds: JSON.stringify(['u1', 'u2']),
    isBlocked: false,
  };

  function build(analysis: { flagged: boolean; confidence: number }) {
    const analyzeMessage = jest.fn().mockResolvedValue(analysis);
    const prisma = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue(conversation),
        update: jest.fn().mockResolvedValue(conversation),
      },
      message: {
        create: jest.fn().mockResolvedValue({ id: 'msg-1', content: 'hello' }),
      },
    };
    const service = new ChatService(prisma as any, { analyzeMessage } as any);
    return { service, prisma, analyzeMessage };
  }

  it('transmet le message a l analyse anti-fraude', async () => {
    const { service, analyzeMessage } = build({ flagged: false, confidence: 0 });

    await service.send('u1', 'conv-1', { content: 'Bonjour, le logement est-il libre ?' });

    expect(analyzeMessage).toHaveBeenCalledWith(
      'msg-1',
      'Bonjour, le logement est-il libre ?',
      'u1',
    );
  });

  it('ne signale pas un message normal', async () => {
    const { service } = build({ flagged: false, confidence: 0 });

    const res = await service.send('u1', 'conv-1', { content: 'Bonjour' });

    expect(res.flagged).toBe(false);
    expect(res.flagReason).toBeNull();
  });

  it('signale un message detecte comme tentative de contact', async () => {
    const { service } = build({ flagged: true, confidence: 0.95 });

    const res = await service.send('u1', 'conv-1', { content: 'appelle moi au +216 20 123 456' });

    expect(res.flagged).toBe(true);
    expect(res.flagReason).toContain('95%');
  });

  it('refuse un participant exterieur a la conversation', async () => {
    const { service } = build({ flagged: false, confidence: 0 });

    await expect(service.send('u9', 'conv-1', { content: 'Bonjour' })).rejects.toThrow();
  });
});

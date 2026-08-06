import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType } from '../common/enums';
import { toDbJson, fromDbJson } from '../common/json';

/** Filtre anti-desintermediation : coordonnees hors plateforme */
const PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\b(?:\+?\d[\d .-]{7,}\d)\b/, reason: 'numero de telephone' },
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/, reason: 'adresse email' },
  { re: /\b(whatsapp|telegram|viber|messenger)\b/i, reason: 'messagerie externe' },
  { re: /\b(iban|rib|virement|especes|cash)\b/i, reason: 'paiement hors plateforme' },
];

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private scan(content: string) {
    for (const p of PATTERNS) if (p.re.test(content)) return p.reason;
    return null;
  }

  private participants(conv: { participantIds: any }): string[] {
    return fromDbJson<string[]>(conv.participantIds, []);
  }

  async createConversation(userId: string, dto: { withUserId: string; listingId?: string; bookingId?: string }) {
    return this.prisma.conversation.create({
      data: {
        participantIds: toDbJson([userId, dto.withUserId]),
        listingId: dto.listingId,
        bookingId: dto.bookingId,
        users: { connect: [{ id: userId }, { id: dto.withUserId }] },
      },
    });
  }

  async myConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { users: { some: { id: userId } } },
      include: { messages: { take: 1, orderBy: { createdAt: 'desc' } }, listing: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async messages(userId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation non trouvee');
    if (!this.participants(conv).includes(userId)) throw new ForbiddenException('Acces refuse');

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async send(userId: string, conversationId: string, dto: { content: string; type?: MessageType }) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation non trouvee');
    if (!this.participants(conv).includes(userId)) throw new ForbiddenException('Acces refuse');
    if (conv.isBlocked) throw new ForbiddenException('Conversation bloquee');

    const flagReason = this.scan(dto.content);
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: dto.type || MessageType.text,
        content: dto.content,
        isFlagged: !!flagReason,
        flagReason: flagReason || undefined,
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return { message, flagged: !!flagReason, flagReason };
  }
}

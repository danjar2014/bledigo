import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType } from '../common/enums';
import { toDbJson, fromDbJson } from '../common/json';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antiFraud: AntiFraudService,
  ) {}

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

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: dto.type || MessageType.text,
        content: dto.content,
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Analyse anti-desintermediation : flag, journalisation et sanction graduee
    const analysis = await this.antiFraud.analyzeMessage(message.id, dto.content, userId);

    return {
      message,
      flagged: analysis.flagged,
      flagReason: analysis.flagged
        ? `Tentative de contact hors plateforme detectee (${(analysis.confidence * 100).toFixed(0)}% de confiance)`
        : null,
      confidence: analysis.confidence,
    };
  }
}

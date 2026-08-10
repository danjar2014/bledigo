import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus, SanctionType } from '../common/enums';
import { toDbJson } from '../common/json';

/** Types de tentative de contact hors plateforme. */
export enum ContactAttemptType {
  phone = 'phone',
  email = 'email',
  platform_keyword = 'platform_keyword',
  nlp_intent = 'nlp_intent',
  other = 'other',
}

export interface FraudDetection {
  type: ContactAttemptType;
  matches?: string[];
  confidence: number;
}

export interface FraudAnalysis {
  flagged: boolean;
  confidence: number;
  detections?: FraudDetection[];
  action?: 'blocked';
}

/** Seuil au-dela duquel le message est bloque et la tentative enregistree. */
const FLAG_THRESHOLD = 0.6;

@Injectable()
export class AntiFraudService {
  private readonly logger = new Logger(AntiFraudService.name);

  /**
   * Le premier motif est volontairement permissif : il couvre les formats
   * tunisiens et internationaux (+216 20 123 456) que les motifs FR ne captent pas.
   */
  private readonly phonePatterns = [
    /\+?\d[\d\s.-]{7,}\d/,
    /\b\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/, // FR / TN
    /\b0\d[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/,
  ];

  private readonly emailPatterns = [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/];

  /** Signaux forts : une seule occurrence suffit a bloquer. */
  private readonly platformPatterns = [
    /\b(whatsapp|telegram|signal|viber|messenger|instagram|snapchat)\b/i,
    /\b(contactez[- ]?moi|appelez[- ]?moi|ecrivez[- ]?moi|mon (telephone|numero|mail|email))\b/i,
    /\b(pas[ ]?sur[ ]?la[ ]?plateforme|hors[ ]?plateforme)\b/i,
    /\b(iban|rib|paiement[ ]?direct|especes|cash|virement)\b/i,
  ];

  /** Signaux faibles : necessitent une corroboration pour bloquer. */
  private readonly softPatterns = [
    /\b(directement|en[ ]?prive)\b/i,
    /\b(pas[ ]?besoin[ ]?de|evite[rz]?[ ]?les[ ]?frais|moins[ ]?cher)\b/i,
    /\b(mon[ ]?compte|mon[ ]?profil|mon[ ]?site)\b/i,
  ];

  private readonly suspiciousWords = [
    'whatsapp', 'telegram', 'numero', 'telephone', 'appelle', 'contacte',
    'direct', 'hors', 'plateforme', 'especes', 'virement', 'rib', 'iban',
    'email', 'gmail', 'yahoo', 'hotmail', 'facebook', 'instagram',
    'pas besoin de reserver', 'evite les frais', 'moins cher direct',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyse sans effet de bord : utilisable avant persistance du message.
   *
   * La confiance retenue est celle du signal le plus fort, majoree de 0.05 par
   * signal supplementaire. Un seul signal fort (telephone, email, messagerie
   * externe) suffit donc a depasser le seuil de blocage, ce qui preserve la
   * couverture du filtre historique.
   */
  inspect(content: string): { confidence: number; detections: FraudDetection[] } {
    const detections: FraudDetection[] = [];

    const scan = (patterns: RegExp[], type: ContactAttemptType, weight: number) => {
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          detections.push({ type, matches: [...matches], confidence: weight });
          return;
        }
      }
    };

    scan(this.phonePatterns, ContactAttemptType.phone, 0.95);
    scan(this.emailPatterns, ContactAttemptType.email, 0.98);
    scan(this.platformPatterns, ContactAttemptType.platform_keyword, 0.85);
    scan(this.softPatterns, ContactAttemptType.other, 0.4);

    const nlpScore = this.analyzeIntent(content);
    if (nlpScore > 0.7) {
      detections.push({ type: ContactAttemptType.nlp_intent, confidence: nlpScore });
    }

    if (detections.length === 0) return { confidence: 0, detections };

    const strongest = Math.max(...detections.map((d) => d.confidence));
    const confidence = Math.min(strongest + (detections.length - 1) * 0.05, 1);

    // Les signaux les plus forts en premier : detections[0] sert de type enregistre
    detections.sort((a, b) => b.confidence - a.confidence);

    return { confidence, detections };
  }

  /**
   * Refuse un texte qui contient des coordonnees, avant meme sa persistance.
   *
   * A utiliser sur toute saisie libre exposee a un autre utilisateur : annonce,
   * demande de location, message d offre. Contrairement a `analyzeMessage`, qui
   * enregistre puis signale, ici on bloque : le contenu ne doit jamais atteindre
   * le destinataire.
   *
   * La tentative est tracee dans ContactAttempt pour alimenter le compteur de
   * recidive du proprietaire.
   */
  async assertClean(userId: string, text: string | null | undefined, context: string) {
    if (!text) return;

    const { confidence, detections } = this.inspect(text);
    if (confidence <= FLAG_THRESHOLD) return;

    await this.prisma.contactAttempt
      .create({
        data: {
          userId,
          type: detections[0]?.type ?? ContactAttemptType.other,
          content: text.substring(0, 500),
          context,
          detectedBy: 'ai',
          confidence,
          isBlocked: true,
        },
      })
      .catch(() => undefined); // la tracabilite ne doit pas empecher le blocage

    this.logger.warn(`Saisie refusee (${context}) pour ${userId} : ${confidence.toFixed(2)}`);

    throw new BadRequestException(
      'Votre texte semble contenir des coordonnees personnelles (telephone, email ou messagerie externe). ' +
        'Les echanges doivent rester sur BlediGo : c est ce qui garantit le paiement bloque et notre ' +
        'intervention en cas de litige.',
    );
  }

  /**
   * Analyse un message deja persiste : flag, journalisation et sanction graduee.
   */
  async analyzeMessage(
    messageId: string,
    content: string,
    senderId: string,
  ): Promise<FraudAnalysis> {
    const { confidence, detections } = this.inspect(content);

    if (confidence <= FLAG_THRESHOLD) {
      return { flagged: false, confidence };
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isFlagged: true,
        flagReason: `Tentative de contact hors plateforme detectee (${(confidence * 100).toFixed(0)}% de confiance)`,
        aiAnalysis: toDbJson({ detections, confidence }),
      },
    });

    await this.prisma.contactAttempt.create({
      data: {
        userId: senderId,
        type: detections[0]?.type ?? ContactAttemptType.other,
        content: content.substring(0, 500),
        context: 'chat_message',
        detectedBy: 'ai',
        confidence,
        messageId,
        isBlocked: true,
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (user?.role === UserRole.owner || user?.role === UserRole.agency) {
      await this.prisma.ownerPassport.updateMany({
        where: { userId: senderId },
        data: { offPlatformAttempts: { increment: 1 } },
      });

      const passport = await this.prisma.ownerPassport.findUnique({ where: { userId: senderId } });
      const attempts = passport?.offPlatformAttempts ?? 0;

      if (attempts >= 3) {
        await this.applySanction(
          senderId,
          SanctionType.ban,
          'Bannissement definitif pour tentatives repetees de contact hors plateforme',
        );
      } else if (attempts === 2) {
        await this.applySanction(
          senderId,
          SanctionType.suspend,
          'Suspension 30 jours - contact hors plateforme',
          30,
        );
      } else if (attempts === 1) {
        await this.applySanction(
          senderId,
          SanctionType.watch,
          'Surveillance - premiere tentative de contact hors plateforme detectee',
        );
      }
    }

    this.logger.warn(`Message ${messageId} bloque (confiance ${confidence.toFixed(2)})`);
    return { flagged: true, confidence, detections, action: 'blocked' };
  }

  private analyzeIntent(content: string): number {
    const lower = content.toLowerCase();
    let score = 0;
    for (const word of this.suspiciousWords) {
      if (lower.includes(word)) score += 0.15;
    }
    return Math.min(score, 1);
  }

  private async applySanction(
    userId: string,
    type: SanctionType,
    reason: string,
    durationDays?: number,
  ) {
    const expiresAt = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    await this.prisma.sanction.create({
      data: {
        userId,
        type,
        reason,
        durationDays,
        expiresAt,
        appliedBy: userId, // auto-sanction systeme : tracee via evidence.source
        evidence: toDbJson({ autoDetected: true, source: 'anti_fraud_system' }),
      },
    });

    const statusMap: Record<SanctionType, UserStatus> = {
      [SanctionType.watch]: UserStatus.watched,
      [SanctionType.limit]: UserStatus.limited,
      [SanctionType.suspend]: UserStatus.suspended,
      [SanctionType.ban]: UserStatus.banned,
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: statusMap[type] ?? UserStatus.watched },
    });
  }
}

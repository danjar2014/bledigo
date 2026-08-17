import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Envoi de fichiers.
 *
 * Historiquement ce service levait « Upload S3 non configure » hors mode
 * simule : la coquille existait, le raccordement non. Consequence visible
 * partout, et longtemps passee pour un detail — le formulaire de creation
 * d annonce empilait des URL picsum, et les logements de production affichent
 * encore l interieur de quelqu un d autre.
 *
 * Le stockage vit desormais chez Supabase, sur le MEME projet que la base : il
 * n y a ni compte a creer, ni service tiers a payer. C est ce qui a rendu ce
 * raccordement possible sans decision d infrastructure.
 *
 * Le principe reste celui d un envoi direct : le navigateur televerse vers
 * Supabase, jamais vers l API. Faire transiter des photos par une instance
 * gratuite a 512 Mo de memoire serait la meilleure facon de la faire tomber.
 * L API se contente de signer.
 */

/** Types acceptes. Le refus est explicite plutot que silencieux. */
const TYPES_AUTORISES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  private readonly url = process.env.SUPABASE_URL?.replace(/\/+$/, '') ?? '';
  private readonly cle = process.env.SUPABASE_SERVICE_KEY ?? '';
  private readonly bucket = process.env.SUPABASE_BUCKET || 'medias';

  /**
   * Sans configuration, on ne casse rien : le developpement local doit
   * fonctionner sans qu on ait a creer quoi que ce soit. C est le meme parti
   * pris que Stripe ou SendGrid, absents en local et simules.
   */
  private get simule() {
    return !this.url || !this.cle;
  }

  constructor() {
    if (this.simule) {
      this.logger.warn(
        'SUPABASE_URL ou SUPABASE_SERVICE_KEY absent : envoi de fichiers en mode simule',
      );
    }
  }

  async presign(fileName: string, contentType: string, dossier = 'divers') {
    if (!fileName) throw new BadRequestException('fileName requis');
    if (contentType && !TYPES_AUTORISES.includes(contentType)) {
      throw new BadRequestException(`Type non autorise. Autorises : ${TYPES_AUTORISES.join(', ')}`);
    }

    // Le nom d origine est conserve en suffixe, apres nettoyage : il aide a
    // reconnaitre un fichier dans le bucket. L UUID devant garantit l unicite,
    // sans quoi deux « photo.jpg » se remplaceraient.
    const cheminSur = `${dossier}/${randomUUID()}-${fileName.replace(/[^\w.-]/g, '_')}`;

    if (this.simule) {
      const port = process.env.PORT || 4000;
      return {
        simulated: true,
        key: cheminSur,
        uploadUrl: `http://localhost:${port}/api/v1/media/local-upload/${encodeURIComponent(cheminSur)}`,
        publicUrl: `https://picsum.photos/seed/${encodeURIComponent(cheminSur)}/1200/800`,
        note: 'Mode developpement : aucun stockage configure, l URL renvoyee est une image de substitution',
      };
    }

    // URL d envoi signee : elle autorise UN televersement, sur CE chemin, pour
    // une duree courte. La cle de service ne quitte jamais le serveur.
    const reponse = await fetch(
      `${this.url}/storage/v1/object/upload/sign/${this.bucket}/${cheminSur}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.cle}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 600 }),
      },
    );

    if (!reponse.ok) {
      const detail = await reponse.text();
      this.logger.error(`Signature refusee par Supabase (${reponse.status}) : ${detail}`);
      // Le message reste generique cote client : le detail nomme le bucket et
      // le projet, qui ne regardent pas le navigateur.
      throw new BadRequestException("Envoi impossible pour l instant");
    }

    const { url: cheminSigne } = (await reponse.json()) as { url: string };

    return {
      simulated: false,
      key: cheminSur,
      /** A appeler en PUT avec le fichier en corps. */
      uploadUrl: `${this.url}/storage/v1${cheminSigne}`,
      publicUrl: `${this.url}/storage/v1/object/public/${this.bucket}/${cheminSur}`,
      contentType,
    };
  }
}

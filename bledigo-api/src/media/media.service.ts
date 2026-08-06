import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * En prod : upload direct S3 via URL presignee (AWS_S3_BUCKET).
 * En local : renvoie une URL locale factice, aucun appel reseau.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly simulated = !process.env.AWS_ACCESS_KEY_ID;

  async presign(fileName: string, contentType: string) {
    if (!fileName) throw new BadRequestException('fileName requis');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (contentType && !allowed.includes(contentType)) {
      throw new BadRequestException(`Type non autorise. Autorises : ${allowed.join(', ')}`);
    }

    const key = `uploads/${randomUUID()}-${fileName.replace(/[^\w.-]/g, '_')}`;

    if (this.simulated) {
      return {
        simulated: true,
        key,
        uploadUrl: `http://localhost:${process.env.PORT || 4000}/api/v1/media/local-upload/${encodeURIComponent(key)}`,
        publicUrl: `http://localhost:${process.env.PORT || 4000}/media/${key}`,
        note: 'Mode dev : aucun bucket S3 configure',
      };
    }

    // TODO prod : @aws-sdk/client-s3 + getSignedUrl
    throw new BadRequestException('Upload S3 non configure dans cette build');
  }
}

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/media')
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Post('presign')
  @ApiOperation({
    summary:
      'URL d envoi signee. Le navigateur televerse directement vers le stockage : faire transiter des photos par l API ferait tomber une instance gratuite.',
  })
  presign(@Body() dto: { fileName: string; contentType: string; dossier?: string }) {
    return this.service.presign(dto.fileName, dto.contentType, dto.dossier);
  }
}

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/media')
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Post('presign')
  presign(@Body() dto: { fileName: string; contentType: string }) {
    return this.service.presign(dto.fileName, dto.contentType);
  }
}

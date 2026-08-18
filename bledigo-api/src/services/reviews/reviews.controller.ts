import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ServiceReviewsService } from './reviews.service';
import { NoterPrestationDto } from '../dto';

/** Notation mutuelle : le client note le prestataire, le prestataire son client. */
@ApiTags('avis-prestations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/services')
export class ServiceReviewsController {
  constructor(private readonly avis: ServiceReviewsService) {}

  @Post('prestations/:id/avis')
  @ApiOperation({
    summary:
      'Noter une prestation terminee. Le sens de l avis se deduit de qui appelle : le client note le prestataire, le prestataire note son client.',
  })
  noter(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: NoterPrestationDto) {
    return this.avis.noter(me, id, dto.rating, dto.comment);
  }

  @Get('prestataires/:id/avis')
  @ApiOperation({ summary: 'Avis publics d un prestataire : uniquement ceux de ses clients' })
  avisPrestataire(@Param('id') id: string) {
    return this.avis.avisDuPrestataire(id);
  }
}

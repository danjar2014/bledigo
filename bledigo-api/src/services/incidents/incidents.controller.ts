import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { IncidentsService } from './incidents.service';
import { DeclarerSinistreDto, ContesterSinistreDto } from '../dto';

/** Declaration, cote agence. */
@ApiTags('prestataire-sinistres')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.provider)
@Controller('api/v1/prestataire')
export class ProviderIncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Post('demandes/:id/sinistre')
  @ApiOperation({
    summary:
      'Declarer un sinistre au retour du vehicule. Possible une fois restitue et dans les 7 jours. Consigne et contestable, ne sanctionne rien par lui-meme.',
  })
  declarer(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: DeclarerSinistreDto) {
    return this.incidents.declarer(me, id, dto);
  }

  @Delete('sinistres/:id')
  @ApiOperation({ summary: 'Retirer sa declaration : se retracter ne nuit a personne' })
  retirer(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.incidents.retirer(me, id);
  }
}

/** Consultation et contestation, cote client. */
@ApiTags('sinistres')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/services')
export class ClientIncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Get('mes-commandes/:id/sinistres')
  @ApiOperation({ summary: 'Sinistres attaches a une location, visibles des deux parties' })
  parLocation(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.incidents.parLocation(me, id);
  }

  @Post('sinistres/:id/contester')
  @ApiOperation({
    summary:
      'Contester un sinistre. La contestation ne l efface pas, elle l oppose : les deux versions restent lisibles et l administration tranche.',
  })
  contester(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: ContesterSinistreDto) {
    return this.incidents.contester(me, id, dto.motif);
  }
}

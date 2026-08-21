import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChangeRequestsService, Scope } from './change-requests.service';
import { CreateChangeRequestDto, RespondChangeRequestDto } from './dto';
import { motifsPour } from '../common/cancellation-reasons';

/**
 * Un seul controleur pour les deux metiers.
 *
 * Le `scope` porte la difference, et c est deliberement le seul endroit ou elle
 * apparaisse : deux controleurs auraient duplique les six routes et fini par
 * diverger sur un detail de validation.
 *
 * Pas de `RolesGuard` : ces routes servent le voyageur, l hote ET le
 * prestataire, chacun sur ses propres reservations. Le controle d acces se fait
 * sur la RESERVATION — le service ne resout que celles dont l appelant est
 * partie prenante — et non sur la casquette du compte, qui ne dirait rien de
 * son droit sur cette reservation-la.
 */
@ApiTags('demandes-de-changement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/demandes-changement')
export class ChangeRequestsController {
  constructor(private readonly service: ChangeRequestsService) {}

  @Get('motifs')
  @ApiOperation({ summary: 'Motifs proposables, liste fermee plus « autre »' })
  motifs(@Query('scope') scope: Scope) {
    return motifsPour(scope === 'location' ? 'location' : 'sejour');
  }

  @Get('conditions/:scope/:id')
  @ApiOperation({
    summary:
      'Conditions opposables AVANT de demander : delai libre, texte de l hote, accord requis ou non',
  })
  conditions(@CurrentUser('id') me: string, @Param('scope') scope: Scope, @Param('id') id: string) {
    return this.service.conditions(me, scope, id);
  }

  @Get('devis/:scope/:id')
  @ApiOperation({ summary: 'Ce que couteraient de nouvelles dates, et si elles sont possibles' })
  devis(
    @CurrentUser('id') me: string,
    @Param('scope') scope: Scope,
    @Param('id') id: string,
    @Query('debut') debut: string,
    @Query('fin') fin: string,
  ) {
    return this.service.chiffrerDates(me, scope, id, new Date(debut), new Date(fin));
  }

  @Get()
  @ApiOperation({ summary: 'Mes demandes, envoyees et recues' })
  mesDemandes(@CurrentUser('id') me: string) {
    return this.service.mesDemandes(me);
  }

  @Post()
  @ApiOperation({
    summary:
      'Demander une annulation ou un changement de dates. Applique sans accord si la reservation n a jamais ete acceptee.',
  })
  demander(@CurrentUser('id') me: string, @Body() dto: CreateChangeRequestDto) {
    return this.service.demander(me, dto);
  }

  @Post(':id/repondre')
  @ApiOperation({ summary: 'Accepter ou refuser une demande recue' })
  repondre(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Body() dto: RespondChangeRequestDto,
  ) {
    return this.service.repondre(me, id, dto.accepte, dto.note);
  }

  @Post(':id/retirer')
  @ApiOperation({ summary: 'Retirer sa propre demande tant que personne n a repondu' })
  retirer(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.service.retirer(me, id);
  }
}

import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { ProvidersService } from './providers.service';
import { ZonesService } from './zones.service';
import { AvailabilityService } from './availability.service';
import {
  CreateProviderDto, UpdateProviderDto, CandidatureDto, ZoneDto, CreneauDto, AbsenceDto,
} from '../dto';

/**
 * Administration des comptes prestataires.
 *
 * En phase 1 c est la seule porte d entree : l administration constate le
 * statut d agence avant de creer le compte. Le mot de passe initial n est
 * retourne qu a la creation, et ne peut etre retrouve que regenere.
 */
@ApiTags('admin-prestataires')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin, UserRole.support)
@Controller('api/v1/admin/prestataires')
export class AdminProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  lister(@Query('type') type?: string, @Query('status') status?: string) {
    return this.providers.lister(type, status);
  }

  @Post()
  @ApiOperation({ summary: 'Creer un compte prestataire. Le mot de passe initial est affiche une seule fois.' })
  creer(@CurrentUser('id') me: string, @Body() dto: CreateProviderDto) {
    return this.providers.creer(me, dto);
  }

  @Post(':id/verifier')
  @ApiOperation({ summary: 'Constater le statut d agence : le compte devient utilisable' })
  verifier(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.providers.verifier(me, id);
  }

  @Post(':id/suspendre')
  suspendre(@CurrentUser('id') me: string, @Param('id') id: string, @Body('motif') motif = '') {
    return this.providers.suspendre(me, id, motif);
  }

  @Post(':id/mot-de-passe')
  @ApiOperation({ summary: 'Regenerer le mot de passe : seule voie de recuperation tant que la reinitialisation par email n existe pas' })
  regenerer(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.providers.regenererMotDePasse(me, id);
  }
}

/**
 * Fiche, zones d intervention et disponibilites du prestataire connecte.
 *
 * Les trois vont ensemble : elles decrivent OU et QUAND il travaille. Jusqu ici
 * il ne pouvait rien en dire — il ouvrait son espace et n y trouvait que des
 * demandes recues, sans aucun moyen d influer sur celles qui lui arrivaient.
 */
@ApiTags('prestataire')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.provider)
@Controller('api/v1/prestataire')
export class ProviderProfileController {
  constructor(
    private readonly providers: ProvidersService,
    private readonly zones: ZonesService,
    private readonly dispos: AvailabilityService,
  ) {}

  @Get('moi')
  moi(@CurrentUser('id') me: string) {
    return this.providers.monProfil(me);
  }

  @Patch('moi')
  majProfil(@CurrentUser('id') me: string, @Body() dto: UpdateProviderDto) {
    return this.providers.mettreAJour(me, dto);
  }

  // ---------------------------------------------------------------- Zones

  @Get('zones')
  mesZones(@CurrentUser('id') me: string) {
    return this.zones.mesZones(me);
  }

  @Post('zones')
  @ApiOperation({
    summary:
      'Declarer une ville desservie. Choisie dans le referentiel partage : la saisie libre casserait le rapprochement avec les demandes.',
  })
  ajouterZone(@CurrentUser('id') me: string, @Body() dto: ZoneDto) {
    return this.zones.ajouter(me, dto.citySlug);
  }

  @Delete('zones/:id')
  retirerZone(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.zones.retirer(me, id);
  }

  // -------------------------------------------------------- Disponibilites

  @Get('disponibilites')
  mesDisponibilites(@CurrentUser('id') me: string) {
    return this.dispos.mesDisponibilites(me);
  }

  @Post('disponibilites')
  @ApiOperation({ summary: 'Ajouter un creneau hebdomadaire recurrent (jour + heures)' })
  ajouterCreneau(@CurrentUser('id') me: string, @Body() dto: CreneauDto) {
    return this.dispos.ajouterCreneau(me, dto);
  }

  @Delete('disponibilites/:id')
  retirerCreneau(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.dispos.retirerCreneau(me, id);
  }

  @Post('absences')
  @ApiOperation({ summary: 'Declarer une absence ponctuelle sans toucher aux horaires habituels' })
  ajouterAbsence(@CurrentUser('id') me: string, @Body() dto: AbsenceDto) {
    return this.dispos.ajouterAbsence(me, dto);
  }

  @Delete('absences/:id')
  retirerAbsence(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.dispos.retirerAbsence(me, id);
  }
}

/**
 * Candidature publique.
 *
 * Seul point d entree pour une societe qui veut travailler avec BlediGo. Sans
 * authentification, deliberement : une agence de location n a evidemment pas de
 * compte avant d en demander un.
 *
 * Le compte cree ici ne permet PAS de se connecter — voir `candidater`. La
 * constatation du statut d entreprise reste la regle.
 */
@ApiTags('candidature-prestataire')
@Controller('api/v1/prestataires')
export class ProviderApplicationController {
  constructor(private readonly providers: ProvidersService) {}

  @Post('candidature')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      'Demander a devenir prestataire. Enregistre la demande, n ouvre aucun acces avant verification.',
  })
  candidater(@Body() dto: CandidatureDto) {
    return this.providers.candidater(dto as any);
  }
}

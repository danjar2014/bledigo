import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, ProviderType } from '../../common/enums';
import { ServiceBookingsService } from './service-bookings.service';
import { ProvidersService } from '../providers/providers.service';
import { DemandeServiceDto, DemandeMenageDto, ContreProposerDto } from '../dto';

/** Demandes recues, cote prestataire. */
@ApiTags('prestataire-demandes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.provider)
@Controller('api/v1/prestataire/demandes')
export class ProviderRequestsController {
  constructor(private readonly demandes: ServiceBookingsService) {}

  @Get()
  mesDemandes(@CurrentUser('id') me: string) {
    return this.demandes.mesDemandes(me);
  }

  @Post(':id/accepter')
  accepter(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.demandes.accepter(me, id);
  }

  @Post(':id/refuser')
  refuser(@CurrentUser('id') me: string, @Param('id') id: string, @Body('motif') motif?: string) {
    return this.demandes.refuser(me, id, motif);
  }

  @Post(':id/contre-proposer')
  @ApiOperation({
    summary:
      'Contre-proposer un tarif de menage. Borne a 3 propositions tous camps confondus, et impossible une fois la demande acceptee.',
  })
  contreProposer(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Body() dto: ContreProposerDto,
  ) {
    return this.demandes.contreProposer(me, id, dto.price, dto.message);
  }

  @Get(':id/client')
  @ApiOperation({
    summary:
      'Fiche du demandeur : historique, note recue en tant que client, sinistres. Sans coordonnees tant que la demande n est pas acceptee.',
  })
  ficheClient(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.demandes.ficheClient(me, id);
  }
}

/** Cote client : le voyageur pour la voiture, l hote pour le menage. */
@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/services')
export class ServicesController {
  constructor(
    private readonly providers: ProvidersService,
    private readonly demandes: ServiceBookingsService,
  ) {}

  @Get('voitures/pour-sejour/:bookingId')
  @ApiOperation({ summary: 'Vehicules disponibles pres du logement, sur les dates du sejour' })
  voituresPourSejour(@CurrentUser('id') me: string, @Param('bookingId') bookingId: string) {
    return this.demandes.voituresPourSejour(me, bookingId);
  }

  @Post('voitures/pour-sejour/:bookingId')
  demanderVoiture(
    @CurrentUser('id') me: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: DemandeServiceDto,
  ) {
    return this.demandes.demanderVoiture(me, bookingId, dto);
  }

  @Get('menage/dates-suggerees/:listingId')
  @ApiOperation({
    summary:
      'Dates de depart des sejours a venir. Un menage suit un depart : les redemander a l hote lui ferait recopier ce que la plateforme sait deja.',
  })
  datesSuggerees(@CurrentUser('id') me: string, @Param('listingId') listingId: string) {
    return this.demandes.datesSuggerees(me, listingId);
  }

  @Get('menage/autour-de/:listingId')
  @ApiOperation({
    summary:
      'Prestataires de menage desservant la ville du logement. Quand un creneau est fourni, ceux qui ne travaillent pas a ces heures-la sont ecartes.',
  })
  menageAutourDe(
    @Param('listingId') listingId: string,
    @Query('date') date?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    // Le creneau est FACULTATIF : la liste doit s afficher des l ouverture de
    // l ecran, avant que l hote ait choisi une date. Elle se resserre ensuite.
    const debut = date && startTime ? new Date(`${date}T${startTime}:00.000Z`) : undefined;
    const fin = date && endTime ? new Date(`${date}T${endTime}:00.000Z`) : undefined;
    return this.providers.autourDeListing(ProviderType.menage, listingId, debut, fin);
  }

  @Post('menage/:listingId')
  @ApiOperation({
    summary:
      'Demander un menage sur une ou plusieurs dates. Chaque date donne une prestation distincte, negociable separement.',
  })
  demanderMenage(
    @CurrentUser('id') me: string,
    @Param('listingId') listingId: string,
    @Body() dto: DemandeMenageDto,
  ) {
    return this.demandes.demanderMenage(me, listingId, dto);
  }

  @Get('mes-commandes')
  mesCommandes(@CurrentUser('id') me: string) {
    return this.demandes.mesCommandes(me);
  }

  @Post('mes-commandes/:id/annuler')
  annuler(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.demandes.annuler(me, id);
  }

  @Post('mes-commandes/:id/contre-proposer')
  @ApiOperation({ summary: 'Repondre au tarif propose par le prestataire' })
  contreProposer(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Body() dto: ContreProposerDto,
  ) {
    return this.demandes.contreProposer(me, id, dto.price, dto.message);
  }

  @Post('mes-commandes/:id/accepter')
  @ApiOperation({
    summary:
      'Accepter le tarif du prestataire. Sans cette route, une contre-proposition resterait sans issue : son auteur ne peut pas accepter son propre prix.',
  })
  accepterTarif(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.demandes.accepter(me, id);
  }
}

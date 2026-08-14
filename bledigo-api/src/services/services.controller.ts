import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, ProviderType } from '../common/enums';
import { ProvidersService } from './providers.service';
import { VehiclesService } from './vehicles.service';
import { ServiceBookingsService } from './service-bookings.service';
import {
  CreateProviderDto, UpdateProviderDto, VehicleDto, UpdateVehicleDto, VehiclePeriodDto,
  DemandeServiceDto,
} from './dto';

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

/** Espace du prestataire connecte : sa fiche, sa flotte, ses demandes. */
@ApiTags('prestataire')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.provider)
@Controller('api/v1/prestataire')
export class ProviderSpaceController {
  constructor(
    private readonly providers: ProvidersService,
    private readonly vehicles: VehiclesService,
    private readonly demandes: ServiceBookingsService,
  ) {}

  @Get('moi')
  moi(@CurrentUser('id') me: string) {
    return this.providers.monProfil(me);
  }

  @Patch('moi')
  majProfil(@CurrentUser('id') me: string, @Body() dto: UpdateProviderDto) {
    return this.providers.mettreAJour(me, dto);
  }

  @Get('vehicules')
  flotte(@CurrentUser('id') me: string) {
    return this.vehicles.listerMaFlotte(me);
  }

  @Post('vehicules')
  ajouter(@CurrentUser('id') me: string, @Body() dto: VehicleDto) {
    return this.vehicles.ajouter(me, dto);
  }

  @Patch('vehicules/:id')
  modifier(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.modifier(me, id, dto);
  }

  @Delete('vehicules/:id')
  retirer(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.vehicles.retirer(me, id);
  }

  @Get('vehicules/:id/calendrier')
  calendrier(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.vehicles.calendrier(me, id);
  }

  @Post('vehicules/:id/calendrier')
  @ApiOperation({ summary: 'Fermer des dates ou substituer un tarif, comme le calendrier d un logement' })
  ajouterPeriode(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: VehiclePeriodDto) {
    return this.vehicles.ajouterPeriode(me, id, dto);
  }

  @Delete('vehicules/:id/calendrier/:periodeId')
  supprimerPeriode(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Param('periodeId') periodeId: string,
  ) {
    return this.vehicles.supprimerPeriode(me, id, periodeId);
  }

  @Get('demandes')
  mesDemandes(@CurrentUser('id') me: string) {
    return this.demandes.mesDemandes(me);
  }

  @Post('demandes/:id/accepter')
  accepter(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.demandes.accepter(me, id);
  }

  @Post('demandes/:id/refuser')
  refuser(@CurrentUser('id') me: string, @Param('id') id: string, @Body('motif') motif?: string) {
    return this.demandes.refuser(me, id, motif);
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
    private readonly vehicles: VehiclesService,
    private readonly demandes: ServiceBookingsService,
  ) {}

  @Get('voitures/pour-sejour/:bookingId')
  @ApiOperation({ summary: 'Vehicules disponibles pres du logement, sur les dates du sejour' })
  async voituresPourSejour(@CurrentUser('id') me: string, @Param('bookingId') bookingId: string) {
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

  @Get('menage/autour-de/:listingId')
  @ApiOperation({ summary: 'Prestataires de menage autour d un logement' })
  async menageAutourDe(@Param('listingId') listingId: string) {
    return this.providers.autourDeListing(ProviderType.menage, listingId);
  }

  @Post('menage/:listingId')
  demanderMenage(
    @CurrentUser('id') me: string,
    @Param('listingId') listingId: string,
    @Body() dto: DemandeServiceDto,
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
}

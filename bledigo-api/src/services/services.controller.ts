import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, ProviderType } from '../common/enums';
import { ProvidersService } from './providers.service';
import { VehiclesService } from './vehicles.service';
import { ServiceBookingsService } from './service-bookings.service';
import { ServiceReviewsService } from './reviews.service';
import { IncidentsService } from './incidents.service';
import {
  CreateProviderDto, UpdateProviderDto, VehicleDto, UpdateVehicleDto, VehiclePeriodDto,
  DemandeServiceDto, NoterPrestationDto, CandidatureDto, ContreProposerDto,
  DeclarerSinistreDto, ContesterSinistreDto, VehiclePhotoDto,
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
    private readonly incidents: IncidentsService,
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

  @Post('vehicules/:id/photos')
  @ApiOperation({ summary: 'Ajouter une photo. La premiere devient principale d office.' })
  ajouterPhoto(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Body() dto: VehiclePhotoDto,
  ) {
    return this.vehicles.ajouterPhoto(me, id, dto.url, dto.isPrimary);
  }

  @Delete('vehicules/:id/photos/:photoId')
  supprimerPhoto(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.vehicles.supprimerPhoto(me, id, photoId);
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

  @Post('demandes/:id/sinistre')
  @ApiOperation({
    summary:
      'Declarer un sinistre au retour du vehicule. Possible une fois restitue et dans les 7 jours. Consigne et contestable, ne sanctionne rien par lui-meme.',
  })
  declarerSinistre(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Body() dto: DeclarerSinistreDto,
  ) {
    return this.incidents.declarer(me, id, dto);
  }

  @Delete('sinistres/:id')
  @ApiOperation({ summary: 'Retirer sa declaration : se retracter ne nuit a personne' })
  retirerSinistre(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.incidents.retirer(me, id);
  }

  @Post('demandes/:id/contre-proposer')
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

  @Get('demandes/:id/client')
  @ApiOperation({
    summary:
      'Fiche du demandeur : historique, note recue en tant que client, sinistres. Sans coordonnees tant que la demande n est pas acceptee.',
  })
  ficheClient(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.demandes.ficheClient(me, id);
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
    private readonly avis: ServiceReviewsService,
    private readonly incidents: IncidentsService,
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

  @Get('mes-commandes/:id/sinistres')
  @ApiOperation({ summary: 'Sinistres attaches a une location, visibles des deux parties' })
  sinistres(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.incidents.parLocation(me, id);
  }

  @Post('sinistres/:id/contester')
  @ApiOperation({
    summary:
      'Contester un sinistre. La contestation ne l efface pas, elle l oppose : les deux versions restent lisibles et l administration tranche.',
  })
  contesterSinistre(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Body() dto: ContesterSinistreDto,
  ) {
    return this.incidents.contester(me, id, dto.motif);
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

  @Post('prestations/:id/avis')
  @ApiOperation({
    summary:
      'Noter une prestation terminee. Le sens de l avis se deduit de qui appelle : le client note le prestataire, le prestataire note son client.',
  })
  noter(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Body() dto: NoterPrestationDto,
  ) {
    return this.avis.noter(me, id, dto.rating, dto.comment);
  }

  @Get('prestataires/:id/avis')
  @ApiOperation({ summary: 'Avis publics d un prestataire : uniquement ceux de ses clients' })
  avisPrestataire(@Param('id') id: string) {
    return this.avis.avisDuPrestataire(id);
  }
}

import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { VehiclesService } from './vehicles.service';
import { CATALOGUE_VEHICULES } from './catalogue';
import { VehicleDto, UpdateVehicleDto, VehiclePeriodDto, VehiclePhotoDto } from '../dto';

/** Flotte, galerie et calendrier d une agence de location. */
@ApiTags('prestataire-flotte')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.provider)
@Controller('api/v1/prestataire/vehicules')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  flotte(@CurrentUser('id') me: string) {
    return this.vehicles.listerMaFlotte(me);
  }

  @Post()
  ajouter(@CurrentUser('id') me: string, @Body() dto: VehicleDto) {
    return this.vehicles.ajouter(me, dto);
  }

  @Patch(':id')
  modifier(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.modifier(me, id, dto);
  }

  @Delete(':id')
  retirer(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.vehicles.retirer(me, id);
  }

  @Post(':id/photos')
  @ApiOperation({ summary: 'Ajouter une photo. La premiere devient principale d office.' })
  ajouterPhoto(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: VehiclePhotoDto) {
    return this.vehicles.ajouterPhoto(me, id, dto.url, dto.isPrimary);
  }

  @Delete(':id/photos/:photoId')
  supprimerPhoto(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.vehicles.supprimerPhoto(me, id, photoId);
  }

  @Get(':id/calendrier')
  calendrier(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.vehicles.calendrier(me, id);
  }

  @Post(':id/calendrier')
  @ApiOperation({ summary: 'Fermer des dates ou substituer un tarif, comme le calendrier d un logement' })
  ajouterPeriode(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: VehiclePeriodDto) {
    return this.vehicles.ajouterPeriode(me, id, dto);
  }

  @Delete(':id/calendrier/:periodeId')
  supprimerPeriode(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Param('periodeId') periodeId: string,
  ) {
    return this.vehicles.supprimerPeriode(me, id, periodeId);
  }
}

/**
 * Catalogue marques et modeles.
 *
 * Public et sans authentification : ce n est qu une liste de reference, et la
 * proteger obligerait le formulaire a attendre un jeton pour afficher une
 * liste deroulante.
 */
@ApiTags('catalogue-vehicules')
@Controller('api/v1/catalogue/vehicules')
export class VehicleCatalogController {
  @Get()
  @ApiOperation({
    summary:
      'Marques et modeles courants du parc tunisien. Embarque plutot qu appele a distance — voir catalogue.ts.',
  })
  catalogue() {
    return CATALOGUE_VEHICULES;
  }
}

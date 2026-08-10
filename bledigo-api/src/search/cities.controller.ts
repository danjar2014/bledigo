import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CitiesService } from './cities.service';
import { GeoService } from './geo.service';
import { LOCALITIES, localitiesByRegion } from '../common/localities';

@ApiTags('cities')
@Controller('api/v1')
export class CitiesController {
  constructor(
    private readonly citiesService: CitiesService,
    private readonly geoService: GeoService,
  ) {}

  @Get('cities')
  @ApiOperation({ summary: 'Villes avec au moins une annonce active, triees par volume' })
  findAll(@Query('limit') limit?: string) {
    return this.citiesService.findAll(limit ? Number(limit) : undefined);
  }

  /**
   * Referentiel des localites : c est la seule source acceptee pour la ville
   * d une annonce ou d une demande. Groupe par gouvernorat pour l affichage.
   */
  @Get('localities')
  @ApiOperation({ summary: 'Localites tunisiennes de reference, groupees par gouvernorat' })
  localities(@Query('flat') flat?: string) {
    return flat === '1' ? LOCALITIES : localitiesByRegion();
  }

  @Get('property-types')
  @ApiOperation({ summary: 'Repartition des annonces par type de bien' })
  propertyTypes() {
    return this.citiesService.propertyTypes();
  }

  @Get('cities/:slug')
  @ApiOperation({ summary: 'Detail d une ville et ses annonces' })
  findOne(@Param('slug') slug: string, @Query() query: any) {
    return this.citiesService.findOne(slug, query);
  }

  @Get('map/listings')
  @ApiOperation({
    summary: 'Annonces dans une zone : bounding box (north/south/east/west) ou polygone tracé',
  })
  inArea(@Query() query: any) {
    return this.geoService.inArea(query);
  }
}

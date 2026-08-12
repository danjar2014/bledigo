import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ListingsService } from './listings.service';
import { CalendarService } from './calendar.service';
import { CreateListingDto, UpdateListingDto, QueryListingsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('listings')
@Controller('api/v1/listings')
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly calendar: CalendarService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Rechercher des logements actifs' })
  findAll(@Query() q: QueryListingsDto) {
    return this.listingsService.findAll(q);
  }

  /** Mes annonces, brouillons compris : declaree avant :id pour ne pas etre capturee. */
  @Get('mine')
  @ApiOperation({ summary: 'Annonces du proprietaire connecte, tous statuts' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser('id') me: string) {
    return this.listingsService.findMine(me);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Dates indisponibles : reservations ET fermetures de l hote' })
  availability(@Param('id') id: string) {
    return this.calendar.disponibilite(id);
  }

  @Get(':id/calendrier')
  @ApiOperation({ summary: 'Periodes du calendrier (public : sert a l affichage)' })
  periodes(@Param('id') id: string) {
    return this.calendar.periodes(id);
  }

  @Post(':id/calendrier')
  @ApiOperation({ summary: 'Ajouter une periode : fermeture, tarif ou duree minimale' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  ajouterPeriode(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: any) {
    return this.calendar.creer(me, id, dto);
  }

  @Delete(':id/calendrier/:periodeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  supprimerPeriode(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Param('periodeId') periodeId: string,
  ) {
    return this.calendar.supprimer(me, id, periodeId);
  }

  @Get(':id/tarif')
  @ApiOperation({ summary: 'Prix d un sejour, tarifs saisonniers appliques' })
  tarif(@Param('id') id: string, @Query('checkIn') checkIn: string, @Query('checkOut') checkOut: string) {
    return this.calendar.tarifer(id, new Date(checkIn), new Date(checkOut));
  }

  @Get(':id/modifications')
  @ApiOperation({ summary: 'Historique des modifications (proprietaire)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  modifications(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.listingsService.getModificationHistory(id, me);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('id') me: string, @Body() dto: CreateListingDto) {
    return this.listingsService.create(me, dto);
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  publish(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.listingsService.publish(me, id);
  }

  @Post(':id/photos')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addPhoto(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: any) {
    return this.listingsService.addPhoto(me, id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.listingsService.update(me, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.listingsService.remove(me, id);
  }
}

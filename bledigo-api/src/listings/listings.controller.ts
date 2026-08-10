import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ListingsService } from './listings.service';
import { CreateListingDto, UpdateListingDto, QueryListingsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('listings')
@Controller('api/v1/listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

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
  availability(@Param('id') id: string) {
    return this.listingsService.availability(id);
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

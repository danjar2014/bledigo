import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';

@ApiTags('favoris')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/favoris')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Mes logements favoris, les indisponibles compris et signales' })
  mesFavoris(@CurrentUser('id') me: string) {
    return this.favorites.mesFavoris(me);
  }

  @Get('ids')
  @ApiOperation({
    summary:
      'Identifiants seuls, pour colorer les coeurs d une liste sans en recharger les logements',
  })
  ids(@CurrentUser('id') me: string) {
    return this.favorites.idsFavoris(me);
  }

  @Post(':listingId')
  @ApiOperation({
    summary:
      'Bascule le favori. Une seule route plutot qu un ajout et une suppression : l interface n a qu un bouton.',
  })
  basculer(@CurrentUser('id') me: string, @Param('listingId') listingId: string) {
    return this.favorites.basculer(me, listingId);
  }
}

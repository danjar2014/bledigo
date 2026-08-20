import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import { CitiesAdminService } from './cities-admin.service';

/**
 * Le SLUG n est pas saisi : il se deduit du nom. Le laisser au clavier ferait
 * coexister « la-marsa » et « lamarsa », et le rapprochement avec les annonces
 * et les zones des prestataires echouerait sans bruit.
 */
export class CreerVilleDto {
  @IsString() @MaxLength(80) name: string;
  @IsString() @MaxLength(80) region: string;
  @IsNumber() @Type(() => Number) latitude: number;
  @IsNumber() @Type(() => Number) longitude: number;
}

export class ModifierVilleDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(80) region?: string;
  @IsOptional() @IsNumber() @Type(() => Number) latitude?: number;
  @IsOptional() @IsNumber() @Type(() => Number) longitude?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

@ApiTags('admin-villes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin, UserRole.support)
@Controller('api/v1/admin/villes')
export class CitiesAdminController {
  constructor(private readonly villes: CitiesAdminService) {}

  @Get()
  @ApiOperation({
    summary:
      'Referentiel des villes, avec le nombre d annonces de chacune. `source` vaut « statique » tant que rien n a ete importe.',
  })
  lister() {
    return this.villes.lister();
  }

  @Post('importer')
  @ApiOperation({
    summary:
      'Recopier la liste livree avec le code en base. Sans cette reprise, la premiere ville ajoutee ferait disparaitre toutes les autres.',
  })
  importer(@CurrentUser('id') me: string) {
    return this.villes.importerLeReferentiel(me);
  }

  @Post()
  creer(@CurrentUser('id') me: string, @Body() dto: CreerVilleDto) {
    return this.villes.creer(me, dto);
  }

  @Patch(':id')
  modifier(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: ModifierVilleDto) {
    return this.villes.modifier(me, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Supprimer une ville. Refuse si des annonces ou des zones de prestataire y pointent : les desactiver est le geste attendu.',
  })
  supprimer(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.villes.supprimer(me, id);
  }
}

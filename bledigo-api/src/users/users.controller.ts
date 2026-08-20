import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

export class EnableRoleDto {
  /** Seuls voyageur et proprietaire sont activables librement. */
  @IsIn(['traveler', 'owner']) role: 'traveler' | 'owner';
}

export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  /**
   * Par ou l hote veut etre joint une fois la demande acceptee.
   *
   * `both` accepte les deux : beaucoup de gens repondent au telephone comme
   * sur WhatsApp, et forcer un choix unique fait perdre la moitie des
   * tentatives de contact.
   */
  @IsOptional() @IsIn(['phone', 'whatsapp', 'both']) contactChannel?: string;
  /** Meme format que `phone`, sans contrainte d unicite : deux comptes peuvent
   *  legitimement partager un numero de contact. */
  @IsOptional() @Matches(/^\+?[0-9]{8,15}$/, { message: 'Numero WhatsApp invalide' })
  whatsappNumber?: string;
}

@ApiTags('users')
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 20, @Query('role') role?: string) {
    return this.usersService.findAll(Number(page), Number(limit), role);
  }

  @Get('me/roles')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  myRoles(@CurrentUser('id') me: string) {
    return this.usersService.myRoles(me);
  }

  /** Active un second role (proprietaire qui veut aussi voyager, ou l inverse). */
  @Post('me/roles')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  enableRole(@CurrentUser('id') me: string, @Body() dto: EnableRoleDto) {
    return this.usersService.enableRole(me, dto.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/passport')
  passport(@Param('id') id: string) {
    return this.usersService.passport(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(me, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.usersService.remove(me, id);
  }
}

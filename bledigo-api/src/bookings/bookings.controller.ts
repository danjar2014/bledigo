import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, ValidateBookingDto, RefuseBookingDto, ExtendBookingDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@CurrentUser('id') me: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(me, dto);
  }

  @Get()
  findMine(@CurrentUser('id') me: string, @Query('as') as: 'traveler' | 'owner' = 'traveler') {
    return this.bookingsService.findMine(me, as);
  }

  @Get(':id')
  findOne(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.bookingsService.findOne(me, id);
  }

  @Post(':id/confirm')
  confirm(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.bookingsService.confirm(me, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.bookingsService.cancel(me, id);
  }

  @Get(':id/extension')
  @ApiOperation({
    summary:
      'Devis d extension : nuits ajoutees et prix, servis AVANT la demande pour qu aucun montant ne soit decouvert apres coup',
  })
  devisExtension(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Query('checkOut') checkOut: string,
  ) {
    return this.bookingsService.devisExtension(me, id, new Date(checkOut));
  }

  @Post(':id/extension')
  @ApiOperation({
    summary:
      'Demande d extension (voyageur) : attend l accord de l hote, sauf reservation instantanee',
  })
  demanderExtension(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Body() dto: ExtendBookingDto,
  ) {
    return this.bookingsService.demanderExtension(me, id, new Date(dto.checkOut));
  }

  @Post(':id/extension/accept')
  @ApiOperation({
    summary:
      'Acceptation de l extension (proprietaire) : la disponibilite est reverifiee, le prix reste celui annonce au voyageur',
  })
  accepterExtension(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.bookingsService.accepterExtension(me, id);
  }

  @Post(':id/extension/refuse')
  @ApiOperation({ summary: 'Refus de l extension (proprietaire) : le sejour initial n est pas touche' })
  refuserExtension(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.bookingsService.refuserExtension(me, id);
  }

  @Post(':id/arrivee')
  @ApiOperation({
    summary:
      'Declaration d arrivee (voyageur) : second signal, sans lequel une absence ne peut pas etre etablie',
  })
  arrivee(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.bookingsService.confirmerArrivee(me, id);
  }

  @Post(':id/absence')
  @ApiOperation({
    summary:
      'Declaration d absence (proprietaire) : possible apres le delai de grace, sans effet si le voyageur a declare son arrivee',
  })
  absence(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.bookingsService.declarerNoShow(me, id);
  }

  @Post(':id/check-in')
  @ApiOperation({ summary: 'Check-in (proprietaire) : ouvre la fenetre de validation de 30 min' })
  checkIn(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.bookingsService.checkIn(me, id);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validation du sejour (voyageur) : libere le paiement ou ouvre un litige' })
  validate(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: ValidateBookingDto) {
    return this.bookingsService.validate(me, id, dto);
  }

  @Post(':id/refuse')
  @ApiOperation({
    summary:
      'Refus du logement a l arrivee (voyageur) : annule la reservation et rembourse, sans arbitrage',
  })
  refuse(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: RefuseBookingDto) {
    return this.bookingsService.refuse(me, id, dto);
  }
}

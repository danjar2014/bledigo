import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReverseSearchService } from './reverse-search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { templatesByGroup } from '../common/offer-templates';

@ApiTags('reverse-search')
@Controller('api/v1/reverse-searches')
export class ReverseSearchController {
  constructor(private readonly service: ReverseSearchService) {}

  // --- Routes statiques : declarees avant les routes parametrees ---

  /** Proprietaire : demandes disponibles (consomme 1 credit). */
  @Get('available')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.owner, UserRole.agency)
  findAvailable(@CurrentUser('id') me: string, @Query() query: any) {
    return this.service.findAvailableForOwner(me, query);
  }

  /**
   * Messages standards utilisables dans une offre.
   * Le message libre n est pas accepte : voir offer-templates.ts.
   */
  @Get('offer-templates')
  offerTemplates() {
    return templatesByGroup();
  }

  /** Voyageur : ses propres recherches. */
  @Get('my-searches')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMySearches(@CurrentUser('id') me: string) {
    return this.service.findMine(me);
  }

  /** Proprietaire : solde de credits. */
  @Get('credits')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getCredits(@CurrentUser('id') me: string) {
    return this.service.getCredits(me);
  }

  /** Proprietaire : achat d un pack de credits. */
  @Post('credits/purchase')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.owner, UserRole.agency)
  purchaseCredits(@CurrentUser('id') me: string, @Body() dto: any) {
    return this.service.purchaseCredits(me, dto?.packageType);
  }

  /** Proprietaire : contre-propositions en attente de ma reponse. */
  @Get('offers/pending-counters')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.owner, UserRole.agency)
  pendingCounters(@CurrentUser('id') me: string) {
    return this.service.myPendingCounters(me);
  }

  /**
   * Proprietaire : reponse a une contre-proposition.
   * accept ou counter renvoient l offre au voyageur pour validation finale.
   */
  @Post('offers/:offerId/respond')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.owner, UserRole.agency)
  respondToCounter(
    @CurrentUser('id') me: string,
    @Param('offerId') offerId: string,
    @Body() dto: { action: 'accept' | 'reject' | 'counter'; price?: number },
  ) {
    return this.service.respondToCounter(me, offerId, dto?.action, Number(dto?.price));
  }

  /** Voyageur : refus d une offre. */
  @Post('offers/:offerId/reject')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  rejectOffer(@CurrentUser('id') me: string, @Param('offerId') offerId: string) {
    return this.service.rejectOffer(me, offerId);
  }

  /** Voyageur : contre-proposition de montant. */
  @Post('offers/:offerId/counter')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  counterOffer(
    @CurrentUser('id') me: string,
    @Param('offerId') offerId: string,
    @Body() dto: { price: number },
  ) {
    return this.service.counterOffer(me, offerId, Number(dto?.price));
  }

  /** Compatibilite : acceptation d une offre sans id de recherche. */
  @Post('offers/:offerId/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  acceptOfferLegacy(@CurrentUser('id') me: string, @Param('offerId') offerId: string) {
    return this.service.acceptOffer(me, offerId);
  }

  // --- Routes generiques ---

  /**
   * Mes demandes. Il n existe pas de liste publique : une demande expose les
   * dates et le budget du voyageur.
   */
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser('id') me: string, @Query() q: any) {
    return this.service.findAllForTraveler(me, q);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.traveler)
  create(@CurrentUser('id') me: string, @Body() dto: any) {
    return this.service.create(me, dto);
  }

  /** Detail : reserve a l auteur et aux proprietaires de la zone concernee. */
  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(id, user);
  }

  /** Le voyageur corrige sa demande tant qu aucune offre n est acceptee. */
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(me, id, dto);
  }

  /** Le voyageur retire sa demande : les offres en attente sont rejetees. */
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.service.cancel(me, id);
  }

  /** Voyageur : offres recues sur une recherche (tri + filtres). */
  @Get(':id/offers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getOffers(@CurrentUser('id') me: string, @Param('id') id: string, @Query() query: any) {
    return this.service.getOffersForTraveler(me, id, query);
  }

  /**
   * Ouvre une demande : un credit, une seule fois.
   * La consultation de la liste, elle, est gratuite.
   */
  @Post(':id/unlock')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.owner, UserRole.agency)
  unlock(@CurrentUser('id') me: string, @Param('id') id: string) {
    return this.service.unlock(me, id);
  }

  /** Proprietaire : envoi d une offre. */
  @Post(':id/offers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.owner, UserRole.agency)
  createOffer(@CurrentUser('id') me: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.createOffer(me, id, dto);
  }

  /** Voyageur : acceptation d une offre. */
  @Post(':id/offers/:offerId/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  acceptOffer(
    @CurrentUser('id') me: string,
    @Param('id') id: string,
    @Param('offerId') offerId: string,
  ) {
    return this.service.acceptOffer(me, id, offerId);
  }
}

import { Module } from '@nestjs/common';
import { ProvidersModule } from './providers/providers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ServiceBookingsModule } from './bookings/bookings.module';
import { IncidentsModule } from './incidents/incidents.module';
import { ServiceReviewsModule } from './reviews/reviews.module';

/**
 * Prestataires de services, decoupe par metier.
 *
 * Un seul module de 340 lignes de controleur melangeait comptes, flotte,
 * demandes, sinistres et avis : toute evolution d un metier obligeait a relire
 * les quatre autres, et le fichier grossissait a chaque ajout.
 *
 * Chaque sous-module porte son service, son controleur et ses routes. Les
 * dependances vont dans un seul sens — les demandes connaissent la flotte et
 * les prestataires, jamais l inverse — ce qui evite les references circulaires
 * et rend chaque metier testable seul.
 *
 * Les DTO restent partages dans `dto/` : ils traversent les metiers (une
 * demande porte a la fois un vehicule et une zone), et les eclater obligerait a
 * des imports croises entre sous-modules pour aucun gain.
 */
@Module({
  imports: [
    ProvidersModule,
    VehiclesModule,
    ServiceBookingsModule,
    IncidentsModule,
    ServiceReviewsModule,
  ],
  exports: [
    ProvidersModule,
    VehiclesModule,
    ServiceBookingsModule,
    IncidentsModule,
    ServiceReviewsModule,
  ],
})
export class ServicesModule {}

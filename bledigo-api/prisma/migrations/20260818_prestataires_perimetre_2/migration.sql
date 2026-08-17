-- Perimetre 2 des prestataires : voir, decider, constater.
--
-- Le perimetre 1 avait livre la mecanique — comptes, flotte, calendrier,
-- demandes, acceptation, notation mutuelle. Il manquait ce qui rend le service
-- utilisable et opposable.
--
-- VEHICULES. On ne loue pas une voiture qu on ne voit pas : vehicle_photos
-- remplace la colonne photo_url unique, conservee et marquee obsolete parce
-- qu elle porte des valeurs — meme traitement que control_visits_count. Les
-- conditions de location (kilometrage, age minimum, carburant, livraison)
-- suivent la regle des conditions d annulation : servies AVANT la demande, car
-- une condition decouverte au comptoir est inopposable.
--
-- SINISTRES. vehicle_incidents consigne ce qui est constate au retour. Il ne
-- sanctionne rien par lui-meme : le projet a deja refuse qu une sanction repose
-- sur la parole d une seule partie, c est tout le sens du double signal a
-- l arrivee d un sejour. Une agence inscrit un fait, le client peut le
-- contredire, l administration tranche a la main.
--
-- MENAGE. Le prestataire decidait sans savoir ou, ni quand, ni pour combien :
-- ville, gouvernorat, quartier, tarif propose et contre-proposition arrivent
-- sur service_bookings. Le creneau horaire passe par start_date et end_date,
-- qui portent deja l heure — deux colonnes de plus auraient dit la meme chose
-- et pu la contredire.
--
-- Le vocabulaire de negociation (counter_price, counter_at, negotiation_round)
-- est repris de reverse_offers : il n y a aucune raison qu une negociation de
-- menage s apprenne differemment d une negociation de sejour.
--
-- NOM DE CETTE MIGRATION. Elle est datee du 18 alors qu elle est ecrite le 17,
-- volontairement : Prisma applique par ordre ALPHABETIQUE, et un horodatage
-- complet du type 20260817200000_ trierait AVANT 20260817_extension_sejour.
-- Le depot porte deja un defaut de cet ordre, documente dans CLAUDE.md ; on
-- n en ajoute pas un second.
--
-- Migration ADDITIVE : colonnes avec valeur par defaut, deux tables nouvelles,
-- aucune suppression. Les lignes existantes restent valides.

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "delivery_available" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "delivery_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "extra_km_price" DOUBLE PRECISION,
ADD COLUMN     "fuel_policy" TEXT NOT NULL DEFAULT 'plein_a_plein',
ADD COLUMN     "km_per_day" INTEGER,
ADD COLUMN     "min_driver_age" INTEGER NOT NULL DEFAULT 21,
ADD COLUMN     "min_licence_years" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "options" TEXT,
ADD COLUMN     "pickup_location" TEXT,
ADD COLUMN     "return_location" TEXT;

-- AlterTable
ALTER TABLE "service_bookings" ADD COLUMN     "address_hint" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "counter_at" TIMESTAMP(3),
ADD COLUMN     "counter_price" DOUBLE PRECISION,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "negotiation_round" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "proposed_price" DOUBLE PRECISION,
ADD COLUMN     "region" TEXT;

-- CreateTable
CREATE TABLE "vehicle_photos" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_incidents" (
    "id" TEXT NOT NULL,
    "service_booking_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "declared_by" TEXT NOT NULL,
    "declared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimated_cost" DOUBLE PRECISION,
    "photos" TEXT,
    "contested_at" TIMESTAMP(3),
    "contest_reason" TEXT,
    "resolution" TEXT NOT NULL DEFAULT 'etabli',
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_photos_vehicle_id_idx" ON "vehicle_photos"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_incidents_service_booking_id_idx" ON "vehicle_incidents"("service_booking_id");

-- CreateIndex
CREATE INDEX "vehicle_incidents_resolution_idx" ON "vehicle_incidents"("resolution");

-- AddForeignKey
ALTER TABLE "vehicle_photos" ADD CONSTRAINT "vehicle_photos_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_incidents" ADD CONSTRAINT "vehicle_incidents_service_booking_id_fkey" FOREIGN KEY ("service_booking_id") REFERENCES "service_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

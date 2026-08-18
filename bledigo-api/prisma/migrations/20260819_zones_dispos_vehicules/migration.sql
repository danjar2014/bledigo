-- Zones d intervention, disponibilites horaires, et fiche vehicule detaillee.
--
-- ZONES. Le rayon en kilometres ne suffisait pas. Une agence de Tunis « a
-- 60 km » couvre sur le papier des localites qu elle ne dessert pas, et en rate
-- d autres qu elle dessert tres bien : le cercle ne connait ni les routes, ni
-- les habitudes. Une zone se DECLARE desormais, ville par ville, dans le
-- referentiel de common/localities — la saisie libre est exclue, sans quoi
-- « La Marsa » et « Marsa » deviendraient deux zones et le rapprochement
-- casserait. Pas de carte : on choisit dans une liste, ce qui se fait au
-- clavier et depuis un telephone.
--
-- Le rayon reste utilise pour les prestataires qui n ont declare aucune zone :
-- la migration n en supprime aucun du jour au lendemain.
--
-- DISPONIBILITES. Un prestataire propose ses services a des HEURES, pas a des
-- jours. Envoyer une demande a 7 h a quelqu un qui commence a 9 h fait perdre
-- son temps aux deux. provider_availability porte des creneaux hebdomadaires
-- recurrents, provider_time_off les absences ponctuelles — separes pour que
-- fermer une semaine n oblige pas a effacer puis reconstruire ses horaires.
--
-- Les heures sont en TEXT "HH:MM" et non en TIMESTAMP : elles n ont pas de
-- date, et un timestamp obligerait a en inventer une, avec son fuseau et ses
-- surprises au changement d heure.
--
-- VEHICULES. Puissance fiscale, kilometrage au compteur, portes et couleur :
-- ce que tout loueur affiche, et que l on ne pouvait pas saisir. Le carburant
-- accueille le GPL, courant en Tunisie et jusqu ici impossible a declarer.
--
-- Migration ADDITIVE : trois tables nouvelles, quatre colonnes nullables,
-- aucune suppression.

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "color" TEXT,
ADD COLUMN     "doors" INTEGER,
ADD COLUMN     "fiscal_power" INTEGER,
ADD COLUMN     "mileage" INTEGER;

-- CreateTable
CREATE TABLE "provider_zones" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "city_slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_availability" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,

    CONSTRAINT "provider_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_time_off" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_time_off_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_zones_city_slug_idx" ON "provider_zones"("city_slug");

-- CreateIndex
CREATE UNIQUE INDEX "provider_zones_provider_id_city_slug_key" ON "provider_zones"("provider_id", "city_slug");

-- CreateIndex
CREATE INDEX "provider_availability_provider_id_idx" ON "provider_availability"("provider_id");

-- CreateIndex
CREATE INDEX "provider_time_off_provider_id_idx" ON "provider_time_off"("provider_id");

-- AddForeignKey
ALTER TABLE "provider_zones" ADD CONSTRAINT "provider_zones_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_availability" ADD CONSTRAINT "provider_availability_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_time_off" ADD CONSTRAINT "provider_time_off_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

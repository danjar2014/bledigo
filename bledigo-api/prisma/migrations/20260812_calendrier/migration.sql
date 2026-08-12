-- Calendrier des logements.
--
-- Migration ADDITIVE : elle ne touche a aucune table existante et ne peut donc
-- rien casser en production. 0_init reste intacte — la reecrire ferait echouer
-- `prisma migrate deploy` sur une empreinte differente, et bloquerait tous les
-- deploiements suivants.
--
-- Une periode porte trois usages : fermer des dates, y appliquer un tarif
-- particulier, y imposer une duree minimale. Bornes : start incluse, end exclue.

-- CreateTable
CREATE TABLE "listing_calendar" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "price_per_night" DOUBLE PRECISION,
    "min_nights" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_calendar_listing_id_idx" ON "listing_calendar"("listing_id");

-- CreateIndex
CREATE INDEX "listing_calendar_listing_id_start_date_end_date_idx" ON "listing_calendar"("listing_id", "start_date", "end_date");

-- AddForeignKey
ALTER TABLE "listing_calendar" ADD CONSTRAINT "listing_calendar_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

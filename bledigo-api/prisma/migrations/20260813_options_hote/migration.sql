-- Options laissees a l hote, et double signal a l arrivee.
--
-- Migration ADDITIVE : uniquement des ADD COLUMN sur des colonnes nullables ou
-- pourvues d un defaut. Aucune table existante n est reecrite, aucune donnee
-- deja en base n est touchee.
--
-- 0_init et 20260812_calendrier restent intactes : Prisma compare l empreinte
-- de chaque migration deja appliquee, en reecrire une seule ferait echouer
-- `migrate deploy` et bloquerait tous les deploiements suivants.

-- Listing : ce que l hote decide de son logement.
--
-- booking_horizon_days n est PAS max_nights. L un borne la distance a laquelle
-- on peut reserver, l autre la duree du sejour — les confondre laisse passer
-- une reservation d une nuit dans dix-huit mois.
ALTER TABLE "listings" ADD COLUMN "booking_horizon_days" INTEGER;
ALTER TABLE "listings" ADD COLUMN "rental_profile" TEXT NOT NULL DEFAULT 'court';
ALTER TABLE "listings" ADD COLUMN "cancellation_deadline_days" INTEGER;
ALTER TABLE "listings" ADD COLUMN "shorten_surcharge_percent" INTEGER;

-- User : par ou l hote veut etre joint.
--
-- whatsapp_number est volontairement sans index unique. Le @unique de "phone"
-- a deja fait echouer le semis en silence des que deux comptes ont voulu le
-- meme numero : un numero de contact n identifie pas un compte.
ALTER TABLE "users" ADD COLUMN "contact_channel" TEXT NOT NULL DEFAULT 'phone';
ALTER TABLE "users" ADD COLUMN "whatsapp_number" TEXT;

-- Booking : qui a declare quoi, et quand.
--
-- Sans paiement il n existe aucun levier financier : le seul recours est le
-- compte du voyageur. Une sanction exige donc une preuve qui ne repose pas sur
-- la seule parole de l hote. arrival_confirmed_at est ce second signal — le
-- check-in etant declenche par l hote, son absence ne prouve rien.
ALTER TABLE "bookings" ADD COLUMN "arrival_confirmed_at" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "no_show_declared_at" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "no_show_declared_by" TEXT;
ALTER TABLE "bookings" ADD COLUMN "cancelled_at" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "cancelled_by" TEXT;

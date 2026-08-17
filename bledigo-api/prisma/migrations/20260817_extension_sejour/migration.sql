-- Extension d un sejour en cours.
--
-- Un voyageur deja sur place veut rester deux nuits de plus. Jusqu ici la seule
-- voie etait une seconde reservation, avec sa propre acceptation, son propre
-- check-in et ses propres frais de menage — pour la meme personne, dans le meme
-- lit, sans avoir bouge.
--
-- Trois colonnes portent la demande en attente. Pas de table dediee : le statut
-- `pending` d une reservation dit deja « pas encore accepte », et une extension
-- non accordee n a pas d existence propre — elle disparait avec la reservation
-- qui la porte.
--
-- Le PRIX est fige a la demande, et c est le point qui n est pas evident. Le
-- recalculer au moment ou l hote accepte laisserait celui-ci modifier ses tarifs
-- entre-temps et encaisser un montant que le voyageur n a jamais vu. La
-- disponibilite, elle, est bien reverifiee a l acceptation : d autres dates ont
-- pu etre prises entre la demande et la reponse.
--
-- Migration ADDITIVE, trois colonnes nullables : les reservations existantes
-- restent valides, sans extension en attente.

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "extension_check_out" TIMESTAMP(3),
ADD COLUMN     "extension_price" DOUBLE PRECISION,
ADD COLUMN     "extension_requested_at" TIMESTAMP(3);

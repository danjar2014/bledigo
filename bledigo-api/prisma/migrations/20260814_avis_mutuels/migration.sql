-- Un avis par SENS et par prestation.
--
-- Correction d une erreur de modelisation de la migration precedente :
-- service_booking_id portait un index unique simple, ce qui n autorisait qu un
-- seul avis par prestation. La notation mutuelle voulue — le client note le
-- prestataire, le prestataire note son client — en exige deux. Le premier a
-- ecrire aurait ferme la porte au second.
--
-- Le DROP INDEX ne detruit aucune donnee : la table est vide en production, ce
-- qui a ete verifie avant d ecrire cette migration. On corrige donc l index
-- plutot que de laisser une contrainte fausse en place, et on n a surtout pas
-- reecrit 20260814_prestataires, deja appliquee.

-- DropIndex
DROP INDEX "service_reviews_service_booking_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "service_reviews_service_booking_id_direction_key" ON "service_reviews"("service_booking_id", "direction");


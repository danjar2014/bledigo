-- Une personne physique peut proposer du menage.
--
-- Le menage n est pas l affaire des seules societes : une femme de menage a son
-- compte doit pouvoir s inscrire. La consequence n est pas cosmetique — elle n a
-- pas de registre de commerce, et ce n est donc pas un statut d entreprise que
-- l administration constate pour elle, mais une piece d identite.
--
-- La location de vehicules reste reservee aux societes : elle suppose une
-- flotte, une assurance et une immatriculation professionnelle.
--
-- Migration ADDITIVE : une colonne avec valeur par defaut. Les lignes existantes
-- deviennent 'societe', ce qui correspond a la realite de ce qui a ete cree
-- jusqu ici. Aucune migration precedente n est reecrite.

-- AlterTable
ALTER TABLE "service_providers" ADD COLUMN     "legal_form" TEXT NOT NULL DEFAULT 'societe';


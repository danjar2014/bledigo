-- Abandon des visites de controle terrain.
--
-- Le modele reposait sur des agents envoyes verifier les logements. Il n a
-- jamais servi : zero visite, zero compte agent. La confiance vient des notes,
-- des sejours valides et du volume — pas d une inspection qu il faudrait
-- financer et planifier.
--
-- SUPPRESSION DE TABLE, donc destructive par nature. Elle a ete verifiee vide en
-- production AVANT d ecrire cette migration : `SELECT count(*) FROM
-- control_visits` renvoyait 0. Aucune donnee n est perdue.
--
-- La colonne `control_visits_count` du passeport est CONSERVEE : elle porte des
-- valeurs historiques et plus rien ne l alimente. La supprimer sur une table
-- peuplee couterait plus qu elle ne rapporte.
--
-- Consequence sur le score, traitee dans le meme commit : les visites valaient
-- jusqu a 20 points de securite, inatteignables desormais. Elles sont remplacees
-- par les sejours valides par leur voyageur, et MODELE passe en heuristique-v3
-- pour que les scores archives restent interpretables.

-- DropForeignKey
ALTER TABLE "control_visits" DROP CONSTRAINT "control_visits_listing_id_fkey";

-- DropForeignKey
ALTER TABLE "control_visits" DROP CONSTRAINT "control_visits_agent_id_fkey";

-- DropTable
DROP TABLE "control_visits";


-- L hote accepte-t-il les enfants ?
--
-- La recherche distingue desormais adultes et enfants, mais rien cote logement
-- ne permettait d en tenir compte : un hote qui ne veut pas d enfants n avait
-- aucun moyen de le dire, et une famille decouvrait le refus au moment de la
-- demande — c est-a-dire apres avoir choisi.
--
-- DEFAUT A VRAI, et c est le point qui compte. Basculer le parc existant en
-- « sans enfants » ferait disparaitre des annonces de la recherche familiale
-- sans qu aucun hote l ait decide, et personne ne comprendrait pourquoi ses
-- demandes se sont taries. Ceux qui refusent les enfants le declareront.
--
-- Le filtre ne s applique QUE si la recherche porte sur au moins un enfant :
-- un logement sans enfants reste visible pour un couple, ce qui est le cas le
-- plus frequent.
--
-- Migration ADDITIVE : une colonne avec valeur par defaut, aucune suppression.

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "children_allowed" BOOLEAN NOT NULL DEFAULT true;

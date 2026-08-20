-- Favoris et referentiel des villes administrable.
--
-- FAVORIS. Table de liaison nue : un favori EXISTE ou non, sans etat ni
-- metadonnee. Y ajouter des listes nommees ou des notes serait une autre
-- fonctionnalite, et rien ne dit qu elle sera demandee.
--
-- L unicite (user, listing) n est pas decorative : sans elle un double clic
-- creerait deux lignes et le compteur de favoris mentirait. La suppression du
-- logement OU du compte emporte le favori — garder des favoris orphelins
-- obligerait chaque lecture a filtrer des annonces disparues.
--
-- VILLES. common/localities.ts reste la liste de DEPART : elle sert de semis et
-- de repli tant que la table est vide, sans quoi une base fraiche se
-- retrouverait sans aucune ville et la recherche deviendrait inutilisable.
--
-- Une ville ne se supprime pas si des annonces y pointent : le service refuse
-- plutot que d orpheliner des logements. `active` permet de la retirer des
-- listes sans rien casser — c est le geste attendu dans 90 % des cas, celui
-- ou l on veut juste cesser de proposer une destination.
--
-- Migration ADDITIVE : deux tables nouvelles, aucune colonne modifiee, aucune
-- suppression.

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- CreateIndex
CREATE INDEX "cities_region_idx" ON "cities"("region");

-- CreateIndex
CREATE INDEX "cities_active_idx" ON "cities"("active");

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_listing_id_key" ON "favorites"("user_id", "listing_id");

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;


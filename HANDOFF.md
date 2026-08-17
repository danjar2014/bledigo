# Passation — BlediGo

Réécrite le 17/08/2026 au soir. Ce document dit **où en est le projet**, ce qui
bloque, et ce qui attend une décision. Il ne répète pas `CLAUDE.md`, qui
contient l'architecture, les pièges de production et les décisions de conception
à respecter — lire celui-là d'abord.

---

## ✅ FAIT : la production tourne sur Supabase

La migration est terminée le 17/08/2026 au soir. L'API pointe sur le projet
Supabase `sqessntpyqjdyunlhuxs`, région **eu-west-1**, via le pooler de session.
Les logs de démarrage disent « No pending migrations to apply », et l'API sert
ses 7 annonces depuis la nouvelle base.

**Les 7 réservations fantômes ne sont pas passées** : il en reste 3, toutes
légitimes (délais de confirmation de 1735 s, 55 s et 27 s, aucune sous la
seconde), et 0 paiement — les 7 appartenaient tous aux fantômes. Le calendrier
de « villa piscine » et de la Villa Hammamet est libéré.

**`BlediGo_DB` chez Render n'est plus utilisée.** Elle expire le 09/09/2026 et
sera supprimée seule. La garder d'ici là ne coûte rien et sert de filet : y
revenir, c'est remettre son URL dans `DATABASE_URL`.

### Ce qui reste à faire de ce côté

Le projet Supabase est en **Irlande** alors que les services Render sont en
**Oregon** : chaque requête Prisma traverse l'Atlantique, environ 140 ms. C'est
un choix assumé pour la recette — la vraie production ira sur des bases et des
services payants. Ne pas s'étonner de la lenteur d'ici là, et ne pas la
diagnostiquer comme un problème de code.

⚠️ **Un défaut latent est apparu pendant la migration** : l'historique des
migrations ne sait pas reconstruire une base à partir de zéro.
`20260814_avis_mutuels` supprime un index que `20260814_prestataires` crée, et
l'ordre alphabétique les inverse. Contourné par `db push`, à corriger vraiment
au prochain changement de base. Détail complet dans `CLAUDE.md`.

---

## Comment la migration a été faite

Utile le jour où il faudra la refaire vers une base payante.

Ni `pg_dump`, ni `psql`, ni Docker sur la machine de développement : tout est
passé par des scripts Node et le paquet `pg`. Le MCP Render n'aurait pas suffi,
il enveloppe chaque requête dans une transaction en **lecture seule**.

1. Schéma posé par `prisma db push` plutôt que par `migrate deploy` — voir le
   défaut d'ordre des migrations signalé plus haut. Contrôlé ensuite par
   `prisma migrate diff --from-schema-datamodel ... --to-url ...`, qui renvoie
   **une migration vide** : le schéma correspond exactement au datamodel.
2. Données copiées table par table dans l'ordre des dépendances, calculé par
   **tri topologique** du graphe des clés étrangères plutôt qu'écrit à la main —
   une liste figée se périme au premier modèle ajouté. Lecture seule sur la
   source, `ON CONFLICT DO NOTHING`, donc rejouable. 127 lignes, quelques
   secondes.
3. `_prisma_migrations` copiée elle aussi, pour que Prisma tienne l'historique
   pour appliqué — ce qui est vrai du résultat, sinon du chemin.
4. `DATABASE_URL` basculée par l'API Render, en **fusion** et non en
   remplacement : les secrets JWT ne devaient pas disparaître dans l'opération.

Les scripts vivent dans le répertoire temporaire de la session
(`migrer-vers-supabase.js`, `inventaire.js`, `trouver-pooler.js`, `sql.js`), à
recopier ailleurs avant de s'en servir.

Deux pièges rencontrés, tous deux silencieux :

- `prisma db execute --stdin` avec le SQL passé en **argument** répond « Script
  executed successfully » sans rien exécuter. Un `DROP SCHEMA` a ainsi été perdu,
  laissant quatre lignes parasites dans `_prisma_migrations` dont une **en
  erreur** — de quoi bloquer tout `migrate deploy` ultérieur par un P3009.
  Vérifier l'effet, jamais le message.
- La région d'un projet Supabase n'est exposée nulle part côté client, alors
  qu'elle figure dans le nom d'hôte du pooler. `trouver-pooler.js` la retrouve
  par essais : seul le pooler de la bonne région connaît le locataire.

---

## Les 7 réservations fantômes — réglé, mais le raisonnement vaut d'être gardé

Elles ne sont pas passées dans la migration. Ce qui suit explique **pourquoi
supprimer**, parce que la passation précédente en donnait une mauvaise raison et
que l'erreur se reproduirait.

Sur 9 réservations `confirmed` en production, **7 portaient la signature du bug
d'auto-acceptation** : confirmées en 0,36 à 0,73 s, paiement `held`. Les deux
autres sont saines (55 s et 27 s, paiement `pending`) — et la plus récente date
d'après le correctif, ce qui prouve que l'acceptation par l'hôte fonctionne.

**La passation précédente donnait une mauvaise raison de les supprimer.** Le
dénominateur de `refusal-guard` et de `no-show-guard` compte `completed` et
`cancelled`, jamais `confirmed` : elles ne polluent aucun dénominateur. Elles
font pire.

- **Elles bloquent le calendrier.** `logementsIndisponibles` exclut seulement
  `cancelled` : 6 des 7 courent encore et retirent des logements réels des
  résultats de recherche, pour des séjours que personne n'a acceptés.
- **Elles gèlent la sanction des hôtes.** `reservationsEnCours()` compte
  `confirmed` : un hôte visé recevrait `limit` au lieu de `suspend`, et
  `cloturerSiPlusRien` ne fermerait jamais son compte — 7 réservations qui ne se
  termineront jamais.

C'est aussi pourquoi **supprimer vaut mieux que passer en `cancelled`** :
`cancelled` entre, lui, dans le dénominateur, et offrirait 7 « séjours aboutis »
gratuits à ces deux comptes.

La suppression était propre : 0 avis, 0 litige, 0 conversation, 0 état des
lieux, 7 paiements qui n'appartenaient qu'à elles. Le semis ne crée aucune
réservation, donc rien ne les recréera. **Constaté sur Supabase** : 3
réservations restantes, 0 paiement, 2 dates encore bloquées et ce sont les
bonnes.

---

## Ce qui a été fait aujourd'hui

Après `47a35a5`, quatre commits : `bfd826e`, `c798983`, `dd3cab8`, `d186c60`.
Les tests passent de 65 à **91**.

**Extension d'un séjour en cours.** Un voyageur déjà sur place peut rester plus
longtemps sans repasser par une seconde réservation. Prix figé à la demande,
disponibilité revérifiée à l'acceptation, ni ménage ni frais de service
recomptés, `minNights` non opposé. Les règles sont dans `CLAUDE.md`. Parcours
vérifié de bout en bout dans le navigateur, course concurrente comprise.

**Score en `heuristique-v4`.** `photosCertifiees` cesse d'être noté : rien dans
l'application n'écrit `isCertified` hors du semis, ces 20 points étaient
inatteignables — exactement le piège des visites terrain, laissé une ligne
au-dessus. La sécurité plafonne maintenant à exactement 100 au lieu de 120
écrêtés.

**Promesses retirées** de l'interface : les agents vérificateurs, les photos
certifiées, l'emplacement GPS garanti. Et le formulaire de création dit enfin
que son bouton ajoute une image de stock.

**Identifiants de démonstration** réservés au développement : ils étaient morts
en production et annonçaient l'existence d'un compte administrateur.

---

## Décisions qui attendent

**`AiService.scoreListing` est un second moteur de notation.** Il écrase
`trustScore` et `qualityScore` avec une formule différente, sans rien archiver
dans `scoresHistory` et sans `MODELE` — alors que cet archivage est présenté
comme la condition du modèle appris de la phase 2. Il compte encore
`isCertified`, que v4 vient d'abandonner.

Le vrai problème est ailleurs : `POST /api/v1/ai/listings/:id/score` n'a qu'un
`JwtAuthGuard`, **aucun contrôle de propriété ni de rôle**. N'importe quel
utilisateur connecté peut recalculer le score de n'importe quelle annonce, et le
tableau de bord propriétaire expose déjà le bouton. Comme la formule donne
2 points par photo, un hôte peut gonfler son propre score. `detectFraud` est
exposée de la même façon.

À trancher : supprimer la route, ou la faire déléguer à `ScoringService`. Dans
les deux cas, ajouter un contrôle d'accès.

**`SEED_DEMO=false` avant l'ouverture publique.** Les comptes d'essai restent
volontairement actifs pour la recette.

**`belhassen.france@gmail.fr`**, second compte admin : aucun compte Google
n'existe en `@gmail.fr`. La connexion par mot de passe fonctionne, le bouton
Google ne correspondra jamais à cette adresse.

---

## Ce qui n'existe pas, et qu'il faut savoir

**Aucune photo n'est jamais envoyée.** Le bouton du formulaire empile une URL
`picsum.photos`. Les sept annonces de production affichent des images de stock
aléatoires. Le raccordement du stockage attend une décision d'infrastructure —
Supabase inclut un service de stockage, ce qui en fera le choix évident une fois
la migration faite. L'interface annonce désormais la limite au lieu de la
masquer.

**`verifyEmail`, `forgotPassword`, `resetPassword` renvoient `success: true`
sans rien faire.** C'est la raison de fond pour laquelle tout compte prestataire
passe par l'administration.

**Aucune alerte de nouvelle candidature.** Le bandeau du back-office compte les
demandes, mais il faut ouvrir `/admin` pour le voir.

**L'écran de consentement Google est en mode *Testing*.** Seuls les comptes
listés en *test users* peuvent se connecter. À passer en *In production* avant
l'ouverture — sinon les clients sont refusés sans message compréhensible.

**`Hero.tsx` annonce « 500+ logements certifiés » et « 98 % de satisfaction »**
sur une place de marché qui en compte sept. Signalé, non traité : c'est un
arbitrage éditorial.

---

## Comment vérifier que ça marche

Aucune affirmation de ce document n'a été faite sans preuve.

```bash
# API et front en local
cd bledigo-api && npm run start      # port 4000
cd bledigo-web && npm run dev        # port 3000

# Tests — 91 au 17/08/2026
cd bledigo-api && npx jest

# Base locale apres changement de schema
npx prisma db push --schema=prisma/schema.prisma

# Verifier une migration AVANT de l ecrire, sans PostgreSQL local
git show HEAD:bledigo-api/prisma/schema.postgres.prisma > ancien.prisma
npx prisma migrate diff --from-schema-datamodel ancien.prisma \
  --to-schema-datamodel prisma/schema.postgres.prisma --script
```

Le MCP Render interroge la base de production **en lecture seule** : toute
requête y est enveloppée dans une transaction en lecture. C'est suffisant pour
constater, jamais pour corriger — et c'est ce qui a bloqué la suppression des
7 réservations. `pg_dump`, `psql` et Docker sont absents de la machine de
développement ; tout passe par des scripts Node et le paquet `pg`.

Piège rencontré plusieurs fois : une instance d'API lancée **avant** une
modification tient le port 4000 et répond `200`. La tester valide du code
périmé. Tuer le processus avant de relancer.

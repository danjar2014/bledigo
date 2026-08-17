# Passation — BlediGo

Réécrite le 17/08/2026 au soir. Ce document dit **où en est le projet**, ce qui
bloque, et ce qui attend une décision. Il ne répète pas `CLAUDE.md`, qui
contient l'architecture, les pièges de production et les décisions de conception
à respecter — lire celui-là d'abord.

---

## À FAIRE EN PREMIER : la base de production disparaît le 09/09/2026

`BlediGo_DB` est une base PostgreSQL en **offre gratuite** chez Render. Son
champ `expiresAt` porte le **9 septembre 2026** : Render supprime ces bases au
bout de 30 jours, données comprises. Ce n'est pas une alerte théorique, c'est
une date.

La migration vers Supabase est décidée et **à moitié préparée**. Il manque une
seule chose, qui ne peut être faite que par le titulaire du compte :

**Créer un projet Supabase en région Central EU (Frankfurt)** et récupérer sa
chaîne de connexion *Session pooler* (bouton **Connect** en haut du tableau de
bord, onglet Connection String — pas l'onglet MCP).

Un projet avait été créé en Irlande, puis abandonné : Render est en Oregon, et
mesuré depuis la France l'aller-retour SQL vaut **172 ms vers l'Oregon contre
24 ms vers l'Irlande**. Ce qui compte n'est pas la distance à l'utilisateur mais
celle entre l'API et la base, une requête HTTP en enchaînant plusieurs.

⚠️ **Le pooler est obligatoire, pas une préférence.** L'hôte direct
`db.<ref>.supabase.co` n'a qu'un enregistrement **AAAA** : il est injoignable
depuis un réseau sans IPv6, et depuis Render. Vérifié, `ENOTFOUND`.

### La séquence retenue

Elle sépare volontairement deux risques au lieu de les prendre ensemble.

1. Poser le schéma sur Supabase :
   `prisma migrate deploy --schema=prisma/schema.postgres.prisma`.
2. Copier les données, puis comparer les comptes des deux côtés.
3. Faire pointer l'API **toujours en Oregon** sur Supabase. La latence sera
   mauvaise, c'est temporaire et volontaire : ça prouve que la migration des
   données est bonne avant qu'on touche aux régions. Retour arrière = une
   variable.
4. Une fois validé, recréer les deux services **à Francfort**. La région ne se
   change jamais après coup : « Render doesn't currently support changing the
   region for an existing service or database ». Nouveaux noms prévus,
   `bledigo-api-eu` et `bledigo-web-eu` — la doc ne garantit pas qu'un
   sous-domaine `onrender.com` se libère immédiatement, ne pas parier dessus.
5. Ajouter les nouvelles URL aux origines autorisées Google, vérifier, et
   **seulement là** supprimer l'ancien.

### Les outils, écrits et testés

Ils vivent dans le répertoire temporaire de la session, à recopier ailleurs
avant de s'en servir :

- `migrer-vers-supabase.js` — copie les 33 tables dans l'ordre des dépendances,
  calculé par tri topologique plutôt qu'écrit à la main (une liste figée se
  périme au premier modèle ajouté). Lecture seule sur la source, rejouable,
  `ON CONFLICT DO NOTHING`. **Il laisse les 7 réservations fantômes derrière
  lui**, ainsi que leurs paiements.
- `inventaire.js` — lignes par table, avant et après. La source contient
  **127 lignes sur 21 tables peuplées**, la copie prendra quelques secondes.
- `trouver-pooler.js` — retrouve le pooler d'un projet quand on n'a que sa
  référence et son mot de passe, la région n'étant exposée nulle part côté
  client.

---

## Les 7 réservations fantômes

Sur 9 réservations `confirmed` en production, **7 portent la signature du bug
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

La suppression est propre : 0 avis, 0 litige, 0 conversation, 0 état des lieux,
7 paiements en `CASCADE`. Le semis ne crée aucune réservation, donc rien ne les
recréera. **La migration s'en charge.**

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

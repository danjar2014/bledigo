# BlediGo — contexte de travail

Place de marché de location courte durée en Tunisie. Deux applications dans un
même dépôt, déployées sur Render depuis `render.yaml` (blueprint).

| | |
|---|---|
| API | `bledigo-api` — NestJS, Prisma, port 4000 en local (`PORT`, défaut de `main.ts`) |
| Front | `bledigo-web` — Next.js 14 App Router, TanStack Query, Zustand, Tailwind |
| Base | SQLite en local, PostgreSQL en production (`BlediGo_DB`, région **oregon**) |
| Dépôt | `github.com/danjar2014/bledigo`, branche `main` |
| Prod | `https://bledigo-api.onrender.com` · `https://bledigo-web.onrender.com` |

Le code, les commentaires et les messages de commit sont **en français**, sans
accents dans les fichiers `.sql` et `.bat` (encodage console Windows).

---

## Les pièges qui coûtent cher

Ces points ont déjà cassé la production. Ils ne s'improvisent pas.

### Le double schéma Prisma

`prisma/schema.prisma` (SQLite, développement) et
`prisma/schema.postgres.prisma` (PostgreSQL, production) doivent rester des
**copies strictes** l'une de l'autre — seul le `provider` diffère. Une
divergence ne se voit pas en local : elle sort en 24 erreurs TypeScript sur
Render, parce que le client Prisma y est généré depuis le schéma PostgreSQL.

Toute modification de modèle se fait **dans les deux fichiers**, sans exception.

### Une migration appliquée ne se réécrit jamais

`prisma/migrations/0_init` est appliquée en production. Prisma compare
l'empreinte de chaque migration déjà jouée : en réécrire une seule fait échouer
`migrate deploy`, et donc **tous** les déploiements suivants. Pour faire évoluer
le modèle, on ajoute un dossier de migration supplémentaire, jamais on ne touche
aux existants.

### `NODE_ENV=production` et les devDependencies

Sur Render, `npm ci` saute les devDependencies — or `nest`, `prisma`,
`typescript` et `tailwind` en font partie. D'où le `--include=dev` dans les deux
`buildCommand`. Sans lui le build échoue faute d'outils, pas faute de code, et
le message d'erreur ne le dit pas.

### `fromService` ne donne pas l'URL publique

Render n'expose que le nom d'hôte du réseau privé (`bledigo-api` tout court).
Les URL publiques sont donc écrites en dur dans `render.yaml`. Ne pas
« corriger » cela en `fromService` : le navigateur y perdrait le CORS et le
front un `Failed to fetch`.

### Les variables `NEXT_PUBLIC_` sont figées au build

Les renseigner dans Render ne suffit pas, il faut **reconstruire** le front.
Concerne aujourd'hui `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

### Une variable `sync: false` ajoutée après coup n'apparaît jamais

Render ne demande les valeurs `sync: false` qu'à la **création initiale** du
blueprint ; sur un blueprint existant, il les ignore à chaque sync. Ajouter une
telle variable dans `render.yaml` puis relancer Blueprint → Sync ne produit
rien, et ne produira jamais rien. Il faut la saisir à la main dans
`Environment`. La déclaration dans le fichier documente l'attendu et sert un
futur blueprint neuf — elle ne provisionne pas le service en place.

Une variable avec `value:` en clair, elle, est bien propagée par le sync : si
elle non plus n'apparaît pas, c'est que le service n'est pas rattaché au
blueprint.

### Le Shell Render est réservé aux offres payantes

Impossible d'y lancer une commande. Le semis de la base est donc dans le
`startCommand`, idempotent (upsert sur `email` et `slug`), rejoué à chaque
réveil du service.

Corollaire souvent oublié : **supprimer une ligne directement en base ne sert à
rien**, le semis suivant la recrée. Le bloc `update` des upsert est en revanche
rejoué à chaque démarrage — c'est le seul levier disponible pour corriger des
données déjà en production, et c'est par là que `prisma/seed.ts` ferme les
anciens comptes de démonstration.

---

## Décisions de conception à respecter

**Paiement direct pendant l'amorçage.** `PAIEMENT_EN_LIGNE=false` : aucun
montant ne transite par la plateforme, les coordonnées sont échangées après
acceptation de la demande. Tout le dispositif de paiement, validation, refus et
gel des fonds existe et reste branché — la variable le rallume sans
redéveloppement. Voir `src/common/mode-plateforme.ts`. Les crédits sont offerts
et la boutique est en sommeil, pas supprimée.

**Anti-collusion centré sur l'acteur, pas sur le duo.** Un hôte qui organise des
refus pour échapper à la commission change de complice : modéliser
l'affinité de paire passerait à côté. `src/bookings/refusal-guard.service.ts`
raisonne sur le taux de refus d'un même acteur rapporté à ses séjours aboutis
(fenêtre 180 j, seuil 2 refus, volume minimal 3). La sanction gèle les
versements tant qu'il reste des réservations à honorer, et ne bloque
complètement qu'une fois le carnet vide.

**Score de conformité recalculé à chaque événement.** L'extraction des
caractéristiques (`src/ai/features.service.ts`) est séparée du calcul
(`scoring.service.ts`, `MODELE = 'heuristique-v2'`), précisément pour qu'un
modèle appris remplace le second sans toucher au premier. L'historique est
archivé dans `ListingPassport.scoresHistory`.

**Recherche adossée au calendrier.** Les dates sont obligatoires ; la
disponibilité, la tarification par période et le séjour minimum viennent de
`src/listings/calendar.service.ts`. La liste des villes reste complète même sans
disponibilité — on affiche alors « pas de dispo, changez les dates » plutôt
qu'une liste vide.

**Authentification : email ou Google, comme Airbnb.** Le jeton Google est
vérifié côté serveur (`auth.service.ts:googleLogin`), avec deux contrôles non
négociables : l'audience doit être notre client ID, et l'adresse doit être
vérifiée. Le bouton se masque si `NEXT_PUBLIC_GOOGLE_CLIENT_ID` est absent.

**Le rattachement à un compte existant ferme le mot de passe non vérifié.**
L'inscription par mot de passe ne vérifie pas l'adresse (`verifyEmail` n'est
qu'une ébauche) : inscrire l'adresse d'un tiers avant lui le faisait atterrir,
à sa première connexion Google, dans un compte dont l'inscrivant gardait la
clé. Google prouve la propriété de l'adresse, le mot de passe préexistant non —
ce dernier est donc rendu inutilisable, et l'événement tracé dans `AuditLog`.
Un compte déjà `emailVerified` n'est pas touché : les comptes de démonstration
gardent leurs deux modes de connexion.

**Les adresses sont normalisées en minuscules.** L'index unique est sensible à
la casse sous PostgreSQL comme sous SQLite : sans cela `Ali@Gmail.com` et
`ali@gmail.com` sont deux comptes, et la connexion Google rate le compte
existant. Écriture en minuscules, lecture via `trouverParEmail` qui retombe sur
la forme exacte saisie pour ne pas fermer les comptes créés avant cette règle.
Pas de `mode: 'insensitive'` : SQLite ne le supporte pas, le client local
cesserait de compiler.

**Aucun mot de passe dans le dépôt, y compris de démonstration.** Le semis ne
crée un administrateur que si `ADMIN_EMAIL` et `ADMIN_PASSWORD` sont fournis, et
les comptes d'essai n'ont de mot de passe que via `DEMO_PASSWORD`. En
développement local, faute de ces variables, les comptes d'essai retombent sur
`Password123!` — cette valeur n'atteint jamais la production, où l'absence de
`DEMO_PASSWORD` donne des comptes sans connexion par mot de passe.

---

## Chantiers ouverts

- [ ] **Basculer `SEED_DEMO=false`** avant l'ouverture publique : les comptes
      d'essai restent volontairement actifs pour la recette. Le compte
      `admin@bledigo.com` et son `Password123!`, eux, sont déjà fermés par le
      semis à chaque démarrage.
- [ ] `verifyEmail`, `forgotPassword` et `resetPassword` renvoient `success:
      true` sans rien faire. Tant qu'ils sont des ébauches, aucune adresse n'est
      vérifiée et aucun mot de passe ne se récupère.
- [ ] `TrustIndicators` promet « Photos certifiées — prises par nos contrôleurs
      terrain » et « Emplacement garanti ». `src/media` expose bien un
      `presign`, mais il lève `Upload S3 non configure` hors mode simulé : la
      coquille existe, le raccordement S3 non. Soit on implémente, soit on
      retire la promesse.
- [ ] Vérifier en production s'il existe des adresses en casse mixte créées
      avant la normalisation : elles restent accessibles par mot de passe, mais
      une connexion Google créerait un second compte.
- [ ] Stockage des photos (S3 ou Cloudinary) — c'est le levier anti-collusion
      qui manque le plus.
- [ ] Cycle complet de négociation jamais testé de bout en bout.
- [ ] Les annonces existantes ne voient leur score bougé qu'à leur premier
      événement : pas de reprise de l'historique.
- [ ] `criteresEchoues` est collecté mais volontairement non utilisé dans le
      score, en réserve pour la phase d'apprentissage.

---

## Conventions

- Commentaires : expliquer **pourquoi**, pas quoi. Un commentaire qui paraphrase
  la ligne suivante est du bruit ; un commentaire qui dit quelle erreur il
  évite vaut de l'or.
- Messages de commit : première ligne courte, puis le raisonnement.
- Vérifier avant d'affirmer. Reproduire un bug hors du framework quand c'est
  possible (les erreurs de sérialisation et de scoring l'ont été).
- Ne jamais committer de secret. Les clés sont en `sync: false` dans
  `render.yaml` et saisies dans l'interface Render.

# BlediGo — contexte de travail

Place de marché de location courte durée en Tunisie. Deux applications dans un
même dépôt, déployées sur Render depuis `render.yaml` (blueprint).

| | |
|---|---|
| API | `bledigo-api` — NestJS, Prisma, port 4000 en local (`PORT`, défaut de `main.ts`) |
| Front | `bledigo-web` — Next.js 14 App Router, TanStack Query, Zustand, Tailwind |
| Base | SQLite en local, PostgreSQL **Supabase** en production (projet `sqessntpyqjdyunlhuxs`, région **eu-west-1**) |
| Services | `src/services` est découpé par métier : `providers/` (compte, zones, horaires), `vehicles/`, `bookings/`, `incidents/`, `reviews/`. Les dépendances vont dans un seul sens — les demandes connaissent la flotte et les prestataires, jamais l'inverse. |
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

### Les migrations doivent trier dans leur ordre de dépendance

`20260814_prestataires` crée la table `service_reviews` et son index unique ;
`20260814_avis_mutuels` supprime cet index. Or Prisma applique les migrations
par **ordre alphabétique**, et `avis` passe avant `prestataires`.

En production cela n'a jamais posé de problème : elles ont été déployées une par
une, à des jours d'intervalle, donc dans leur ordre chronologique réel. Le
défaut ne se voit que le jour où l'on reconstruit une base **à partir de zéro**
— `migrate deploy` échoue alors sur `index "service_reviews_service_booking_id_key"
does not exist`.

C'est arrivé à la migration vers Supabase, contournée par `prisma db push` (qui
dérive le schéma du datamodel sans rejouer l'historique) suivi d'une copie de
`_prisma_migrations`. Le schéma obtenu est exact : `migrate diff` entre le
datamodel et la base renvoie une migration vide.

**Rendre la migration tolérante ne marche pas**, et c'est la première idée qui
vient. Mettre `DROP INDEX IF EXISTS` ferait passer la première instruction, mais
la suivante crée un index **sur `service_reviews`**, table qui n'existe pas
encore à ce moment-là : la migration échouerait deux lignes plus bas. Et de toute
façon, modifier le contenu d'une migration déjà appliquée change son empreinte
SHA256, que Prisma compare à celle enregistrée dans `_prisma_migrations` — il
refuse alors de déployer. **Les deux voies « contenu » sont donc fermées.**

**Le vrai correctif reste le renommage**, et lui seul : la position d'une
migration ne dépend que de son nom de dossier. Renommer `20260814_avis_mutuels`
en `20260815_avis_mutuels` laisse le contenu — donc l'empreinte — intact, mais
casse l'appariement par nom : la production porte l'ancien nom, `migrate deploy`
verrait une migration inconnue et une migration disparue, échouerait, et l'API ne
démarrerait plus puisque cette commande précède `node dist/main` dans le
`startCommand`. Il faut donc renommer **et** corriger `migration_name` dans
`_prisma_migrations` avant le déploiement suivant.

**Pourquoi ce n'est pas fait** : le mode de défaillance est « la production ne
peut plus jamais déployer », et il n'existe aucun Postgres sur le poste de
travail — ni `psql`, ni Docker, ni instance locale — pour le vérifier avant de
pousser. La correction attend une base d'essai jetable. Ne pas l'improviser.

#### Construire une base neuve aujourd'hui

L'historique n'est pas rejouable, mais une base neuve se construit très bien en
partant du **datamodel** plutôt que de l'historique. C'est le procédé de
référence documenté par Prisma pour un historique non rejouable.

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.postgres.prisma --script > baseline.sql
```

Appliquer `baseline.sql` sur la base vide, puis marquer chaque migration comme
appliquée pour que les déploiements suivants repartent de l'état courant :

```bash
for m in prisma/migrations/2026*; do npx prisma migrate resolve --applied "$(basename "$m")" --schema=prisma/schema.postgres.prisma; done
```

Le fichier n'est **volontairement pas versionné** : un instantané se périme dès
que le schéma bouge, et une référence périmée construirait une base fausse sans
rien signaler — pire que le défaut qu'elle soigne. On régénère, on ne conserve
pas.

Vérification : `migrate diff` entre le datamodel et la base obtenue doit rendre
une migration vide. C'est ce qui a été constaté lors de la migration vers
Supabase.

Règle à tenir : **nommer toute nouvelle migration de façon qu'elle trie après
toutes celles dont elle dépend.** Un horodatage complet suffit.

### La région se choisit à la création, et ne se change jamais

Vrai pour un service Render comme pour une base : « Render doesn't currently
support changing the region for an existing service or database ». Se tromper
oblige à **recréer**, donc à changer les URL publiques, les origines Google et
le CORS.

Ce qui compte n'est pas la distance à l'utilisateur mais celle entre **l'API et
la base** : une requête HTTP en fait plusieurs en séquence. Mesuré depuis la
France : 172 ms d'aller-retour SQL vers l'Oregon, 24 ms vers l'Irlande. Une API
en Oregon devant une base européenne paierait ~140 ms **par requête Prisma**,
soit près d'une seconde sur une page qui en enchaîne cinq.

Corollaire : ne jamais créer une base « quelque part » puis y brancher l'API.
On choisit la région de la base **d'après** celle de l'API, ou l'inverse, mais
jamais séparément.

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

### `DATABASE_URL` ne passe plus par le blueprint

La base a quitté Render pour Supabase. `DATABASE_URL` est désormais `sync: false`
dans `render.yaml` et **saisie à la main** dans Environment : la déclaration sert
à dessaisir le blueprint d'une variable qu'il provisionnait, sans quoi le
prochain sync ramènerait l'API sur `BlediGo_DB`, supprimée depuis.

Deux contraintes sur cette URL. Elle doit passer par le **pooler partagé**
`...pooler.supabase.com` : l'hôte direct `db.<ref>.supabase.co` n'a qu'un
enregistrement **AAAA**, injoignable depuis Render qui ne sort qu'en IPv4. Et
par le **port 5432** (session), jamais 6543 (transaction) : Prisma a besoin
d'une connexion de session pour jouer ses migrations au démarrage.

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

**L'acceptation appartient à l'hôte, et à lui seul.** Une demande naît en
`pending` et n'en sort que par `bookings.confirm`, qui vérifie que l'appelant
est bien l'hôte — ou d'emblée si celui-ci a coché `instantBook`, seul
contournement légitime puisqu'il y renonce explicitement. Rien d'autre ne doit
faire basculer ce statut : c'est l'acceptation qui déclenche l'échange des
coordonnées (`avecContact`), et tout raccourci livre l'email de l'hôte à
quiconque clique sur « Réserver ».

Le raccourci a déjà existé : créer une intention de paiement confirmait la
réservation au passage, héritage de l'époque où la plateforme tenait l'argent
et où payer valait acceptation. Le front appelait cette route juste après la
création, donc **toute** demande s'acceptait seule. En paiement direct il n'y a
plus rien à bloquer — la route n'est plus appelée, et elle ne confirme plus
rien.

**Une absence à l'arrivée exige deux signaux qui ne viennent pas de la même
main.** Sans paiement en ligne, la seule sanction possible porte sur le compte
du voyageur — elle ne peut donc pas reposer sur la parole de l'hôte, qui a
intérêt à libérer ses dates, ni sur l'absence de check-in, que l'hôte seul
déclenche. Le voyageur déclare son arrivée (`POST /bookings/:id/arrivee`),
l'hôte déclare l'absence (`POST /bookings/:id/absence`) et seulement après un
délai de grâce de 24 h. Les deux se contredisent : aucune sanction, la
déclaration de l'hôte est comptée contre lui. Une absence déjà établie reste
contestable — fermer la réservation donnerait raison au premier qui parle. Les
sanctions déjà appliquées ne se lèvent qu'en administration, volontairement à
la main. Voir `src/bookings/no-show-guard.service.ts`, qui reprend la forme de
`refusal-guard` : acteur récurrent, taux rapporté aux séjours aboutis, fenêtre
de 180 jours.

**Le profil de location ordonne, il n'exclut jamais.** Un hôte qui vise la
longue durée n'a pas refusé les séjours courts, il a exprimé une préférence :
`profilAdapte` remonte les annonces faites pour la durée demandée et signale la
correspondance, sans retirer personne des résultats. Un tri explicite du
visiteur reste prioritaire et écrase cet ordre.

**Une extension appartient à l'hôte, comme la réservation initiale.** Prolonger
un séjour ajoute des nuits sur ses dates : `POST /bookings/:id/extension`
enregistre une demande, l'hôte l'accorde ou la refuse, et seul `instantBook`
court-circuite — il y a explicitement renoncé.

Deux points qui ne s'improvisent pas. Le **prix est figé à la demande** : c'est
le montant que le voyageur a vu, et le recalculer à l'acceptation laisserait
l'hôte modifier ses tarifs entre-temps. La **disponibilité, elle, est
revérifiée** au moment d'accorder : entre la demande et la réponse, un autre
voyageur a pu prendre ces nuits, et accepter sur la foi du devis les vendrait
deux fois. Ni ménage ni frais de service ne sont recomptés — ils valent pour un
séjour, pas pour une nuit. `minNights` n'est pas opposé à l'extension : il borne
la durée d'un séjour, or le séjour s'allonge.

**Les dates de séjour sont des `YYYY-MM-DD` à minuit UTC.** Toute arithmétique
en heure locale suivie d'un `toISOString()` décale d'un jour hors UTC : le
composant d'extension a fait exactement cette erreur, invisible au premier essai
et visible dès qu'on regarde depuis Paris. Manipuler ces dates avec
`setUTCDate`, ou par découpe de chaîne.

**Les conditions d'annulation sont servies avant l'annulation.** Le bloc
`annulation` de chaque réservation dit le délai, la date limite et si l'on est
déjà au-delà. Une sanction qu'on découvre après coup n'est pas une sanction,
c'est une surprise — et elle est inopposable.

**Un compte prestataire ne s'attribue pas, il se constate.** `provider` est
volontairement hors de `SELF_ASSIGNABLE_ROLES` : en phase 1, l'administration
crée le compte après avoir constaté le statut d'agence, et le mot de passe
initial n'est affiché **qu'une fois**. Ce détour existe parce que ni l'envoi
d'email ni la réinitialisation ne sont branchés — d'où `regenererMotDePasse`,
seule voie de récupération. Une ouverture par abonnement et vérification
automatique remplacerait cette porte d'entrée sans toucher au modèle, mais elle
est **en sommeil** : la monétisation est reportée sans échéance, et ce détour
manuel est donc le fonctionnement durable, pas un provisoire. Un compte `pending` peut
se connecter mais ne peut rien publier.

**Un sinistre se constate, il ne sanctionne pas.** Une agence qui déclare un
dommage récupère une caution : c'est exactement le genre d'intérêt qui interdit
de la croire sur parole, et le projet a déjà tranché ce point pour les absences
à l'arrivée. `VehicleIncident` est donc **consigné, visible sur la fiche du
client, et contestable** — jamais suspensif par lui-même. Déclarable une fois le
véhicule restitué et dans les 7 jours (au-delà, il a pu être reloué, plus rien
ne rattache le dommage à *ce* client) ; contestable sous 14 jours à compter de
la déclaration, pas de la fin de location — on ne conteste pas ce dont on n'a
pas été informé. Contester n'efface pas la déclaration, cela l'oppose : les deux
versions restent lisibles, et seule l'administration arbitre.

Un sinistre contesté reste **affiché** sur la fiche du client. L'information
utile au prestataire suivant est qu'il y a eu désaccord, pas seulement qui a eu
gain de cause.

**Le prestataire décide en sachant qui il accepte.** Il acceptait à l'aveugle :
le nom n'apparaissait qu'après l'acceptation, c'est-à-dire après la décision.
`GET /prestataire/demandes/:id/client` sert l'historique, la note reçue *en tant
que client*, les sinistres et l'ancienneté — **sans coordonnées tant que la
demande est `pending`**. De quoi décider, pas de quoi démarcher : c'est toute la
différence entre une place de marché et un annuaire à aspirer.

**L'acceptation d'un tarif est symétrique.** Chacun accepte le dernier chiffre
de l'**autre** camp : le prestataire prend `proposedPrice`, l'hôte prend
`counterPrice`. Une acceptation réservée au prestataire laisserait sa
contre-proposition sans issue — il ne peut pas accepter son propre prix. La
négociation est bornée à trois propositions tous camps confondus, sinon une
demande reste ouverte indéfiniment et le créneau est bloqué pour rien. À
l'acceptation, le montant est recopié dans `price` et **figé** : toute
renégociation ultérieure est refusée.

**La zone d'une prestation vient du logement, jamais du client.** `city` et
`region` sont recopiés de l'annonce côté serveur ; accepter ces champs dans le
corps de la requête permettrait d'annoncer une zone qui n'est pas celle du bien,
et de faire déplacer quelqu'un pour rien. Seuls le quartier et la précision
d'accès sont saisis.

**Le créneau passe par `startDate` et `endDate`**, qui portent déjà l'heure.
Deux colonnes `startTime`/`endTime` auraient dit la même chose et pu la
contredire. Corollaire d'affichage : ne montrer l'heure que pour le **ménage** —
sur une location, ce sont des minuits UTC convertis, et `02:00–02:00` se lit
comme un bogue.

**Les photos ne transitent jamais par l'API.** `src/media` signe une URL
d'envoi Supabase valable une fois et dix minutes ; le navigateur téléverse
directement. Faire passer des fichiers par une instance gratuite à 512 Mo serait
la meilleure façon de la faire tomber. Sans `SUPABASE_URL` ni
`SUPABASE_SERVICE_KEY`, le service bascule en **mode simulé** et rend une image
de substitution — le développement local n'a rien à configurer, mais une
production sans ces variables affiche des photos qui n'existent pas.

**Une zone se déclare, elle ne se déduit pas d'un cercle.** Le rayon en
kilomètres ne dit pas ce qu'une entreprise dessert : 60 km autour de Tunis
englobe des localités qu'on ne servira jamais et en exclut d'autres qu'on sert
très bien parce qu'il y a une autoroute. `ProviderZone` porte des villes du
référentiel `common/localities` — la saisie libre ferait coexister « La Marsa »
et « Marsa », et le rapprochement échouerait sans que personne comprenne
pourquoi. **Pas de carte** : une liste se manipule au clavier et depuis un
téléphone, et une carte donnerait un point, pas une ville.

Repli assumé : un prestataire qui n'a déclaré **aucune** zone reste filtré au
rayon. Mettre la règle en service ne doit pas faire disparaître du jour au
lendemain les comptes antérieurs. Même principe pour les horaires.

**Un prestataire travaille à des HEURES, pas à des jours.** Trois choses
l'écartent d'une demande, et il faut les trois : le créneau sort de ses horaires
déclarés, il est en absence, ou il a déjà une prestation qui chevauche. Ce
dernier point est ce que « il ne doit plus être proposé une fois qu'il a validé »
veut dire concrètement — accepter occupe le créneau. Les heures sont stockées en
`"HH:MM"` et non en `DateTime` : elles n'ont pas de date, et un timestamp
obligerait à en inventer une, avec son fuseau et ses surprises au changement
d'heure.

**Un ménage suit un départ.** Les dates proposées à l'hôte viennent des
`checkOut` à venir de son logement : lui faire ressaisir des dates que la
plateforme connaît déjà, c'est lui faire recopier son calendrier et lui offrir
une occasion de se tromper d'un jour. Plusieurs dates donnent plusieurs
prestations **distinctes** — un prestataire peut être libre mardi et pris jeudi,
et une demande groupée l'obligerait à tout refuser pour une seule date gênante.

**Pas d'API tierce pour le catalogue véhicules.** NHTSA vPIC, la seule gratuite
et sans clé, a été essayée : interrogée sur Renault elle rend LeCar, Fuego,
Alliance, Encore et 18i — le marché américain des années 80 — et ne fournit ni
carburant, ni puissance, ni année. `vehicles/catalogue.ts` embarque 25 marques
du parc tunisien : réponse instantanée, aucune dépendance qui tombe. Il
**suggère sans interdire**, les champs restent libres.

**Ne pas transposer `refusal-guard` aux prestataires.** Toute sa logique repose
sur l'idée que le duo qui se répète est suspect. Pour un prestataire, **le duo
qui se répète est le cas sain** — un hôte fidèle à sa femme de ménage. Copier ce
modèle signalerait tous les prestataires honnêtes.

**Anti-collusion centré sur l'acteur, pas sur le duo.** Un hôte qui organise des
refus pour échapper à la commission change de complice : modéliser
l'affinité de paire passerait à côté. `src/bookings/refusal-guard.service.ts`
raisonne sur le taux de refus d'un même acteur rapporté à ses séjours aboutis
(fenêtre 180 j, seuil 2 refus, volume minimal 3). La sanction gèle les
versements tant qu'il reste des réservations à honorer, et ne bloque
complètement qu'une fois le carnet vide.

**Pas de visites de contrôle terrain.** Le modèle reposait sur des agents
envoyés vérifier les logements : zéro visite, zéro compte agent, et un coût de
fonctionnement que rien ne justifiait. Le rôle `agent`, la table
`control_visits` et l'endpoint associé sont supprimés. La confiance vient des
notes, des séjours validés et du volume — et d'un modèle appris en phase 2.

Conséquence à ne pas rater si on remanie le score : les visites valaient jusqu'à
**20 points de sécurité**, donc inatteignables une fois le modèle abandonné.
Tout logement plafonnait à `40 + certification` et perdait 8 points de confiance
pour une raison qui n'existait pas. Elles sont remplacées par les séjours
validés par leur voyageur — le même constat, fait par quelqu'un qui était sur
place. `MODELE` est passé en `heuristique-v3` : un score archivé doit rester
interprétable.

**Pas de photos certifiées non plus.** Même piège que les visites, laissé une
ligne au-dessus : `isCertified` n'est écrit **nulle part** dans l'application —
le seul point d'écriture du dépôt est `prisma/seed.ts`, pour la démonstration.
Ni route d'administration, ni agent. `photosCertifiees` valait donc 0 pour toute
annonce réelle, et ses 20 points de sécurité étaient inatteignables. `MODELE`
passe en `heuristique-v4`.

Rien ne les remplace, délibérément : compter les photos brutes récompenserait
trois clics, et ce sont aujourd'hui des images de stock. Un point ne se donne
que pour un fait constaté. La sécurité plafonne désormais à exactement 100
(40 + 40 + 20) au lieu de 120 écrêtés — deux annonces différentes ne se
retrouvent plus à égalité par troncature. La variable reste **collectée** par
`FeaturesService`, comme `criteresEchoues` : on cesse de la noter, pas de
l'observer.

La règle générale, maintenant qu'elle s'est vérifiée deux fois : **avant
d'ajouter un terme au score, chercher qui écrit la donnée.** Si personne ne
l'écrit, le terme est un plafond que personne n'atteindra.

**Score de conformité recalculé à chaque événement.** L'extraction des
caractéristiques (`src/ai/features.service.ts`) est séparée du calcul
(`scoring.service.ts`), précisément pour qu'un modèle appris remplace le second
sans toucher au premier. L'historique est archivé dans
`ListingPassport.scoresHistory`. `calculer()` est une fonction pure et
`scoring.service.spec.ts` la tient : le test qui épingle l'absence de points
pour une photo certifiée devra être supprimé volontairement le jour où une
certification existera, plutôt que la formule modifiée par distraction.

**Ne rien promettre que le code ne tienne.** Trois affirmations ont été retirées
de l'interface parce que rien ne les soutenait : des logements « vérifiés par
nos agents » (le modèle a été abandonné, aucun compte agent n'a jamais existé),
des « photos certifiées, prises par nos contrôleurs terrain » (voir ci-dessus),
et un « emplacement garanti, GPS vérifié » alors que `listings.service.ts` fait
`latitude: dto.latitude ?? locality.lat` — c'est le centre de la ville déclarée.
Une promesse invendable est pire qu'une promesse absente : le voyageur qui la
découvre fausse cesse de croire les autres, y compris les vraies.

Reste dans le même esprit, non traité : `Hero.tsx` annonce « 500+ logements
certifiés » et « 98 % de satisfaction » sur une place de marché qui compte sept
annonces.

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
- [ ] Réservations confirmées avant le correctif d'acceptation : elles sont
      restées `confirmed` sans qu'aucun hôte ne les ait acceptées, et les
      coordonnées ont déjà été échangées. Décider si on les repasse en
      `pending` — modification de données de production.
- [ ] Les annonces existantes ne voient leur score bougé qu'à leur premier
      événement : pas de reprise de l'historique.
- [ ] `criteresEchoues` est collecté mais volontairement non utilisé dans le
      score, en réserve pour la phase d'apprentissage.
- [ ] Connexion Google jamais testée de bout en bout avec un vrai compte.
      L'écran de consentement est en mode *Testing* : seuls les comptes listés
      en *test users* peuvent entrer. Passer en *In production* avant
      l'ouverture, sinon les clients sont refusés sans message compréhensible.

---

## Demandé, pas encore planifié

Fonctionnalités décidées mais volontairement non entamées. Les notes qui
suivent ne sont pas des spécifications : ce sont les pièges repérés en lisant
le code existant, pour que la mise en œuvre ne les redécouvre pas.

- [ ] **Majoration si le séjour est raccourci.** Optionnelle, à la main de
      l'hôte. Exigible seulement quand `PAIEMENT_EN_LIGNE=true` : sans
      encaissement, une majoration n'est qu'une phrase.

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

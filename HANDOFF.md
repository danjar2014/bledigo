# Passation — BlediGo

Rédigé le 17/08/2026. Ce document dit **où en est le projet**, ce qui bloque, et
ce qui attend une décision. Il ne répète pas `CLAUDE.md`, qui contient
l'architecture, les pièges de production et les décisions de conception à
respecter — lire celui-là d'abord.

---

## À FAIRE EN PREMIER : un commit poussé mais non déployé

Le commit **`47a35a5`** est sur GitHub, `origin/main == HEAD`, rien en attente
localement. Mais **Render ne l'a pas déployé** : le dernier déploiement de
`bledigo-api` porte encore `36151ed`, et la dernière migration appliquée en base
est `20260814_personne_physique`.

Les trois commits précédents s'étaient déployés seuls en deux minutes. Celui-ci
n'a rien déclenché — webhook GitHub manqué, ou file d'attente Render.

**Ce qui n'est donc pas en ligne :** l'abandon des visites de contrôle terrain
(rôle `agent`, table `control_visits`), le score en `heuristique-v3`, et le
bandeau de candidatures dans l'administration.

Marche à suivre : Render → `bledigo-api` → *Manual Deploy* → *Deploy latest
commit*, puis vérifier dans les logs de démarrage que `migrate deploy` applique
`20260817_abandon_visites_terrain`.

⚠️ **Ce déploiement contient un `DROP TABLE`** sur `control_visits`. La table a
été vérifiée à **0 ligne** en production avant l'écriture de la migration, et
rien ne l'alimentait. Le risque est théorique, mais la vérification mérite d'être
refaite avant de lancer :

```sql
SELECT count(*) FROM control_visits;
```

Et regarder pourquoi l'auto-déploiement a sauté ce commit : sans cela, le
prochain push sera lui aussi silencieusement ignoré.

---

## Ce qui a été fait

21 commits, 62 fichiers, +5699 / −169. Les tests passent de 47 à **65**, en 13
suites.

### Corrections de production

| Ce qui cassait | État |
|---|---|
| **Toute réservation s'auto-confirmait** et livrait l'email de l'hôte à qui cliquait « Réserver » | corrigé |
| `admin@bledigo.com` / `Password123!` **actif sur une URL publique**, recréé à chaque réveil du service | fermé par le semis |
| **Reprise de compte** : inscrire l'adresse d'un tiers avant lui le faisait atterrir dans un compte dont on gardait la clé | fermé |
| **Le semis plantait en silence** (`P2002` sur le téléphone) dès qu'on changeait l'adresse de démonstration | corrigé |
| Alertes de la cloche pointant `/reservations` en dur | pointent la réservation |
| Identifiant Google jamais provisionné (piège `sync: false`) | en clair dans le blueprint |

### Fonctionnalités livrées

- **Options de l'hôte** : canal WhatsApp ou téléphone, horizon de réservation,
  profil de location (court / moyen / long), délai d'annulation.
- **Double signal à l'arrivée** : le voyageur déclare son arrivée, l'hôte déclare
  l'absence après 24 h de grâce. Contradiction = aucune sanction.
- **Prestataires de services**, périmètre 1 complet : agences de location de
  voitures et ménage/entretien, ce dernier ouvert aux **personnes physiques**.
  Candidature publique, validation par l'administration, espace prestataire,
  flotte, calendrier, demandes, notation mutuelle.

### Sept migrations, toutes dans le dépôt

`0_init` · `20260812_calendrier` · `20260813_options_hote` ·
`20260814_prestataires` · `20260814_avis_mutuels` ·
`20260814_personne_physique` · `20260817_abandon_visites_terrain`

Les cinq premières sont appliquées en production. La dernière attend le
déploiement ci-dessus.

---

## Décisions qui attendent

**Les 7 réservations auto-confirmées avant correctif.** Sur 8 réservations
`confirmed` en production, 7 portent la signature du bug — confirmées en moins
d'une seconde, avec un paiement `held`. Elles concernent deux comptes qui se
réservaient mutuellement, donc aucune coordonnée de tiers n'a fuité.
Recommandation : les supprimer plutôt que les repasser en `pending`, elles
polluent le dénominateur des deux gardes anti-fraude. **Modification de données
de production, non faite sans accord.**

**`SEED_DEMO=false` avant l'ouverture publique.** Les comptes d'essai restent
volontairement actifs pour la recette.

**Le bloc « Comptes de démonstration » de la page de connexion** affiche encore
`admin@bledigo.com` et `Password123!` — des identifiants morts qui signalent au
monde l'existence d'un compte administrateur. À retirer en même temps que
`SEED_DEMO`.

**`belhassen.france@gmail.fr`**, second compte admin : aucun compte Google
n'existe en `@gmail.fr`. La connexion par mot de passe fonctionne, mais le bouton
Google ne correspondra jamais à cette adresse.

---

## Ce qui n'existe pas, et qu'il faut savoir

**`verifyEmail`, `forgotPassword`, `resetPassword` renvoient `success: true` sans
rien faire.** Aucune adresse n'est vérifiée, aucun mot de passe ne se récupère.
C'est la raison de fond pour laquelle tout compte prestataire passe par
l'administration, et pourquoi le mot de passe initial ne s'affiche qu'une fois.

**Aucune alerte de nouvelle candidature.** Le bandeau du back-office compte les
demandes en attente, mais il faut ouvrir `/admin` pour le voir. La cloche ne
couvre pas l'administration.

**Le stockage des photos n'est pas raccordé.** `src/media` expose un `presign`
qui lève `Upload S3 non configure` hors mode simulé. Conséquence sur le score :
`photosCertifiees` vaut 0 partout, soit 20 points de sécurité inatteignables —
exactement le même piège que les visites de contrôle qu'on vient de retirer.
`TrustIndicators` promet pourtant « Photos certifiées ».

**L'écran de consentement Google est en mode *Testing*.** Seuls les comptes
listés en *test users* peuvent se connecter. Passer en *In production* avant
l'ouverture, sinon les clients sont refusés sans message compréhensible.

---

## Chantiers ouverts

Consignés dans `CLAUDE.md`, section « Demandé, pas encore planifié » :

- Extension d'un séjour en cours (rejouer le chevauchement, retarifer).
- Majoration si le séjour est raccourci — exigible seulement avec le paiement.

Et pour la suite du dispositif de confiance : la certification est aujourd'hui
attribuée à la main depuis le back-office, alors que la direction retenue est de
la faire découler des notes, des séjours validés et du volume, puis d'un modèle
appris en phase 2. Le journal nécessaire existe déjà —
`ListingPassport.scoresHistory` archive variables et scores à chaque recalcul.

---

## Comment vérifier que ça marche

Aucune affirmation de ce document n'a été faite sans preuve. Les moyens utilisés,
pour les reproduire :

```bash
# API et front en local
cd bledigo-api && npm run start      # port 4000
cd bledigo-web && npm run dev        # port 3000

# Tests
cd bledigo-api && npx jest

# Base locale après changement de schéma
npx prisma db push --schema=prisma/schema.prisma

# Vérifier une migration AVANT de l'écrire, sans PostgreSQL local
npx prisma migrate diff --from-schema-datamodel <ancien> \
  --to-schema-datamodel prisma/schema.postgres.prisma --script
```

Le MCP Render permet d'interroger la base de production en lecture seule : c'est
ainsi que l'état réel des comptes, des migrations et des réservations a été
constaté plutôt que supposé.

Piège rencontré plusieurs fois : une instance d'API lancée **avant** une
modification tient le port 4000 et répond `200`. La tester valide du code
périmé. Tuer le processus avant de relancer.

# BlediGo

Place de marché tunisienne de location courte durée. Deux mécaniques cohabitent :
la recherche classique d'un logement, et la **recherche inversée**, où le voyageur
publie son besoin et où les propriétaires de la zone viennent lui faire une offre.

## Déploiement

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/danjar2014/bledigo)

Le blueprint `render.yaml` monte l'API et le front, et les raccorde à la base
PostgreSQL `BlediGo_DB`. Marche à suivre et limites connues : [DEPLOIEMENT.md](DEPLOIEMENT.md).

## Architecture

| Dossier | Rôle | Pile |
| --- | --- | --- |
| `bledigo-api` | API REST, règles métier, persistance | NestJS, Prisma, PostgreSQL (SQLite en local) |
| `bledigo-web` | Interface publique et espaces voyageur / hôte | Next.js 14 App Router, Tailwind, TanStack Query, Leaflet |

**Deux schémas Prisma coexistent.** `schema.prisma` cible SQLite pour le
développement local sans installation ; `schema.postgres.prisma` cible la
production et en est une **copie stricte**, à la ligne `provider` près. Faire
diverger les deux fait compiler le code en local et échouer le déploiement :
c'est déjà arrivé sur 94 champs. Modifiez `schema.prisma`, puis recopiez-le.

## Développement local

```
installer-deps.bat     installe les dépendances des deux projets
maj-base.bat           régénère le client Prisma et applique le schéma SQLite
demarrer.bat           lance l'API (port 4000) et le front (port 3000)
diagnostic.bat         écrit un état des lieux dans diagnostic.log
```

L'API expose sa documentation OpenAPI sur `/api/docs` et un point de santé
sur `/health`.

## Partis pris

**Aucune coordonnée personnelle ne circule.** Les messages d'offre sont composés
à partir d'un catalogue fermé, et tout texte libre (titre, description d'une
demande) passe par un filtre anti-fraude. Laisser un hôte écrire son numéro
ferait sortir la réservation de la plateforme : plus de paiement bloqué, plus de
recours en cas de litige.

**Les crédits se consomment au déblocage, pas à l'affichage.** Un hôte voit
gratuitement les demandes de sa zone, en version tronquée ; il ne paie que pour
ouvrir celle qui l'intéresse. Le déblocage est idempotent, rafraîchir la page ne
coûte rien.

**Le périmètre d'un hôte est déduit de ses annonces.** Un propriétaire de Djerba
ne voit pas les demandes de Tunis. Les villes sont choisies dans un référentiel
de 55 localités, jamais saisies librement, sans quoi la correspondance entre
demande et zone serait illusoire.

**La négociation est bornée.** Le voyageur peut accepter, refuser ou faire une
contre-proposition ; l'échange revient toujours à lui pour validation finale, et
s'arrête au bout de trois allers-retours.

## Ce qui n'est pas encore branché

Stockage des photos, paiements Stripe, notifications email et SMS, fonds de carte
de production et taux de change réels. Chacun de ces modules démarre en mode
simulé tant que sa clé n'est pas fournie — l'application tourne, mais ces
fonctions ne produisent aucun effet externe. Détail dans
[DEPLOIEMENT.md](DEPLOIEMENT.md).

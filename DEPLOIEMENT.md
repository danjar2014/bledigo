# Déploiement de BlediGo sur Render

Deux services — l'API NestJS et le front Next.js — raccordés à la base
PostgreSQL **BlediGo_DB** déjà créée dans l'espace de travail Render.
Tout est décrit dans `render.yaml` : Render lit ce fichier et monte l'ensemble
en une fois.

Le code est sur GitHub, la migration initiale est générée et commitée. Il ne
reste que l'étape 1 ci-dessous.

---

## 1. Créer le blueprint sur Render

Dans Render : **New → Blueprint**, choisir le dépôt `danjar2014/bledigo`,
puis **Apply**.

Render détecte `render.yaml` et crée les deux services. Au premier déploiement :

- l'URL de connexion de **BlediGo_DB** est injectée dans l'API ;
- les deux secrets JWT sont générés par Render, ils ne transitent jamais par le dépôt ;
- l'API reçoit l'URL du front pour CORS, le front reçoit celle de l'API ;
- `prisma migrate deploy` crée les 27 tables au démarrage de l'API.

L'ordre compte peu : Render résout les dépendances entre services.

**Prérequis unique :** la base doit s'appeler exactement `BlediGo_DB`. Le
blueprint la référence par son nom sans la déclarer — sinon il en créerait une
seconde. Si le nom diffère, corriger `render.yaml` (clé `fromDatabase.name`),
faute de quoi la synchronisation échoue avec une erreur de référence.

## 2. Après le premier déploiement

L'API répond sur `/health` et expose sa documentation sur `/api/docs`.

La base est **vide** : aucun compte n'existe. Créez le premier via la page
d'inscription du front. Pour injecter le jeu de démonstration à la place,
lancez une fois depuis le shell Render de l'API :

```
npx prisma db seed
```

---

## Points à connaître

**Les données locales ne sont pas transférées.** Le SQLite de développement
reste sur votre poste. Annonces, demandes et comptes sont à recréer.

**Le développement local reste en SQLite.** Deux schémas coexistent :
`schema.prisma` pour votre poste, `schema.postgres.prisma` pour la production.
Toute modification du modèle doit être portée dans les deux, sinon la
production divergera silencieusement.

**Les variables `NEXT_PUBLIC_` sont figées à la compilation.** Changer l'URL de
l'API impose de reconstruire le front, pas seulement de le redémarrer.

**Le plan gratuit met les services en veille** après une période d'inactivité :
la première requête peut prendre une trentaine de secondes. Acceptable pour une
démonstration, pas pour de vrais utilisateurs.

## Ce qui reste à faire avant une vraie mise en service

**Stockage des photos.** L'envoi d'images n'est pas implémenté : les visuels
sont des URL de remplacement. Le disque de Render étant éphémère, il faut un
stockage externe (S3 ou Cloudinary, déjà autorisés dans `next.config.js`).

**Paiements.** Sans `STRIPE_SECRET_KEY`, le module tourne en mode simulé : les
réservations se créent mais aucun montant n'est réellement bloqué.

**Notifications.** Sans `SENDGRID_API_KEY` ni Twilio, aucun email ni SMS n'est
envoyé — les offres et validations ne sont visibles que dans l'interface.

**Fonds de carte.** La carte utilise les tuiles OpenStreetMap, dont la politique
d'usage ne couvre pas un trafic de production. Prévoir un fournisseur dédié.

**Taux de change.** Les taux de `src/lib/currency.ts` sont fixes et servent
uniquement à l'affichage. À brancher sur une source réelle avant de communiquer
des prix en euros ou en dollars.

# Déploiement de BlediGo sur Render

Trois ressources : une base PostgreSQL managée, l'API NestJS, le front Next.js.
Tout est décrit dans `render.yaml` — Render lit ce fichier et crée l'ensemble
en une fois.

---

## 1. Générer la migration PostgreSQL (une seule fois, en local)

Render applique les migrations au démarrage avec `prisma migrate deploy`, qui
exige un dossier `prisma/migrations`. Le projet n'en avait pas : on travaillait
en `db push`, pratique en développement mais dangereux en production, où chaque
mise en ligne risquerait d'effacer des données.

Double-clic sur **`preparer-migration.bat`**. Il crée
`bledigo-api/prisma/migrations/0_init/migration.sql` à partir du schéma
PostgreSQL. Le compte rendu s'écrit dans `preparer-migration.log`.

Ce dossier **doit être commité** : c'est lui qui construit la base en production.

## 2. Pousser sur GitHub

```
git add -A
git commit -m "Preparation du deploiement Render"
git remote add origin <URL de votre depot>
git push -u origin main
```

## 3. Créer le blueprint sur Render

Dans Render : **New → Blueprint**, sélectionner le dépôt. Render détecte
`render.yaml` et propose les trois ressources. Valider.

Au premier déploiement :

- la base PostgreSQL est créée et son URL injectée dans l'API ;
- les deux secrets JWT sont générés par Render, ils ne transitent jamais par le dépôt ;
- l'API reçoit l'URL du front pour CORS, le front reçoit celle de l'API.

L'ordre compte peu : Render résout les dépendances entre services.

## 4. Après le premier déploiement

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

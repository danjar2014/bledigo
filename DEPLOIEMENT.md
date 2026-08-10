# Déploiement de BlediGo sur Render

Trois ressources décrites dans `render.yaml` : la base PostgreSQL
**BlediGo_DB**, l'API NestJS et le front Next.js. Render lit ce fichier et
monte l'ensemble en une fois.

---

## 1. Créer le blueprint sur Render

Dans Render : **New → Blueprint**, choisir le dépôt `danjar2014/bledigo`,
puis **Apply**.

Au premier déploiement :

- la base est créée et son URL de connexion injectée dans l'API ;
- les deux secrets JWT sont générés par Render, ils ne transitent jamais par le dépôt ;
- l'API reçoit l'URL du front pour CORS, le front reçoit celle de l'API ;
- `prisma migrate deploy` crée les 27 tables au démarrage de l'API.

L'ordre compte peu : Render résout les dépendances entre ressources.

**La région est le piège principal.** Le réseau privé de Render ne franchit
pas les frontières de région : une base à Francfort et des services en Oregon
donnent un `P1001 Can't reach database server` au démarrage, alors que l'URL
de connexion est pourtant juste. Base et services doivent partager la même
région — et cette valeur est **figée à la création**, la changer impose de
supprimer puis recréer la ressource.

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

**Le développement local reste en SQLite.** Deux schémas coexistent, mais
`schema.postgres.prisma` est désormais une **copie stricte** de
`schema.prisma` : seule la ligne `provider` diffère. Pour faire évoluer le
modèle, modifiez `schema.prisma` puis recopiez-le en changeant le provider.

Cette contrainte n'est pas cosmétique. Les deux schémas avaient divergé —
`Decimal` et enums natifs côté PostgreSQL, `Float` et `String` côté SQLite —
sur 94 champs. Le code compilait en local et cassait au déploiement avec des
dizaines d'erreurs de type. Un typage identique supprime cette classe entière
de pannes.

En contrepartie, la production stocke les montants en `DOUBLE PRECISION` et
les statuts en `TEXT`. Les valeurs autorisées sont contrôlées par les DTO de
l'API, non par la base. Passer à `Decimal` et aux enums natifs reste possible,
mais suppose de convertir explicitement chaque lecture côté service.

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

# BlediGo API

API NestJS de la plateforme BlediGo (location de logements en Tunisie).

## Demarrage en local (3 commandes)

Prerequis : **Node.js 18+** uniquement. Pas de Docker, pas de PostgreSQL a installer.

```bash
npm install
npm run db:setup      # prisma generate + creation de la base SQLite + donnees de demo
npm run start:dev
```

- API : http://localhost:4000
- Swagger : http://localhost:4000/api/docs
- Health : http://localhost:4000/health

`npm install` telecharge les moteurs Prisma (~40 Mo) depuis `binaries.prisma.sh` : une connexion internet est necessaire au premier lancement.

### Comptes de demo

Mot de passe commun : `Password123!`

| Role | Email |
|---|---|
| admin | `admin@bledigo.com` |
| proprietaire | `owner@bledigo.com` |
| voyageur | `traveler@bledigo.com` |

4 annonces certifiees sont creees (Hammamet, La Marsa, Djerba, Sidi Bou Said).

## Base de donnees

| Environnement | Fichier | Provider |
|---|---|---|
| Dev local | `prisma/schema.prisma` | SQLite (`prisma/dev.db`) |
| Production | `prisma/schema.postgres.prisma` | PostgreSQL 16 |

SQLite ne supporte ni les `enum`, ni le type `Json`, ni `Decimal` :

- les enums vivent dans `src/common/enums.ts` (memes valeurs que le schema Postgres) ;
- les champs `Json` sont declares `String` et passent par `toDbJson` / `fromDbJson` (`src/common/json.ts`), qui s adaptent automatiquement au provider ;
- les montants sont en `Float` en local, `Decimal` en Postgres — le code utilise `Number(...)` partout.

Pour passer sur PostgreSQL :

```bash
docker compose up -d postgres
cp prisma/schema.postgres.prisma prisma/schema.prisma
# DATABASE_URL=postgresql://bledigo:bledigo@localhost:5432/bledigo?schema=public
npm run prisma:migrate
```

## Services externes

Sans cle d API dans `.env`, ces services basculent en **mode simule** et l API reste totalement fonctionnelle :

| Service | Variable | Comportement sans cle |
|---|---|---|
| Stripe | `STRIPE_SECRET_KEY` | PaymentIntent simule, statuts en base identiques |
| S3 | `AWS_ACCESS_KEY_ID` | URL d upload locale factice |
| SendGrid / Twilio | `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID` | notification journalisee en `audit_logs` |

## Endpoints principaux

| Domaine | Route |
|---|---|
| Auth | `POST /api/v1/auth/register`, `/login`, `/refresh`, `GET /me` |
| Annonces | `GET|POST /api/v1/listings`, `/:id/publish`, `/:id/availability` |
| Recherche | `GET /api/v1/search` (texte, geo, dates, prix) |
| Recherche inversee | `POST /api/v1/reverse-searches`, `/:id/offers` |
| Reservations | `POST /api/v1/bookings`, `/:id/check-in`, `/:id/validate` |
| Paiements | `POST /api/v1/payments/intent`, `/:id/capture`, `/:id/refund` |
| Litiges | `POST /api/v1/disputes`, `/:id/evidence`, `/:id/decide` |
| Avis | `POST /api/v1/reviews`, `GET /listing/:id` |
| Messagerie | `GET|POST /api/v1/conversations`, `/:id/messages` |
| Scoring / fraude | `POST /api/v1/ai/listings/:id/score`, `GET /:id/fraud` |
| Assurance | `GET /api/v1/insurance/booking/:id/quotes` |
| Abonnements | `GET /api/v1/subscriptions/plans` |
| Admin | `GET /api/v1/admin/dashboard`, `POST /sanctions`, `/listings/:id/certify` |

## Regles metier implementees

- **Hold & Capture** : le paiement est bloque a la reservation et capture seulement apres validation du sejour.
- **Fenetre de validation de 30 min** apres le check-in ; passe ce delai, auto-validation et liberation du paiement.
- **Litige automatique** si un critere de conformite echoue a la validation (proprete, localisation, equipements).
- **Anti-desintermediation** : les messages contenant telephone, email, messagerie externe ou paiement en especes sont marques `isFlagged`.
- **Avis verifies** uniquement apres un sejour au statut `completed`.
- **Scoring de confiance** : qualite, volume d avis, photos certifiees, niveau de certification, anciennete.

## Tests

```bash
npm test
```

## Structure

```
src/
  auth/            inscription, JWT access+refresh, 2FA, roles
  users/           profils, passeports de confiance
  listings/        annonces, photos, disponibilites
  search/          recherche texte + geo (Haversine)
  reverse-search/  besoins voyageurs et offres proprietaires
  bookings/        reservation, check-in, validation
  payments/        Stripe hold & capture
  disputes/        litiges, preuves, decision, sanctions
  reviews/         avis verifies
  chat/            messagerie + filtre anti-desintermediation
  notifications/   email / SMS / push (simules en local)
  insurance/       devis et souscription de garanties
  subscriptions/   plans Pro / Premium / Agence
  ai/              scoring, detection de fraude, prix conseille
  media/           upload presigne
  admin/           dashboard, moderation, certification, sanctions
  common/          enums, helpers JSON, decorateurs
```

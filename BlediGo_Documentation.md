# BLEDIGO — DOCUMENTATION COMPLETE
## La reference de la location de logements en Tunisie
### "Reservez en confiance."

---

# 1. EXECUTIVE SUMMARY

## Vision
BlediGo devient LA reference de la location de logements en Tunisie, puis en Afrique du Nord et en Mediterranee. Nous ne copions pas Airbnb — nous reinventons la confiance dans la location courte et moyenne duree.

## Le Probleme
**Voyageurs :** Fausses photos, faux emplacements, arnaques, logements sales, proprietaires malhonnetes.
**Proprietaires :** Degradations, impayes, mauvais clients, faux avis, sous-location.

## Notre Solution : L'Ecosysteme de Confiance BlediGo
- Paiement Securise avec Validation 30min
- Passeport Logement (NFT-like, immuable)
- Passeport Voyageur & Proprietaire (reputation bidirectionnelle)
- Certification Bronze/Silver/Gold/Diamond
- Recherche Inversee (innovation majeure)
- Chat Securise & Anti-Fraude
- Mediation Integree (systeme AliExpress-like)

## Marche Cible
- TAM : 450M€ (location courte duree Tunisie)
- SAM : 180M€ (segment premium/confiance)
- SOM : 2.7M€ annee 1 (1.5% du SAM)

## Besoin de Financement : Serie A 3.5M€
- 40% Tech, 25% Marketing, 20% Operations, 10% Legal, 5% Fonds roulement

## Projections An 3
- 12,000 logements actifs, 85,000 reservations/an
- CA : 8.2M€ | EBITDA : 1.8M€

---

# 2. BUSINESS MODEL CANVAS

## PARTENAIRES CLES
Stripe/PayPal, AWS, Agences immobilieres tunisiennes, ONTT, AXA/Allianz/Groupama, Prestataires menage/conciergerie, Transferts aeroport, Location voiture.

## ACTIVITES CLES
Dev tech, Controle qualite terrain, Mediation litiges, Marketing acquisition, Certification audit, Detection fraude IA, Community management.

## RESSOURCES CLES
Plateforme tech proprietaire, Base logements certifies, Algorithmes scoring/matching, Equipe controleurs terrain, Marque & reputation, Partenariats institutionnels.

## PROPOSITION DE VALEUR
**Voyageurs :** Zero arnaque garanti, Photos/emplacements certifies, Paiement securise, Recherche inversee, Support 24/7.
**Proprietaires :** Protection degradations, Paiement garanti, Filtres anti-mauvais locataires, Certification valorisante, Outils gestion complets.

## RELATIONS CLIENTS
Support multicanal, Agents terrain personnels (Gold/Diamond), Chatbot IA 24/7, Communaute proprietaires, Programme fidelite.

## CANAUX
Web app, Apps iOS/Android, SEO/SEA, Reseaux sociaux, Partenariats agences, Bouche-a-oreille, Evenements & presse.

## SEGMENTS CLIENTS
Voyageurs (familles, couples, digital nomads), Proprietaires (particuliers, investisseurs), Agences, B2B (entreprises, evenementiel).

## STRUCTURE DES COUTS
Tech 40%, Marketing 25%, Salaires/Operations 20%, Cloud 8%, Legal 5%, Autres 2%.

## FLUX DE REVENUS
1. Commission reservation : 8-15%
2. Abonnements : Free (5%), Pro 29€/mois (3%), Premium 79€/mois (1.5%)
3. Agences : 199€/mois
4. Certification : 49-199€
5. Mise en avant : 5-50€/jour
6. Credits recherche inversee : 0.50-2€/lead
7. Assurance : 3-8% du sejour
8. Services additionnels : marges 15-30%


---

# 3. CAHIER DES CHARGES FONCTIONNEL

## 3.1 ESPACE VOYAGEUR
- Auth : Email/Google/Facebook/Apple + verification email/SMS + photo obligatoire
- Recherche : Carte interactive, filtres avances, recherche inversee, wishlist
- Fiche logement : Photos certifiees (watermark), video 360° (Gold/Diamond), Passeport Logement, calendrier temps reel, avis verifies
- Reservation : Devis detaille, paiement Stripe, contrat numerique, assurance optionnelle
- Sejour : Check-in QR code, validation 30min (5 criteres), litige 1 clic, check-out & evaluation
- Passeport Voyageur : Score confiance 0-100, sejours, taux annulation, recommandations, badges

## 3.2 ESPACE PROPRIETAIRE
- Dashboard : Stats reservations/revenus/occupation, calendrier unifie, alertes
- Gestion logements : Wizard 5 etapes, upload photos + IA verification, prix & dispos, regles maison
- Demandes : Recherche inversee, propositions prix, acceptation/refus, chat
- Paiements : Historique versements, factures auto, releves mensuels, export comptable
- Passeport Proprietaire : Score confiance, historique litiges, certifications, performance

## 3.3 ESPACE AGENCE
Multi-proprietaires, dashboard agrege, gestion centralisee, API proprietaire, rapports personnalises, tarifs preferentiels.

## 3.4 ESPACE ADMINISTRATEUR
- Dashboard general : KPIs temps reel, carte logements actifs, alertes fraude/litiges
- Gestion utilisateurs : Liste complete, profils detailles, historique sanctions, actions (surveiller/limiter/suspendre/bannir)
- Gestion litiges : Tableau decision, statuts (En attente/Analyse/Documents manquants/Accord amiable/Decision BlediGo/Remboursement/Refus), upload preuves, moteur sanctions
- Gestion certifications : Planification visites, validation, renouvellement/retrait
- Contenu & Marketing : Annonces mises en avant, bannieres, emails, blog SEO

## 3.5 ESPACE AGENT BLEDIGO (CONTROLEUR TERRAIN)
Planning visites, checklist controle (photos/videos/mesures), formulaire evaluation, signature numerique, rapport auto, GPS tracking.

## 3.6 ESPACE SUPPORT CLIENT
Tickets & file d'attente, historique conversations, acces preuves (chat/photos), escalade litiges, reponses pre-remplies IA, satisfaction client.

---

# 4. ARCHITECTURE LOGICIELLE

## 4.1 STACK TECHNIQUE

### Frontend
- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand + React Query (TanStack Query)
- Mapbox GL JS
- Stripe Elements
- Socket.io client
- React-Dropzone + Cloudinary
- Vercel / AWS CloudFront

### Backend
- Node.js 20 LTS + NestJS (DDD modulaire)
- GraphQL (Apollo) + REST (OpenAPI 3.0)
- JWT (Access 15min + Refresh 7j rotation) + OAuth2
- RBAC + ABAC
- class-validator + Zod

### Data
- PostgreSQL 16 (RDS)
- Redis 7 (ElastiCache)
- Elasticsearch 8 (search)
- AWS S3 / Cloudflare R2 (files)
- BullMQ (queues)
- InfluxDB (time-series)

### AI/ML (Python)
- Detection faux avis : scikit-learn/TensorFlow
- Detection photos modifiees : Image forensics (ELA, Noise Analysis)
- Scoring confiance : Modele ML predictif
- Matching : Collaborative + content-based filtering
- Chatbot : GPT-4 API + RAG
- NLP fraude chat : spaCy/Hugging Face

### Infrastructure
- AWS (Paris + Tunis)
- Docker + Kubernetes (EKS)
- GitHub Actions CI/CD
- Terraform IaC
- Datadog/Grafana + Prometheus + Loki
- ELK Stack
- CloudFront/Cloudflare CDN
- AWS WAF
- Backup quotidien auto

### Securite
- TLS 1.3, AES-256 au repos
- AWS Secrets Manager / HashiCorp Vault
- Snyk + SonarQube
- Pentest trimestriel externe
- RGPD : Consentement explicite, droit oubli/portabilite, DPO designe
- 2FA TOTP + SMS backup
- Rate limiting Redis
- Audit logs immuables (CloudTrail)

## 4.2 ARCHITECTURE MICROSERVICES

```
CDN/WAF (CloudFront + Cloudflare)
         |
    API Gateway (Kong/AWS)
         |
  +------+------+
  |      |      |
Web    Mobile   Admin
Next.js ReactN  Next.js
  |      |      |
  +------+------+
         |
  GraphQL Gateway (Apollo Federation)
         |
  +------+------+------+------+
  |      |      |      |      |
User  Listing Booking Payment Dispute
Serv.  Serv.   Serv.   Serv.   Serv.
  |      |      |      |      |
Search   Chat    AI/ML  Notif.  Media
Serv.   Serv.   Serv.   Serv.   Serv.
         |
    Message Broker (Redis)
         |
  +------+------+------+
  |      |      |      |
PostgreSQL Redis ElasticSearch S3
```

## 4.3 SERVICES DETAILLES

### User Service
CRUD 6 roles, auth/authz, Passeport Voyageur/Proprietaire, reputation/scoring, sanctions (watch/limit/suspend/ban), RGPD export/suppression.

### Listing Service
CRUD logements, Passeport Logement immuable, photos/videos certifiees, verification GPS, calendrier, scores (qualite/proprete/conformite/securite), certifications.

### Booking Service
Creation reservation, calendrier, workflow validation 30min, statuts (pending/confirmed/checked_in/validated/completed/cancelled/disputed), notifications.

### Payment Service
Stripe integration (cartes/SEPA/wallets), hold & capture 30min, liberations, remboursements, facturation, multi-devises (EUR/TND/USD).

### Dispute Service
Ouverture litige, upload preuves, workflow statuts, tableau decision admin, moteur sanctions, remboursement/refus, analytics.

### Search Service
Elasticsearch indexation, geospatial search, filtres complexes, recherche inversee matching intelligent, suggestions, classement ML.

### Chat Service
Temps reel Socket.io, texte/photos/videos/documents/vocaux, historique, detection fraude NLP, preuves litige, reponses IA pre-remplies.

### AI/ML Service (Python)
Detection faux avis, photos modifiees (forensics), scoring confiance predictif, recommandation logements, chatbot support, NLP fraude.

### Notification Service
Email (SendGrid/SES), SMS (Twilio), Push (Firebase), in-app, templates personnalises.

### Media Service
Upload/optimisation images, compression WebP/AVIF, watermark BlediGo, CDN delivery, video streaming HLS.


---

# 5. SCHEMA DE BASE DE DONNEES

## ENTITES PRINCIPALES

### users
id UUID PK | email unique index | password_hash bcrypt | first_name, last_name | phone unique verifie | avatar_url | role enum(traveler,owner,agency,admin,agent,support) | status enum(active,watched,limited,suspended,banned) | email_verified, phone_verified, identity_verified | created_at, updated_at, deleted_at (soft delete RGPD)

### traveler_passports
id UUID PK | user_id FK | trust_score int 0-100 | total_stays, total_nights | cancellation_rate decimal | recommendation_count | incident_count, dispute_count | badges JSONB | created_at, updated_at

### owner_passports
id UUID PK | user_id FK | trust_score int 0-100 | total_listings, total_bookings, total_revenue | response_rate, acceptance_rate decimal | incident_count, dispute_count | badges JSONB | subscription_tier enum(free,pro,premium) | created_at, updated_at

### listings
id UUID PK | owner_id FK | agency_id FK nullable | title, description, slug | address, city, region, country, postal_code | latitude, longitude geospatial index | property_type enum | max_guests, bedrooms, bathrooms | price_per_night, cleaning_fee, service_fee decimal | currency enum(EUR,TND,USD) | status enum | trust_score int 0-100 | quality_score, cleanliness_score, compliance_score, safety_score | certification_level enum(none,bronze,silver,gold,diamond) | certification_expires_at | total_bookings, total_reviews | created_at, updated_at, deleted_at

### listing_photos
id UUID PK | listing_id FK | url, thumbnail_url | is_primary | is_certified boolean | certification_date | metadata JSONB (EXIF, AI analysis) | created_at

### listing_passports (immuables)
id UUID PK | listing_id FK | stay_count, guest_count | age_days | certifications_history JSONB | certified_photos_count, videos_count, control_visits_count | incidents JSONB array | disputes JSONB array | dispute_resolutions JSONB array | scores_history JSONB array | created_at, updated_at

### bookings
id UUID PK | listing_id FK | traveler_id FK | owner_id FK | check_in, check_out date | guests_count | total_nights | base_price, cleaning_fee, service_fee, insurance_fee, total_price decimal | currency | status enum(pending,confirmed,checked_in,validated,completed,cancelled,disputed) | payment_status enum(held,released,refunded,partial_refund) | validation_status enum(pending,validated,auto_validated,disputed) | validation_deadline timestamp | dispute_id FK nullable | created_at, updated_at

### payments
id UUID PK | booking_id FK | stripe_payment_intent_id | amount, currency | status enum | held_at, captured_at, refunded_at | refund_amount decimal nullable | created_at, updated_at

### disputes
id UUID PK | booking_id FK | initiated_by FK | type enum(non_conform,dirty,missing_amenities,false_location,damage,payment,other) | status enum(pending,analysis,missing_docs,amicable,bledigo_decision,refunded,rejected) | description | resolution_notes | decided_by FK nullable | decided_at | refund_amount decimal nullable | sanctions JSONB array | created_at, updated_at

### dispute_evidence
id UUID PK | dispute_id FK | uploaded_by FK | type enum(photo,video,document,screenshot,message,invoice) | url, description | created_at

### reviews
id UUID PK | booking_id FK | listing_id FK | reviewer_id FK | reviewee_id FK | type enum | rating int 1-5 | cleanliness, accuracy, check_in, communication, location, value int 1-5 | comment | is_verified boolean | is_flagged boolean | flag_reason | created_at, updated_at

### messages
id UUID PK | conversation_id FK | sender_id FK | type enum(text,photo,video,document,voice) | content | metadata JSONB | is_flagged boolean | flag_reason | created_at

### conversations
id UUID PK | booking_id FK nullable | participant_ids UUID array | listing_id FK nullable | is_blocked boolean | created_at, updated_at

### certifications
id UUID PK | listing_id FK | level enum | status enum | requested_at, validated_at, expires_at | validated_by FK agent | report JSONB | created_at, updated_at

### control_visits
id UUID PK | listing_id FK | agent_id FK | scheduled_at, completed_at | status enum | checklist JSONB | photos JSONB array | notes | gps_coordinates | created_at, updated_at

### sanctions
id UUID PK | user_id FK | type enum(watch,limit,suspend,ban) | reason | evidence JSONB | duration_days nullable | expires_at nullable | applied_by FK admin | applied_at | revoked_by FK nullable | revoked_at nullable | created_at

### reverse_searches
id UUID PK | traveler_id FK | title, description | destination, check_in, check_out | guests_count, bedrooms, budget_min, budget_max | requirements JSONB | status enum | created_at, updated_at

### reverse_offers
id UUID PK | reverse_search_id FK | listing_id FK | owner_id FK | proposed_price decimal | message | status enum | created_at, updated_at

### subscriptions
id UUID PK | user_id FK | type enum | status enum | price, currency, interval | stripe_subscription_id | current_period_start, current_period_end | created_at, updated_at

### insurance_policies
id UUID PK | booking_id FK | type enum | provider enum | premium_amount, coverage_amount | status enum | created_at, updated_at

### audit_logs (immuables)
id UUID PK | user_id FK nullable | action enum | entity_type, entity_id | details JSONB | ip_address, user_agent | created_at

---

# 6. SPECIFICATIONS API REST

## AUTHENTICATION
POST /api/v1/auth/register -> { user, accessToken, refreshToken }
POST /api/v1/auth/login -> { user, accessToken, refreshToken }
POST /api/v1/auth/refresh -> { accessToken, refreshToken }
POST /api/v1/auth/logout -> 204
POST /api/v1/auth/oauth/{provider} -> { user, accessToken, refreshToken }
POST /api/v1/auth/verify-email -> { success }
POST /api/v1/auth/verify-phone -> { success }
POST /api/v1/auth/forgot-password -> { success }
POST /api/v1/auth/reset-password -> { success }
POST /api/v1/auth/2fa/enable -> { secret, qrCode }
POST /api/v1/auth/2fa/verify -> { success }

## USERS
GET /api/v1/users/me -> profil complet
PATCH /api/v1/users/me -> modification profil
GET /api/v1/users/me/passport -> Passeport Voyageur/Proprietaire complet
DELETE /api/v1/users/me -> RGPD suppression async 202
GET /api/v1/users/{id}/passport -> Public (score, sejours, badges)
GET /api/v1/users/{id}/reviews -> avis publics

## LISTINGS
GET /api/v1/listings -> recherche avec filtres (lat/lng/radius, dates, prix, type, equipements, certification, sort, pagination)
GET /api/v1/listings/{id} -> fiche complete avec photos, owner, passport, amenities, pricing, availability, reviews, certification
POST /api/v1/listings -> creation (Owner/Agency)
PATCH /api/v1/listings/{id} -> modification
DELETE /api/v1/listings/{id} -> suppression
GET /api/v1/listings/{id}/passport -> historique immuable
GET /api/v1/listings/{id}/availability -> calendrier par periode
POST /api/v1/listings/{id}/photos -> upload multipart
POST /api/v1/listings/{id}/certification/request -> demande certification

## BOOKINGS
POST /api/v1/bookings -> creation avec paymentIntent, devis detaille
GET /api/v1/bookings -> mes reservations (filtres status)
GET /api/v1/bookings/{id} -> detail complet avec payment, validation, dispute
POST /api/v1/bookings/{id}/validate -> validation 30min (5 criteres booleens)
POST /api/v1/bookings/{id}/dispute -> ouverture litige
POST /api/v1/bookings/{id}/cancel -> annulation avec raison
POST /api/v1/bookings/{id}/check-in -> confirmation arrivee proprietaire

## PAYMENTS
POST /api/v1/payments/intent -> creation intent Stripe
GET /api/v1/payments/{id} -> detail paiement
GET /api/v1/payments -> historique
POST /api/v1/payments/{id}/refund -> remboursement (Admin)

## DISPUTES
POST /api/v1/disputes -> ouverture
GET /api/v1/disputes/{id} -> detail avec evidence, messages
POST /api/v1/disputes/{id}/evidence -> upload preuves multipart
POST /api/v1/disputes/{id}/decision -> decision admin (status, notes, refund, sanctions)
GET /api/v1/disputes -> liste admin (filtres status)

## CHAT
GET /api/v1/conversations -> liste
GET /api/v1/conversations/{id}/messages -> messages avec pagination
POST /api/v1/conversations -> creation
POST /api/v1/conversations/{id}/messages -> envoi texte/media
POST /api/v1/conversations/{id}/block -> blocage

## REVERSE SEARCH
POST /api/v1/reverse-searches -> publication besoin
GET /api/v1/reverse-searches -> mes recherches
GET /api/v1/reverse-searches/{id}/offers -> offres reçues
POST /api/v1/reverse-searches/{id}/offers -> envoi offre (Owner)
POST /api/v1/reverse-searches/{id}/offers/{offerId}/accept -> acceptation -> creation booking

## REVIEWS
POST /api/v1/reviews -> creation avis (6 criteres 1-5 + commentaire)
GET /api/v1/listings/{id}/reviews -> avis avec moyenne et breakdown
POST /api/v1/reviews/{id}/flag -> signalement faux avis (Admin)

## ADMIN
GET /api/v1/admin/dashboard -> KPIs temps reel
GET /api/v1/admin/users -> gestion utilisateurs (filtres role/status)
POST /api/v1/admin/users/{id}/sanction -> sanction (type, reason, duration, evidence)
GET /api/v1/admin/listings/pending -> moderation
POST /api/v1/admin/listings/{id}/approve | /reject -> moderation
GET /api/v1/admin/disputes -> gestion litiges
POST /api/v1/admin/disputes/{id}/decision -> decision
GET /api/v1/admin/control-visits -> planning visites
POST /api/v1/admin/control-visits -> planification
POST /api/v1/admin/control-visits/{id}/complete -> rapport agent terrain

## NOTIFICATIONS
GET /api/v1/notifications -> liste avec unreadCount
PATCH /api/v1/notifications/{id}/read -> marquer lu
POST /api/v1/notifications/preferences -> preferences

## SUBSCRIPTIONS
GET /api/v1/subscriptions/plans -> plans disponibles
POST /api/v1/subscriptions -> souscription
GET /api/v1/subscriptions -> mes abonnements
POST /api/v1/subscriptions/{id}/cancel -> resiliation

## INSURANCE
GET /api/v1/insurance/plans -> plans par booking
POST /api/v1/insurance -> souscription assurance


---

# 7. DESIGN SYSTEM & IDENTITE VISUELLE

## PHILOSOPHIE
Mediterraneen premium. Chaleureux mais sophistique. Confiance et serenite. Identite unique, memorable, locale. Pas de copie Airbnb.

## NAMING
**BlediGo** = "Bled" (pays en arabe dialectal tunisien) + "Go" (voyage, action)
Slogan : "Reservez en confiance."

## PALETTE DE COULEURS

### Primaires
- Bledi Blue : #0A2540 (profondeur, confiance, nuit mediterraneenne)
- Bledi Gold : #D4A574 (terracotta, chaleur, sable tunisien)

### Secondaires
- Mediterranean : #00A9CE (mer, fraicheur)
- Olive : #7A8450 (nature, authenticite)
- Cream : #FAF7F2 (fond, chaleur)

### Neutres
- Charcoal : #1A1A2E (texte principal)
- Slate : #64748B (texte secondaire)
- Cloud : #F1F5F9 (fonds secondaires)
- White : #FFFFFF

### Semantiques
- Success : #10B981 | Warning : #F59E0B | Error : #EF4444 | Info : #3B82F6

## TYPOGRAPHIE
- Display : Geist Sans (titres, hero)
- Body : Inter (lecture, confort)
- Accent : Space Grotesk (chiffres, data, scores)

## COMPOSANTS UI

### Boutons
- Primary : Fond Bledi Blue, texte blanc, radius 12px, hover scale 1.02
- Secondary : Bordure Bledi Blue, texte Bledi Blue, fond transparent
- Gold : Fond Bledi Gold, texte Charcoal (actions premium)
- Danger : Fond Error, texte blanc
- Ghost : Texte Slate, hover fond Cloud

### Cartes
- Fond White ou Cream, ombre 0 4px 24px rgba(10,37,64,0.08), radius 16px
- Hover : elevation + ombre renforcee

### Inputs
- Bordure Cloud, focus Bledi Blue, radius 12px, icones integrees
- Etats : default, focus, error, disabled

### Badges Certification
- Bronze : #CD7F32 | Silver : #C0C0C0 | Gold : #FFD700 | Diamond : #B9F2FF

### Scores & Metriques
- Cercles progression, barres horizontales animees
- Couleurs selon score : rouge <50, orange 50-75, vert >75

### Carte Interactive
- Mapbox style personnalise tonalite BlediGo
- Marqueurs maison + certification, clustering intelligent

### Modales & Drawers
- Backdrop blur, animation slide-up/slide-right, header sticky

### Tables Admin
- Lignes zebra, sorting/filtering/pagination, actions inline hover, export CSV

## PRINCIPES UX
- Mobile First (70% traffic mobile)
- Confiance avant tout (scores visibles, badges, verifications)
- Transparence (prix detaille, frais explicites)
- Rapidite (lazy loading, skeleton screens, optimistic UI)
- Accessibilite WCAG 2.1 AA
- Dark Mode : Charcoal fond, Cream texte

## ANIMATIONS
- Page transitions : Fade + slide 300ms ease-out
- Button hover : Scale 1.02 + ombre 200ms
- Card hover : Elevation + border highlight
- Loading : Skeleton screens (pas de spinner generique)
- Success : Confetti subtle sur validation
- Notifications : Slide top-right, auto-dismiss 5s

---

# 8. ROADMAP MVP & PLAN 24 MOIS

## PHASE 0 : FONDATION (Mois 1-2)
- Constitution equipe fondatrice (CEO, CTO, 2 devs senior, 1 UX/UI)
- Creation societe (Tunisie + France)
- Levee amorcage 500K€ (Business Angels)
- Marque deposee, domaine, reseaux sociaux
- Benchmark & etude marche
- Stack technique definitive
- Infrastructure AWS + CI/CD

## PHASE 1 : MVP (Mois 3-6) — Objectif : 50 logements, 100 reservations
Sprints :
- 1-2 : Auth, profils, Passeport Voyageur/Proprietaire
- 3-4 : CRUD logements, photos, fiche logement
- 5-6 : Recherche, cartographie, filtres
- 7-8 : Reservation, paiement Stripe, contrat numerique
- 9-10 : Validation 30min, workflow litige basique
- 11-12 : Chat interne, notifications, avis

Livrables : Web app Next.js, API REST, PostgreSQL, Stripe, Chat temps reel, Reputation basique, Admin minimal.

## PHASE 2 : CROISSANCE (Mois 7-12) — Objectif : 500 logements, 2,000 reservations
- Mois 7 : Beta ferme (invitation only)
- Mois 8 : Certification Bronze/Silver
- Mois 9 : Recherche inversee v1
- Mois 10 : App iOS (React Native)
- Mois 11 : App Android + equipe terrain (3 agents)
- Mois 12 : Lancement public Tunisie + France
- **Levee Serie A : 3.5M€**

## PHASE 3 : ECOSYSTEME (Mois 13-18) — Objectif : 3,000 logements, 15,000 reservations
- Mois 13 : Certification Gold/Diamond + visites terrain
- Mois 14 : Abonnements proprietaires freemium
- Mois 15 : Espace Agence + API
- Mois 16 : IA detection fraude & faux avis
- Mois 17 : Assurance module (partenariats)
- Mois 18 : Services additionnels (conciergerie, transfert, menage)

## PHASE 4 : EXPANSION (Mois 19-24) — Objectif : 12,000 logements, 85,000 reservations, rentabilite
- Mois 19 : Expansion Maroc & Algerie
- Mois 20 : Programme parrainage + fidelite
- Mois 21 : B2B (entreprises, evenementiel)
- Mois 22 : IA avancee (matching, pricing dynamique)
- Mois 23 : Marketplace services (excursions, location voiture)
- Mois 24 : Profitabilite, preparation Serie B (10M€)

---

# 9. PLAN FINANCIER

## HYPOTHESES
- Commission voyageur 6% + proprietaire 3-5% = total 10% moyen
- Prix moyen : 75€/nuit, 5 nuits = 375€ panier moyen
- CAC voyageur : 25€ | CAC proprietaire : 150€
- Churn proprietaire : 5%/mois | Voyageur : 60%/an

## PROJECTIONS

### Annee 1 (Mois 7-12)
| KPI | Valeur |
|-----|--------|
| Logements | 500 |
| Reservations | 2,000 |
| Nuitees | 10,000 |
| CA brut | 750K€ |
| Commission | 75K€ |
| Abonnements | 15K€ |
| Services | 5K€ |
| **CA Total** | **95K€** |
| Charges | 400K€ |
| **Resultat** | **-305K€** |

### Annee 2
| KPI | Valeur |
|-----|--------|
| Logements | 3,000 |
| Reservations | 15,000 |
| Nuitees | 75,000 |
| CA brut | 5.6M€ |
| Commission | 560K€ |
| Abonnements | 180K€ |
| Certification | 60K€ |
| Mise en avant | 80K€ |
| Services | 120K€ |
| **CA Total** | **1.0M€** |
| Charges | 1.5M€ |
| **Resultat** | **-500K€** |

### Annee 3
| KPI | Valeur |
|-----|--------|
| Logements | 12,000 |
| Reservations | 85,000 |
| Nuitees | 425,000 |
| CA brut | 31.9M€ |
| Commission | 3.19M€ |
| Abonnements | 1.2M€ |
| Certification | 300K€ |
| Mise en avant | 500K€ |
| Recherche inversee | 200K€ |
| Services | 1.5M€ |
| Assurance | 800K€ |
| **CA Total** | **7.7M€** |
| Charges | 6.35M€ |
| **EBITDA** | **1.35M€** |
| **Marge** | **17.5%** |

## BESOIN EN FINANCEMENT
| Phase | Montant | Usage |
|-------|---------|-------|
| Amorcage | 500K€ | MVP, equipe, legal |
| Serie A | 3.5M€ | Produit, marketing, terrain, 18 mois runway |
| Serie B | 10M€ | Expansion Maghreb, IA, rentabilite |
| Serie C | 25M€ | Mediterranee, B2B, acquisition |

## METRIQUES CLES (KPIs)
- GMV, Take Rate, CAC, LTV, LTV/CAC >3, NPS >50
- Taux conversion 2.5%, Retention proprietaire 85% (M12)
- Taux litige <2%, Resolution amiable 60%


---

# 10. PLAN MARKETING & LANCEMENT

## POSITIONNEMENT
**"La location en Tunisie sans arnaque"**

Segments :
- Voyageurs francais (1.5M/an, peur arnaques)
- Tunisiens diaspora (800K/an, qualite & confiance)
- Digital nomads (croissant, fiabilite)
- Familles (securite & conformite)

## GO-TO-MARKET

### Pre-lancement (Mois 1-6)
- Landing page (collecte emails)
- Instagram & TikTok (contenu Tunisie authentique)
- Blog SEO : "Guide location Djerba", "Eviter arnaques Sidi Bou Said"
- Partenariats influenceurs voyage, blogueurs Tunisie
- Presse : TechCrunch, Webdo Tunisie, Jeune Afrique
- Beta ferme : 100 proprietaires, 500 voyageurs

### Lancement Tunisie (Mois 7-9)
- Evenement La Marsa avec presse & influenceurs
- Campagne TV/Radio "Zero arnaque"
- Google Ads "location vacances Tunisie"
- Meta Ads ciblage diaspora tunisienne
- Partenariat ONTT certification officielle

### Lancement France (Mois 10-12)
- Evenement Paris (investisseurs & presse)
- SEA "location vacances Tunisie", "villa Djerba"
- Affiliation sites voyage
- Influence Youtubeurs voyage
- Presse : Madame Figaro, L'Express, Geo

### Croissance (Mois 13+)
- Parrainage : 25€ voyageur + 50€ proprietaire
- Programme fidelite : Nuits gratuites, upgrades
- B2B : Entreprises, evenements, mariages
- Content marketing : Documentaires "BlediGo decouvre la Tunisie"

## BUDGET MARKETING AN 1
| Canal | Budget | Objectif |
|-------|--------|----------|
| Google Ads | 30K€ | 1,200 reservations |
| Meta Ads | 25K€ | 800 reservations |
| Influence | 15K€ | Notoriete |
| SEO/Content | 10K€ | Trafic organique |
| Evenements | 10K€ | Relations presse |
| Partenariats | 10K€ | Co-marketing |
| **Total** | **100K€** | **2,000 reservations** |

## PARTENARIATS STRATEGIQUES
- ONTT : Label qualite
- Tunisair/Nouvelair : Packages vol+logement
- Banques tunisiennes : Paiement local, credits proprietaires
- AXA Tunisie : Assurance integree
- Groupe Loukil : Conciergerie & menage
- Agences immobilieres : Feed logements

---

# 11. ANALYSE DES RISQUES

## RISQUES TECHNIQUES
| Risque | Proba | Impact | Mitigation |
|--------|-------|--------|------------|
| Failles securite | Moyen | Critique | Pentest trimestriel, bug bounty, SOC2 |
| Indisponibilite | Faible | Critique | Multi-AZ, failover, SLA 99.99% |
| Scalabilite | Faible | Eleve | K8s auto-scaling, load balancing |
| Dette technique | Moyen | Eleve | Code review, SonarQube, refactoring |
| Dependance Stripe | Faible | Moyen | Multi-gateway (PayPal, Paymee TN) |

## RISQUES MARKETING
| Risque | Proba | Impact | Mitigation |
|--------|-------|--------|------------|
| Adoption lente proprios | Eleve | Critique | Onboarding gratuit, accompagnement, commissions basses debut |
| Concurrence Airbnb | Eleve | Eleve | Differentiation confiance/certification, niche Tunisie |
| Mauvaise reputation initiale | Moyen | Critique | Controle qualite drastique, 0 tolerance arnaque |
| CAC trop eleve | Moyen | Eleve | SEO long terme, parrainage, contenu viral |

## RISQUES JURIDIQUES
| Risque | Proba | Impact | Mitigation |
|--------|-------|--------|------------|
| Non-conformite RGPD | Faible | Critique | DPO, Privacy by Design, audits |
| Reglementation location TN | Moyen | Eleve | Veille juridique, avocats |
| Litiges consommateurs | Eleve | Moyen | CGV claires, mediation, assurance |
| Blocage paiement | Faible | Critique | Multi-acquereur, comptes segregues |

## RISQUES OPERATIONNELS
| Risque | Proba | Impact | Mitigation |
|--------|-------|--------|------------|
| Recrutement tech difficile | Moyen | Eleve | Remote friendly, actions, culture |
| Retention employes | Moyen | Moyen | ESOP, flexibilite, mission |
| Fraude interne | Faible | Critique | Segregation roles, audit logs, 4-eyes |
| Crise politique/economique TN | Moyen | Eleve | Diversification geo, cash reserve |

## RISQUES FINANCIERS
| Risque | Proba | Impact | Mitigation |
|--------|-------|--------|------------|
| Epuisement tresorerie | Moyen | Critique | Runway 18 mois, milestones levee |
| Taux change EUR/TND | Moyen | Moyen | Hedging, multi-devises |
| Defaut paiement proprios | Faible | Eleve | Hold & capture, fonds segregues |

## PLAN DE CONTINUITE
- Backup quotidien auto, test restauration mensuel
- DR site secondaire actif (multi-region AWS)
- Incident Response : Equipe on-call, runbooks, PagerDuty
- Communication crise : Protocole interne + externe

---

# 12. DOCUMENTATION TECHNIQUE

## ENVIRONNEMENTS
| Env | URL | Usage |
|-----|-----|-------|
| Production | https://bledigo.com | Live |
| Staging | https://staging.bledigo.com | Pre-prod |
| Demo | https://demo.bledigo.com | Sales & investisseurs |
| Dev | https://dev.bledigo.com | Developpement |

## REPOSITORIES
| Repo | Tech | Description |
|------|------|-------------|
| bledigo-web | Next.js 14 | Frontend voyageurs & proprietaires |
| bledigo-admin | Next.js 14 | Panel administrateur |
| bledigo-api | NestJS | API Gateway & microservices |
| bledigo-ml | Python | Services IA/ML |
| bledigo-mobile | React Native | Apps iOS & Android |
| bledigo-infra | Terraform | Infrastructure as Code |
| bledigo-docs | Markdown | Documentation |

## WORKFLOW GIT
```
main (production)
  ^
release/v1.x (staging)
  ^
develop (integration)
  ^
feature/BG-123-description
  ^
hotfix/BG-456-description
```
- Feature branches : `feature/BG-123-ajout-recherche-inversee`
- Commits : Conventionnal Commits (feat:, fix:, docs:, refactor:)
- PR : 2 approbations, CI verte, tests >80%
- Merge : Squash & merge sur develop
- Release : Tag semver, changelog auto

## CI/CD PIPELINE
```
Push/PR -> Lint -> Type check -> Unit tests -> Integration tests -> E2E tests -> Build Docker -> Scan securite (Snyk/Trivy) -> Deploy staging (auto) -> Tests staging -> Deploy production (manual) -> Tests production -> Notify Slack
```

## MONITORING & ALERTING

### SLIs
- Latency : p95 < 200ms (API), p95 < 1s (page load)
- Error Rate : < 0.1%
- Throughput : > 1000 req/s
- Availability : 99.99%

### Dashboards
- Infrastructure : CPU, RAM, disque, reseau
- Application : Requetes, erreurs, latence par endpoint
- Business : Reservations, CA, utilisateurs actifs
- Security : Tentatives connexion, flags fraude, litiges

### Alerting (PagerDuty)
- P1 : Site down, paiement bloque, fuite donnees
- P2 : Latence > 500ms, erreur > 1%, service degrade
- P3 : Disk > 80%, certificat SSL expiration < 7j

## SECURITE

### Auth
- JWT RS256 asymetrique
- Access token 15min, Refresh 7j (rotation)
- 2FA TOTP obligatoire admin & agents

### Autorisation
- RBAC : 6 roles
- ABAC : Attributs supplementaires (certification, score, status)
- Middleware verification par route

### Donnees sensibles
- AES-256 au repos (RDS, S3)
- TLS 1.3 en transit
- Tokenisation cartes (Stripe)
- Hash bcrypt passwords (cost 12)
- Masking logs (PII redactees)

### RGPD
- Consentement explicite (checkbox non pre-cochee)
- Droit acces (export JSON complet)
- Droit oubli (suppression async 30j)
- Droit portabilite
- DPO : contact@dpo.bledigo.com
- Registre traitements
- DPIA pour IA

## PERFORMANCE
- CDN CloudFront, cache 24h assets
- Images WebP/AVIF, lazy loading, srcset
- API : Redis cache, pagination, N+1 elimines
- DB : Index geospatial, partitions bookings par mois
- Bundle : Code splitting, tree shaking, dynamic imports

### Load Testing
- Outil : k6 / Artillery
- Scenarios : Recherche, reservation, paiement
- Cible : 10,000 utilisateurs simultanes
- Frequence : Avant chaque release majeure


---

# 13. DOCUMENTATION UTILISATEUR

## GUIDE VOYAGEUR

### Premiere reservation
1. Inscription : Email + verification
2. Recherche : Carte ou liste avec filtres
3. Verification : Consultez le Passeport Logement (scores, certifications)
4. Reservation : Selection dates, voyageurs, assurance optionnelle
5. Paiement : Carte securisee via Stripe
6. Confirmation : Email + notification push
7. Check-in : QR code numerique presente au proprietaire
8. Validation 30min : Verifiez conformite, propreté, equipements, emplacement
9. Evaluation : Notez le sejour (6 criteres + commentaire)

### Ouverture litige
1. Dans reservation, cliquez "Ouvrir un litige"
2. Selectionnez type (non-conforme, sale, faux emplacement, etc.)
3. Ajoutez photos/videos preuves
4. Decrivez le probleme en detail
5. BlediGo medie sous 48h ouvrables
6. Suivez statut dans votre espace

### Recherche inversee
1. Publiez votre besoin (destination, dates, budget, criteres)
2. Recevez offres personnalisees de proprietaires/agences
3. Comparez les offres (prix, logement, certifications)
4. Acceptez une offre -> reservation directe

## GUIDE PROPRIETAIRE

### Premiere mise en ligne
1. Inscription + verification identite
2. Wizard creation logement (5 etapes)
3. Upload photos (IA verification conformite)
4. Definissez prix, disponibilites, regles
5. Publiez et attendez moderation (24h)
6. Recevez demandes et reservez

### Gestion reservations
1. Tableau de bord : Stats temps reel
2. Calendrier : Bloquez/Debloquez dates
3. Demandes : Acceptez ou refusez avec message
4. Check-in : Confirmez arrivee voyageur (QR code)
5. Paiement : Recu automatique apres validation 30min

### Certification
1. Demandez certification (Bronze a Diamond)
2. Visite controleur BlediGo planifiee
3. Evaluation sur site (photos, mesures, checklist)
4. Rapport automatique + badge sur fiche
5. Renouvellement annuel

## GUIDE AGENCE
1. Inscription agence avec documents legaux
2. Ajoutez proprietaires et logements
3. Dashboard agrege : Tous vos logements
4. API : Integration vos outils existants
5. Rapports personnalises mensuels

---

# ANNEXES

## A. GLOSSAIRE
- **Passeport Logement** : Identite numerique immuable d'un logement
- **Passeport Voyageur** : Reputation et historique d'un client
- **Validation 30min** : Fenetre verification post-check-in
- **Recherche Inversee** : Voyageur publie besoin, proprietaires repondent
- **Hold & Capture** : Blocage fonds Stripe avant liberation
- **GMV** : Gross Merchandise Value (volume transactions)
- **Take Rate** : Pourcentage commission sur GMV
- **CAC** : Cout Acquisition Client
- **LTV** : Lifetime Value

## B. CONTACTS
- **Support** : support@bledigo.com
- **DPO** : dpo@bledigo.com
- **Presse** : presse@bledigo.com
- **Partenariats** : partenariats@bledigo.com
- **Investisseurs** : investors@bledigo.com

## C. MENTIONS LEGALES
- Societe : BlediGo SAS (France) + BlediGo SARL (Tunisie)
- Capital social : 50,000€
- RCS : En cours d'immatriculation
- DPO : Nomme conformement RGPD
- Hebergeur : AWS Europe (Paris)

---

*Document genere le 5 aout 2026 — Version 1.0*
*Confidentiel — Propriete intellectuelle BlediGo*

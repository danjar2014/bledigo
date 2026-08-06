# BlediGo Web

Front Next.js 14 (App Router) de la plateforme BlediGo, branche sur l API `bledigo-api`.

## Demarrage

L API doit tourner en premier.

```bash
# terminal 1 - API
cd ../bledigo-api
npm install
npm run db:setup
npm run start:dev        # http://localhost:4000

# terminal 2 - front
npm install
npm run dev              # http://localhost:3000
```

Comptes de demo (mot de passe `Password123!`) : `traveler@bledigo.com`, `owner@bledigo.com`,
`admin@bledigo.com`. La page de connexion propose des boutons qui remplissent le formulaire.

## Configuration

`.env.local` :

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Pages

| Route | Acces | Contenu |
|---|---|---|
| `/` | public | Landing : hero, recherche, annonces certifiees (API), reassurance |
| `/recherche` | public | Resultats avec filtres ville / dates / voyageurs / budget |
| `/logements/[slug]` | public | Fiche annonce, galerie, avis verifies, widget de reservation |
| `/besoins` | public | Recherche inversee : liste et publication d un besoin |
| `/abonnements` | public | Plans Pro / Premium / Agence, souscription |
| `/connexion`, `/inscription` | public | Auth JWT (access + refresh automatique) |
| `/reservations` | voyageur | Mes sejours, validation 30 min, litige, avis |
| `/proprietaire` | proprietaire | Indicateurs, reservations recues, confirmation, check-in, scoring |
| `/proprietaire/annonces/nouvelle` | proprietaire | Creation d annonce + prix conseille par l API |
| `/admin` | admin/support/agent | Dashboard, moderation, certification, litiges, sanctions, journal |

## Parcours de demonstration

1. `owner@bledigo.com` publie une annonce (`/proprietaire/annonces/nouvelle`) — le prix conseille vient de l endpoint IA.
2. `traveler@bledigo.com` reserve depuis la fiche annonce : le paiement est **bloque**, pas encaisse.
3. `owner@bledigo.com` confirme puis declenche le **check-in** depuis son espace.
4. `traveler@bledigo.com` voit apparaitre "Valider mon sejour" avec un **compte a rebours de 30 min**.
   - tous les criteres coches -> paiement libere, sejour termine, avis possible ;
   - un critere decoche -> **litige ouvert automatiquement**, paiement gele.
5. `admin@bledigo.com` traite le litige dans `/admin` : remboursement ou rejet, sanctions.

## Notes techniques

- **Client API** : `src/lib/api.ts` — fetch typé, injection du token, refresh automatique sur 401.
- **Auth** : `src/store/auth.ts` (Zustand) + `RequireAuth` pour les routes protegees.
- **Donnees serveur** : TanStack Query (cache, invalidation apres mutation).
- **Polices** : chargees via `@import` CSS avec repli systeme, pour que le build fonctionne hors ligne.
- **Images** : photos distantes (Unsplash / picsum) declarees dans `next.config.js`. Un repli
  automatique s applique aux annonces sans photo (`photoOf` dans `src/lib/format.ts`).
- **Dependances retirees** du package.json d origine car non utilisees a ce stade : `mapbox-gl`,
  `react-map-gl`, `@stripe/*`, `socket.io-client`, `react-dropzone`, `axios`. A reintroduire au
  moment d ajouter la carte, le paiement Stripe reel, le chat temps reel et l upload S3.

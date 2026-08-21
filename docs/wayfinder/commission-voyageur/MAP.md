# Carte — Commission voyageur

`wayfinder:map` · traqueur : Markdown local · remplace [Abonnements](../abonnements/MAP.md)

## Destination

Une **decision verrouillee** sur l'unique source de revenus de BlediGo : une
commission payee par le VOYAGEUR au moment de reserver — combien, sur quelle
assiette, prelevee quand, remboursee dans quels cas, et affichee comment.

Verrouillee, pas specifiee : le taux, le moment du prelevement et le sort de la
commission en cas d'annulation sont des arbitrages, pas des questions techniques.
La carte est finie quand on peut coder sans plus rien avoir a trancher.

## Notes

**Le montage retenu (etape B).** Le voyageur paie la COMMISSION SEULE a BlediGo,
par carte, en euros. Le reste du sejour se regle de la main a la main sur place,
comme aujourd'hui. BlediGo ne doit donc jamais rien a personne en Tunisie : pas de
reversement, pas d'agrement d'intermediaire, pas de KYC hote, pas de controle des
changes.

**Pourquoi ce montage et pas le modele Airbnb complet.** Encaisser le total pour
en reverser la part de l'hote suppose de payer un beneficiaire tunisien. Stripe ne
couvre pas la Tunisie — ni disponibilite, ni beta, ni Connect — et ne prend pas en
charge les reversements transfrontaliers en libre-service hors US / Royaume-Uni /
EEE / Canada / Suisse. Ce n'est pas une preference, c'est un mur.

**Pourquoi le voyageur peut payer alors que l'hote ne le pouvait pas.** Le
voyageur est diaspora ou touriste : il porte une carte etrangere et paie un
commercant francais sans difficulte. Le professionnel tunisien, lui, se heurte au
controle des changes des qu'il doit payer a l'etranger. C'est ce constat qui a
fait abandonner le modele par abonnement.

**Etape A, assumee comme etape.** Le sequestre complet — encaissement du total,
validation a l'arrivee avec levier financier, refus rembourse, litiges arbitres —
reste l'objectif, mais comme une ETAPE datable et conditionnee, pas comme la
« phase 2 » vague qui promettait depuis le debut une opposabilite jamais arrivee.
C'est l'objet de C8.

**Competences par session.** `grilling` et `domain-modeling` pour les decisions ;
`research` pour les tickets de recherche.

**Preference permanente.** Trouver les faits est le travail de l'agent, jamais
celui de l'utilisateur.

## Decisions prises

- **D1 — Le voyageur paie, pas le professionnel.** Diaspora et touristes portent
  des cartes etrangeres ; les professionnels tunisiens se heurtent au controle des
  changes. Renverse la carte Abonnements, desormais caduque. **Le blocage cote
  professionnel n'a pas ete verifie a la source** : il a ete soulevé par le ticket
  T3, jamais resolu, puis confirme par l'utilisateur de sa propre experience. Sans
  consequence ici, puisque plus aucun professionnel ne paie.
- **D2 — Etape B : la plateforme n'encaisse QUE sa commission.** Le solde se regle
  de la main a la main. Aucun reversement vers la Tunisie, donc aucun mur.
- **D3 — Etape A plus tard, comme etape assumee.** Sequestre complet, avec une
  condition de declenchement ecrite (C8) plutot qu'une promesse.
- **D4 — Location de voitures : meme commission.** Enonce par l'utilisateur.
  Les modalites different neanmoins (prix negocie avec l'agence) : voir C7.
- **D5 — Menage : aucun frais.** Ni commission, ni abonnement. Le menage sert a
  rendre la plateforme utile aux hotes, pas a produire du revenu.
- **D6 — Les abonnements disparaissent** *(hypothese de l'agent, non confirmee)* :
  « le modele doit plutot etre refait » se lit comme un remplacement, donc l'hote
  ne paie plus rien. Si l'intention etait de cumuler commission et abonnement,
  cette ligne est a renverser et la carte Abonnements a rouvrir.

## Ce que ce montage change dans le code existant

Etabli par lecture :

| Element | Consequence |
|---|---|
| `Listing.serviceFee` / `Booking.serviceFee` | Le champ existe deja et entre dans `totalPrice`. Il devient la commission, mais payee EN LIGNE alors que le reste est paye sur place : la separation n'existe nulle part |
| `PaymentsService` (Stripe, sequestre, remboursement) | Reutilisable pour un encaissement simple ; la capture manuelle et le sequestre ne servent qu'a l'etape A |
| `paiementEnLigne()` | Aujourd'hui binaire : tout en ligne ou rien. L'etape B est un TROISIEME etat, ni l'un ni l'autre |
| Conditions d'annulation « sur l'honneur » | Deviennent partiellement OPPOSABLES : la plateforme tient enfin quelque chose. Les textes affiches devront le dire |
| `Subscription`, `PLANS`, credits | Sans emploi sous D6, sauf si D6 est renverse |

## Pas encore specifie

- **Le sejour non honore alors que la commission est payee.** Le voyageur a paye
  la commission, l'hote ne se presente pas : que doit la plateforme ? Se precisera
  apres C5.
- **La commission face au systeme de demandes de changement.** Annulation et
  report existent deja avec une echeance de 48 h. Leur articulation avec un
  montant reel se precisera apres C5.
- **Devise affichee au voyageur.** Il paie en euros, le sejour est libelle en TND.
  Se precisera avec C6.
- **Facturation au voyageur particulier.** Depend de C3.

## Hors perimetre

- **Le reversement vers la Tunisie** et tout ce qui va avec — agrement, KYC hote,
  rail hors Stripe. Ecarte par D2, revient avec l'etape A. Le fait etabli est
  conserve dans les Notes.
- **Abonnements, paliers, credits.** Ecartes par D6. La carte precedente est
  conservee en l'etat, marquee caduque, et redevient utile si D6 est renverse.
- **Le sort du code de paiement dormant.** Concerne l'etape A.

## Tickets

| Ticket | Type | Etat |
|---|---|---|
| [C1 — Taux et assiette de la commission](C1-taux-assiette.md) | grilling | bloque par C4 |
| [C2 — A quel moment la commission est-elle prelevee](C2-moment-prelevement.md) | grilling | frontiere |
| [C3 — TVA, facturation et DAC7 sur la commission](C3-tva-facturation.md) | research | frontiere |
| [C4 — Taux pratiques par les comparables](C4-taux-comparables.md) | research | frontiere |
| [C5 — Remboursement quand la reservation tombe](C5-remboursement.md) | grilling | bloque par C2 |
| [C6 — Ce qu'on paie en ligne, ce qu'on paie sur place](C6-affichage-prix.md) | grilling | bloque par C1 |
| [C7 — La commission sur les locations de voitures](C7-commission-voitures.md) | grilling | bloque par C1, C2 |
| [C8 — Ce qui declenche l'etape A](C8-declencheur-etape-a.md) | grilling | frontiere |

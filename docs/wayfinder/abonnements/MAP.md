> **CARTE EN SOMMEIL — la monetisation est reportee.**
>
> Arbitrage de l'utilisateur : on garde tout en l'etat, SANS aucun paiement en
> ligne. Le reglement se fait en especes a l'arrivee pour un sejour, a la remise
> du vehicule pour une location. Le menage reste sans frais. Ni commission, ni
> abonnement, ni credits payants.
>
> **Condition de reveil** : « une fois que le site cartonne et reussi ». Enoncee
> telle quelle, elle n'est pas verifiable — c'est exactement le flou que le
> ticket C8 reprochait a l'ancienne « phase 2 ». La rendre mesurable (un nombre
> de reservations abouties par mois, un nombre d'hotes actifs) est le premier
> travail a faire si l'on rouvre ces cartes.
>
> **Ce qui reste vrai et resservira** : l'etat reel du code, l'impossibilite pour
> Stripe de reverser vers la Tunisie, et le fait que la solution devra
> probablement etre double — un rail europeen ET un rail tunisien.
>
> Rien n'est supprime. Ces cartes sont un point de depart, pas un chantier en
> cours.

> **CARTE CADUQUE — remplacee par [Commission voyageur](../commission-voyageur/MAP.md).**
>
> Le payeur a change. Cette carte supposait que le professionnel tunisien payait
> un abonnement. Le ticket T3 a SOULEVE — sans jamais etre resolu — que le controle
> des changes le lui interdit en pratique ; l'utilisateur a confirme le point de sa
> propre experience et refait le modele : c'est le VOYAGEUR, diaspora ou touriste,
> donc porteur d'une carte etrangere, qui paie une commission.
>
> Le fait lui-meme n'est donc PAS verifie a la source. Il n'a plus a l'etre pour le
> modele actuel, ou aucun professionnel tunisien ne paie ; il devra l'etre si l'on
> revient un jour a les faire payer.
>
> Rien n'est supprime : les faits etablis ici restent valables et resservent. En
> particulier l'etat reel du code (abonnements entierement simules, aucun verrou,
> credits offerts) et l'impossibilite pour Stripe de reverser vers la Tunisie, qui
> redevient centrale des que l'etape A sera engagee.

# Carte — Monétisation par abonnement

`wayfinder:map` · traqueur : Markdown local (aucun traqueur configuré ; `/setup-matt-pocock-skills` n'a pas tourné sur ce dépôt)

## Destination

Une **décision verrouillée** sur l'unique source de revenus de BlediGo : qui paie,
combien, en échange de quoi, et ce qui se passe quand il cesse de payer — pour
les trois métiers (hôtes, prestataires ménage, agences de location).

Verrouillée, pas spécifiée : la grille tarifaire de trois métiers aux économies
très différentes n'est pas une question technique, et une spécification écrite
avant qu'elle soit tranchée serait à refaire. La carte est finie quand on peut
coder sans plus rien avoir à arbitrer.

## Notes

**Domaine.** BlediGo, place de marché de location courte durée en Tunisie,
adressée à la diaspora. Entité **française**, facturation en **EUR** : les hôtes
et agences gagnent en euros, comme ils le font déjà sur Airbnb et Booking.

**Ce qui rend cette carte critique.** Une décision antérieure (voir *Décisions
prises*, D0) écarte le séquestre : la plateforme ne touchera jamais l'argent des
séjours. L'abonnement n'est donc pas un revenu d'appoint, c'est **le seul**.

**Vocabulaire.** Quatre choses distinctes, à ne pas confondre :
*encaissement* (prendre l'argent du voyageur), *séquestre* (le retenir),
*reversement* (le verser à l'hôte), *commission* (la part de la plateforme).
Cette carte ne parle d'aucune des quatre : elle parle d'**abonnement**, c'est-à-dire
d'une somme que le professionnel verse à la plateforme pour l'usage du service.

**Compétences à charger par session.** `grilling` et `domain-modeling` pour tout
ticket de décision ; `research` pour les tickets de recherche.

**Préférence permanente.** Trouver les faits est le travail de l'agent, jamais
celui de l'utilisateur. Aucune question dont la réponse est dans le code, dans la
documentation d'un prestataire ou dans un texte réglementaire.

## Décisions prises

<!-- index : une ligne par décision, le détail vit dans son ticket -->

- **D0 — Pas de séquestre** *(hors ticket, arbitré par l'utilisateur au cadrage)* :
  la plateforme ne tient jamais l'argent du séjour. Le règlement reste de la main
  à la main. Conséquence assumée : validation à l'arrivée, refus et litiges
  deviennent **réputationnels** et non financiers.
- **D1 — Destination = décision verrouillée**, pas spécification. Voir *Destination*.
- **D2 — Le péage est un seuil, pas un accès** *(recommandation de l'agent, à
  renverser librement)* : publier reste possible gratuitement jusqu'à un seuil ;
  au-delà, l'abonnement. **Attention, ceci diverge de votre formulation initiale**
  (« la première annonce est gratuite pour une durée d'un mois »), qui décrit un
  accès payant avec période d'essai : au bout d'un mois, l'hôte à une seule
  annonce doit payer ou disparaître. Les deux se défendent et ne produisent pas
  le même marché. Le ticket T1 rouvre le sujet avec des chiffres.
- **D3 — La gratuité s'accroche au COMPTE**, pas à l'annonce *(recommandation de
  l'agent)* : par annonce, il suffirait d'en créer une par mois pour ne jamais
  payer, et l'hôte qui en publie trois le premier jour verrait ses trois essais
  expirer ensemble.
- **D4 — Les crédits fondent dans l'abonnement** *(recommandation de l'agent)* :
  deux monnaies à comprendre, c'est une de trop pour un hôte qui débute, et un
  revenu récurrent vaut mieux qu'un achat ponctuel. Le contre-argument est réel
  et consigné : le crédit fait payer l'hôte au moment exact où il voit une
  affaire à saisir.

## État du code au moment du cartographiage

Établi par lecture, pas supposé — sert de socle aux tickets :

| Élément | État réel |
|---|---|
| `Subscription` + 3 plans (29 / 79 / 199 € par mois) | **entièrement simulé** : `subscribe()` écrit `sub_sim_<horodatage>`, Stripe n'est jamais appelé |
| Verrou d'abonnement sur la publication | **inexistant** — aucun code ne vérifie un abonnement, nulle part |
| Plans pour le **ménage** et les **agences de location** | **inexistants** — `agency` désigne l'agence *immobilière* |
| « 5 annonces », « annonces illimitées » | chaînes décoratives, rien ne les applique |
| Première annonce gratuite un mois | **inexistante** |
| `POST /reverse-search/credits/purchase` | crédite **sans encaisser**. Trou **latent** : l'ouverture est gratuite tant que `PAIEMENT_EN_LIGNE` est faux, donc sans effet aujourd'hui |
| `ReverseSearchCredit`, packs 10/29 €, 50/99 €, 9999/299 € | modèle réel, prix déclarés, aucun paiement branché |

## Pas encore spécifié

<!-- brouillard dans le périmètre : réel, pas encore assez net pour un ticket -->

- **Recouvrement.** Relances, délai de grâce et conséquences d'un prélèvement qui
  échoue. Se précisera quand T6 aura dit ce que « ne plus payer » déclenche.
- **Impayé contre sanction.** Le projet suspend déjà des comptes pour fraude. Un
  compte suspendu pour impayé doit-il subir le même sort qu'un compte suspendu
  pour abus ? L'interaction avec `refusal-guard` et `no-show-guard` est à
  regarder, mais pas avant que T6 soit tranché.
- **Obligations de facturation.** Mentions légales, TVA, DAC7. Dépend de T4 et de
  la qualification des clients (professionnels ou particuliers).
- **Offres de lancement, parrainage, remises.** Sans intérêt tant que la grille
  de base n'existe pas.
- **Le prestataire ménage à la mission.** Un abonnement mensuel convient mal à
  quelqu'un qui intervient trois fois par an. Se précisera avec T2 et T5.

## Hors périmètre

<!-- consciemment écarté de CETTE carte ; ne graduera pas -->

- **Le sort du code de paiement dormant** (~360 lignes : `payments`, `disputes`,
  `insurance`, plus des accroches dans 8 modules). Découle de D0, mais concerne
  le paiement des séjours, pas l'abonnement. Chantier distinct.
- **Corriger les promesses « en attendant la phase 2 »**. Les conditions
  d'annulation annoncent partout — code, interface, messages de commit — qu'elles
  deviendront opposables quand le paiement par carte arrivera. Sous D0, c'est
  faux : elles restent sur l'honneur définitivement. Dette réelle à traiter, mais
  hors de cette carte.
- **Reversement des séjours vers la Tunisie.** Écarté par D0. Fait établi en
  chemin et conservé ici parce qu'il resservira si D0 est un jour renversé :
  Stripe ne couvre pas la Tunisie, ni en disponibilité, ni en bêta, ni pour
  Connect, et ne prend pas en charge les reversements transfrontaliers en
  libre-service hors US / UK / EEE / Canada / Suisse.

## Tickets

Le détail vit dans chaque fichier. Frontière = ouvert, non bloqué.

| Ticket | Type | État |
|---|---|---|
| [T1 — Seuil et durée de la gratuité](T1-seuil-gratuite.md) | grilling | frontière |
| [T2 — Ce que facturent les plateformes comparables](T2-tarifs-comparables.md) | research | frontière |
| [T3 — Une carte tunisienne peut-elle payer un commerçant français en EUR ?](T3-carte-tunisienne-eur.md) | research | frontière |
| [T4 — Stripe Billing d'une société française vers des clients tunisiens](T4-stripe-billing-tva.md) | research | frontière |
| [T5 — Grille tarifaire des trois métiers](T5-grille-trois-metiers.md) | grilling | bloqué par T1, T2, T3 |
| [T6 — Ce que devient un compte qui cesse de payer](T6-fin-abonnement.md) | grilling | bloqué par T1 |
| [T7 — Crédits : fermer l'achat gratuit et convertir les soldes](T7-credits-conversion.md) | grilling | frontière |

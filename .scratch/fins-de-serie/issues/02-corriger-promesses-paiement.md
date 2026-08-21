# 02: Corriger les promesses de paiement devenues fausses

**What to build:** le code et l'interface annoncent que les conditions
d'annulation sont sur l'honneur « en attendant la phase 2, quand le paiement par
carte les rendra opposables ». La monetisation est desormais reportee sans
echeance : le paiement reste en especes a l'arrivee, le menage sans frais. Cette
promesse ne sera donc pas tenue, et c'est le seul endroit du projet ou le texte
affiche annonce quelque chose de faux a un hote.

Apres ce ticket, les textes decrivent l'etat reel — le reglement se fait
directement entre les parties, ces conditions valent sur l'honneur — sans
promettre d'opposabilite future.

**PIEGE A NE PAS RATER.** « Phase 2 » designe DEUX sujets sans rapport dans ce
depot :

- la phase 2 du **paiement** — a corriger ;
- la phase 2 de l'**IA**, un modele appris qui remplacerait les heuristiques,
  dans `ai/scoring.service.ts` et `ai/features.service.ts` — a NE PAS TOUCHER.

Un remplacement en masse sur « phase 2 » corromprait les seconds. De meme, le mot
« opposable » est employe legitimement ailleurs (un refus a l'arrivee opposable au
proprietaire, un constat date et opposable) : seuls les emplois qui PROMETTENT une
opposabilite future sont vises.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Plus aucun texte affiche a l'utilisateur ne promet une opposabilite future
      liee au paiement par carte
- [ ] Les commentaires de `ai/scoring.service.ts` et `ai/features.service.ts`
      sont INTACTS : ils parlent d'autre chose
- [ ] Les emplois legitimes de « opposable » hors promesse sont conserves
- [ ] `common/mode-plateforme.ts` decrit le mode reellement en vigueur, sans
      annoncer une bascule datee
- [ ] Le texte cote hote (formulaire d'annonce) dit ce qui s'applique vraiment
      quand il redige ses conditions
- [ ] `npx jest` vert, les deux builds verts

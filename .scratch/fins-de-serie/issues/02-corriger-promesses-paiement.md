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

**Status:** DONE

- [x] Plus aucun texte affiche a l'utilisateur ne promet une opposabilite future
      liee au paiement par carte
- [x] Les commentaires de `ai/scoring.service.ts` et `ai/features.service.ts`
      sont INTACTS : ils parlent d'autre chose
- [x] Les emplois legitimes de « opposable » hors promesse sont conserves
- [x] `common/mode-plateforme.ts` decrit le mode reellement en vigueur, sans
      annoncer une bascule datee
- [x] Le texte cote hote (formulaire d'annonce) dit ce qui s'applique vraiment
      quand il redige ses conditions
- [x] `npx jest` vert, les deux builds verts

## Fait

Le perimetre etait plus etroit et le piege plus large que le ticket ne le disait.

PLUS ETROIT : un SEUL texte vu par l utilisateur promettait quelque chose —
`ListingEdit.tsx`, « valent sur l honneur jusqu a l arrivee du paiement par
carte ». Les deux autres textes decrivaient deja le reel. Ma formulation
« les textes annoncent partout » etait une exageration.

PLUS LARGE : « phase 2 » a TROIS sens dans ce depot, pas deux. Le paiement, le
modele appris de l IA, et — dans `CLAUDE.md` — l ouverture des comptes
prestataires par abonnement, elle aussi en sommeil depuis le report de la
monetisation. Corrigee au passage.

Verifie plutot qu affirme : les fichiers de l IA ne figurent pas dans
`git diff --name-only`, et sur onze emplois du mot « opposable » exactement un a
disparu, celui qui promettait.

AJOUT ASSUME : `mode-plateforme.ts` porte desormais un avertissement de danger.
`PAIEMENT_EN_LIGNE=true` n allume pas un systeme complet mais un systeme qui
encaisse et ne reverse jamais — aucun champ IBAN, aucune ligne de transfert, et
un hote tunisien ne peut pas etre un compte connecte Stripe. Poser cette variable
debiterait des voyageurs sans moyen de payer les hotes.

Une garde d execution serait plus solide qu un commentaire : elle merite son
propre ticket, elle n etait pas dans celui-ci.

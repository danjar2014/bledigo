# C8 — Ce qui declenche l'etape A

`wayfinder:grilling` · **frontiere**

## Question

A quelle condition precise BlediGo passe-t-il de l'etape B (commission seule) a
l'etape A (encaissement complet avec sequestre) ?

## Pourquoi ce ticket existe

Le projet porte deja une promesse de ce genre, et elle a mal vieilli. Le code
annonce partout que les conditions d'annulation sont « sur l'honneur EN ATTENDANT
la phase 2, quand le paiement par carte les rendra opposables ». Cette phrase est
dans le code, dans l'interface et dans les messages de commit — et rien ne definit
ce qu'est la phase 2 ni quand elle arrive. L'utilisateur a explicitement demande
que l'etape A ne reproduise pas ce flou.

## A trancher

- **La condition de declenchement**, en termes verifiables : volume de
  reservations, chiffre d'affaires, nombre d'hotes actifs, ou une date. Pas
  « quand ce sera mur ».
- **Le prealable bloquant** : un rail de reversement vers la Tunisie que Stripe ne
  fournit pas, et probablement un statut d'intermediaire de paiement. Ce sont des
  mois, pas des semaines. La condition doit en tenir compte.
- **Ce qu'on dit aux hotes et aux voyageurs en attendant.** Les textes actuels
  promettent une opposabilite ; ils doivent decrire l'etape B exactement, sans
  promettre l'etape A.
- **Ce qu'on fait du code de sequestre dormant** : conserve tel quel, ou gele
  explicitement avec la condition ci-dessus ecrite a cote ?

## Reponse

<!-- a remplir a la resolution -->

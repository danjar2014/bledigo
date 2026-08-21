# C1 — Taux et assiette de la commission

`wayfinder:grilling` · **bloque par** : C4 · bloque : C6, C7

## Question

Combien prend BlediGo, et sur quoi ?

## A trancher

- **Pourcentage ou montant fixe ?** Un pourcentage suit la valeur du sejour ; un
  montant fixe est previsible et ne penalise pas les biens chers. Un plancher et
  un plafond sont possibles.
- **L'assiette** : le total du sejour, les nuitees seules, nuitees plus menage ?
  `Booking` porte deja `basePrice`, `cleaningFee`, `serviceFee` et `insuranceFee`.
  Prelever sur les frais de menage revient a taxer un cout, pas une valeur.
- **Le nombre de nuits change tout.** Un taux fixe sur un sejour de trois semaines
  produit une commission que le voyageur trouvera indecente. Faut-il un plafond,
  ou un taux degressif ?
- **En sus, ou inclus ?** Le prix affiche par l'hote est-il majore de la
  commission, ou celle-ci se preleve-t-elle dedans ? En etape B la question a une
  reponse forcee : l'hote recoit sur place ce qu'il a annonce, donc la commission
  vient EN SUS. Il faut le dire explicitement, sinon l'hote se croira preleve.

## Reponse

<!-- a remplir a la resolution -->

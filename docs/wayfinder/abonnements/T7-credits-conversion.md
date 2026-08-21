# T7 — Credits : fermer l'achat gratuit et convertir les soldes

`wayfinder:grilling` · **frontiere**

## Question

D4 fait fondre les credits dans l'abonnement. Que deviennent le mecanisme existant
et les soldes deja attribues ?

## Etat actuel

- `ReverseSearchCredit` porte un solde par utilisateur ; un credit est consomme
  pour ouvrir une demande de recherche inversee.
- `POST /reverse-search/credits/purchase` **credite sans encaisser**. Le trou est
  LATENT et non actif : `creditsGratuits()` rend l'ouverture gratuite tant que
  `PAIEMENT_EN_LIGNE` est faux, donc le solde ne sert a rien aujourd'hui. Il
  deviendrait une fuite le jour ou les credits comptent.
- Trois packs declares — 10/29 EUR, 50/99 EUR, 9999/299 EUR — qu'aucun paiement
  n'accompagne.

## A trancher

- L'abonnement donne-t-il un **quota d'ouvertures par periode** (remis a zero
  chaque mois) ou un **acces illimite** selon le palier ? Le quota protege d'un
  usage massif ; l'illimite se comprend en une phrase.
- Que fait-on des soldes existants : conserves, convertis, effaces ?
- La route d'achat est-elle supprimee ou branchee sur un vrai paiement ? La
  supprimer est coherent avec D4 ; la garder rouvre la double monnaie que D4
  ecarte.
- Le niveau gratuit donne-t-il droit a des ouvertures ? Zero rend la recherche
  inversee invisible aux nouveaux hotes, qui sont precisement ceux qui ont besoin
  de trouver leurs premiers voyageurs.

## Reponse

<!-- a remplir a la resolution -->

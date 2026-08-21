# C2 — A quel moment la commission est-elle prelevee

`wayfinder:grilling` · **frontiere** · bloque : C5, C7

## Question

Le voyageur paie la commission a la DEMANDE, ou seulement quand l'hote ACCEPTE ?

## Ce que chaque choix coute

**A la demande.** Un seul geste, la carte est saisie tant que le voyageur est
motive. Mais l'hote refuse ou ne repond pas dans une partie des cas, et il faut
alors rembourser — des remboursements en volume, sur de petits montants, avec des
frais Stripe non recuperables a chaque fois. Et un voyageur debite pour un sejour
qu'il n'aura pas garde un mauvais souvenir, meme rembourse.

**A l'acceptation.** On ne debite que ce qui existe. Mais le voyageur doit revenir
payer apres coup, ou avoir laisse une empreinte de carte : s'il ne revient pas, la
reservation acceptee tombe et l'hote a bloque ses dates pour rien.

**Empreinte a la demande, debit a l'acceptation.** Le compromis usuel, et ce que
Stripe sait faire nativement. Plus de code, et une autorisation a une duree de vie
limitee qu'il faut confronter au delai de reponse de l'hote.

## Fait a etablir

Combien de temps un hote met-il a repondre, et quelle part des demandes est
refusee ou expire ? Le fait est dans la base ; il decide du cout du premier choix.

## Reponse

<!-- a remplir a la resolution -->

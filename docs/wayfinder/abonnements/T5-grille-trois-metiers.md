# T5 — Grille tarifaire des trois metiers

`wayfinder:grilling` · **bloque par** : T1, T2, T3

## Question

Quels plans, a quel prix, pour l'hote, le prestataire de menage et l'agence de
location de voitures ?

## Ce qui rend le ticket non trivial

Les trois metiers n'ont ni la meme economie ni le meme rythme.

- L'**hote** a un revenu saisonnier et un ou deux biens. Une somme fixe mensuelle
  lui pese en basse saison, quand il ne loue rien.
- Le **prestataire menage** intervient a la mission. Un abonnement mensuel
  convient mal a quelqu'un qui travaille trois fois par an, et tres bien a
  quelqu'un qui enchaine les interventions.
- L'**agence de location** a une flotte, donc un volume : c'est le seul des trois
  pour qui un palier par capacite a un sens evident.

Le code n'a aujourd'hui que trois plans, tous pour le logement, et `agency` y
designe l'agence IMMOBILIERE. Deux des trois metiers n'ont aucun plan.

## A trancher

- Une grille par metier, ou une grille commune a paliers ?
- L'unite qui fait le palier : annonces, vehicules, zones d'intervention, volume
  de demandes recues ?
- Le prix, en EUR, sachant que le client est tunisien et que T2 aura donne les
  points de comparaison.
- Le sort des trois plans existants : conserves, renommes, remplaces ?

## Reponse

<!-- a remplir a la resolution -->

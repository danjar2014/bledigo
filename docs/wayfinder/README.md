# Wayfinder — cartes du projet

Deux cartes ont ete tracees sur la monetisation. **Les deux sont en sommeil** :
l'utilisateur a arbitre de tout garder en l'etat, sans aucun paiement en ligne.

| Carte | Etat | Ce qu'elle suppose |
|---|---|---|
| [Abonnements](abonnements/MAP.md) | caduque, puis en sommeil | le professionnel tunisien paie un abonnement |
| [Commission voyageur](commission-voyageur/MAP.md) | en sommeil | le voyageur paie une commission a la reservation |

## Le modele en vigueur aujourd'hui

Aucun montant ne transite par la plateforme. Le voyageur regle son sejour **en
especes a l'arrivee**, la location de vehicule **a la remise des cles**, et le
menage ne coute rien. BlediGo met en relation et ne facture rien.

## L'invariant qui, lui, s'applique des maintenant

**Tout se calcule et se regle en TND.** L'euro et le dollar ne servent qu'a
afficher l'equivalent au voyageur etranger — jamais au calcul, jamais au
reglement, jamais dans un champ de saisie.

Consequence pratique, verifiee dans le code : `useMoney()` prend un montant
**stocke en TND** et le formate dans la devise d'affichage. Ce qu'il rend est de
l'affichage : cela ne repart ni vers l'API ni dans un champ. Passer un montant
deja libelle en EUR le fait traiter comme des dinars puis reconvertir, et le
bogue est silencieux.

## Ordre des lectures, si l'on rouvre

1. Rendre la condition de reveil mesurable. « Quand le site cartonne » ne se
   verifie pas, et c'est le reproche que le ticket C8 faisait deja a la
   « phase 2 ».
2. Reprendre [C4](commission-voyageur/C4-taux-comparables.md) et
   [C3](commission-voyageur/C3-tva-facturation.md) : les faits qu'ils cherchent
   ne dependent d'aucune decision et ne se perimeront guere.
3. Le mur du reversement vers la Tunisie reste entier. La solution sera
   probablement double, europeenne et tunisienne, comme l'utilisateur l'a
   anticipe.

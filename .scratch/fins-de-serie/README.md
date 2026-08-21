# Fins de serie — BlediGo

Quatre tickets independants, tires de ce qui trainait en fin de session. Aucun ne
bloque un autre : ils touchent des zones disjointes et peuvent partir en
parallele. Le seul blocage reel est HUMAIN, sur le ticket 03.

Traqueur en fichiers locaux, faute de traqueur configure sur ce depot
(`/setup-matt-pocock-skills` n'a pas tourne).

| # | Ticket | Risque | Bloque par |
|---|---|---|---|
| ~~[01](issues/01-restreindre-notation-annonce.md)~~ | ~~Restreindre l'acces a la notation d'annonce~~ | faible | **FAIT** |
| ~~[02](issues/02-corriger-promesses-paiement.md)~~ | ~~Corriger les promesses de paiement devenues fausses~~ | faible | **FAIT** |
| [03](issues/03-photos-supabase.md) | Raccorder le stockage des photos a Supabase | faible | **PRET** : code verifie et corrige, lancez `scripts/raccorder-stockage-photos.sh` |
| [04](issues/04-migrations-reconstructibles.md) | Rendre les migrations reconstructibles a neuf | **eleve** | **CLOS PARTIELLEMENT** : une base neuve se construit, le renommage attend une base d'essai |

L'ordre est celui du risque croissant, pas d'une dependance. Le 04 est le seul
qui puisse casser la production s'il est traite a la legere : sa contrainte est
ecrite en tete de ticket.

## Ce qui n'est PAS ici, et pourquoi

- **Sortir le mot de passe Supabase de OneDrive** et **cliquer sur « Reprendre le
  referentiel » des villes** : des gestes qui appartiennent a l'utilisateur, pas
  des tickets.
- **Aligner les plans d'abonnement sur le TND** : ils restent libelles en EUR,
  contraire a la regle du tout-TND, mais sans effet tant que la monetisation dort.
  Laisse en sommeil avec les cartes Wayfinder.

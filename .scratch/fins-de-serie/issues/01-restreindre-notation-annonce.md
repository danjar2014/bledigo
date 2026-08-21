# 01: Restreindre l'acces a la notation d'annonce

**What to build:** aujourd'hui `GET /api/v1/ai/listings/:id/score` ne porte que
`JwtAuthGuard`. N'importe quel compte connecte peut faire noter n'importe quelle
annonce, y compris celle d'un concurrent : il apprend son score de qualite, ses
criteres echoues et ses axes d'amelioration. Apres ce ticket, seuls le
proprietaire de l'annonce et l'administration y accedent.

La route voisine `GET /api/v1/ai/listings/:id/fraud` est a examiner dans le meme
mouvement : elle expose des signaux d'anti-fraude et porte la meme garde.

**Blocked by:** None (can start immediately).

**Status:** DONE

- [x] Un compte authentifie qui n'est ni proprietaire de l'annonce ni
      administrateur recoit un refus sur `/ai/listings/:id/score`
- [x] Le proprietaire de l'annonce continue d'y acceder sans changement
- [x] Un administrateur continue d'y acceder
- [x] La route `/ai/listings/:id/fraud` a ete examinee et traitee de la meme
      facon, ou une raison ecrite explique pourquoi elle reste ouverte
- [x] Un test couvre le refus du tiers, pas seulement l'acces autorise :
      c'est le refus qui est la regle nouvelle
- [x] `npx jest` vert, `nest build` vert

## Fait

Garde posee dans le SERVICE et non dans le controleur : le droit se lit sur
l ANNONCE, et aucun role ne dit a lui seul si ce compte-ci possede celle-la.
`/fraud` a ete traitee de la meme facon — elle est meme plus sensible, ses
signaux portant sur la personne du proprietaire.

Verifie contre l API reelle et pas seulement en unitaire : hote 201/200 sur ses
propres annonces, tiers connecte 403 sur les deux routes, sans fuite de contenu.
8 tests, 172 au total.

`GET /ai/price-suggestion` reste PUBLIQUE, deliberement : elle rend des moyennes
de marche par ville, pas des donnees d annonce. Hors perimetre de ce ticket.

La revue a trouve un defaut dans le commentaire, pas dans le code : j avais ecrit
que l ordre des controles empechait de distinguer une annonce absente d une
annonce interdite, alors qu il fait l inverse. Le commentaire dit desormais ce
que le code fait, et pourquoi c est acceptable.

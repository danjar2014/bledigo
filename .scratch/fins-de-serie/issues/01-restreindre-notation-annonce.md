# 01: Restreindre l'acces a la notation d'annonce

**What to build:** aujourd'hui `GET /api/v1/ai/listings/:id/score` ne porte que
`JwtAuthGuard`. N'importe quel compte connecte peut faire noter n'importe quelle
annonce, y compris celle d'un concurrent : il apprend son score de qualite, ses
criteres echoues et ses axes d'amelioration. Apres ce ticket, seuls le
proprietaire de l'annonce et l'administration y accedent.

La route voisine `GET /api/v1/ai/listings/:id/fraud` est a examiner dans le meme
mouvement : elle expose des signaux d'anti-fraude et porte la meme garde.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Un compte authentifie qui n'est ni proprietaire de l'annonce ni
      administrateur recoit un refus sur `/ai/listings/:id/score`
- [ ] Le proprietaire de l'annonce continue d'y acceder sans changement
- [ ] Un administrateur continue d'y acceder
- [ ] La route `/ai/listings/:id/fraud` a ete examinee et traitee de la meme
      facon, ou une raison ecrite explique pourquoi elle reste ouverte
- [ ] Un test couvre le refus du tiers, pas seulement l'acces autorise :
      c'est le refus qui est la regle nouvelle
- [ ] `npx jest` vert, `nest build` vert

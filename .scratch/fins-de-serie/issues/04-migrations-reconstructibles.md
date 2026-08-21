# 04: Rendre les migrations reconstructibles a neuf

**What to build:** une base vide ne peut pas etre construite. `20260814_avis_mutuels`
execute `DROP INDEX "service_reviews_service_booking_id_key"`, index que
`20260814_prestataires` cree. Prisma applique les migrations dans l'ordre
ALPHABETIQUE des dossiers, et `avis_mutuels` passe avant `prestataires` : le DROP
s'execute donc avant le CREATE, sur un index qui n'existe pas encore.

Apres ce ticket, `prisma migrate deploy` part d'une base vide jusqu'au schema
courant sans erreur.

**CONTRAINTE FORTE — a lire avant de toucher quoi que ce soit.** Les deux
migrations sont DEJA APPLIQUEES en production. Renommer un dossier change le nom
enregistre dans `_prisma_migrations` : Prisma verrait alors une migration
manquante et une migration inconnue, et refuserait de deployer. Le remede serait
pire que le mal.

La correction doit donc laisser intacts les noms deja appliques. Deux pistes,
a evaluer avant de choisir : rendre les instructions elles-memes insensibles a
l'ordre (`DROP INDEX IF EXISTS`, creation idempotente), ou ajouter une migration
posterieure qui retablit l'etat attendu. La verification, elle, ne se discute
pas : elle se fait sur une base VIDE, pas sur la base de developpement existante.

C'est le seul ticket de ce lot qui demande de la prudence. Ne pas le traiter comme
un renommage.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `prisma migrate deploy` reussit depuis une base VIDE, verifie reellement
      et pas seulement raisonne
- [ ] Aucun nom de migration deja appliquee n'a change
- [ ] La production n'est pas perturbee : `migrate deploy` sur la base existante
      reste sans effet ou n'applique que la nouvelle migration
- [ ] `prisma migrate diff` entre le schema et le resultat des migrations est vide
- [ ] Le defaut documente dans `CLAUDE.md` est mis a jour ou retire selon l'issue

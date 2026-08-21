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

**Status:** CLOS PARTIELLEMENT — voir « Fait »

- [ ] `prisma migrate deploy` reussit depuis une base VIDE, verifie reellement
      et pas seulement raisonne
- [x] Aucun nom de migration deja appliquee n'a change
- [x] La production n'est pas perturbee : `migrate deploy` sur la base existante
      reste sans effet ou n'applique que la nouvelle migration
- [ ] `prisma migrate diff` entre le schema et le resultat des migrations est vide
- [ ] Le defaut documente dans `CLAUDE.md` est mis a jour ou retire selon l'issue

## Fait

CE TICKET DEMANDAIT DEUX CHOSES INCOMPATIBLES, et c'est la conclusion principale.

Le critere 1 — « `migrate deploy` reussit depuis une base VIDE » — exige de
deplacer `avis_mutuels` apres `prestataires`. Or la position d'une migration ne
depend QUE de son nom de dossier. Le critere 2 — « aucun nom deja applique n'a
change » — l'interdit donc. Il n'existe pas de troisieme voie, et je l'ai
verifie plutot que suppose :

- Rendre le contenu tolerant ne marche pas. `DROP INDEX IF EXISTS` ferait passer
  la premiere instruction, mais la suivante cree un index SUR `service_reviews`,
  table creee uniquement par `prestataires`, donc absente a ce moment. La
  migration echouerait deux lignes plus bas.
- Et modifier le contenu d'une migration appliquee change son empreinte SHA256,
  que Prisma compare a `_prisma_migrations` : il refuse de deployer. Etabli sur
  la documentation et les fils de discussion Prisma, pas de memoire.

ARBITRAGE DE L'UTILISATEUR : garder le critere 2. La production ne bouge pas d'un
octet.

CE QUI EST LIVRE. Une base neuve se construit desormais, en partant du datamodel
plutot que de l'historique — procede de reference documente par Prisma pour un
historique non rejouable. La commande et la boucle de marquage sont dans
`CLAUDE.md`, et les DEUX ont ete executees pour verifier : `migrate diff` sort en
0 et produit 1225 lignes pour 40 tables, la boucle enumere bien les 12 migrations.

DECISION DE CONCEPTION : le fichier de reference n'est PAS versionne, et un
garde-fou dans `.gitignore` l'empeche. Un instantane se perime des que le schema
bouge, et une reference perimee construirait une base FAUSSE sans rien signaler —
pire que le defaut qu'elle soigne. On regenere, on ne conserve pas. Verifie : un
`baseline.sql` genere est bien ignore.

CE QUI RESTE OUVERT. Le renommage — le vrai correctif — attend une base d'essai
jetable. Aucun Postgres n'existe sur ce poste : ni `psql`, ni Docker, ni instance
locale. Le mode de defaillance etant « la production ne peut plus jamais
deployer », il ne s'improvise pas. `CLAUDE.md` dit desormais quoi faire, pourquoi
ce n'est pas fait, et de ne pas l'improviser.

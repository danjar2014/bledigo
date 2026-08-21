# 03: Raccorder le stockage des photos a Supabase

**What to build:** en production les photos sont en mode SIMULE — la coquille
existe, le raccordement non. Un hote qui ajoute une photo croit l'avoir envoyee.
Apres ce ticket, une photo envoyee depuis le navigateur est reellement stockee et
reaffichee.

**Blocked by:** une action HUMAINE, seul vrai blocage de ce lot. Il faut creer un
bucket public `medias` sur le projet Supabase et fournir la cle `service_role`,
puis renseigner `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` et `SUPABASE_BUCKET` sur le
service `bledigo-api` de Render. Ces variables sont `sync: false` dans
`render.yaml` : elles ne sont jamais provisionnees automatiquement.

C'est exactement ce que la competence `/wizard` sait produire — un script qui
ouvre chaque page, capture chaque valeur et l'ecrit — plutot qu'une procedure
reexpliquee a chaque session.

**Status:** ready-for-agent (la partie agent demarre une fois les variables
posees)

- [ ] Le bucket `medias` existe et est lisible publiquement
- [ ] Les trois variables sont renseignees sur `bledigo-api` en production
- [ ] `media.service.ts` ne journalise plus le mode simule au demarrage
- [ ] Une photo envoyee depuis le navigateur est stockee chez Supabase et
      reaffichee apres rechargement complet de la page
- [ ] L'encart rouge de `annonces/nouvelle` qui annonce que l'envoi n'existe pas
      a disparu, puisqu'il existe
- [ ] Le mode simule reste actif en local sans variables : le developpement ne
      doit rien exiger

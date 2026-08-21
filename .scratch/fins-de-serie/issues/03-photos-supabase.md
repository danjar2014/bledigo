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

**Status:** PRET — ne reste que l approvisionnement, qui vous appartient

- [ ] Le bucket `medias` existe et est lisible publiquement
- [ ] Les trois variables sont renseignees sur `bledigo-api` en production
- [ ] `media.service.ts` ne journalise plus le mode simule au demarrage
- [ ] Une photo envoyee depuis le navigateur est stockee chez Supabase et
      reaffichee apres rechargement complet de la page
- [x] L'encart rouge de `annonces/nouvelle` a disparu (fait dans une session anterieure)
- [x] Le mode simule reste actif en local sans variables : le developpement ne
      doit rien exiger

## Fait cote agent

LE CODE A ETE VERIFIE, ce qui etait le vrai risque : ce raccordement n avait
JAMAIS tourne contre un Supabase reel. S il etait faux, fournir la cle n aurait
servi a rien.

Verifie contre le comportement du client officiel `storage-js`, endpoint par
endpoint : `POST /object/upload/sign/{bucket}/{chemin}` est le bon appel, la
reponse rend un chemin relatif que le service recompose correctement en
`${SUPABASE_URL}/storage/v1` + chemin, le navigateur televerse bien en `PUT` avec
le bon `Content-Type`, et l URL publique suit le format standard. La chaine est
saine de bout en bout.

UN DEFAUT CORRIGE avant la premiere utilisation. Le corps de la requete de
signature envoyait `{ expiresIn: 600 }`. `expiresIn` est une option des URL de
TELECHARGEMENT signees, pas d envoi : au mieux le serveur l ignorait et le
commentaire mentait sur la duree, au pire il rejetait un champ inattendu et
l envoi n aurait jamais marche du premier coup. Le corps est desormais `{}`,
comme dans `storage-js`.

ETAT DE LA PRODUCTION, constate dans les journaux Render et non suppose : le
dernier demarrage (21/08 14:13) journalise encore « SUPABASE_URL ou
SUPABASE_SERVICE_KEY absent : envoi de fichiers en mode simule ».

DEUX VARIABLES, PAS TROIS. `SUPABASE_BUCKET` porte deja `value: medias` dans
`render.yaml` : seules `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` sont a saisir.

## Ce qui vous revient

`scripts/raccorder-stockage-photos.sh` — un assistant qui ouvre chaque page dans
l ordre, dit exactement quoi cliquer, et verifie a la fin.

```bash
bash scripts/raccorder-stockage-photos.sh
```

L assistant ne vous demande JAMAIS la cle `service_role` et n ecrit aucun secret
sur le disque. Cette cle contourne toute la securite au niveau des lignes : la
faire transiter par un script puis par un fichier local repeterait le probleme du
fichier de mots de passe sur OneDrive. Vous la copiez de Supabase vers Render
directement.

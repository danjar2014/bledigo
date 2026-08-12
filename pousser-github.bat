@echo off
chcp 65001 >nul
cd /d "%~dp0"
set LOG=%~dp0pousser-github.log

echo === Envoi vers GitHub === > "%LOG%"
echo Date: %DATE% %TIME% >> "%LOG%"
echo. >> "%LOG%"

REM ATTENTION - ce script regenerait 0_init a chaque execution.
REM
REM C etait sans consequence tant que la base de production n existait pas.
REM Depuis qu elle est en service, Prisma compare l empreinte de chaque
REM migration deja appliquee : en reecrire une seule fait echouer
REM `migrate deploy`, et donc TOUS les deploiements suivants.
REM
REM Une migration appliquee ne se modifie jamais. Pour faire evoluer le
REM modele, on ajoute un dossier supplementaire dans prisma\migrations.

echo [1/3] Etat local >> "%LOG%"
call git branch --show-current >> "%LOG%" 2>&1
call git status --short >> "%LOG%" 2>&1

echo [2/3] Commit des modifications locales >> "%LOG%"
call git add -A >> "%LOG%" 2>&1
call git commit -m "Modifications locales" >> "%LOG%" 2>&1

echo [3/3] Envoi de la branche main >> "%LOG%"
call git push -u origin main >> "%LOG%" 2>&1
if errorlevel 1 goto :echec

echo. >> "%LOG%"
call git ls-remote --heads origin >> "%LOG%" 2>&1
echo RESULTAT: SUCCES >> "%LOG%"
exit /b 0

:echec
echo. >> "%LOG%"
echo RESULTAT: ECHEC - voir les messages ci-dessus >> "%LOG%"
exit /b 0

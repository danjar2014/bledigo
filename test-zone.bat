@echo off
chcp 65001 >nul
cd /d "%~dp0"
set LOG=%~dp0pousser-github.log

echo === Envoi vers GitHub === > "%LOG%"
echo Date: %DATE% %TIME% >> "%LOG%"
echo. >> "%LOG%"

REM L authentification s appuie sur Git Credential Manager, deja configure sur
REM ce poste. Si aucun identifiant n est memorise, une fenetre de connexion
REM GitHub s ouvre : la valider, puis relancer ce script.

echo [1/4] Etat local >> "%LOG%"
call git branch --show-current >> "%LOG%" 2>&1
call git log --oneline -3 >> "%LOG%" 2>&1
call git remote -v >> "%LOG%" 2>&1
echo. >> "%LOG%"

echo [2/4] Rien a committer ? >> "%LOG%"
call git status --short >> "%LOG%" 2>&1
echo. >> "%LOG%"

echo [3/4] Envoi de la branche main >> "%LOG%"
call git push -u origin main >> "%LOG%" 2>&1
if errorlevel 1 goto :echec

echo. >> "%LOG%"
echo [4/4] Verification cote distant >> "%LOG%"
call git ls-remote --heads origin >> "%LOG%" 2>&1

echo. >> "%LOG%"
echo RESULTAT: SUCCES >> "%LOG%"
goto :fin

:echec
echo. >> "%LOG%"
echo RESULTAT: ECHEC >> "%LOG%"

:fin
exit /b 0

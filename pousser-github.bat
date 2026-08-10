@echo off
chcp 65001 >nul
cd /d "%~dp0"
set LOG=%~dp0pousser-github.log

echo === Regeneration de la migration puis envoi vers GitHub === > "%LOG%"
echo Date: %DATE% %TIME% >> "%LOG%"
echo. >> "%LOG%"

REM Le schema PostgreSQL a change : l ancienne migration decrivait des enums
REM natifs et des colonnes DECIMAL qui n existent plus. On la regenere.

echo [1/5] Suppression de l ancienne migration >> "%LOG%"
if exist "bledigo-api\prisma\migrations\0_init" rmdir /s /q "bledigo-api\prisma\migrations\0_init"
mkdir "bledigo-api\prisma\migrations\0_init" 2>nul

echo [2/5] Generation du SQL depuis schema.postgres.prisma >> "%LOG%"
pushd bledigo-api
> "prisma\migrations\migration_lock.toml" echo # Genere par pousser-github.bat
>> "prisma\migrations\migration_lock.toml" echo provider = "postgresql"
call npx prisma migrate diff ^
  --from-empty ^
  --to-schema-datamodel prisma/schema.postgres.prisma ^
  --script > "prisma\migrations\0_init\migration.sql" 2>> "%LOG%"
popd

for %%A in ("bledigo-api\prisma\migrations\0_init\migration.sql") do (
  echo   migration.sql : %%~zA octets >> "%LOG%"
  if %%~zA LSS 500 goto :echec
)

echo [3/5] Etat local >> "%LOG%"
call git branch --show-current >> "%LOG%" 2>&1
call git status --short >> "%LOG%" 2>&1

echo [4/5] Commit de la migration regeneree >> "%LOG%"
call git add -A >> "%LOG%" 2>&1
call git commit -m "Migration PostgreSQL regeneree depuis le schema aligne" >> "%LOG%" 2>&1

echo [5/5] Envoi de la branche main >> "%LOG%"
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

REM ---------------- ancien contenu, conserve pour reference ----------------
cd /d "%~dp0bledigo-api"

REM Render applique les migrations avec `prisma migrate deploy`, qui exige un
REM dossier prisma/migrations. On le cree une fois, a partir du schema Postgres.

REM On teste la TAILLE et non la seule existence : un fichier vide, laisse par
REM une generation interrompue, ferait croire a tort que la migration est prete.
set MIGSIZE=0
for %%A in ("prisma\migrations\0_init\migration.sql") do set MIGSIZE=%%~zA

if %MIGSIZE% GTR 500 (
  echo La migration initiale existe deja et semble complete : %MIGSIZE% octets >> "%LOG%"
  echo Supprimez prisma\migrations\0_init si vous voulez la regenerer. >> "%LOG%"
  goto :fin
)

if %MIGSIZE% GTR 0 (
  echo Fichier incomplet detecte ^(%MIGSIZE% octets^) : regeneration. >> "%LOG%"
)

mkdir "prisma\migrations\0_init" 2>nul

echo [1/2] Verrou de provider >> "%LOG%"
> "prisma\migrations\migration_lock.toml" echo # Genere par preparer-migration.bat
>> "prisma\migrations\migration_lock.toml" echo provider = "postgresql"

echo [2/2] Generation du SQL depuis schema.postgres.prisma >> "%LOG%"
call npx prisma migrate diff ^
  --from-empty ^
  --to-schema-datamodel prisma/schema.postgres.prisma ^
  --script > "prisma\migrations\0_init\migration.sql" 2>> "%LOG%"

if errorlevel 1 goto :echec

for %%A in ("prisma\migrations\0_init\migration.sql") do (
  echo   migration.sql : %%~zA octets >> "%LOG%"
  if %%~zA LSS 500 goto :echec
)

echo. >> "%LOG%"
echo RESULTAT: SUCCES >> "%LOG%"
echo La migration est prete dans bledigo-api\prisma\migrations\0_init >> "%LOG%"
goto :fin

:echec
echo. >> "%LOG%"
echo RESULTAT: ECHEC - consultez les messages ci-dessus >> "%LOG%"

:fin
exit /b 0

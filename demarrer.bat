@echo off
chcp 65001 >nul
title BlediGo - demarrage
cd /d "%~dp0"

echo ===============================================
echo   BlediGo - demarrage de l environnement local
echo ===============================================
echo.

echo [1/4] Verification de Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo   ECHEC : Node.js est introuvable. Installez-le depuis https://nodejs.org
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo   Node %%v
echo.

echo [2/4] Preparation de la base de donnees...
echo   ^(prisma generate + db push + seed^)
cd /d "%~dp0bledigo-api"
if not exist node_modules (
  echo   Installation des dependances API...
  call npm install
)
call npm run db:setup
if errorlevel 1 (
  echo.
  echo   ECHEC de la preparation de la base. Lisez les messages ci-dessus.
  pause
  exit /b 1
)
echo   Base prete.
echo.

echo [3/4] Demarrage de l API sur http://localhost:4000 ...
start "BlediGo API" cmd /k "cd /d %~dp0bledigo-api && npm run start:dev"

echo [4/4] Demarrage du site sur http://localhost:3000 ...
cd /d "%~dp0bledigo-web"
if not exist node_modules (
  echo   Installation des dependances Web...
  call npm install
)
start "BlediGo Web" cmd /k "cd /d %~dp0bledigo-web && npm run dev"

echo.
echo Attente du demarrage du serveur ^(20s^)...
timeout /t 20 /nobreak >nul
start "" http://localhost:3000

echo.
echo ===============================================
echo   Termine.
echo   Site  : http://localhost:3000
echo   API   : http://localhost:4000
echo   Doc   : http://localhost:4000/api/docs
echo.
echo   Deux fenetres se sont ouvertes ^(API et Web^).
echo   Fermez-les pour arreter les serveurs.
echo ===============================================
pause

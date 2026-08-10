@echo off
chcp 65001 >nul
title BlediGo - redemarrage du site
cd /d "%~dp0"

echo ===============================================
echo   Redemarrage du serveur de developpement
echo ===============================================
echo.

echo [1/3] Arret du serveur qui occupe le port 3000...
set FOUND=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') do (
  echo   arret du processus %%p
  taskkill /PID %%p /F >nul 2>&1
  set FOUND=1
)
if "%FOUND%"=="0" echo   aucun serveur en cours sur le port 3000.
timeout /t 3 /nobreak >nul

echo [2/3] Demarrage du site...
start "BlediGo Web" cmd /k "cd /d %~dp0bledigo-web && npm run dev"

echo [3/3] Ouverture des nouvelles pages pour declencher la compilation...
timeout /t 20 /nobreak >nul
start "" http://localhost:3000/carte
timeout /t 10 /nobreak >nul
start "" http://localhost:3000/villes/tunis
timeout /t 6 /nobreak >nul
start "" http://localhost:3000

echo.
echo Termine. Consultez la fenetre "BlediGo Web" pour le resultat de compilation.
timeout /t 5 >nul

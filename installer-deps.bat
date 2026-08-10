@echo off
chcp 65001 >nul
title BlediGo - installation des dependances
cd /d "%~dp0"

echo ===============================================
echo   Installation des nouvelles dependances
echo ===============================================
echo.
echo Ajout de Leaflet pour la recherche sur carte.
echo.

cd /d "%~dp0bledigo-web"
call npm install
if errorlevel 1 (
  echo.
  echo   ECHEC de l installation. Lisez les messages ci-dessus.
  pause
  exit /b 1
)

echo.
echo ===============================================
echo   Termine.
echo   Relancez demarrer.bat, ou redemarrez juste
echo   la fenetre du site si elle tourne deja.
echo ===============================================
pause

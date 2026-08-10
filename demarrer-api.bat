@echo off
chcp 65001 >nul
title BlediGo - demarrage de l API
cd /d "%~dp0"

echo ===============================================
echo   Demarrage de l API BlediGo (port 4000)
echo ===============================================
echo.

REM Liberer le port si un processus fantome le retient
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4000" ^| findstr LISTENING') do (
  echo   arret du processus residuel %%p
  taskkill /PID %%p /F >nul 2>&1
)

start "BlediGo API" cmd /k "cd /d %~dp0bledigo-api && npm run start:dev"

echo Demarrage en cours, verification dans 30 secondes...
timeout /t 30 /nobreak >nul

set LOG=%~dp0diagnostic.log
echo === Verification apres demarrage === > "%LOG%"
echo Date: %DATE% %TIME% >> "%LOG%"
echo. >> "%LOG%"
echo --- Port 4000 --- >> "%LOG%"
netstat -ano | findstr ":4000" | findstr LISTENING >> "%LOG%" 2>&1
if errorlevel 1 echo   TOUJOURS RIEN sur 4000 >> "%LOG%"
echo. >> "%LOG%"
echo --- /health --- >> "%LOG%"
curl -s -o nul -w "code HTTP: %%{http_code}" http://localhost:4000/health >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo FIN >> "%LOG%"

exit /b 0

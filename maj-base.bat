@echo off
chcp 65001 >nul
title BlediGo - mise a jour de la base
cd /d "%~dp0"
set LOG=%~dp0maj-base.log

echo =============================================== > "%LOG%"
echo   Mise a jour du schema et du client Prisma    >> "%LOG%"
echo =============================================== >> "%LOG%"
echo. >> "%LOG%"

REM L API verrouille query_engine-windows.dll : il faut l arreter avant de regenerer.
echo [1/4] Arret de l API (port 4000) >> "%LOG%"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4000" ^| findstr LISTENING') do (
  echo   arret du processus %%p >> "%LOG%"
  taskkill /PID %%p /F >> "%LOG%" 2>&1
)
timeout /t 4 /nobreak >nul

cd /d "%~dp0bledigo-api"

echo. >> "%LOG%"
echo [2/4] prisma generate >> "%LOG%"
call npx prisma generate >> "%LOG%" 2>&1
if errorlevel 1 goto :echec

echo. >> "%LOG%"
echo [3/4] prisma db push >> "%LOG%"
call npx prisma db push >> "%LOG%" 2>&1
if errorlevel 1 goto :echec

echo. >> "%LOG%"
echo [4/4] Redemarrage de l API >> "%LOG%"
start "BlediGo API" cmd /k "cd /d %~dp0bledigo-api && npm run start:dev"

echo. >> "%LOG%"
echo RESULTAT: SUCCES >> "%LOG%"
exit /b 0

:echec
echo. >> "%LOG%"
echo RESULTAT: ECHEC >> "%LOG%"
start "BlediGo API" cmd /k "cd /d %~dp0bledigo-api && npm run start:dev"
exit /b 1

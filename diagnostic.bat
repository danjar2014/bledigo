@echo off
chcp 65001 >nul
cd /d "%~dp0"
set LOG=%~dp0diagnostic.log
echo === Diagnostic BlediGo === > "%LOG%"
echo Date: %DATE% %TIME% >> "%LOG%"
echo. >> "%LOG%"
echo --- Ports --- >> "%LOG%"
netstat -ano | findstr ":4000" | findstr LISTENING >> "%LOG%" 2>&1
netstat -ano | findstr ":3000" | findstr LISTENING >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo --- /health --- >> "%LOG%"
curl -s -o nul -w "code HTTP: %%{http_code}" http://localhost:4000/health >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo --- referentiel des localites --- >> "%LOG%"
curl -s -o nul -w "code HTTP: %%{http_code}" http://localhost:4000/api/v1/localities >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo --- nombre de gouvernorats renvoyes --- >> "%LOG%"
curl -s http://localhost:4000/api/v1/localities > "%~dp0localities.json" 2>&1
for %%A in ("%~dp0localities.json") do echo taille reponse: %%~zA octets >> "%LOG%"
echo. >> "%LOG%"
echo FIN >> "%LOG%"
exit /b 0

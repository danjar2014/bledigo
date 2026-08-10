@echo off
chcp 65001 >nul
cd /d "%~dp0"
set LOG=%~dp0test-zone.log
set API=http://localhost:4000/api/v1

echo === Test : la consultation debite-t-elle des credits ? === > "%LOG%"
echo. >> "%LOG%"

curl -s -X POST %API%/auth/login -H "Content-Type: application/json" ^
  -d "{\"email\":\"traveler@bledigo.com\",\"password\":\"Password123!\"}" > tok.json 2>&1
for /f "usebackq tokens=* delims=" %%T in (`powershell -NoProfile -Command "(Get-Content tok.json -Raw | ConvertFrom-Json).accessToken"`) do set TOKEN=%%T
if "%TOKEN%"=="" ( echo ECHEC login >> "%LOG%" & goto :fin )

echo [solde initial] >> "%LOG%"
curl -s %API%/reverse-searches/credits -H "Authorization: Bearer %TOKEN%" > c0.json
powershell -NoProfile -Command "'   credits = ' + (Get-Content c0.json -Raw | ConvertFrom-Json).creditsRemaining" >> "%LOG%"

echo. >> "%LOG%"
echo [3 consultations successives de la liste] >> "%LOG%"
for /L %%i in (1,1,3) do (
  curl -s "%API%/reverse-searches/available?scope=region" -H "Authorization: Bearer %TOKEN%" > a%%i.json
  powershell -NoProfile -Command "$d=Get-Content a%%i.json -Raw | ConvertFrom-Json; '   passage %%i : total=' + $d.total + ' verrouillees=' + $d.lockedCount + ' credits=' + $d.creditsRemaining" >> "%LOG%"
)

echo. >> "%LOG%"
echo [solde final] >> "%LOG%"
curl -s %API%/reverse-searches/credits -H "Authorization: Bearer %TOKEN%" > c1.json
powershell -NoProfile -Command "'   credits = ' + (Get-Content c1.json -Raw | ConvertFrom-Json).creditsRemaining" >> "%LOG%"

:fin
echo. >> "%LOG%"
echo FIN >> "%LOG%"
del tok.json c0.json c1.json a1.json a2.json a3.json >nul 2>&1
exit /b 0

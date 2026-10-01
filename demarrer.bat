@echo off
chcp 65001 >nul
title ZAAK MOTORS - Logiciel atelier (ne pas fermer cette fenetre)
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js n'est pas installe sur ce PC.
  echo  Installez-le une seule fois avec la commande :  winget install OpenJS.NodeJS.LTS
  echo  ou depuis https://nodejs.org puis relancez ce fichier.
  echo.
  pause
  exit /b 1
)

rem Logiciel deja demarre : on ouvre simplement le navigateur
netstat -ano | findstr /r /c:":3000 .*LISTENING" >nul
if not errorlevel 1 (
  start "" http://localhost:3000
  exit /b 0
)

rem Dossier copie depuis un autre PC : les liens internes de node_modules sont casses, on reinstalle
if not exist node_modules\@garage\shared\package.json (
  echo Installation des composants, premiere utilisation sur ce PC. Patientez...
  if exist node_modules\@garage rmdir /s /q node_modules\@garage
  call npm install
  if errorlevel 1 goto :error
)

if not exist apps\client\dist\index.html (
  echo Preparation de l'interface...
  call npm run build
  if errorlevel 1 goto :error
)

start "" /b cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:3000"
call npm start
goto :end

:error
echo.
echo  Une erreur est survenue. Verifiez la connexion internet (premiere installation) et reessayez.

:end
pause

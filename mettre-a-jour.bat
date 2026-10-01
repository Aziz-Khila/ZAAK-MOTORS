@echo off
chcp 65001 >nul
setlocal
title ZAAK MOTORS - Mise a jour
rem Met a jour le logiciel sans toucher au dossier data (clients, factures, sauvegardes).
rem Ce fichier peut etre remplace par la mise a jour : on l'execute depuis une copie temporaire.
if not "%~1"=="--copie" (
  copy /y "%~f0" "%TEMP%\zaak-motors-mise-a-jour.bat" >nul
  "%TEMP%\zaak-motors-mise-a-jour.bat" --copie "%~dp0."
)
cd /d "%~2"

where git >nul 2>nul || set "PATH=%PATH%;C:\Program Files\Git\cmd"
if not exist .git (
  echo  Ce dossier n'a pas ete installe avec installer.bat : mise a jour impossible.
  goto :end
)

for /f %%f in ('git status --porcelain -uno ^| findstr /v /c:"package-lock.json"') do (
  echo  Des fichiers du logiciel ont ete modifies sur ce PC : mise a jour annulee pour ne rien perdre.
  goto :end
)

:running
netstat -ano | findstr /r /c:":3000 .*LISTENING" >nul
if not errorlevel 1 (
  echo  Fermez d'abord la fenetre noire du logiciel ZAAK MOTORS, puis appuyez sur une touche...
  pause >nul
  goto :running
)

if not exist data\garage.db goto :download
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set "STAMP=%%d"
set "SAVE=data\backups\avant-mise-a-jour-%STAMP%"
mkdir "%SAVE%"
copy /y "data\garage.db*" "%SAVE%\" >nul || goto :error
echo Copie de securite des donnees : %SAVE%

:download
echo Telechargement de la nouvelle version...
git fetch origin main || goto :error
git reset --hard origin/main || goto :error

echo Installation des composants...
call npm install --no-audit --no-fund || goto :error
echo Preparation de l'interface...
call npm run build || goto :error

echo.
echo  Mise a jour terminee.
echo.
start "" "%CD%\demarrer.bat"
goto :end

:error
echo.
echo  La mise a jour a echoue. Vos donnees n'ont pas ete touchees. Verifiez Internet et reessayez, ou appelez Aziz.

:end
pause

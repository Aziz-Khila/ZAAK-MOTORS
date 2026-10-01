@echo off
chcp 65001 >nul
setlocal
title ZAAK MOTORS - Installation
rem A lancer une seule fois sur le PC du garage. Les donnees du garage ne sont jamais envoyees sur Internet.

set "REPO=git@github.com:Aziz-Khila/ZAAK-MOTORS.git"
set "DEST=C:\ZAAK-MOTORS"
set "KEYDIR=%USERPROFILE%\.ssh"
set "KEY=%KEYDIR%\zaak_motors_deploy"
set "KEYFWD=%KEY:\=/%"
set "SSHCMD=ssh -i '%KEYFWD%' -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files\Git\cmd"

echo.
echo  === Installation du logiciel ZAAK MOTORS ===
echo.

rem 1. Node.js et Git
where node >nul 2>nul || call :install OpenJS.NodeJS.LTS node "Node.js" || goto :error
where git >nul 2>nul || call :install Git.Git git "Git" || goto :error

if exist "%DEST%\.git" (
  echo Le logiciel est deja installe dans %DEST%.
  goto :shortcut
)
if exist "%DEST%" (
  echo  Le dossier %DEST% existe deja. Renommez-le ^(sans supprimer le dossier data^), puis relancez ce fichier.
  goto :end
)

rem 2. Cle d'acces en lecture seule au projet
if not exist "%KEY%" (
  if not exist "%KEYDIR%" mkdir "%KEYDIR%"
  "C:\Program Files\Git\usr\bin\ssh-keygen.exe" -q -t ed25519 -N "" -C "zaak-motors-%COMPUTERNAME%" -f "%KEYFWD%" || goto :error
)

git -c core.sshCommand="%SSHCMD%" ls-remote "%REPO%" >nul 2>nul && goto :clone
clip < "%KEY%.pub"
echo  Envoyez a Aziz la cle ci-dessous (elle est deja copiee : faites Coller dans WhatsApp) :
echo.
type "%KEY%.pub"
echo.
echo  Aziz doit l'ajouter sur GitHub : projet ZAAK-MOTORS, Settings, Deploy keys, Add deploy key
echo  (sans cocher "Allow write access").
echo.
:wait
echo  Appuyez sur une touche quand Aziz a ajoute la cle...
pause >nul
git -c core.sshCommand="%SSHCMD%" ls-remote "%REPO%" >nul 2>nul && goto :clone
echo  Acces pas encore autorise. Verifiez avec Aziz que la cle est bien ajoutee, puis reessayez.
goto :wait

rem 3. Telechargement du logiciel
:clone
echo Telechargement du logiciel...
git -c core.sshCommand="%SSHCMD%" clone "%REPO%" "%DEST%" || goto :error
git -C "%DEST%" config core.sshCommand "%SSHCMD%"

rem 4. Raccourci sur le bureau
:shortcut
powershell -NoProfile -Command "$s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop') + '\ZAAK MOTORS.lnk'); $s.TargetPath = '%DEST%\demarrer.bat'; $s.WorkingDirectory = '%DEST%'; $s.IconLocation = '%DEST%\zaak-motors.ico'; $s.Save()"
echo.
echo  Installation terminee. Un raccourci "ZAAK MOTORS" est sur le bureau.
echo  Si Windows demande l'autorisation du pare-feu, cochez "Reseaux prives" pour la tablette.
echo.
start "" "%DEST%\demarrer.bat"
goto :end

:install
echo Installation de %~3...
winget install --id %~1 -e --source winget --accept-package-agreements --accept-source-agreements
where %~2 >nul 2>nul && exit /b 0
echo  Impossible d'installer %~3 automatiquement. Installez-le depuis Internet puis relancez ce fichier.
exit /b 1

:error
echo.
echo  Une erreur est survenue. Verifiez la connexion Internet et reessayez, ou appelez Aziz.

:end
pause

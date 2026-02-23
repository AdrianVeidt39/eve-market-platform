@echo off
setlocal

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

cd /d "%PROJECT_DIR%"

set "NODE_DIR=C:\Program Files\nodejs"
if exist "%NODE_DIR%\node.exe" set "PATH=%NODE_DIR%;%PATH%"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta disponible en PATH.
  echo Instala Node LTS o agrega "C:\Program Files\nodejs" al PATH.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm no esta disponible en PATH.
  pause
  exit /b 1
)

if "%DATABASE_URL%"=="" (
  set "DATABASE_URL=mysql://root@localhost:3306/eve_market"
)

echo [INFO] Instalando dependencias...
call npm install
if errorlevel 1 (
  echo [ERROR] Fallo npm install.
  pause
  exit /b 1
)

echo [INFO] Ejecutando migraciones MySQL (estricto)...
call npm run migrate -w apps/api
if errorlevel 1 (
  echo [ERROR] No se pudo conectar/aplicar migraciones en MySQL.
  echo [ERROR] Modo estricto: NO se iniciara API sin base de datos.
  pause
  exit /b 1
)

start "EVE Pro API" cmd /k "cd /d ""%PROJECT_DIR%"" && set DATABASE_URL=%DATABASE_URL% && npm run dev:api"
timeout /t 2 >nul
start "" "http://localhost:3001/"

endlocal

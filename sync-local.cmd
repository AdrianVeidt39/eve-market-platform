@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "BASH_EXE="

if exist "%ProgramFiles%\Git\bin\bash.exe" set "BASH_EXE=%ProgramFiles%\Git\bin\bash.exe"
if exist "%ProgramFiles%\Git\usr\bin\bash.exe" set "BASH_EXE=%ProgramFiles%\Git\usr\bin\bash.exe"

if "%BASH_EXE%"=="" (
  where bash >nul 2>&1
  if %errorlevel%==0 (
    set "BASH_EXE=bash"
  ) else (
    echo Error: bash not found. Install Git Bash or add bash to PATH.
    exit /b 1
  )
)

"%BASH_EXE%" "%SCRIPT_DIR%sync-local.sh" %*
exit /b %errorlevel%

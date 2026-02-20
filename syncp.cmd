@echo off
setlocal

call "%~dp0sync-local.cmd" --syncp %*
exit /b %errorlevel%

@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0npm.ps1" run dev
exit /b %errorlevel%

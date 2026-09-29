@echo off
title AI FAQ Assistant
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js is required. Install Node.js 22 or newer, then run this file again.
 pause
 exit /b 1
)
if not exist "node_modules\express" (
 echo Installing project dependencies...
 call npm.cmd ci --no-fund
 if errorlevel 1 (
  echo Installation failed. Check your internet connection and retry.
  pause
  exit /b 1
 )
)
node src/launch.js
if errorlevel 1 pause


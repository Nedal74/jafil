@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Download the LTS version from https://nodejs.org then run this file again. & pause & exit /b 1)
if not exist node_modules (
  echo Installing packages - first run only, takes a few minutes...
  call npm install || (pause & exit /b 1)
)
echo.
echo Site:      http://localhost:3000
echo Dashboard: http://localhost:3000/admin   (admin@aljafil.local / Aljafil12345)
echo.
start "" cmd /c "timeout /t 25 >nul & start http://localhost:3000"
call npm run dev
pause

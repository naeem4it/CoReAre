@echo off
cd /d "%~dp0"
title DBARC - Application Suite (Backend, Tenant & Courier)

echo =======================================================
echo                 STARTING DBARC SYSTEM                 
echo =======================================================
echo.
echo Location: %~dp0
echo.
echo Launching services:
echo   [1/3] DBARc Backend (Strapi API)   -> Port 1337
echo   [2/3] DBARc Tenant Portal          -> Port 3000
echo   [3/3] DBARc Courier Operations     -> Port 3001
echo.
echo =======================================================
echo.

:: 1. Launch DBARc Strapi Backend on port 1337
echo Starting DBARc Backend API...
start "DBARc [1/3] - Backend API (Port 1337)" cmd /k "cd /d ""%~dp0DBARc-backend"" && title DBARc Backend :1337 && call npm.cmd run develop"

:: 2. Launch DBARc Tenant Portal on port 3000
echo Starting DBARc Tenant Portal...
start "DBARc [2/3] - Tenant Portal (Port 3000)" cmd /k "cd /d ""%~dp0DBARc-Tenant"" && title DBARc Tenant Portal :3000 && call npm.cmd run dev -- -p 3000"

:: 3. Launch DBARc Courier Operations on port 3001
echo Starting DBARc Courier Portal...
start "DBARc [3/3] - Courier Portal (Port 3001)" cmd /k "cd /d ""%~dp0DBARc-Courier"" && title DBARc Courier Portal :3001 && call npm.cmd run dev -- -p 3001"

:: Automatically launch browser tabs once services initialize (~8 seconds)
start /b cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000 & start http://localhost:3001"

echo.
echo =======================================================
echo              ALL APPLICATIONS INITIALIZED!             
echo =======================================================
echo.
echo Access URLs:
echo   - Tenant Portal:       http://localhost:3000
echo   - Courier Portal:      http://localhost:3001
echo   - Strapi Backend:      http://localhost:1337/admin
echo.
echo Default QA Credentials:
echo   - Courier Admin: naeemcourier@test.com / Password123!
echo   - Shipper Admin: naeemshiper@test.com  / Password123!
echo.
echo [NOTE] Keep the opened command windows OPEN while testing.
echo        To stop all services, run STOP_SYSTEM.bat
echo =======================================================
echo.
pause

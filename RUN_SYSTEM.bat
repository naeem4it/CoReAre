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
echo   [1/4] DBARc Backend (Strapi API)   -> Port 1337
echo   [2/4] DBARc Tenant Portal          -> Port 3000
echo   [3/4] DBARc Courier Operations     -> Port 3001
echo   [4/4] DBARc Sample Shirt Store     -> Port 3002
echo.
echo =======================================================
echo.

:: 1. Launch DBARc Strapi Backend on port 1337
echo Starting DBARc Backend API...
start "DBARc [1/4] - Backend API (Port 1337)" cmd /k "cd /d ""%~dp0DBARc-backend"" && title DBARc Backend :1337 && call npm.cmd run develop"

:: 2. Launch DBARc Tenant Portal on port 3000
echo Starting DBARc Tenant Portal...
start "DBARc [2/4] - Tenant Portal (Port 3000)" cmd /k "cd /d ""%~dp0DBARc-Tenant"" && title DBARc Tenant Portal :3000 && call npm.cmd run dev -- -p 3000"

:: 3. Launch DBARc Courier Operations on port 3001
echo Starting DBARc Courier Portal...
start "DBARc [3/4] - Courier Portal (Port 3001)" cmd /k "cd /d ""%~dp0DBARc-Courier"" && title DBARc Courier Portal :3001 && call npm.cmd run dev -- -p 3001"

:: 4. Launch DBARc Sample Shirt Store on port 3002
echo Starting DBARc Sample Shirt Store...
start "DBARc [4/4] - Sample Shirt Store (Port 3002)" cmd /k "cd /d ""%~dp0DBARc-Store"" && title DBARc Shirt Store :3002 && node server.js"

:: Automatically launch browser tabs once services initialize (~8 seconds)
start /b cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000 & start http://localhost:3001/orders & start http://localhost:3002"

echo.
echo =======================================================
echo              ALL APPLICATIONS INITIALIZED!             
echo =======================================================
echo.
echo Access URLs:
echo   - Tenant Portal:       http://localhost:3000
echo   - Courier Portal:      http://localhost:3001
echo   - Sample Shirt Store:  http://localhost:3002
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
